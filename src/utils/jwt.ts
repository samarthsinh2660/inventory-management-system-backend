import jwt, { SignOptions } from 'jsonwebtoken';
import { ERRORS } from './error.ts';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/env.ts';



export interface TokenData {
    id: number;
    is_master: boolean;
    email?: string;
    username?: string;
    name?: string;
}

export function createAuthToken(user: TokenData): string {
    if (!JWT_SECRET) {
        throw ERRORS.JWT_SECRET_NOT_CONFIGURED;
    }
    
    const token = jwt.sign(user, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN || '24h'
    } as SignOptions);
    
    return token;
}

export function createRefreshToken(user: TokenData): string {
    if (!JWT_SECRET) {
        throw ERRORS.JWT_SECRET_NOT_CONFIGURED;
    }
    
    // Using same secret for simplicity, but in production you might want separate secrets
    const token = jwt.sign(user, JWT_SECRET, {
        expiresIn: '7d' // Refresh tokens typically last longer
    });
    
    return token;
}

export function decodeAuthToken(token: string): TokenData {
    if (!JWT_SECRET) {
        throw ERRORS.JWT_SECRET_NOT_CONFIGURED;
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (typeof decoded === 'string') {
            throw ERRORS.INVALID_AUTH_TOKEN;
        }
        
        return decoded as TokenData;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw ERRORS.TOKEN_EXPIRED;
        }
        throw ERRORS.INVALID_AUTH_TOKEN;
    }
}

export function decodeRefreshToken(token: string): TokenData {
    if (!JWT_SECRET) {
        throw ERRORS.JWT_SECRET_NOT_CONFIGURED;
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (typeof decoded === 'string') {
            throw ERRORS.INVALID_REFRESH_TOKEN;
        }
        
        return decoded as TokenData;
    } catch (error) {
        throw ERRORS.INVALID_REFRESH_TOKEN;
    }
}