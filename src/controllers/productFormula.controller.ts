import { Request, Response, NextFunction } from 'express';
import { productFormulaRepository } from '../repositories/productFormula.repository.ts';
import { productRepository } from '../repositories/product.repository.ts';
import { ERRORS } from '../utils/error.ts';
import { successResponse, listResponse, createdResponse, updatedResponse, deletedResponse } from '../utils/response.ts';
import { ProductCategory } from '../models/products.model.ts';
import { FormulaComponentData, ProductFormulaCreateParams, ProductFormulaUpdateParams } from '../models/productFormula.model.ts';

import createLogger from '../utils/logger.ts';

const logger = createLogger('@productFormulaController');

/**
 * Get all product formulas
 */
export const getAllFormulas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const formulas = await productFormulaRepository.getAllFormulas(req);
    res.json(listResponse(formulas, 'Product formulas retrieved successfully'));
  } catch (error: unknown) {
    logger.warn('getAllFormulas error:', error as any);
    next(error);
  }
};

/**
 * Get formula by ID
 */
export const getFormulaById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const formulaId = parseInt(req.params.id, 10);
    
    if (isNaN(formulaId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    const formula = await productFormulaRepository.findById(formulaId, req);
    
    if (!formula) {
      throw ERRORS.PRODUCT_FORMULA_NOT_FOUND;
    }
    
    res.json(successResponse(formula, 'Product formula retrieved successfully'));
  } catch (error: unknown) {
    logger.warn('getFormulaById error:', error as any);
    next(error);
  }
};

/**
 * Get products using a specific formula
 */
export const getProductsByFormulaId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const formulaId = parseInt(req.params.id, 10);
    
    if (isNaN(formulaId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    // Check if formula exists
    const formula = await productFormulaRepository.findById(formulaId, req);
    if (!formula) {
      throw ERRORS.PRODUCT_FORMULA_NOT_FOUND;
    }
    
    const products = await productFormulaRepository.getProductsUsingFormula(formulaId, req);
    
    res.json(listResponse(products, 'Products using formula retrieved successfully'));
  } catch (error: unknown) {
    logger.warn('getProductsByFormulaId error:', error as any);
    next(error);
  }
};

/**
 * Create a new product formula
 */
export const createFormula = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, components } = req.body;
    
    // Basic validation
    if (!name) {
      throw ERRORS.PARENT_PRODUCT_REQUIRED;
    }
    
    if (!components || !Array.isArray(components) || components.length === 0) {
      throw ERRORS.COMPONENT_PRODUCT_REQUIRED;
    }
    
    // Validate each component
    for (const component of components) {
      if (!component.component_id) {
        throw ERRORS.COMPONENT_PRODUCT_REQUIRED;
      }
      
      if (component.quantity === undefined || isNaN(Number(component.quantity)) || Number(component.quantity) <= 0) {
        throw ERRORS.FORMULA_QUANTITY_INVALID;
      }
      
      // Check if component product exists
      const componentProduct = await productRepository.findById(Number(component.component_id), req);
      if (!componentProduct) {
        throw ERRORS.FORMULA_COMPONENT_NOT_FOUND;
      }
    }
    
    try {
      // Create formula
      const formulaData: ProductFormulaCreateParams = {
        name,
        description,
        components: components.map(c => ({
          component_id: Number(c.component_id),
          quantity: Number(c.quantity)
        }))
      };
      
      const formula = await productFormulaRepository.create(formulaData,req);
      
      res.status(201).json(createdResponse(formula, 'Product formula created successfully'));
    } catch (error: unknown) {
      throw ERRORS.FORMULA_CREATION_FAILED;
    }
  } catch (error: unknown) {
    logger.warn('createFormula error:', error as any);
    next(error);
  }
};

/**
 * Update a product formula
 */
export const updateFormula = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const formulaId = parseInt(req.params.id, 10);
    const { name, description, components } = req.body;
    
    if (isNaN(formulaId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    // Check if formula exists
    const existingFormula = await productFormulaRepository.findById(formulaId, req);
    if (!existingFormula) {
      throw ERRORS.PRODUCT_FORMULA_NOT_FOUND;
    }
    
    // Validate components if provided
    if (components) {
      if (!Array.isArray(components) || components.length === 0) {
        throw ERRORS.COMPONENT_PRODUCT_REQUIRED;
      }
      
      for (const component of components) {
        if (!component.component_id) {
          throw ERRORS.COMPONENT_PRODUCT_REQUIRED;
        }
        
        if (component.quantity === undefined || isNaN(Number(component.quantity)) || Number(component.quantity) <= 0) {
          throw ERRORS.FORMULA_QUANTITY_INVALID;
        }
        
        // Check if component product exists
        const componentProduct = await productRepository.findById(Number(component.component_id), req);
        if (!componentProduct) {
          throw ERRORS.PRODUCT_NOT_FOUND;
        }
      }
    }
    
    try {
      const updateData: ProductFormulaUpdateParams = {};
      
      if (name !== undefined) {
        updateData.name = name;
      }
      
      if (description !== undefined) {
        updateData.description = description;
      }
      
      if (components !== undefined) {
        updateData.components = components.map((c: any) => ({
          id: c.id, // Preserve existing IDs if they exist
          component_id: Number(c.component_id),
          quantity: Number(c.quantity)
        }));
      }
      
      const updatedFormula = await productFormulaRepository.update(formulaId, updateData, req);
      
      res.json(updatedResponse(updatedFormula, 'Product formula updated successfully'));
    } catch (error: unknown) {
      throw ERRORS.FORMULA_UPDATE_FAILED;
    }
  } catch (error: unknown) {
    logger.warn('updateFormula error:', error as any);
    next(error);
  }
};

/**
 * Delete a product formula
 */
export const deleteFormula = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const formulaId = parseInt(req.params.id, 10);
    
    if (isNaN(formulaId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    // Check if formula exists
    const formula = await productFormulaRepository.findById(formulaId, req);
    if (!formula) {
      throw ERRORS.PRODUCT_FORMULA_NOT_FOUND;
    }
    
    try {
      await productFormulaRepository.delete(formulaId,req);
      
      res.json(deletedResponse('Product formula deleted successfully'));
    } catch (error: unknown) {
      if ((error as any)?.code === ERRORS.FORMULA_IN_USE?.code) {
        throw ERRORS.FORMULA_IN_USE;
      } else {
        throw ERRORS.FORMULA_DELETION_FAILED;
      }
    }
  } catch (error: unknown) {
    logger.warn('deleteFormula error:', error as any);
    next(error);
  }
};

/**
 * Add or update a component in a formula
 */
export const updateFormulaComponent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const formulaId = parseInt(req.params.id, 10);
    const { component_id, quantity, id } = req.body;
    
    if (isNaN(formulaId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    // Basic validation
    if (!component_id) {
      throw ERRORS.COMPONENT_PRODUCT_REQUIRED;
    }
    
    if (quantity === undefined || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      throw ERRORS.FORMULA_QUANTITY_INVALID;
    }
    
    // Check if formula exists
    const formula = await productFormulaRepository.findById(formulaId, req);
    if (!formula) {
      throw ERRORS.PRODUCT_FORMULA_NOT_FOUND;
    }
    
    // Check if component product exists
    const componentProduct = await productRepository.findById(Number(component_id),req);
    if (!componentProduct) {
      throw ERRORS.PRODUCT_NOT_FOUND;
    }
    
    try {
      const componentData: FormulaComponentData = {
        id: id ? Number(id) : undefined,
        component_id: Number(component_id),
        quantity: Number(quantity)
      };
      
      const updatedFormula = await productFormulaRepository.updateFormulaComponent(formulaId, componentData, req);
      
      res.json(updatedResponse(updatedFormula, 'Formula component updated successfully'));
    } catch (error: unknown) {
      throw ERRORS.COMPONENT_UPDATE_FAILED;
    }
  } catch (error: unknown) {
    logger.warn('updateFormulaComponent error:', error as any);
    next(error);
  }
};

/**
 * Remove a component from a formula
 */
export const removeFormulaComponent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const formulaId = parseInt(req.params.formulaId, 10);
    const componentId = parseInt(req.params.componentId, 10);
    
    if (isNaN(formulaId) || isNaN(componentId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    // Check if formula exists
    const formula = await productFormulaRepository.findById(formulaId, req);
    if (!formula) {
      throw ERRORS.PRODUCT_FORMULA_NOT_FOUND;
    }
    
    try {
      const updatedFormula = await productFormulaRepository.removeFormulaComponent(formulaId, componentId, req);
      
      res.json(updatedResponse(updatedFormula, 'Formula component removed successfully'));
    } catch (error: unknown) {
      if ((error as any)?.code === ERRORS.FORMULA_COMPONENT_NOT_FOUND?.code) {
        throw ERRORS.FORMULA_COMPONENT_NOT_FOUND;
      } else {
        throw ERRORS.COMPONENT_REMOVAL_FAILED;
      }
    }
  } catch (error: unknown) {
    logger.warn('removeFormulaComponent error:', error as any);
    next(error);
  }
};
