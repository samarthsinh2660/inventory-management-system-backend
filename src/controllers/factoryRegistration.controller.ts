import { Request, Response } from 'express';
import { FactoryRepository } from '../repositories/factory.repository.js';
import { FactoryCreateParams } from '../models/factory.model.js';
import { ConnectionSyncService } from '../services/connectionSync.service.js';
import bcrypt from 'bcrypt';
import { TENANT_DB_ADMIN_USER, TENANT_DB_ADMIN_PASSWORD , DB_HOST, DB_PORT } from '../config/env.js';

export class FactoryRegistrationController {
    private factoryRepository: FactoryRepository;
    private connectionSyncService: ConnectionSyncService;

    constructor() {
        this.factoryRepository = new FactoryRepository();
        this.connectionSyncService = new ConnectionSyncService();
    }

    // Register a new factory (creates database and admin user)
    registerFactory = async (req: Request, res: Response): Promise<void> => {
        try {
            const {
                factory_name,
                db_name,
                admin_username,
                admin_password,
                admin_name,
                admin_email,
                // Optional fields with defaults
                db_host,
                db_port,
                db_user,
                db_password,
                max_connections
            } = req.body;

            // Validate required fields (only user-provided fields)
            if (!factory_name || !db_name || !admin_username || !admin_password || !admin_name) {
                res.status(400).json({
                    error: 'Missing required fields',
                    required: ['factory_name', 'db_name', 'admin_username', 'admin_password', 'admin_name']
                });
                return;
            }

            // Validate database name format (no special characters except underscore)
            if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(db_name)) {
                res.status(400).json({
                    error: 'Invalid database name. Must start with letter and contain only letters, numbers, and underscores.'
                });
                return;
            }

            // Validate username format (no @ symbol as it's used for factory routing)
            if (admin_username.includes('@')) {
                res.status(400).json({
                    error: 'Admin username cannot contain @ symbol'
                });
                return;
            }

            // Calculate initial max_connections based on user count (1 admin user + buffer)
            const initialMaxConnections = ConnectionSyncService.getRecommendedConnections(1);

            const factoryParams: FactoryCreateParams = {
                factory_name,
                db_name,
                db_host: db_host || DB_HOST,
                db_port: db_port || DB_PORT,
                db_user: db_user || TENANT_DB_ADMIN_USER,  // Default tenant admin user from env
                db_password: db_password || TENANT_DB_ADMIN_PASSWORD,  // Default tenant admin password from env
                is_active: true,
                max_connections: max_connections || initialMaxConnections
            };

            // Create factory and database
            const newFactory = await this.factoryRepository.create(factoryParams);

            // Create admin user in the new factory database
            await this.createAdminUser(newFactory.db_name, {
                username: admin_username,
                password: admin_password,
                name: admin_name,
                email: admin_email,
                db_host: factoryParams.db_host,
                db_port: factoryParams.db_port,
                db_user: factoryParams.db_user,
                db_password: factoryParams.db_password
            });

            res.status(201).json({
                message: 'Factory registered successfully',
                factory: {
                    id: newFactory.id,
                    factory_name: newFactory.factory_name,
                    db_name: newFactory.db_name,
                    is_active: newFactory.is_active,
                    max_connections: newFactory.max_connections,
                    created_at: newFactory.created_at
                },
                admin_user: {
                    username: `${admin_username}@${db_name}`,
                    name: admin_name,
                    email: admin_email || `${admin_username}@${db_name}.local`,
                    role: 'master'
                },
                connection_info: {
                    initial_users: 1,
                    max_connections: newFactory.max_connections,
                    note: 'Connection pool will automatically scale as you add more employees'
                },
                login_instructions: {
                    username: `${admin_username}@${db_name}`,
                    endpoint: '/api/auth/login',
                    note: 'Use the username format: admin_username@db_name to login to your factory'
                },
                download_info: {
                    message: 'Your factory database has been created. You can now download the app and login with the credentials above.',
                    app_download_url: 'https://your-app-download-url.com'  // Replace with your actual download URL
                }
            });

        } catch (error: any) {
            console.error('Factory registration error:', error);
            res.status(500).json({
                error: 'Failed to register factory',
                details: error.message
            });
        }
    };

    // Get all registered factories (public endpoint for discovery)
    getFactories = async (req: Request, res: Response): Promise<void> => {
        try {
            const factories = await this.factoryRepository.findAll();
            
            // Return only public information
            const publicFactories = factories.map(factory => ({
                id: factory.id,
                factory_name: factory.factory_name,
                db_name: factory.db_name,
                is_active: factory.is_active,
                created_at: factory.created_at
            }));

            res.json({
                factories: publicFactories,
                total: publicFactories.length
            });

        } catch (error: any) {
            console.error('Get factories error:', error);
            res.status(500).json({
                error: 'Failed to get factories',
                details: error.message
            });
        }
    };

    // Sync max_connections for all factories (maintenance endpoint)
    syncAllConnections = async (req: Request, res: Response): Promise<void> => {
        try {
            await this.connectionSyncService.syncAllFactories();
            
            res.json({
                message: 'Successfully synced max_connections for all factories',
                timestamp: new Date().toISOString()
            });

        } catch (error: any) {
            console.error('Sync connections error:', error);
            res.status(500).json({
                error: 'Failed to sync connections',
                details: error.message
            });
        }
    };

    // Create admin user in the new factory database
    private async createAdminUser(dbName: string, adminData: {
        username: string;
        password: string;
        name: string;
        email?: string;
        db_host?: string;
        db_port?: number;
        db_user: string;
        db_password: string;
    }): Promise<void> {
        const { createConnection } = await import('mysql2/promise');
        
        const connection = await createConnection({
            host: adminData.db_host || 'localhost',
            port: adminData.db_port || 3306,
            user: adminData.db_user,
            password: adminData.db_password,
            database: dbName
        });

        try {
            // Hash the admin password
            const hashedPassword = await bcrypt.hash(adminData.password, 10);

            // Insert admin user (align with tenant Users schema: id, name, username, password, email, role, created_at)
            await connection.execute(
                `INSERT INTO Users (username, password, name, email, role)
                 VALUES (?, ?, ?, ?, 'master')`,
                [
                    adminData.username,
                    hashedPassword,
                    adminData.name,
                    adminData.email || `${adminData.username}@${dbName}.local`
                ]
            );

            console.log(`Admin user created for factory database: ${dbName}`);

        } catch (error) {
            console.error(`Failed to create admin user for ${dbName}:`, error);
            throw new Error(`Failed to create admin user: ${error}`);
        } finally {
            await connection.end();
        }
    }
}
