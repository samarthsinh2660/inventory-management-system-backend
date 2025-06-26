# Inventory Ledger System with Audit Logs

## Overview

The Inventory Ledger System provides a comprehensive solution for tracking inventory movements with full audit capabilities. The system treats inventory operations as ledger entries, maintaining a complete history of all inventory transactions. It includes:

- **Inventory Entries**: Records all inventory movements ("in" or "out") with associated metadata
- **Audit Logs**: Tracks all changes to inventory entries, including creations, updates, and deletions
- **Automatic Balance Calculation**: Provides current inventory levels by product and location
- **Change Reversion**: Allows master users to revert changes by deleting audit logs

## System Architecture

### Database Schema

#### Inventory Entries Table
```sql
CREATE TABLE IF NOT EXISTS InventoryEntries (
  id INT NOT NULL AUTO_INCREMENT,
  product_id INT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  entry_type ENUM('in', 'out') NOT NULL,
  user_id INT NOT NULL,
  location_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  notes TEXT,
  reference_id INT, 
  reference_type VARCHAR(50),
  PRIMARY KEY (id),
  INDEX (product_id),
  INDEX (location_id),
  INDEX (user_id),
  INDEX (entry_type),
  INDEX (created_at)
);
```

#### Audit Logs Table
```sql
CREATE TABLE IF NOT EXISTS AuditLogs (
  id INT NOT NULL AUTO_INCREMENT,
  entry_id INT NOT NULL,
  action ENUM('create', 'update', 'delete') NOT NULL,
  user_id INT NOT NULL,
  old_data JSON,
  new_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  PRIMARY KEY (id),
  INDEX (entry_id),
  INDEX (user_id),
  INDEX (action),
  INDEX (created_at)
);
```

### Components

1. **Models**
   - `inventoryEntries.model.ts`: Defines TypeScript interfaces and SQL schema for inventory entries
   - `auditLogs.model.ts`: Defines TypeScript interfaces and SQL schema for audit logs

2. **Repositories**
   - `inventoryEntry.repository.ts`: Handles database operations for inventory entries
   - `auditLog.repository.ts`: Handles database operations for audit logs and reversion logic

3. **Controllers**
   - `inventoryEntry.controller.ts`: Exposes REST API endpoints for inventory entries
   - `auditLog.controller.ts`: Exposes REST API endpoints for audit logs

4. **Routes**
   - `inventoryEntry.routes.ts`: Defines API routes for inventory entries
   - `auditLog.routes.ts`: Defines API routes for audit logs

## API Endpoints

### Inventory Entries

#### `GET /api/inventory/balance`
- Get current inventory balance (stock levels)
- Query Parameters:
  - `location_id` (optional): Filter balance by location
- Response: List of products with their current stock level

#### `GET /api/inventory`
- Get all inventory entries with pagination
- Query Parameters:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `product_id`: Filter by product (optional)
  - `location_id`: Filter by location (optional)
  - `entry_type`: Filter by entry type (optional, 'in' or 'out')
  - `start_date`: Filter by date range start (optional)
  - `end_date`: Filter by date range end (optional)
- Response: Paginated list of inventory entries

#### `GET /api/inventory/:id`
- Get a specific inventory entry by ID
- Response: Single inventory entry

#### `GET /api/inventory/product/:productId`
- Get inventory entries for a specific product
- Query Parameters:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- Response: Paginated list of inventory entries for the product

#### `POST /api/inventory`
- Create a new inventory entry
- Request Body:
  ```json
  {
    "product_id": 1,
    "quantity": 10,
    "entry_type": "in",
    "location_id": 1,
    "notes": "Initial stock",
    "reference_id": null,
    "reference_type": null
  }
  ```
- Response: Created inventory entry

#### `PUT /api/inventory/:id`
- Update an existing inventory entry (master only)
- Request Body: Fields to update
- Response: Updated inventory entry

#### `DELETE /api/inventory/:id`
- Delete an inventory entry (master only)
- Response: Success message

### Audit Logs

#### `GET /api/audit-logs`
- Get all audit logs with pagination and filtering
- Query Parameters:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `entry_id`: Filter by inventory entry ID (optional)
  - `action`: Filter by action type (optional, 'create', 'update', or 'delete')
  - `user_id`: Filter by user (optional)
  - `start_date`: Filter by date range start (optional)
  - `end_date`: Filter by date range end (optional)
- Response: Paginated list of audit logs

#### `GET /api/audit-logs/:id`
- Get a specific audit log by ID
- Response: Single audit log

#### `GET /api/audit-logs/entry/:entryId`
- Get audit logs for a specific inventory entry
- Query Parameters:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- Response: Paginated list of audit logs for the entry

#### `DELETE /api/audit-logs/:id`
- Delete an audit log (master only)
- Query Parameters:
  - `revert`: Boolean flag to revert changes (default: false)
- Response: Success message

## Role-Based Access Control

1. **Employee Users**
   - Can view inventory entries, balances, and audit logs
   - Can create new inventory entries
   - Cannot update or delete inventory entries
   - Cannot delete audit logs or revert changes

2. **Master Users**
   - Full access to all functionality
   - Can update and delete inventory entries
   - Can delete audit logs and revert changes

## Error Handling

The system includes comprehensive error handling for:
- Validation errors
- Preventing negative inventory
- Permission checks
- Not found errors
- Reversion failures

## Usage Examples

### Adding New Inventory

```javascript
// Employee adds 10 units of product #5 to warehouse #2
fetch('/api/inventory', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_id: 5,
    quantity: 10,
    entry_type: 'in',
    location_id: 2,
    notes: 'Weekly restock'
  })
});
```

### Checking Current Stock Levels

```javascript
// Get current stock levels across all locations
fetch('/api/inventory/balance')
  .then(response => response.json())
  .then(data => console.log(data));

// Get stock levels in warehouse #2 only
fetch('/api/inventory/balance?location_id=2')
  .then(response => response.json())
  .then(data => console.log(data));
```

### Reverting an Employee's Mistake

```javascript
// Master user finds the audit log for the mistake
fetch('/api/audit-logs?entry_id=42')
  .then(response => response.json())
  .then(data => {
    // Delete the audit log and revert the changes
    const logId = data.data[0].id;
    return fetch(`/api/audit-logs/${logId}?revert=true`, {
      method: 'DELETE'
    });
  });
```

## Error Codes

- `70001`: INVENTORY_ENTRY_NOT_FOUND
- `70002`: INVENTORY_ENTRY_CREATE_FAILED
- `70003`: INVENTORY_NEGATIVE_NOT_ALLOWED
- `70004`: INVENTORY_ENTRY_UPDATE_FAILED
- `70005`: INVENTORY_ENTRY_DELETE_FAILED
- `70006`: INVENTORY_ENTRY_GET_BALANCE_FAILED
- `80001`: AUDIT_LOG_CREATE_FAILED
- `80002`: AUDIT_LOG_NOT_FOUND
- `80003`: AUDIT_LOG_DELETE_FAILED
- `80004`: AUDIT_LOG_REVERT_FAILED
- `80005`: AUDIT_LOG_MASTER_ONLY

## Testing

The system includes comprehensive tests for:
- Inventory entry operations
- Audit log tracking
- Reversion functionality
- Error handling

Run the tests with:

```bash
npm test
```
