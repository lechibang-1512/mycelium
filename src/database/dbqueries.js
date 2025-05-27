// dbQueries.js
const { performance } = require('perf_hooks');

// Helper function for database queries and performance measuring
async function queryDatabase(db, sql, params = []) {
    const startTime = performance.now();
    try {
        const [rows] = await db.execute(sql, params);
        const endTime = performance.now();
        console.log(`Query Time: ${endTime - startTime} ms`);
        return rows;
    } catch (error) {
        console.error("Database Query Failed:", error);
        throw error;
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

    return await queryDatabase(db, query, params);
}

async function getBrands(db) {
    const query = 'SELECT DISTINCT sm_maker FROM phone_specs ORDER BY sm_maker';
    return await queryDatabase(db, query);
}

async function getModels(db) {
    const query = 'SELECT DISTINCT sm_name FROM phone_specs ORDER BY sm_name';
    return await queryDatabase(db, query);
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
    return await queryDatabase(db, query, [productId]);
}

async function getVariantsCount(db, productId) {
    try {
        // First get the current product to find its model name and maker
        const products = await getProductById(db, productId);
        if (!products || products.length === 0) {
            return 0;
        }
        
        const product = products[0];
        
        // Count variants with the same model name and maker
        const query = `
            SELECT COUNT(*) as count
            FROM phone_specs
            WHERE sm_name = ? AND sm_maker = ?`;
            
        const result = await queryDatabase(db, query, [product.sm_name, product.sm_maker]);
        return result[0].count;
    } catch (error) {
        console.error('Error getting variants count:', error);
        return 0;
    }
}

async function getProductVariants(db, productId) {
    try {
        // First get the current product to find its model name and maker
        const products = await getProductById(db, productId);
        const currentProduct = products && products.length > 0 ? products[0] : null;
        
        if (!currentProduct) {
            console.log('No current product found for ID:', productId);
            return [];
        }
        
        console.log(`Finding variants for model: ${currentProduct.sm_name} by ${currentProduct.sm_maker}`);
        
        // Then get all variants of the same model from the same maker
        const query = `
            SELECT id, sm_name, sm_maker, sm_price, sm_inventory,
                color, ram, rom, processor, display_size, battery_capacity,
                rear_camera_main, front_camera
            FROM phone_specs 
            WHERE sm_name = ? AND sm_maker = ?
            ORDER BY color, CASE 
                WHEN ram REGEXP '^[0-9]+GB$' THEN CAST(SUBSTRING(ram, 1, LOCATE('GB', ram) - 1) AS UNSIGNED)
                ELSE 0 END DESC, 
                CASE 
                WHEN rom REGEXP '^[0-9]+GB$' THEN CAST(SUBSTRING(rom, 1, LOCATE('GB', rom) - 1) AS UNSIGNED)
                WHEN rom REGEXP '^[0-9]+TB$' THEN CAST(SUBSTRING(rom, 1, LOCATE('TB', rom) - 1) AS UNSIGNED) * 1024
                ELSE 0 END DESC, 
                sm_price`;
            
        const variants = await queryDatabase(db, query, [currentProduct.sm_name, currentProduct.sm_maker]);
        console.log(`Found ${variants.length} variants for ${currentProduct.sm_name}`);
        
        return variants;
    } catch (error) {
        console.error('Error in getProductVariants:', error);
        return [];
    }
}

// Inventory Management Functions

async function getInventoryStats(db) {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as totalProducts,
                SUM(CASE WHEN sm_inventory <= 10 AND sm_inventory > 0 THEN 1 ELSE 0 END) as lowStock,
                SUM(CASE WHEN sm_inventory = 0 THEN 1 ELSE 0 END) as outOfStock,
                SUM(sm_price * sm_inventory) as totalValue
            FROM phone_specs`;
        
        const result = await queryDatabase(db, statsQuery);
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
            query += ' AND (sm_name LIKE ? OR sm_maker LIKE ?)';
            const searchTerm = `%${filters.search.trim()}%`;
            params.push(searchTerm, searchTerm);
        }
        
        if (filters.category && filters.category !== '') {
            // For now, all products are smartphones, but we can extend this later
            query += ' AND 1=1'; // Placeholder for category filter
        }
        
        if (filters.stockLevel && filters.stockLevel !== '') {
            switch (filters.stockLevel) {
                case 'in-stock':
                    query += ' AND sm_inventory > 10';
                    break;
                case 'low-stock':
                    query += ' AND sm_inventory <= 10 AND sm_inventory > 0';
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

// Advanced product filtering with pagination
async function getProductsAdvanced(db, filters = {}, page = 1, limit = 12) {
    // Modified query to group products by model name and maker
    // We'll select only one product per unique model name and maker combination
    let query = `
        SELECT ps1.id, ps1.sm_name, ps1.sm_maker, ps1.sm_price, 
            IFNULL(SUM(ps2.sm_inventory), ps1.sm_inventory) as total_inventory,
            ps1.color, ps1.processor, ps1.ram, ps1.rom, ps1.display_size, ps1.battery_capacity,
            COUNT(ps2.id) as variant_count
        FROM phone_specs ps1
        LEFT JOIN phone_specs ps2 ON ps1.sm_name = ps2.sm_name AND ps1.sm_maker = ps2.sm_maker
        WHERE 1=1
    `;
    
    const params = [];
    
    // Search filter
    if (filters.search) {
        query += ' AND (ps1.sm_name LIKE ? OR ps1.sm_maker LIKE ? OR ps1.processor LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Brand filter
    if (filters.brand) {
        query += ' AND ps1.sm_maker = ?';
        params.push(filters.brand);
    }
    
    // Price filter
    if (filters.price) {
        const [min, max] = filters.price.split('-');
        if (max === undefined) {
            // Handle "1000+" case
            query += ' AND ps1.sm_price >= ?';
            params.push(parseInt(min));
        } else {
            query += ' AND ps1.sm_price BETWEEN ? AND ?';
            params.push(parseInt(min), parseInt(max));
        }
    }
    
    // Stock filter - now applies to total inventory across variants
    if (filters.stock) {
        switch (filters.stock) {
            case 'in-stock':
                query += ' AND ps1.sm_inventory > 10';
                break;
            case 'low-stock':
                query += ' AND ps1.sm_inventory BETWEEN 1 AND 10';
                break;
            case 'out-of-stock':
                query += ' AND ps1.sm_inventory = 0';
                break;
        }
    }

    // Group by to get only unique model+maker combinations
    query += ' GROUP BY ps1.sm_name, ps1.sm_maker';
    
    // Sorting - now must be done after GROUP BY
    let orderBy;
    switch (filters.sort) {
        case 'price-low':
            orderBy = ' ORDER BY ps1.sm_price ASC';
            break;
        case 'price-high':
            orderBy = ' ORDER BY ps1.sm_price DESC';
            break;
        case 'brand':
            orderBy = ' ORDER BY ps1.sm_maker ASC, ps1.sm_name ASC';
            break;
        case 'stock':
            orderBy = ' ORDER BY total_inventory DESC';
            break;
        default:
            orderBy = ' ORDER BY ps1.sm_name ASC';
    }
    
    // Get total count of unique products for pagination
    const countQuery = `
        SELECT COUNT(*) as total FROM (
            SELECT DISTINCT sm_name, sm_maker
            FROM phone_specs
            WHERE 1=1
    `;
    
    let countParams = [...params]; // Copy the params for the count query
    
    if (filters.search) {
        countQuery += ' AND (sm_name LIKE ? OR sm_maker LIKE ? OR processor LIKE ?)';
        // searchTerm params are already in countParams
    }
    
    if (filters.brand) {
        countQuery += ' AND sm_maker = ?';
        // brand param is already in countParams
    }
    
    // Price and stock filters need to be applied for count query too
    if (filters.price) {
        const [min, max] = filters.price.split('-');
        if (max === undefined) {
            countQuery += ' AND sm_price >= ?';
            // price param is already in countParams
        } else {
            countQuery += ' AND sm_price BETWEEN ? AND ?';
            // price params are already in countParams
        }
    }
    
    if (filters.stock) {
        switch (filters.stock) {
            case 'in-stock':
                countQuery += ' AND sm_inventory > 10';
                break;
            case 'low-stock':
                countQuery += ' AND sm_inventory BETWEEN 1 AND 10';
                break;
            case 'out-of-stock':
                countQuery += ' AND sm_inventory = 0';
                break;
        }
    }
    
    const finalCountQuery = countQuery + ') as unique_products';
    const countResult = await queryDatabase(db, finalCountQuery, countParams);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);
    
    // Apply ordering and pagination
    const finalQuery = query + orderBy + ' LIMIT ? OFFSET ?';
    const offset = (page - 1) * limit;
    params.push(limit, offset);
    
    const products = await queryDatabase(db, finalQuery, params);
    
    return {
        products,
        currentPage: page,
        totalPages,
        total,
        hasNext: page < totalPages,
        hasPrev: page > 1
    };
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
