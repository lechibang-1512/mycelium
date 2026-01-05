const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { generateId } = require('../utils/generateId');

const COMPONENT_FIELDS = {
    ram_ids: 'ram',
    storage_ids: 'storage',
    fan_ids: 'fan',
    expansion_card_ids: 'expansion',
    monitor_ids: 'monitor',
    cable_ids: 'cable',
    peripheral_ids: 'peripheral'
};

function extractComponents(buildId, data) {
    const components = [];
    
    for (const [field, type] of Object.entries(COMPONENT_FIELDS)) {
        let items = data[field];
        if (items === undefined || items === null) continue;
        
        if (typeof items === 'string') {
            try {
                items = JSON.parse(items);
            } catch (_e) {
                continue;
            }
        }
        
        if (Array.isArray(items)) {
            for (const item of items) {
                if (!item) continue;
                let productId = null;
                let quantity = 1;
                
                if (typeof item === 'object') {
                    productId = item.id || item.product_id || item.ram_id || item.storage_id || item.fan_id || item.expansion_card_id || item.monitor_id || item.cable_id || item.peripheral_id;
                    quantity = item.quantity !== undefined ? parseInt(item.quantity, 10) : 1;
                } else if (typeof item === 'string') {
                    productId = item;
                }
                
                if (productId) {
                    components.push({
                        build_id: buildId,
                        product_id: productId,
                        quantity: isNaN(quantity) ? 1 : quantity,
                        component_type: type
                    });
                }
            }
        }
    }
    
    return components;
}

function formatBuildWithComponents(build, components) {
    const formatted = { ...build };
    
    // Initialize empty arrays
    formatted.ram_ids = [];
    formatted.storage_ids = [];
    formatted.fan_ids = [];
    formatted.expansion_card_ids = [];
    formatted.monitor_ids = [];
    formatted.cable_ids = [];
    formatted.peripheral_ids = [];
    
    for (const comp of components) {
        const pid = comp.product_id;
        const qty = comp.quantity;
        
        switch (comp.component_type) {
            case 'ram':
                formatted.ram_ids.push({ id: pid, product_id: pid, quantity: qty });
                break;
            case 'storage':
                formatted.storage_ids.push({ id: pid, product_id: pid, quantity: qty });
                break;
            case 'fan':
                formatted.fan_ids.push({ id: pid, product_id: pid, quantity: qty });
                break;
            case 'expansion':
                formatted.expansion_card_ids.push(pid);
                break;
            case 'monitor':
                formatted.monitor_ids.push(pid);
                break;
            case 'cable':
                formatted.cable_ids.push(pid);
                break;
            case 'peripheral':
                formatted.peripheral_ids.push(pid);
                break;
        }
    }
    
    return formatted;
}

async function saveComponents(transaction, buildId, components, passedTypes) {
    if (!passedTypes || passedTypes.length === 0) return;
    
    // 1. Delete existing components of the passed types for this build
    await sequelizeMaster.query(
        'DELETE FROM pc_components.build_components WHERE build_id = ? AND component_type IN (?)',
        {
            replacements: [buildId, passedTypes],
            type: QueryTypes.DELETE,
            transaction
        }
    );
    
    // 2. Insert new components
    if (components.length > 0) {
        for (const comp of components) {
            if (passedTypes.includes(comp.component_type)) {
                await sequelizeMaster.query(
                    'INSERT INTO pc_components.build_components (build_id, product_id, quantity, component_type) VALUES (?, ?, ?, ?)',
                    {
                        replacements: [comp.build_id, comp.product_id, comp.quantity, comp.component_type],
                        type: QueryTypes.INSERT,
                        transaction
                    }
                );
            }
        }
    }
}

class PCBuildService {
    async getAllBuilds() {
        const builds = await sequelizeMaster.query('SELECT * FROM pc_components.builds WHERE is_active = 1 ORDER BY created_at DESC', {
            type: QueryTypes.SELECT
        });
        
        if (builds.length === 0) return [];
        
        const buildIds = builds.map(b => b.build_id);
        const components = await sequelizeMaster.query(
            'SELECT build_id, product_id, quantity, component_type FROM pc_components.build_components WHERE build_id IN (?)',
            { replacements: [buildIds], type: QueryTypes.SELECT }
        );
        
        const compMap = {};
        for (const comp of components) {
            if (!compMap[comp.build_id]) compMap[comp.build_id] = [];
            compMap[comp.build_id].push(comp);
        }
        
        return builds.map(b => formatBuildWithComponents(b, compMap[b.build_id] || []));
    }

    async getBuildById(id) {
        const rows = await sequelizeMaster.query('SELECT * FROM pc_components.builds WHERE build_id = ?', {
            replacements: [id], type: QueryTypes.SELECT
        });
        if (!rows[0]) return null;
        
        const build = rows[0];
        const components = await sequelizeMaster.query(
            'SELECT product_id, quantity, component_type FROM pc_components.build_components WHERE build_id = ?',
            { replacements: [id], type: QueryTypes.SELECT }
        );
        
        return formatBuildWithComponents(build, components);
    }

    async createBuild(data) {
        const id = generateId();

        const jsonFields = ['tags', 'compatibility_issues'];
        const allowed = [
            'name', 'user_id', 'description', 'build_purpose', 'tags',
            'cpu_id', 'motherboard_id', 'gpu_id', 'psu_id', 'case_id', 'cooler_id',
            'total_tdp_watts', 'estimated_price', 'total_price', 'currency',
            'image_url', 'notes', 'is_public',
            'status', 'compatibility_status', 'compatibility_issues'
        ];

        const keys = ['build_id'];
        const values = [id];

        for (const key of allowed) {
            if (data[key] !== undefined) {
                keys.push(key);
                if (jsonFields.includes(key) && typeof data[key] !== 'string') {
                    values.push(JSON.stringify(data[key]));
                } else {
                    values.push(data[key]);
                }
            }
        }

        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO pc_components.builds (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders})`;

        const t = await sequelizeMaster.transaction();
        try {
            await sequelizeMaster.query(sql, { replacements: values, type: QueryTypes.INSERT, transaction: t });
            
            const components = extractComponents(id, data);
            const allTypes = Object.values(COMPONENT_FIELDS);
            await saveComponents(t, id, components, allTypes);
            
            await t.commit();
        } catch (error) {
            await t.rollback();
            throw error;
        }

        return this.getBuildById(id);
    }

    async updateBuild(id, data) {
        const fields = [];
        const values = [];

        const jsonFields = ['tags', 'compatibility_issues'];
        const allowed = [
            'name', 'user_id', 'description', 'build_purpose', 'tags',
            'cpu_id', 'motherboard_id', 'gpu_id', 'psu_id', 'case_id', 'cooler_id',
            'total_tdp_watts', 'estimated_price', 'total_price', 'currency',
            'image_url', 'notes', 'is_public',
            'status', 'compatibility_status', 'compatibility_issues'
        ];

        for (const key of allowed) {
            if (data[key] !== undefined) {
                fields.push(`\`${key}\` = ?`);
                if (jsonFields.includes(key) && typeof data[key] !== 'string') {
                    values.push(JSON.stringify(data[key]));
                } else {
                    values.push(data[key]);
                }
            }
        }

        const passedTypes = [];
        for (const [field, type] of Object.entries(COMPONENT_FIELDS)) {
            if (data[field] !== undefined) {
                passedTypes.push(type);
            }
        }

        const t = await sequelizeMaster.transaction();
        try {
            if (fields.length > 0) {
                const updateValues = [...values, id];
                await sequelizeMaster.query(`UPDATE pc_components.builds SET ${fields.join(', ')} WHERE build_id = ?`, {
                    replacements: updateValues, type: QueryTypes.UPDATE, transaction: t
                });
            }

            if (passedTypes.length > 0) {
                const components = extractComponents(id, data);
                await saveComponents(t, id, components, passedTypes);
            }

            await t.commit();
        } catch (error) {
            await t.rollback();
            throw error;
        }

        return this.getBuildById(id);
    }

    async deleteBuild(id) {
        await sequelizeMaster.query('UPDATE pc_components.builds SET is_active = 0 WHERE build_id = ?', {
            replacements: [id], type: QueryTypes.UPDATE
        });
        return true;
    }
}

module.exports = new PCBuildService();
