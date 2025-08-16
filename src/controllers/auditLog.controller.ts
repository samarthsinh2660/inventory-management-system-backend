import { Request, Response, NextFunction } from 'express';
import { 
  successResponse, 
  deletedResponse, 
  responseWithMeta 
} from '../utils/response.ts';
import { ERRORS, RequestError } from '../utils/error.ts';
import auditLogRepository from '../repositories/auditLog.repository.ts';
import { AuditLogFilters } from '../models/auditLogs.model.ts'; 
import createLogger from '../utils/logger.ts';


const logger = createLogger('@auditLogController');

/**
 * Get all audit logs with comprehensive filtering and pagination
 */
export const getAllLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Parse and validate filter parameters
    const filters: AuditLogFilters = {};
    
    // Pagination
    if (req.query.page) {
      const page = parseInt(req.query.page as string);
      if (isNaN(page) || page < 1) {
        throw new RequestError('Page must be a positive integer', ERRORS.AUDIT_LOG_INVALID_FILTER.code, 400);
      }
      filters.page = page;
    }
    
    if (req.query.limit) {
      const limit = parseInt(req.query.limit as string);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new RequestError('Limit must be between 1 and 100', ERRORS.AUDIT_LOG_INVALID_FILTER.code, 400);
      }
      filters.limit = limit;
    }
    
    // Search filter
    if (req.query.search) {
      const search = (req.query.search as string).trim();
      if (search.length > 0) {
        filters.search = search;
      }
    }
    
    // Action filter
    if (req.query.action) {
      const action = req.query.action as string;
      if (!['create', 'update', 'delete'].includes(action)) {
        throw new RequestError('Action must be create, update, or delete', ERRORS.AUDIT_LOG_INVALID_FILTER.code, 400);
      }
      filters.action = action as 'create' | 'update' | 'delete';
    }
    
    // User filter
    if (req.query.user_id) {
      const userId = parseInt(req.query.user_id as string);
      if (isNaN(userId) || userId < 1) {
        throw new RequestError('User ID must be a positive integer', ERRORS.AUDIT_LOG_INVALID_FILTER.code, 400);
      }
      filters.user_id = userId;
    }
    
    // Location filter
    if (req.query.location_id) {
      const locationId = parseInt(req.query.location_id as string);
      if (isNaN(locationId) || locationId < 1) {
        throw new RequestError('Location ID must be a positive integer', ERRORS.AUDIT_LOG_INVALID_FILTER.code, 400);
      }
      filters.location_id = locationId;
    }
    
    // Flag filter
    if (req.query.is_flag !== undefined) {
      const flagValue = req.query.is_flag as string;
      if (!['true', 'false'].includes(flagValue)) {
        throw new RequestError('is_flag must be true or false', ERRORS.AUDIT_LOG_INVALID_FILTER.code, 400);
      }
      filters.is_flag = flagValue === 'true';
    }
    
    // Reference ID filter
    if (req.query.reference_id) {
      filters.reference_id = req.query.reference_id as string;
    }
    
    // Product hierarchy filters
    if (req.query.product_id) {
      const productId = parseInt(req.query.product_id as string);
      if (isNaN(productId) || productId < 1) {
        throw new RequestError('Product ID must be a positive integer', ERRORS.AUDIT_LOG_INVALID_FILTER.code, 400);
      }
      filters.product_id = productId;
    }
    
    if (req.query.category) {
      const category = req.query.category as string;
      if (!['raw', 'semi', 'finished'].includes(category)) {
        throw new RequestError('Category must be raw, semi, or finished', ERRORS.AUDIT_LOG_INVALID_FILTER.code, 400);
      }
      filters.category = category as 'raw' | 'semi' | 'finished';
    }
    
    if (req.query.subcategory_id) {
      const subcategoryId = parseInt(req.query.subcategory_id as string);
      if (isNaN(subcategoryId) || subcategoryId < 1) {
        throw new RequestError('Subcategory ID must be a positive integer', ERRORS.AUDIT_LOG_INVALID_FILTER.code, 400);
      }
      filters.subcategory_id = subcategoryId;
    }
    
    // Date range filters validation
    if (req.query.date_from) {
      const dateFrom = new Date(req.query.date_from as string);
      if (isNaN(dateFrom.getTime())) {
        throw new RequestError('Invalid date_from format. Use YYYY-MM-DD', ERRORS.AUDIT_LOG_INVALID_FILTER.code, 400);
      }
      filters.date_from = dateFrom;
    }
    
    if (req.query.date_to) {
      const dateTo = new Date(req.query.date_to as string);
      if (isNaN(dateTo.getTime())) {
        throw new RequestError('Invalid date_to format. Use YYYY-MM-DD', ERRORS.AUDIT_LOG_INVALID_FILTER.code, 400);
      }
      filters.date_to = dateTo;
    }
    
    // Last N days filter
    if (req.query.days) {
      const days = parseInt(req.query.days as string);
      if (isNaN(days) || days < 1) {
        throw new RequestError('Days must be a positive integer', ERRORS.AUDIT_LOG_INVALID_FILTER.code, 400);
      }
      filters.days = days;
    }
    
    // Validate mutual exclusivity of date filters
    if (filters.days && (filters.date_from || filters.date_to)) {
      throw new RequestError('Cannot use days filter with date_from/date_to filters', ERRORS.AUDIT_LOG_INVALID_FILTER.code, 400);
    }
    
    // Call repository with comprehensive filters
    const result = await auditLogRepository.findAllWithFilters(filters, req);
    
    const page = filters.page || 1;
    const limit = filters.limit || 100;
    
    res.json(responseWithMeta(
      result.logs, 
      {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
        filters_applied: result.filters_applied
      }, 
      'Audit logs retrieved successfully'
    ));
  } catch (error) {
    logger.warn('getAllLogs error:', error as any);
    next(error);
  }
};

/**
 * Get a specific audit log by ID
 */
export const getLogById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const logId = parseInt(req.params.id);
    
    if (isNaN(logId)) {
      throw ERRORS.AUDIT_LOG_INVALID_ID;
    }
    
    const log = await auditLogRepository.findById(logId ,req);
    
    if (!log) {
      throw ERRORS.AUDIT_LOG_NOT_FOUND;
    }
    
    res.json(successResponse(log, 'Audit log retrieved successfully'));
  } catch (error) {
    logger.warn('getLogById error:', error as any);
    next(error);
  }
};

/**
 * Get audit logs for a specific inventory entry
 */
export const getLogsByEntryId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const entryId = parseInt(req.params.entryId);
    
    if (isNaN(entryId)) {
      throw new RequestError('Invalid inventory entry ID', ERRORS.AUDIT_LOG_INVALID_FILTER.code, 400);
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const { logs, total } = await auditLogRepository.findByEntryId(
      entryId, 
      page, 
      limit,
      req
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
    next(error);
  }
};

/**
 * Delete an audit log (master users only)
 */
export const deleteLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if user exists in the request (should be added by authenticate middleware)
    if (!req.user) {
      throw ERRORS.UNAUTHORIZED;
    }
    
    // Only master users can delete audit logs
    if (!(req.user as any).is_master) {
      throw ERRORS.AUDIT_LOG_MASTER_ONLY;
    }
    
    const logId = parseInt(req.params.id);
    
    if (isNaN(logId)) {
      throw ERRORS.AUDIT_LOG_INVALID_ID;
    }
    
    // Check if we should revert the changes when deleting the log
    const isRevert = req.query.revert === 'true';
    
    // Delete the log (and potentially revert changes)
    await auditLogRepository.deleteAndRevert(logId, (req.user as any).id, isRevert, req);
    
    const message = isRevert 
      ? 'Audit log deleted and changes reverted successfully' 
      : 'Audit log deleted successfully';
    
    res.json(deletedResponse(message));
  } catch (error) {
    logger.warn('deleteLog error:', error as any);
    next(error);
  }
};

/**
 * Update the flag status of an audit log
 * Only masters can update flags for resolution with employees
 */
export const updateFlag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const logId = parseInt(req.params.id);
    
    if (isNaN(logId)) {
      throw ERRORS.AUDIT_LOG_INVALID_ID;
    }
    
    const { is_flag } = req.body;
    
    if (typeof is_flag !== 'boolean') {
      throw ERRORS.AUDIT_LOG_FLAG_INVALID;
    }
    
    const updatedLog = await auditLogRepository.updateFlag(logId, is_flag, req);
    
    res.json(successResponse(
      updatedLog,
      `Audit log flag ${is_flag ? 'set' : 'unset'} successfully`
    ));
  } catch (error) {
    logger.warn('updateFlag error:', error as any);
    next(error);
  }
};
