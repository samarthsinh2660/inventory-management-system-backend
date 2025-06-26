import { Router } from 'express';
import {
  getAllEntries,
  getEntryById,
  getProductEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  getBalance
} from '../controllers/inventoryEntry.controller.ts';
import { authenticate, requireMaster } from '../middleware/auth.middleware.ts';

const inventoryEntriesRouter = Router();

// Apply authentication middleware to all inventory entry routes
inventoryEntriesRouter.use(authenticate);

// Get inventory balance (stock levels)
// Both master and employee can view balance
inventoryEntriesRouter.get('/balance', getBalance);

// Get all inventory entries with pagination
// Both master and employee can view entries
inventoryEntriesRouter.get('/', getAllEntries);

// Get inventory entries for a specific product
// Both master and employee can view product's entries
inventoryEntriesRouter.get('/product/:productId', getProductEntries);

// Get a specific inventory entry by ID
// Both master and employee can view entry details
inventoryEntriesRouter.get('/:id', getEntryById);

// Create a new inventory entry
// Both master and employee can create inventory entries
inventoryEntriesRouter.post('/', createEntry);

// Update an existing inventory entry
// Only master can update entries
inventoryEntriesRouter.put('/:id', requireMaster, updateEntry);

// Delete an inventory entry
// Permission check is done in the controller:
// - Employees can only delete their own entries
// - Masters can delete any entry
inventoryEntriesRouter.delete('/:id', deleteEntry);

export default inventoryEntriesRouter;