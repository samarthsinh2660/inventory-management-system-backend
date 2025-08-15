import { RowDataPacket } from 'mysql2';
import { db } from '../database/db.ts';
import { Pool } from 'mysql2/promise';

export interface Alert extends RowDataPacket {
  id: number;
  product_id: number;
  product_name: string;
  location_name: string;
  created_at: Date;
  resolved_at?: Date;
  is_resolved: boolean;
  stock_alert_id?: number;
}

export interface Notification extends RowDataPacket {
  id: number;
  product_id: number;
  product_name: string;
  location_name: string;
  created_at: Date;
  is_read: boolean;
  stock_alert_id?: number;
}

export interface AlertFilters {
  resolved?: boolean | null;
  page?: number;
  limit?: number;
}

export class AlertRepository {
  private getPool(req?: any): Pool {
    return req?.factoryPool || db;
  }
  /**
   * Get all alerts with optional filtering and pagination
   */
  async getAllAlerts(filters: AlertFilters = {}, req?: any): Promise<{
    alerts: Alert[];
    total: number;
  }> {
    const { resolved = null, page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT sa.*, p.name AS product_name, l.name AS location_name
      FROM StockAlerts sa
      JOIN Products p ON sa.product_id = p.id
      JOIN Locations l ON p.location_id = l.id
    `;
    
    const params: any[] = [];
    
    // Add filtering for resolved/unresolved if specified
    if (resolved !== null) {
      query += ` WHERE sa.is_resolved = ?`;
      params.push(resolved);
    }
    
    // Add ordering
    query += ` ORDER BY sa.created_at DESC`;
    
    // Add pagination
    query += ` LIMIT ${limit} OFFSET ${offset}`;
    
    const [alerts] = await this.getPool(req).execute<Alert[]>(query, params);
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM StockAlerts`;
    if (resolved !== null) {
      countQuery += ` WHERE is_resolved = ?`;
    }
    
    const [countResult] = await this.getPool(req).execute<RowDataPacket[]>(
      countQuery,
      resolved !== null ? [resolved] : []
    );
    
    const total = countResult[0]?.total || 0;
    
    return { alerts, total };
  }

  /**
   * Mark an alert as resolved
   */
  async resolveAlert(alertId: number, req?: any): Promise<number> {
    const [result] = await this.getPool(req).execute<RowDataPacket[]>(
      'UPDATE StockAlerts SET is_resolved = true, resolved_at = CURRENT_TIMESTAMP WHERE id = ?',
      [alertId]
    );
    
    return (result as any).affectedRows;
  }

  /**
   * Mark all notifications related to an alert as read
   */
  async markAlertNotificationsAsRead(alertId: number, req?: any): Promise<void> {
    await this.getPool(req).execute(
      'UPDATE Notifications SET is_read = true WHERE stock_alert_id = ?',
      [alertId]
    );
  }

  /**
   * Get all unread notifications
   */
  async getUnreadNotifications(req?: any): Promise<Notification[]> {
    const [notifications] = await this.getPool(req).execute<Notification[]>(`
      SELECT n.*, p.name AS product_name, p.id AS product_id, l.name AS location_name
      FROM Notifications n
      JOIN Products p ON n.product_id = p.id
      JOIN Locations l ON p.location_id = l.id
      WHERE n.is_read = false
      ORDER BY n.created_at DESC
    `);
    
    return notifications;
  }

  /**
   * Get a notification by ID
   */
  async getNotificationById(notificationId: number, req?: any): Promise<Notification | null> {
    const [notification] = await this.getPool(req).execute<Notification[]>(
      'SELECT * FROM Notifications WHERE id = ?',
      [notificationId]
    );
    
    return notification.length > 0 ? notification[0] : null;
  }

  /**
   * Mark a notification as read
   */
  async markNotificationAsRead(notificationId: number, req?: any): Promise<void> {
    await this.getPool(req).execute(
      'UPDATE Notifications SET is_read = true WHERE id = ?',
      [notificationId]
    );
  }
}