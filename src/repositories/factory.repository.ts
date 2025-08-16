import { Pool, createConnection } from "mysql2/promise";
import { Factory, FactoryCreateParams, FactoryUpdateParams } from "../models/factory.model.js";
import { getCentralDB } from "../database/connectionManager.js";
import fs from 'fs';
import path from 'path';
import createLogger from "../utils/logger.js";

const logger = createLogger('@factoryRepository');

export class FactoryRepository {
    private db: Pool;

    constructor() {
        this.db = getCentralDB();
    }

    // Get all active factories
    async findAll(): Promise<Factory[]> {
        const [rows] = await this.db.execute(
            'SELECT * FROM factories WHERE is_active = TRUE ORDER BY factory_name'
        );
        return rows as Factory[];
    }

    // Get factory by ID
    async findById(id: number): Promise<Factory | null> {
        const [rows] = await this.db.execute(
            'SELECT * FROM factories WHERE id = ? AND is_active = TRUE',
            [id]
        );
        const factories = rows as Factory[];
        return factories.length > 0 ? factories[0] : null;
    }

    // Get factory by database name
    async findByDbName(dbName: string): Promise<Factory | null> {
        const [rows] = await this.db.execute(
            'SELECT * FROM factories WHERE db_name = ? AND is_active = TRUE',
            [dbName]
        );
        const factories = rows as Factory[];
        return factories.length > 0 ? factories[0] : null;
    }

    // Get factory by factory name
    async findByFactoryName(factoryName: string): Promise<Factory | null> {
        const [rows] = await this.db.execute(
            'SELECT * FROM factories WHERE factory_name = ? AND is_active = TRUE',
            [factoryName]
        );
        const factories = rows as Factory[];
        return factories.length > 0 ? factories[0] : null;
    }

    // Create new factory with database setup
    async create(params: FactoryCreateParams): Promise<Factory> {
        // Check for duplicate factory name
        const existingByName = await this.findByFactoryName(params.factory_name);
        if (existingByName) {
            throw new Error(`Factory with name '${params.factory_name}' already exists`);
        }

        // Check for duplicate database name
        const existingByDbName = await this.findByDbName(params.db_name);
        if (existingByDbName) {
            throw new Error(`Factory with database name '${params.db_name}' already exists`);
        }

        // Create the factory database and tables
        await this.createFactoryDatabase(params);

        const [result] = await this.db.execute(
            `INSERT INTO factories (
                factory_name, db_name, db_host, db_port, db_user, db_password, 
                is_active, max_connections
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                params.factory_name,
                params.db_name,
                params.db_host || 'localhost',
                params.db_port || 3306,
                params.db_user,
                params.db_password,
                params.is_active !== undefined ? params.is_active : true,
                params.max_connections || 10
            ]
        );

        const insertResult = result as any;
        const newFactory = await this.findById(insertResult.insertId);
        
        if (!newFactory) {
            throw new Error("Failed to create factory");
        }

        return newFactory;
    }

    // Update factory
    async update(id: number, params: FactoryUpdateParams): Promise<Factory> {
        const existingFactory = await this.findById(id);
        if (!existingFactory) {
            throw new Error(`Factory with ID ${id} not found`);
        }

        // Check for duplicate factory name (if changing)
        if (params.factory_name && params.factory_name !== existingFactory.factory_name) {
            const existingByName = await this.findByFactoryName(params.factory_name);
            if (existingByName) {
                throw new Error(`Factory with name '${params.factory_name}' already exists`);
            }
        }

        // Check for duplicate database name (if changing)
        if (params.db_name && params.db_name !== existingFactory.db_name) {
            const existingByDbName = await this.findByDbName(params.db_name);
            if (existingByDbName) {
                throw new Error(`Factory with database name '${params.db_name}' already exists`);
            }
        }

        // Build dynamic update query
        const updateFields: string[] = [];
        const updateValues: any[] = [];

        if (params.factory_name !== undefined) {
            updateFields.push('factory_name = ?');
            updateValues.push(params.factory_name);
        }
        if (params.db_name !== undefined) {
            updateFields.push('db_name = ?');
            updateValues.push(params.db_name);
        }
        if (params.db_host !== undefined) {
            updateFields.push('db_host = ?');
            updateValues.push(params.db_host);
        }
        if (params.db_port !== undefined) {
            updateFields.push('db_port = ?');
            updateValues.push(params.db_port);
        }
        if (params.db_user !== undefined) {
            updateFields.push('db_user = ?');
            updateValues.push(params.db_user);
        }
        if (params.db_password !== undefined) {
            updateFields.push('db_password = ?');
            updateValues.push(params.db_password);
        }
        if (params.is_active !== undefined) {
            updateFields.push('is_active = ?');
            updateValues.push(params.is_active);
        }
        if (params.max_connections !== undefined) {
            updateFields.push('max_connections = ?');
            updateValues.push(params.max_connections);
        }

        if (updateFields.length === 0) {
            return existingFactory; // No changes
        }

        updateValues.push(id);

        await this.db.execute(
            `UPDATE factories SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            updateValues
        );

        const updatedFactory = await this.findById(id);
        if (!updatedFactory) {
            throw new Error("Failed to update factory");
        }

        return updatedFactory;
    }

    // Soft delete factory (set is_active to false)
    async delete(id: number): Promise<void> {
        const existingFactory = await this.findById(id);
        if (!existingFactory) {
            throw new Error(`Factory with ID ${id} not found`);
        }

        await this.db.execute(
            'UPDATE factories SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
    }

    // Hard delete factory (permanent removal)
    async hardDelete(id: number): Promise<void> {
        const existingFactory = await this.findById(id);
        if (!existingFactory) {
            throw new Error(`Factory with ID ${id} not found`);
        }

        await this.db.execute('DELETE FROM factories WHERE id = ?', [id]);
    }

    // Update max_connections for a factory
    async updateMaxConnections(dbName: string, maxConnections: number): Promise<void> {
        await this.db.execute(
            'UPDATE factories SET max_connections = ?, updated_at = CURRENT_TIMESTAMP WHERE db_name = ?',
            [maxConnections, dbName]
        );
        logger.info(`Updated max_connections to ${maxConnections} for factory: ${dbName}`);
    }

    // Get factory statistics
    async getStats(): Promise<{
        total_factories: number;
        active_factories: number;
        inactive_factories: number;
    }> {
        const [totalRows] = await this.db.execute('SELECT COUNT(*) as count FROM factories');
        const [activeRows] = await this.db.execute('SELECT COUNT(*) as count FROM factories WHERE is_active = TRUE');
        const [inactiveRows] = await this.db.execute('SELECT COUNT(*) as count FROM factories WHERE is_active = FALSE');

        const total = (totalRows as any)[0].count;
        const active = (activeRows as any)[0].count;
        const inactive = (inactiveRows as any)[0].count;

        return {
            total_factories: total,
            active_factories: active,
            inactive_factories: inactive
        };
    }

    // Create factory database and tables dynamically
    private async createFactoryDatabase(params: FactoryCreateParams): Promise<void> {
        const connection = await createConnection({
            host: params.db_host,
            port: params.db_port,
            user: params.db_user,
            password: params.db_password,
            multipleStatements: true
        });

        try {
            logger.info(`Creating factory database: ${params.db_name}`);
            
            // Create the database
            await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${params.db_name}\``);
            logger.info(`✅ Database ${params.db_name} created`);
            
            // Use the new database
            // USE is not supported in prepared statement protocol; use query instead
            await connection.query(`USE \`${params.db_name}\``);
            logger.info(`✅ Switched to database ${params.db_name}`);

            // Read and execute the table creation SQL
            const tablesSQL = await this.readSQLFile('01-tables.sql');
            if (tablesSQL) {
                logger.info(`✅ SQL file loaded, executing table creation...`);
                // Execute multi-statement schema script using query to avoid PS limitations
                await connection.query(tablesSQL);
                logger.info(`✅ Tables created successfully in ${params.db_name}`);
                
                // Verify tables were created
                const [tables] = await connection.query('SHOW TABLES');
                logger.info(`✅ Tables in ${params.db_name}:`, tables);
            } else {
                throw new Error('Failed to load 01-tables.sql file');
            }

            logger.info(`✅ Successfully created factory database: ${params.db_name}`);
        } catch (error) {
            logger.error(`❌ Failed to create factory database ${params.db_name}:`, error);
            throw new Error(`Failed to create factory database: ${error}`);
        } finally {
            await connection.end();
        }
    }

    // Helper method to read SQL files
    private async readSQLFile(filename: string): Promise<string | null> {
        try {
            const sqlPath = path.join(process.cwd(), 'src', 'database', filename);
            logger.info(`Looking for SQL file at: ${sqlPath}`);
            
            if (fs.existsSync(sqlPath)) {
                const content = fs.readFileSync(sqlPath, 'utf8');
                logger.info(`✅ SQL file loaded: ${filename} (${content.length} characters)`);
                return content;
            }
            
            logger.error(`❌ SQL file not found: ${sqlPath}`);
            // Try alternative paths
            const altPath1 = path.join(process.cwd(), 'database', filename);
            const altPath2 = path.join(__dirname, '..', 'database', filename);
            logger.info(`Trying alternative paths:`);
            logger.info(`  - ${altPath1}: ${fs.existsSync(altPath1) ? 'EXISTS' : 'NOT FOUND'}`);
            logger.info(`  - ${altPath2}: ${fs.existsSync(altPath2) ? 'EXISTS' : 'NOT FOUND'}`);
            
            return null;
        } catch (error) {
            logger.error(`❌ Error reading SQL file ${filename}:`, error);
            return null;
        }
    }
}
