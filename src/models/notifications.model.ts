import { RowDataPacket } from "mysql2";

export const NOTIFICATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS Notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  stock_alert_id INT,
  message VARCHAR(255) NOT NULL,
  current_stock FLOAT NOT NULL,
  min_threshold FLOAT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE,
  FOREIGN KEY (stock_alert_id) REFERENCES StockAlerts(id) ON DELETE SET NULL
)
`;

export interface Notification extends RowDataPacket {
  id: number;
  user_id: number;
  product_id: number;
  stock_alert_id?: number;
  message: string;
  current_stock: number;
  min_threshold: number;
  is_read: boolean;
  created_at: Date;
}
