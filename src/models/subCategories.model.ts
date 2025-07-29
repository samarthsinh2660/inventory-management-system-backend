import { RowDataPacket } from "mysql2";

export type CategoryType = 'raw' | 'semi' | 'finished';

export const SUBCATEGORIES_TABLE = `
CREATE TABLE Subcategories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category ENUM('raw', 'semi', 'finished') NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL
)
`;

export interface Subcategory extends RowDataPacket {
  id: number;
  category: CategoryType;
  name: string;
  description?: string | null;
}

/**
 * Type for subcategory creation parameters
 */
export interface SubcategoryCreateParams {
  category: CategoryType;
  name: string;
  description?: string | null;
}

/**
 * Type for subcategory update parameters
 */
export interface SubcategoryUpdateParams {
  category?: CategoryType;
  name?: string;
  description?: string | null;
}