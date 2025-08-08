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
import { InventoryEntryUpdateParams, InventoryEntryFilters } from '../models/inventoryEntries.model.ts';
import { productRepository } from '../repositories/product.repository.ts';
import { productFormulaRepository } from '../repositories/productFormula.repository.ts';

/**
 * Get all inventory entries with comprehensive filtering and pagination
 */
export const getAllEntries = async (req: Request, res: Response): Promise<void> => {
  try {
    // Parse and validate filter parameters
    const filters: InventoryEntryFilters = {};
    
    // Pagination
    if (req.query.page) {
      const page = parseInt(req.query.page as string);
      if (isNaN(page) || page < 1) {
        res.status(400).json({
          success: false,
          error: {
            code: ERRORS.INVALID_QUERY_PARAMETER.code,
            message: "Page must be a positive integer"
          }
        });
        return;
      }
      filters.page = page;
    }
    
    if (req.query.limit) {
      const limit = parseInt(req.query.limit as string);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        res.status(400).json({
          success: false,
          error: {
            code: ERRORS.INVALID_QUERY_PARAMETER.code,
            message: "Limit must be between 1 and 100"
          }
        });
        return;
      }
      filters.limit = limit;
    }
    
    // Search filter
    if (req.query.search) {
      filters.search = req.query.search as string;
    }
    
    // Entry type filter
    if (req.query.entry_type) {
      const entryType = req.query.entry_type as string;
      if (!['manual_in', 'manual_out', 'manufacturing_in', 'manufacturing_out'].includes(entryType)) {
        res.status(400).json({
          success: false,
          error: {
            code: ERRORS.INVALID_QUERY_PARAMETER.code,
            message: "Invalid entry_type. Must be one of: manual_in, manual_out, manufacturing_in, manufacturing_out"
          }
        });
        return;
      }
      filters.entry_type = entryType as any;
    }
    
    // User filter
    if (req.query.user_id) {
      const userId = parseInt(req.query.user_id as string);
      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          error: {
            code: ERRORS.INVALID_QUERY_PARAMETER.code,
            message: "user_id must be a valid number"
          }
        });
        return;
      }
      filters.user_id = userId;
    }
    
    // Location filter
    if (req.query.location_id) {
      const locationId = parseInt(req.query.location_id as string);
      if (isNaN(locationId)) {
        res.status(400).json({
          success: false,
          error: {
            code: ERRORS.INVALID_QUERY_PARAMETER.code,
            message: "location_id must be a valid number"
          }
        });
        return;
      }
      filters.location_id = locationId;
    }
    
    // Reference ID filter
    if (req.query.reference_id) {
      filters.reference_id = req.query.reference_id as string;
    }
    
    // Product ID filter
    if (req.query.product_id) {
      const productId = parseInt(req.query.product_id as string);
      if (isNaN(productId)) {
        res.status(400).json({
          success: false,
          error: {
            code: ERRORS.INVALID_QUERY_PARAMETER.code,
            message: "product_id must be a valid number"
          }
        });
        return;
      }
      filters.product_id = productId;
    }
    
    // Category filter
    if (req.query.category) {
      const category = req.query.category as string;
      if (!['raw', 'semi', 'finished'].includes(category)) {
        res.status(400).json({
          success: false,
          error: {
            code: ERRORS.INVALID_QUERY_PARAMETER.code,
            message: "Invalid category. Must be one of: raw, semi, finished"
          }
        });
        return;
      }
      filters.category = category as any;
    }
    
    // Subcategory filter
    if (req.query.subcategory_id) {
      const subcategoryId = parseInt(req.query.subcategory_id as string);
      if (isNaN(subcategoryId)) {
        res.status(400).json({
          success: false,
          error: {
            code: ERRORS.INVALID_QUERY_PARAMETER.code,
            message: "subcategory_id must be a valid number"
          }
        });
        return;
      }
      filters.subcategory_id = subcategoryId;
    }
    
    // Date range filters
    if (req.query.date_from) {
      const dateFrom = new Date(req.query.date_from as string);
      if (isNaN(dateFrom.getTime())) {
        res.status(400).json({
          success: false,
          error: {
            code: ERRORS.INVALID_QUERY_PARAMETER.code,
            message: "date_from must be a valid ISO date string"
          }
        });
        return;
      }
      filters.date_from = req.query.date_from as string;
    }
    
    if (req.query.date_to) {
      const dateTo = new Date(req.query.date_to as string);
      if (isNaN(dateTo.getTime())) {
        res.status(400).json({
          success: false,
          error: {
            code: ERRORS.INVALID_QUERY_PARAMETER.code,
            message: "date_to must be a valid ISO date string"
          }
        });
        return;
      }
      filters.date_to = req.query.date_to as string;
    }
    
    // Days filter (last N days)
    if (req.query.days) {
      const days = parseInt(req.query.days as string);
      if (isNaN(days) || days < 1) {
        res.status(400).json({
          success: false,
          error: {
            code: ERRORS.INVALID_QUERY_PARAMETER.code,
            message: "days must be a positive integer"
          }
        });
        return;
      }
      filters.days = days;
    }
    
    // Get filtered entries
    const result = await inventoryEntryRepository.findAllWithFilters(filters);
    
    const page = filters.page || 1;
    const limit = filters.limit || 100;
    
    res.json(responseWithMeta(
      result.entries, 
      {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
        filters_applied: result.filters_applied
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
    const limit = parseInt(req.query.limit as string) || 100;
    
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
          code: ERRORS.PRODUCT_REQUIRED.code,
          message: ERRORS.PRODUCT_REQUIRED.message
        }
      });
      return;
    }
    
    if (quantity === undefined || isNaN(Number(quantity))) {
      res.status(400).json({
        success: false,
        error: {
          code: ERRORS.QUANTITY_REQUIRED.code,
          message: ERRORS.QUANTITY_REQUIRED.message
        }
      });
      return;
    }
    
    if (!entry_type) {
      res.status(400).json({
        success: false,
        error: {
          code: ERRORS.ENTRY_TYPE_REQUIRED.code,
          message: ERRORS.ENTRY_TYPE_REQUIRED.message
        }
      });
      return;
    }
    
    if (!location_id) {
      res.status(400).json({
        success: false,
        error: {
          code: ERRORS.LOCATION_REQUIRED.code,
          message: ERRORS.LOCATION_REQUIRED.message
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
    
    // Special handling for manufacturing products with formulas
    if (entry_type === 'manufacturing_in') {
      // Get the product to check if it has a formula
      const product = await productRepository.findById(Number(product_id));
      
      if (product && product.product_formula_id) {
        // Get the formula with its components
        const formula = await productFormulaRepository.findById(product.product_formula_id);
        
        if (formula && formula.components && formula.components.length > 0) {
          // Start a transaction to handle the parent product addition and component deductions
          const entryResult = await inventoryEntryRepository.createWithFormulaComponents(
            {
              product_id: Number(product_id),
              quantity: Number(quantity),
              entry_type,
              user_id: req.user?.id || 0, // Use 0 as fallback for system-generated entries
              location_id: Number(location_id),
              notes,
              reference_id
            },
            formula.components,
            Number(quantity)
          );
          
          // Create audit logs for the main product and all component entries
          await Promise.all([
            auditLogRepository.logCreate(
              entryResult.mainEntry.id,
              entryResult.mainEntry,
              req.user?.id || 0, // Use 0 as fallback for system-generated entries
              req.body.reason
            ),
            ...entryResult.componentEntries.map(entry => 
              auditLogRepository.logCreate(
                entry.id,
                entry,
                req.user?.id || 0, // Use 0 as fallback for system-generated entries
                `Auto-deducted component for manufacturing product ID ${product_id}`
              )
            )
          ]);
          
          res.status(201).json(createdResponse({
            mainEntry: entryResult.mainEntry,
            componentEntries: entryResult.componentEntries
          }, 'Inventory entry created with formula component deductions'));
          return;
        }
      }
    }
    
    // Regular entry creation (no formula handling)
    const entry = await inventoryEntryRepository.create({
      product_id: Number(product_id),
      quantity: Number(quantity),
      entry_type,
      user_id: req.user?.id,
      location_id: Number(location_id),
      notes,
      reference_id
    });
    
    // Create audit log for this operation
    await auditLogRepository.logCreate(
      entry.id,
      entry,
      req.user?.id || 0, // Use 0 as fallback for system-generated entries
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
      req.user?.id || 0, // Use 0 as fallback for system-generated entries
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
    if (!req.user.is_master && entry.user_id !== req.user?.id) {
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
      req.user?.id || 0, // Use 0 as fallback for system-generated entries
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

/**
 * Get inventory entries for the authenticated user with username
 */
export const getUserInventoryEntries = async (req: Request, res: Response): Promise<void> => {
  try {
    // Ensure user is authenticated
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
    
    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Get user inventory entries with username
    const { username, entries, total } = await inventoryEntryRepository.getUserInventoryEntries(
      userId, 
      page, 
      limit
    );
    
    res.json(responseWithMeta(
      { 
        username,
        entries 
      },
      {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }, 
      'User inventory entries retrieved successfully'
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
