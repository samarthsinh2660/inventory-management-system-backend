import mysql, { Pool, PoolConnection } from "mysql2/promise";
import { Factory } from "../models/factory.model.js";

// In-memory cache for connection pools
const poolCache = new Map<string, Pool>();

// Central DB connection (for factory lookup)
let centralPool: Pool | null = null;

export const initializeCentralDB = (config: {
    host: string;
    user: string;
    password: string;
    database: string;
    port: number;
}) => {
    centralPool = mysql.createPool({
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database,
        port: config.port,
        waitForConnections: true,
        connectionLimit: 10,
        maxIdle: 5,
        idleTimeout: 60000,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
    });
    
    console.log("✅ Central DB pool initialized");
};

export const getCentralDB = (): Pool => {
    if (!centralPool) {
        throw new Error("Central DB not initialized. Call initializeCentralDB first.");
    }
    return centralPool;
};

// Extract factory DB name from username (e.g., "john@pranav_factory" -> "pranav_factory")
export const extractFactoryFromUsername = (username: string): string => {
    const parts = username.split('@');
    if (parts.length !== 2) {
        throw new Error("Invalid username format. Expected format: user@factory_name");
    }
    return parts[1];
};

// Get factory details from central DB
export const getFactoryByDbName = async (dbName: string): Promise<Factory | null> => {
    const centralDB = getCentralDB();
    
    const [rows] = await centralDB.execute(
        'SELECT * FROM factories WHERE db_name = ? AND is_active = TRUE',
        [dbName]
    );
    
    const factories = rows as Factory[];
    return factories.length > 0 ? factories[0] : null;
};

// Create or get existing connection pool for a factory
export const getFactoryPool = async (factory: Factory): Promise<Pool> => {
    const poolKey = factory.db_name;
    
    // Check if pool already exists and is healthy
    if (poolCache.has(poolKey)) {
        const existingPool = poolCache.get(poolKey)!;
        
        try {
            // Test the pool with a ping
            const connection = await existingPool.getConnection();
            await connection.ping();
            connection.release();
            
            console.log(`✅ Reusing existing pool for factory: ${factory.factory_name}`);
            return existingPool;
        } catch (error) {
            console.warn(`⚠️ Existing pool for ${factory.factory_name} is unhealthy, recreating...`);
            // Remove the unhealthy pool
            existingPool.end();
            poolCache.delete(poolKey);
        }
    }
    
    // Create new pool
    console.log(`🔄 Creating new pool for factory: ${factory.factory_name}`);
    
    const newPool = mysql.createPool({
        host: factory.db_host,
        user: factory.db_user,
        password: factory.db_password,
        database: factory.db_name,
        port: factory.db_port,
        waitForConnections: true,
        connectionLimit: factory.max_connections,
        maxIdle: Math.floor(factory.max_connections / 2),
        idleTimeout: 60000,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
    });
    
    // Test the new pool
    try {
        const connection = await newPool.getConnection();
        await connection.ping();
        connection.release();
        
        // Cache the pool
        poolCache.set(poolKey, newPool);
        console.log(`✅ New pool created and cached for factory: ${factory.factory_name}`);
        
        return newPool;
    } catch (error) {
        console.error(`❌ Failed to create pool for factory ${factory.factory_name}:`, error);
        newPool.end();
        throw new Error(`Unable to connect to factory database: ${factory.factory_name}`);
    }
};

// Get connection pool by username
export const getPoolByUsername = async (username: string): Promise<Pool> => {
    try {
        // Extract factory name from username
        const factoryDbName = extractFactoryFromUsername(username);
        
        // Get factory details from central DB
        const factory = await getFactoryByDbName(factoryDbName);
        if (!factory) {
            throw new Error(`Factory not found or inactive: ${factoryDbName}`);
        }
        
        // Get or create connection pool
        return await getFactoryPool(factory);
    } catch (error) {
        console.error("Error getting pool by username:", error);
        throw error;
    }
};

// Cleanup function to close all pools
export const closeAllPools = async (): Promise<void> => {
    console.log("🔄 Closing all connection pools...");
    
    const closePromises: Promise<void>[] = [];
    
    // Close factory pools
    for (const [factoryName, pool] of poolCache.entries()) {
        console.log(`Closing pool for factory: ${factoryName}`);
        closePromises.push(pool.end());
    }
    
    // Close central pool
    if (centralPool) {
        console.log("Closing central DB pool");
        closePromises.push(centralPool.end());
    }
    
    await Promise.all(closePromises);
    
    poolCache.clear();
    centralPool = null;
    
    console.log("✅ All pools closed successfully");
};

// Health check for all pools
export const healthCheckPools = async (): Promise<{ [key: string]: boolean }> => {
    const healthStatus: { [key: string]: boolean } = {};
    
    // Check central pool
    if (centralPool) {
        try {
            const connection = await centralPool.getConnection();
            await connection.ping();
            connection.release();
            healthStatus['central_db'] = true;
        } catch (error) {
            healthStatus['central_db'] = false;
        }
    }
    
    // Check factory pools
    for (const [factoryName, pool] of poolCache.entries()) {
        try {
            const connection = await pool.getConnection();
            await connection.ping();
            connection.release();
            healthStatus[factoryName] = true;
        } catch (error) {
            healthStatus[factoryName] = false;
        }
    }
    
    return healthStatus;
};

// Get pool statistics
export const getPoolStats = (): { [key: string]: any } => {
    const stats: { [key: string]: any } = {};
    
    stats['total_factory_pools'] = poolCache.size;
    stats['central_pool_active'] = centralPool !== null;
    
    // Get individual pool stats
    for (const [factoryName, pool] of poolCache.entries()) {
        stats[factoryName] = {
            // Note: mysql2 doesn't expose detailed pool stats, but we can add custom tracking if needed
            pool_exists: true
        };
    }
    
    return stats;
};
