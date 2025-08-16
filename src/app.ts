import express, { Application, Request, Response } from "express";
import cors from "cors";
import { setupCrashHandlers } from "./utils/crashHandler.ts";
import { PORT, CORS_ORIGIN, CORS_ORIGIN1, CORS_ORIGIN2, CORS_ORIGIN3, CORS_ORIGIN4, CORS_ORIGIN5, CORS_ORIGIN6 } from "./config/env.ts";
import cookieParser from "cookie-parser";
import { connectToDatabase, gracefulShutdown } from "./database/db.ts";
import { limiter } from "./middleware/ratelimit.middleware.ts";
import createLogger from "./utils/logger.js";
import LoginRouter from "./routes/auth.route.ts";
import UserRouter from "./routes/user.route.ts";
import SubcategoryRouter from "./routes/subcategory.route.ts";
import LocationRouter from "./routes/location.route.ts";
import ProductRouter from "./routes/product.route.ts";
import InventoryEntryRouter from "./routes/inventoryEntry.route.ts";
import AuditLogRouter from "./routes/auditLog.route.ts";
import ProductFormulaRouter from "./routes/productFormula.route.ts";
import PurchaseInfoRouter from "./routes/purchaseInfo.route.ts";
import AlertRouter from "./routes/alert.route.ts";
import NotificationRouter from "./routes/notification.route.ts";
import factoryRegistrationRoutes from './routes/factoryRegistration.route.js';
import BackupRouter from "./routes/backup.route.ts";
import { backupService } from "./services/backup.service.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.ts";

const logger = createLogger('@app');

async function start(){
// Setup crash handlers first
setupCrashHandlers();

const app: Application = express()

//ratelimit
app.use(limiter);

// Middleware
app.use(cors({ origin: '*',
   credentials: true }));
app.use(express.json());


//allow use handel send in requre it is also a middleware 
app.use(express.json({ limit: '10mb' }));
//process html data in to json form
 app.use(express.urlencoded({ extended: true, limit: '10mb' }));
//to store user data  
app.use(cookieParser());

//api checks
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });
  app.get('/', (req: Request, res: Response) => {
    res.json({
       success: true,
       message: 'inventory-management api is running'
    }); 
  })

//api routes
// Factory registration routes (public)
app.use('/api/factory', factoryRegistrationRoutes);

// Existing single-tenant routes (can be gradually migrated to multi-tenant)
app.use('/api/auth', LoginRouter);
app.use('/api/users', UserRouter);
app.use('/api/products', ProductRouter);
app.use('/api/locations', LocationRouter);
app.use('/api/subcategories', SubcategoryRouter);
app.use('/api/product-formulas', ProductFormulaRouter);
app.use('/api/purchase-info', PurchaseInfoRouter);
app.use('/api/inventory', InventoryEntryRouter);
app.use('/api/audit-logs', AuditLogRouter);
app.use('/api/alerts', AlertRouter);
app.use('/api/notifications', NotificationRouter);
app.use('/api/backup', BackupRouter);
//erros 
app.use(notFoundHandler);
app.use(errorHandler);

// Start the server
app.listen(PORT, async () => {
    await connectToDatabase();
    
    // Start the backup scheduler
    console.log(`🔄 Starting backup scheduler...`);
    logger.info(`🔄 Starting backup scheduler...`);
    backupService.startBackupScheduler();
    
    console.log(`Server started on port ${PORT}`);
    console.log(`🏭 Factory registration available at: http://localhost:${PORT}/api/factory`);
    console.log(`💾 Backup management available at: http://localhost:${PORT}/api/backup`);
    console.log(`📈 Health check: http://localhost:${PORT}/health`);
})

// Graceful shutdown handling for multi-tenant system
const gracefulShutdownHandler = async (signal: string) => {
    console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);
    
    try {
        await gracefulShutdown();
        logger.info("Graceful shutdown completed");
        process.exit(0);
    } catch (error) {
        logger.error(`Error during shutdown: ${error}`);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdownHandler('SIGTERM'));
process.on('SIGINT', () => gracefulShutdownHandler('SIGINT'));
}


start();
