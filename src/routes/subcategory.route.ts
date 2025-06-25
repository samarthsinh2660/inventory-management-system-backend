import express from 'express';
import {getAllSubcategories, getSubcategoryById, createSubcategory, updateSubcategory, deleteSubcategory    } from '../controllers/subcategory.controller.ts';
import { authenticate, requireMaster } from '../middleware/auth.middleware.ts';

const router = express.Router();

// Apply authentication to all subcategory routes
router.use(authenticate);

// Get all subcategories
router.get('/', getAllSubcategories);

// Get subcategory by ID
router.get('/:id', getSubcategoryById);

// Create a new subcategory (master only)
router.post('/', requireMaster, createSubcategory);

// Update subcategory (master only)
router.put('/:id', requireMaster, updateSubcategory);

// Delete subcategory (master only)
router.delete('/:id', requireMaster, deleteSubcategory);

export default router;
