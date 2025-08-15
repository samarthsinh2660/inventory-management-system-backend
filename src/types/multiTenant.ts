import { Request } from "express";
import { Pool } from "mysql2/promise";
import { TokenData } from "../utils/jwt.js";

// Multi-tenant user data interface
export interface MultiTenantUser {
    id: number;
    username: string; // Full username with @factory suffix
    name: string;
    email?: string;
    role: 'master' | 'employee';
    factory_db: string;
    is_master: boolean; // For compatibility with existing TokenData
}

// Multi-tenant token data interface (compatible with existing TokenData)
export interface MultiTenantTokenData extends TokenData {
    username: string;
    name: string;
    role: 'master' | 'employee';
    factory_db: string;
}

// Extended Request interface for multi-tenant operations
export interface MultiTenantRequest extends Request {
    user?: MultiTenantUser;
    factoryPool?: Pool;
}

// Helper function to convert role to is_master for compatibility
export const roleToIsMaster = (role: 'master' | 'employee'): boolean => {
    return role === 'master';
};

// Helper function to convert is_master to role
export const isMasterToRole = (is_master: boolean): 'master' | 'employee' => {
    return is_master ? 'master' : 'employee';
};
