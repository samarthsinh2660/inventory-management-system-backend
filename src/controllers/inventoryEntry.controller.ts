import { Request, Response } from 'express';
import { 
  createdResponse, 
  deletedResponse, 
  successResponse, 
  responseWithMeta 
} from '../utils/response.ts';
import { ERRORS, handleUnknownError } from '../utils/error.ts';
import inventoryEntryRepository from '../repositories/inventoryEntry.repository.ts';
import auditLogRepository from '../repositories/auditLog.repository.ts';
import { InventoryEntryCreateParams, InventoryEntryUpdateParams } from '../models/inventoryEntries.model.ts';

/**
 * Get all inventory entries with pagination
 */
export const getAllEntries = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const { entries, total } = await inventoryEntryRepository.findAll(page, limit);
    
    res.json(responseWithMeta(
      entries, 
      {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }, 
      'Inventory entries retrieved successfully'
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
 * Get a specific inventory entry by ID
 */
export const getEntryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const entryId = parseInt(req.params.id);
    
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
    
    const entry = await inventoryEntryRepository.findById(entryId);
    
    if (!entry) {
      res.status(404).json({
        success: false,
        error: {
          code: ERRORS.INVENTORY_ENTRY_NOT_FOUND.code,
          message: ERRORS.INVENTORY_ENTRY_NOT_FOUND.message
        }
      });
      return;
    }
    
    res.json(successResponse(entry, 'Inventory entry retrieved successfully'));
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
 * Get inventory entries for a specific product
 */
export const getProductEntries = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = parseInt(req.params.productId);
    
    if (isNaN(productId)) {
      res.status(400).json({
        success: false,
        error: {
          code: ERRORS.INVALID_PARAMS.code,
          message: "Invalid product ID"
        }
      });
      return;
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const { entries, total } = await inventoryEntryRepository.findByProduct(
      productId, 
      page, 
      limit
    );
    
    res.json(responseWithMeta(
      entries, 
      {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }, 
      'Product inventory entries retrieved successfully'
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
 * Create a new inventory entry with audit logging
 */
export const createEntry = async (req: Request , res: Response): Promise<void> => {
  try {
    const { 
      product_id, 
      quantity, 
      entry_type, 
      location_id,
      notes,
      reference_id
    } = req.body;
    
    // Validate required fields
    if (!product_id) {
      res.status(400).json({
        success: false,
        error: {
          code: ERRORS.INVENTORY_ENTRY_PRODUCT_REQUIRED.code,
          message: ERRORS.INVENTORY_ENTRY_PRODUCT_REQUIRED.message
        }
      });
      return;
    }
    
    if (quantity === undefined || quantity === null || quantity === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: ERRORS.INVENTORY_ENTRY_INVALID_QUANTITY.code,
          message: ERRORS.INVENTORY_ENTRY_INVALID_QUANTITY.message
        }
      });
      return;
    }
    
    if (!entry_type) {
      res.status(400).json({
        success: false,
        error: {
          code: ERRORS.INVENTORY_ENTRY_TYPE_REQUIRED.code,
          message: ERRORS.INVENTORY_ENTRY_TYPE_REQUIRED.message
        }
      });
      return;
    }
    
    if (!location_id) {
      res.status(400).json({
        success: false,
        error: {
          code: ERRORS.INVENTORY_ENTRY_LOCATION_REQUIRED.code,
          message: ERRORS.INVENTORY_ENTRY_LOCATION_REQUIRED.message
        }
      });
      return;
    }
    
    // Check if user is authenticated
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
    
    const user_id = req.user.id;
    
    // Create the entry
    const entryData: InventoryEntryCreateParams = {
      product_id,
      quantity,
      entry_type,
      user_id,
      location_id,
      notes,
      reference_id
    };
    
    const entry = await inventoryEntryRepository.create(entryData);
    
    // Create audit log for this operation
    await auditLogRepository.logCreate(
      entry.id,
      entryData,
      user_id,
      req.body.reason
    );
    
    res.status(201).json(createdResponse(entry, 'Inventory entry created successfully'));
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
 * Update an existing inventory entry with audit logging
 */
export const updateEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const entryId = parseInt(req.params.id);
    
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
    
    // Check if the entry exists
    const existingEntry = await inventoryEntryRepository.findById(entryId);
    if (!existingEntry) {
      res.status(404).json({
        success: false,
        error: {
          code: ERRORS.INVENTORY_ENTRY_NOT_FOUND.code,
          message: ERRORS.INVENTORY_ENTRY_NOT_FOUND.message
        }
      });
      return;
    }
    
    // Extract update data
    const { 
      quantity, 
      entry_type, 
      location_id, 
      notes, 
      reference_id 
    } = req.body;
    
    // Create update object
    const updateData: InventoryEntryUpdateParams = {};
    
    if (quantity !== undefined) updateData.quantity = quantity;
    if (entry_type !== undefined) updateData.entry_type = entry_type;
    if (location_id !== undefined) updateData.location_id = location_id;
    if (notes !== undefined) updateData.notes = notes;
    if (reference_id !== undefined) updateData.reference_id = reference_id;
    
    // Check if user is authenticated
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
    
    // Update the entry
    const updatedEntry = await inventoryEntryRepository.update(entryId, updateData);
    
    // Create audit log for this operation
    await auditLogRepository.logUpdate(
      entryId,
      existingEntry,
      updatedEntry,
      req.user.id,
      req.body.reason
    );
    
    res.json(successResponse(updatedEntry, 'Inventory entry updated successfully'));
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
 * Delete an inventory entry with audit logging
 * - Master users can delete any entry
 * - Employee users can only delete entries they created
 */
export const deleteEntry = async (req: Request , res: Response): Promise<void> => {
  try {
    const entryId = parseInt(req.params.id);
    
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
    
    // Get the entry before deletion for audit log
    const entry = await inventoryEntryRepository.findById(entryId);
    
    if (!entry) {
      res.status(404).json({
        success: false,
        error: {
          code: ERRORS.INVENTORY_ENTRY_NOT_FOUND.code,
          message: ERRORS.INVENTORY_ENTRY_NOT_FOUND.message
        }
      });
      return;
    }
    
    // Check if user is authenticated
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
    
    // Check permissions:
    // - Master users can delete any entry
    // - Employee users can only delete entries they created
    if (!req.user.is_master && entry.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        error: {
          code: ERRORS.FORBIDDEN.code,
          message: "You can only delete your own inventory entries"
        }
      });
      return;
    }
    
    // Delete the entry
    await inventoryEntryRepository.delete(entryId);
    
    // Create audit log for this operation
    await auditLogRepository.logDelete(
      entryId,
      entry,
      req.user.id,
      req.body.reason
    );
    
    res.json(deletedResponse('Inventory entry deleted successfully'));
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
 * Get inventory balance (stock levels)
 */
export const getBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const locationId = req.query.location_id 
      ? parseInt(req.query.location_id as string) 
      : undefined;
    
    const balance = await inventoryEntryRepository.getBalance(locationId);
    
    res.json(successResponse(balance, 'Inventory balance retrieved successfully'));
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
