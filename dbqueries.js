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

async function getPurchaseHistory(db) {
    const query = `
        SELECT
            c.first_name,
            c.last_name,
            c.email,
            c.phone_number,
            c.street_address,
            ps.sm_name,
            ps.sm_maker,
            ps.sm_price,
            ps.color,
            ps.ram,
            ps.rom,
            od.order_date
        FROM customer_data.order_details od
        JOIN master_specs_db.phone_specs ps ON od.phone_id = ps.id
        JOIN customer_data.customer_info c ON od.customer_id = c.customer_id
        ORDER BY od.order_date DESC
    `;
    return await queryDatabase(db, query);
}

async function getCustomerInfo(db, customerId) {
    let query = 'SELECT * FROM customer_data.customer_info';
    let params = [];

    if (customerId) {
        query += ' WHERE customer_id = ?';
        params.push(customerId);
    }

    query += ' ORDER BY customer_id';

    return await queryDatabase(db, query, params);
}

module.exports = {
    queryDatabase,
    getProducts,
    getBrands,
    getModels,
    getProductById,
    getPurchaseHistory,
    getCustomerInfo
};
