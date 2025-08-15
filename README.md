# Multi‑Tenant Inventory Management Backend (Final README)

This repository contains a production‑ready, multi‑tenant SaaS backend for an inventory management platform built with Node.js, TypeScript, Express, and MySQL. It supports strict tenant isolation (one database per factory), dynamic connection pooling, unified multi‑tenant authentication, and automated backups.

---

## Architecture Overview

- Central database (`central_db`) stores factory metadata and connection info only.
- Each factory has its own isolated MySQL database (full schema per tenant).
- Usernames use `username@factory_db` format to determine tenant routing.
- A per‑tenant connection pool is created/reused on demand and cached in memory.
- JWT embeds `factory_db` and role; all repositories use the per‑request tenant pool.

Key benefits:
- Strong data isolation. No cross‑factory queries.
- Scales to many tenants; add tenants without impacting others.
- Resilient with connection health checks and automated backups.

---

## Key Features

- Multi-tenant isolation (one DB per factory) with dynamic, cached pools
- Unified auth using `username@factory_db` with role-based access (master/employee)
- Comprehensive modules: products, inventory, formulas (JSON BOM), audit logs, suppliers, locations, subcategories
- Advanced filtering for inventory and audit logs
- Stock threshold alerts and in-app notifications for masters
- Automated backups with retention and cleanup
- Crash recovery with automatic restart and detailed logging

## Quick Start

1) Install dependencies
```bash
npm install
```

2) Configure environment
Create a local env file named according to `NODE_ENV` (see `src/config/env.ts`): `.env.development.local` by default. Example variables:
```env
# Server
PORT=3000
NODE_ENV=development

# Database (central DB for multi-tenant metadata)
DB_HOST=localhost
DB_PORT=3306
DB_USER=tenant_admin
DB_PASSWORD=Tenant@123
DB_NAME=central_db

# JWT
JWT_SECRET=supersecret
JWT_EXPIRES_IN=7d

# Backups (used by backup.service)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=root
BACKUP_RETENTION_DAYS=7
```

3) Start server
```bash
npm start
```

---

## Docker Quickstart (Optional)

Using the included `docker-compose.yml`:
- MySQL: service `mysql_v2` on host port `3306` -> container `3306`
- App: service `app_v2` on host port `3000` -> container `3000`

Steps:
1) `docker compose up -d`
2) API at `http://localhost:3000`
3) Health check: `GET http://localhost:3000/health`

Note: When running in Docker, set `DB_HOST=mysql_v2` for the app service. The backup service also supports containerized MySQL via `MYSQL_HOST=mysql_v2`.

## Tenant Onboarding (Free Trial / Self‑Serve)

The registration form collects only 6 fields:
- factory_name
- db_name
- admin_username (no `@` allowed)
- admin_password (min 6 chars)
- admin_name
- admin_email (optional)

Defaults used by backend (not collected):
- db_host: "mysql_v2"
- db_port: 3306
- db_user: "tenant_admin"
- db_password: "Tenant@123"

Registration flow:
1. Create factory metadata in `central_db`.
2. Dynamically create factory database and full schema.
3. Create first admin user in tenant DB.
4. Initialize connection pool limits based on user count.

Login after registration:
- Use `POST /api/auth/login` with `username@factory_db` and password.

---

## Factory Registration API

- `POST /api/factory/register` — create factory DB, schema, and first admin user
- `GET /api/factory/factories` — list registered factories (public info)
- `POST /api/factory/sync-connections` — recompute optimal `max_connections` for all factories

Notes:
- Admin login format is returned in the response: `admin_username@db_name`
- Connection pool scales automatically as users are added/removed

## Authentication & Authorization

- Login requires `username@factory_db`. Backend extracts `factory_db`, resolves DB credentials from `central_db`, and authenticates against the tenant’s Users table.
- JWT includes `factory_db` and user role. Middleware initializes the tenant pool and attaches it to the request.
- All protected routes operate exclusively on the tenant database.
- Only master users can create employees and access admin‑only endpoints (e.g., manual backups).

---

## Multi‑Tenant Routing Flow

1. Client sends credentials using `username@factory_db`
2. Backend extracts `factory_db` and reads its connection info from the central database
3. A tenant-specific pool is created/reused and cached in memory
4. On successful login, JWT embeds `factory_db` and role
5. Middleware attaches the tenant pool to each authenticated request

## Dynamic Connection Pool Scaling

- Formula: `max_connections = max(user_count + 2, 5)`.
- Auto‑sync on user create/delete; no manual steps required for normal ops.
- Initial setup for new factory sets sensible defaults (e.g., 5 with 1 admin user).
- Manual sync endpoint provided for maintenance:
  - `POST /api/factory/sync-connections`

Benefits:
- Efficient resource usage, scales with team size, fail‑safe if sync fails.

---

## Automated MySQL Backups

- Scheduled every 4 hours using `node-cron` and `mysqldump` (cron: `0 */4 * * *`). Adjust in `src/services/backup.service.ts` as needed.
- Retention policy deletes backups older than 7 days.
- Backups stored in `db-backups/` (gitignored).
- Manual (master‑only) endpoints:
  - `GET /api/backup/status`
  - `POST /api/backup/trigger`
  - `POST /api/backup/cleanup`

Environment (defaults OK):
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=root
BACKUP_RETENTION_DAYS=7
```

Notes:
- Backs up central DB and all tenant DBs in a single transaction dump.
- Logs progress and results; cleans up old files automatically.

---

## Frontend Notes

- Login form must accept `username@factory_db` format.
- Registration form includes only 6 fields listed above.
- Optional UX: display username without the `@factory_db` suffix in UI only.

---

## Troubleshooting

- __ER_ACCESS_DENIED_ERROR__: Ensure tenant creation uses `tenant_admin` with proper GRANTs and correct credentials in `central_db`.
- __ER_UNSUPPORTED_PS__: We use `connection.query` and multi‑statement execution where needed.
- __Pool not found__: Ensure requests are authenticated; the auth middleware initializes the tenant pool after JWT verification.
- __MySQL host unreachable__: Verify `MYSQL_HOST`/`MYSQL_PORT` match your MySQL instance and that `mysqldump` is available on PATH.

---

## Production Recommendations

- Secure env vars and secrets management.
- Monitor backup success and storage usage.
- Consider offloading backups to cloud storage and encrypting files.
- Periodically test restore procedures and run DR drills.

---

## API Overview

All protected routes automatically use the tenant database resolved from JWT. Key domains include users, products, inventory entries, product formulas (single‑table with JSON components), audit logs (rich filtering), and stock alerts.

This README focuses on features, architecture, and usage. Route-level examples have been removed.

### Routes Map
- `GET /health` — service health
- `GET /` — API root
- `POST /api/factory` and related — tenant registration & maintenance (public)
- `POST /api/auth/login` — multi-tenant login with `username@factory_db`
- `/api/users` — user management
- `/api/products` — unified product listing/search with filters
- `/api/locations` — location management
- `/api/subcategories` — subcategory management
- `/api/product-formulas` — product BOMs (single-table JSON components)
- `/api/purchase-info` — supplier/vendor management
- `/api/inventory` — inventory entries and balance
- `/api/audit-logs` — audit trail with rich filtering
- `/api/alerts` — stock threshold alerts
- `/api/notifications` — in-app notifications
- `/api/backup` — backup status/trigger/cleanup

### API Highlights
- __Products (unified)__: `GET /api/products?search=steel&category=raw&subcategory_id=1&location_id=2&page=1&limit=20`
- __Inventory filters__: Search, entry type, user, location, reference, product hierarchy, date range, pagination
- __Audit log filters__: Search, action, user, location, flag, reference, product hierarchy, date range, pagination
- __Stock alerts__: `GET /api/alerts` (list), `GET /api/alerts/stock/threshold` (below min), `PATCH /api/alerts/:id/resolve`

---
 
## Crash Recovery System

The API includes a robust crash recovery system that ensures maximum uptime and reliability in production environments.

### 🛡️ Features

- **Automatic Crash Detection**: Monitors for uncaught exceptions and unhandled promise rejections
- **Detailed Crash Logging**: Logs crash details to both console and `logs/crashes.log` file
- **Automatic Recovery**: Automatically restarts the application after a crash (2-second delay)
- **Zero Interference**: No continuous monitoring - only activates during actual crashes
- **Production Ready**: Designed for deployment in production environments

### 📋 Crash Log Information

When a crash occurs, the system logs:
- **Crash Type**: UNCAUGHT_EXCEPTION or UNHANDLED_PROMISE_REJECTION
- **Error Details**: Full error message and stack trace
- **System Info**: Memory usage, uptime, Node.js version, platform
- **Timestamp**: Exact time of crash
- **Process Info**: Process ID and other relevant details

### 📁 Crash Log Example

```
🚨 ==================== APPLICATION CRASH ====================
💥 Crash Type: UNCAUGHT_EXCEPTION
🕒 Time: 2024-01-15T10:30:00.000Z
❌ Error: Cannot read property 'id' of undefined
📊 Memory: 128MB
⏱️ Uptime: 300s
📍 Stack: [full stack trace]
============================================================

📝 Crash logged to: logs/crashes.log
🔄 Attempting to restart application in 2 seconds...
🚀 Restarting application...
```

### 🔧 How It Works

1. **Global Error Handlers**: Capture any unhandled errors throughout the application
2. **Crash Logging**: Log comprehensive crash details to both console and file
3. **Graceful Restart**: Wait 2 seconds for logs to be written, then restart the process
4. **Process Manager Integration**: Works with PM2, Docker, or any process manager for automatic restarts

### 📊 Monitoring Crash Logs

- Crash logs are stored in `logs/crashes.log`
- Each crash entry is separated by `---` for easy parsing
- JSON format makes it easy to parse and analyze trends
- Monitor this file to identify recurring issues or patterns

### 🚀 Production Deployment

The crash recovery system is especially valuable in production:
- **Docker**: Container will restart automatically on crashes
- **PM2**: Process manager handles restarts seamlessly  
- **Kubernetes**: Pod restarts maintain service availability
- **Systemd**: Service restarts keep the API running

This ensures your inventory management system maintains high availability even in the face of unexpected errors.

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
