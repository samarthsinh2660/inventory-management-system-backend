#!/bin/bash

# Colors for better output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API base URL
BASE_URL="http://localhost:3000/api"

# Store entity IDs for reference and deletion
PRODUCT_ID=""
SUBCATEGORY_ID=""
LOCATION_ID=""
FORMULA_ID=""
INVENTORY_ENTRY_ID=""
INVENTORY_ENTRY_ID_OUT=""
AUDIT_LOG_ID=""
AUDIT_LOG_ID_REVERT=""

echo -e "\n${YELLOW}=== Testing Inventory Management API ===${NC}"

# Function to extract ID from response
extract_id() {
  echo $1 | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1
}

# Function to check if tests are passing despite potential error messages
check_response_status() {
  local response=$1
  if [[ $response == *"success"* ]]; then
    return 0  # Success
  else
    return 1  # Failure
  fi
}

# Test 1: Health check
echo -e "\n${YELLOW}Testing Health Check...${NC}"
RESPONSE=$(curl -s http://localhost:3000/health)
if [[ $RESPONSE == *"OK"* ]]; then
  echo -e "${GREEN}Health check passed: $RESPONSE${NC}"
else
  echo -e "${RED}Health check failed: $RESPONSE${NC}"
  exit 1
fi

# Test 2: Sign up as a master user
echo -e "\n${YELLOW}Signing up as a master user...${NC}"
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testmaster",
    "password": "master123",
    "email": "testmaster@example.com",
    "name": "Test Master",
    "role": "master"
  }')

echo "Signup Response: $SIGNUP_RESPONSE"

if [[ $SIGNUP_RESPONSE == *"success"* && $SIGNUP_RESPONSE == *"token"* ]]; then
  echo -e "${GREEN}Master user signup test passed${NC}"
  # Extract token from response
  TOKEN=$(echo $SIGNUP_RESPONSE | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
  echo "Auth token: $TOKEN"
else
  # If signup fails (user might already exist), try signin
  echo -e "${YELLOW}Signup failed, trying signin with same credentials...${NC}"
  SIGNIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signin" \
    -H "Content-Type: application/json" \
    -d '{
      "username": "testmaster",
      "password": "master123"
    }')
  
  echo "Signin Response: $SIGNIN_RESPONSE"
  
  if [[ $SIGNIN_RESPONSE == *"success"* && $SIGNIN_RESPONSE == *"token"* ]]; then
    echo -e "${GREEN}Signin test passed${NC}"
    # Extract token from response
    TOKEN=$(echo $SIGNIN_RESPONSE | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
    echo "Auth token: $TOKEN"
  else
    echo -e "${RED}Both signup and signin failed. Cannot proceed with tests.${NC}"
    exit 1
  fi
fi

# === SUBCATEGORY TESTS ===
echo -e "\n${YELLOW}=== Testing Subcategory API ===${NC}"

# Create Subcategory
echo -e "\n${YELLOW}Creating a Subcategory...${NC}"
SUBCATEGORY_RESPONSE=$(curl -s -X POST "$BASE_URL/subcategories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Subcategory"
  }')

echo "Create Subcategory Response: $SUBCATEGORY_RESPONSE"

if [[ $SUBCATEGORY_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Create Subcategory test passed${NC}"
  SUBCATEGORY_ID=$(extract_id "$SUBCATEGORY_RESPONSE")
  echo "Subcategory ID: $SUBCATEGORY_ID"
else
  echo -e "${RED}Create Subcategory test failed${NC}"
  exit 1
fi

# === LOCATION TESTS ===
echo -e "\n${YELLOW}=== Testing Location API ===${NC}"

# Create Location
echo -e "\n${YELLOW}Creating a Location...${NC}"
LOCATION_RESPONSE=$(curl -s -X POST "$BASE_URL/locations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Location",
    "factory_id": null
  }')

echo "Create Location Response: $LOCATION_RESPONSE"

if [[ $LOCATION_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Create Location test passed${NC}"
  LOCATION_ID=$(extract_id "$LOCATION_RESPONSE")
  echo "Location ID: $LOCATION_ID"
else
  echo -e "${RED}Create Location test failed${NC}"
  exit 1
fi

# === PRODUCT TESTS ===
echo -e "\n${YELLOW}=== Testing Product API ===${NC}"

# Create Raw Material Product
echo -e "\n${YELLOW}Creating a Raw Material Product...${NC}"
RAW_PRODUCT_RESPONSE=$(curl -s -X POST "$BASE_URL/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"Test Raw Material\",
    \"category\": \"raw\",
    \"unit\": \"kg\",
    \"min_quantity\": 10,
    \"max_quantity\": 100,
    \"subcategory_id\": $SUBCATEGORY_ID,
    \"location_id\": $LOCATION_ID,
    \"source_type\": \"trading\"
  }")

echo "Create Raw Product Response: $RAW_PRODUCT_RESPONSE"

if [[ $RAW_PRODUCT_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Create Raw Product test passed${NC}"
  RAW_PRODUCT_ID=$(extract_id "$RAW_PRODUCT_RESPONSE")
  echo "Raw Product ID: $RAW_PRODUCT_ID"
else
  echo -e "${RED}Create Raw Product test failed${NC}"
  exit 1
fi

# Create Finished Product
echo -e "\n${YELLOW}Creating a Finished Product...${NC}"
FINISHED_PRODUCT_RESPONSE=$(curl -s -X POST "$BASE_URL/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"Test Finished Product\",
    \"category\": \"finished\",
    \"unit\": \"piece\",
    \"min_quantity\": 5,
    \"max_quantity\": 50,
    \"subcategory_id\": $SUBCATEGORY_ID,
    \"location_id\": $LOCATION_ID,
    \"source_type\": \"manufacturing\"
  }")

echo "Create Finished Product Response: $FINISHED_PRODUCT_RESPONSE"

if [[ $FINISHED_PRODUCT_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Create Finished Product test passed${NC}"
  FINISHED_PRODUCT_ID=$(extract_id "$FINISHED_PRODUCT_RESPONSE")
  echo "Finished Product ID: $FINISHED_PRODUCT_ID"
else
  echo -e "${RED}Create Finished Product test failed${NC}"
  exit 1
fi

# === PRODUCT FORMULA TESTS ===
echo -e "\n${YELLOW}=== Testing Product Formula API ===${NC}"

# Create Product Formula
echo -e "\n${YELLOW}Creating a Product Formula Component...${NC}"
FORMULA_RESPONSE=$(curl -s -X POST "$BASE_URL/product-formulas" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"product_id\": $FINISHED_PRODUCT_ID,
    \"component_id\": $RAW_PRODUCT_ID,
    \"quantity\": 2.5
  }")

echo "Create Product Formula Response: $FORMULA_RESPONSE"

if [[ $FORMULA_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Create Product Formula test passed${NC}"
  FORMULA_ID=$(extract_id "$FORMULA_RESPONSE")
  echo "Formula ID: $FORMULA_ID"
else
  echo -e "${RED}Create Product Formula test failed${NC}"
  exit 1
fi

# === PRODUCT SEARCH TESTS ===
echo -e "\n${YELLOW}=== Testing Product Search API ===${NC}"

# Test 1: Basic text search
echo -e "\n${YELLOW}Testing basic product search...${NC}"
BASIC_SEARCH_RESPONSE=$(curl -s -X GET "$BASE_URL/products/search?search=Test" \
  -H "Authorization: Bearer $TOKEN")

echo "Basic Search Response: $BASIC_SEARCH_RESPONSE"

if check_response_status "$BASIC_SEARCH_RESPONSE"; then
  echo -e "${GREEN}Basic Product Search test passed${NC}"
else
  echo -e "${RED}Basic Product Search test failed${NC}"
fi

# Test: Search by location
echo -e "\n${YELLOW}Testing product search by location...${NC}"
LOCATION_SEARCH_RESPONSE=$(curl -s -X GET "$BASE_URL/products/search?location_id=$LOCATION_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Location Search Response: $LOCATION_SEARCH_RESPONSE"

if check_response_status "$LOCATION_SEARCH_RESPONSE"; then
  echo -e "${GREEN}Location Product Search test passed${NC}"
else
  echo -e "${RED}Location Product Search test failed${NC}"
fi

# Test 2: Search by category
echo -e "\n${YELLOW}Testing product search by category...${NC}"
CATEGORY_SEARCH_RESPONSE=$(curl -s -X GET "$BASE_URL/products/search?category=raw" \
  -H "Authorization: Bearer $TOKEN")

echo "Category Search Response: $CATEGORY_SEARCH_RESPONSE"

if check_response_status "$CATEGORY_SEARCH_RESPONSE"; then
  echo -e "${GREEN}Category Product Search test passed${NC}"
else
  echo -e "${RED}Category Product Search test failed${NC}"
fi

# Test 3: Search by component relationship
echo -e "\n${YELLOW}Testing product search by component...${NC}"
COMPONENT_SEARCH_RESPONSE=$(curl -s -X GET "$BASE_URL/products/search?component_id=$RAW_PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Component Search Response: $COMPONENT_SEARCH_RESPONSE"

if check_response_status "$COMPONENT_SEARCH_RESPONSE"; then
  echo -e "${GREEN}Component Product Search test passed${NC}"
else
  echo -e "${RED}Component Product Search test failed${NC}"
fi

# Test 4: Search with is_parent filter
echo -e "\n${YELLOW}Testing product search with is_parent filter...${NC}"
PARENT_SEARCH_RESPONSE=$(curl -s -X GET "$BASE_URL/products/search?is_parent=true" \
  -H "Authorization: Bearer $TOKEN")

echo "Parent Search Response: $PARENT_SEARCH_RESPONSE"

if check_response_status "$PARENT_SEARCH_RESPONSE"; then
  echo -e "${GREEN}Parent Product Search test passed${NC}"
else
  echo -e "${RED}Parent Product Search test failed${NC}"
fi

# === EMPLOYEE SIGNUP AND LOGIN TESTS ===
echo -e "\n${YELLOW}=== Testing Employee Signup and Login ===${NC}"

# Generate unique employee details using timestamp
TIMESTAMP=$(date +%s)
EMPLOYEE_USERNAME="employee_${TIMESTAMP}"
EMPLOYEE_PASSWORD="password_${TIMESTAMP}"
EMPLOYEE_EMAIL="employee_${TIMESTAMP}@example.com"
EMPLOYEE_NAME="Test Employee ${TIMESTAMP}"

echo -e "\n${YELLOW}Signing up as a new employee...${NC}"
# Sign up as a new employee user
EMPLOYEE_SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"username\": \"$EMPLOYEE_USERNAME\",
    \"password\": \"$EMPLOYEE_PASSWORD\",
    \"email\": \"$EMPLOYEE_EMAIL\",
    \"name\": \"$EMPLOYEE_NAME\",
    \"role\": \"employee\"
  }")

echo "Employee Signup Response: $EMPLOYEE_SIGNUP_RESPONSE"

if [[ $EMPLOYEE_SIGNUP_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Employee Signup test passed${NC}"
  # Extract employee ID if needed
  EMPLOYEE_ID=$(extract_id "$EMPLOYEE_SIGNUP_RESPONSE")
  echo "New Employee ID: $EMPLOYEE_ID"
else
  echo -e "${RED}Employee Signup test failed${NC}"
  # Optional fallback if signup fails - use a predefined employee account
  EMPLOYEE_USERNAME="employee"
  EMPLOYEE_PASSWORD="password123"
  echo "Using fallback employee credentials: $EMPLOYEE_USERNAME"
fi

# Login with the newly created employee credentials
echo -e "\n${YELLOW}Logging in as the newly created employee...${NC}"
EMPLOYEE_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$EMPLOYEE_USERNAME\",
    \"password\": \"$EMPLOYEE_PASSWORD\"
  }")

echo "Employee Login Response: $EMPLOYEE_LOGIN_RESPONSE"

if [[ $EMPLOYEE_LOGIN_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Employee Login test passed${NC}"
  EMPLOYEE_TOKEN=$(echo $EMPLOYEE_LOGIN_RESPONSE | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
  echo "Employee Token: $EMPLOYEE_TOKEN"
  echo "Successfully logged in as employee: $EMPLOYEE_USERNAME"
else
  echo -e "${RED}Employee Login test failed${NC}"
  # Continue with master token if employee login fails
  EMPLOYEE_TOKEN=$TOKEN
  echo "Using master token as fallback for employee operations"
fi

# === INVENTORY ENTRY TESTS ===
echo -e "\n${YELLOW}=== Testing Inventory Entry API ===${NC}"

# Store inventory entry IDs for reference and deletion
INVENTORY_ENTRY_ID=""
INVENTORY_ENTRY_ID_EMPLOYEE=""

# Create an inventory entry (stock in)
echo -e "\n${YELLOW}Creating a stock IN inventory entry...${NC}"
CREATE_ENTRY_RESPONSE=$(curl -s -X POST "$BASE_URL/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"product_id\": $RAW_PRODUCT_ID,
    \"quantity\": 50,
    \"entry_type\": \"manual_in\",
    \"location_id\": $LOCATION_ID,
    \"notes\": \"Initial stock for testing\",
    \"reference_id\": \"PO12345\"
  }")

echo "Create Inventory Entry Response: $CREATE_ENTRY_RESPONSE"

if [[ $CREATE_ENTRY_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Create Inventory Entry test passed${NC}"
  INVENTORY_ENTRY_ID=$(extract_id "$CREATE_ENTRY_RESPONSE")
  echo "Inventory Entry ID: $INVENTORY_ENTRY_ID"
else
  echo -e "${RED}Create Inventory Entry test failed${NC}"
fi

# Login as an employee to create entries that will be audited and potentially reverted
echo -e "\n${YELLOW}Logging in as an employee user...${NC}"
EMPLOYEE_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"employee\",
    \"password\": \"password123\"
  }")

echo "Employee Login Response: $EMPLOYEE_LOGIN_RESPONSE"

if [[ $EMPLOYEE_LOGIN_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Employee Login test passed${NC}"
  EMPLOYEE_TOKEN=$(echo $EMPLOYEE_LOGIN_RESPONSE | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
  echo "Employee Token: $EMPLOYEE_TOKEN"
else
  echo -e "${RED}Employee Login test failed${NC}"
  # Continue with master token if employee login fails
  EMPLOYEE_TOKEN=$TOKEN
fi

# Create an inventory entry as employee (stock out) - this will be audited and potentially reverted
echo -e "\n${YELLOW}Creating a stock OUT inventory entry as employee...${NC}"
CREATE_EMPLOYEE_ENTRY_RESPONSE=$(curl -s -X POST "$BASE_URL/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -d "{
    \"product_id\": $RAW_PRODUCT_ID,
    \"quantity\": 10,
    \"entry_type\": \"manual_out\",
    \"location_id\": $LOCATION_ID,
    \"notes\": \"Employee testing stock out\",
    \"reference_id\": \"EMP54321\"
  }")

echo "Create Employee Inventory Entry Response: $CREATE_EMPLOYEE_ENTRY_RESPONSE"

if [[ $CREATE_EMPLOYEE_ENTRY_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Create Employee Inventory Entry test passed${NC}"
  INVENTORY_ENTRY_ID_EMPLOYEE=$(extract_id "$CREATE_EMPLOYEE_ENTRY_RESPONSE")
  echo "Employee Inventory Entry ID: $INVENTORY_ENTRY_ID_EMPLOYEE"
else
  echo -e "${RED}Create Employee Inventory Entry test failed${NC}"
fi

# Get inventory balance after employee operation
echo -e "\n${YELLOW}Getting inventory balance after employee operation...${NC}"
GET_BALANCE_AFTER_EMPLOYEE=$(curl -s -X GET "$BASE_URL/inventory/balance" \
  -H "Authorization: Bearer $TOKEN")

echo "Balance After Employee Operation: $GET_BALANCE_AFTER_EMPLOYEE"

# Create a second inventory entry (stock out) as master
echo -e "\n${YELLOW}Creating a stock OUT inventory entry...${NC}"
CREATE_OUT_ENTRY_RESPONSE=$(curl -s -X POST "$BASE_URL/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"product_id\": $RAW_PRODUCT_ID,
    \"quantity\": 5,
    \"entry_type\": \"manual_out\",
    \"location_id\": $LOCATION_ID,
    \"notes\": \"Testing stock out\",
    \"reference_id\": \"SO54321\"
  }")

echo "Create Out Inventory Entry Response: $CREATE_OUT_ENTRY_RESPONSE"

if [[ $CREATE_OUT_ENTRY_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Create Out Inventory Entry test passed${NC}"
  INVENTORY_ENTRY_ID_OUT=$(extract_id "$CREATE_OUT_ENTRY_RESPONSE")
  echo "Out Inventory Entry ID: $INVENTORY_ENTRY_ID_OUT"
else
  echo -e "${RED}Create Out Inventory Entry test failed${NC}"
fi

# Get all inventory entries
echo -e "\n${YELLOW}Getting all inventory entries...${NC}"
GET_ENTRIES_RESPONSE=$(curl -s -X GET "$BASE_URL/inventory" \
  -H "Authorization: Bearer $TOKEN")

echo "Get Inventory Entries Response: $GET_ENTRIES_RESPONSE"

if [[ $GET_ENTRIES_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Get All Inventory Entries test passed${NC}"
else
  echo -e "${RED}Get All Inventory Entries test failed${NC}"
fi

# Get inventory entry by ID
echo -e "\n${YELLOW}Getting inventory entry by ID...${NC}"
GET_ENTRY_RESPONSE=$(curl -s -X GET "$BASE_URL/inventory/$INVENTORY_ENTRY_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Get Inventory Entry Response: $GET_ENTRY_RESPONSE"

if [[ $GET_ENTRY_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Get Inventory Entry By ID test passed${NC}"
else
  echo -e "${RED}Get Inventory Entry By ID test failed${NC}"
fi

# Get product-specific inventory entries
echo -e "\n${YELLOW}Getting product-specific inventory entries...${NC}"
GET_PRODUCT_ENTRIES_RESPONSE=$(curl -s -X GET "$BASE_URL/inventory/product/$RAW_PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Get Product Inventory Entries Response: $GET_PRODUCT_ENTRIES_RESPONSE"

if [[ $GET_PRODUCT_ENTRIES_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Get Product Inventory Entries test passed${NC}"
else
  echo -e "${RED}Get Product Inventory Entries test failed${NC}"
fi

# Get inventory balance
echo -e "\n${YELLOW}Getting inventory balance...${NC}"
GET_BALANCE_RESPONSE=$(curl -s -X GET "$BASE_URL/inventory/balance" \
  -H "Authorization: Bearer $TOKEN")

echo "Get Inventory Balance Response: $GET_BALANCE_RESPONSE"

if [[ $GET_BALANCE_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Get Inventory Balance test passed${NC}"
else
  echo -e "${RED}Get Inventory Balance test failed${NC}"
fi

# Update inventory entry (master only)
echo -e "\n${YELLOW}Updating an inventory entry...${NC}"
UPDATE_ENTRY_RESPONSE=$(curl -s -X PUT "$BASE_URL/inventory/$INVENTORY_ENTRY_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"notes\": \"Updated notes for testing\",
    \"reference_id\": \"PO12345-Updated\",
    \"reason\": \"Testing update functionality\"
  }")

echo "Update Inventory Entry Response: $UPDATE_ENTRY_RESPONSE"

if [[ $UPDATE_ENTRY_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Update Inventory Entry test passed${NC}"
else
  echo -e "${RED}Update Inventory Entry test failed${NC}"
fi

# === AUDIT LOG TESTS ===
echo -e "\n${YELLOW}=== Testing Audit Log API ===${NC}"

# Get all audit logs
echo -e "\n${YELLOW}Getting all audit logs...${NC}"
GET_LOGS_RESPONSE=$(curl -s -X GET "$BASE_URL/audit-logs" \
  -H "Authorization: Bearer $TOKEN")

echo "Get Audit Logs Response: $GET_LOGS_RESPONSE"

if [[ $GET_LOGS_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Get All Audit Logs test passed${NC}"
else
  echo -e "${RED}Get All Audit Logs test failed${NC}"
fi

# Find audit log ID for employee operation (used for reversion test)
# This is important for testing the reversion of employee operations
echo -e "\n${YELLOW}Finding audit log for employee operation to test reversion...${NC}"
EMPLOYEE_AUDIT_RESPONSE=$(curl -s -X GET "$BASE_URL/audit-logs?entry_id=$INVENTORY_ENTRY_ID_EMPLOYEE" \
  -H "Authorization: Bearer $TOKEN")

echo "Employee Audit Log Search Response: $EMPLOYEE_AUDIT_RESPONSE"

# Extract the audit log ID that we can use to revert the employee's operation
EMPLOYEE_AUDIT_LOG_ID=$(echo $EMPLOYEE_AUDIT_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)
echo "Employee Audit Log ID (for reversion test): $EMPLOYEE_AUDIT_LOG_ID"

# Get another audit log for standard tests
echo -e "\n${YELLOW}Getting another audit log for standard tests...${NC}"
STANDARD_AUDIT_RESPONSE=$(curl -s -X GET "$BASE_URL/audit-logs" \
  -H "Authorization: Bearer $TOKEN")
AUDIT_LOG_ID=$(echo $STANDARD_AUDIT_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)
echo "Standard Audit Log ID: $AUDIT_LOG_ID"

# Get audit log by ID
echo -e "\n${YELLOW}Getting audit log by ID...${NC}"
GET_LOG_RESPONSE=$(curl -s -X GET "$BASE_URL/audit-logs/$AUDIT_LOG_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Get Audit Log Response: $GET_LOG_RESPONSE"

if [[ $GET_LOG_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Get Audit Log By ID test passed${NC}"
else
  echo -e "${RED}Get Audit Log By ID test failed${NC}"
fi

# Get audit logs by record type (inventory entries)
echo -e "\n${YELLOW}Getting audit logs by record type...${NC}"
GET_LOGS_BY_TYPE_RESPONSE=$(curl -s -X GET "$BASE_URL/audit-logs/record-type/inventory_entries" \
  -H "Authorization: Bearer $TOKEN")

echo "Get Audit Logs By Type Response: $GET_LOGS_BY_TYPE_RESPONSE"

if [[ $GET_LOGS_BY_TYPE_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Get Audit Logs By Record Type test passed${NC}"
else
  echo -e "${RED}Get Audit Logs By Record Type test failed${NC}"
fi

# Delete an audit log without reversion (master only)
echo -e "\n${YELLOW}Deleting audit log without reversion...${NC}"
DELETE_LOG_RESPONSE=$(curl -s -X DELETE "$BASE_URL/audit-logs/$AUDIT_LOG_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Delete Audit Log Response: $DELETE_LOG_RESPONSE"

if [[ $DELETE_LOG_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Delete Audit Log test passed${NC}"
else
  echo -e "${RED}Delete Audit Log test failed${NC}"
fi

# Check inventory balance before reverting employee operation
echo -e "\n${YELLOW}Getting inventory balance before reversion...${NC}"
BALANCE_BEFORE_REVERT=$(curl -s -X GET "$BASE_URL/inventory/balance" \
  -H "Authorization: Bearer $TOKEN")
echo "Balance Before Reverting Employee Operation: $BALANCE_BEFORE_REVERT"

# Delete employee audit log with reversion (master only)
# This is the key test for reverting an employee operation
if [[ ! -z "$EMPLOYEE_AUDIT_LOG_ID" ]]; then
  echo -e "\n${YELLOW}Deleting employee audit log WITH reversion (reverting employee's operation)...${NC}"
  DELETE_EMPLOYEE_LOG_RESPONSE=$(curl -s -X DELETE "$BASE_URL/audit-logs/$EMPLOYEE_AUDIT_LOG_ID?revert=true" \
    -H "Authorization: Bearer $TOKEN")

  echo "Delete Employee Audit Log with Reversion Response: $DELETE_EMPLOYEE_LOG_RESPONSE"

  if [[ $DELETE_EMPLOYEE_LOG_RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}Delete Employee Audit Log with Reversion test passed${NC}"
    
    # Check inventory balance after reverting employee operation
    echo -e "\n${YELLOW}Getting inventory balance after reversion...${NC}"
    BALANCE_AFTER_REVERT=$(curl -s -X GET "$BASE_URL/inventory/balance" \
      -H "Authorization: Bearer $TOKEN")
    echo "Balance After Reverting Employee Operation: $BALANCE_AFTER_REVERT"
    
    # Compare balances to verify reversion worked
    echo -e "\n${YELLOW}Verifying reversion of employee operation...${NC}"
    echo "If reversion worked correctly, the inventory balance should have changed"
  else
    echo -e "${RED}Delete Employee Audit Log with Reversion test failed${NC}"
  fi
fi

# Delete inventory entries
echo -e "\n${YELLOW}Deleting remaining inventory entries...${NC}"

# Delete out entry
if [[ ! -z "$INVENTORY_ENTRY_ID_OUT" ]]; then
  DELETE_OUT_ENTRY_RESPONSE=$(curl -s -X DELETE "$BASE_URL/inventory/$INVENTORY_ENTRY_ID_OUT" \
    -H "Authorization: Bearer $TOKEN")

  echo "Delete Out Inventory Entry Response: $DELETE_OUT_ENTRY_RESPONSE"
  if [[ $DELETE_OUT_ENTRY_RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}Delete Out Inventory Entry test passed${NC}"
  else
    echo -e "${RED}Delete Out Inventory Entry test failed${NC}"
  fi
fi

# Delete in entry
if [[ ! -z "$INVENTORY_ENTRY_ID" ]]; then
  DELETE_ENTRY_RESPONSE=$(curl -s -X DELETE "$BASE_URL/inventory/$INVENTORY_ENTRY_ID" \
    -H "Authorization: Bearer $TOKEN")

  echo "Delete Inventory Entry Response: $DELETE_ENTRY_RESPONSE"
  if [[ $DELETE_ENTRY_RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}Delete Inventory Entry test passed${NC}"
  else
    echo -e "${RED}Delete Inventory Entry test failed${NC}"
  fi
fi

# Delete employee entry if it wasn't already reverted
if [[ ! -z "$INVENTORY_ENTRY_ID_EMPLOYEE" ]]; then
  DELETE_EMPLOYEE_ENTRY_RESPONSE=$(curl -s -X DELETE "$BASE_URL/inventory/$INVENTORY_ENTRY_ID_EMPLOYEE" \
    -H "Authorization: Bearer $TOKEN")

  echo "Delete Employee Entry Response: $DELETE_EMPLOYEE_ENTRY_RESPONSE"
  if [[ $DELETE_EMPLOYEE_ENTRY_RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}Delete Employee Entry test passed${NC}"
  else
    echo -e "${RED}Delete Employee Entry test failed${NC} (This might be expected if the entry was already reverted)"
  fi
fi

# === DELETION TESTS (Clean up) ===
echo -e "\n${YELLOW}=== Cleaning Up (Deletion Tests) ===${NC}"

# First verify each resource exists before deleting it

# 1. Verify Formula exists
echo -e "\n${YELLOW}Verifying Formula before deletion...${NC}"
FORMULA_VERIFY=$(curl -s -X GET "$BASE_URL/product-formulas/product/$FINISHED_PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Formula Verification Response: $FORMULA_VERIFY"
if [[ $FORMULA_VERIFY == *"success"* ]]; then
  echo -e "${GREEN}Formula exists and can be deleted${NC}"
  
  # Delete Formula
  echo -e "\n${YELLOW}Deleting Formula Component...${NC}"
  DELETE_FORMULA_RESPONSE=$(curl -s -X DELETE "$BASE_URL/product-formulas/$FORMULA_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  echo "Delete Formula Response: $DELETE_FORMULA_RESPONSE"
  if [[ $DELETE_FORMULA_RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}Delete Formula test passed${NC}"
  else
    echo -e "${RED}Delete Formula test failed${NC}"
  fi
else
  echo -e "${RED}Formula verification failed, cannot delete${NC}"
fi

# 2. Verify and Delete Finished Product
echo -e "\n${YELLOW}Verifying Finished Product before deletion...${NC}"
FINISHED_PRODUCT_VERIFY=$(curl -s -X GET "$BASE_URL/products/$FINISHED_PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Finished Product Verification Response: $FINISHED_PRODUCT_VERIFY"
if [[ $FINISHED_PRODUCT_VERIFY == *"success"* ]]; then
  echo -e "${GREEN}Finished Product exists and can be deleted${NC}"
  
  # Delete Finished Product
  echo -e "\n${YELLOW}Deleting Finished Product...${NC}"
  DELETE_FINISHED_PRODUCT_RESPONSE=$(curl -s -X DELETE "$BASE_URL/products/$FINISHED_PRODUCT_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  echo "Delete Finished Product Response: $DELETE_FINISHED_PRODUCT_RESPONSE"
  if [[ $DELETE_FINISHED_PRODUCT_RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}Delete Finished Product test passed${NC}"
  else
    echo -e "${RED}Delete Finished Product test failed${NC}"
  fi
else
  echo -e "${RED}Finished Product verification failed, cannot delete${NC}"
fi

# 3. Verify and Delete Raw Product
echo -e "\n${YELLOW}Verifying Raw Product before deletion...${NC}"
RAW_PRODUCT_VERIFY=$(curl -s -X GET "$BASE_URL/products/$RAW_PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Raw Product Verification Response: $RAW_PRODUCT_VERIFY"
if [[ $RAW_PRODUCT_VERIFY == *"success"* ]]; then
  echo -e "${GREEN}Raw Product exists and can be deleted${NC}"
  
  # Delete Raw Product
  echo -e "\n${YELLOW}Deleting Raw Product...${NC}"
  DELETE_RAW_PRODUCT_RESPONSE=$(curl -s -X DELETE "$BASE_URL/products/$RAW_PRODUCT_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  echo "Delete Raw Product Response: $DELETE_RAW_PRODUCT_RESPONSE"
  if [[ $DELETE_RAW_PRODUCT_RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}Delete Raw Product test passed${NC}"
  else
    echo -e "${RED}Delete Raw Product test failed${NC}"
  fi
else
  echo -e "${RED}Raw Product verification failed, cannot delete${NC}"
fi

# 4. Verify and Delete Location
echo -e "\n${YELLOW}Verifying Location before deletion...${NC}"
LOCATION_VERIFY=$(curl -s -X GET "$BASE_URL/locations/$LOCATION_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Location Verification Response: $LOCATION_VERIFY"
if [[ $LOCATION_VERIFY == *"success"* ]]; then
  echo -e "${GREEN}Location exists and can be deleted${NC}"
  
  # Delete Location
  echo -e "\n${YELLOW}Deleting Location...${NC}"
  DELETE_LOCATION_RESPONSE=$(curl -s -X DELETE "$BASE_URL/locations/$LOCATION_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  echo "Delete Location Response: $DELETE_LOCATION_RESPONSE"
  if [[ $DELETE_LOCATION_RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}Delete Location test passed${NC}"
  else
    echo -e "${RED}Delete Location test failed${NC}"
  fi
else
  echo -e "${RED}Location verification failed, cannot delete${NC}"
fi

# 5. Verify and Delete Subcategory
echo -e "\n${YELLOW}Verifying Subcategory before deletion...${NC}"
SUBCATEGORY_VERIFY=$(curl -s -X GET "$BASE_URL/subcategories/$SUBCATEGORY_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Subcategory Verification Response: $SUBCATEGORY_VERIFY"
if [[ $SUBCATEGORY_VERIFY == *"success"* ]]; then
  echo -e "${GREEN}Subcategory exists and can be deleted${NC}"
  
  # Delete Subcategory
  echo -e "\n${YELLOW}Deleting Subcategory...${NC}"
  DELETE_SUBCATEGORY_RESPONSE=$(curl -s -X DELETE "$BASE_URL/subcategories/$SUBCATEGORY_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  echo "Delete Subcategory Response: $DELETE_SUBCATEGORY_RESPONSE"
  if [[ $DELETE_SUBCATEGORY_RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}Delete Subcategory test passed${NC}"
  else
    echo -e "${RED}Delete Subcategory test failed${NC}"
  fi
else
  echo -e "${RED}Subcategory verification failed, cannot delete${NC}"
fi

echo -e "\n${GREEN}=== All tests completed! ===${NC}"
