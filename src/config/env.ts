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

export const DB_HOST = process.env.DB_HOST!;
export const DB_USER = process.env.DB_USER!;
export const DB_PASSWORD = process.env.DB_PASSWORD!;
export const DB_NAME = process.env.DB_NAME!;
export const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

// JWT: assert that these are defined
export const JWT_SECRET = process.env.JWT_SECRET!;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

//cors
export const CORS_ORIGIN = process.env.CORS_ORIGIN;
export const CORS_ORIGIN1 = process.env.CORS_ORIGIN1;
export const CORS_ORIGIN2 = process.env.CORS_ORIGIN2;
export const CORS_ORIGIN3 = process.env.CORS_ORIGIN3;
export const CORS_ORIGIN4 = process.env.CORS_ORIGIN4;
export const CORS_ORIGIN5 = process.env.CORS_ORIGIN5;
export const CORS_ORIGIN6 = process.env.CORS_ORIGIN6;