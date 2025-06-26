#!/bin/bash

# Base URL for API
API_URL="http://localhost:3000/api"
MASTER_TOKEN=""
EMPLOYEE_TOKEN=""

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== INVENTORY THRESHOLD ALERT SYSTEM TEST =====${NC}"
echo "This script will test the alert system by:"
echo "1. Creating master and employee users"
echo "2. Creating products with threshold values"
echo "3. Adding inventory entries to trigger alerts"
echo "4. Checking for generated alerts"
echo ""

# Function to make API calls
call_api() {
  local method=$1
  local endpoint=$2
  local data=$3
  local token=$4
  
  local auth_header=""
  if [ ! -z "$token" ]; then
    auth_header="-H \"Authorization: Bearer $token\""
  fi
  
  if [ "$method" = "GET" ]; then
    cmd="curl -s -X $method \"$API_URL$endpoint\" -H \"Content-Type: application/json\" $auth_header"
  else
    cmd="curl -s -X $method \"$API_URL$endpoint\" -H \"Content-Type: application/json\" $auth_header -d '$data'"
  fi
  
  # Use eval to execute the command with proper handling of quotes
  eval $cmd
}

echo -e "${GREEN}Step 1: Register master user${NC}"
register_response=$(call_api "POST" "/auth/signup" "{\"name\":\"Test Master\",\"username\":\"master\",\"password\":\"password123\",\"email\":\"master@example.com\",\"role\":\"master\"}")
echo $register_response | jq '.'

echo -e "${GREEN}Step 2: Login as master${NC}"
login_response=$(call_api "POST" "/auth/signin" "{\"username\":\"master\",\"password\":\"password123\"}")
MASTER_TOKEN=$(echo $login_response | jq -r '.data.token')
echo "Master token obtained"

echo -e "${GREEN}Step 3: Register employee user${NC}"
register_response=$(call_api "POST" "/auth/signup" "{\"name\":\"Test Employee\",\"username\":\"employee\",\"password\":\"password123\",\"email\":\"employee@example.com\",\"role\":\"employee\"}" "$MASTER_TOKEN")
echo $register_response | jq '.'

echo -e "${GREEN}Step 4: Login as employee${NC}"
login_response=$(call_api "POST" "/auth/signin" "{\"username\":\"employee\",\"password\":\"password123\"}")
EMPLOYEE_TOKEN=$(echo $login_response | jq -r '.data.token')
echo "Employee token obtained"

echo -e "${GREEN}Step 5: Create a location${NC}"
location_response=$(call_api "POST" "/locations" "{\"name\":\"Test Warehouse\"}" "$MASTER_TOKEN")
location_id=$(echo $location_response | jq -r '.data.id')
echo "Created location with ID: $location_id"

echo -e "${GREEN}Step 6: Create a subcategory${NC}"
subcategory_response=$(call_api "POST" "/subcategories" "{\"name\":\"Test Subcategory\"}" "$MASTER_TOKEN")
subcategory_id=$(echo $subcategory_response | jq -r '.data.id')
echo "Created subcategory with ID: $subcategory_id"

echo -e "${GREEN}Step 7: Create products with thresholds${NC}"

# Product 1 - with threshold that will be triggered
product1_response=$(call_api "POST" "/products" "{
  \"name\": \"Test Product 1\",
  \"unit\": \"kg\",
  \"source_type\": \"trading\",
  \"category\": \"raw\",
  \"min_stock_threshold\": 50,
  \"subcategory_id\": $subcategory_id,
  \"location_id\": $location_id
}" "$MASTER_TOKEN")

product1_id=$(echo $product1_response | jq -r '.data.id')
echo "Created product 1 with ID: $product1_id and threshold: 50"

# Product 2 - with threshold that won't be triggered
product2_response=$(call_api "POST" "/products" "{
  \"name\": \"Test Product 2\",
  \"unit\": \"liters\",
  \"source_type\": \"trading\",
  \"category\": \"raw\",
  \"min_stock_threshold\": 20,
  \"subcategory_id\": $subcategory_id,
  \"location_id\": $location_id
}" "$MASTER_TOKEN")

product2_id=$(echo $product2_response | jq -r '.data.id')
echo "Created product 2 with ID: $product2_id and threshold: 20"

echo -e "${GREEN}Step 8: Add initial inventory${NC}"

# Add 60 units to product 1 (above threshold)
inventory1_response=$(call_api "POST" "/inventory" "{
  \"product_id\": $product1_id,
  \"quantity\": 60,
  \"entry_type\": \"manual_in\",
  \"location_id\": $location_id,
  \"notes\": \"Initial stock\"
}" "$MASTER_TOKEN")

echo "Added 60 units to product 1"

# Add 100 units to product 2 (above threshold)
inventory2_response=$(call_api "POST" "/inventory" "{
  \"product_id\": $product2_id,
  \"quantity\": 100,
  \"entry_type\": \"manual_in\",
  \"location_id\": $location_id,
  \"notes\": \"Initial stock\"
}" "$MASTER_TOKEN")

echo "Added 100 units to product 2"

echo -e "${YELLOW}Waiting 2 seconds for system to process...${NC}"
sleep 2

echo -e "${GREEN}Step 9: Check current stock levels${NC}"
balance_response=$(call_api "GET" "/inventory/balance" "" "$MASTER_TOKEN")
echo $balance_response | jq '.'

echo -e "${GREEN}Step 10: Remove some inventory to trigger alert${NC}"

# Remove 15 units from product 1 (leaving 45, which is below threshold of 50)
inventory3_response=$(call_api "POST" "/inventory" "{
  \"product_id\": $product1_id,
  \"quantity\": 15,
  \"entry_type\": \"manual_out\",
  \"location_id\": $location_id,
  \"notes\": \"Removing stock to trigger alert\"
}" "$MASTER_TOKEN")

echo "Removed 15 units from product 1, should be below threshold now"

echo -e "${YELLOW}Waiting 2 seconds for alert system to process...${NC}"
sleep 2

echo -e "${GREEN}Step 11: Check for alerts${NC}"
alerts_response=$(call_api "GET" "/alerts" "" "$MASTER_TOKEN")
echo $alerts_response | jq '.'

echo -e "${GREEN}Step 12: Check products below threshold${NC}"
threshold_response=$(call_api "GET" "/alerts/stock/threshold" "" "$MASTER_TOKEN")
echo $threshold_response | jq '.'

echo -e "${GREEN}Step 13: Manually trigger alert check${NC}"
check_response=$(call_api "POST" "/alerts/check" "{}" "$MASTER_TOKEN")
echo $check_response | jq '.'

echo -e "${GREEN}Step 14: Resolve the first alert${NC}"
alert_id=$(echo $alerts_response | jq -r '.data[0].id')
if [ "$alert_id" != "null" ]; then
  resolve_response=$(call_api "PATCH" "/alerts/$alert_id/resolve" "{}" "$MASTER_TOKEN")
  echo $resolve_response | jq '.'
else
  echo -e "${RED}No alert found to resolve${NC}"
fi

echo -e "${BLUE}===== TEST COMPLETED =====${NC}"
echo "The alert system test is complete. You should have seen:"
echo "1. Creation of test users, location, subcategory and products"
echo "2. Initial inventory added (above threshold)"
echo "3. Inventory removed to trigger alert for product 1"
echo "4. Alert generated for product 1"
echo "5. Manual check for alerts"
echo "6. Alert resolution"
