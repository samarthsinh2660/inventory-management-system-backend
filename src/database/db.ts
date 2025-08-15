import mysql from "mysql2/promise";
import { NODE_ENV, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER } from "../config/env.js";
import { initializeCentralDB, closeAllPools } from "./connectionManager.js";

// ✅ Legacy single-tenant pool (kept for backward compatibility)
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

// ✅ Initialize multi-tenant database system
export const initializeMultiTenantDB = async () => {
  // Initialize central DB connection
  initializeCentralDB({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: 'central_db', // Central database name
    port: Number(DB_PORT)
  });
  
  console.log("✅ Multi-tenant database system initialized");
};

// ✅ Test central DB connection at startup
export const connectToDatabase = async (retries = 10, delay = 3000) => {
    while (retries > 0) {
      try {
        // Test legacy connection (for backward compatibility)
        const connection = await db.getConnection();
        await connection.ping();
        connection.release();
        console.log("✅ Legacy MySQL pool connected successfully in", NODE_ENV);
        
        // Initialize multi-tenant system
        await initializeMultiTenantDB();
        
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

// ✅ Graceful shutdown function
export const gracefulShutdown = async () => {
  console.log("🔄 Shutting down database connections...");
  
  try {
    // Close all multi-tenant pools
    await closeAllPools();
    
    // Close legacy pool
    await db.end();
    
    console.log("✅ All database connections closed successfully");
  } catch (error) {
    console.error("❌ Error during database shutdown:", error);
  }
};
