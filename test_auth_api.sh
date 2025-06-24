#!/bin/bash

# Colors for better output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API base URL
BASE_URL="http://localhost:3000/api/auth"

echo -e "${YELLOW}=== Testing Authentication API ===${NC}"

# Test 1: Health check
echo -e "\n${YELLOW}Testing Health Check...${NC}"
RESPONSE=$(curl -s http://localhost:3000/health)
if [[ $RESPONSE == *"OK"* ]]; then
  echo -e "${GREEN}Health check passed: $RESPONSE${NC}"
else
  echo -e "${RED}Health check failed: $RESPONSE${NC}"
  exit 1
fi

# Test 2: Signup
echo -e "\n${YELLOW}Testing Signup...${NC}"
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "role": "master",
    "username": "testuser",
    "password": "password123",
    "email": "test@example.com"
  }')

echo "Signup Response: $SIGNUP_RESPONSE"

if [[ $SIGNUP_RESPONSE == *"success"* && $SIGNUP_RESPONSE == *"token"* ]]; then
  echo -e "${GREEN}Signup test passed${NC}"
  # Extract token from response
  TOKEN=$(echo $SIGNUP_RESPONSE | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
  echo "Auth token: $TOKEN"
else
  echo -e "${RED}Signup test failed${NC}"
fi

# Test 3: Signin
echo -e "\n${YELLOW}Testing Signin...${NC}"
SIGNIN_RESPONSE=$(curl -s -X POST "$BASE_URL/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }')

echo "Signin Response: $SIGNIN_RESPONSE"

if [[ $SIGNIN_RESPONSE == *"success"* && $SIGNIN_RESPONSE == *"token"* ]]; then
  echo -e "${GREEN}Signin test passed${NC}"
  # Extract tokens from response
  TOKEN=$(echo $SIGNIN_RESPONSE | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
  REFRESH_TOKEN=$(echo $SIGNIN_RESPONSE | grep -o '"refresh_token":"[^"]*' | grep -o '[^"]*$')
  echo "Auth token: $TOKEN"
  echo "Refresh token: $REFRESH_TOKEN"
else
  echo -e "${RED}Signin test failed${NC}"
  exit 1
fi

# Test 4: Get Profile
echo -e "\n${YELLOW}Testing Get Profile...${NC}"
PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN")

echo "Profile Response: $PROFILE_RESPONSE"

if [[ $PROFILE_RESPONSE == *"success"* && $PROFILE_RESPONSE == *"username"* ]]; then
  echo -e "${GREEN}Get Profile test passed${NC}"
else
  echo -e "${RED}Get Profile test failed${NC}"
fi

# Test 5: Update Profile
echo -e "\n${YELLOW}Testing Update Profile...${NC}"
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Updated Name",
    "email": "updated@example.com"
  }')

echo "Update Response: $UPDATE_RESPONSE"

if [[ $UPDATE_RESPONSE == *"success"* && $UPDATE_RESPONSE == *"Updated Name"* ]]; then
  echo -e "${GREEN}Update Profile test passed${NC}"
else
  echo -e "${RED}Update Profile test failed${NC}"
fi

# Test 6: Password Update
echo -e "\n${YELLOW}Testing Password Update...${NC}"
PASSWORD_UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "currentPassword": "password123",
    "newPassword": "newpassword123"
  }')

echo "Password Update Response: $PASSWORD_UPDATE_RESPONSE"

if [[ $PASSWORD_UPDATE_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Password Update test passed${NC}"
else
  echo -e "${RED}Password Update test failed${NC}"
fi

# Test 7: Refresh Token
echo -e "\n${YELLOW}Testing Token Refresh...${NC}"
REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/refresh-token" \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }")

echo "Refresh Response: $REFRESH_RESPONSE"

if [[ $REFRESH_RESPONSE == *"success"* && $REFRESH_RESPONSE == *"token"* ]]; then
  echo -e "${GREEN}Token Refresh test passed${NC}"
  NEW_TOKEN=$(echo $REFRESH_RESPONSE | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
  echo "New Auth token: $NEW_TOKEN"
else
  echo -e "${RED}Token Refresh test failed${NC}"
fi

# Test 8: Test with new password
echo -e "\n${YELLOW}Testing Signin with new password...${NC}"
SIGNIN_RESPONSE2=$(curl -s -X POST "$BASE_URL/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "newpassword123"
  }')

echo "Signin Response (new password): $SIGNIN_RESPONSE2"

if [[ $SIGNIN_RESPONSE2 == *"success"* && $SIGNIN_RESPONSE2 == *"token"* ]]; then
  echo -e "${GREEN}Signin with new password test passed${NC}"
else
  echo -e "${RED}Signin with new password test failed${NC}"
fi

echo -e "\n${GREEN}All authentication tests completed!${NC}"

# API base URL for user management
USER_URL="http://localhost:3000/api/users"

echo -e "\n${YELLOW}=== Testing User Management API (Master Only) ===${NC}"

# Use the token from previous tests (should be master token)
MASTER_TOKEN=$TOKEN

# Test 9: Get All Users (master only)
echo -e "\n${YELLOW}Testing Get All Users (master only)...${NC}"
GET_USERS_RESPONSE=$(curl -s -X GET "$USER_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MASTER_TOKEN")

echo "Get Users Response: $GET_USERS_RESPONSE"

if [[ $GET_USERS_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Get All Users test passed${NC}"
else
  echo -e "${RED}Get All Users test failed${NC}"
fi

# Test 10: Create New User (master only)
echo -e "\n${YELLOW}Testing Create New User (master only)...${NC}"
CREATE_USER_RESPONSE=$(curl -s -X POST "$USER_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MASTER_TOKEN" \
  -d '{
    "name": "Employee User",
    "username": "employee1",
    "email": "employee1@example.com",
    "password": "employee123",
    "role": "employee"
  }')

echo "Create User Response: $CREATE_USER_RESPONSE"

if [[ $CREATE_USER_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Create User test passed${NC}"
  # Extract user ID from response
  USER_ID=$(echo $CREATE_USER_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  echo "Created user ID: $USER_ID"
else
  echo -e "${RED}Create User test failed${NC}"
  # Set a default user ID for subsequent tests
  USER_ID=2
fi

# Test 11: Update User (master only)
echo -e "\n${YELLOW}Testing Update User (master only)...${NC}"
UPDATE_USER_RESPONSE=$(curl -s -X PATCH "$USER_URL/$USER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MASTER_TOKEN" \
  -d '{
    "name": "Updated Employee",
    "role": "employee"
  }')

echo "Update User Response: $UPDATE_USER_RESPONSE"

if [[ $UPDATE_USER_RESPONSE == *"success"* && $UPDATE_USER_RESPONSE == *"Updated Employee"* ]]; then
  echo -e "${GREEN}Update User test passed${NC}"
else
  echo -e "${RED}Update User test failed${NC}"
fi

# Test 12: Delete User (master only)
echo -e "\n${YELLOW}Testing Delete User (master only)...${NC}"
DELETE_USER_RESPONSE=$(curl -s -X DELETE "$USER_URL/$USER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MASTER_TOKEN")

echo "Delete User Response: $DELETE_USER_RESPONSE"

if [[ $DELETE_USER_RESPONSE == *"success"* ]]; then
  echo -e "${GREEN}Delete User test passed${NC}"
else
  echo -e "${RED}Delete User test failed${NC}"
fi

# Test 13: Try to delete your own account (should fail)
echo -e "\n${YELLOW}Testing Delete Own Account (should fail)...${NC}"
# Get own user ID
PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MASTER_TOKEN")
OWN_USER_ID=$(echo $PROFILE_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

DELETE_OWN_RESPONSE=$(curl -s -X DELETE "$USER_URL/$OWN_USER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MASTER_TOKEN")

echo "Delete Own Account Response: $DELETE_OWN_RESPONSE"

if [[ $DELETE_OWN_RESPONSE == *"Cannot delete your own account"* ]]; then
  echo -e "${GREEN}Delete Own Account prevention test passed${NC}"
else
  echo -e "${RED}Delete Own Account prevention test failed${NC}"
fi

echo -e "\n${GREEN}All tests completed!${NC}"
