import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Look for the .env file in the project root
const envPath = path.join(__dirname, '..', '..', `.env.${process.env.NODE_ENV || 'development'}.local`);
const result = config({ path: envPath });

if (result.error) {
  console.warn(`Warning: Environment file not found or couldn't be loaded`);
}

// Required string values
export const PORT = process.env.PORT;
export const NODE_ENV = process.env.NODE_ENV;
export const SERVER_URL = process.env.SERVER_URL;

// Base file name used for backups (e.g., multi_tenant_backup)
export const BACKUP_BASE_NAME = process.env.BACKUP_BASE_NAME || 'multi_tenant_backup';

// Azure Blob Storage configuration
export const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
export const AZURE_STORAGE_ACCOUNT_KEY = process.env.AZURE_STORAGE_ACCOUNT_KEY;
export const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'database-backups';
export const AZURE_BACKUP_ENABLED = process.env.AZURE_BACKUP_ENABLED === 'true';

export const DB_HOST = process.env.DB_HOST!;
export const DB_USER = process.env.DB_USER!;
export const DB_PASSWORD = process.env.DB_PASSWORD!;
export const DB_NAME = process.env.DB_NAME!;
export const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

// JWT: assert that these are defined
export const JWT_SECRET = process.env.JWT_SECRET!;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
export const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN;

//cors
export const CORS_ORIGIN = process.env.CORS_ORIGIN;
export const CORS_ORIGIN1 = process.env.CORS_ORIGIN1;
export const CORS_ORIGIN2 = process.env.CORS_ORIGIN2;
export const CORS_ORIGIN3 = process.env.CORS_ORIGIN3;
export const CORS_ORIGIN4 = process.env.CORS_ORIGIN4;
export const CORS_ORIGIN5 = process.env.CORS_ORIGIN5;
export const CORS_ORIGIN6 = process.env.CORS_ORIGIN6;

// Tenant DB admin (used only for provisioning tenant databases)
export const TENANT_DB_ADMIN_USER = process.env.TENANT_DB_ADMIN_USER;
export const TENANT_DB_ADMIN_PASSWORD = process.env.TENANT_DB_ADMIN_PASSWORD;

// MySQL/Backup env for backup.service
export const MYSQL_HOST = process.env.MYSQL_HOST;
export const MYSQL_PORT = parseInt(process.env.MYSQL_PORT || '3306', 10);
export const MYSQL_USER = process.env.MYSQL_USER;
export const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD;
export const BACKUP_RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10);