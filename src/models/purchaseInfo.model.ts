import { RowDataPacket } from "mysql2";

export const PURCHASE_INFO_TABLE = `
CREATE TABLE PurchaseInfo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_name VARCHAR(200) NOT NULL,
    address TEXT,
    phone_number VARCHAR(20),
    email VARCHAR(100),
    gst_number VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
`;

export interface PurchaseInfo extends RowDataPacket {
  id: number;
  business_name: string;
  address?: string | null;
  phone_number?: string | null;
  email?: string | null;
  gst_number?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Type for purchase info creation parameters
 */
export interface PurchaseInfoCreateParams {
  business_name: string;
  address?: string | null;
  phone_number?: string | null;
  email?: string | null;
  gst_number?: string | null;
}

/**
 * Type for purchase info update parameters
 */
export interface PurchaseInfoUpdateParams {
  business_name?: string;
  address?: string | null;
  phone_number?: string | null;
  email?: string | null;
  gst_number?: string | null;
}
