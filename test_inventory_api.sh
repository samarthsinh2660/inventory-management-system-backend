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

echo -e "${YELLOW}=== Testing Inventory Management API ===${NC}"

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
