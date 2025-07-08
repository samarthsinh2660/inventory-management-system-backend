import express, { Application, Request, Response } from "express";
import cors from "cors";
import { setupCrashHandlers } from "./utils/crashHandler.ts";
import { PORT, CORS_ORIGIN, CORS_ORIGIN1, CORS_ORIGIN2, CORS_ORIGIN3, CORS_ORIGIN4, CORS_ORIGIN5, CORS_ORIGIN6 } from "./config/env.ts";
import cookieParser from "cookie-parser";
import { connectToDatabase } from "./database/db.ts";
import { limiter } from "./middleware/ratelimit.middleware.ts";
import LoginRouter from "./routes/auth.route.ts";
import UserRouter from "./routes/user.route.ts";
import ProductRouter from "./routes/product.route.ts";
import LocationRouter from "./routes/location.route.ts";
import SubcategoryRouter from "./routes/subcategory.route.ts";
import ProductFormulaRouter from "./routes/productFormula.route.ts";
import InventoryEntryRouter from "./routes/inventoryEntry.route.ts";
import AuditLogRouter from "./routes/auditLog.route.ts";
import AlertRouter from "./routes/alert.route.ts"; // Add this line
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.ts";
import NotificationRouter from "./routes/notification.route.ts";

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
app.use('/api/auth', LoginRouter);
app.use('/api/users', UserRouter);
app.use('/api/products', ProductRouter);
app.use('/api/locations', LocationRouter);
app.use('/api/subcategories', SubcategoryRouter);
app.use('/api/product-formulas', ProductFormulaRouter);
app.use('/api/inventory', InventoryEntryRouter);
app.use('/api/audit-logs', AuditLogRouter);
app.use('/api/alerts', AlertRouter); // Add this line
app.use('/api/notifications', NotificationRouter); // Add this line
//erros 
app.use(notFoundHandler);
app.use(errorHandler);

// Start the server
app.listen(PORT, async () => {
    await connectToDatabase();
    console.log(`Server started on port ${PORT}`);
})
}


start();
