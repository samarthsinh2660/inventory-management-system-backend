import { Request, Response } from 'express';
import alertService from '../services/alert.service.ts';
import { RowDataPacket } from 'mysql2';
import { db } from '../database/db.ts';
import { ERRORS } from '../utils/error.ts';

/**
 * Get all products that are currently below their minimum threshold
 */
export const getProductsBelowThreshold = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await alertService.getProductsBelowThreshold();
    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error("Error getting products below threshold:", error);
    res.status(ERRORS.GET_LOW_STOCK_PRODUCTS_FAILED.statusCode).json({ 
      success: false,
      message: ERRORS.GET_LOW_STOCK_PRODUCTS_FAILED.message 
    });
  }
};

/**
 * Get all alerts (both resolved and unresolved)
 */
export const getAllAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const resolved = req.query.resolved === 'true' ? true : 
                    req.query.resolved === 'false' ? false : null;
    
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
    
    const [alerts] = await db.execute<RowDataPacket[]>(query, params);
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM StockAlerts`;
    if (resolved !== null) {
      countQuery += ` WHERE is_resolved = ?`;
    }
    
    const [countResult] = await db.execute<RowDataPacket[]>(countQuery, 
      resolved !== null ? [resolved] : []);
    
    const total = countResult[0]?.total || 0;
    
    res.json({
      success: true,
      count: alerts.length,
      total,
      page,
      limit,
      data: alerts
    });
  } catch (error) {
    console.error("Error getting alerts:", error);
    res.status(ERRORS.GET_ALERTS_FAILED.statusCode).json({ 
      success: false,
      message: ERRORS.GET_ALERTS_FAILED.message 
    });
  }
};

/**
 * Mark an alert as resolved
 */
export const resolveAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const alertId = parseInt(req.params.id);
    
    if (!alertId) {
      res.status(ERRORS.INVALID_ALERT_ID.statusCode).json({
        success: false,
        message: ERRORS.INVALID_ALERT_ID.message
      });
      return;
    }
    
    // Check user is master
    if (!req.user || req.user.is_master !== true) {
      res.status(ERRORS.ALERT_MASTER_ONLY.statusCode).json({
        success: false,
        message: ERRORS.ALERT_MASTER_ONLY.message
      });
      return;
    }
    
    // Mark alert as resolved
    const [result] = await db.execute<RowDataPacket[]>(
      'UPDATE StockAlerts SET is_resolved = true, resolved_at = CURRENT_TIMESTAMP WHERE id = ?',
      [alertId]
    );
    
    if ((result as any).affectedRows === 0) {
      res.status(ERRORS.ALERT_NOT_FOUND.statusCode).json({
        success: false,
        message: ERRORS.ALERT_NOT_FOUND.message
      });
      return;
    }
    
    res.json({
      success: true,
      message: "Alert marked as resolved"
    });
  } catch (error) {
    console.error("Error resolving alert:", error);
    res.status(ERRORS.ALERT_RESOLUTION_FAILED.statusCode).json({ 
      success: false,
      message: ERRORS.ALERT_RESOLUTION_FAILED.message 
    });
  }
};

/**
 * Force check for new alerts manually
 */
export const forceCheckAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check user is master
    if (!req.user || req.user.is_master !== true) {
      res.status(ERRORS.ALERT_MASTER_ONLY.statusCode).json({
        success: false,
        message: ERRORS.ALERT_MASTER_ONLY.message
      });
      return;
    }
    
    await alertService.checkAndSendAlerts();
    
    res.json({
      success: true,
      message: "Alert check completed successfully"
    });
  } catch (error) {
    console.error("Error checking alerts:", error);
    res.status(ERRORS.ALERT_CHECK_FAILED.statusCode).json({ 
      success: false,
      message: ERRORS.ALERT_CHECK_FAILED.message 
    });
  }
};

/**
 * Get all unread notifications for the dashboard
 */
export const getUnreadNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if the user is a master
    if (!req.user || req.user.is_master !== true) {
      res.status(ERRORS.ALERT_MASTER_ONLY.statusCode).json({
        success: false,
        message: ERRORS.ALERT_MASTER_ONLY.message
      });
      return;
    }
    
    const userId = req.user.id;
    
    // Get unread notifications for this user
    const [notifications] = await db.execute<RowDataPacket[]>(`
      SELECT n.*, p.name AS product_name, p.id AS product_id, l.name AS location_name
      FROM Notifications n
      JOIN Products p ON n.product_id = p.id
      JOIN Locations l ON p.location_id = l.id
      WHERE n.user_id = ? AND n.is_read = false
      ORDER BY n.created_at DESC
    `, [userId]);
    
    // Return the notifications
    res.json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    console.error("Error getting unread notifications:", error);
    res.status(ERRORS.GET_NOTIFICATIONS_FAILED.statusCode).json({ 
      success: false,
      message: ERRORS.GET_NOTIFICATIONS_FAILED.message 
    });
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const notificationId = parseInt(req.params.id);
    
    if (!notificationId) {
      res.status(ERRORS.INVALID_NOTIFICATION_ID.statusCode).json({
        success: false,
        message: ERRORS.INVALID_NOTIFICATION_ID.message
      });
      return;
    }
    
    // Check if user is authorized to mark this notification
    if (!req.user) {
      res.status(ERRORS.NOTIFICATION_AUTH_REQUIRED.statusCode).json({
        success: false,
        message: ERRORS.NOTIFICATION_AUTH_REQUIRED.message
      });
      return;
    }
    
    // Verify this notification belongs to this user
    const [notification] = await db.execute<RowDataPacket[]>(
      'SELECT * FROM Notifications WHERE id = ? AND user_id = ?',
      [notificationId, req.user.id]
    );
    
    if (Array.isArray(notification) && notification.length === 0) {
      res.status(ERRORS.NOTIFICATION_NOT_FOUND.statusCode).json({
        success: false,
        message: ERRORS.NOTIFICATION_NOT_FOUND.message
      });
      return;
    }
    
    // Mark as read
    await db.execute(
      'UPDATE Notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = ?',
      [notificationId]
    );
    
    res.json({
      success: true,
      message: "Notification marked as read"
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(ERRORS.UPDATE_NOTIFICATION_FAILED.statusCode).json({ 
      success: false,
      message: ERRORS.UPDATE_NOTIFICATION_FAILED.message 
    });
  }
};
