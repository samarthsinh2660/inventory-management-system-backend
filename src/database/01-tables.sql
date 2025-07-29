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
    address VARCHAR(255) DEFAULT NULL,
    factory_id INT DEFAULT NULL  -- optional: for multi-factory setup
);

-- Subcategories Table
CREATE TABLE Subcategories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category ENUM('raw', 'semi', 'finished') NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL
);

-- PurchaseInfo Table (Supplier/Vendor Information)
CREATE TABLE PurchaseInfo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_name VARCHAR(200) NOT NULL,
    address TEXT,
    phone_number VARCHAR(20),
    email VARCHAR(100),
    gst_number VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ProductFormula Table (now with JSON components)
CREATE TABLE ProductFormula (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    components JSON NOT NULL, -- Stores array of {id, component_id, component_name, quantity}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Products Table (category ENUM included directly)
CREATE TABLE Products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subcategory_id INT NOT NULL,
    name VARCHAR(100) NOT NULL UNIQUE,
    unit VARCHAR(20) NOT NULL,
    source_type ENUM('manufacturing', 'trading') NOT NULL,
    category ENUM('raw', 'semi', 'finished') NOT NULL,
    min_stock_threshold FLOAT DEFAULT NULL,
    location_id INT NOT NULL,
    product_formula_id INT DEFAULT NULL,  -- Reference to product formula
    purchase_info_id INT DEFAULT NULL,    -- Optional: Reference to purchase info
    price DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subcategory_id) REFERENCES Subcategories(id) ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES Locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (product_formula_id) REFERENCES ProductFormula(id) ON DELETE RESTRICT,
    FOREIGN KEY (purchase_info_id) REFERENCES PurchaseInfo(id) ON DELETE SET NULL
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
    is_flag BOOLEAN DEFAULT false,
    FOREIGN KEY (entry_id) REFERENCES InventoryEntries(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE RESTRICT
);

-- StockAlerts Table
CREATE TABLE StockAlerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    current_stock FLOAT NOT NULL,
    min_threshold FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE
);

-- Notifications Table
CREATE TABLE Notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    stock_alert_id INT,
    message VARCHAR(255) NOT NULL,
    current_stock FLOAT NOT NULL,
    min_threshold FLOAT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_alert_id) REFERENCES StockAlerts(id) ON DELETE SET NULL
);
