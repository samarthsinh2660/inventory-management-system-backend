import { RowDataPacket } from "mysql2";

export const PRODUCT_FORMULA_TABLE = `
CREATE TABLE ProductFormula (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    component_id INT NOT NULL,
    quantity FLOAT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE,
    FOREIGN KEY (component_id) REFERENCES Products(id) ON DELETE CASCADE,
    CHECK (product_id <> component_id)
)
`;

export interface ProductFormula extends RowDataPacket {
  id: number;
  product_id: number;
  component_id: number;
  quantity: number;
}