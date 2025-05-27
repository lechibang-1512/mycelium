// dbQueries.js
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
           (Array.isArray(rows) && rows.length < 10000) || 
           (!Array.isArray(rows) && Object.keys(rows).length < 100)) {
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

// Query functions

async function getProducts(db, filters = {}) {
    let query = `
        SELECT id, sm_name, sm_maker, sm_price, sm_inventory,
            color, water_and_dust_rating, processor, process_node,
            cpu_cores, cpu_frequency, gpu, memory_type, ram, rom,
            expandable_memory, length_mm, width_mm, thickness_mm,
            weight_g, display_size, resolution, pixel_density,
            refresh_rate, brightness, display_features,
            rear_camera_main, rear_camera_macro, rear_camera_features,
            rear_video_resolution, front_camera, front_camera_features,
            front_video_resolution, battery_capacity, fast_charging,
            connector, security_features, sim_card, nfc, network_bands,
            wireless_connectivity, navigation, audio_jack,
            audio_playback, video_playback, sensors, operating_system,
            package_contents
        FROM phone_specs
        WHERE 1=1
    `;

    const params = [];

    if (filters.brand) {
        query += ' AND sm_maker = ?';
        params.push(filters.brand);
    }
    if (filters.model) {
        query += ' AND sm_name = ?';
        params.push(filters.model);
    }

    query += ' ORDER BY sm_maker, sm_name';

    // return await queryDatabase(db, query, params); // Old line
    // MODIFIED: Enabled caching. TTL choice depends on data volatility and filter commonality.
    // Using 'short' TTL as an example. If filters are very dynamic, caching might be less effective.
    return await queryDatabase(db, query, params, { use: true, ttl: 'short' });
}

async function getBrands(db) {
    const query = 'SELECT DISTINCT sm_maker FROM phone_specs ORDER BY sm_maker';
    return await queryDatabase(db, query, [], { use: true, ttl: 'long' }); // CORRECTED: Caching for brands, brands are fairly static
}

async function getModels(db) {
    const query = 'SELECT DISTINCT sm_name FROM phone_specs ORDER BY sm_name';
    return await queryDatabase(db, query, [], { use: true, ttl: 'long' }); // CORRECTED: Caching for models, models are fairly static
}

async function getProductById(db, productId) {
    const query = `
        SELECT id, sm_name, sm_maker, sm_price, sm_inventory,
               color, water_and_dust_rating, processor, process_node,
               cpu_cores, cpu_frequency, gpu, memory_type, ram, rom,
               expandable_memory, length_mm, width_mm, thickness_mm,
               weight_g, display_size, resolution, pixel_density,
               refresh_rate, brightness, display_features,
               rear_camera_main, rear_camera_macro, rear_camera_features,
               rear_video_resolution, front_camera, front_camera_features,
               front_video_resolution, battery_capacity, fast_charging,
               connector, security_features, sim_card, nfc, network_bands,
               wireless_connectivity, navigation, audio_jack,
               audio_playback, video_playback, sensors, operating_system,
               package_contents
        FROM phone_specs WHERE id = ?`;
    return await queryDatabase(db, query, [productId], { use: true, ttl: 'medium' }); // MODIFIED: Enabled caching
}

// REFACTORED: Optimized to avoid fetching all product details if only count is needed.
async function getVariantsCount(db, productId) {
    try {
        // Select only necessary fields for identifying the base product model
        const productInfoQuery = 'SELECT sm_name, sm_maker FROM phone_specs WHERE id = ? LIMIT 1';
        // Cache this lookup as product ID to name/maker mapping is stable
        const productInfoResult = await queryDatabase(db, productInfoQuery, [productId], { use: true, ttl: 'medium' });

        if (!productInfoResult || productInfoResult.length === 0) {
            console.warn(`No product found for ID ${productId} in getVariantsCount`);
            return 0;
        }
        const { sm_name, sm_maker } = productInfoResult[0];

        // Count variants based on the fetched name and maker
        const countQuery = 'SELECT COUNT(*) as count FROM phone_specs WHERE sm_name = ? AND sm_maker = ?';
        // Cache the count result as it can be frequently requested
        const result = await queryDatabase(db, countQuery, [sm_name, sm_maker], { use: true, ttl: 'medium' });
        return result[0].count;
    } catch (error) {
        console.error(`Error getting variants count for product ID ${productId}:`, error);
        return 0;
    }
}

async function getProductVariants(db, productId) {
    try {
        // OPTIMIZED: Single query using JOIN instead of multiple queries
        // PERFORMANCE NOTE: The ORDER BY clause on RAM and ROM involves string manipulation (REGEXP, CAST, SUBSTRING, LOCATE)
        // which can be inefficient and may prevent optimal index usage for sorting.
        // Ideal solution: Add numerical columns for RAM/ROM (e.g., ram_gb, rom_gb) in the database schema
        // and sort by those numerical columns for significantly better performance.
        const query = `
            SELECT 
                v.id, v.sm_name, v.sm_maker, v.sm_price, v.sm_inventory,
                v.color, v.ram, v.rom, v.processor, v.display_size, v.battery_capacity,
                v.rear_camera_main, v.front_camera
            FROM phone_specs p
            INNER JOIN phone_specs v ON p.sm_name = v.sm_name AND p.sm_maker = v.sm_maker
            WHERE p.id = ?
            ORDER BY 
                v.color,
                CASE 
                    WHEN v.ram REGEXP '^[0-9]+GB$' THEN CAST(SUBSTRING(v.ram, 1, LOCATE('GB', v.ram) - 1) AS UNSIGNED)
                    ELSE 0 
                END DESC,
                CASE 
                    WHEN v.rom REGEXP '^[0-9]+GB$' THEN CAST(SUBSTRING(v.rom, 1, LOCATE('GB', v.rom) - 1) AS UNSIGNED)
                    WHEN v.rom REGEXP '^[0-9]+TB$' THEN CAST(SUBSTRING(v.rom, 1, LOCATE('TB', v.rom) - 1) AS UNSIGNED) * 1024
                    ELSE 0 
                END DESC,
                v.sm_price ASC
        `;
        
        // const variants = await queryDatabase(db, query, [productId], true); // Old incorrect call
        // CORRECTED: Ensure caching is explicitly defined with a TTL from config
        const variants = await queryDatabase(db, query, [productId], { use: true, ttl: 'medium' }); 
        console.log(`Found ${variants.length} variants for product ID: ${productId}`);
        
        return variants;
    } catch (error) {
        console.error('Error in getProductVariants:', error);
        return [];
    }
}

// Inventory Management Functions

async function getInventoryStats(db) {
    try {
        // OPTIMIZED: Single query with better indexing support
        const statsQuery = `
            SELECT 
                COUNT(*) as totalProducts,
                SUM(CASE WHEN sm_inventory > 0 AND sm_inventory <= 10 THEN 1 ELSE 0 END) as lowStock,
                SUM(CASE WHEN sm_inventory = 0 THEN 1 ELSE 0 END) as outOfStock,
                ROUND(SUM(sm_price * sm_inventory), 2) as totalValue
            FROM phone_specs
        `;
        
        // const result = await queryDatabase(db, statsQuery, [], true); // Old incorrect call
        // CORRECTED: Caching for stats, using 'short' TTL as inventory can change frequently.
        const result = await queryDatabase(db, statsQuery, [], { use: true, ttl: 'short' }); 
        return result[0];
    } catch (error) {
        console.error('Error getting inventory stats:', error);
        return {
            totalProducts: 0,
            lowStock: 0,
            outOfStock: 0,
            totalValue: 0
        };
    }
}

async function getInventoryData(db, filters = {}, page = 1, limit = 20) {
    try {
        let query = `
            SELECT 
                id,
                sm_name as productName,
                sm_maker as brand,
                'smartphones' as category,
                sm_inventory as currentStock,
                10 as minStock,
                sm_price as price,
                CASE 
                    WHEN sm_inventory = 0 THEN 'out-of-stock'
                    WHEN sm_inventory <= 10 THEN 'low-stock'
                    ELSE 'in-stock'
                END as status,
                color,
                ram,
                rom
            FROM phone_specs 
            WHERE 1=1
        `;
        
        const params = [];
        
        // Apply filters
        if (filters.search && filters.search.trim()) {
            // PERFORMANCE NOTE: LIKE '%term%' searches can be slow and may not fully utilize standard B-tree indexes (e.g., idx_phone_specs_search).
            // Consider using a FULLTEXT index and MATCH...AGAINST for more efficient text searching if your database (e.g., MySQL) supports it.
            // query += ' AND (sm_name LIKE ? OR sm_maker LIKE ?)'; // Original search
            query += ' AND (sm_name LIKE ? OR sm_maker LIKE ? OR processor LIKE ?)'; // MODIFIED: Added processor to search scope based on idx_phone_specs_search
            const searchTerm = `%${filters.search.trim()}%`;
            // params.push(searchTerm, searchTerm); // Original params
            params.push(searchTerm, searchTerm, searchTerm); // MODIFIED: Added searchTerm for processor
        }
        
        if (filters.category && filters.category !== '') {
            // For now, all products are smartphones, but we can extend this later
            query += ' AND 1=1'; // Placeholder for category filter
        }
        
        if (filters.stockLevel && filters.stockLevel !== '') {
            switch (filters.stockLevel) {
                case 'in-stock':
                    break;
                case 'out-of-stock':
                    query += ' AND sm_inventory = 0';
                    break;
            }
        }
        
        // Add ordering and pagination
        query += ' ORDER BY sm_maker, sm_name';
        
        // Get total count for pagination
        const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
        const totalResult = await queryDatabase(db, countQuery, params);
        const total = totalResult[0].total;
        
        // Add pagination
        const offset = (page - 1) * limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        const data = await queryDatabase(db, query, params);
        
        return {
            data,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    } catch (error) {
        console.error('Error getting inventory data:', error);
        return {
            data: [],
            total: 0,
            page: 1,
            totalPages: 0
        };
    }
}

async function updateProductStock(db, productId, newStock) {
    try {
        const query = 'UPDATE phone_specs SET sm_inventory = ? WHERE id = ?';
        await queryDatabase(db, query, [newStock, productId]);
        return { success: true };
    } catch (error) {
        console.error('Error updating product stock:', error);
        return { success: false, error: error.message };
    }
}

async function addNewProduct(db, productData) {
    try {
        const query = `
            INSERT INTO phone_specs (
                sm_name, sm_maker, sm_price, sm_inventory, color, ram, rom
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            productData.productName,
            productData.productBrand,
            productData.productPrice,
            productData.initialStock,
            productData.color || 'Standard',
            productData.ram || '8GB',
            productData.rom || '128GB'
        ];
        
        const result = await queryDatabase(db, query, params);
        return { success: true, id: result.insertId };
    } catch (error) {
        console.error('Error adding new product:', error);
        return { success: false, error: error.message };
    }
}

async function deleteProduct(db, productId) {
    try {
        const query = 'DELETE FROM phone_specs WHERE id = ?';
        await queryDatabase(db, query, [productId]);
        return { success: true };
    } catch (error) {
        console.error('Error deleting product:', error);
        return { success: false, error: error.message };
    }
}

// FURTHER OPTIMIZED: Advanced product filtering with pagination and query optimization
async function getProductsAdvanced(db, filters = {}, page = 1, limit = 12) {
    try {
        // Cache key construction using normalized filter values
        const cacheKey = JSON.stringify({
            search: filters.search?.toLowerCase().trim() || '',
            brand: filters.brand || '',
            price: filters.price || '',
            sort: filters.sort || 'name',
            page,
            limit
        });
        
        // Try cache first for common queries with consistent parameters
        const cachedResult = queryCache.get(cacheKey);
        if (cachedResult) {
            console.log('Returning cached products result');
            return cachedResult;
        }
        
        const offset = (page - 1) * limit;
        
        // Prepare collections for query parameters
        const params = []; // Use a single params array
        
        // Efficiently build WHERE clause for both queries
        const whereConditions = [];
        
        if (filters.search) {
            const searchTerms = filters.search.trim().toLowerCase().split(/\s+/);
            
            if (searchTerms.length === 1) {
                // Simple search - use LIKE with index
                const term = `%${searchTerms[0]}%`;
                whereConditions.push('(LOWER(ps.sm_name) LIKE ? OR LOWER(ps.sm_maker) LIKE ?)');
                params.push(term, term);
            } else {
                // Multi-term search - more precise matching
                const searchConditions = [];
                searchTerms.forEach(term => {
                    const termPattern = `%${term}%`;
                    searchConditions.push('(LOWER(ps.sm_name) LIKE ? OR LOWER(ps.sm_maker) LIKE ?)');
                    params.push(termPattern, termPattern);
                });
                whereConditions.push(`(${searchConditions.join(' AND ')})`);
            }
        }
        
        if (filters.brand) {
            whereConditions.push('ps.sm_maker = ?');
            params.push(filters.brand);
        }
        
        if (filters.price) {
            const [min, max] = filters.price.split('-');
            if (max === undefined && min.endsWith('+')) {
                // Handle price range like "1000+"
                const minPrice = parseInt(min.slice(0, -1));
                whereConditions.push('ps.sm_price >= ?');
                params.push(minPrice);
            } else if (max) {
                // Regular range like "300-600"
                whereConditions.push('ps.sm_price BETWEEN ? AND ?');
                params.push(parseInt(min), parseInt(max));
            } else {
                // Single value
                whereConditions.push('ps.sm_price >= ?');
                params.push(parseInt(min));
            }
        }
        
        if (filters.stock) {
            switch (filters.stock) {
                case 'in-stock':
                    whereConditions.push('ps.sm_inventory > 10');
                    break;
                case 'low-stock':
                    whereConditions.push('ps.sm_inventory BETWEEN 1 AND 10');
                    break;
                case 'out-of-stock':
                    whereConditions.push('ps.sm_inventory = 0');
                    break;
            }
        }
        
        // Build the WHERE clause string
        const whereClause = whereConditions.length > 0 
            ? 'WHERE ' + whereConditions.join(' AND ') 
            : '';
            
        // Use a common table expression (CTE) for much better performance
        // This avoids redundant subqueries and uses indexed columns efficiently
        const mainQuery = `
            WITH unique_products AS (
                SELECT 
                    MIN(id) AS id,
                    sm_name,
                    sm_maker
                FROM phone_specs
                GROUP BY sm_name, sm_maker
            )
            SELECT 
                ps.id, 
                ps.sm_name, 
                ps.sm_maker, 
                ps.sm_price, 
                ps.sm_inventory,
                ps.color, 
                ps.processor, 
                ps.ram, 
                ps.rom, 
                ps.display_size, 
                ps.battery_capacity
            FROM phone_specs ps
            INNER JOIN unique_products up 
                ON ps.id = up.id
            ${whereClause}
        `;
        
        // Optimized COUNT query using a covering index where possible
        const countQuery = `
            SELECT COUNT(*) as total
            FROM (
                SELECT MIN(id) as id
                FROM phone_specs ps
                ${whereClause}
                GROUP BY sm_name, sm_maker
            ) AS unique_count
        `;
        
        // Apply sorting - use indexed columns for better performance
        let sortClause;
        switch (filters.sort) {
            case 'price-low':
                sortClause = 'ORDER BY ps.sm_price ASC, ps.sm_name ASC';
                break;
            case 'price-high':
                sortClause = 'ORDER BY ps.sm_price DESC, ps.sm_name ASC';
                break;
            case 'brand':
                sortClause = 'ORDER BY ps.sm_maker ASC, ps.sm_name ASC';
                break;
            default:
                sortClause = 'ORDER BY ps.sm_name ASC, ps.sm_maker ASC';
        }
        
        // Execute count query first with short caching (1 minute)
        const countResult = await queryDatabase(db, countQuery, params, // Use the unified params array
            { use: true, ttl: 'short' });
        
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);
        
        // Build final query with pagination
        const finalQuery = `${mainQuery} ${sortClause} LIMIT ? OFFSET ?`;
        const queryParams = [...params]; // Create a copy for the final query if params are modified later, or use params directly if not.
        queryParams.push(limit, offset);
        
        // Execute main query with caching appropriate to the query type
        const products = await queryDatabase(db, finalQuery, queryParams, // Use the (potentially extended) params array
            { use: true, ttl: filters.search ? 'short' : 'medium' });
        
        // Prepare response object
        const result = {
            products,
            total,
            currentPage: page,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        };
        
        // Cache the result for future requests
        queryCache.set(cacheKey, result);
        
        return result;
    } catch (error) {
        console.error('Error in getProductsAdvanced:', error);
        return {
            products: [],
            total: 0,
            currentPage: page,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
        };
    }
}

module.exports = {
    queryDatabase,
    getProducts,
    getBrands,
    getModels,
    getProductById,
    getVariantsCount,
    getProductVariants,
    // Inventory Management Functions
    getInventoryStats,
    getInventoryData,
    updateProductStock,
    addNewProduct,
    deleteProduct,
    // Advanced Product Functions
    getProductsAdvanced
};
