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
- 3xxxx: product management errors
- 4xxxx: location management errors
- 5xxxx: subcategory management errors
- 6xxxx: formula management errors
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
    RESOURCE_IN_USE: new RequestError("Resource is in use and cannot be deleted", 10011, 400),
    
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
    PRODUCT_CREATION_FAILED: new RequestError("Failed to create product", 30002, 500),
    PRODUCT_UPDATE_FAILED: new RequestError("Failed to update product", 30003, 500),
    PRODUCT_DELETION_FAILED: new RequestError("Failed to delete product", 30004, 500),
    DUPLICATE_PRODUCT_NAME: new RequestError("Product with this name already exists", 30005, 409),
    INVALID_PRODUCT_CATEGORY: new RequestError("Invalid product category. Must be 'raw', 'semi', or 'finished'", 30006, 400),
    INVALID_PRODUCT_SOURCE_TYPE: new RequestError("Invalid product source type. Must be 'purchased', 'manufactured', or 'both'", 30007, 400),
    PRODUCT_NAME_REQUIRED: new RequestError("Product name is required", 30008, 400),
    PRODUCT_CATEGORY_REQUIRED: new RequestError("Product category is required", 30009, 400),
    PRODUCT_SOURCE_TYPE_REQUIRED: new RequestError("Product source type is required", 30010, 400),
    PRODUCT_BASE_PRICE_INVALID: new RequestError("Product base price must be a positive number", 30011, 400),
    PRODUCT_SUBCATEGORY_REQUIRED: new RequestError("Product subcategory is required", 30012, 400),
    PRODUCT_LOCATION_REQUIRED: new RequestError("Product location is required", 30013, 400),
    PRODUCT_IN_USE: new RequestError("Product is used as a component in one or more formulas and cannot be deleted", 30014, 400),
    PRODUCT_HAS_FORMULA: new RequestError("Product has a formula defined and cannot be deleted directly", 30015, 400),
    PRODUCT_SEARCH_FAILED: new RequestError("Failed to search products", 30016, 500),
    
    // Location Management Errors (4xxxx)
    LOCATION_NOT_FOUND: new RequestError("Location not found", 40001, 404), 
    LOCATION_CREATION_FAILED: new RequestError("Failed to create location", 40002, 500),
    LOCATION_UPDATE_FAILED: new RequestError("Failed to update location", 40003, 500),
    LOCATION_DELETION_FAILED: new RequestError("Failed to delete location", 40004, 500),
    DUPLICATE_LOCATION_NAME: new RequestError("Location with this name already exists", 40005, 409),
    LOCATION_NAME_REQUIRED: new RequestError("Location name is required", 40006, 400),
    LOCATION_IN_USE: new RequestError("Location is in use by one or more products and cannot be deleted", 40007, 400),
    
    // Subcategory Management Errors (5xxxx)
    SUBCATEGORY_NOT_FOUND: new RequestError("Subcategory not found", 50001, 404),
    SUBCATEGORY_CREATION_FAILED: new RequestError("Failed to create subcategory", 50002, 500),
    SUBCATEGORY_UPDATE_FAILED: new RequestError("Failed to update subcategory", 50003, 500),
    SUBCATEGORY_DELETION_FAILED: new RequestError("Failed to delete subcategory", 50004, 500),
    DUPLICATE_SUBCATEGORY_NAME: new RequestError("Subcategory with this name already exists", 50005, 409),
    SUBCATEGORY_NAME_REQUIRED: new RequestError("Subcategory name is required", 50006, 400),
    SUBCATEGORY_IN_USE: new RequestError("Subcategory is in use by one or more products and cannot be deleted", 50007, 400),
    
    // Product Formula Errors (6xxxx)
    PRODUCT_FORMULA_NOT_FOUND: new RequestError("Product formula not found", 60001, 404),
    FORMULA_COMPONENT_NOT_FOUND: new RequestError("Formula component not found", 60002, 404),
    FORMULA_CREATION_FAILED: new RequestError("Failed to create formula component", 60003, 500),
    FORMULA_UPDATE_FAILED: new RequestError("Failed to update formula component", 60004, 500),
    FORMULA_DELETION_FAILED: new RequestError("Failed to delete formula component", 60005, 500),
    CIRCULAR_DEPENDENCY_ERROR: new RequestError("Adding this component would create a circular dependency in the formula", 60006, 400),
    SELF_REFERENCE_ERROR: new RequestError("A product cannot be a component of itself", 60007, 400),
    FORMULA_QUANTITY_INVALID: new RequestError("Formula component quantity must be a positive number", 60008, 400),
    COMPONENT_ALREADY_EXISTS: new RequestError("This component already exists in the formula", 60009, 409),
    COMPONENT_PRODUCT_REQUIRED: new RequestError("Component product is required", 60010, 400),
    PARENT_PRODUCT_REQUIRED: new RequestError("Parent product is required", 60011, 400),
    INVALID_FORMULA_FOR_RAW_MATERIAL: new RequestError("Raw materials cannot have a formula", 60012, 400),
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