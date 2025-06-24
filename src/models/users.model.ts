import { RowDataPacket } from "mysql2";

export const USERS_TABLE = `
CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    role ENUM('master', 'employee') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`;

export interface User extends RowDataPacket {
  id: number;
  name: string;
  username: string;
  password: string;
  email?: string;
  role: 'master' | 'employee';
  created_at: Date;
}