-- Database Optimization Script
-- Run these queries to create indexes for better performance

-- Add indexes for frequently queried columns
CREATE INDEX idx_phone_specs_maker ON phone_specs(sm_maker);
CREATE INDEX idx_phone_specs_name ON phone_specs(sm_name);
CREATE INDEX idx_phone_specs_price ON phone_specs(sm_price);
CREATE INDEX idx_phone_specs_inventory ON phone_specs(sm_inventory);

-- Composite index for variant queries (most important optimization)
CREATE INDEX idx_phone_specs_name_maker ON phone_specs(sm_name, sm_maker);

-- Index for full-text search
CREATE INDEX idx_phone_specs_search ON phone_specs(sm_name, sm_maker, processor);

-- Index for filtering and sorting combinations
CREATE INDEX idx_phone_specs_maker_price ON phone_specs(sm_maker, sm_price);
CREATE INDEX idx_phone_specs_maker_inventory ON phone_specs(sm_maker, sm_inventory);

-- For inventory management queries
CREATE INDEX idx_phone_specs_inventory_price ON phone_specs(sm_inventory, sm_price);
