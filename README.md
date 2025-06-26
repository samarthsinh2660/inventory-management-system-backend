# Inventory Management System API

## Overview

This API provides a comprehensive inventory management system with audit logging capabilities. It allows tracking of inventory movements, products, locations, subcategories, and product formulas with full authentication support and role-based access control.

## Table of Contents

- [Setup and Installation](#setup-and-installation)
- [Authentication](#authentication)
- [API Routes](#api-routes)
  - [Auth Routes](#auth-routes)
  - [Inventory Entry Routes](#inventory-entry-routes)
  - [Audit Log Routes](#audit-log-routes)
  - [Product Routes](#product-routes)
  - [Location Routes](#location-routes)
  - [Subcategory Routes](#subcategory-routes)
  - [Product Formula Routes](#product-formula-routes)
- [Customization Options](#customization-options)
- [Error Handling](#error-handling)
- [Database Schema](#database-schema)
- [Stock Alert System](#stock-alert-system)

## Setup and Installation

### Prerequisites

- Node.js (v14+)
- MySQL (v8+)

### Using Docker

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/inventory-management-system.git
   cd inventory-management-system
   ```

2. Start with Docker Compose:
   ```bash
   docker-compose up -d
   ```

   This will:
   - Start a MySQL database with pre-configured schema
   - Start the Node.js backend API on port 3000

### Manual Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/inventory-management-system.git
   cd inventory-management-system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit the .env file with your database credentials
   ```

4. Run database migrations:
   ```bash
   npm run migrate
   ```

5. Start the server:
   ```bash
   npm start
   ```

## Authentication

The API uses JWT authentication with role-based access control. Two roles are supported:

- **Employee**: Basic access to view data and create entries
- **Master**: Full access to all features including updates, deletions, and reversions

### Token Format

JWT tokens contain:
- `id`: User ID
- `username`: Username
- `is_master`: Boolean indicating master privileges

## API Routes

### Auth Routes

#### Register a new user

```
POST /api/auth/register
```

Request body:
```json
{
  "username": "john",
  "password": "password123",
  "is_master": false
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "john",
    "is_master": false
  }
}
```

#### Login

```
POST /api/auth/login
```

Request body:
```json
{
  "username": "john",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "john",
    "is_master": false
  }
}
```

### Inventory Entry Routes

All routes require authentication.

#### Get inventory balance

```
GET /api/inventory/balance
```

Query parameters:
- `location_id` (optional): Filter by location ID

Response:
```json
{
  "success": true,
  "data": [
    {
      "product_id": 1,
      "product_name": "Product A",
      "location_id": 1,
      "location_name": "Warehouse 1",
      "balance": 150.00
    }
  ]
}
```

#### Get all inventory entries

```
GET /api/inventory
```

Query parameters:
- `page` (default: 1): Page number
- `limit` (default: 10): Items per page
- `product_id` (optional): Filter by product
- `location_id` (optional): Filter by location
- `entry_type` (optional): Filter by entry type ('in' or 'out')
- `start_date` (optional): Filter by date range start
- `end_date` (optional): Filter by date range end

Response:
```json
{
  "success": true,
  "data": [...],
  "total": 50,
  "page": 1,
  "limit": 10
}
```

#### Get entry by ID

```
GET /api/inventory/:id
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "product_id": 1,
    "product_name": "Product A",
    "quantity": 10.00,
    "entry_type": "in",
    "location_id": 1,
    "location_name": "Warehouse 1",
    "user_id": 1,
    "username": "john",
    "created_at": "2025-06-26T10:00:00.000Z",
    "updated_at": "2025-06-26T10:00:00.000Z",
    "notes": "Initial stock",
    "reference_id": null,
    "reference_type": null
  }
}
```

#### Get entries for a specific product

```
GET /api/inventory/product/:productId
```

Query parameters:
- `page` (default: 1): Page number
- `limit` (default: 10): Items per page

Response: Same format as GET /api/inventory

#### Create inventory entry

```
POST /api/inventory
```

Request body:
```json
{
  "product_id": 1,
  "quantity": 10.00,
  "entry_type": "in",
  "location_id": 1,
  "notes": "Restock",
  "reference_id": null,
  "reference_type": null
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "product_id": 1,
    "quantity": 10.00,
    "entry_type": "in",
    "location_id": 1,
    "user_id": 1,
    "created_at": "2025-06-26T10:00:00.000Z",
    "updated_at": "2025-06-26T10:00:00.000Z",
    "notes": "Restock",
    "reference_id": null,
    "reference_type": null
  }
}
```

#### Update inventory entry (Master only)

```
PUT /api/inventory/:id
```

Request body:
```json
{
  "quantity": 15.00,
  "notes": "Updated quantity"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "quantity": 15.00,
    "notes": "Updated quantity",
    "updated_at": "2025-06-26T11:00:00.000Z",
    // ... other fields
  }
}
```

#### Delete inventory entry (Master only)

```
DELETE /api/inventory/:id
```

Response:
```json
{
  "success": true,
  "message": "Inventory entry deleted successfully"
}
```

### Audit Log Routes

All routes require authentication.

#### Get all audit logs

```
GET /api/audit-logs
```

Query parameters:
- `page` (default: 1): Page number
- `limit` (default: 10): Items per page
- `entry_id` (optional): Filter by entry ID
- `action` (optional): Filter by action ('create', 'update', 'delete')
- `user_id` (optional): Filter by user ID
- `start_date` (optional): Filter by date range start
- `end_date` (optional): Filter by date range end

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "entry_id": 1,
      "action": "create",
      "user_id": 1,
      "username": "john",
      "old_data": null,
      "new_data": {...},
      "created_at": "2025-06-26T10:00:00.000Z",
      "reason": null
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10
}
```

#### Get audit log by ID

```
GET /api/audit-logs/:id
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "entry_id": 1,
    "action": "create",
    "user_id": 1,
    "username": "john",
    "old_data": null,
    "new_data": {...},
    "created_at": "2025-06-26T10:00:00.000Z",
    "reason": null
  }
}
```

#### Get audit logs by entry ID

```
GET /api/audit-logs/entry/:entryId
```

Query parameters:
- `page` (default: 1): Page number
- `limit` (default: 10): Items per page

Response: Same format as GET /api/audit-logs

#### Get audit logs by record type

```
GET /api/audit-logs/record-type/:recordType
```

Query parameters:
- `page` (default: 1): Page number
- `limit` (default: 10): Items per page

Response: Same format as GET /api/audit-logs

#### Delete audit log (Master only)

```
DELETE /api/audit-logs/:id
```

Query parameters:
- `revert` (default: false): Whether to revert the changes

Response:
```json
{
  "success": true,
  "message": "Audit log deleted successfully"
}
```

### Product Routes

All routes require authentication.

#### Get all products

```
GET /api/products
```

Query parameters:
- `page` (default: 1): Page number
- `limit` (default: 10): Items per page
- `subcategory_id` (optional): Filter by subcategory

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Product A",
      "description": "Description of Product A",
      "subcategory_id": 1,
      "subcategory_name": "Subcategory 1",
      "created_at": "2025-06-26T10:00:00.000Z",
      "updated_at": "2025-06-26T10:00:00.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10
}
```

#### Get product by ID

```
GET /api/products/:id
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Product A",
    "description": "Description of Product A",
    "subcategory_id": 1,
    "subcategory_name": "Subcategory 1",
    "created_at": "2025-06-26T10:00:00.000Z",
    "updated_at": "2025-06-26T10:00:00.000Z"
  }
}
```

#### Create product (Master only)

```
POST /api/products
```

Request body:
```json
{
  "name": "Product A",
  "description": "Description of Product A",
  "subcategory_id": 1
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Product A",
    "description": "Description of Product A",
    "subcategory_id": 1,
    "created_at": "2025-06-26T10:00:00.000Z",
    "updated_at": "2025-06-26T10:00:00.000Z"
  }
}
```

#### Update product (Master only)

```
PUT /api/products/:id
```

Request body:
```json
{
  "name": "Updated Product A",
  "description": "Updated description"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Updated Product A",
    "description": "Updated description",
    "subcategory_id": 1,
    "updated_at": "2025-06-26T11:00:00.000Z",
    // ... other fields
  }
}
```

#### Delete product (Master only)

```
DELETE /api/products/:id
```

Response:
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

### Location Routes

All routes require authentication.

#### Get all locations

```
GET /api/locations
```

Query parameters:
- `page` (default: 1): Page number
- `limit` (default: 10): Items per page

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Warehouse 1",
      "address": "123 Main St"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 10
}
```

#### Get location by ID

```
GET /api/locations/:id
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Warehouse 1",
    "address": "123 Main St"
  }
}
```

#### Create location (Master only)

```
POST /api/locations
```

Request body:
```json
{
  "name": "Warehouse 2",
  "address": "456 Second Ave"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Warehouse 2",
    "address": "456 Second Ave"
  }
}
```

#### Update location (Master only)

```
PUT /api/locations/:id
```

Request body:
```json
{
  "name": "Updated Warehouse",
  "address": "789 Third St"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Updated Warehouse",
    "address": "789 Third St"
  }
}
```

#### Delete location (Master only)

```
DELETE /api/locations/:id
```

Response:
```json
{
  "success": true,
  "message": "Location deleted successfully"
}
```

### Subcategory Routes

All routes require authentication.

#### Get all subcategories

```
GET /api/subcategories
```

Query parameters:
- `page` (default: 1): Page number
- `limit` (default: 10): Items per page

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Subcategory 1",
      "description": "Description of Subcategory 1"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 10
}
```

#### Get subcategory by ID

```
GET /api/subcategories/:id
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Subcategory 1",
    "description": "Description of Subcategory 1"
  }
}
```

#### Create subcategory (Master only)

```
POST /api/subcategories
```

Request body:
```json
{
  "name": "Subcategory 2",
  "description": "Description of Subcategory 2"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Subcategory 2",
    "description": "Description of Subcategory 2"
  }
}
```

#### Update subcategory (Master only)

```
PUT /api/subcategories/:id
```

Request body:
```json
{
  "name": "Updated Subcategory",
  "description": "Updated description"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Updated Subcategory",
    "description": "Updated description"
  }
}
```

#### Delete subcategory (Master only)

```
DELETE /api/subcategories/:id
```

Response:
```json
{
  "success": true,
  "message": "Subcategory deleted successfully"
}
```

### Product Formula Routes

All routes require authentication.

#### Get all product formulas

```
GET /api/product-formulas
```

Query parameters:
- `page` (default: 1): Page number
- `limit` (default: 10): Items per page
- `product_id` (optional): Filter by product

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_id": 1,
      "component_id": 2,
      "quantity": 3.5,
      "created_at": "2025-06-26T10:00:00.000Z",
      "updated_at": "2025-06-26T10:00:00.000Z"
    }
  ],
  "total": 20,
  "page": 1,
  "limit": 10
}
```

#### Get product formula by ID

```
GET /api/product-formulas/:id
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "product_id": 1,
    "product_name": "Product A",
    "component_id": 2,
    "component_name": "Component B",
    "quantity": 3.5,
    "created_at": "2025-06-26T10:00:00.000Z",
    "updated_at": "2025-06-26T10:00:00.000Z"
  }
}
```

#### Get formulas for a product

```
GET /api/product-formulas/product/:productId
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_id": 1,
      "component_id": 2,
      "component_name": "Component B",
      "quantity": 3.5,
      "created_at": "2025-06-26T10:00:00.000Z",
      "updated_at": "2025-06-26T10:00:00.000Z"
    }
  ]
}
```

#### Create product formula (Master only)

```
POST /api/product-formulas
```

Request body:
```json
{
  "product_id": 1,
  "component_id": 2,
  "quantity": 3.5
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "product_id": 1,
    "component_id": 2,
    "quantity": 3.5,
    "created_at": "2025-06-26T10:00:00.000Z",
    "updated_at": "2025-06-26T10:00:00.000Z"
  }
}
```

#### Update product formula (Master only)

```
PUT /api/product-formulas/:id
```

Request body:
```json
{
  "quantity": 4.0
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "product_id": 1,
    "component_id": 2,
    "quantity": 4.0,
    "updated_at": "2025-06-26T11:00:00.000Z",
    // ... other fields
  }
}
```

#### Delete product formula (Master only)

```
DELETE /api/product-formulas/:id
```

Response:
```json
{
  "success": true,
  "message": "Product formula deleted successfully"
}
```

## Stock Alert System

The Inventory Management System includes a comprehensive stock threshold alert mechanism that automatically monitors inventory levels and notifies master users when products fall below their defined minimum thresholds.

#### Key Features

- **Automatic Monitoring**: The system continuously monitors stock levels after every inventory operation
- **Threshold Configuration**: Each product can have its own minimum stock threshold (`min_stock_threshold`) 
- **In-App Notifications**: Alerts are immediately available in the admin dashboard
- **Alert Management**: Master users can mark alerts as resolved after taking action
- **Manual Checking**: Admins can manually trigger threshold checks at any time

#### How It Works

1. When inventory operations occur (adding or removing stock), the system automatically:
   - Calculates current stock levels for affected products
   - Compares them against their configured minimum thresholds
   - Generates alerts for products that fall below threshold
   - Creates in-app notifications for master users

2. Alerts are stored in two database tables:
   - `StockAlerts`: Tracks all threshold violations with product details and resolution status
   - `Notifications`: Stores user-specific notifications for the admin dashboard

3. Master users can:
   - View all products currently below threshold 
   - See detailed alert information with product and location data
   - Mark alerts as resolved after addressing the issue
   - Manually trigger checks for new alerts

#### Stock Alert APIs

| Method | Endpoint | Description | Authorization |
|--------|----------|-------------|--------------|
| GET | `/api/alerts` | Get all stock alerts with pagination | Any |
| GET | `/api/alerts/stock/threshold` | Get products below minimum threshold | Any |
| PATCH | `/api/alerts/:id/resolve` | Mark an alert as resolved | Master |
| POST | `/api/alerts/check` | Manually trigger check for new alerts | Master |

#### Sample API Responses

**Get all alerts:**
```json
{
  "success": true,
  "count": 2,
  "total": 5,
  "page": 1,
  "limit": 10,
  "data": [
    {
      "id": 1,
      "product_id": 5,
      "product_name": "Steel Sheet 5mm",
      "current_stock": 45.5,
      "min_threshold": 50,
      "location_name": "Main Warehouse",
      "created_at": "2025-06-26T10:30:15.000Z",
      "is_resolved": false,
      "resolved_at": null
    },
    {
      "id": 2,
      "product_id": 8,
      "product_name": "Blue Paint",
      "current_stock": 3,
      "min_threshold": 5,
      "location_name": "Paint Shop",
      "created_at": "2025-06-26T11:15:22.000Z",
      "is_resolved": false,
      "resolved_at": null
    }
  ]
}
```

**Products below threshold:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 5,
      "name": "Steel Sheet 5mm",
      "min_stock_threshold": 50,
      "current_stock": 45.5,
      "location_id": 1,
      "location_name": "Main Warehouse"
    },
    // ...more products
  ]
}
```

#### Implementing in the Admin Dashboard

To implement the alert system in your frontend admin dashboard:

1. **Setup:**
   - Set appropriate `min_stock_threshold` values for each product when creating/updating them

2. **Dashboard Display:**
   - Poll the `/api/alerts?resolved=false` endpoint periodically to fetch active alerts
   - Display a notification count or badge showing the number of unresolved alerts
   - Create a dedicated alerts section on the dashboard

3. **Alert Handling:**
   - Show alert details including product name, current stock, threshold, and location
   - Provide action buttons for restocking or viewing product details
   - Allow admins to mark alerts as resolved using the `PATCH /api/alerts/:id/resolve` endpoint
   
4. **Manual Checking:**
   - Provide a "Check Alerts" button that calls `POST /api/alerts/check` to manually trigger a threshold check

#### Integration with Inventory Operations

The alert system is automatically triggered after these operations:
- Adding inventory (manual_in)
- Removing inventory (manual_out)
- Manufacturing processes (manufacturing_in/out)

This ensures real-time monitoring without requiring manual checks.

## Customization Options

### Environment Variables

The system can be customized through environment variables:

- `PORT`: Server port (default: 3000)
- `DB_HOST`: Database host (default: localhost)
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password
- `DB_DATABASE`: Database name
- `JWT_SECRET`: Secret for JWT signing
- `JWT_EXPIRES_IN`: Token expiration time (default: '24h')
- `CORS_ORIGIN`: Allowed CORS origin (default: '*')

### Pagination

Pagination defaults can be customized in the respective controller files:
- Default page size (limit): 10 items per page
- Maximum page size: 100 items per page

### Authentication Options

- Token expiration time: Can be configured through `JWT_EXPIRES_IN` environment variable
- Password hashing: Uses bcrypt with 10 rounds (configurable in auth.service.ts)

### Auditing Options

Configure which fields to include in audit logs by modifying the `auditLog.repository.ts` file:
- You can customize which fields are captured in `old_data` and `new_data`
- You can add or remove actions that trigger audit logs

## Error Handling

The API uses a standardized error response format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

Common error codes:

- `10001` to `19999`: Authentication/Authorization errors
- `20001` to `29999`: Validation errors
- `30001` to `39999`: General resource errors
- `40001` to `49999`: Product related errors
- `50001` to `59999`: Location related errors
- `60001` to `69999`: Subcategory related errors
- `70001` to `79999`: Inventory entry related errors
- `80001` to `89999`: Audit log related errors
- `90001` to `99999`: Product formula related errors

## Database Schema

The system uses a relational database with the following tables:

- `Users`: User accounts with authentication data
- `Products`: Product master data
- `Locations`: Warehouse/storage locations
- `Subcategories`: Product categorization
- `InventoryEntries`: Records of inventory movements
- `AuditLogs`: Audit trail of changes to inventory entries
- `ProductFormulas`: Bill of materials for products

See the SQL schema in the 
![uml](https://github.com/user-attachments/assets/635b4b6a-967d-48b7-b908-19cc58c9a52e)
.
