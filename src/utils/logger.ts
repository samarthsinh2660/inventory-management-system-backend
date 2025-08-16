import winston from "winston";

function createLogger(label: string): winston.Logger {
    return winston.createLogger({
        level: 'debug',
        format: winston.format.combine( 
            winston.format.label({ label }),
            winston.format(info => {
                info.level = info.level.toUpperCase()
                return info;
            })(),
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            winston.format.printf(info => `[${info.label}] ${info.timestamp} ${info.level}: ${info.message}`+(info.splat!==undefined?`${info.splat}`:" "))
        ),
        transports: [
            new winston.transports.Console(),
            new winston.transports.File({ filename: 'error.log', level: 'debug' }),
        ]
    });
}

export default createLogger;
