import { RowDataPacket } from "mysql2";

export const AUDIT_LOGS_TABLE = `
CREATE TABLE IF NOT EXISTS AuditLogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_id INT NOT NULL,
    action ENUM('create', 'update', 'delete') NOT NULL,
    old_data JSON,
    new_data JSON,
    user_id INT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    is_flag BOOLEAN DEFAULT false,
    FOREIGN KEY (entry_id) REFERENCES InventoryEntries(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE RESTRICT
)
`;

export interface AuditLog extends RowDataPacket {
  id: number;
  entry_id: number;
  action: 'create' | 'update' | 'delete';
  old_data?: any;  // JSON stringified data
  new_data?: any;  // JSON stringified data
  user_id: number;
  timestamp: Date;
  reason?: string;
  is_flag: boolean;
  
  // These fields may be joined from other tables
  username?: string;
}

export interface AuditLogCreateParams {
  entry_id: number;
  action: 'create' | 'update' | 'delete';
  old_data?: any;
  new_data?: any;
  user_id: number;
  reason?: string;
}

// Legacy filter interface for backward compatibility
export interface AuditLogFilter {
  entry_id?: number;
  action?: 'create' | 'update' | 'delete';
  user_id?: number;
  start_date?: Date;
  end_date?: Date;
  page?: number;
  limit?: number;
  is_flag?: boolean;
}

// Comprehensive filters interface for audit logs
export interface AuditLogFilters {
  // Pagination
  page?: number;
  limit?: number;
  
  // Search filter
  search?: string;
  
  // Entry type filter (action)
  action?: 'create' | 'update' | 'delete';
  
  // User filter
  user_id?: number;
  
  // Location filter
  location_id?: number;
  
  // Flag filter
  is_flag?: boolean;
  
  // Reference ID filter
  reference_id?: string;
  
  // Product hierarchy filters
  product_id?: number;
  category?: 'raw' | 'semi' | 'finished';
  subcategory_id?: number;
  
  // Timestamp filters
  date_from?: Date;
  date_to?: Date;
  days?: number; // Last N days
}

// Response interface for filtered audit logs
export interface FilteredAuditLogsResponse {
  logs: AuditLog[];
  total: number;
  filters_applied: {
    [key: string]: any;
  };
}

export interface AuditLogFlagUpdate {
  is_flag: boolean;
}