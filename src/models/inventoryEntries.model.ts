import { RowDataPacket } from "mysql2";

export const INVENTORY_ENTRIES_TABLE = `
CREATE TABLE InventoryEntries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    quantity FLOAT NOT NULL,
    entry_type ENUM('manual_in', 'manual_out', 'manufacturing_in', 'manufacturing_out') NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT NOT NULL,
    location_id INT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES Locations(id) ON DELETE CASCADE
)
`;

export interface InventoryEntry extends RowDataPacket {
  id: number;
  product_id: number;
  quantity: number;
  entry_type: 'manual_in' | 'manual_out' | 'manufacturing_in' | 'manufacturing_out';
  timestamp: Date;
  user_id: number;
  location_id: number;
}