import fs from 'fs';
import path from 'path';
import createLogger from "./logger.ts";

const logger = createLogger('@crashHandler');

/**
 * Simple crash logger - logs crash details to file and console
 */
const logCrash = (type: string, error: any, additionalInfo?: any) => {
    const crashLog = {
        timestamp: new Date().toISOString(),
        crashType: type,
        error: {
            message: error?.message || String(error),
            stack: error?.stack || 'No stack trace available',
            name: error?.name || 'UnknownError'
        },
        processInfo: {
            pid: process.pid,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            nodeVersion: process.version,
            platform: process.platform
        },
        ...(additionalInfo && { additionalInfo })
    };

    // Log to console
    logger.error('\n🚨 ==================== APPLICATION CRASH ====================');
    logger.error(`💥 Crash Type: ${type}`);
    logger.error(`🕒 Time: ${crashLog.timestamp}`);
    logger.error(`❌ Error: ${crashLog.error.message}`);
    logger.error(`📊 Memory: ${Math.round(crashLog.processInfo.memoryUsage.heapUsed / 1024 / 1024)}MB`);
    logger.error(`⏱️ Uptime: ${Math.floor(crashLog.processInfo.uptime)}s`);
    if (crashLog.error.stack) {
        logger.error(`📍 Stack:\n${crashLog.error.stack}`);
    }
    logger.error('============================================================\n');

    // Log to file (create logs directory if it doesn't exist)
    try {
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        const logFile = path.join(logsDir, 'crashes.log');
        const logEntry = `${JSON.stringify(crashLog, null, 2)}\n---\n`;
        
        fs.appendFileSync(logFile, logEntry);
        logger.info(`📝 Crash logged to: ${logFile}`);
    } catch (logError: any) {
        logger.error('Failed to write crash log to file:', logError?.message || logError);
    }
};

/**
 * Setup global crash handlers
 */
export const setupCrashHandlers = () => {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
        logCrash('UNCAUGHT_EXCEPTION', error);
        
        logger.info('🔄 Attempting to restart application in 2 seconds...');
        
        // Give time for logs to be written, then restart
        setTimeout(() => {
            logger.info('🚀 Restarting application...');
            process.exit(1); // Exit with error code, process manager will restart
        }, 2000);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
        logCrash('UNHANDLED_PROMISE_REJECTION', reason, {
            promise: promise.toString()
        });
        
        logger.info('🔄 Attempting to restart application in 2 seconds...');
        
        // Give time for logs to be written, then restart
        setTimeout(() => {
            logger.info('🚀 Restarting application...');
            process.exit(1); // Exit with error code, process manager will restart
        }, 2000);
    });

    // Handle graceful shutdown signals
    process.on('SIGTERM', () => {
        logger.info('📨 Received SIGTERM signal, shutting down gracefully...');
        process.exit(0);
    });

    process.on('SIGINT', () => {
        logger.info('📨 Received SIGINT signal, shutting down gracefully...');
        process.exit(0);
    });

    logger.info('🛡️ Crash handlers initialized - app will restart automatically on crashes');
};

/**
 * Manual crash logging for debugging
 */
export const logManualCrash = (reason: string, error?: any) => {
    logCrash('MANUAL_CRASH_LOG', error || new Error(reason), { reason });
}; 