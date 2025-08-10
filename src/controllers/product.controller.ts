import { Request, Response, NextFunction } from 'express';
import { productRepository } from '../repositories/product.repository.ts';
import { productFormulaRepository } from '../repositories/productFormula.repository.ts';
import { ERRORS } from '../utils/error.ts';
import { successResponse, listResponse, createdResponse, updatedResponse, deletedResponse } from '../utils/response.ts';
import { ProductCategory, ProductSearchParams, SourceType } from '../models/products.model.ts';



/**
 * Get product by ID
 */
export const getProductById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const productId = parseInt(req.params.id, 10);
    
    if (isNaN(productId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    const product = await productRepository.findById(productId);
    
    if (!product) {
      throw ERRORS.PRODUCT_NOT_FOUND;
    }
    
    res.json(successResponse(product, 'Product retrieved successfully'));
  } catch (error: unknown) {
    next(error);
  }
};



/**
 * Create a new product
 */
export const createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { 
      name, 
      unit, 
      source_type, 
      category, 
      min_stock_threshold, 
      location_id, 
      subcategory_id, 
      price,
      product_formula_id,
      purchase_info_id 
    } = req.body;
    
    // Basic validation
    if (!name) {
      throw ERRORS.PRODUCT_NAME_REQUIRED;
    }
    
    if (!unit) {
      throw ERRORS.PRODUCT_NAME_REQUIRED; // Using closest error code until PRODUCT_UNIT_REQUIRED is added
    }
    
    if (!category) {
      throw ERRORS.PRODUCT_CATEGORY_REQUIRED;
    }
    
    if (!source_type) {
      throw ERRORS.PRODUCT_SOURCE_TYPE_REQUIRED;
    }
    
    if (!subcategory_id) {
      throw ERRORS.PRODUCT_SUBCATEGORY_REQUIRED;
    }
    
    if (!location_id) {
      throw ERRORS.PRODUCT_LOCATION_REQUIRED;
    }
    
    // Validate category
    const validCategories = Object.values(ProductCategory);
    if (!validCategories.includes(category)) {
      throw ERRORS.INVALID_PRODUCT_CATEGORY;
    }
    
    // Validate source_type
    const validSourceTypes = Object.values(SourceType);
    if (!validSourceTypes.includes(source_type)) {
      throw ERRORS.INVALID_PRODUCT_SOURCE_TYPE;
    }
    
    // Check for duplicate name
    const existingProduct = await productRepository.findByName(name);
    if (existingProduct) {
      throw ERRORS.PRODUCT_NAME_EXISTS;
    }

    // If a formula ID is provided (and not 0), verify that the formula exists
    if (product_formula_id && product_formula_id !== 0) {
      const formula = await productFormulaRepository.findById(Number(product_formula_id));
      if (!formula) {
        throw ERRORS.PRODUCT_FORMULA_NOT_FOUND;
      }

      // Raw materials cannot have formulas
      if (category === ProductCategory.RAW) {
        throw ERRORS.INVALID_FORMULA_FOR_RAW_MATERIAL;
      }
    }
    
    try {
      const product = await productRepository.create({
        name,
        unit,
        source_type,
        category,
        min_stock_threshold: min_stock_threshold || null,
        location_id,
        subcategory_id,
        price,
        product_formula_id: (product_formula_id && product_formula_id !== 0) ? Number(product_formula_id) : null,
        purchase_info_id: purchase_info_id ? Number(purchase_info_id) : null
      });
      
      res.status(201).json(createdResponse(product, 'Product created successfully'));
    } catch (error: unknown) {
      throw ERRORS.PRODUCT_CREATION_FAILED;
    }
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Update a product
 */
export const updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const productId = parseInt(req.params.id, 10);
    
    if (isNaN(productId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    const { 
      name, 
      unit, 
      source_type, 
      category, 
      min_stock_threshold, 
      location_id, 
      subcategory_id, 
      price,
      product_formula_id,
      purchase_info_id 
    } = req.body;
    
    // Check if product exists
    const existingProduct = await productRepository.findById(productId);
    if (!existingProduct) {
      throw ERRORS.PRODUCT_NOT_FOUND;
    }
    
    // Prepare update data
    const updateData: Record<string, any> = {};
    
    // Handle name update and check for duplicates
    if (name !== undefined && name !== existingProduct.name) {
      const duplicateProduct = await productRepository.findByName(name);
      if (duplicateProduct && duplicateProduct.id !== productId) {
        throw ERRORS.PRODUCT_NAME_EXISTS;
      }
      updateData.name = name;
    }
    
    // Handle other basic fields
    if (unit !== undefined) updateData.unit = unit;
    if (price !== undefined) updateData.price = price;
    
    // Handle category update
    if (category !== undefined) {
      const validCategories = Object.values(ProductCategory);
      if (!validCategories.includes(category)) {
        throw ERRORS.INVALID_PRODUCT_CATEGORY;
      }
      updateData.category = category;
    }
    
    // Handle source_type update
    if (source_type !== undefined) {
      const validSourceTypes = Object.values(SourceType);
      if (!validSourceTypes.includes(source_type)) {
        throw ERRORS.INVALID_PRODUCT_SOURCE_TYPE;
      }
      updateData.source_type = source_type;
    }
    
    // Handle numeric fields
    if (min_stock_threshold !== undefined) {
      updateData.min_stock_threshold = min_stock_threshold === null ? null : Number(min_stock_threshold);
    }
    
    if (location_id !== undefined) updateData.location_id = Number(location_id);
    if (subcategory_id !== undefined) updateData.subcategory_id = Number(subcategory_id);

    // Handle product_formula_id update
    if (product_formula_id !== undefined) {
      // If setting to null or 0, that's allowed (means no formula)
      if (product_formula_id === null || product_formula_id === 0) {
        updateData.product_formula_id = null;
      } else {
        // Verify the formula exists
        const formula = await productFormulaRepository.findById(Number(product_formula_id));
        if (!formula) {
          throw ERRORS.PRODUCT_FORMULA_NOT_FOUND;
        }

        // Raw materials cannot have formulas
        const categoryToCheck = category !== undefined ? category : existingProduct.category;
        if (categoryToCheck === ProductCategory.RAW) {
          throw ERRORS.INVALID_FORMULA_FOR_RAW_MATERIAL;
        }

        updateData.product_formula_id = Number(product_formula_id);
      }
    }
    
    // Handle purchase_info_id update
    if (purchase_info_id !== undefined) {
      updateData.purchase_info_id = purchase_info_id ? Number(purchase_info_id) : null;
    }
    
    try {
      const updatedProduct = await productRepository.update(productId, updateData);
      
      res.json(updatedResponse(updatedProduct, 'Product updated successfully'));
    } catch (error: unknown) {
      throw ERRORS.PRODUCT_UPDATE_FAILED;
    }
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Delete a product
 */
export const deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const productId = parseInt(req.params.id, 10);
    
    if (isNaN(productId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    // Check if product exists
    const product = await productRepository.findById(productId);
    if (!product) {
      throw ERRORS.PRODUCT_NOT_FOUND;
    }
    
    try {
      await productRepository.delete(productId);
      res.json(deletedResponse('Product deleted successfully'));
    } catch (error: unknown) {
      // Pass through known errors directly
      if (error === ERRORS.PRODUCT_NOT_FOUND || 
          error === ERRORS.PRODUCT_IN_USE || 
          error === ERRORS.PRODUCT_HAS_FORMULA ||
          (error as any)?.code === ERRORS.PRODUCT_IN_USE.code ||
          (error as any)?.code === ERRORS.PRODUCT_HAS_FORMULA.code) {
        throw error;
      }
      throw ERRORS.PRODUCT_DELETION_FAILED;
    }
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Get all products with optional filters and search
 */
export const getAllProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      search,
      category,
      subcategory_id,
      location_id,
      source_type,
      formula_id,
      component_id,
      purchase_info_id,
      page,
      limit
    } = req.query;

    // Type conversions for numeric parameters
    const parsedFilters: ProductSearchParams = {};
    
    if (search) parsedFilters.search = search as string;
    
    if (category) {
      // Validate category
      const validCategories = Object.values(ProductCategory);
      if (!validCategories.includes(category as ProductCategory)) {
        throw ERRORS.INVALID_PRODUCT_CATEGORY;
      }
      parsedFilters.category = category as ProductCategory;
    }
    
    if (subcategory_id) {
      const parsedSubcategoryId = parseInt(subcategory_id as string, 10);
      if (isNaN(parsedSubcategoryId)) {
        throw ERRORS.INVALID_PARAMS;
      }
      parsedFilters.subcategory_id = parsedSubcategoryId;
    }
    
    if (location_id) {
      const parsedLocationId = parseInt(location_id as string, 10);
      if (isNaN(parsedLocationId)) {
        throw ERRORS.INVALID_PARAMS;
      }
      parsedFilters.location_id = parsedLocationId;
    }
    
    if (source_type) {
      // Validate source_type
      const validSourceTypes = Object.values(SourceType);
      if (!validSourceTypes.includes(source_type as SourceType)) {
        throw ERRORS.INVALID_PRODUCT_SOURCE_TYPE;
      }
      parsedFilters.source_type = source_type as SourceType;
    }
    
    // Parse formula-related parameters
    if (formula_id) {
      const parsedFormulaId = parseInt(formula_id as string, 10);
      if (isNaN(parsedFormulaId)) {
        throw ERRORS.INVALID_PARAMS;
      }
      parsedFilters.formula_id = parsedFormulaId;
    }
    
    if (component_id) {
      const parsedComponentId = parseInt(component_id as string, 10);
      if (isNaN(parsedComponentId)) {
        throw ERRORS.INVALID_PARAMS;
      }
      parsedFilters.component_id = parsedComponentId;
    }
    

    
    // Parse purchase_info_id parameter
    if (purchase_info_id !== undefined) {
      if (purchase_info_id === 'null' || purchase_info_id === '') {
        parsedFilters.purchase_info_id = null;
      } else {
        const parsedPurchaseInfoId = parseInt(purchase_info_id as string, 10);
        if (isNaN(parsedPurchaseInfoId)) {
          throw ERRORS.INVALID_PARAMS;
        }
        parsedFilters.purchase_info_id = parsedPurchaseInfoId;
      }
    }
    
    // Handle pagination
    if (page) {
      const parsedPage = parseInt(page as string, 10);
      if (isNaN(parsedPage) || parsedPage < 1) {
        throw ERRORS.INVALID_PARAMS;
      }
      parsedFilters.page = parsedPage;
    }
    
    if (limit) {
      const parsedLimit = parseInt(limit as string, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        throw ERRORS.INVALID_PARAMS;
      }
      parsedFilters.limit = parsedLimit;
    }
    
    const result = await productRepository.getAllProducts(parsedFilters);
    
    res.json({
      status: 'success',
      message: 'Products retrieved successfully',
      data: result.products,
      meta: {
        total: result.total,
        page: parsedFilters.page || 1,
        limit: parsedFilters.limit || 20,
        pages: Math.ceil(result.total / (parsedFilters.limit || 20))
      }
    });
  } catch (error: unknown) {
    next(error);
  }
};
