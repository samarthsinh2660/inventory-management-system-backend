import express from 'express';
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

const router = express.Router();

// Apply authentication to all product routes
router.use(authenticate);

// Search products with filters
router.get('/search', searchProducts);

// Get products by category (raw, semi, finished)
router.get('/category/:category', getProductsByCategory);

// Get all products
router.get('/', getAllProducts);

// Get product by ID
router.get('/:id', getProductById);

// Create a new product (master only)
router.post('/', requireMaster, createProduct);

// Update product (master only)
router.put('/:id', requireMaster, updateProduct);

// Delete product (master only)
router.delete('/:id', requireMaster, deleteProduct);

export default router;
