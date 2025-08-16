import cron from 'node-cron';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, BACKUP_RETENTION_DAYS, BACKUP_BASE_NAME, AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY, AZURE_STORAGE_CONTAINER_NAME, AZURE_BACKUP_ENABLED } from '../config/env.ts';
import createLogger from '../utils/logger.js';

const execAsync = promisify(exec);
const logger = createLogger('@backup');

export class BackupService {
    private backupDir: string;
    private baseName: string;
    private azureEnabled: boolean;
    private azureAccountName?: string;
    private azureAccountKey?: string;
    private azureContainerName: string;
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
                logger.info(`Created backup directory: ${this.backupDir}`);
            } else {
                logger.info(`Backup directory exists: ${this.backupDir}`);
            }
            
            // Test write permissions
            const testFile = path.join(this.backupDir, '.write-test');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            logger.info(`Backup directory is writable`);
            
        } catch (error) {
            logger.error(`Failed to setup backup directory: ${error}`);
            throw new Error(`Backup directory setup failed: ${error}`);
        }

        // MySQL configuration from centralized env (no inline defaults here)
        this.mysqlHost = MYSQL_HOST as string;
        this.baseName = BACKUP_BASE_NAME || 'multi_tenant_backup';
        this.azureEnabled = AZURE_BACKUP_ENABLED || false;
        this.azureAccountName = AZURE_STORAGE_ACCOUNT_NAME;
        this.azureAccountKey = AZURE_STORAGE_ACCOUNT_KEY;
        this.azureContainerName = AZURE_STORAGE_CONTAINER_NAME || 'backups';
        this.mysqlPort = MYSQL_PORT as number;
        this.mysqlUser = MYSQL_USER as string;
        this.mysqlPassword = MYSQL_PASSWORD as string;
        this.retentionDays = BACKUP_RETENTION_DAYS as number;

        logger.info(`Backup Service Configuration:`);
        logger.info(`   - Host: ${this.mysqlHost}:${this.mysqlPort}`);
        logger.info(`   - Base Name: ${this.baseName}`);
        logger.info(`   - Azure Backup: ${this.azureEnabled ? 'Enabled' : 'Disabled'}`);
        if (this.azureEnabled) {
            logger.info(`   - Azure Container: ${this.azureContainerName}`);
        }
        logger.info(`   - Backup Directory: ${this.backupDir}`);
        logger.info(`   - Retention: ${this.retentionDays} days`);
    }

    /**
     * Start the backup cron job
     */
    public startBackupScheduler(): void {
        // Schedule backup every 4 hours at minute 0: "0 */4 * * *"
        cron.schedule('0 */4 * * *', async () => {
            logger.info(`Starting scheduled backup at ${new Date().toISOString()}`);
            await this.performBackup();
        });

        // Schedule cleanup daily at 2 AM: "0 2 * * *"
        cron.schedule('0 2 * * *', async () => {
            logger.info(`Starting scheduled cleanup at ${new Date().toISOString()}`);
            await this.cleanupOldBackups();
        });

        logger.info(`Backup scheduler started:`);
        logger.info(`   - Backup: Every 4 hours`);
        logger.info(`   - Cleanup: Daily at 2 AM`);
        logger.info(`   - Retention: ${this.retentionDays} days`);
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
            
            const backupFileName = `${this.baseName}_${timestamp}.sql`;
            const backupFilePath = path.join(this.backupDir, backupFileName);

            logger.info(`Creating backup: ${backupFileName}`);

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

            logger.info(`Backup completed successfully:`);
            logger.info(`   - File: ${backupFileName}`);
            logger.info(`   - Size: ${fileSizeMB} MB`);
            logger.info(`   - Path: ${backupFilePath}`);

            // Upload to Azure Blob Storage (primary storage)
            if (this.azureEnabled) {
                await this.uploadToAzure(backupFilePath, backupFileName);
                // Remove local file after successful Azure upload
                try {
                    fs.unlinkSync(backupFilePath);
                    logger.info(`Removed local backup file: ${backupFileName}`);
                } catch (unlinkErr) {
                    logger.warn(`Could not remove local file: ${unlinkErr}`);
                }
            }

            return backupFilePath;

        } catch (error) {
            logger.error(`Backup failed: ${error}`);
            return null;
        }
    }

    /**
     * Upload backup file to Azure Blob Storage
     */
    private async uploadToAzure(filePath: string, fileName: string): Promise<void> {
        try {
            if (!this.azureAccountName || !this.azureAccountKey) {
                throw new Error('Azure Storage account name and key not configured');
            }

            // Dynamic import to handle optional dependency
            const { BlobServiceClient, StorageSharedKeyCredential } = await import('@azure/storage-blob');
            
            const credential = new StorageSharedKeyCredential(this.azureAccountName, this.azureAccountKey);
            const blobServiceClient = new BlobServiceClient(
                `https://${this.azureAccountName}.blob.core.windows.net`,
                credential
            );
            const containerClient = blobServiceClient.getContainerClient(this.azureContainerName);
            
            // Ensure container exists
            await containerClient.createIfNotExists();

            const blockBlobClient = containerClient.getBlockBlobClient(fileName);
            
            logger.info(`Uploading to Azure: ${fileName}`);
            
            // Upload file
            await blockBlobClient.uploadFile(filePath);
            
            logger.info(`Azure upload completed: ${fileName}`);
            
        } catch (error) {
            logger.error(`Azure upload failed for ${fileName}: ${error}`);
            // Don't throw - backup should continue even if Azure upload fails
        }
    }

    /**
     * Clean up Azure backups older than retention period (preserves current day files)
     */
    public async cleanupOldBackups(): Promise<void> {
        try {
            if (!this.azureEnabled) {
                logger.warn(`Azure backup not enabled, skipping cleanup`);
                return;
            }

            if (!this.azureAccountName || !this.azureAccountKey) {
                logger.error(`Azure credentials not configured for cleanup`);
                return;
            }

            // Dynamic import to handle optional dependency
            const { BlobServiceClient, StorageSharedKeyCredential } = await import('@azure/storage-blob');
            
            const credential = new StorageSharedKeyCredential(this.azureAccountName, this.azureAccountKey);
            const blobServiceClient = new BlobServiceClient(
                `https://${this.azureAccountName}.blob.core.windows.net`,
                credential
            );
            const containerClient = blobServiceClient.getContainerClient(this.azureContainerName);

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of current day

            let deletedCount = 0;
            let totalSize = 0;

            logger.info(`Starting Azure backup cleanup (retention: ${this.retentionDays} days)`);

            // List all blobs in the container
            for await (const blob of containerClient.listBlobsFlat()) {
                if (!blob.name.endsWith('.sql')) continue;

                const blobDate = new Date(blob.properties.lastModified!);
                const blobDateOnly = new Date(blobDate);
                blobDateOnly.setHours(0, 0, 0, 0); // Start of blob's day

                // Only delete files that are both older than cutoff AND not from today
                if (blob.properties.lastModified! < cutoffDate && blobDateOnly.getTime() !== today.getTime()) {
                    try {
                        const blobClient = containerClient.getBlobClient(blob.name);
                        await blobClient.delete();
                        
                        totalSize += blob.properties.contentLength || 0;
                        deletedCount++;
                        logger.info(`Deleted Azure backup: ${blob.name}`);
                    } catch (deleteErr) {
                        logger.error(`Failed to delete ${blob.name}: ${deleteErr}`);
                    }
                } else if (blobDateOnly.getTime() === today.getTime()) {
                    logger.info(`Preserving current day backup: ${blob.name}`);
                }
            }

            if (deletedCount > 0) {
                const freedSpaceMB = (totalSize / (1024 * 1024)).toFixed(2);
                logger.info(`Azure cleanup completed:`);
                logger.info(`   - Files deleted: ${deletedCount}`);
                logger.info(`   - Space freed: ${freedSpaceMB} MB`);
            } else {
                logger.info(`No old Azure backups to clean up`);
            }

        } catch (error) {
            logger.error(`Azure cleanup failed: ${error}`);
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
            logger.error(`Error getting backup stats: ${error}`);
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
        logger.info(`Manual backup triggered at ${new Date().toISOString()}`);
        const result = await this.performBackup();
        if (result) {
            logger.info(`Manual backup completed: ${result}`);
        } else {
            logger.error(`Manual backup failed`);
        }
    }

    /**
     * Manual cleanup trigger
     */
    public async triggerManualCleanup(): Promise<void> {
        logger.info(`Manual cleanup triggered at ${new Date().toISOString()}`);
        await this.cleanupOldBackups();
    }
}

// Export singleton instance
export const backupService = new BackupService();
