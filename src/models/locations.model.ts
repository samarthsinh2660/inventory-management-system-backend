import { RowDataPacket } from "mysql2";

export const LOCATIONS_TABLE = `
CREATE TABLE Locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255) DEFAULT NULL,
    factory_id INT DEFAULT 1
)
`;

export interface Location extends RowDataPacket {
  id: number;
  name: string;
  address?: string | null;
  factory_id: number | null;
}

/**
 * Type for location creation parameters
 */
export interface LocationCreateParams {
  name: string;
  address?: string | null;
  factory_id?: number | null;
}

/**
 * Type for location update parameters
 */
export interface LocationUpdateParams {
  name?: string;
  address?: string | null;
  factory_id?: number | null;
}