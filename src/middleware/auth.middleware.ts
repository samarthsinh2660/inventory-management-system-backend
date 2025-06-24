import { Request, Response, NextFunction } from 'express';
import { decodeAuthToken, TokenData } from '../utils/jwt.ts';
import { ERRORS } from '../utils/error.ts';
import '../types/express.ts';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            throw ERRORS.NO_TOKEN_PROVIDED;
        }

        const decoded = decodeAuthToken(token);
        req.user = decoded;
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