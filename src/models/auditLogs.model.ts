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

export interface AuditLogFilter {
  entry_id?: number;
  action?: 'create' | 'update' | 'delete';
  user_id?: number;
  start_date?: Date;
  end_date?: Date;
  page?: number;
  limit?: number;
}