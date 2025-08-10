import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/product.controller.ts';
import { authenticate, requireMaster } from '../middleware/auth.middleware.ts';

const productRouter = Router();

// Apply authentication to all product routes
productRouter.use(authenticate);

// Get all products with optional filters and search
productRouter.get('/', getAllProducts);

// Get product by ID
productRouter.get('/:id', getProductById);

// Create a new product (master only)
productRouter.post('/', requireMaster, createProduct);

// Update product (master only)
productRouter.put('/:id', requireMaster, updateProduct);

// Delete product (master only)
productRouter.delete('/:id', requireMaster, deleteProduct);

export default productRouter;