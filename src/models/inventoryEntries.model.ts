import { RowDataPacket } from "mysql2";

export const INVENTORY_ENTRIES_TABLE = `
CREATE TABLE IF NOT EXISTS InventoryEntries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    quantity FLOAT NOT NULL,
    entry_type ENUM('manual_in', 'manual_out', 'manufacturing_in', 'manufacturing_out') NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT NOT NULL,
    location_id INT NOT NULL,
    notes TEXT,
    reference_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES Locations(id) ON DELETE RESTRICT
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
  notes?: string;
  reference_id?: string;
  created_at?: Date;
  updated_at?: Date;
  
  // These fields may be joined from other tables
  product_name?: string;
  location_name?: string;
  username?: string;
}

export interface InventoryEntryCreateParams {
  product_id: number;
  quantity: number;
  entry_type: 'manual_in' | 'manual_out' | 'manufacturing_in' | 'manufacturing_out';
  user_id: number;
  location_id: number;
  notes?: string;
  reference_id?: string;
}

export interface InventoryEntryUpdateParams {
  quantity?: number;
  entry_type?: 'manual_in' | 'manual_out' | 'manufacturing_in' | 'manufacturing_out';
  location_id?: number;
  notes?: string;
  reference_id?: string;
}

export interface ProductBalance {
  product_id: number;
  product_name: string;
  price_per_unit: number;
  total_quantity: number;
  total_price: number;
  location_id?: number;
  location_name?: string;
}

export interface InventoryBalance {
  products: ProductBalance[];
  total_products: number;
}