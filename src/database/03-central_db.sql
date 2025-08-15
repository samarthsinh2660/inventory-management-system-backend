-- central registry DB (run at container init)
CREATE DATABASE IF NOT EXISTS central_db;
USE central_db;

CREATE TABLE IF NOT EXISTS factories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    factory_name VARCHAR(150) NOT NULL UNIQUE,
    db_name VARCHAR(150) NOT NULL UNIQUE,
    db_host VARCHAR(100) NOT NULL DEFAULT 'localhost',
    db_port INT NOT NULL DEFAULT 3306,
    db_user VARCHAR(150) NOT NULL,
    db_password VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    max_connections INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Ensure app user has privileges on central_db (for Docker MYSQL_USER)
GRANT ALL PRIVILEGES ON central_db.* TO 'user'@'%';

-- Create dedicated tenant admin user for provisioning tenant databases
-- Note: credentials must match TENANT_DB_ADMIN_* configured in app and compose
CREATE USER IF NOT EXISTS 'tenant_admin'@'%' IDENTIFIED BY 'Tenant@123';
-- Grant required global privileges to create databases and manage objects
GRANT CREATE, ALTER, DROP, REFERENCES, INDEX, SELECT, INSERT, UPDATE, DELETE,
       CREATE TEMPORARY TABLES, LOCK TABLES, TRIGGER, EXECUTE, SHOW VIEW
ON *.* TO 'tenant_admin'@'%';
-- Optionally allow usage of mysqlpump/mysqldump routines/triggers handled by above
FLUSH PRIVILEGES;

-- Insert sample factory data for testing
INSERT INTO factories (factory_name, db_name, db_host, db_port, db_user, db_password, max_connections) VALUES
('Pranav Factory', 'pranav_factory_db', 'localhost', 3306, 'pranav_user', 'pranav_pass', 15),
('Steel Works Ltd', 'steel_works_db', 'localhost', 3306, 'steel_user', 'steel_pass', 10),
('Manufacturing Co', 'manufacturing_db', 'localhost', 3306, 'mfg_user', 'mfg_pass', 20);
