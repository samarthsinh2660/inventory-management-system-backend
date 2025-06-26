import { Router } from 'express';
import { 
  getProductsBelowThreshold,
  getAllAlerts,
  resolveAlert,
  forceCheckAlerts
} from '../controllers/alert.controller.ts';
import { authenticate, requireMaster } from '../middleware/auth.middleware.ts';

const AlertRouter = Router();

// All routes require authentication
AlertRouter.use(authenticate);

// Get all products below threshold - available to all authenticated users
AlertRouter.get('/stock/threshold', getProductsBelowThreshold);

// Get all alerts with pagination and filtering - available to all authenticated users
AlertRouter.get('/', getAllAlerts);

// Master-only routes
// Mark alert as resolved
AlertRouter.patch('/:id/resolve', requireMaster, resolveAlert);

// Force check for new alerts
AlertRouter.post('/check', requireMaster, forceCheckAlerts);

export default AlertRouter;
