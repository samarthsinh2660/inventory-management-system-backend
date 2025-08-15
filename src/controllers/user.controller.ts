import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { userRepository } from '../repositories/user.repository.ts';
import { ERRORS } from '../utils/error.ts';
import { successResponse } from '../utils/response.ts';
import { TokenData } from '../utils/jwt.ts';

/**
 * Get all users (master only)
 */
export const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Authorization check is done in middleware
        
        const users = await userRepository.getAllUsers(req);
        res.json(successResponse(users, 'Users retrieved successfully'));
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new user/employee (master only)
 */
export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, username, email, password, role } = req.body;
        
        // Basic validation
        if (!name || !username || !email || !password || !role) {
            throw ERRORS.VALIDATION_ERROR;
        }
        
        // Check if username already exists
        const existingUser = await userRepository.findByUsername(username, req);
        if (existingUser) {
            throw ERRORS.RESOURCE_ALREADY_EXISTS;
        }
        
        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create user
        const user = await userRepository.create({
            name,
            username,
            email,
            password: hashedPassword,
            role
        }, req);
        
        const { password: _, ...userWithoutPassword } = user;
        
        res.status(201).json(
            successResponse(userWithoutPassword, 'User created successfully')
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a user (master only)
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Authorization check is done in middleware
        
        const userId = parseInt(req.params.id, 10);
        
        if (isNaN(userId)) {
            throw ERRORS.VALIDATION_ERROR;
        }
        
        // Cannot delete yourself - add null check for req.user
        if (req.user && userId === req.user.id) {
            throw { ...ERRORS.FORBIDDEN, message: 'Cannot delete your own account' };
        }
        
        // Check if user exists
        const user = await userRepository.findById(userId, req);
        if (!user) {
            throw ERRORS.RESOURCE_NOT_FOUND;
        }
        
        // Delete user
        await userRepository.deleteUser(userId, req);
        
        res.json(successResponse(null, 'User deleted successfully'));
    } catch (error) {
        next(error);
    }
};

/**
 * Update user role or info (master only)
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Authorization check is done in middleware
        
        const userId = parseInt(req.params.id, 10);
        
        if (isNaN(userId)) {
            throw ERRORS.VALIDATION_ERROR;
        }
        
        // Check if user exists
        const user = await userRepository.findById(userId, req);
        if (!user) {
            throw ERRORS.RESOURCE_NOT_FOUND;
        }
        
        const { name, email, role, username, password } = req.body;
        
        // At least one field to update
        if (!name && !email && !role && !username && !password) {
            throw ERRORS.VALIDATION_ERROR;
        }
        
        // Validate role value if provided
        if (role && role !== 'master' && role !== 'employee') {
            throw ERRORS.INVALID_ROLE;
        }
        
        // Prevent changing your own role (security measure) - add null check for req.user
        if (req.user && userId === req.user.id && role && role !== user.role) {
            throw ERRORS.CANNOT_CHANGE_OWN_ROLE;
        }

        // Check for username uniqueness if updating username
        if (username) {
            const existingUser = await userRepository.findByUsername(username, req);
            if (existingUser && existingUser.id !== userId) {
                throw ERRORS.RESOURCE_ALREADY_EXISTS;
            }
        }
        
        // Prepare update data
        const updateData: any = {
            name,
            email,
            role,
            username
        };
        
        // Hash password if provided
        if (password) {
            const saltRounds = 12;
            updateData.password = await bcrypt.hash(password, saltRounds);
        }
        
        // Update user
        const updatedUser = await userRepository.updateUserInfo(userId, updateData, req);
        
        res.json(successResponse(updatedUser, 'User updated successfully'));
    } catch (error) {
        next(error);
    }
};
