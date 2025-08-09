import { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "../database/db.ts";
import { ERRORS } from "../utils/error.ts";
import { AuditLog, AuditLogCreateParams, AuditLogFilter, AuditLogFilters, FilteredAuditLogsResponse } from "../models/auditLogs.model.ts";
import inventoryEntryRepository from "./inventoryEntry.repository.ts";
import { InventoryEntryCreateParams } from "../models/inventoryEntries.model.ts";

export class AuditLogRepository {
  
  /**
   * Finds all audit logs with optional filtering and pagination (legacy method)
   */
  async findAll(
    filter: AuditLogFilter = {}
  ): Promise<{ logs: AuditLog[], total: number }> {
    // Use the new filtering method with converted filters for backward compatibility
    const newFilters: AuditLogFilters = {
      page: filter.page,
      limit: filter.limit,
      action: filter.action,
      user_id: filter.user_id,
      date_from: filter.start_date,
      date_to: filter.end_date,
      is_flag: filter.is_flag
    };
    
    const result = await this.findAllWithFilters(newFilters);
    return { logs: result.logs, total: result.total };
  }

  /**
   * Finds all audit logs with comprehensive filtering and pagination
   */
  async findAllWithFilters(filters: AuditLogFilters): Promise<FilteredAuditLogsResponse> {
    try {
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 100, 100); // Cap at 100
      const offset = (page - 1) * limit;
      
      // Build WHERE conditions and parameters
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      const filtersApplied: { [key: string]: any } = {};

      // Determine if we need joins based on filters
      const needsInventoryJoin = filters.search || filters.location_id || filters.reference_id || 
                                filters.product_id || filters.category || filters.subcategory_id;

      // Search filter - comprehensive search across all relevant fields
      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        
        if (needsInventoryJoin) {
          // When inventory joins are available, search across all fields
          whereConditions.push(`(
            u.username LIKE ? OR 
            u.email LIKE ? OR
            p.name LIKE ? OR 
            l.name LIKE ? OR
            ie.notes LIKE ? OR 
            ie.reference_id LIKE ? OR
            al.reason LIKE ? OR
            al.action LIKE ?
          )`);
          queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        } else {
          // When no inventory joins, search basic audit log and user fields
          whereConditions.push(`(
            u.username LIKE ? OR 
            u.email LIKE ? OR
            al.reason LIKE ? OR
            al.action LIKE ?
          )`);
          queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }
        
        filtersApplied.search = filters.search;
      }

      // Action filter
      if (filters.action) {
        whereConditions.push('al.action = ?');
        queryParams.push(filters.action);
        filtersApplied.action = filters.action;
      }

      // User filter
      if (filters.user_id) {
        whereConditions.push('al.user_id = ?');
        queryParams.push(filters.user_id);
        filtersApplied.user_id = filters.user_id;
      }

      // Location filter
      if (filters.location_id) {
        whereConditions.push('ie.location_id = ?');
        queryParams.push(filters.location_id);
        filtersApplied.location_id = filters.location_id;
      }

      // Flag filter
      if (typeof filters.is_flag === 'boolean') {
        whereConditions.push('al.is_flag = ?');
        queryParams.push(filters.is_flag);
        filtersApplied.is_flag = filters.is_flag;
      }

      // Reference ID filter
      if (filters.reference_id) {
        whereConditions.push('ie.reference_id = ?');
        queryParams.push(filters.reference_id);
        filtersApplied.reference_id = filters.reference_id;
      }

      // Product hierarchy filters
      if (filters.product_id) {
        whereConditions.push('ie.product_id = ?');
        queryParams.push(filters.product_id);
        filtersApplied.product_id = filters.product_id;
      }

      if (filters.category) {
        whereConditions.push('sc.category = ?');
        queryParams.push(filters.category);
        filtersApplied.category = filters.category;
      }

      if (filters.subcategory_id) {
        whereConditions.push('p.subcategory_id = ?');
        queryParams.push(filters.subcategory_id);
        filtersApplied.subcategory_id = filters.subcategory_id;
      }

      // Date range filters
      if (filters.date_from) {
        whereConditions.push('al.timestamp >= ?');
        queryParams.push(filters.date_from);
        filtersApplied.date_from = filters.date_from.toISOString().split('T')[0];
      }

      if (filters.date_to) {
        whereConditions.push('al.timestamp <= ?');
        queryParams.push(filters.date_to);
        filtersApplied.date_to = filters.date_to.toISOString().split('T')[0];
      }

      // Last N days filter
      if (filters.days) {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - filters.days);
        whereConditions.push('al.timestamp >= ?');
        queryParams.push(daysAgo);
        filtersApplied.days = filters.days;
      }

      // Build the base query with conditional joins
      let baseQuery = `FROM AuditLogs al JOIN Users u ON al.user_id = u.id`;
      
      if (needsInventoryJoin) {
        baseQuery += ` JOIN InventoryEntries ie ON al.entry_id = ie.id`;
        baseQuery += ` JOIN Products p ON ie.product_id = p.id`;
        baseQuery += ` JOIN Locations l ON ie.location_id = l.id`;
        
        if (filters.category) {
          baseQuery += ` JOIN Subcategories sc ON p.subcategory_id = sc.id`;
        }
      }

      const whereClause = whereConditions.length > 0 
        ? ` WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // Main query to get audit logs
      let selectFields = `al.*, u.username`;
      if (needsInventoryJoin) {
        selectFields += `, p.name as product_name, l.name as location_name, ie.reference_id as entry_reference_id`;
      }
      
      const selectQuery = `SELECT DISTINCT ${selectFields} ${baseQuery}${whereClause} ORDER BY al.timestamp DESC LIMIT ${limit} OFFSET ${offset}`;

    
      const [logs] = await db.execute<AuditLog[]>(selectQuery, queryParams);

      // Count query for total results
      const countQuery = `SELECT COUNT(DISTINCT al.id) as total ${baseQuery}${whereClause}`;

      const [countResult] = await db.execute<RowDataPacket[]>(countQuery, queryParams);
      const total = countResult[0]?.total || 0;

      return { 
        logs, 
        total, 
        filters_applied: filtersApplied 
      };
    } catch (error) {
      console.error("Error finding audit logs with filters:", error);
      throw ERRORS.AUDIT_LOG_FILTER_SEARCH_FAILED;
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
