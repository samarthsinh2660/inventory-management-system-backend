import express from 'express';
import {getAllLocations, getLocationById, createLocation, updateLocation, deleteLocation    } from '../controllers/location.controller.ts';
import { authenticate, requireMaster } from '../middleware/auth.middleware.ts';


const router = express.Router();

// Apply authentication to all location routes
router.use(authenticate);

// Get all locations
router.get('/', getAllLocations);

// Get location by ID
router.get('/:id', getLocationById);

// Create a new location (master only)
router.post('/', requireMaster, createLocation);

// Update location (master only)
router.put('/:id', requireMaster, updateLocation);

// Delete location (master only)
router.delete('/:id', requireMaster, deleteLocation);

export default router;
