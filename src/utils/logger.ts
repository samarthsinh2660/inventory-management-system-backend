import winston from "winston";
import fs from 'fs';

// Ensure logs directory exists
if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
}

function createLogger(label: string): winston.Logger {
    return winston.createLogger({
        level: 'debug',
        format: winston.format.combine(
            winston.format.label({ label }),
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            })
        ),
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.printf(info => `[${info.label}] ${info.timestamp} ${info.level.toUpperCase()}: ${info.message}` + (info.splat !== undefined ? `${info.splat}` : " "))
                )
            }),
            new winston.transports.File({
                filename: 'logs/error.log',
                level: 'debug',
                format: winston.format.printf(info => `[${info.label}] ${info.timestamp} ${info.level}: ${info.message}` + (info.splat !== undefined ? `${info.splat}` : " "))
            }),
        ]
    });
}

export default createLogger;
