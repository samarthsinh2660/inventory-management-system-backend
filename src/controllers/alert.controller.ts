import { Request, Response } from 'express';
import alertService from '../services/alert.service.ts';
import { AlertRepository } from '../repositories/alert.repository.ts';
import { ERRORS } from '../utils/error.ts';

// Use an instance for multi-tenant aware methods
const alertRepository = new AlertRepository();

/**
 * Get all products that are currently below their minimum threshold
 */
export const getProductsBelowThreshold = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantPool = (req as any).factoryPool;
    if (!tenantPool) {
      throw new Error('Tenant database pool not found');
    }
    
    const products = await alertService.getProductsBelowThreshold(tenantPool);
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
    const resolved = req.query.resolved === 'true' ? true : 
                    req.query.resolved === 'false' ? false : null;
    
    const { alerts, total } = await alertRepository.getAllAlerts({
      resolved,
      page,
      limit
    }, req);
    
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
    const affectedRows = await alertRepository.resolveAlert(alertId, req);
    
    if (affectedRows === 0) {
      res.status(ERRORS.ALERT_NOT_FOUND.statusCode).json({
        success: false,
        message: ERRORS.ALERT_NOT_FOUND.message
      });
      return;
    }
    
    // Mark related notifications as read
    await alertRepository.markAlertNotificationsAsRead(alertId, req);
    
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
    const user = req.user as any;
    
    if (!user || user.role !== 'master') {
      res.status(ERRORS.ALERT_MASTER_ONLY.statusCode).json({
        success: false,
        message: ERRORS.ALERT_MASTER_ONLY.message
      });
      return;
    }
    
    const tenantPool = (req as any).factoryPool;
    if (!tenantPool) {
      throw new Error('Tenant database pool not found');
    }
    
    await alertService.checkAndSendAlerts(tenantPool);
    
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
    
    const notifications = await alertRepository.getUnreadNotifications(req);
    
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
    
    // Check if user is a master
    if (!req.user || req.user.is_master !== true) {
      res.status(ERRORS.ALERT_MASTER_ONLY.statusCode).json({
        success: false,
        message: ERRORS.ALERT_MASTER_ONLY.message
      });
      return;
    }
    
    // Verify notification exists
    const notification = await alertRepository.getNotificationById(notificationId, req);
    
    if (!notification) {
      res.status(ERRORS.NOTIFICATION_NOT_FOUND.statusCode).json({
        success: false,
        message: ERRORS.NOTIFICATION_NOT_FOUND.message
      });
      return;
    }
    
    // Mark as read
    await alertRepository.markNotificationAsRead(notificationId, req);
    
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