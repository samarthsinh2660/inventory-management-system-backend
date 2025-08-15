import { db } from '../database/db.ts';
import { User } from '../models/users.model.ts';
import { Pool } from 'mysql2/promise';
import { ResultSetHeader } from 'mysql2';
import { ConnectionSyncService } from '../services/connectionSync.service.ts';
import { ERRORS } from '../utils/error.ts';

export class UserRepository {
    private getPool(req?: any): Pool {
      return req?.factoryPool || db;
    }
  /**
   * Find a user by their ID
   */
  async findById(id: number, req?: any): Promise<User | null> {
    const pool = this.getPool(req);
    const [users] = await pool.execute(
      'SELECT id, name, username, email, role, created_at FROM Users WHERE id = ?',
      [id]
    ) as [User[], any];

    return users.length ? users[0] : null;
  }

  /**
   * Find a user by ID with password included (for auth verification)
   */
  async findByIdWithPassword(id: number, req?: any): Promise<User | null> {
    const pool = this.getPool(req);
    const [users] = await pool.execute(
      'SELECT id, name, username, password, email, role, created_at FROM Users WHERE id = ?',
      [id]
    ) as [User[], any];

    return users.length ? users[0] : null;
  }

  /**
   * Find a user by username
   */
  async findByUsername(username: string, req?: any): Promise<User | null> {
    const pool = this.getPool(req);
    const [users] = await pool.execute(
      'SELECT * FROM Users WHERE username = ?',
      [username]
    ) as [User[], any];

    return users.length ? users[0] : null;
  }

  /**
   * Create a new user
   */
  async create(userData: { 
    name: string; 
    username: string; 
    password: string; 
    email?: string; 
    role: 'master' | 'employee' 
  }, req?: any): Promise<User> {
    const { name, username, password, email, role } = userData;

    const [result] = await this.getPool(req).execute(
      'INSERT INTO Users (name, username, password, email, role) VALUES (?, ?, ?, ?, ?)',
      [name, username, password, email || null, role]
    ) as [ResultSetHeader, any];

    const newUser = await this.findById(result.insertId, req);
    
    if (!newUser) {
      throw new Error('Failed to create user');
    }

    // Auto-sync max_connections after adding a user
    if (req?.user?.factory_db) {
      try {
        const syncService = new ConnectionSyncService();
        await syncService.syncMaxConnections(req.user.factory_db, req);
      } catch (error) {
        console.warn('Failed to sync connections after user creation:', error);
        // Don't fail user creation if connection sync fails
      }
    }

    return newUser;
  }

  /**
   * Update user information
   */
  async update(
    id: number, 
    userData: { 
      name?: string; 
      email?: string; 
      password?: string;
      username?: string;
    },
    req?: any
  ): Promise<User | null> {
    const { name, email, password, username } = userData;
    
    // Build dynamic update query
    let query = 'UPDATE Users SET ';
    const params: any[] = [];
    
    if (name !== undefined) {
      query += 'name = ?, ';
      params.push(name);
    }
    
    if (email !== undefined) {
      query += 'email = ?, ';
      params.push(email);
    }
    
    if (password !== undefined) {
      query += 'password = ?, ';
      params.push(password);
    }
    
    if (username !== undefined) {
      query += 'username = ?, ';
      params.push(username);
    }
    
    // If no fields provided, prevent invalid SQL
    if (params.length === 0) {
      throw ERRORS.VALIDATION_ERROR;
    }
    
    // Remove trailing comma and space
    query = query.slice(0, -2);
    query += ' WHERE id = ?';
    params.push(id);
    
    await this.getPool(req).execute(query, params);
    
    return this.findById(id, req);
  }

  /**
   * Get user profile (without password)
   */
  async getProfile(id: number, req?: any): Promise<Omit<User, 'password'> | null> {
    const pool = this.getPool(req);
    const [users] = await pool.execute(
      'SELECT id, name, username, email, role, created_at FROM Users WHERE id = ?',
      [id]
    ) as [User[], any];

    return users.length ? users[0] : null;
  }

  /**
   * Get all users (for admin/master use)
   */
  async getAllUsers(req?: any): Promise<User[]> {
    const pool = this.getPool(req);
    const [users] = await pool.execute(
      'SELECT id, name, email, username, role, created_at FROM Users'
    ) as [User[], any];

    return users;
  }

  /**
   * Get user count for a factory (for connection pool sizing)
   */
  async getUserCount(req?: any): Promise<number> {
    const pool = this.getPool(req);
    const [result] = await pool.execute(
      'SELECT COUNT(*) as count FROM Users'
    ) as [any[], any];

    return result[0].count;
  }

  /**
   * Delete a user by ID
   */
  async deleteUser(id: number, req?: any): Promise<boolean> {
    const pool = this.getPool(req);
    const [result] = await pool.execute(
      'DELETE FROM Users WHERE id = ?',
      [id]
    ) as [any, any];

    const deleted = result.affectedRows > 0;

    // Auto-sync max_connections after deleting a user
    if (deleted && req?.user?.factory_db) {
      try {
        const syncService = new ConnectionSyncService();
        await syncService.syncMaxConnections(req.user.factory_db, req);
      } catch (error) {
        console.warn('Failed to sync connections after user deletion:', error);
        // Don't fail user deletion if connection sync fails
      }
    }

    return deleted;
  }

  /**
   * Update user role or information
   */
  async updateUserInfo(
    id: number,
    userData: {
      name?: string;
      email?: string;
      role?: string;
      username?: string;
      password?: string;
    },
    req?: any
  ): Promise<User | null> {
    const { name, email, role, username, password } = userData;
    
    // Build dynamic update query
    let query = 'UPDATE Users SET ';
    const params: any[] = [];
    
    if (name !== undefined) {
      query += 'name = ?, ';
      params.push(name);
    }
    
    if (email !== undefined) {
      query += 'email = ?, ';
      params.push(email);
    }
    
    if (role !== undefined) {
      query += 'role = ?, ';
      params.push(role);
    }

    if (username !== undefined) {
      query += 'username = ?, ';
      params.push(username);
    }
    
    if (password !== undefined) {
      query += 'password = ?, ';
      params.push(password);
    }
    
    // If no fields provided, prevent invalid SQL
    if (params.length === 0) {
      throw ERRORS.VALIDATION_ERROR;
    }
    
    // Remove trailing comma and space
    query = query.slice(0, -2);
    query += ' WHERE id = ?';
    params.push(id);
    
    await this.getPool(req).execute(query, params);
    
    return this.findById(id, req);
  }
}

export const userRepository = new UserRepository();
