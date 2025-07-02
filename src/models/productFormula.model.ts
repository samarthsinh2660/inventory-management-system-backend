import { RowDataPacket } from "mysql2";

export const PRODUCT_FORMULA_TABLE = `
CREATE TABLE ProductFormula (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    components JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
`;

export interface FormulaComponent {
  id: number;
  component_id: number;
  component_name?: string;
  quantity: number;
}

export interface ProductFormula extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  components: FormulaComponent[];
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Type for formula component data
 */
export interface FormulaComponentData {
  id?: number;
  component_id: number;
  component_name?: string;
  quantity: number;
}

/**
 * Type for product formula creation parameters
 */
export interface ProductFormulaCreateParams {
  name: string;
  description?: string;
  components: FormulaComponentData[];
}

/**
 * Type for product formula update parameters
 */
export interface ProductFormulaUpdateParams {
  name?: string;
  description?: string;
  components?: FormulaComponentData[];
}