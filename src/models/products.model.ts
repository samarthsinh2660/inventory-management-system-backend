import { RowDataPacket } from "mysql2";

export enum ProductCategory {
  RAW = 'raw',
  SEMI = 'semi',
  FINISHED = 'finished'
}

export enum SourceType {
  MANUFACTURING = 'manufacturing',
  TRADING = 'trading'
}

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
    price DECIMAL(10, 2) DEFAULT 0.00,
    product_formula_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subcategory_id) REFERENCES Subcategories(id) ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES Locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (product_formula_id) REFERENCES ProductFormula(id) ON DELETE SET NULL
)
`;

export interface Product extends RowDataPacket {
  id: number;
  subcategory_id: number;
  name: string;
  unit: string;
  source_type: SourceType;
  category: ProductCategory;
  min_stock_threshold: number | null;
  location_id: number;
  price: number;
  product_formula_id: number | null;
  purchase_info_id?: number | null;
  // Purchase info fields (from JOIN)
  purchase_business_name?: string | null;
  purchase_address?: string | null;
  purchase_phone?: string | null;
  purchase_email?: string | null;
  purchase_gst?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Type for product search parameters
 */
export interface ProductSearchParams {
  search?: string;           // General search term for name or other fields
  category?: ProductCategory;
  subcategory_id?: number;
  location_id?: number;
  source_type?: SourceType;
  formula_id?: number;       // Find products with specific formula ID
  component_id?: number;     // Find products that use specific component ID
  is_parent?: boolean;       // Whether product has any formulas defined
  is_component?: boolean;    // Whether product is used as a component
  purchase_info_id?: number | null; // Filter by purchase info (supplier) ID
  page?: number;             // Pagination: page number, default 1
  limit?: number;            // Pagination: items per page, default 20
}

/**
 * Type for product creation parameters
 */
export interface ProductCreateParams {
  name: string;
  unit: string;
  source_type: SourceType;
  category: ProductCategory;
  min_stock_threshold?: number | null;
  location_id: number;
  subcategory_id: number;
  price?: number;
  product_formula_id?: number | null;
  purchase_info_id?: number | null;
}
