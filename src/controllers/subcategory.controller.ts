import { Request, Response, NextFunction } from 'express';
import { subcategoryRepository } from '../repositories/subcategory.repository.ts';
import { ERRORS } from '../utils/error.ts';
import { successResponse, listResponse, createdResponse, updatedResponse, deletedResponse } from '../utils/response.ts';
import { SubcategoryCreateParams, SubcategoryUpdateParams } from '../models/subCategories.model.ts';

/**
 * Get all subcategories
 */
export const getAllSubcategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const subcategories = await subcategoryRepository.getAllSubcategories();
    res.json(listResponse(subcategories, 'Subcategories retrieved successfully'));
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Get subcategory by ID
 */
export const getSubcategoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const subcategoryId = parseInt(req.params.id, 10);
    
    if (isNaN(subcategoryId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    const subcategory = await subcategoryRepository.findById(subcategoryId);
    
    if (!subcategory) {
      throw ERRORS.SUBCATEGORY_NOT_FOUND;
    }
    
    res.json(successResponse(subcategory, 'Subcategory retrieved successfully'));
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Create a new subcategory
 */
export const createSubcategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description } = req.body;
    
    // Basic validation
    if (!name) {
      throw ERRORS.SUBCATEGORY_NAME_REQUIRED;
    }
    
    // Check for duplicate name
    const existingSubcategory = await subcategoryRepository.findByName(name);
    if (existingSubcategory) {
      throw ERRORS.DUPLICATE_SUBCATEGORY_NAME;
    }
    
    try {
      const subcategoryData: SubcategoryCreateParams = { 
        name,
        description 
      };
      const subcategory = await subcategoryRepository.create(subcategoryData);
      
      res.status(201).json(createdResponse(subcategory, 'Subcategory created successfully'));
    } catch (error: unknown) {
      throw ERRORS.SUBCATEGORY_CREATION_FAILED;
    }
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Update a subcategory
 */
export const updateSubcategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const subcategoryId = parseInt(req.params.id, 10);
    
    if (isNaN(subcategoryId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    const { name, description } = req.body;
    
    // At least one field should be provided for update
    if (!name && description === undefined) {
      throw ERRORS.VALIDATION_ERROR;
    }
    
    // Check if subcategory exists
    const existingSubcategory = await subcategoryRepository.findById(subcategoryId);
    if (!existingSubcategory) {
      throw ERRORS.SUBCATEGORY_NOT_FOUND;
    }
    
    // Check for duplicate name if name is being changed
    if (name && name !== existingSubcategory.name) {
      const duplicateSubcategory = await subcategoryRepository.findByName(name);
      if (duplicateSubcategory) {
        throw ERRORS.DUPLICATE_SUBCATEGORY_NAME;
      }
    }
    
    try {
      const subcategoryData: SubcategoryUpdateParams = {};
      if (name !== undefined) subcategoryData.name = name;
      if (description !== undefined) subcategoryData.description = description;
      
      const updatedSubcategory = await subcategoryRepository.update(subcategoryId, subcategoryData);
      
      res.json(updatedResponse(updatedSubcategory, 'Subcategory updated successfully'));
    } catch (error: unknown) {
      throw ERRORS.SUBCATEGORY_UPDATE_FAILED;
    }
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Delete a subcategory
 */
export const deleteSubcategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const subcategoryId = parseInt(req.params.id, 10);
    
    if (isNaN(subcategoryId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    // Check if subcategory exists
    const subcategory = await subcategoryRepository.findById(subcategoryId);
    if (!subcategory) {
      throw ERRORS.SUBCATEGORY_NOT_FOUND;
    }
    
    try {
      await subcategoryRepository.deleteSubcategory(subcategoryId);
      
      res.json(deletedResponse('Subcategory deleted successfully'));
    } catch (error: unknown) {
      // Check if it's because subcategory is in use
      if ((error as Error).message?.includes('in use')) {
        throw ERRORS.SUBCATEGORY_IN_USE;
      } else {
        throw ERRORS.SUBCATEGORY_DELETION_FAILED;
      }
    }
  } catch (error: unknown) {
    next(error);
  }
};
