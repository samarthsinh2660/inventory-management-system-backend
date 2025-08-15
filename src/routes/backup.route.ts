import { Router } from 'express';
import { backupController } from '../controllers/backup.controller.js';
import { authenticate, requireMaster } from '../middleware/auth.middleware.js';

const router = Router();

// All backup routes require master authentication
router.get('/status', authenticate, requireMaster, backupController.getBackupStatus);
router.post('/trigger', authenticate, requireMaster, backupController.triggerBackup);
router.post('/cleanup', authenticate, requireMaster, backupController.triggerCleanup);

export default router;
