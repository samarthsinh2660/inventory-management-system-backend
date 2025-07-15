import { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "../database/db.ts";
import { ERRORS } from "../utils/error.ts";
import { AuditLog, AuditLogCreateParams, AuditLogFilter } from "../models/auditLogs.model.ts";
import inventoryEntryRepository from "./inventoryEntry.repository.ts";
import { InventoryEntryCreateParams } from "../models/inventoryEntries.model.ts";

export class AuditLogRepository {
  
  /**
   * Finds all audit logs with optional filtering and pagination
   */
  async findAll(
    filter: AuditLogFilter = {}
  ): Promise<{ logs: AuditLog[], total: number }> {
    try {
      const { 
        entry_id, 
        action, 
        user_id,
        start_date,
        end_date,
        page = 1, 
        limit = 10 
      } = filter;
      
      const offset = (page - 1) * limit;
      
      // Build the WHERE clause dynamically
      const whereClauses = [];
      const params: any[] = [];
      
      if (entry_id) {
        whereClauses.push('al.entry_id = ?');
        params.push(Number(entry_id));
      }
      
      if (action) {
        whereClauses.push('al.action = ?');
        params.push(String(action));
      }
      
      if (user_id) {
        whereClauses.push('al.user_id = ?');
        params.push(Number(user_id));
      }
      
      if (start_date) {
        whereClauses.push('al.timestamp >= ?');
        params.push(new Date(start_date));
      }
      
      if (end_date) {
        whereClauses.push('al.timestamp <= ?');
        params.push(new Date(end_date));
      }
      
      if (typeof filter.is_flag === 'boolean') {
        whereClauses.push('al.is_flag = ?');
        params.push(filter.is_flag);
      }
      
      // Construct the WHERE part of the query
      const whereClause = whereClauses.length > 0 
        ? `WHERE ${whereClauses.join(' AND ')}` 
        : '';
      
      // Use direct integer values in the query string for pagination
      const query = `
        SELECT al.*, u.username
        FROM AuditLogs al
        JOIN Users u ON al.user_id = u.id
        ${whereClause}
        ORDER BY al.timestamp DESC
        LIMIT ${parseInt(limit.toString())} OFFSET ${parseInt(offset.toString())}
      `;
      
      // Execute the query with just the WHERE clause parameters
      const [logs] = await db.execute<AuditLog[]>(query, params);
      
      // Count total matching logs
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM AuditLogs al
        ${whereClause}
      `;
      
      const [countResult] = await db.execute<RowDataPacket[]>(countQuery, params);
      
      const total = countResult[0]?.total || 0;
      
      return { logs, total };
    } catch (error) {
      console.error("Error finding audit logs:", error);
      throw ERRORS.DATABASE_ERROR;
    }
  }
  
  /**
   * Finds a specific audit log by ID
   */
  async findById(id: number): Promise<AuditLog | null> {
    try {
      const [logs] = await db.execute<AuditLog[]>(`
        SELECT al.*, u.username
        FROM AuditLogs al
        JOIN Users u ON al.user_id = u.id
        WHERE al.id = ?
      `, [id]);
      
      return logs.length > 0 ? logs[0] : null;
    } catch (error) {
      console.error(`Error finding audit log with id ${id}:`, error);
      throw ERRORS.DATABASE_ERROR;
    }
  }
  
  /**
   * Creates a new audit log entry
   */
  async create(logData: AuditLogCreateParams): Promise<AuditLog> {
    try {
      // Insert the log
      const [result] = await db.execute<ResultSetHeader>(`
        INSERT INTO AuditLogs 
        (entry_id, action, old_data, new_data, user_id, reason) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        logData.entry_id,
        logData.action,
        logData.old_data ? JSON.stringify(logData.old_data) : null,
        logData.new_data ? JSON.stringify(logData.new_data) : null,
        logData.user_id,
        logData.reason || null
      ]);
      
      const logId = result.insertId;
      
      // Return the created log
      return await this.findById(logId) as AuditLog;
    } catch (error) {
      console.error("Error creating audit log:", error);
      throw ERRORS.AUDIT_LOG_CREATION_FAILED;
    }
  }
  
  /**
   * Deletes an audit log and reverts the changes if needed
   * Only master users can perform this operation
   */
  async deleteAndRevert(id: number, userId: number, isRevert: boolean = false): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // Check if the log exists
      const log = await this.findById(id);
      if (!log) {
        throw ERRORS.AUDIT_LOG_NOT_FOUND;
      }
      
      if (isRevert) {
        // Revert changes based on the log action
        switch (log.action) {
          case 'create':
            // If the log was for a creation, delete the entry
            await inventoryEntryRepository.delete(log.entry_id);
            break;
            
          case 'update':
            // If the log was for an update, restore the old data
            if (log.old_data) {
              const oldData = typeof log.old_data === 'string' 
                ? JSON.parse(log.old_data) 
                : log.old_data;
                
              await inventoryEntryRepository.update(log.entry_id, oldData);
            }
            break;
            
          case 'delete':
            // If the log was for a deletion, recreate the entry
            if (log.old_data) {
              const oldData = typeof log.old_data === 'string' 
                ? JSON.parse(log.old_data) 
                : log.old_data;
                
              // Need to recreate the entry with the old data
              await inventoryEntryRepository.create(oldData as InventoryEntryCreateParams);
            }
            break;
        }
      }
      
      // Delete the log
      await connection.execute('DELETE FROM AuditLogs WHERE id = ?', [id]);
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error(`Error deleting/reverting audit log with id ${id}:`, error);
      
      if (error === ERRORS.AUDIT_LOG_NOT_FOUND) {
        throw error;
      }
      
      if (isRevert) {
        throw ERRORS.AUDIT_LOG_REVERT_FAILED;
      } else {
        throw ERRORS.AUDIT_LOG_DELETION_FAILED;
      }
    } finally {
      connection.release();
    }
  }
  
  /**
   * Finds all audit logs for a specific inventory entry
   */
  async findByEntryId(
    entryId: number,
    page: number = 1, 
    limit: number = 10
  ): Promise<{ logs: AuditLog[], total: number }> {
    try {
      return await this.findAll({
        entry_id: entryId,
        page,
        limit
      });
    } catch (error) {
      console.error(`Error finding audit logs for entry ${entryId}:`, error);
      throw ERRORS.DATABASE_ERROR;
    }
  }
  
  /**
   * Creates an audit log for a new inventory entry
   */
  async logCreate(
    entryId: number, 
    newData: any, 
    userId: number, 
    reason?: string
  ): Promise<AuditLog> {
    try {
      return await this.create({
        entry_id: entryId,
        action: 'create',
        new_data: newData,
        user_id: userId,
        reason
      });
    } catch (error) {
      console.error(`Error logging create for entry ${entryId}:`, error);
      throw ERRORS.AUDIT_LOG_CREATION_FAILED;
    }
  }
  
  /**
   * Creates an audit log for an updated inventory entry
   */
  async logUpdate(
    entryId: number, 
    oldData: any, 
    newData: any, 
    userId: number, 
    reason?: string
  ): Promise<AuditLog> {
    try {
      return await this.create({
        entry_id: entryId,
        action: 'update',
        old_data: oldData,
        new_data: newData,
        user_id: userId,
        reason
      });
    } catch (error) {
      console.error(`Error logging update for entry ${entryId}:`, error);
      throw ERRORS.AUDIT_LOG_CREATION_FAILED;
    }
  }
  
  /**
   * Creates an audit log for a deleted inventory entry
   */
  async logDelete(
    entryId: number, 
    oldData: any, 
    userId: number, 
    reason?: string
  ): Promise<AuditLog> {
    try {
      return await this.create({
        entry_id: entryId,
        action: 'delete',
        old_data: oldData,
        user_id: userId,
        reason
      });
    } catch (error) {
      console.error(`Error logging delete for entry ${entryId}:`, error);
      throw ERRORS.AUDIT_LOG_CREATION_FAILED;
    }
  }

  /**
   * Updates the flag status of an audit log
   */
  async updateFlag(id: number, isFlag: boolean): Promise<AuditLog> {
    try {
      // First update the flag
      const [result] = await db.execute<ResultSetHeader>(
        'UPDATE AuditLogs SET is_flag = ? WHERE id = ?',
        [isFlag, id]
      );

      if (result.affectedRows === 0) {
        throw ERRORS.AUDIT_LOG_NOT_FOUND;
      }

      // Then fetch and return the updated audit log
      const updatedLog = await this.findById(id);
      if (!updatedLog) {
        throw ERRORS.AUDIT_LOG_NOT_FOUND;
      }

      return updatedLog;
    } catch (error) {
      console.error(`Error updating flag for audit log ${id}:`, error);
      if (error === ERRORS.AUDIT_LOG_NOT_FOUND) {
        throw error;
      }
      throw ERRORS.DATABASE_ERROR;
    }
  }
}

export default new AuditLogRepository();
