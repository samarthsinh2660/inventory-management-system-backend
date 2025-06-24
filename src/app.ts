import express, { Application, Request, Response } from "express";
import cors from "cors";
import { PORT, CORS_ORIGIN } from "./config/env.ts";
import cookieParser from "cookie-parser";
import { connectToDatabase } from "./database/db.ts";
import { limiter } from "./middleware/ratelimit.middleware.ts";
import LoginRouter from "./routes/auth.route.ts";
import UserRouter from "./routes/user.route.ts";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.ts";

async function start(){
const app: Application = express()

//ratelimit
app.use(limiter);

// Middleware
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
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
