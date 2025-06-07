// dbQueries.js (CPU version)
const { performance } = require('perf_hooks');

// Enhanced LRU Cache implementation for better memory management and performance
class LRUCache {
    constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
        this.maxSize = maxSize;
        this.ttl = ttl;
        this.cache = new Map();
        this.hits = 0;
        this.misses = 0;
        this.lastCleanup = Date.now();
        
        // Perform background cleanup every 5 minutes
        setInterval(() => this.periodicCleanup(), 5 * 60 * 1000);
    }
    
    get(key) {
        const item = this.cache.get(key);
        if (!item) {
            this.misses++;
            return null;
        }
        
        // Check if expired
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }
        
        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, {
            ...item,
            accessed: Date.now() // Update last access time
        });
        
        this.hits++;
        return item.data;
    }
    
    set(key, data) {
        // Remove oldest items if at capacity
        if (this.cache.size >= this.maxSize) {
            // Get the first N items to check
            const keysToCheck = Array.from(this.cache.keys()).slice(0, 10);
            
            // Find the least recently accessed
            let oldest = null;
            let oldestTimestamp = Infinity;
            
            for (const checkKey of keysToCheck) {
                const item = this.cache.get(checkKey);
                if (item && item.accessed < oldestTimestamp) {
                    oldest = checkKey;
                    oldestTimestamp = item.accessed;
                }
            }
            
            if (oldest) {
                this.cache.delete(oldest);
            } else {
                // Fallback to original behavior if something goes wrong
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }
        }
        
        const now = Date.now();
        this.cache.set(key, {
            data,
            timestamp: now,
            accessed: now
        });
    }
    
    // Periodically clean up expired items
    periodicCleanup() {
        try {
            const now = Date.now();
            let removed = 0;
            
            for (const [key, item] of this.cache.entries()) {
                if (now - item.timestamp > this.ttl) {
                    this.cache.delete(key);
                    removed++;
                }
            }
            
            // Log cache performance stats
            const hitRate = this.getTotalRequests() > 0 ? 
                (this.hits / this.getTotalRequests() * 100).toFixed(2) : 0;
                
            console.log(`Cache cleanup: removed ${removed} items. Stats: ${this.size()} items, ${hitRate}% hit rate`);
            
            this.lastCleanup = now;
        } catch (error) {
            console.error('Error during cache cleanup:', error);
            // Don't let failures in cleanup break the cache functionality
        }
    }
    
    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }
    
    size() {
        return this.cache.size;
    }
    
    getTotalRequests() {
        return this.hits + this.misses;
    }
    
    getHitRate() {
        const total = this.getTotalRequests();
        return total > 0 ? this.hits / total : 0;
    }
}

// Initialize optimized cache with tiered TTL strategy based on query type
const CACHE_CONFIG = {
    short: 60 * 1000,        // 1 minute for volatile data
    medium: 5 * 60 * 1000,   // 5 minutes for semi-static data
    long: 60 * 60 * 1000     // 1 hour for reference data
};

const queryCache = new LRUCache(500, CACHE_CONFIG.medium); // Increased cache size to 500 items
const statsCache = new Map(); // For tracking query statistics

// Helper function for database queries with enhanced performance monitoring and optimization
async function queryDatabase(db, sql, params = [], cacheOptions = { use: false, ttl: 'medium' }) {
    const startTime = performance.now();
    const useCache = cacheOptions.use === true;
    const cacheTTL = CACHE_CONFIG[cacheOptions.ttl] || CACHE_CONFIG.medium;
    
    // Generate more efficient and consistent cache key with query fingerprint
    const queryFingerprint = sql.replace(/\s+/g, ' ')
                               .trim()
                               .replace(/\d+/g, 'N'); // Normalize numbers to improve cache hits
                               
    const cacheKey = useCache ? 
        `${queryFingerprint}:${JSON.stringify(params)}`.substring(0, 255) : null; // Limit key size
    
    // Check cache first to avoid unnecessary database access
    if (useCache && cacheKey) {
        const cached = queryCache.get(cacheKey);
        if (cached) {
            const cacheDuration = performance.now() - startTime;
            updateQueryStats('cache_hit', sql, cacheDuration);
            return cached;
        }
    }
    
    // Log query before execution for better debugging
    console.debug(`Executing query: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`);
    
    try {
        // Use query timeout to prevent long-running queries - 10 seconds
        const queryOptions = { timeout: 10000 };
        
        // Check if this is a SELECT query (for read-only optimization)
        const isSelect = sql.trim().toLowerCase().startsWith('select');
        
        // Execute with the appropriate method (execute gives better performance than query)
        const [rows] = await db.execute(sql, params, queryOptions);
        const endTime = performance.now();
        const queryTime = endTime - startTime;
        
        // Update statistics
        updateQueryStats(isSelect ? 'select' : 'write', sql, queryTime);
        
        // Enhanced logging with query categorization
        if (queryTime > 500) {
            console.warn(`CRITICAL SLOW QUERY (${queryTime.toFixed(2)}ms):`, sql.substring(0, 150));
            console.warn(`Parameters:`, JSON.stringify(params));
        } else if (queryTime > 200) {
            console.warn(`Slow Query (${queryTime.toFixed(2)}ms):`, sql.substring(0, 100));
        } else if (queryTime > 50) {
            console.log(`Medium Query (${queryTime.toFixed(2)}ms):`, sql.substring(0, 50));
        }
        
        // Only cache read operations with reasonable result sizes
        if (useCache && cacheKey && isSelect && 
           ((Array.isArray(rows) && rows.length < 10000) || 
           (!Array.isArray(rows) && Object.keys(rows).length < 100))) {
            queryCache.set(cacheKey, rows);
        }
        
        return rows;
    } catch (error) {
        const errorTime = performance.now() - startTime;
        updateQueryStats('error', sql, errorTime);
        
        console.error(`Database Query Failed (${errorTime.toFixed(2)}ms):`, error.message);
        console.error(`Query:`, sql);
        console.error(`Params:`, JSON.stringify(params));
        
        // Provide more useful error information for debugging
        if (error.code) {
            console.error(`Error code: ${error.code}, sqlState: ${error.sqlState || 'unknown'}`);
        }
        
        throw error;
    }
}

// Track query statistics for performance analysis
function updateQueryStats(type, sql, duration) {
    const fingerprint = sql.replace(/\s+/g, ' ')
                           .trim()
                           .replace(/\d+/g, 'N')
                           .substring(0, 100);
                           
    if (!statsCache.has(fingerprint)) {
        statsCache.set(fingerprint, {
            count: 0,
            totalTime: 0,
            avgTime: 0,
            minTime: Infinity,
            maxTime: 0,
            type: type
        });
    }
    
    const stats = statsCache.get(fingerprint);
    stats.count++;
    stats.totalTime += duration;
    stats.avgTime = stats.totalTime / stats.count;
    stats.minTime = Math.min(stats.minTime, duration);
    stats.maxTime = Math.max(stats.maxTime, duration);
    
    // Periodically log statistics (every 100 queries)
    if (stats.count % 100 === 0) {
        console.log(`Query stats [${fingerprint}]: ${stats.count} calls, avg: ${stats.avgTime.toFixed(2)}ms`);
    }
}

// CPU Query functions

async function getCPUs(db, filters = {}) {
    let query = `
        SELECT id, product_collection, code_name, vertical_segment, processor_number, lithography,
            recommended_customer_price_min, recommended_customer_price_max, total_cores, performance_cores, efficient_cores,
            total_threads, max_turbo_frequency_ghz, turbo_boost_max_3_0_frequency_ghz, performance_core_max_turbo_frequency_ghz,
            efficient_core_max_turbo_frequency_ghz, performance_core_base_frequency_ghz, efficient_core_base_frequency_ghz,
            cache_mb, total_l2_cache_mb, processor_base_power_w, maximum_turbo_power_w, launch_date, embedded_options_available,
            max_memory_size_gb, memory_types, max_memory_channels, max_memory_bandwidth_gb_s, ecc_memory_supported, gpu_name,
            graphics_base_frequency_mhz, graphics_max_dynamic_frequency_ghz, graphics_output, execution_units, max_resolution_hdmi,
            max_resolution_dp, max_resolution_edp, directx_support, opengl_support, opencl_support, multi_format_codec_engines,
            intel_quick_sync_video, intel_clear_video_hd_technology, displays_supported, device_id, dmi_revision, max_dmi_lanes,
            scalability, pci_express_revision, pci_express_configurations, max_pci_express_lanes, sockets_supported, max_cpu_configuration,
            thermal_solution_specification, tjunction_celsius, package_size_mm, intel_gaussian_neural_accelerator_version,
            intel_thread_director, intel_dl_boost, intel_optane_memory_supported, intel_speed_shift_technology,
            intel_turbo_boost_max_technology_3_0, intel_turbo_boost_technology_version, intel_hyper_threading_technology, intel_64,
            instruction_set, instruction_set_extensions, idle_states, enhanced_intel_speedstep_technology, thermal_monitoring_technologies,
            intel_volume_management_device_vmd, intel_vpro_eligibility, intel_threat_detection_technology_tdt, intel_active_management_technology_amt,
            intel_standard_manageability_ism, intel_one_click_recovery, intel_hardware_shield_eligibility, intel_control_flow_enforcement_technology,
            intel_total_memory_encryption_multi_key, intel_total_memory_encryption, intel_aes_new_instructions, intel_secure_key, intel_os_guard,
            intel_trusted_execution_technology, execute_disable_bit, intel_boot_guard, mode_based_execute_control_mbec, intel_stable_it_platform_program_sipp,
            intel_virtualization_technology_with_redirect_protection_vt_rp, intel_virtualization_technology_vtx, intel_virtualization_technology_for_directed_io_vtd,
            intel_vtx_with_extended_page_tables_ept, manufacturer, inventory
        FROM cpu_specs
        WHERE 1=1
    `;
    const params = [];
    if (filters.product_collection) {
        query += ' AND product_collection = ?';
        params.push(filters.product_collection);
    }
    if (filters.code_name) {
        query += ' AND code_name = ?';
        params.push(filters.code_name);
    }
    query += ' ORDER BY manufacturer, processor_number';
    return await queryDatabase(db, query, params, { use: true, ttl: 'short' });
}

async function getCPUById(db, cpuId) {
    const query = `
        SELECT * FROM cpu_specs WHERE id = ?`;
    return await queryDatabase(db, query, [cpuId], { use: true, ttl: 'medium' });
}

async function addNewCPU(db, cpuData) {
    try {
        // Validate required data
        if (!cpuData.product_collection || !cpuData.processor_number || !cpuData.manufacturer) {
            return { success: false, error: 'Missing required CPU information' };
        }
        // Prepare SQL query
        const query = `
            INSERT INTO cpu_specs (
                product_collection, code_name, vertical_segment, processor_number, lithography,
                recommended_customer_price_min, recommended_customer_price_max, total_cores, performance_cores, efficient_cores,
                total_threads, max_turbo_frequency_ghz, turbo_boost_max_3_0_frequency_ghz, performance_core_max_turbo_frequency_ghz,
                efficient_core_max_turbo_frequency_ghz, performance_core_base_frequency_ghz, efficient_core_base_frequency_ghz,
                cache_mb, total_l2_cache_mb, processor_base_power_w, maximum_turbo_power_w, launch_date, embedded_options_available,
                max_memory_size_gb, memory_types, max_memory_channels, max_memory_bandwidth_gb_s, ecc_memory_supported, gpu_name,
                graphics_base_frequency_mhz, graphics_max_dynamic_frequency_ghz, graphics_output, execution_units, max_resolution_hdmi,
                max_resolution_dp, max_resolution_edp, directx_support, opengl_support, opencl_support, multi_format_codec_engines,
                intel_quick_sync_video, intel_clear_video_hd_technology, displays_supported, device_id, dmi_revision, max_dmi_lanes,
                scalability, pci_express_revision, pci_express_configurations, max_pci_express_lanes, sockets_supported, max_cpu_configuration,
                thermal_solution_specification, tjunction_celsius, package_size_mm, intel_gaussian_neural_accelerator_version,
                intel_thread_director, intel_dl_boost, intel_optane_memory_supported, intel_speed_shift_technology,
                intel_turbo_boost_max_technology_3_0, intel_turbo_boost_technology_version, intel_hyper_threading_technology, intel_64,
                instruction_set, instruction_set_extensions, idle_states, enhanced_intel_speedstep_technology, thermal_monitoring_technologies,
                intel_volume_management_device_vmd, intel_vpro_eligibility, intel_threat_detection_technology_tdt, intel_active_management_technology_amt,
                intel_standard_manageability_ism, intel_one_click_recovery, intel_hardware_shield_eligibility, intel_control_flow_enforcement_technology,
                intel_total_memory_encryption_multi_key, intel_total_memory_encryption, intel_aes_new_instructions, intel_secure_key, intel_os_guard,
                intel_trusted_execution_technology, execute_disable_bit, intel_boot_guard, mode_based_execute_control_mbec, intel_stable_it_platform_program_sipp,
                intel_virtualization_technology_with_redirect_protection_vt_rp, intel_virtualization_technology_vtx, intel_virtualization_technology_for_directed_io_vtd,
                intel_vtx_with_extended_page_tables_ept, manufacturer, inventory
            ) VALUES (
                ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
            )
        `;
        const params = [
            cpuData.product_collection,
            cpuData.code_name,
            cpuData.vertical_segment,
            cpuData.processor_number,
            cpuData.lithography,
            cpuData.recommended_customer_price_min,
            cpuData.recommended_customer_price_max,
            cpuData.total_cores,
            cpuData.performance_cores,
            cpuData.efficient_cores,
            cpuData.total_threads,
            cpuData.max_turbo_frequency_ghz,
            cpuData.turbo_boost_max_3_0_frequency_ghz,
            cpuData.performance_core_max_turbo_frequency_ghz,
            cpuData.efficient_core_max_turbo_frequency_ghz,
            cpuData.performance_core_base_frequency_ghz,
            cpuData.efficient_core_base_frequency_ghz,
            cpuData.cache_mb,
            cpuData.total_l2_cache_mb,
            cpuData.processor_base_power_w,
            cpuData.maximum_turbo_power_w,
            cpuData.launch_date,
            cpuData.embedded_options_available,
            cpuData.max_memory_size_gb,
            cpuData.memory_types,
            cpuData.max_memory_channels,
            cpuData.max_memory_bandwidth_gb_s,
            cpuData.ecc_memory_supported,
            cpuData.gpu_name,
            cpuData.graphics_base_frequency_mhz,
            cpuData.graphics_max_dynamic_frequency_ghz,
            cpuData.graphics_output,
            cpuData.execution_units,
            cpuData.max_resolution_hdmi,
            cpuData.max_resolution_dp,
            cpuData.max_resolution_edp,
            cpuData.directx_support,
            cpuData.opengl_support,
            cpuData.opencl_support,
            cpuData.multi_format_codec_engines,
            cpuData.intel_quick_sync_video,
            cpuData.intel_clear_video_hd_technology,
            cpuData.displays_supported,
            cpuData.device_id,
            cpuData.dmi_revision,
            cpuData.max_dmi_lanes,
            cpuData.scalability,
            cpuData.pci_express_revision,
            cpuData.pci_express_configurations,
            cpuData.max_pci_express_lanes,
            cpuData.sockets_supported,
            cpuData.max_cpu_configuration,
            cpuData.thermal_solution_specification,
            cpuData.tjunction_celsius,
            cpuData.package_size_mm,
            cpuData.intel_gaussian_neural_accelerator_version,
            cpuData.intel_thread_director,
            cpuData.intel_dl_boost,
            cpuData.intel_optane_memory_supported,
            cpuData.intel_speed_shift_technology,
            cpuData.intel_turbo_boost_max_technology_3_0,
            cpuData.intel_turbo_boost_technology_version,
            cpuData.intel_hyper_threading_technology,
            cpuData.intel_64,
            cpuData.instruction_set,
            cpuData.instruction_set_extensions,
            cpuData.idle_states,
            cpuData.enhanced_intel_speedstep_technology,
            cpuData.thermal_monitoring_technologies,
            cpuData.intel_volume_management_device_vmd,
            cpuData.intel_vpro_eligibility,
            cpuData.intel_threat_detection_technology_tdt,
            cpuData.intel_active_management_technology_amt,
            cpuData.intel_standard_manageability_ism,
            cpuData.intel_one_click_recovery,
            cpuData.intel_hardware_shield_eligibility,
            cpuData.intel_control_flow_enforcement_technology,
            cpuData.intel_total_memory_encryption_multi_key,
            cpuData.intel_total_memory_encryption,
            cpuData.intel_aes_new_instructions,
            cpuData.intel_secure_key,
            cpuData.intel_os_guard,
            cpuData.intel_trusted_execution_technology,
            cpuData.execute_disable_bit,
            cpuData.intel_boot_guard,
            cpuData.mode_based_execute_control_mbec,
            cpuData.intel_stable_it_platform_program_sipp,
            cpuData.intel_virtualization_technology_with_redirect_protection_vt_rp,
            cpuData.intel_virtualization_technology_vtx,
            cpuData.intel_virtualization_technology_for_directed_io_vtd,
            cpuData.intel_vtx_with_extended_page_tables_ept,
            cpuData.manufacturer,
            cpuData.inventory
        ];
        const result = await queryDatabase(db, query, params);
        queryCache.clear(); // Invalidate all cache after insert
        return { success: true, id: result.insertId };
    } catch (error) {
        console.error('Error adding new CPU:', error);
        return { success: false, error: error.message };
    }
}

async function deleteCPU(db, cpuId) {
    try {
        const query = 'DELETE FROM cpu_specs WHERE id = ?';
        await queryDatabase(db, query, [cpuId]);
        queryCache.clear();
        return { success: true };
    } catch (error) {
        console.error('Error deleting CPU:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    queryDatabase,
    getCPUs,
    getCPUById,
    addNewCPU,
    deleteCPU
};
