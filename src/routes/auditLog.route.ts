import { Router } from 'express';
import {
  getAllLogs,
  getLogById,
  deleteLog,
  getLogsByEntryId
} from '../controllers/auditLog.controller.ts';
import { authenticate, requireMaster } from '../middleware/auth.middleware.ts';


const AuditLogRouter = Router();

// Apply authentication middleware to all audit log routes
AuditLogRouter.use(authenticate);

// Get all audit logs with filtering and pagination
// Both master and employee can view logs
AuditLogRouter.get('/', getAllLogs);

// Get a specific audit log by ID
// Both master and employee can view specific logs
AuditLogRouter.get('/:id', getLogById);

// Get audit logs for a specific record type (e.g., inventory_entry)
// Both master and employee can view logs by record type
AuditLogRouter.get('/record-type/:recordType', getLogsByEntryId);

// Delete an audit log and revert the changes if possible
// Only master can delete and revert audit logs
AuditLogRouter.delete('/:id', requireMaster, deleteLog);

export default AuditLogRouter;