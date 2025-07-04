import { Router } from 'express';
import { 
  getUnreadNotifications,
  markNotificationAsRead 
} from '../controllers/alert.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';

const NotificationRouter = Router();

// All routes require authentication
NotificationRouter.use(authenticate);

// Get all unread notifications for the current user
NotificationRouter.get('/', getUnreadNotifications);

// Mark notification as read
NotificationRouter.patch('/:id/read', markNotificationAsRead);

export default NotificationRouter;