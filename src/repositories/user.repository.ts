import { db } from '../database/db.ts';
import { User } from '../models/users.model.ts';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export class UserRepository {
  /**
   * Find a user by their ID
   */
  async findById(id: number): Promise<User | null> {
    const [users] = await db.execute(
      'SELECT id, name, username, email, role, created_at FROM Users WHERE id = ?',
      [id]
    ) as [User[], any];

    return users.length ? users[0] : null;
  }

  /**
   * Find a user by ID with password included (for auth verification)
   */
  async findByIdWithPassword(id: number): Promise<User | null> {
    const [users] = await db.execute(
      'SELECT id, name, username, password, email, role, created_at FROM Users WHERE id = ?',
      [id]
    ) as [User[], any];

    return users.length ? users[0] : null;
  }

  /**
   * Find a user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    const [users] = await db.execute(
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
  }): Promise<User> {
    const { name, username, password, email, role } = userData;

    const [result] = await db.execute(
      'INSERT INTO Users (name, username, password, email, role) VALUES (?, ?, ?, ?, ?)',
      [name, username, password, email || null, role]
    ) as [ResultSetHeader, any];

    return this.findById(result.insertId) as Promise<User>;
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
    }
  ): Promise<User | null> {
    const { name, email, password } = userData;
    
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
    
    // Remove trailing comma and space
    query = query.slice(0, -2);
    query += ' WHERE id = ?';
    params.push(id);
    
    await db.execute(query, params);
    
    return this.findById(id);
  }

  /**
   * Get user profile (without password)
   */
  async getProfile(id: number): Promise<Omit<User, 'password'> | null> {
    const [users] = await db.execute(
      'SELECT id, name, username, email, role, created_at FROM Users WHERE id = ?',
      [id]
    ) as [User[], any];

    return users.length ? users[0] : null;
  }

  /**
   * Get all users (for admin/master use)
   */
  async getAllUsers(): Promise<User[]> {
    const [users] = await db.execute(
      'SELECT id, name, email, username, role, created_at FROM Users'
    ) as [User[], any];

    return users;
  }

  /**
   * Delete a user by ID
   */
  async deleteUser(id: number): Promise<boolean> {
    const [result] = await db.execute(
      'DELETE FROM Users WHERE id = ?',
      [id]
    ) as [any, any];

    return result.affectedRows > 0;
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
    }
  ): Promise<User | null> {
    const { name, email, role } = userData;
    
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
    
    // Remove trailing comma and space
    query = query.slice(0, -2);
    query += ' WHERE id = ?';
    params.push(id);
    
    await db.execute(query, params);
    
    return this.findById(id);
  }
}

export const userRepository = new UserRepository();
