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
- 7xxxx: inventory entry management errors
- 8xxxx: audit log management errors
- 9xxxx: alert and notification management errors
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
    PAGE_MUST_BE_POSITIVE_INTEGER: new RequestError("Page must be a positive integer", 10012, 400),
    
    // User Management Errors (11xxx)
    INVALID_ROLE: new RequestError("Invalid role value. Allowed values: 'master', 'employee'", 11001, 400),
    INVALID_USER_OPERATION: new RequestError("Invalid operation on user account", 11002, 400),
    CANNOT_DELETE_OWN_ACCOUNT: new RequestError("Cannot delete your own account", 11003, 403),
    CANNOT_CHANGE_OWN_ROLE: new RequestError("Cannot change your own role", 11004, 403),
    USERNAME_ALREADY_EXISTS: new RequestError("Username already exists", 11005, 409),
    EMAIL_ALREADY_EXISTS: new RequestError("Email already exists", 11006, 409),
    USER_NOT_FOUND: new RequestError("User not found", 11007, 404),
    INVALID_USERNAME_FORMAT: new RequestError("Invalid username format", 11008, 400),
    USER_CREATION_MASTER_ONLY: new RequestError("Only master users can create new accounts", 11009, 403),
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
    FACTORY_CONTEXT_REQUIRED: new RequestError("Factory context required", 20012, 400),
    
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
    INVENTORY_FILTER_SEARCH_FAILED: new RequestError("Failed to search inventory entries", 70013, 500),
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
    SELF_REFERENCE_ERROR: new RequestError("A product cannot be a component of itself", 60007, 400),
    FORMULA_QUANTITY_INVALID: new RequestError("Formula component quantity must be a positive number", 60008, 400),
    COMPONENT_ALREADY_EXISTS: new RequestError("This component already exists in the formula", 60009, 409),
    COMPONENT_PRODUCT_REQUIRED: new RequestError("Component product is required", 60010, 400),
    PARENT_PRODUCT_REQUIRED: new RequestError("Parent product is required", 60011, 400),
    INVALID_FORMULA_FOR_RAW_MATERIAL: new RequestError("Raw materials cannot have a formula", 60012, 400),
    FORMULA_CREATION_FAILED: new RequestError("Failed to create product formula", 60013, 500),
    FORMULA_UPDATE_FAILED: new RequestError("Failed to update product formula", 60014, 500),
    FORMULA_DELETION_FAILED: new RequestError("Failed to delete product formula", 60015, 500),
    COMPONENT_UPDATE_FAILED: new RequestError("Failed to update formula component", 60016, 500),
    COMPONENT_REMOVAL_FAILED: new RequestError("Failed to remove component from formula", 60017, 500),
    PRODUCT_FORMULA_NAME_EXISTS: new RequestError("Formula with this name already exists", 60018, 409),
    FORMULA_IN_USE: new RequestError("This formula is in use by one or more products and cannot be deleted", 60019, 400),
    FORMULA_ATTACHED_TO_PRODUCT: new RequestError("This product has a formula attached and cannot be deleted", 60020, 400),
    PRODUCT_NAME_EXISTS: new RequestError("Product with this name already exists", 30005, 409), // Alias for DUPLICATE_PRODUCT_NAME
    
    // Inventory Entries Errors (7xxxx)
    INVENTORY_ENTRY_NOT_FOUND: new RequestError("Inventory entry not found", 70001, 404),
    INVENTORY_ENTRY_CREATION_FAILED: new RequestError("Failed to create inventory entry", 70002, 500),
    INVENTORY_ENTRY_UPDATE_FAILED: new RequestError("Failed to update inventory entry", 70003, 500),
    INVENTORY_ENTRY_DELETION_FAILED: new RequestError("Failed to delete inventory entry", 70004, 500),
    INVENTORY_NEGATIVE_QUANTITY_ERROR: new RequestError("Operation would result in negative inventory", 70005, 400),
    INVENTORY_ENTRY_INVALID_QUANTITY: new RequestError("Inventory quantity must be a non-zero number", 70006, 400),
    INVENTORY_ENTRY_PRODUCT_REQUIRED: new RequestError("Product is required for inventory entry", 70007, 400),
    INVENTORY_ENTRY_LOCATION_REQUIRED: new RequestError("Location is required for inventory entry", 70008, 400),
    INVENTORY_ENTRY_TYPE_REQUIRED: new RequestError("Entry type is required", 70009, 400),
    INVENTORY_BALANCE_RETRIEVAL_FAILED: new RequestError("Failed to retrieve inventory balance", 70010, 500),
    INSUFFICIENT_COMPONENT_INVENTORY: new RequestError("Insufficient inventory for one or more formula components", 70011, 400),
    PRODUCT_LOCATION_MISMATCH: new RequestError("Product can only have inventory entries at its assigned location", 70012, 400),
    PRODUCT_REQUIRED: new RequestError("Product is required for inventory entry", 70007, 400), // Alias for INVENTORY_ENTRY_PRODUCT_REQUIRED
    QUANTITY_REQUIRED: new RequestError("Inventory quantity must be a non-zero number", 70006, 400), // Alias for INVENTORY_ENTRY_INVALID_QUANTITY
    ENTRY_TYPE_REQUIRED: new RequestError("Entry type is required", 70009, 400), // Alias for INVENTORY_ENTRY_TYPE_REQUIRED
    LOCATION_REQUIRED: new RequestError("Location is required for inventory entry", 70008, 400), // Alias for INVENTORY_ENTRY_LOCATION_REQUIRED
    INVENTORY_FILTER_VALIDATION_ERROR: new RequestError("Invalid filter parameters provided", 70012, 400),
    INVENTORY_SEARCH_FAILED: new RequestError("Failed to search inventory entries with provided filters", 70013, 500),
    
    // Audit Log Errors (8xxxx)
    AUDIT_LOG_NOT_FOUND: new RequestError("Audit log not found", 80001, 404), 
    AUDIT_LOG_CREATION_FAILED: new RequestError("Failed to create audit log", 80002, 500),
    AUDIT_LOG_DELETION_FAILED: new RequestError("Failed to delete audit log", 80003, 500),
    AUDIT_LOG_REVERT_FAILED: new RequestError("Failed to revert changes from audit log", 80004, 500),
    AUDIT_LOG_MASTER_ONLY: new RequestError("Only master users can modify audit logs", 80005, 403),
    AUDIT_LOG_ENTRY_REQUIRED: new RequestError("Inventory entry ID is required", 80006, 400),
    AUDIT_LOG_ACTION_REQUIRED: new RequestError("Action type is required", 80007, 400),
    AUDIT_LOG_INVALID_FILTER: new RequestError("Invalid audit log filter parameter", 80008, 400),
    AUDIT_LOG_FILTER_SEARCH_FAILED: new RequestError("Failed to search audit logs", 80009, 500),
    AUDIT_LOG_INVALID_ID: new RequestError("Invalid audit log ID", 80010, 400),
    AUDIT_LOG_FLAG_INVALID: new RequestError("is_flag must be a boolean value", 80011, 400),
    
    // Alert and Notification Management Errors (9xxxx)
    ALERT_NOT_FOUND: new RequestError("Alert not found", 90001, 404),
    INVALID_ALERT_ID: new RequestError("Invalid alert ID", 90002, 400),
    ALERT_MASTER_ONLY: new RequestError("Only master users can manage alerts", 90003, 403),
    NOTIFICATION_NOT_FOUND: new RequestError("Notification not found or does not belong to you", 90004, 404),
    INVALID_NOTIFICATION_ID: new RequestError("Invalid notification ID", 90005, 400),
    NOTIFICATION_AUTH_REQUIRED: new RequestError("Authentication required to manage notifications", 90006, 401),
    ALERT_CHECK_FAILED: new RequestError("Failed to check for alerts", 90007, 500),
    ALERT_RESOLUTION_FAILED: new RequestError("Failed to resolve alert", 90008, 500),
    GET_ALERTS_FAILED: new RequestError("Failed to get stock alerts", 90009, 500),
    GET_NOTIFICATIONS_FAILED: new RequestError("Failed to get notifications", 90010, 500),
    UPDATE_NOTIFICATION_FAILED: new RequestError("Failed to update notification", 90011, 500),
    GET_LOW_STOCK_PRODUCTS_FAILED: new RequestError("Failed to get low stock products", 90012, 500),
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