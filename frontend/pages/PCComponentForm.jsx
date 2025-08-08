import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Cpu, ArrowLeft, Save, Loader2, AlertTriangle } from 'lucide-react';

const COMMON_FIELDS = [
    { _section: 'Product Info' },
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'manufacturer', label: 'Manufacturer', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'image_url', label: 'Image URL', type: 'text' },
    { key: 'is_active', label: 'Is Active', type: 'checkbox', default: true },
    { _section: 'Pricing & Stock' },
    { key: 'msrp', label: 'MSRP', type: 'number' },
    { key: 'unit_cost', label: 'Unit Cost', type: 'number' },
    { key: 'unit_price', label: 'Unit Price', type: 'number' },
    { key: 'currency', label: 'Currency', type: 'select', default: 'VND', options: ['VND', 'USD', 'EUR', 'JPY', 'GBP', 'CNY'] },
    { key: 'warranty_months', label: 'Warranty (Months)', type: 'number', default: 36 },
    { key: 'reorder_point', label: 'Reorder Point', type: 'number', default: 5 }
];

const TYPE_SPECIFIC_FIELDS = {
    cpu: [
        { _section: 'Architecture & Design' },
        { key: 'socket', label: 'Socket', type: 'select', required: true, options: ['Slot 1', 'Socket 370', 'Socket 423', 'Socket 478', 'LGA 775', 'LGA 1150', 'LGA 1151', 'LGA 1155', 'LGA 1156', 'LGA 1200', 'LGA 1700', 'LGA 1851', 'LGA 2011', 'LGA 2011-v3', 'LGA 2066', 'LGA 4677', 'Socket A (462)', 'Socket 754', 'Socket 939', 'Socket 940', 'AM2', 'AM2+', 'AM3', 'AM3+', 'FM1', 'FM2', 'FM2+', 'AM1', 'AM4', 'AM5', 'sTR4', 'sTRX4', 'sWRX8', 'sTR5'] },
        { key: 'memory_type', label: 'Memory Type', type: 'select', required: true, options: ['DDR', 'DDR2', 'DDR3', 'DDR4', 'DDR5'] },
        { key: 'microarchitecture', label: 'Microarchitecture' },
        { key: 'family', label: 'Family' },
        { key: 'generation', label: 'Generation' },
        { key: 'series', label: 'Series' },
        { key: 'codename', label: 'Codename' },
        { key: 'isa', label: 'ISA', type: 'select', default: 'x86-64', options: ['x86-64', 'ARM'] },
        { key: 'design_type', label: 'Design Type', type: 'select', default: 'monolithic', options: ['monolithic', 'chiplet'] },
        { key: 'lithography', label: 'Lithography' },
        { key: 'process_node_manufacturer', label: 'Fab', type: 'select', options: ['TSMC', 'Intel', 'Samsung', 'GlobalFoundries'] },
        { _section: 'Core Configuration' },
        { key: 'cores_performance', label: 'P-Cores', type: 'number' },
        { key: 'cores_efficiency', label: 'E-Cores', type: 'number' },
        { key: 'cores_total', label: 'Total Cores', type: 'number', required: true },
        { key: 'threads', label: 'Threads', type: 'number', required: true },
        { key: 'base_clock_ghz', label: 'Base Clock (GHz)', type: 'number', step: '0.01' },
        { key: 'boost_clock_ghz', label: 'Boost Clock (GHz)', type: 'number', step: '0.01' },
        { key: 'hybrid_architecture', label: 'Hybrid Architecture', type: 'checkbox' },
        { key: 'p_core_arch', label: 'P-Core Arch' },
        { key: 'e_core_arch', label: 'E-Core Arch' },
        { key: 'p_core_base_ghz', label: 'P-Core Base (GHz)', type: 'number', step: '0.01' },
        { key: 'p_core_boost_ghz', label: 'P-Core Boost (GHz)', type: 'number', step: '0.01' },
        { key: 'e_core_base_ghz', label: 'E-Core Base (GHz)', type: 'number', step: '0.01' },
        { key: 'e_core_boost_ghz', label: 'E-Core Boost (GHz)', type: 'number', step: '0.01' },
        { _section: 'Cache' },
        { key: 'cache_l2_mb', label: 'L2 Cache (MB)', type: 'number', step: '0.1' },
        { key: 'cache_l3_mb', label: 'L3 Cache (MB)', type: 'number', step: '0.1' },
        { key: 'vcache', label: '3D V-Cache', type: 'checkbox' },
        { key: 'vcache_size_mb', label: 'V-Cache Size (MB)', type: 'number' },
        { _section: 'Power & Thermal' },
        { key: 'tdp', label: 'TDP (Watts)', type: 'number', required: true },
        { key: 'max_tdp_watts', label: 'Max TDP (Watts)', type: 'number' },
        { key: 'includes_cooler', label: 'Includes Cooler', type: 'checkbox' },
        { key: 'unlocked_multiplier', label: 'Unlocked (K/X)', type: 'checkbox' },
        { key: 'max_overclock_temp_c', label: 'Max Temp (°C)', type: 'number' },
        { _section: 'Integrated Graphics' },
        { key: 'integrated_graphics', label: 'Integrated Graphics', type: 'checkbox' },
        { key: 'igpu_name', label: 'iGPU Name' },
        { key: 'igpu_execution_units', label: 'iGPU EUs', type: 'number' },
        { key: 'igpu_max_frequency_mhz', label: 'iGPU Max Freq (MHz)', type: 'number' },
        { _section: 'Memory & I/O' },
        { key: 'max_memory_speed_mhz', label: 'Max Memory Speed (MHz)', type: 'number' },
        { key: 'max_memory_capacity_gb', label: 'Max Memory (GB)', type: 'number' },
        { key: 'memory_channels', label: 'Memory Channels', type: 'number' },
        { key: 'ecc_support', label: 'ECC Support', type: 'checkbox' },
        { key: 'pcie_lanes_total', label: 'PCIe Lanes', type: 'number' },
        { key: 'pcie_version', label: 'PCIe Version', type: 'select', options: ['3.0', '4.0', '5.0', '6.0'] },
        { _section: 'Package & Die' },
        { key: 'die_count', label: 'Die Count', type: 'number', default: 1 },
        { key: 'ccd_count', label: 'CCD Count', type: 'number' },
        { key: 'iod_type', label: 'I/O Die Type' },
        { _section: 'Reference' },
        { key: 'datasheet_url', label: 'Datasheet URL' },
        { key: 'launch_date', label: 'Launch Date', type: 'date' }
    ],
    gpu: [
        { _section: 'Core Specs' },
        { key: 'gpu_chipset', label: 'Chipset', required: true },
        { key: 'gpu_chip_manufacturer', label: 'Chip Manufacturer', type: 'select', options: ['NVIDIA', 'AMD', 'Intel'] },
        { key: 'architecture', label: 'Architecture' },
        { key: 'pcie_version', label: 'PCIe Version', type: 'select', options: ['3.0', '4.0', '5.0'] },
        { _section: 'Compute' },
        { key: 'cuda_cores', label: 'CUDA Cores', type: 'number' },
        { key: 'stream_processors', label: 'Stream Processors', type: 'number' },
        { key: 'ray_tracing_cores', label: 'RT Cores', type: 'number' },
        { key: 'tensor_cores', label: 'Tensor Cores', type: 'number' },
        { key: 'base_clock_mhz', label: 'Base Clock (MHz)', type: 'number' },
        { key: 'boost_clock_mhz', label: 'Boost Clock (MHz)', type: 'number' },
        { _section: 'Memory' },
        { key: 'memory_size_gb', label: 'VRAM (GB)', type: 'number', required: true },
        { key: 'memory_type', label: 'VRAM Type', type: 'select', required: true, options: ['GDDR5', 'GDDR5X', 'GDDR6', 'GDDR6X', 'GDDR7', 'HBM2', 'HBM2e', 'HBM3'] },
        { key: 'memory_bus_width_bit', label: 'Memory Bus (bit)', type: 'number' },
        { key: 'memory_bandwidth_gbps', label: 'Bandwidth (GB/s)', type: 'number', step: '0.1' },
        { key: 'memory_clock_mhz', label: 'Memory Clock (MHz)', type: 'number' },
        { key: 'vram_ecc', label: 'VRAM ECC', type: 'checkbox' },
        { _section: 'Power' },
        { key: 'tdp', label: 'TDP (Watts)', type: 'number', required: true },
        { key: 'recommended_psu_watts', label: 'Rec. PSU (Watts)', type: 'number' },
        { key: 'power_connectors', label: 'Power Connectors' },
        { _section: 'Physical' },
        { key: 'length_mm', label: 'Length (mm)', type: 'number' },
        { key: 'height_mm', label: 'Height (mm)', type: 'number', step: '0.1' },
        { key: 'slot_width', label: 'Slot Width', type: 'number', step: '0.1' },
        { key: 'slot_blocking_count', label: 'Slots Blocked', type: 'number', default: 2 },
        { _section: 'Display Output' },
        { key: 'hdmi_version', label: 'HDMI Version', type: 'select', options: ['2.0', '2.0b', '2.1', '2.1a'] },
        { key: 'displayport_version', label: 'DisplayPort Version', type: 'select', options: ['1.4', '1.4a', '2.0', '2.1'] },
        { _section: 'Features' },
        { key: 'ray_tracing', label: 'Ray Tracing', type: 'checkbox' },
        { key: 'dlss_version', label: 'DLSS Version' },
        { key: 'fsr_version', label: 'FSR Version' },
        { key: 'multi_gpu_support', label: 'Multi-GPU', type: 'select', options: ['None', 'NVLink', 'SLI', 'CrossFire'] },
        { key: 'compute_capability', label: 'Compute Capability' },
        { key: 'directx_version', label: 'DirectX Version' },
        { key: 'opengl_version', label: 'OpenGL Version' },
        { key: 'vulkan_version', label: 'Vulkan Version' },
        { _section: 'Cooling' },
        { key: 'cooling_type', label: 'Cooling Type', type: 'select', options: ['Open Air', 'Blower', 'AIO Hybrid', 'Passive'] },
        { key: 'fan_count', label: 'Fan Count', type: 'number' },
        { key: 'zero_rpm_mode', label: 'Zero RPM Mode', type: 'checkbox' },
        { _section: 'Reference' },
        { key: 'datasheet_url', label: 'Datasheet URL' },
        { key: 'launch_date', label: 'Launch Date', type: 'date' }
    ],
    motherboard: [
        { _section: 'Core' },
        { key: 'socket', label: 'Socket', type: 'select', required: true, options: ['Slot 1', 'Socket 370', 'Socket 423', 'Socket 478', 'LGA 775', 'LGA 1150', 'LGA 1151', 'LGA 1155', 'LGA 1156', 'LGA 1200', 'LGA 1700', 'LGA 1851', 'LGA 2011', 'LGA 2011-v3', 'LGA 2066', 'LGA 4677', 'Socket A (462)', 'Socket 754', 'Socket 939', 'Socket 940', 'AM2', 'AM2+', 'AM3', 'AM3+', 'FM1', 'FM2', 'FM2+', 'AM1', 'AM4', 'AM5', 'sTR4', 'sTRX4', 'sWRX8', 'sTR5'] },
        { key: 'form_factor', label: 'Form Factor', type: 'select', required: true, options: ['ATX', 'Micro-ATX', 'Mini-ITX', 'E-ATX'] },
        { key: 'memory_type', label: 'Memory Type', type: 'select', required: true, options: ['DDR', 'DDR2', 'DDR3', 'DDR4', 'DDR5'] },
        { key: 'chipset', label: 'Chipset' },
        { key: 'pcie_version', label: 'PCIe Version', type: 'select', options: ['3.0', '4.0', '5.0'] },
        { _section: 'Memory' },
        { key: 'memory_slots', label: 'Memory Slots', type: 'number' },
        { key: 'max_memory_capacity_gb', label: 'Max Memory (GB)', type: 'number' },
        { key: 'max_memory_speed_mhz', label: 'Max Memory Speed (MHz)', type: 'number' },
        { key: 'ecc_support', label: 'ECC Support', type: 'checkbox' },
        { _section: 'Storage' },
        { key: 'm2_slots_gen5', label: 'M.2 Gen5 Slots', type: 'number' },
        { key: 'm2_slots_gen4', label: 'M.2 Gen4 Slots', type: 'number' },
        { key: 'm2_slots_sata', label: 'M.2 SATA Slots', type: 'number' },
        { key: 'sata_ports', label: 'SATA Ports', type: 'number' },
        { _section: 'Connectivity' },
        { key: 'wifi', label: 'Wi-Fi' },
        { key: 'bluetooth', label: 'Bluetooth' },
        { key: 'thunderbolt_version', label: 'Thunderbolt Version' },
        { _section: 'Audio' },
        { key: 'audio_codec', label: 'Audio Codec' },
        { key: 'audio_channels', label: 'Audio Channels' },
        { _section: 'Power Delivery' },
        { key: 'cpu_power_phases', label: 'CPU Power Phases', type: 'number' },
        { key: 'vrm_phases', label: 'VRM Phases' },
        { key: 'vrm_mosfet', label: 'VRM MOSFET Type' },
        { _section: 'Features' },
        { key: 'bios_flashback', label: 'BIOS Flashback', type: 'checkbox' },
        { key: 'debug_led', label: 'Debug LED', type: 'checkbox' },
        { _section: 'Physical' },
        { key: 'length_mm', label: 'Length (mm)', type: 'number', step: '0.1' },
        { key: 'width_mm', label: 'Width (mm)', type: 'number', step: '0.1' },
        { key: 'datasheet_url', label: 'Datasheet URL' }
    ],
    ram: [
        { _section: 'Core' },
        { key: 'type', label: 'Type', type: 'select', required: true, options: ['DDR3', 'DDR4', 'DDR5'] },
        { key: 'speed_mhz', label: 'Speed (MHz)', type: 'number', required: true },
        { key: 'capacity_per_module_gb', label: 'Per Module (GB)', type: 'number' },
        { key: 'capacity_total_gb', label: 'Total Capacity (GB)', type: 'number', required: true },
        { key: 'modules', label: 'Modules', type: 'number', default: 1 },
        { _section: 'Timings' },
        { key: 'xmp_expo', label: 'XMP/EXPO Profile', type: 'select', options: ['None', 'XMP 3.0', 'EXPO'] },
        { key: 'base_speed_mhz', label: 'JEDEC Base Speed (MHz)', type: 'number' },
        { key: 'cas_latency', label: 'CAS Latency (CL)', type: 'number' },
        { key: 'trcd', label: 'tRCD', type: 'number' },
        { key: 'trp', label: 'tRP', type: 'number' },
        { key: 'tras', label: 'tRAS', type: 'number' },
        { key: 'voltage', label: 'Voltage', type: 'number', step: '0.01' },
        { _section: 'Advanced' },
        { key: 'die_type', label: 'Die Type' },
        { key: 'ranks_per_module', label: 'Ranks/Module', type: 'number', default: 1 },
        { key: 'ecc', label: 'ECC', type: 'checkbox' },
        { key: 'on_die_ecc', label: 'On-Die ECC (DDR5)', type: 'checkbox' },
        { key: 'pmic', label: 'PMIC Type' },
        { _section: 'Physical' },
        { key: 'height_mm', label: 'Height (mm)', type: 'number', step: '0.1' },
        { key: 'has_heatspreader', label: 'Heat Spreader', type: 'checkbox' },
        { key: 'heat_spreader_height_mm', label: 'Heatspreader Height (mm)', type: 'number', step: '0.1' },
        { key: 'rgb', label: 'RGB', type: 'checkbox' }
    ],
    storage: [
        { _section: 'Core' },
        { key: 'type', label: 'Type', type: 'select', required: true, options: ['SSD', 'HDD'] },
        { key: 'interface_type', label: 'Interface', type: 'select', required: true, options: ['M.2 2280', 'M.2 2230', 'M.2 2242', '2.5" SATA', '3.5" SATA', 'U.2', 'mSATA'] },
        { key: 'capacity_gb', label: 'Capacity (GB)', type: 'number', required: true },
        { key: 'form_factor', label: 'Form Factor', type: 'select', options: ['M.2', '2.5"', '3.5"'] },
        { key: 'height_mm', label: 'Height (mm)', type: 'number', step: '0.1' },
        { key: 'protocol', label: 'Protocol', type: 'select', options: ['NVMe', 'AHCI', 'SATA'] },
        { key: 'pcie_gen', label: 'PCIe Gen', type: 'number' },
        { _section: 'Performance' },
        { key: 'sequential_read_mbps', label: 'Seq. Read (MB/s)', type: 'number' },
        { key: 'sequential_write_mbps', label: 'Seq. Write (MB/s)', type: 'number' },
        { key: 'sustained_write_mbps', label: 'Sustained Write (MB/s)', type: 'number' },
        { key: 'random_read_iops', label: 'Random Read (IOPS)', type: 'number' },
        { key: 'random_write_iops', label: 'Random Write (IOPS)', type: 'number' },
        { _section: 'SSD Internals' },
        { key: 'controller', label: 'Controller' },
        { key: 'nand_type', label: 'NAND Type', type: 'select', options: ['SLC', 'MLC', 'TLC', 'QLC', 'PLC'] },
        { key: 'nand_layers', label: 'NAND Layers', type: 'number' },
        { key: 'dram_cache', label: 'DRAM Cache', type: 'checkbox' },
        { key: 'dram_size_mb', label: 'DRAM Size (MB)', type: 'number' },
        { key: 'slc_cache_gb', label: 'SLC Cache (GB)', type: 'number' },
        { _section: 'Endurance' },
        { key: 'tbw', label: 'TBW', type: 'number' },
        { key: 'endurance_dwpd', label: 'DWPD', type: 'number', step: '0.01' },
        { key: 'mtbf_hours', label: 'MTBF (Hours)', type: 'number' },
        { _section: 'HDD Specific' },
        { key: 'rpm', label: 'RPM (HDD)', type: 'number' },
        { key: 'cache_mb', label: 'Cache (MB, HDD)', type: 'number' },
        { key: 'recording_tech', label: 'Recording Tech', type: 'select', options: ['CMR', 'SMR'] },
        { key: 'helium_sealed', label: 'Helium Sealed', type: 'checkbox' },
        { _section: 'Power & Usage' },
        { key: 'use_case', label: 'Use Case', type: 'select', options: ['Desktop', 'NAS', 'Surveillance', 'Enterprise', 'Gaming'] },
        { key: 'active_watts', label: 'Active Power (W)', type: 'number', step: '0.1' },
        { key: 'idle_watts', label: 'Idle Power (W)', type: 'number', step: '0.1' },
        { key: 'encryption', label: 'Encryption' }
    ],
    psu: [
        { _section: 'Core' },
        { key: 'wattage', label: 'Wattage', type: 'number', required: true },
        { key: 'type', label: 'Type', type: 'select', required: true, options: ['ATX', 'SFX', 'SFX-L', 'Flex ATX', 'TFX'] },
        { key: 'efficiency_rating', label: 'Efficiency Rating', type: 'select', options: ['80+ White', '80+ Bronze', '80+ Silver', '80+ Gold', '80+ Platinum', '80+ Titanium'] },
        { key: 'atx_version', label: 'ATX Version', type: 'select', options: ['ATX 2.x', 'ATX 3.0', 'ATX 3.1'] },
        { key: 'modular', label: 'Modular', type: 'select', options: ['Full', 'Semi', 'No'] },
        { _section: 'Power' },
        { key: 'total_continuous_watts', label: 'Continuous Watts', type: 'number' },
        { key: 'peak_watts', label: 'Peak Watts', type: 'number' },
        { key: 'length_mm', label: 'Length (mm)', type: 'number' },
        { key: 'depth_mm', label: 'Depth (mm)', type: 'number' },
        { key: 'cybenetics_noise', label: 'Cybenetics Noise' },
        { key: 'twelve_v_watts', label: '12V Watts', type: 'number' },
        { _section: 'Connectors' },
        { key: 'connectors_atx_24pin', label: 'ATX 24-Pin', type: 'number' },
        { key: 'connectors_eps_8pin', label: 'EPS 8-Pin', type: 'number' },
        { key: 'connectors_eps_4pin', label: 'EPS 4-Pin', type: 'number' },
        { key: 'connectors_pcie_6_plus_2', label: 'PCIe 6+2 Pin', type: 'number' },
        { key: 'connectors_pcie_12vhpwr', label: '12VHPWR', type: 'number' },
        { key: 'connectors_sata', label: 'SATA Connectors', type: 'number' },
        { key: 'connectors_molex', label: 'Molex', type: 'number' },
        { _section: 'Cooling' },
        { key: 'fan_size_mm', label: 'Fan Size (mm)', type: 'number' },
        { key: 'fan_bearing', label: 'Fan Bearing', type: 'select', options: ['Sleeve', 'Rifle', 'FDB', 'Ball'] },
        { key: 'zero_rpm_mode', label: 'Zero RPM Mode', type: 'checkbox' },
        { key: 'fanless', label: 'Fanless', type: 'checkbox' },
        { _section: 'Physical & Ratings' },
        { key: 'length_mm', label: 'Length (mm)', type: 'number' },
        { key: 'depth_mm', label: 'Depth (mm)', type: 'number' },
        { key: 'cybenetics_noise', label: 'Cybenetics Noise' },
        { key: 'cybenetics_efficiency', label: 'Cybenetics Efficiency' },
        { key: 'single_rail', label: 'Single Rail', type: 'checkbox' },
        { key: 'twelve_v_rails', label: '12V Rails', type: 'number', default: 1 },
        { key: 'twelve_v_watts', label: '12V Watts', type: 'number' }
    ],
    case: [
        { _section: 'Core' },
        { key: 'form_factor', label: 'Form Factor', type: 'select', required: true, options: ['Full Tower', 'Mid Tower', 'Mini Tower', 'SFF', 'HTPC'] },
        { key: 'airflow_type', label: 'Airflow Type', type: 'select', options: ['Mesh', 'Solid', 'Hybrid'] },
        { key: 'side_panel_type', label: 'Side Panel Type', type: 'select', options: ['Tempered Glass', 'Acrylic', 'Solid Steel', 'Mesh'] },
        { key: 'color', label: 'Color' },
        { _section: 'Clearance' },
        { key: 'max_gpu_length_mm', label: 'Max GPU Length (mm)', type: 'number' },
        { key: 'max_cpu_cooler_height_mm', label: 'Max Cooler Height (mm)', type: 'number' },
        { key: 'max_psu_length_mm', label: 'Max PSU Length (mm)', type: 'number' },
        { key: 'max_radiator_length_front_mm', label: 'Max Front Radiator (mm)', type: 'number' },
        { key: 'max_radiator_length_top_mm', label: 'Max Top Radiator (mm)', type: 'number' },
        { _section: 'Storage & Expansion' },
        { key: 'drive_bays_3_5', label: '3.5" Bays', type: 'number' },
        { key: 'drive_bays_2_5', label: '2.5" Bays', type: 'number' },
        { key: 'expansion_slots', label: 'Expansion Slots', type: 'number' },
        { key: 'external_5_25_bays', label: '5.25" External Bays', type: 'number' },
        { _section: 'Front Panel' },
        { key: 'front_panel_usb_c', label: 'Front USB-C', type: 'number' },
        { key: 'front_panel_usb_a', label: 'Front USB-A', type: 'number' },
        { key: 'front_panel_usb_2', label: 'Front USB 2.0', type: 'number' },
        { key: 'front_panel_audio', label: 'Front Audio', type: 'checkbox' },
        { _section: 'Dimensions' },
        { key: 'cable_management_depth_mm', label: 'Cable Mgmt Depth (mm)', type: 'number' },
        { key: 'height_mm', label: 'Height (mm)', type: 'number', step: '0.1' },
        { key: 'width_mm', label: 'Width (mm)', type: 'number', step: '0.1' },
        { key: 'depth_mm', label: 'Depth (mm)', type: 'number', step: '0.1' },
        { key: 'volume_liters', label: 'Volume (L)', type: 'number', step: '0.1' },
        { key: 'weight_kg', label: 'Weight (kg)', type: 'number', step: '0.01' },
        { _section: 'Features' },
        { key: 'tempered_glass', label: 'Tempered Glass', type: 'checkbox' },
        { key: 'glass_panels', label: 'Glass Panels', type: 'number' },
        { key: 'dust_filters', label: 'Dust Filters', type: 'checkbox' },
        { key: 'tool_less_design', label: 'Tool-less Design', type: 'checkbox' },
        { key: 'rgb_included', label: 'RGB Included', type: 'checkbox' },
        { key: 'psu_shroud', label: 'PSU Shroud', type: 'checkbox' },
        { key: 'psu_position', label: 'PSU Position', type: 'select', default: 'bottom', options: ['Bottom', 'Top'] },
        { key: 'vertical_gpu_mount', label: 'Vertical GPU Mount', type: 'checkbox' }
    ],
    cooling: [
        { _section: 'Core' },
        { key: 'type', label: 'Type', type: 'select', required: true, options: ['Air', 'AIO 120mm', 'AIO 240mm', 'AIO 280mm', 'AIO 360mm', 'AIO 420mm', 'Custom Loop'] },
        { key: 'tdp_rating_watts', label: 'TDP Rating (W)', type: 'number' },
        { key: 'height_mm', label: 'Height (mm)', type: 'number' },
        { key: 'ram_clearance_mm', label: 'RAM Clearance (mm)', type: 'number' },
        { _section: 'Air Cooler' },
        { key: 'air_width_mm', label: 'Width (mm)', type: 'number' },
        { key: 'air_depth_mm', label: 'Depth (mm)', type: 'number' },
        { key: 'air_weight_g', label: 'Weight (g)', type: 'number' },
        { key: 'heatpipes', label: 'Heatpipes', type: 'number' },
        { key: 'fin_material', label: 'Fin Material', type: 'select', options: ['Aluminum', 'Copper', 'Nickel-Plated Copper'] },
        { key: 'base_material', label: 'Base Material', type: 'select', options: ['Aluminum', 'Copper', 'Nickel-Plated Copper', 'Direct Contact'] },
        { _section: 'AIO / Liquid' },
        { key: 'coldplate_material', label: 'Coldplate Material', type: 'select', options: ['Copper', 'Nickel-Plated Copper'] },
        { key: 'radiator_size_mm', label: 'Radiator Size (mm)', type: 'number' },
        { key: 'radiator_thickness_mm', label: 'Radiator Thickness (mm)', type: 'number' },
        { key: 'tube_length_mm', label: 'Tube Length (mm)', type: 'number' },
        { key: 'pump_type', label: 'Pump Type' },
        { key: 'pump_rpm', label: 'Pump RPM', type: 'number' },
        { key: 'refillable', label: 'Refillable', type: 'checkbox' },
        { _section: 'Fan Specs' },
        { key: 'fan_count', label: 'Fan Count', type: 'number' },
        { key: 'fan_size_mm', label: 'Fan Size (mm)', type: 'number' },
        { key: 'fan_rpm_min', label: 'Fan RPM Min', type: 'number' },
        { key: 'fan_rpm_max', label: 'Fan RPM Max', type: 'number' },
        { key: 'fan_airflow_cfm', label: 'Fan Airflow (CFM)', type: 'number', step: '0.1' },
        { key: 'fan_static_pressure_mmh2o', label: 'Static Pressure (mmH₂O)', type: 'number', step: '0.01' },
        { key: 'fan_noise_dba', label: 'Fan Noise (dBA)', type: 'number', step: '0.1' },
        { key: 'fan_bearing_type', label: 'Fan Bearing Type', type: 'select', options: ['Sleeve', 'FDB', 'Ball', 'Magnetic Levitation'] },
        { key: 'fan_pwm', label: 'Fan PWM', type: 'checkbox' },
        { key: 'fan_rgb', label: 'Fan RGB', type: 'checkbox' },
        { _section: 'Features' },
        { key: 'rgb_type', label: 'RGB Type', type: 'select', options: ['None', 'ARGB 5V', 'RGB 12V', 'Proprietary'] },
        { key: 'rgb_daisy_chain', label: 'RGB Daisy Chain', type: 'checkbox' },
        { key: 'lcd_display', label: 'LCD Display', type: 'checkbox' },
        { key: 'software_control', label: 'Software Control' },
        { key: 'warranty_includes_mounting', label: 'Warranty Incl. Mounting', type: 'checkbox' }
    ],
    fan: [
        { _section: 'Core' },
        { key: 'size_mm', label: 'Size (mm)', type: 'select', required: true, options: ['80', '92', '120', '140', '200'] },
        { key: 'quantity_in_pack', label: 'Pack Quantity', type: 'number', default: 1 },
        { key: 'rgb_type', label: 'RGB Type', type: 'select', options: ['None', 'ARGB 5V', 'RGB 12V', 'Proprietary'] },
        { key: 'connector_type', label: 'Connector Type', type: 'select', options: ['3-Pin DC', '4-Pin PWM', 'Proprietary'] },
        { key: 'daisy_chain', label: 'Daisy Chain', type: 'checkbox' },
        { _section: 'Performance' },
        { key: 'rpm_min', label: 'RPM Min', type: 'number' },
        { key: 'rpm_max', label: 'RPM Max', type: 'number' },
        { key: 'airflow_cfm', label: 'Airflow (CFM)', type: 'number', step: '0.1' },
        { key: 'static_pressure_mmh2o', label: 'Static Pressure (mmH₂O)', type: 'number', step: '0.01' },
        { key: 'noise_dba', label: 'Noise (dBA)', type: 'number', step: '0.1' },
        { _section: 'Design' },
        { key: 'bearing_type', label: 'Bearing Type', type: 'select', options: ['Sleeve', 'FDB', 'Ball', 'Magnetic Levitation', 'Rifle'] },
        { key: 'pwm', label: 'PWM', type: 'checkbox' },
        { key: 'blade_count', label: 'Blade Count', type: 'number' },
        { key: 'anti_vibration', label: 'Anti-Vibration', type: 'checkbox' },
        { key: 'thickness_mm', label: 'Thickness (mm)', type: 'number', step: '0.1', default: 25 }
    ]
};

export default function PCComponentForm() {
    const { type = 'cpu', id } = useParams();
    const navigate = useNavigate();
    const { hasAnyPermission } = useAuth();
    const toast = useToast();
    
    const isEdit = !!id;
    const canWrite = hasAnyPermission(['pc:write', 'pc:manage']);

    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(isEdit);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!canWrite) {
            setError("You do not have permission to access this page.");
            setLoading(false);
            return;
        }

        const loadData = async () => {
            if (isEdit) {
                try {
                    const res = await api.get(`/pc-components/${type}/${id}`);
                    setFormData(res?.data || {});
                } catch (_err) {
                    setError('Failed to load component details.');
                }
            } else {
                const initialData = {};
                COMMON_FIELDS.forEach(f => {
                    if (f.default !== undefined) initialData[f.key] = f.default;
                });
                setFormData(initialData);
            }
            setLoading(false);
        };

        loadData();
    }, [isEdit, id, type, canWrite]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        const dataToSubmit = { ...formData };
        
        // Ensure checkboxes false if not checked
        const fields = [...COMMON_FIELDS, ...(TYPE_SPECIFIC_FIELDS[type] || [])];
        fields.filter(f => f.type === 'checkbox').forEach(f => {
            if (dataToSubmit[f.key] === undefined) dataToSubmit[f.key] = false;
        });

        try {
            if (dataToSubmit.connectivity && typeof dataToSubmit.connectivity === 'string') {
                const values = dataToSubmit.connectivity.split(',').map(s => s.trim()).filter(Boolean);
                dataToSubmit.connectivity = JSON.stringify(values.length ? values : [dataToSubmit.connectivity]);
            }
            if (dataToSubmit.attributes && typeof dataToSubmit.attributes === 'string') {
                try { JSON.parse(dataToSubmit.attributes); } 
                catch { dataToSubmit.attributes = JSON.stringify(dataToSubmit.attributes); }
            }

            if (isEdit) {
                await api.put(`/pc-components/${type}/${id}`, dataToSubmit);
                toast.success('Component updated successfully');
            } else {
                await api.post(`/pc-components/${type}`, dataToSubmit);
                toast.success('Component created successfully');
            }

            navigate(`/pc-components/${type}`);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to save component.');
            window.scrollTo(0, 0);
        } finally {
            setSubmitting(false);
        }
    };

    const renderField = (f) => {
        if (f._section) {
            return (
                <div key={`section-${f._section}`} className="col-span-full mt-6 mb-3">
                    <h6 className="text-indigo-700 font-bold text-sm tracking-widest uppercase pb-2 border-b border-indigo-100">{f._section}</h6>
                </div>
            );
        }

        const val = formData[f.key] !== undefined && formData[f.key] !== null ? formData[f.key] : '';
        const ic = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors bg-white shadow-sm";

        if (f.type === 'checkbox') {
            return (
                <div key={f.key} className="mb-3">
                    <label className="flex items-center gap-2 text-sm mt-2">
                        <input 
                            type="checkbox" 
                            name={f.key} 
                            checked={!!val} 
                            onChange={handleChange} 
                            className="rounded border-border" 
                        />
                        {f.label}
                    </label>
                </div>
            );
        }

        return (
            <div key={f.key} className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">{f.label}</label>
                {f.type === 'textarea' ? (
                    <textarea 
                        rows="3" 
                        name={f.key} 
                        value={val} 
                        onChange={handleChange} 
                        className={ic}
                    />
                ) : f.type === 'select' ? (
                    <select 
                        name={f.key} 
                        required={f.required} 
                        value={val} 
                        onChange={handleChange} 
                        className={ic}
                    >
                        <option value="">Select...</option>
                        {f.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                ) : (
                    <input 
                        type={f.type || 'text'} 
                        name={f.key} 
                        value={val} 
                        required={f.required} 
                        step={f.step} 
                        onChange={handleChange} 
                        className={ic} 
                    />
                )}
            </div>
        );
    };

    const fields = [...COMMON_FIELDS, ...(TYPE_SPECIFIC_FIELDS[type] || [])];

    return (
        <div className="max-w-7xl mx-auto w-full">
            <PageHeader
                title={isEdit ? `Edit ${type.toUpperCase()} Component` : `New ${type.toUpperCase()} Component`}
                subtitle="Manage PC component specifications and details"
                icon={Cpu}
                action={
                    <button 
                        onClick={() => navigate(`/pc-components/${type}`)} 
                        className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                }
            />

            {loading ? (
                <Card noPadding><Spinner fullPage={false} className="py-20" /></Card>
            ) : !canWrite ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-rose-800 font-medium shadow-sm flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5" />
                    You do not have permission to access this page.
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-rose-800 font-medium shadow-sm flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5" />
                            {error}
                        </div>
                    )}
                    
                    <Card>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6">
                                {fields.map(renderField)}
                            </div>
                        </div>
                    </Card>
                    
                    <div className="flex justify-end gap-3 sticky bottom-4 pb-4">
                        <button 
                            type="button" 
                            onClick={() => navigate(`/pc-components/${type}`)} 
                            className="rounded-lg bg-white border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={submitting} 
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
                        >
                            {submitting ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="w-4 h-4" /> Save Component</>
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
