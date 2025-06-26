import { RowDataPacket } from "mysql2";

export const STOCK_ALERTS_TABLE = `
CREATE TABLE IF NOT EXISTS StockAlerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  current_stock FLOAT NOT NULL,
  min_threshold FLOAT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP NULL,
  FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE
)
`;

export interface StockAlert extends RowDataPacket {
  id: number;
  product_id: number;
  current_stock: number;
  min_threshold: number;
  created_at: Date;
  is_resolved: boolean;
  resolved_at: Date | null;
}
