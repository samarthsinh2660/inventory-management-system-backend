import { Router } from 'express';
import { FactoryRegistrationController } from '../controllers/factoryRegistration.controller.js';

const router = Router();

// Public routes for factory registration and discovery
router.post('/register', (req, res) => new FactoryRegistrationController().registerFactory(req, res));
router.get('/factories', (req, res) => new FactoryRegistrationController().getFactories(req, res));

// Maintenance route for syncing connections (can be protected with auth if needed)
router.post('/sync-connections', (req, res) => new FactoryRegistrationController().syncAllConnections(req, res));

export default router;
