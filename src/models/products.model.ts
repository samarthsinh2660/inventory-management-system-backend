import { RowDataPacket } from "mysql2";

export const PRODUCTS_TABLE = `
CREATE TABLE Products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subcategory_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    source_type ENUM('manufacturing', 'trading') NOT NULL,
    category ENUM('raw', 'semi', 'finished') NOT NULL,
    min_stock_threshold FLOAT DEFAULT NULL,
    location_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subcategory_id) REFERENCES Subcategories(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES Locations(id) ON DELETE CASCADE
)
`;

export interface Product extends RowDataPacket {
  id: number;
  subcategory_id: number;
  name: string;
  unit: string;
  source_type: 'manufacturing' | 'trading';
  category: 'raw' | 'semi' | 'finished';
  min_stock_threshold: number | null;
  location_id: number;
  created_at?: Date;
  updated_at?: Date;
}
