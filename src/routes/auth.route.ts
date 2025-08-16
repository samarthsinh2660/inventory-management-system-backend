import { Router } from 'express';
import { signup, signin, getProfile, updateProfile, refreshToken, healthCheck, getFactories } from '../controllers/auth.controller.ts';
import { authenticate, requireMaster } from '../middleware/auth.middleware.ts';

const LoginRouter = Router();

// Public routes
LoginRouter.post('/signin', signin);
LoginRouter.post('/refresh-token', refreshToken);

// Protected routes
LoginRouter.post('/signup', authenticate, requireMaster, signup); // Only masters can create users
LoginRouter.get('/profile', authenticate, getProfile);
LoginRouter.get('/me', authenticate, getProfile); // Alias for profile
LoginRouter.put('/profile', authenticate, updateProfile);

// Multi-tenant specific routes
LoginRouter.get('/health', healthCheck);
LoginRouter.get('/factories', getFactories);

export default LoginRouter;