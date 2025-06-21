USE master_specs_db;
CREATE TABLE IF NOT EXISTS inventory_log (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    phone_id INT NOT NULL,
    transaction_type ENUM('incoming', 'outgoing', 'adjustment') NOT NULL,
    quantity_changed INT NOT NULL,
    new_inventory_level INT NOT NULL,
    supplier_id VARCHAR(50) NULL, -- Can be NULL for outgoing sales or adjustments
    notes TEXT,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (phone_id) REFERENCES phone_specs(id)
);
