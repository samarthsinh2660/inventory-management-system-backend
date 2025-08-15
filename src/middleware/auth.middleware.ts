import { Request, Response, NextFunction } from 'express';
import { decodeAuthToken, TokenData } from '../utils/jwt.ts';
import { ERRORS } from '../utils/error.ts';
import { getPoolByUsername } from '../database/connectionManager.ts';
import { Pool } from 'mysql2/promise';
import '../types/express.ts';

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            throw ERRORS.NO_TOKEN_PROVIDED;
        }

        const decoded = decodeAuthToken(token) as TokenData;
        
        // Multi-tenant only - all tokens must have factory_db
        if (!decoded.factory_db || !decoded.username || !decoded.username.includes('@')) {
            throw ERRORS.INVALID_AUTH_TOKEN;
        }
        
        // Attach user info to request
        req.user = decoded;
        
        // Initialize factory pool immediately
        try {
            (req as any).factoryPool = await getFactoryPoolFromRequest(req);
            (req as any).factoryDbName = decoded.factory_db;
            console.log(`✅ Factory pool initialized for: ${decoded.factory_db}`);
        } catch (error) {
            console.error(`❌ Failed to initialize factory pool for ${decoded.factory_db}:`, error);
            throw ERRORS.INVALID_AUTH_TOKEN;
        }
        
        next();
    } catch (error) {
        next(error);
    }
};

export const requireMaster = (req: Request, res: Response, next: NextFunction): void => {
    try {
        if (!req.user) {
            throw ERRORS.UNAUTHORIZED;
        }

        if (!req.user.is_master) {
            throw ERRORS.ADMIN_ONLY_ROUTE;
        }

        next();
    } catch (error) {
        next(error);
    }
};

// Helper function to get factory pool for a request (for repositories)
export const getFactoryPoolFromRequest = async (req: Request): Promise<Pool> => {
    const user = req.user as TokenData;
    if (!user || !user.username || !user.factory_db) {
        throw new Error('User not authenticated or missing factory context');
    }

    // Get pool directly using the username
    return await getPoolByUsername(user.username);
};

// Any authenticated user middleware (master or employee)
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
        if (!req.user) {
            throw ERRORS.UNAUTHORIZED;
        }
        next();
    } catch (error) {
        next(error);
    }
};

// Alias for backward compatibility
export const authenticateMultiTenant = authenticate;
export const requireMultiTenantMaster = requireMaster;