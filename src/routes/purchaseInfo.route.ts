import { Router } from 'express';
import {
  getAllPurchaseInfos,
  getPurchaseInfoById,
  getProductsByPurchaseInfo,
  createPurchaseInfo,
  updatePurchaseInfo,
  deletePurchaseInfo
} from '../controllers/purchaseInfo.controller.ts';
import { authenticate, requireMaster } from '../middleware/auth.middleware.ts';

const purchaseInfoRouter = Router();

// Apply authentication to all purchase info routes
purchaseInfoRouter.use(authenticate);

// Get all purchase infos (with optional search query param)
purchaseInfoRouter.get('/', getAllPurchaseInfos);

// Get purchase info by ID
purchaseInfoRouter.get('/:id', getPurchaseInfoById);

// Get products associated with a purchase info
purchaseInfoRouter.get('/:id/products', getProductsByPurchaseInfo);

// Create a new purchase info (master only)
purchaseInfoRouter.post('/', requireMaster, createPurchaseInfo);

// Update purchase info (master only)
purchaseInfoRouter.put('/:id', requireMaster, updatePurchaseInfo);

// Delete purchase info (master only)
purchaseInfoRouter.delete('/:id', requireMaster, deletePurchaseInfo);

export default purchaseInfoRouter;
