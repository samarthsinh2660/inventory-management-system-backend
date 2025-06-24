import { RowDataPacket } from "mysql2";

export const AUDIT_LOGS_TABLE = `
CREATE TABLE AuditLogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action TEXT NOT NULL,
    user_id INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE SET NULL
)
`;

export interface AuditLog extends RowDataPacket {
  id: number;
  action: string;
  user_id: number | null;
  timestamp: Date;
  entity_type: string;
  entity_id: number;
}