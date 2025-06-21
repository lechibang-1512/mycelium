-- Sample SQL script to create the master_specs_db database and phone_specs table
-- Run this script in your MariaDB/MySQL client before starting the application

CREATE DATABASE IF NOT EXISTS master_specs_db;
USE master_specs_db;

CREATE TABLE IF NOT EXISTS phone_specs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sm_name VARCHAR(255),
    sm_maker VARCHAR(255),
    sm_price DECIMAL(10,2),
    sm_inventory INT DEFAULT 0,
    color VARCHAR(100),
    water_and_dust_rating VARCHAR(50),
    processor VARCHAR(255),
    process_node VARCHAR(50),
    cpu_cores VARCHAR(50),
    cpu_frequency VARCHAR(100),
    gpu VARCHAR(255),
    memory_type VARCHAR(100),
    ram VARCHAR(50),
    rom VARCHAR(50),
    expandable_memory VARCHAR(100),
    length_mm DECIMAL(5,2),
    width_mm DECIMAL(5,2),
    thickness_mm DECIMAL(5,2),
    weight_g DECIMAL(6,2),
    display_size DECIMAL(3,1),
    resolution VARCHAR(50),
    pixel_density VARCHAR(50),
    refresh_rate VARCHAR(50),
    brightness VARCHAR(50),
    display_features TEXT,
    rear_camera_main VARCHAR(100),
    rear_camera_macro VARCHAR(100),
    rear_camera_features TEXT,
    rear_video_resolution VARCHAR(100),
    front_camera VARCHAR(100),
    front_camera_features TEXT,
    front_video_resolution VARCHAR(100),
    battery_capacity VARCHAR(50),
    fast_charging VARCHAR(100),
    connector VARCHAR(50),
    security_features TEXT,
    sim_card VARCHAR(100),
    nfc VARCHAR(50),
    network_bands TEXT,
    wireless_connectivity TEXT,
    navigation TEXT,
    audio_jack VARCHAR(50),
    audio_playback TEXT,
    video_playback TEXT,
    sensors TEXT,
    operating_system VARCHAR(255),
    package_contents TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sample data insertion (optional)
INSERT INTO phone_specs (
    sm_name, sm_maker, sm_price, sm_inventory, color, water_and_dust_rating,
    processor, process_node, cpu_cores, cpu_frequency, gpu, memory_type,
    ram, rom, expandable_memory, length_mm, width_mm, thickness_mm, weight_g,
    display_size, resolution, pixel_density, refresh_rate, brightness,
    display_features, rear_camera_main, rear_camera_macro, rear_camera_features,
    rear_video_resolution, front_camera, front_camera_features, front_video_resolution,
    battery_capacity, fast_charging, connector, security_features, sim_card,
    nfc, network_bands, wireless_connectivity, navigation, audio_jack,
    audio_playback, video_playback, sensors, operating_system, package_contents
) VALUES 
(
    'iPhone 15 Pro', 'Apple', 999.00, 50, 'Natural Titanium', 'IP68',
    'A17 Pro', '3nm', '6', '3.78 GHz', '6-core GPU', 'LPDDR5',
    '8GB', '128GB', 'No', 146.6, 70.6, 8.25, 187,
    6.1, '2556x1179', '460 ppi', '120Hz', '1000 nits',
    'ProMotion, Always-On display, HDR10, Dolby Vision', '48MP', '12MP', 'Night mode, Portrait mode, 4K video',
    '4K@60fps', '12MP', 'Portrait mode, Night mode', '4K@60fps',
    '3274mAh', '20W wired, 15W MagSafe', 'USB-C', 'Face ID, Secure Enclave', 'Nano-SIM + eSIM',
    'Yes', '5G, 4G LTE', 'Wi-Fi 6E, Bluetooth 5.3', 'GPS, GLONASS, Galileo, QZSS, BeiDou', 'No',
    'Spatial Audio, Dolby Atmos', '4K HDR, Dolby Vision', 'LiDAR, Accelerometer, Gyroscope, Proximity, Ambient light', 'iOS 17', 'iPhone, USB-C cable, Documentation'
),
(
    'Galaxy S24 Ultra', 'Samsung', 1199.00, 30, 'Titanium Gray', 'IP68',
    'Snapdragon 8 Gen 3', '4nm', '8', '3.39 GHz', 'Adreno 750', 'LPDDR5X',
    '12GB', '256GB', 'No', 162.3, 79.0, 8.6, 232,
    6.8, '3120x1440', '501 ppi', '120Hz', '2600 nits',
    'Dynamic AMOLED 2X, HDR10+, Always-on display', '200MP', '12MP', 'Night mode, Portrait mode, 8K video',
    '8K@30fps', '12MP', 'Portrait mode, Night mode', '4K@60fps',
    '5000mAh', '45W wired, 15W wireless', 'USB-C', 'Ultrasonic fingerprint, Knox security', 'Dual SIM + eSIM',
    'Yes', '5G, 4G LTE', 'Wi-Fi 7, Bluetooth 5.3', 'GPS, GLONASS, Galileo, BeiDou', 'No',
    'Dolby Atmos, AKG tuning', '8K, HDR10+', 'Accelerometer, Gyroscope, Proximity, Compass, Barometer', 'Android 14, One UI 6.1', 'Phone, S Pen, USB-C cable, SIM tool, Quick start guide'
);

-- Index for better performance
CREATE INDEX idx_phone_maker ON phone_specs(sm_maker);
CREATE INDEX idx_phone_name ON phone_specs(sm_name);
CREATE INDEX idx_phone_price ON phone_specs(sm_price);
CREATE INDEX idx_phone_inventory ON phone_specs(sm_inventory);
