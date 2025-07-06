import rateLimit from 'express-rate-limit';

export  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: {
        success: false,
        error: {
            code: 42901,
            message: 'Too many requests, please try again later'
        }
    }
 });