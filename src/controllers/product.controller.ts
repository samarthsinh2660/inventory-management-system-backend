import { Request, Response, NextFunction } from 'express';
import { productRepository } from '../repositories/product.repository.ts';
import { ERRORS } from '../utils/error.ts';
import { successResponse, listResponse, createdResponse, updatedResponse, deletedResponse } from '../utils/response.ts';
import { ProductCategory, ProductSearchParams, SourceType } from '../models/products.model.ts';

/**
 * Get all products
 */
export const getAllProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const products = await productRepository.getAllProducts();
    res.json(listResponse(products, 'Products retrieved successfully'));
  } catch (error: unknown) {
    next(error);
  }
};

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
 * Get products by category
 */
export const getProductsByCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category } = req.params;
    
    // Validate category is one of the allowed values
    const validCategories = Object.values(ProductCategory);
    if (!validCategories.includes(category as ProductCategory)) {
      throw ERRORS.INVALID_PRODUCT_CATEGORY;
    }
    
    const products = await productRepository.findByCategory(category as ProductCategory);
    
    res.json(listResponse(products, `${category} products retrieved successfully`));
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Create a new product
 */
export const createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, unit, source_type, category, min_stock_threshold, location_id, subcategory_id } = req.body;
    
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
      throw ERRORS.DUPLICATE_PRODUCT_NAME;
    }
    
    try {
      const product = await productRepository.create({
        name,
        unit,
        source_type,
        category,
        min_stock_threshold: min_stock_threshold || null,
        location_id,
        subcategory_id
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
    
    const { name, unit, source_type, category, min_stock_threshold, location_id, subcategory_id } = req.body;
    
    // At least one field should be provided for update
    if (!name && !unit && !source_type && !category && min_stock_threshold === undefined && !location_id && !subcategory_id) {
      throw ERRORS.VALIDATION_ERROR;
    }
    
    // Check if product exists
    const existingProduct = await productRepository.findById(productId);
    if (!existingProduct) {
      throw ERRORS.PRODUCT_NOT_FOUND;
    }
    
    // Validate category if provided
    if (category) {
      const validCategories = Object.values(ProductCategory);
      if (!validCategories.includes(category)) {
        throw ERRORS.INVALID_PRODUCT_CATEGORY;
      }
    }
    
    // Validate source_type if provided
    if (source_type) {
      const validSourceTypes = Object.values(SourceType);
      if (!validSourceTypes.includes(source_type)) {
        throw ERRORS.INVALID_PRODUCT_SOURCE_TYPE;
      }
    }
    
    // Check for duplicate name if name is being changed
    if (name && name !== existingProduct.name) {
      const duplicateProduct = await productRepository.findByName(name);
      if (duplicateProduct) {
        throw ERRORS.DUPLICATE_PRODUCT_NAME;
      }
    }
    
    try {
      const updatedProduct = await productRepository.update(productId, {
        name,
        unit,
        source_type,
        category,
        min_stock_threshold,
        location_id,
        subcategory_id
      });
      
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
      await productRepository.deleteProduct(productId);
      res.json(deletedResponse('Product deleted successfully'));
    } catch (error: unknown) {
      throw ERRORS.PRODUCT_DELETION_FAILED;
    }
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Search products with filters
 */
export const searchProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      search,
      category,
      subcategory_id,
      location_id,
      source_type,
      formula_id,
      component_id,
      is_parent,
      is_component,
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
    
    // Parse boolean parameters
    if (is_parent !== undefined) {
      parsedFilters.is_parent = is_parent === 'true';
    }
    
    if (is_component !== undefined) {
      parsedFilters.is_component = is_component === 'true';
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
    
    const result = await productRepository.searchProducts(parsedFilters);
    
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
