import mysql from "mysql2/promise";
import { NODE_ENV, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER } from "../config/env.ts";

// ✅ Export the pool for queries
export const db = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: Number(DB_PORT),
  waitForConnections: true,
  connectionLimit: 50,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// ✅ Export this function to test DB connection at startup
export const connectToDatabase = async (retries = 10, delay = 3000) => {
    while (retries > 0) {
      try {
        const connection = await db.getConnection();
        await connection.ping(); // Test the connection
        connection.release();
        console.log("✅ MySQL pool connected successfully in", NODE_ENV);
        return;
      } catch (error) {
        retries--;
        console.warn(`⚠️ MySQL connection failed. Retries left: ${retries}`);
        console.error("🔁 Retrying in", delay / 1000, "seconds...");
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  
    console.error("❌ Could not connect to MySQL after multiple attempts. Exiting...");
    process.exit(1);
};
