import { Router } from 'express';
import {getAllFormulas, getFormulaByProductId, addFormulaComponent, updateFormulaComponent, deleteFormulaComponent, clearProductFormula    } from '../controllers/productFormula.controller.ts';
import { authenticate, requireMaster } from '../middleware/auth.middleware.ts';

const productFormulaRouter = Router();

// Apply authentication to all product formula routes
productFormulaRouter.use(authenticate);

// Get all formulas
productFormulaRouter.get('/', getAllFormulas);

// Get formula components for a specific product
productFormulaRouter.get('/product/:productId', getFormulaByProductId);

// Add component to product formula (master only)
productFormulaRouter.post('/', requireMaster, addFormulaComponent);

// Update formula component quantity (master only)
productFormulaRouter.put('/:id', requireMaster, updateFormulaComponent);

// Delete formula component (master only)
productFormulaRouter.delete('/:id', requireMaster, deleteFormulaComponent);

// Clear all components for a product (clear formula) (master only)
productFormulaRouter.delete('/product/:productId', requireMaster, clearProductFormula);

export default productFormulaRouter;
