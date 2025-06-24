import { Router } from 'express';
import { signup, signin, getProfile, updateProfile, refreshToken } from '../controllers/auth.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';

const LoginRouter = Router();

// Public routes
LoginRouter.post('/signup', signup);
LoginRouter.post('/signin', signin);
LoginRouter.post('/refresh-token', refreshToken);

// Protected routes
LoginRouter.get('/profile', authenticate, getProfile);
LoginRouter.put('/profile', authenticate, updateProfile);

export default LoginRouter;