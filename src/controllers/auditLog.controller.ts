import { Request, Response } from 'express';
import { 
  successResponse, 
  deletedResponse, 
  responseWithMeta 
} from '../utils/response.ts';
import { ERRORS, handleUnknownError } from '../utils/error.ts';
import auditLogRepository from '../repositories/auditLog.repository.ts';
import { AuditLogFilter } from '../models/auditLogs.model.ts'; 

/**
 * Get all audit logs with filtering and pagination
 */
export const getAllLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: AuditLogFilter = {};
    
    // Process query parameters for filtering
    if (req.query.entry_id) {
      filter.entry_id = parseInt(req.query.entry_id as string);
    }
    
    if (req.query.action) {
      filter.action = req.query.action as 'create' | 'update' | 'delete';
    }
    
    if (req.query.user_id) {
      filter.user_id = parseInt(req.query.user_id as string);
    }
    
    if (req.query.start_date) {
      filter.start_date = new Date(req.query.start_date as string);
    }
    
    if (req.query.end_date) {
      filter.end_date = new Date(req.query.end_date as string);
    }
    
    if (req.query.is_flag !== undefined) {
      filter.is_flag = req.query.is_flag === 'true';
    }
    
    // Pagination
    filter.page = parseInt(req.query.page as string) || 1;
    filter.limit = parseInt(req.query.limit as string) || 10;
    
    const { logs, total } = await auditLogRepository.findAll(filter);
    
    res.json(responseWithMeta(
      logs, 
      {
        page: filter.page,
        limit: filter.limit,
        total,
        pages: Math.ceil(total / (filter.limit || 10))
      }, 
      'Audit logs retrieved successfully'
    ));
  } catch (error) {
    const requestError = handleUnknownError(error);
    res.status(requestError.statusCode).json({
      success: false,
      error: {
        code: requestError.code,
        message: requestError.message
      }
    });
  }
};

/**
 * Get a specific audit log by ID
 */
export const getLogById = async (req: Request, res: Response): Promise<void> => {
  try {
    const logId = parseInt(req.params.id);
    
    if (isNaN(logId)) {
      res.status(400).json({
        success: false,
        error: {
          code: ERRORS.INVALID_PARAMS.code,
          message: "Invalid audit log ID"
        }
      });
      return;
    }
    
    const log = await auditLogRepository.findById(logId);
    
    if (!log) {
      res.status(404).json({
        success: false,
        error: {
          code: ERRORS.AUDIT_LOG_NOT_FOUND.code,
          message: ERRORS.AUDIT_LOG_NOT_FOUND.message
        }
      });
      return;
    }
    
    res.json(successResponse(log, 'Audit log retrieved successfully'));
  } catch (error) {
    const requestError = handleUnknownError(error);
    res.status(requestError.statusCode).json({
      success: false,
      error: {
        code: requestError.code,
        message: requestError.message
      }
    });
  }
};

/**
 * Get audit logs for a specific inventory entry
 */
export const getLogsByEntryId = async (req: Request, res: Response): Promise<void> => {
  try {
    const entryId = parseInt(req.params.entryId);
    
    if (isNaN(entryId)) {
      res.status(400).json({
        success: false,
        error: {
          code: ERRORS.INVALID_PARAMS.code,
          message: "Invalid inventory entry ID"
        }
      });
      return;
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const { logs, total } = await auditLogRepository.findByEntryId(
      entryId, 
      page, 
      limit
    );
    
    res.json(responseWithMeta(
      logs, 
      {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }, 
      'Entry audit logs retrieved successfully'
    ));
  } catch (error) {
    const requestError = handleUnknownError(error);
    res.status(requestError.statusCode).json({
      success: false,
      error: {
        code: requestError.code,
        message: requestError.message
      }
    });
  }
};

/**
 * Delete an audit log (master users only)
 */
export const deleteLog = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if user exists in the request (should be added by authenticate middleware)
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: ERRORS.UNAUTHORIZED.code,
          message: ERRORS.UNAUTHORIZED.message
        }
      });
      return;
    }
    
    // Only master users can delete audit logs
    if (!(req.user as any).is_master) {
      res.status(403).json({
        success: false,
        error: {
          code: ERRORS.AUDIT_LOG_MASTER_ONLY.code,
          message: ERRORS.AUDIT_LOG_MASTER_ONLY.message
        }
      });
      return;
    }
    
    const logId = parseInt(req.params.id);
    
    if (isNaN(logId)) {
      res.status(400).json({
        success: false,
        error: {
          code: ERRORS.INVALID_PARAMS.code,
          message: "Invalid audit log ID"
        }
      });
      return;
    }
    
    // Check if we should revert the changes when deleting the log
    const isRevert = req.query.revert === 'true';
    
    // Delete the log (and potentially revert changes)
    await auditLogRepository.deleteAndRevert(logId, (req.user as any).id, isRevert);
    
    const message = isRevert 
      ? 'Audit log deleted and changes reverted successfully' 
      : 'Audit log deleted successfully';
    
    res.json(deletedResponse(message));
  } catch (error) {
    console.error("Error in deleteLog:", error);
    const requestError = handleUnknownError(error);
    res.status(requestError.statusCode).json({
      success: false,
      error: {
        code: requestError.code,
        message: requestError.message
      }
    });
  }
};

/**
 * Update the flag status of an audit log
 * Only masters can update flags for resolution with employees
 */
export const updateFlag = async (req: Request, res: Response): Promise<void> => {
  try {
    const logId = parseInt(req.params.id);
    
    if (isNaN(logId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 400,
          message: "Invalid audit log ID"
        }
      });
      return;
    }
    
    const { is_flag } = req.body;
    
    if (typeof is_flag !== 'boolean') {
      res.status(400).json({
        success: false,
        error: {
          code: 400,
          message: "is_flag must be a boolean value"
        }
      });
      return;
    }
    
    const updatedLog = await auditLogRepository.updateFlag(logId, is_flag);
    
    res.json(successResponse(
      updatedLog,
      `Audit log flag ${is_flag ? 'set' : 'unset'} successfully`
    ));
  } catch (error) {
    console.error("Error in updateFlag:", error);
    const requestError = handleUnknownError(error);
    res.status(requestError.statusCode).json({
      success: false,
      error: {
        code: requestError.code,
        message: requestError.message
      }
    });
  }
};
