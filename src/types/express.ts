import { TokenData } from '../utils/jwt.ts';

// Extend Express Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: TokenData;
        }
    }
}
