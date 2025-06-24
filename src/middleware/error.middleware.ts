import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { RequestError } from '../utils/error.ts';
import { errorResponse } from '../utils/response.ts';

export const errorHandler: ErrorRequestHandler = (
    error: Error | RequestError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
  // Log error for debugging (in production, use proper logging service)
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    timestamp: new Date().toISOString(),
  });

  // Handle RequestError (our custom errors)
  if (error instanceof RequestError) {
    res.status(error.statusCode).json(
      errorResponse(error.message, error.code)
    );
    return;
  }

  // Handle JWT specific errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json(
      errorResponse('Invalid authentication token', 20002)
    );
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json(
      errorResponse('Authentication token has expired', 20003)
    );
    return;
  }

  // Handle database errors (MySQL/generic)
  if (error.message.includes('ER_DUP_ENTRY')) {
    res.status(409).json(
      errorResponse('Duplicate entry detected', 10001)
    );
    return;
  }

  if (error.message.includes('ER_NO_REFERENCED_ROW')) {
    res.status(400).json(
      errorResponse('Referenced record not found', 10001)
    );
    return;
  }

  // Handle validation errors (if using express-validator)
  if (error.name === 'ValidationError') {
    res.status(422).json(
      errorResponse(error.message, 10008)
    );
    return;
  }

  // Handle syntax errors in JSON
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json(
      errorResponse('Invalid JSON in request body', 10002)
    );
    return;
  }

  // Handle any other unexpected errors
  res.status(500).json(
    errorResponse(
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message,
      10004
    )
  );
  // void return
};

// 404 Not Found handler
export const notFoundHandler = (req: Request, res: Response) => {
    res.status(404).json(
        errorResponse(`Route ${req.method} ${req.path} not found`, 10006)
    );
};