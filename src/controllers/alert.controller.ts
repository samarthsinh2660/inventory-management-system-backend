import { Request, Response, NextFunction } from 'express';
import alertService from '../services/alert.service.ts';
import { AlertRepository } from '../repositories/alert.repository.ts';
import { ERRORS } from '../utils/error.ts';
import createLogger from '../utils/logger.ts';

// Use an instance for multi-tenant aware methods
const alertRepository = new AlertRepository();
const logger = createLogger('@alertController');

/**
 * Get all products that are currently below their minimum threshold
 */
export const getProductsBelowThreshold = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    logger.warn('getProductsBelowThreshold error:', error as any);
    next(error);
  }
};

/**
 * Get all alerts (both resolved and unresolved)
 */
export const getAllAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    logger.warn('getAllAlerts error:', error as any);
    next(error);
  }
};

/**
 * Mark an alert as resolved
 */
export const resolveAlert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const alertId = parseInt(req.params.id);
    
    if (!alertId) {
      throw ERRORS.INVALID_ALERT_ID;
    }
    
    // Check user is master
    if (!req.user || req.user.is_master !== true) {
      throw ERRORS.ALERT_MASTER_ONLY;
    }
    
    // Mark alert as resolved
    const affectedRows = await alertRepository.resolveAlert(alertId, req);
    
    if (affectedRows === 0) {
      throw ERRORS.ALERT_NOT_FOUND;
    }
    
    // Mark related notifications as read
    await alertRepository.markAlertNotificationsAsRead(alertId, req);
    
    res.json({
      success: true,
      message: "Alert marked as resolved"
    });
  } catch (error) {
    logger.warn('resolveAlert error:', error as any);
    next(error);
  }
};

/**
 * Force check for new alerts manually
 */
export const forceCheckAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user as any;
    
    if (!user || user.role !== 'master') {
      throw ERRORS.ALERT_MASTER_ONLY;
    }
    
    const tenantPool = (req as any).factoryPool;
    if (!tenantPool) {
      throw ERRORS.FACTORY_CONTEXT_REQUIRED;
    }
    
    await alertService.checkAndSendAlerts(tenantPool);
    
    res.json({
      success: true,
      message: "Alert check completed successfully"
    });
  } catch (error) {
    logger.warn('forceCheckAlerts error:', error as any);
    next(error);
  }
};

/**
 * Get all unread notifications for the dashboard
 */
export const getUnreadNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if the user is a master
    if (!req.user || req.user.is_master !== true) {
      throw ERRORS.ALERT_MASTER_ONLY;
    }
    
    const notifications = await alertRepository.getUnreadNotifications(req);
    
    res.json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    logger.warn('getUnreadNotifications error:', error as any);
    next(error);
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notificationId = parseInt(req.params.id);
    
    if (!notificationId) {
      throw ERRORS.INVALID_NOTIFICATION_ID;
    }
    
    // Check if user is a master
    if (!req.user || req.user.is_master !== true) {
      throw ERRORS.ALERT_MASTER_ONLY;
    }
    
    // Verify notification exists
    const notification = await alertRepository.getNotificationById(notificationId, req);
    
    if (!notification) {
      throw ERRORS.NOTIFICATION_NOT_FOUND;
    }
    
    // Mark as read
    await alertRepository.markNotificationAsRead(notificationId, req);
    
    res.json({
      success: true,
      message: "Notification marked as read"
    });
  } catch (error) {
    logger.warn('markNotificationAsRead error:', error as any);
    next(error);
  }
};