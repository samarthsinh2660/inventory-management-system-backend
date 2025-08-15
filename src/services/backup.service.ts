import cron from 'node-cron';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, BACKUP_RETENTION_DAYS } from '../config/env.ts';

const execAsync = promisify(exec);

export class BackupService {
    private backupDir: string;
    private mysqlHost: string;
    private mysqlPort: number;
    private mysqlUser: string;
    private mysqlPassword: string;
    private retentionDays: number;

    constructor() {
        // Create backup directory at project root (outside src)
        this.backupDir = path.join(process.cwd(), 'db-backups');
        
        try {
            if (!fs.existsSync(this.backupDir)) {
                fs.mkdirSync(this.backupDir, { recursive: true });
                console.log(`✅ Created backup directory: ${this.backupDir}`);
            } else {
                console.log(`📁 Backup directory exists: ${this.backupDir}`);
            }
            
            // Test write permissions
            const testFile = path.join(this.backupDir, '.write-test');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            console.log(`✅ Backup directory is writable`);
            
        } catch (error) {
            console.error(`❌ Failed to setup backup directory:`, error);
            throw new Error(`Backup directory setup failed: ${error}`);
        }

        // MySQL configuration from centralized env (no inline defaults here)
        this.mysqlHost = MYSQL_HOST as string;
        this.mysqlPort = MYSQL_PORT as number;
        this.mysqlUser = MYSQL_USER as string;
        this.mysqlPassword = MYSQL_PASSWORD as string;
        this.retentionDays = BACKUP_RETENTION_DAYS as number;

        console.log(`🔧 Backup Service Configuration:`);
        console.log(`   - Host: ${this.mysqlHost}:${this.mysqlPort}`);
        console.log(`   - User: ${this.mysqlUser}`);
        console.log(`   - Backup Directory: ${this.backupDir}`);
        console.log(`   - Retention: ${this.retentionDays} days`);
    }

    /**
     * Start the backup cron job
     */
    public startBackupScheduler(): void {
        // Schedule backup every 4 hours at minute 0: "0 */4 * * *"
        cron.schedule('0 */4 * * *', async () => {
            console.log(`🔄 Starting scheduled backup at ${new Date().toISOString()}`);
            await this.performBackup();
        });

        // Schedule cleanup daily at 2 AM: "0 2 * * *"
        cron.schedule('0 2 * * *', async () => {
            console.log(`🧹 Starting scheduled cleanup at ${new Date().toISOString()}`);
            await this.cleanupOldBackups();
        });

        console.log(`✅ Backup scheduler started:`);
        console.log(`   - Backup: Every 4 hours`);
        console.log(`   - Cleanup: Daily at 2 AM`);
        console.log(`   - Retention: ${this.retentionDays} days`);
    }

    /**
     * Perform a complete backup of all databases
     */
    public async performBackup(): Promise<string | null> {
        try {
            const timestamp = new Date()
                .toISOString()
                .replace(/T/, '_')
                .replace(/:/g, '-')
                .replace(/\..+/, '');
            
            const backupFileName = `multi_tenant_backup_${timestamp}.sql`;
            const backupFilePath = path.join(this.backupDir, backupFileName);

            console.log(`📦 Creating backup: ${backupFileName}`);

            // Direct MySQL dump command (works from within Docker container)
            const dumpCommand = `mysqldump -h${this.mysqlHost} -P${this.mysqlPort} -u${this.mysqlUser} -p${this.mysqlPassword} --all-databases --routines --triggers --single-transaction`;

            // Execute backup and save to file (with increased buffer for large databases)
            const { stdout, stderr } = await execAsync(dumpCommand, {
                maxBuffer: 50 * 1024 * 1024 // 50MB buffer for large backups
            });
            
            if (stderr && !stderr.includes('Warning')) {
                throw new Error(`MySQL dump error: ${stderr}`);
            }

            // Write backup to file
            fs.writeFileSync(backupFilePath, stdout);

            // Get file size for logging
            const stats = fs.statSync(backupFilePath);
            const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

            console.log(`✅ Backup completed successfully:`);
            console.log(`   - File: ${backupFileName}`);
            console.log(`   - Size: ${fileSizeMB} MB`);
            console.log(`   - Path: ${backupFilePath}`);

            return backupFilePath;

        } catch (error) {
            console.error(`❌ Backup failed:`, error);
            return null;
        }
    }

    /**
     * Clean up backups older than retention period
     */
    public async cleanupOldBackups(): Promise<void> {
        try {
            const files = fs.readdirSync(this.backupDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

            let deletedCount = 0;
            let totalSize = 0;

            for (const file of files) {
                if (!file.endsWith('.sql')) continue;

                const filePath = path.join(this.backupDir, file);
                const stats = fs.statSync(filePath);

                if (stats.mtime < cutoffDate) {
                    totalSize += stats.size;
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    console.log(`🗑️ Deleted old backup: ${file}`);
                }
            }

            if (deletedCount > 0) {
                const freedSpaceMB = (totalSize / (1024 * 1024)).toFixed(2);
                console.log(`✅ Cleanup completed:`);
                console.log(`   - Files deleted: ${deletedCount}`);
                console.log(`   - Space freed: ${freedSpaceMB} MB`);
            } else {
                console.log(`✅ No old backups to clean up`);
            }

        } catch (error) {
            console.error(`❌ Cleanup failed:`, error);
        }
    }

    /**
     * Get backup statistics
     */
    public getBackupStats(): {
        totalBackups: number;
        totalSizeMB: number;
        oldestBackup: string | null;
        newestBackup: string | null;
    } {
        try {
            const files = fs.readdirSync(this.backupDir)
                .filter(file => file.endsWith('.sql'))
                .map(file => {
                    const filePath = path.join(this.backupDir, file);
                    const stats = fs.statSync(filePath);
                    return {
                        name: file,
                        size: stats.size,
                        mtime: stats.mtime
                    };
                })
                .sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

            const totalSizeMB = files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);

            return {
                totalBackups: files.length,
                totalSizeMB: Math.round(totalSizeMB * 100) / 100,
                oldestBackup: files.length > 0 ? files[0].name : null,
                newestBackup: files.length > 0 ? files[files.length - 1].name : null
            };

        } catch (error) {
            console.error('Error getting backup stats:', error);
            return {
                totalBackups: 0,
                totalSizeMB: 0,
                oldestBackup: null,
                newestBackup: null
            };
        }
    }

    /**
     * Manual backup trigger (for testing or manual backups)
     */
    public async triggerManualBackup(): Promise<void> {
        console.log(`🔧 Manual backup triggered at ${new Date().toISOString()}`);
        const result = await this.performBackup();
        if (result) {
            console.log(`✅ Manual backup completed: ${result}`);
        } else {
            console.log(`❌ Manual backup failed`);
        }
    }

    /**
     * Manual cleanup trigger
     */
    public async triggerManualCleanup(): Promise<void> {
        console.log(`🔧 Manual cleanup triggered at ${new Date().toISOString()}`);
        await this.cleanupOldBackups();
    }
}

// Export singleton instance
export const backupService = new BackupService();
