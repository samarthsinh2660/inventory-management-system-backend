import { Request, Response, NextFunction } from 'express';
import { purchaseInfoRepository } from '../repositories/purchaseInfo.repository.ts';
import { ERRORS } from '../utils/error.ts';
import { successResponse, listResponse, createdResponse, updatedResponse, deletedResponse } from '../utils/response.ts';
import { PurchaseInfoCreateParams, PurchaseInfoUpdateParams } from '../models/purchaseInfo.model.ts';

import createLogger from '../utils/logger.ts';

const logger = createLogger('@purchaseInfoController');

/**
 * Get all purchase infos (with optional search)
 */
export const getAllPurchaseInfos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search } = req.query;
    
    let purchaseInfos;
    
    if (search) {
      purchaseInfos = await purchaseInfoRepository.searchPurchaseInfos(search as string, req);
    } else {
      purchaseInfos = await purchaseInfoRepository.getAllPurchaseInfos(req);
    }
    
    const message = search 
      ? `Purchase infos matching '${search}' retrieved successfully`
      : 'Purchase infos retrieved successfully';
    
    res.json(listResponse(purchaseInfos, message));
  } catch (error: unknown) {
    logger.warn('getAllPurchaseInfos error:', error as any);
    next(error);
  }
};

/**
 * Get purchase info by ID
 */
export const getPurchaseInfoById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const purchaseInfoId = parseInt(req.params.id, 10);
    
    if (isNaN(purchaseInfoId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    const purchaseInfo = await purchaseInfoRepository.findById(purchaseInfoId, req);
    
    if (!purchaseInfo) {
      throw ERRORS.RESOURCE_NOT_FOUND;
    }
    
    res.json(successResponse(purchaseInfo, 'Purchase info retrieved successfully'));
  } catch (error: unknown) {
    logger.warn('getPurchaseInfoById error:', error as any);
    next(error);
  }
};

/**
 * Get products associated with a purchase info
 */
export const getProductsByPurchaseInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const purchaseInfoId = parseInt(req.params.id, 10);
    
    if (isNaN(purchaseInfoId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    // Check if purchase info exists
    const purchaseInfo = await purchaseInfoRepository.findById(purchaseInfoId, req);
    if (!purchaseInfo) {
      throw ERRORS.RESOURCE_NOT_FOUND;
    }
    
    const products = await purchaseInfoRepository.getProductsByPurchaseInfo(purchaseInfoId, req);
    
    res.json(listResponse(products, `Products for purchase info '${purchaseInfo.business_name}' retrieved successfully`));
  } catch (error: unknown) {
    logger.warn('getProductsByPurchaseInfo error:', error as any);
    next(error);
  }
};

/**
 * Create a new purchase info
 */
export const createPurchaseInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { business_name, address, phone_number, email, gst_number } = req.body;
    
    // Basic validation
    if (!business_name) {
      throw ERRORS.VALIDATION_ERROR;
    }
    
    // Email validation if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw ERRORS.VALIDATION_ERROR;
    }
    
    // GST number validation if provided (basic format check)
    if (gst_number && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst_number)) {
      throw ERRORS.VALIDATION_ERROR;
    }
    
    // Check for duplicate business name
    const existingPurchaseInfo = await purchaseInfoRepository.findByBusinessName(business_name, req);
    if (existingPurchaseInfo) {
      throw ERRORS.DUPLICATE_RESOURCE;
    }
    
    try {
      const purchaseInfoData: PurchaseInfoCreateParams = { 
        business_name,
        address,
        phone_number,
        email,
        gst_number
      };
      const purchaseInfo = await purchaseInfoRepository.create(purchaseInfoData, req);
      
      res.status(201).json(createdResponse(purchaseInfo, 'Purchase info created successfully'));
    } catch (error: unknown) {
      throw ERRORS.DATABASE_ERROR;
    }
  } catch (error: unknown) {
    logger.warn('createPurchaseInfo error:', error as any);
    next(error);
  }
};

/**
 * Update a purchase info
 */
export const updatePurchaseInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const purchaseInfoId = parseInt(req.params.id, 10);
    
    if (isNaN(purchaseInfoId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    const { business_name, address, phone_number, email, gst_number } = req.body;
    
    // At least one field should be provided for update
    if (!business_name && address === undefined && phone_number === undefined && 
        email === undefined && gst_number === undefined) {
      throw ERRORS.VALIDATION_ERROR;
    }
    
    // Email validation if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw ERRORS.VALIDATION_ERROR;
    }
    
    // GST number validation if provided (basic format check)
    if (gst_number && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst_number)) {
      throw ERRORS.VALIDATION_ERROR;
    }
    
    // Check if purchase info exists
    const existingPurchaseInfo = await purchaseInfoRepository.findById(purchaseInfoId, req);
    if (!existingPurchaseInfo) {
      throw ERRORS.RESOURCE_NOT_FOUND;
    }
    
    // Check for duplicate business name if name is being changed
    if (business_name && business_name !== existingPurchaseInfo.business_name) {
      const duplicatePurchaseInfo = await purchaseInfoRepository.findByBusinessName(business_name, req);
      if (duplicatePurchaseInfo) {
        throw ERRORS.DUPLICATE_RESOURCE;
      }
    }
    
    try {
      const purchaseInfoData: PurchaseInfoUpdateParams = {};
      if (business_name !== undefined) purchaseInfoData.business_name = business_name;
      if (address !== undefined) purchaseInfoData.address = address;
      if (phone_number !== undefined) purchaseInfoData.phone_number = phone_number;
      if (email !== undefined) purchaseInfoData.email = email;
      if (gst_number !== undefined) purchaseInfoData.gst_number = gst_number;
      
      const updatedPurchaseInfo = await purchaseInfoRepository.update(purchaseInfoId, purchaseInfoData, req);
      
      res.json(updatedResponse(updatedPurchaseInfo, 'Purchase info updated successfully'));
    } catch (error: unknown) {
      throw ERRORS.DATABASE_ERROR;
    }
  } catch (error: unknown) {
    logger.warn('updatePurchaseInfo error:', error as any);
    next(error);
  }
};

/**
 * Delete a purchase info
 */
export const deletePurchaseInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const purchaseInfoId = parseInt(req.params.id, 10);
    
    if (isNaN(purchaseInfoId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    // Check if purchase info exists
    const purchaseInfo = await purchaseInfoRepository.findById(purchaseInfoId, req);
    if (!purchaseInfo) {
      throw ERRORS.RESOURCE_NOT_FOUND;
    }
    
    try {
      await purchaseInfoRepository.deletePurchaseInfo(purchaseInfoId, req);
      
      res.json(deletedResponse('Purchase info deleted successfully'));
    } catch (error: unknown) {
      // Check if it's because purchase info is in use
      if ((error as Error).message?.includes('in use')) {
        throw ERRORS.RESOURCE_IN_USE;
      } else {
        throw ERRORS.DATABASE_ERROR;
      }
    }
  } catch (error: unknown) {
    logger.warn('deletePurchaseInfo error:', error as any);
    next(error);
  }
};
