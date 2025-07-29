import { Router } from 'express';
import {
  getAllSubcategories,
  getSubcategoryById,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory
} from '../controllers/subcategory.controller.ts';
import { authenticate, requireMaster } from '../middleware/auth.middleware.ts';

const subcategoryRouter = Router();

// Apply authentication to all subcategory routes
subcategoryRouter.use(authenticate);

// Get all subcategories (with optional category query param)
subcategoryRouter.get('/', getAllSubcategories);

// Get subcategory by ID
subcategoryRouter.get('/:id', getSubcategoryById);

// Create a new subcategory (master only)
subcategoryRouter.post('/', requireMaster, createSubcategory);

// Update subcategory (master only)
subcategoryRouter.put('/:id', requireMaster, updateSubcategory);

// Delete subcategory (master only)
subcategoryRouter.delete('/:id', requireMaster, deleteSubcategory);

export default subcategoryRouter;  