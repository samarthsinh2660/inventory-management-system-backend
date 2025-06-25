import { Request, Response, NextFunction } from 'express';
import { productFormulaRepository } from '../repositories/productFormula.repository.ts';
import { productRepository } from '../repositories/product.repository.ts';
import { ERRORS } from '../utils/error.ts';
import { successResponse, listResponse, createdResponse, updatedResponse, deletedResponse } from '../utils/response.ts';
import { ProductCategory } from '../models/products.model.ts';
import { ProductFormulaCreateParams, ProductFormulaUpdateParams } from '../models/productFormula.model.ts';

/**
 * Get all product formulas
 */
export const getAllFormulas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const formulas = await productFormulaRepository.getAllFormulas();
    res.json(listResponse(formulas, 'Product formulas retrieved successfully'));
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Get formula components for a specific product
 */
export const getFormulaByProductId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const productId = parseInt(req.params.productId, 10);
    
    if (isNaN(productId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    // Check if product exists
    const product = await productRepository.findById(productId);
    if (!product) {
      throw ERRORS.PRODUCT_NOT_FOUND;
    }
    
    // Get formula components
    const formulaComponents = await productFormulaRepository.getByProductId(productId);
    
    res.json(listResponse(formulaComponents, 'Product formula retrieved successfully'));
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Add component to product formula
 */
export const addFormulaComponent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { product_id, component_id, quantity } = req.body;
    
    // Basic validation
    if (!product_id) {
      throw ERRORS.PARENT_PRODUCT_REQUIRED;
    }
    
    if (!component_id) {
      throw ERRORS.COMPONENT_PRODUCT_REQUIRED;
    }
    
    if (quantity === undefined || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      throw ERRORS.FORMULA_QUANTITY_INVALID;
    }
    
    // Check if parent product exists and verify it's not a raw material
    const parentProduct = await productRepository.findById(Number(product_id));
    if (!parentProduct) {
      throw ERRORS.PRODUCT_NOT_FOUND;
    }
    
    if (parentProduct.category === ProductCategory.RAW) {
      throw ERRORS.INVALID_FORMULA_FOR_RAW_MATERIAL;
    }
    
    // Check if component product exists
    const componentProduct = await productRepository.findById(Number(component_id));
    if (!componentProduct) {
      throw ERRORS.PRODUCT_NOT_FOUND;
    }
    
    // Check if component already exists in the formula
    const existingComponents = await productFormulaRepository.getByProductId(Number(product_id));
    const componentExists = existingComponents.some(comp => comp.component_id === Number(component_id));
    if (componentExists) {
      throw ERRORS.COMPONENT_ALREADY_EXISTS;
    }
    
    try {
      // Create formula component
      const formulaData: ProductFormulaCreateParams = {
        product_id: Number(product_id),
        component_id: Number(component_id),
        quantity: Number(quantity)
      };
      
      const formulaComponent = await productFormulaRepository.addComponent(formulaData);
      
      res.status(201).json(createdResponse(formulaComponent, 'Formula component added successfully'));
    } catch (error: unknown) {
      if ((error as Error).message?.includes('circular dependency')) {
        throw ERRORS.CIRCULAR_DEPENDENCY_ERROR;
      } else if ((error as Error).message?.includes('self reference')) {
        throw ERRORS.SELF_REFERENCE_ERROR;
      } else {
        throw ERRORS.FORMULA_CREATION_FAILED;
      }
    }
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Update formula component quantity
 */
export const updateFormulaComponent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const componentId = parseInt(req.params.id, 10);
    const { quantity } = req.body;
    
    if (isNaN(componentId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    if (quantity === undefined || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      throw ERRORS.FORMULA_QUANTITY_INVALID;
    }
    
    // Check if formula component exists
    const existingComponent = await productFormulaRepository.findById(componentId);
    if (!existingComponent) {
      throw ERRORS.FORMULA_COMPONENT_NOT_FOUND;
    }
    
    try {
      const updateData: ProductFormulaUpdateParams = {
        quantity: Number(quantity)
      };
      
      const updatedComponent = await productFormulaRepository.updateComponent(componentId, updateData);
      
      res.json(updatedResponse(updatedComponent, 'Formula component updated successfully'));
    } catch (error: unknown) {
      throw ERRORS.FORMULA_UPDATE_FAILED;
    }
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Delete formula component
 */
export const deleteFormulaComponent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const formulaId = parseInt(req.params.id, 10);
    
    if (isNaN(formulaId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    // Check if formula component exists
    const formulaComponent = await productFormulaRepository.findById(formulaId);
    if (!formulaComponent) {
      throw ERRORS.FORMULA_COMPONENT_NOT_FOUND;
    }
    
    try {
      await productFormulaRepository.deleteComponent(formulaId);
      
      res.json(deletedResponse('Formula component deleted successfully'));
    } catch (error: unknown) {
      throw ERRORS.FORMULA_DELETION_FAILED;
    }
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Clear all components for a product (clear formula)
 */
export const clearProductFormula = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const productId = parseInt(req.params.productId, 10);
    
    if (isNaN(productId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    // Check if product exists
    const product = await productRepository.findById(productId);
    if (!product) {
      throw ERRORS.PRODUCT_NOT_FOUND;
    }
    
    try {
      await productFormulaRepository.clearProductFormula(productId);
      
      res.json(successResponse(null, 'Product formula cleared successfully'));
    } catch (error: unknown) {
      throw ERRORS.FORMULA_DELETION_FAILED;
    }
  } catch (error: unknown) {
    next(error);
  }
};
