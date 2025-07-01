-- Create receipts table for storing receipt records
CREATE TABLE IF NOT EXISTS receipts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    receipt_id VARCHAR(50) UNIQUE NOT NULL,
    receipt_type ENUM('PURCHASE_RECEIPT', 'SALES_RECEIPT') NOT NULL,
    receipt_data JSON NOT NULL,
    phone_id BIGINT NOT NULL,
    supplier_id VARCHAR(100) NULL,
    transaction_date DATETIME NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_receipt_id (receipt_id),
    INDEX idx_phone_id (phone_id),
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_receipt_type (receipt_type)
);

-- Add foreign key constraints (optional, depending on your setup)
-- ALTER TABLE receipts ADD FOREIGN KEY (phone_id) REFERENCES phone_specs(id) ON DELETE CASCADE;
