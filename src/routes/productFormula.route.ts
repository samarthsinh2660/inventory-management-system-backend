import { Router } from 'express';
import {
  getAllFormulas,
  getFormulaById,
  getProductsByFormulaId,
  createFormula,
  updateFormula,
  deleteFormula,
  updateFormulaComponent,
  removeFormulaComponent
} from '../controllers/productFormula.controller.ts';
import { authenticate, requireMaster } from '../middleware/auth.middleware.ts';

const productFormulaRouter = Router();

// Apply authentication to all product formula routes
productFormulaRouter.use(authenticate);

// Get all formulas
productFormulaRouter.get('/', getAllFormulas);

// Get a specific formula by ID
productFormulaRouter.get('/:id', getFormulaById);

// Get products using a specific formula
productFormulaRouter.get('/:id/products', getProductsByFormulaId);

// Create a new formula (master only)
productFormulaRouter.post('/', requireMaster, createFormula);

// Update a formula (master only)
productFormulaRouter.put('/:id', requireMaster, updateFormula);

// Delete a formula (master only)
productFormulaRouter.delete('/:id', requireMaster, deleteFormula);

// Add or update a component in a formula (master only)
productFormulaRouter.put('/:id/component', requireMaster, updateFormulaComponent);

// Remove a component from a formula (master only)
productFormulaRouter.delete('/:formulaId/component/:componentId', requireMaster, removeFormulaComponent);

export default productFormulaRouter;
