import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { createAuthToken, createRefreshToken, TokenData, decodeAuthToken } from '../utils/jwt.ts';
import { successResponse } from '../utils/response.ts';
import { ERRORS } from '../utils/error.ts';
import { userRepository } from '../repositories/user.repository.ts';
import { extractFactoryFromUsername, getPoolByUsername, healthCheckPools, getPoolStats } from '../database/connectionManager.ts';
import { FactoryRepository } from '../repositories/factory.repository.ts';

export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, role, username, password, email } = req.body;
        const currentUser = req.user as TokenData;

        // Validation
        if (!name || !role || !username || !password) {
            throw ERRORS.INVALID_REQUEST_BODY;
        }

        if (!['master', 'employee'].includes(role)) {
            throw ERRORS.VALIDATION_ERROR;
        }

        // Only masters can create users
        if (!currentUser.is_master) {
            res.status(403).json({
                error: 'Only master users can create new accounts'
            });
            return;
        }

        // Ensure factory context exists
        if (!currentUser.factory_db) {
            res.status(400).json({
                error: 'Factory context required for user creation'
            });
            return;
        }

        // Username should NOT contain @ (we'll add factory suffix)
        if (username.includes('@')) {
            res.status(400).json({
                error: 'Username should not contain @ symbol. Factory context will be added automatically.'
            });
            return;
        }

        // Check if user already exists in this factory
        const existingUser = await userRepository.findByUsername(username, req);
        if (existingUser) {
            throw ERRORS.DUPLICATE_RESOURCE;
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user in factory database
        const user = await userRepository.create({
            name,
            username,
            password: hashedPassword,
            email,
            role,
        }, req);

        // User response (without password)
        const userResponse = {
            id: user.id,
            name: user.name,
            role: user.role,
            username: `${user.username}@${currentUser.factory_db}`, // Full username for display
            display_username: user.username, // Clean username for UI
            ...(user.email && { email: user.email }),
            created_at: user.created_at
        };

        res.status(201).json(
            successResponse(userResponse, `${role === 'master' ? 'Master' : 'Employee'} account created successfully`)
        );
    } catch (error) {
        next(error);
    }
};

export const signin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            throw ERRORS.INVALID_REQUEST_BODY;
        }

        // Multi-tenant only login (username must contain @)
        if (!username.includes('@')) {
            res.status(400).json({
                error: 'Invalid username format. Expected format: user@factory_name'
            });
            return;
        }

        // Extract factory and user parts
        const factoryDbName = extractFactoryFromUsername(username);
        const userPart = username.split('@')[0];

        // Get factory-specific database pool
        const factoryPool = await getPoolByUsername(username);

        // Create mock request object with factory pool for repository
        const mockReq = { factoryPool };

        // Use user repository with factory pool
        const user = await userRepository.findByUsername(userPart, mockReq);
        if (!user) {
            throw ERRORS.UNAUTHORIZED;
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            throw ERRORS.UNAUTHORIZED;
        }

        // Create token data for multi-tenant
        const tokenData: TokenData = {
            id: user.id,
            username: username, // Full username with factory suffix
            name: user.name,
            email: user.email,
            role: user.role,
            factory_db: factoryDbName,
            is_master: user.role === 'master'
        };

        // Generate tokens
        const token = createAuthToken(tokenData);
        const refreshToken = createRefreshToken(tokenData);

        res.status(200).json(
            successResponse({
                id: user.id,
                username: username,
                email: user.email,
                token: token,
                refresh_token: refreshToken,
                factory_db: factoryDbName,
                role: user.role
            }, "Login successful")
        );
    } catch (error) {
        next(error);
    }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw ERRORS.UNAUTHORIZED;
        }

        // Get user profile (without password)
        const userProfile = await userRepository.getProfile(req.user.id, req);
        if (!userProfile) {
            throw ERRORS.RESOURCE_NOT_FOUND;
        }

        res.json(successResponse(userProfile, 'Profile retrieved successfully'));
    } catch (error) {
        next(error);
    }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw ERRORS.UNAUTHORIZED;
        }

        const { name, email, currentPassword, newPassword, username } = req.body;
        const updateData: { name?: string; email?: string; password?: string; username?: string } = {};
        
        if (name !== undefined) {
            updateData.name = name;
        }
        
        if (email !== undefined) {
            updateData.email = email;
        }

        // Handle username change with validation and uniqueness check
        if (username !== undefined) {
            if (typeof username !== 'string' || username.includes('@') || username.trim() === '') {
                throw ERRORS.VALIDATION_ERROR;
            }
            const existing = await userRepository.findByUsername(username, req);
            if (existing && existing.id !== req.user.id) {
                throw ERRORS.RESOURCE_ALREADY_EXISTS;
            }
            updateData.username = username;
        }

        // If changing password, verify current password first
        if (newPassword) {
            if (!currentPassword) {
                throw ERRORS.VALIDATION_ERROR;
            }

            // Get user with password for verification
            const user = await userRepository.findByIdWithPassword(req.user.id, req);
            if (!user) {
                throw ERRORS.RESOURCE_NOT_FOUND;
            }

            // Verify current password
            const isValidPassword = await bcrypt.compare(currentPassword, user.password);
            if (!isValidPassword) {
                throw ERRORS.UNAUTHORIZED;
            }

            // Hash new password
            const saltRounds = 12;
            updateData.password = await bcrypt.hash(newPassword, saltRounds);
        }

        // Validate we have at least one updatable field
        if (Object.keys(updateData).length === 0) {
            throw ERRORS.VALIDATION_ERROR;
        }

        // Update user
        const updatedUser = await userRepository.update(req.user.id, updateData, req);
        if (!updatedUser) {
            throw ERRORS.RESOURCE_NOT_FOUND;
        }

        res.json(successResponse(updatedUser, 'Profile updated successfully'));
    } catch (error) {
        next(error);
    }
};


export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw ERRORS.INVALID_REFRESH_TOKEN;
        }

        // Decode refresh token
        const decoded = decodeAuthToken(refreshToken);

        let user: any;
        let tokenData: TokenData;

        // Multi-tenant only refresh (all tokens must have factory_db)
        if (!decoded.factory_db || !decoded.username || !decoded.username.includes('@')) {
            throw ERRORS.INVALID_REFRESH_TOKEN;
        }

        // Multi-tenant refresh using user repository
        const factoryPool = await getPoolByUsername(decoded.username);
        const userPart = decoded.username.split('@')[0];
        const mockReq = { factoryPool };
        
        user = await userRepository.findByUsername(userPart, mockReq);
        if (!user) {
            throw ERRORS.RESOURCE_NOT_FOUND;
        }
        
        tokenData = {
            id: user.id,
            username: decoded.username,
            name: user.name,
            email: user.email,
            role: user.role,
            factory_db: decoded.factory_db,
            is_master: user.role === 'master'
        };

        // Generate new tokens
        const newToken = createAuthToken(tokenData);
        const newRefreshToken = createRefreshToken(tokenData);

        res.json(successResponse(
            { token: newToken, refreshToken: newRefreshToken },
            'Token refreshed successfully'
        ));
    } catch (error) {
        next(error);
    }
};

// Multi-tenant specific endpoints
export const healthCheck = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const poolHealth = await healthCheckPools();
        const poolStats = getPoolStats();

        res.json(successResponse({
            message: "Multi-tenant system is healthy",
            pool_health: poolHealth,
            pool_stats: poolStats,
            timestamp: new Date().toISOString()
        }));
    } catch (error) {
        next(error);
    }
};

export const getFactories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const factoryRepository = new FactoryRepository();
        const factories = await factoryRepository.findAll();

        // Return only public information
        const publicFactories = factories.map(factory => ({
            id: factory.id,
            factory_name: factory.factory_name,
            db_name: factory.db_name,
            is_active: factory.is_active,
            created_at: factory.created_at
        }));

        res.json(successResponse({
            factories: publicFactories,
            total: publicFactories.length
        }));
    } catch (error) {
        next(error);
    }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // For JWT, logout is typically handled client-side by removing the token
        const user = req.user as TokenData;
        if (user && user.factory_db) {
            console.log(`User ${user.username} logged out from factory ${user.factory_db}`);
        } else if (user) {
            console.log(`User ${user.username} logged out`);
        }

        res.json(successResponse({
            message: "Logged out successfully"
        }));
    } catch (error) {
        next(error);
    }
};
