import express from 'express';
import {getAllFormulas, getFormulaByProductId, addFormulaComponent, updateFormulaComponent, deleteFormulaComponent, clearProductFormula    } from '../controllers/productFormula.controller.ts';
import { authenticate, requireMaster } from '../middleware/auth.middleware.ts';

const router = express.Router();

// Apply authentication to all product formula routes
router.use(authenticate);

// Get all formulas
router.get('/', getAllFormulas);

// Get formula components for a specific product
router.get('/product/:productId', getFormulaByProductId);

// Add component to product formula (master only)
router.post('/', requireMaster, addFormulaComponent);

// Update formula component quantity (master only)
router.put('/:id', requireMaster, updateFormulaComponent);

// Delete formula component (master only)
router.delete('/:id', requireMaster, deleteFormulaComponent);

// Clear all components for a product (clear formula) (master only)
router.delete('/product/:productId', requireMaster, clearProductFormula);

export default router;
