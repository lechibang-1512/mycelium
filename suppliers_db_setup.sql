-- Updated SQL script to create the suppliers_db database and suppliers table
-- Run this script in your MariaDB/MySQL client

CREATE DATABASE IF NOT EXISTS suppliers_db;
USE suppliers_db;

-- Drop table if exists to recreate with new schema
DROP TABLE IF EXISTS suppliers;

CREATE TABLE suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    contact_person VARCHAR(255),
    contact_position VARCHAR(100),
    contact_email VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    address TEXT,
    notes TEXT,
    is_active TINYINT(1) DEFAULT 1,
    supplier_id VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sample data insertion with new schema
INSERT INTO suppliers (
    name, category, contact_person, contact_position, contact_email, email, 
    phone, website, address, notes, is_active, supplier_id
) VALUES 
(
    'TechSupply Co.', 'Electronics Distributor', 'John Smith', 'Sales Manager', 
    'john.smith@techsupply.com', 'info@techsupply.com', '+1-555-0123', 
    'https://www.techsupply.com', '123 Technology Blvd, San Francisco, CA 94105, USA',
    'Reliable supplier for electronic components and mobile phone accessories. Primary contact for bulk orders.',
    1, 'TS001'
),
(
    'Global Electronics Ltd.', 'Manufacturer', 'Sarah Johnson', 'Business Development Director',
    'sarah@globalelectronics.com', 'sales@globalelectronics.co.uk', '+44-20-7123-4567',
    'https://www.globalelectronics.co.uk', '456 Electronics Way, London, SW1A 1AA, United Kingdom',
    'Leading manufacturer of smartphone components and displays. Specializes in high-quality OLED screens.',
    1, 'GE002'
),
(
    'Asia Mobile Parts', 'OEM Manufacturer', 'Li Wei', 'Export Manager',
    'li.wei@asiamobileparts.com', 'export@asiamobileparts.com', '+86-10-8888-9999',
    'https://www.asiamobileparts.com', '789 Manufacturing District, Shenzhen, Guangdong 518000, China',
    'Specialized in mobile phone batteries, chargers, and replacement parts. Fast production times.',
    1, 'AMP003'
),
(
    'EuroTech Solutions', 'Technology Solutions', 'Hans Mueller', 'Technical Director',
    'hans@eurotech-solutions.de', 'contact@eurotech-solutions.de', '+49-30-1234-5678',
    'https://www.eurotech-solutions.de', '321 Innovation Street, Berlin, 10115, Germany',
    'Premium supplier of cutting-edge mobile technology and software solutions. Focus on innovation.',
    1, 'ETS004'
),
(
    'Mobile Accessories Plus', 'Retail Supplier', 'Maria Garcia', 'Procurement Manager',
    'maria@mobileaccessories.com', 'orders@mobileaccessoriesplus.com', '+1-214-555-0199',
    'https://www.mobileaccessoriesplus.com', '987 Accessory Lane, Dallas, TX 75201, USA',
    'Wide range of mobile phone cases, screen protectors, and accessories. Competitive pricing.',
    1, 'MAP005'
),
(
    'Inactive Supplier Co.', 'Former Distributor', 'Bob Wilson', 'Former Manager',
    'bob@inactivesupplier.com', 'old@inactivesupplier.com', '+1-555-0000',
    NULL, '999 Old Street, Old City, CA 90000, USA',
    'This supplier is no longer active. Historical data kept for records.',
    0, 'ISC006'
);

-- Create indexes for better performance
CREATE INDEX idx_supplier_name ON suppliers(name);
CREATE INDEX idx_supplier_category ON suppliers(category);
CREATE INDEX idx_contact_person ON suppliers(contact_person);
CREATE INDEX idx_contact_email ON suppliers(contact_email);
CREATE INDEX idx_email ON suppliers(email);
CREATE INDEX idx_is_active ON suppliers(is_active);
CREATE INDEX idx_supplier_id ON suppliers(supplier_id);
