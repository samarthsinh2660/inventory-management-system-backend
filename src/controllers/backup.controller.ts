import { Request, Response } from 'express';
import { backupService } from '../services/backup.service.js';

export class BackupController {
    
    /**
     * Get backup statistics and status
     */
    getBackupStatus = async (req: Request, res: Response): Promise<void> => {
        try {
            const stats = backupService.getBackupStats();
            
            res.json({
                success: true,
                message: 'Backup status retrieved successfully',
                data: {
                    ...stats,
                    scheduler_status: 'running',
                    retention_days: 7,
                    backup_frequency: 'Every 4 hours',
                    cleanup_frequency: 'Daily at 2 AM'
                }
            });
        } catch (error: any) {
            console.error('Get backup status error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get backup status',
                details: error.message
            });
        }
    };

    /**
     * Trigger manual backup
     */
    triggerBackup = async (req: Request, res: Response): Promise<void> => {
        try {
            console.log(`Manual backup triggered by user: ${req.user?.username || 'unknown'}`);
            
            await backupService.triggerManualBackup();
            
            res.json({
                success: true,
                message: 'Manual backup completed successfully',
                timestamp: new Date().toISOString()
            });
        } catch (error: any) {
            console.error('Manual backup error:', error);
            res.status(500).json({
                success: false,
                error: 'Manual backup failed',
                details: error.message
            });
        }
    };

    /**
     * Trigger manual cleanup of old backups
     */
    triggerCleanup = async (req: Request, res: Response): Promise<void> => {
        try {
            console.log(`Manual cleanup triggered by user: ${req.user?.username || 'unknown'}`);
            
            await backupService.triggerManualCleanup();
            
            res.json({
                success: true,
                message: 'Manual cleanup completed successfully',
                timestamp: new Date().toISOString()
            });
        } catch (error: any) {
            console.error('Manual cleanup error:', error);
            res.status(500).json({
                success: false,
                error: 'Manual cleanup failed',
                details: error.message
            });
        }
    };
}

export const backupController = new BackupController();
