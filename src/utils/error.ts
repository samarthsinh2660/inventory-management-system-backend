export class RequestError extends Error {
    code: number;
    statusCode: number;
    
    constructor(message: string, code: number, statusCode: number) {
        super(message);
        this.name = 'RequestError';
        this.code = code;
        this.statusCode = statusCode;
        
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, RequestError);
        }
    }
}

/*
HTTP Status Codes Reference:
200 OK - Response to a successful GET, PUT, PATCH or DELETE
201 Created - Response to a POST that results in a creation
204 No Content - Response to a successful request that won't be returning a body
304 Not Modified - Used when HTTP caching headers are in play
400 Bad Request - The request is malformed, such as if the body does not parse
401 Unauthorized - When no or invalid authentication details are provided
403 Forbidden - When authentication succeeded but authenticated user doesn't have access to the resource
404 Not Found - When a non-existent resource is requested
405 Method Not Allowed - When an HTTP method is being requested that isn't allowed for the authenticated user
410 Gone - Indicates that the resource at this end point is no longer available
415 Unsupported Media Type - If incorrect content type was provided as part of the request
422 Unprocessable Entity - Used for validation errors
429 Too Many Requests - When a request is rejected due to rate limiting
500 Internal Server Error - This is either a system or application error
503 Service Unavailable - The server is unable to handle the request for a service due to temporary maintenance
*/

/*
Error Code Convention:
- 1xxxx: Common/General errors
- 2xxxx: Authentication & Authorization errors  
- 3xxxx: Author service errors
- 4xxxx: Admin service errors
- 5xxxx: Content/Article service errors
- 6xxxx: Web Story service errors
- 7xxxx: File/Media service errors
*/

export const ERRORS = {
    // Common Errors (1xxxx)
    DATABASE_ERROR: new RequestError("Database operation failed", 10001, 500),
    INVALID_REQUEST_BODY: new RequestError("Invalid request body", 10002, 400),
    INVALID_QUERY_PARAMETER: new RequestError("Invalid query parameters", 10003, 400),
    UNHANDLED_ERROR: new RequestError("An unexpected error occurred", 10004, 500),
    INTERNAL_SERVER_ERROR: new RequestError("Internal server error", 10005, 500),
    FILE_NOT_FOUND: new RequestError("File not found", 10006, 404),
    INVALID_PARAMS: new RequestError("Invalid parameters", 10007, 400),
    VALIDATION_ERROR: new RequestError("Validation failed", 10008, 422),
    RESOURCE_NOT_FOUND: new RequestError("Resource not found", 10009, 404),
    DUPLICATE_RESOURCE: new RequestError("Resource already exists", 10010, 409),
    RESOURCE_ALREADY_EXISTS: new RequestError("Resource already exists", 10010, 409),
    
    // User Management Errors (11xxx)
    INVALID_ROLE: new RequestError("Invalid role value. Allowed values: 'master', 'employee'", 11001, 400),
    INVALID_USER_OPERATION: new RequestError("Invalid operation on user account", 11002, 400),
    CANNOT_DELETE_OWN_ACCOUNT: new RequestError("Cannot delete your own account", 11003, 403),
    CANNOT_CHANGE_OWN_ROLE: new RequestError("Cannot change your own role", 11004, 403),
    USERNAME_ALREADY_EXISTS: new RequestError("Username already exists", 11005, 409),
    EMAIL_ALREADY_EXISTS: new RequestError("Email already exists", 11006, 409),
    
    // Authentication & Authorization Errors (2xxxx)
    NO_TOKEN_PROVIDED: new RequestError("No authentication token provided", 20001, 401),
    INVALID_AUTH_TOKEN: new RequestError("Invalid authentication token", 20002, 401),
    TOKEN_EXPIRED: new RequestError("Authentication token has expired", 20003, 401),
    INVALID_REFRESH_TOKEN: new RequestError("Invalid refresh token", 20004, 401),
    UNAUTHORIZED: new RequestError("Unauthorized access", 20005, 401),
    FORBIDDEN: new RequestError("Access forbidden", 20006, 403),
    ADMIN_ONLY_ROUTE: new RequestError("Admin access required", 20007, 403),
    JWT_SECRET_NOT_CONFIGURED: new RequestError("JWT configuration error", 20008, 500),
    INSUFFICIENT_PERMISSIONS: new RequestError("Insufficient permissions", 20009, 403),
    INVALID_CREDENTIALS: new RequestError("Invalid username or password", 20010, 401),
    ACCOUNT_LOCKED: new RequestError("Account is locked. Please contact administrator", 20011, 403),
    
    // Product Management Errors (3xxxx) 
    PRODUCT_NOT_FOUND: new RequestError("Product not found", 30001, 404),
    INVALID_PRODUCT_DATA: new RequestError("Invalid product data", 30002, 400),
    PRODUCT_CODE_EXISTS: new RequestError("Product code already exists", 30003, 409),
    INVALID_FORMULA: new RequestError("Invalid product formula", 30004, 400),
    INVENTORY_NOT_ENOUGH: new RequestError("Not enough inventory for operation", 30005, 400),
};

    // Helper function to check if error is a RequestError
export function isRequestError(error: any): error is RequestError {
    return error instanceof RequestError;
}

// Helper function to handle unknown errors
export function handleUnknownError(error: any): RequestError {
    if (isRequestError(error)) {
        return error;
    }
    
    console.error('Unknown error:', error);
    return ERRORS.UNHANDLED_ERROR;
}