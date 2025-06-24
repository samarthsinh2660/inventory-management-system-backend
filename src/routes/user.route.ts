import { Router } from 'express';
import { getAllUsers, createUser, deleteUser, updateUser } from '../controllers/user.controller.ts';
import { authenticate, requireMaster } from '../middleware/auth.middleware.ts';

const UserRouter = Router();

// All routes require authentication and master privileges
UserRouter.use(authenticate, requireMaster);

// User management routes (master only)
UserRouter.get('/', getAllUsers);
UserRouter.post('/', createUser);
UserRouter.delete('/:id', deleteUser);
UserRouter.patch('/:id', updateUser);

export default UserRouter;
