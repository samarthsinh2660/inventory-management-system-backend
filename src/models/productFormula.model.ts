import { RowDataPacket } from "mysql2";

export const PRODUCT_FORMULA_TABLE = `
CREATE TABLE ProductFormula (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    component_id INT NOT NULL,
    quantity FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE RESTRICT,
    FOREIGN KEY (component_id) REFERENCES Products(id) ON DELETE RESTRICT,
    CHECK (product_id <> component_id)
)
`;

export interface ProductFormula extends RowDataPacket {
  id: number;
  product_id: number;
  component_id: number;
  quantity: number;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Extended ProductFormula with joined product/component names
 */
export interface ProductFormulaWithNames extends ProductFormula {
  product_name?: string;
  component_name?: string;
  component_unit?: string;
}

/**
 * Type for product formula creation parameters
 */
export interface ProductFormulaCreateParams {
  product_id: number;
  component_id: number;
  quantity: number;
}

/**
 * Type for product formula update parameters
 */
export interface ProductFormulaUpdateParams {
  quantity?: number;
  component_id?: number;
}