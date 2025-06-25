import { RowDataPacket } from "mysql2";

export const LOCATIONS_TABLE = `
CREATE TABLE Locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    factory_id INT DEFAULT NULL
)
`;

export interface Location extends RowDataPacket {
  id: number;
  name: string;
  factory_id: number | null;
}

/**
 * Type for location creation parameters
 */
export interface LocationCreateParams {
  name: string;
  factory_id?: number | null;
}

/**
 * Type for location update parameters
 */
export interface LocationUpdateParams {
  name?: string;
  factory_id?: number | null;
}