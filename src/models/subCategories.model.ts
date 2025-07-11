import { RowDataPacket } from "mysql2";

export const SUBCATEGORIES_TABLE = `
CREATE TABLE Subcategories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL
)
`;

export interface Subcategory extends RowDataPacket {
  id: number;
  name: string;
  description?: string | null;
}

/**
 * Type for subcategory creation parameters
 */
export interface SubcategoryCreateParams {
  name: string;
  description?: string | null;
}

/**
 * Type for subcategory update parameters
 */
export interface SubcategoryUpdateParams {
  name?: string;
  description?: string | null;
}