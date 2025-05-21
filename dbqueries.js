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

module.exports = {
    queryDatabase,
    getProducts,
    getBrands,
    getModels,
    getProductById,

};
