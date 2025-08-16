import { FactoryRepository } from '../repositories/factory.repository.ts';
import { UserRepository } from '../repositories/user.repository.ts';
import { getFactoryPoolFromRequest } from '../middleware/auth.middleware.ts';
import createLogger from "../utils/logger.js";

const logger = createLogger('@connectionSyncService');

export class ConnectionSyncService {
    private factoryRepository: FactoryRepository;
    private userRepository: UserRepository;

    constructor() {
        this.factoryRepository = new FactoryRepository();
        this.userRepository = new UserRepository();
    }

    /**
     * Sync max_connections for a factory based on current user count
     * @param dbName - Factory database name
     * @param req - Request object with factory pool context
     */
    async syncMaxConnections(dbName: string, req?: any): Promise<void> {
        try {
            // Get current user count from the factory database
            const userCount = await this.userRepository.getUserCount(req);
            
            // Set minimum connections to 2 (for system operations) and add buffer
            // Formula: max(userCount + 2, 5) to ensure minimum viable connections
            const newMaxConnections = Math.max(userCount + 2, 5);
            
            // Update max_connections in central database
            await this.factoryRepository.updateMaxConnections(dbName, newMaxConnections);
            
            logger.info(`✅ Synced connections for ${dbName}: ${userCount} users → ${newMaxConnections} max_connections`);
        } catch (error) {
            logger.error(`❌ Failed to sync connections for ${dbName}:`, error);
            throw error;
        }
    }

    /**
     * Sync max_connections for all active factories
     * This can be used for maintenance or batch updates
     */
    async syncAllFactories(): Promise<void> {
        try {
            const factories = await this.factoryRepository.findAll();
            
            for (const factory of factories) {
                try {
                    // Create a mock request with factory context for user count query
                    const mockReq = {
                        factoryPool: getFactoryPoolFromRequest({ 
                            user: { factory_db: factory.db_name } 
                        } as any)
                    };
                    
                    await this.syncMaxConnections(factory.db_name, mockReq);
                } catch (error) {
                    logger.error(`Failed to sync factory ${factory.factory_name}:`, error);
                    // Continue with other factories even if one fails
                }
            }
            
            logger.info(`✅ Completed connection sync for all factories`);
        } catch (error) {
            logger.error('❌ Failed to sync all factories:', error);
            throw error;
        }
    }

    /**
     * Get recommended max_connections based on user count
     * @param userCount - Number of users in the factory
     * @returns Recommended max_connections value
     */
    static getRecommendedConnections(userCount: number): number {
        return Math.max(userCount + 2, 5);
    }
}

// Class is already exported in the declaration above
