

// Standard success response format
export function successResponse(data: any, message?: string) {
    return {
        success: true,
        message: message || "Operation successful",
        data,
        timestamp: new Date().toISOString()
    };
}

// Standard error response format
export function errorResponse(message: string, code: number = 10000) {
    return {
        success: false,
        error: {
            code,
            message
        },
        timestamp: new Date().toISOString()
    };
}


// Response for list operations without pagination
export function listResponse(data: any[], message?: string, meta?: any) {
    return {
        success: true,
        message: message || "Data retrieved successfully",
        data,
        meta: meta || { count: data.length },
        timestamp: new Date().toISOString()
    };
}

// Response for creation operations
export function createdResponse(data: any, message?: string) {
    return {
        success: true,
        message: message || "Resource created successfully",
        data,
        timestamp: new Date().toISOString()
    };
}

// Response for update operations
export function updatedResponse(data: any, message?: string) {
    return {
        success: true,
        message: message || "Resource updated successfully",
        data,
        timestamp: new Date().toISOString()
    };
}

// Response for delete operations
export function deletedResponse(message?: string) {
    return {
        success: true,
        message: message || "Resource deleted successfully",
        timestamp: new Date().toISOString()
    };
}

// Response for authentication operations
export function authResponse(data: { user: any, token: string }, message?: string) {
    return {
        success: true,
        message: message || "Authentication successful",
        data: {
            user: data.user,
            token: data.token
        },
        timestamp: new Date().toISOString()
    };
}

// Response with custom metadata
export function responseWithMeta(
    data: any,
    meta: any,
    message?: string
) {
    return {
        success: true,
        message: message || "Operation successful",
        data,
        meta,
        timestamp: new Date().toISOString()
    };
}

// Empty success response
export function emptyResponse(message?: string) {
    return {
        success: true,
        message: message || "Operation completed successfully",
        timestamp: new Date().toISOString()
    };
}

// Search response with search metadata
export function searchResponse(
    data: any[],
    searchMeta: {
        query: string;
        totalResults: number;
        searchTime?: number;
        filters?: any;
    },
    message?: string
) {
    const response: any = {
        success: true,
        message: message || "Search completed successfully",
        data,
        searchMeta,
        timestamp: new Date().toISOString()
    };


    return response;
}