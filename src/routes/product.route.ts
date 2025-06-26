import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  searchProducts
} from '../controllers/product.controller.ts';
import { authenticate, requireMaster } from '../middleware/auth.middleware.ts';

const productRouter = Router();

// Apply authentication to all product routes
productRouter.use(authenticate);

// Search products with filters
productRouter.get('/search', searchProducts);

// Get products by category (raw, semi, finished)
productRouter.get('/category/:category', getProductsByCategory);

// Get all products
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