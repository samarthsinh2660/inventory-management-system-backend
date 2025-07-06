import { Request, Response, NextFunction } from 'express';
import { locationRepository } from '../repositories/location.repository.ts';
import { ERRORS } from '../utils/error.ts';
import { successResponse, listResponse, createdResponse, updatedResponse, deletedResponse } from '../utils/response.ts';
import { LocationCreateParams, LocationUpdateParams } from '../models/locations.model.ts';

/**
 * Get all locations
 */
export const getAllLocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const locations = await locationRepository.getAllLocations();
    res.json(listResponse(locations, 'Locations retrieved successfully'));
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Get location by ID
 */
export const getLocationById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const locationId = parseInt(req.params.id, 10);
    
    if (isNaN(locationId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    const location = await locationRepository.findById(locationId);
    
    if (!location) {
      throw ERRORS.LOCATION_NOT_FOUND;
    }
    
    res.json(successResponse(location, 'Location retrieved successfully'));
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Create a new location
 */
export const createLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, address, factory_id } = req.body;
    
    // Basic validation
    if (!name) {
      throw ERRORS.LOCATION_NAME_REQUIRED;
    }
    
    // Check for duplicate name
    const existingLocation = await locationRepository.findByName(name);
    if (existingLocation) {
      throw ERRORS.DUPLICATE_LOCATION_NAME;
    }
    
    try {
      const locationData: LocationCreateParams = {
        name,
        address,
        factory_id: factory_id === undefined ? 1 : factory_id
      };
      
      const location = await locationRepository.create(locationData);
      
      res.status(201).json(createdResponse(location, 'Location created successfully'));
    } catch (error: unknown) {
      throw ERRORS.LOCATION_CREATION_FAILED;
    }
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Update a location
 */
export const updateLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const locationId = parseInt(req.params.id, 10);
    
    if (isNaN(locationId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    const { name, address, factory_id } = req.body;
    
    // At least one field should be provided for update
    if (!name && address === undefined && factory_id === undefined) {
      throw ERRORS.VALIDATION_ERROR;
    }
    
    // Check if location exists
    const existingLocation = await locationRepository.findById(locationId);
    if (!existingLocation) {
      throw ERRORS.LOCATION_NOT_FOUND;
    }
    
    // Check for duplicate name if name is being changed
    if (name && name !== existingLocation.name) {
      const duplicateLocation = await locationRepository.findByName(name);
      if (duplicateLocation) {
        throw ERRORS.DUPLICATE_LOCATION_NAME;
      }
    }
    
    try {
      const locationData: LocationUpdateParams = {};
      if (name !== undefined) locationData.name = name;
      if (address !== undefined) locationData.address = address;
      if (factory_id !== undefined) locationData.factory_id = factory_id;
      
      const updatedLocation = await locationRepository.update(locationId, locationData);
      
      res.json(updatedResponse(updatedLocation, 'Location updated successfully'));
    } catch (error: unknown) {
      throw ERRORS.LOCATION_UPDATE_FAILED;
    }
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Delete a location
 */
export const deleteLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const locationId = parseInt(req.params.id, 10);
    
    if (isNaN(locationId)) {
      throw ERRORS.INVALID_PARAMS;
    }
    
    // Check if location exists
    const location = await locationRepository.findById(locationId);
    if (!location) {
      throw ERRORS.LOCATION_NOT_FOUND;
    }
    
    try {
      await locationRepository.deleteLocation(locationId);
      res.json(deletedResponse('Location deleted successfully'));
    } catch (error: unknown) {
      // Check if it's because location is in use
      if ((error as Error).message?.includes('in use')) {
        throw ERRORS.LOCATION_IN_USE;
      } else {
        throw ERRORS.LOCATION_DELETION_FAILED;
      }
    }
  } catch (error: unknown) {
    next(error);
  }
};
