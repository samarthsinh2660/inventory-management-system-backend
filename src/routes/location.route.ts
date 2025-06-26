import { Router } from 'express';
import {
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation
} from '../controllers/location.controller.ts';
import { authenticate, requireMaster } from '../middleware/auth.middleware.ts';

const locationRouter = Router();

// Apply authentication to all location routes
locationRouter.use(authenticate);

// Get all locations
locationRouter.get('/', getAllLocations);

// Get location by ID
locationRouter.get('/:id', getLocationById);

// Create a new location (master only)
locationRouter.post('/', requireMaster, createLocation);

// Update location (master only)
locationRouter.put('/:id', requireMaster, updateLocation);

// Delete location (master only)
locationRouter.delete('/:id', requireMaster, deleteLocation);

export default locationRouter;
