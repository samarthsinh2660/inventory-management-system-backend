import fs from 'fs';
import path from 'path';

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
    console.error('\n🚨 ==================== APPLICATION CRASH ====================');
    console.error(`💥 Crash Type: ${type}`);
    console.error(`🕒 Time: ${crashLog.timestamp}`);
    console.error(`❌ Error: ${crashLog.error.message}`);
    console.error(`📊 Memory: ${Math.round(crashLog.processInfo.memoryUsage.heapUsed / 1024 / 1024)}MB`);
    console.error(`⏱️ Uptime: ${Math.floor(crashLog.processInfo.uptime)}s`);
    if (crashLog.error.stack) {
        console.error(`📍 Stack:\n${crashLog.error.stack}`);
    }
    console.error('============================================================\n');

    // Log to file (create logs directory if it doesn't exist)
    try {
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        const logFile = path.join(logsDir, 'crashes.log');
        const logEntry = `${JSON.stringify(crashLog, null, 2)}\n---\n`;
        
        fs.appendFileSync(logFile, logEntry);
        console.log(`📝 Crash logged to: ${logFile}`);
    } catch (logError: any) {
        console.error('Failed to write crash log to file:', logError?.message || logError);
    }
};

/**
 * Setup global crash handlers
 */
export const setupCrashHandlers = () => {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
        logCrash('UNCAUGHT_EXCEPTION', error);
        
        console.log('🔄 Attempting to restart application in 2 seconds...');
        
        // Give time for logs to be written, then restart
        setTimeout(() => {
            console.log('🚀 Restarting application...');
            process.exit(1); // Exit with error code, process manager will restart
        }, 2000);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
        logCrash('UNHANDLED_PROMISE_REJECTION', reason, {
            promise: promise.toString()
        });
        
        console.log('🔄 Attempting to restart application in 2 seconds...');
        
        // Give time for logs to be written, then restart
        setTimeout(() => {
            console.log('🚀 Restarting application...');
            process.exit(1); // Exit with error code, process manager will restart
        }, 2000);
    });

    // Handle graceful shutdown signals
    process.on('SIGTERM', () => {
        console.log('📨 Received SIGTERM signal, shutting down gracefully...');
        process.exit(0);
    });

    process.on('SIGINT', () => {
        console.log('📨 Received SIGINT signal, shutting down gracefully...');
        process.exit(0);
    });

    console.log('🛡️ Crash handlers initialized - app will restart automatically on crashes');
};

/**
 * Manual crash logging for debugging
 */
export const logManualCrash = (reason: string, error?: any) => {
    logCrash('MANUAL_CRASH_LOG', error || new Error(reason), { reason });
}; 