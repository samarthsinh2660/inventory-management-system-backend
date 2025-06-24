import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { createAuthToken, createRefreshToken, TokenData, decodeAuthToken } from '../utils/jwt.ts';
import { successResponse } from '../utils/response.ts';
import { ERRORS } from '../utils/error.ts';
import { userRepository } from '../repositories/user.repository.ts';

export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, role, username, password, email } = req.body;

        // Validation
        if (!name || !role || !username || !password) {
            throw ERRORS.INVALID_REQUEST_BODY;
        }

        if (!['master', 'employee'].includes(role)) {
            throw ERRORS.VALIDATION_ERROR;
        }

        // Check if user already exists
        const existingUser = await userRepository.findByUsername(username);
        if (existingUser) {
            throw ERRORS.DUPLICATE_RESOURCE;
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const user = await userRepository.create({
            name,
            username,
            password: hashedPassword,
            email,
            role,
        });

        // Create token data
        const tokenData: TokenData = {
            id: user.id,
            is_master: user.role === 'master',
            username: user.username,
            name: user.name,
            ...(user.email && { email: user.email })
        };

        // Generate tokens
        const token = createAuthToken(tokenData);
        const refreshToken = createRefreshToken(tokenData);

        // User response (without password)
        const userResponse = {
            id: user.id,
            name: user.name,
            role: user.role,
            username: user.username,
            ...(user.email && { email: user.email }),
            created_at: user.created_at
        };

        res.status(201).json(
            successResponse({
                id: user.id,
                username,
                email,
                token,
            }, "Admin account created successfully")
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

        // Find user by username
        const user = await userRepository.findByUsername(username);
        if (!user) {
            throw ERRORS.UNAUTHORIZED;
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            throw ERRORS.UNAUTHORIZED;
        }

        // Create token data
        const tokenData: TokenData = {
            id: user.id,
            is_master: user.role === 'master',
            username: user.username,
            name: user.name,
            ...(user.email && { email: user.email })
        };

        // Generate tokens
        const token = createAuthToken(tokenData);
        const refreshToken = createRefreshToken(tokenData);

        // User response (without password)
        const userResponse = {
            id: user.id,
            name: user.name,
            role: user.role,
            username: user.username,
            ...(user.email && { email: user.email }),
            created_at: user.created_at
        };

        res.status(200).json(
            successResponse({
                id: user.id,
                username: user.username,
                email: user.email,
                token: token,
                refresh_token: refreshToken,
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
        const userProfile = await userRepository.getProfile(req.user.id);
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

        const { name, email, currentPassword, newPassword } = req.body;
        const updateData: { name?: string; email?: string; password?: string } = {};
        
        if (name !== undefined) {
            updateData.name = name;
        }
        
        if (email !== undefined) {
            updateData.email = email;
        }

        // If changing password, verify current password first
        if (newPassword) {
            if (!currentPassword) {
                throw ERRORS.VALIDATION_ERROR;
            }

            // Get user with password for verification
            const user = await userRepository.findByIdWithPassword(req.user.id);
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

        // Update user
        const updatedUser = await userRepository.update(req.user.id, updateData);
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

        // Get user from database to ensure they still exist
        const user = await userRepository.findById(decoded.id);
        if (!user) {
            throw ERRORS.RESOURCE_NOT_FOUND;
        }

        // Create new token data
        const tokenData: TokenData = {
            id: user.id,
            is_master: user.role === 'master',
            username: user.username,
            name: user.name,
            ...(user.email && { email: user.email })
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
