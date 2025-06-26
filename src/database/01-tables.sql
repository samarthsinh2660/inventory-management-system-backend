-- ENUMs (MySQL Inline — no CREATE TYPE needed)
-- Using inline ENUMs in column definitions

-- Users Table
CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    role ENUM('master', 'employee') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Locations Table
CREATE TABLE Locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    factory_id INT DEFAULT NULL  -- optional: for multi-factory setup
);

-- Subcategories Table
CREATE TABLE Subcategories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Products Table (category ENUM included directly)
CREATE TABLE Products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subcategory_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    source_type ENUM('manufacturing', 'trading') NOT NULL,
    category ENUM('raw', 'semi', 'finished') NOT NULL,
    min_stock_threshold FLOAT DEFAULT NULL,
    location_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subcategory_id) REFERENCES Subcategories(id) ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES Locations(id) ON DELETE RESTRICT
);

-- ProductFormula Table (Bill of Materials)
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
);

-- InventoryEntries Table (Ledger)
CREATE TABLE InventoryEntries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    quantity FLOAT NOT NULL,
    entry_type ENUM('manual_in', 'manual_out', 'manufacturing_in', 'manufacturing_out') NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT NOT NULL,
    location_id INT NOT NULL,
    notes TEXT,
    reference_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES Locations(id) ON DELETE RESTRICT
);

-- AuditLogs Table
CREATE TABLE AuditLogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_id INT NOT NULL,
    action ENUM('create', 'update', 'delete') NOT NULL,
    old_data JSON,
    new_data JSON,
    user_id INT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    FOREIGN KEY (entry_id) REFERENCES InventoryEntries(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE RESTRICT
);
