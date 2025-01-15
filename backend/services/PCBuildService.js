const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { generateId } = require('../utils/generateId');

class PCBuildService {
    async getAllBuilds() {
        return sequelizeMaster.query('SELECT * FROM pc_components.builds WHERE is_active = 1 ORDER BY created_at DESC', {
            type: QueryTypes.SELECT
        });
    }

    async getBuildById(id) {
        const rows = await sequelizeMaster.query('SELECT * FROM pc_components.builds WHERE build_id = ?', {
            replacements: [id], type: QueryTypes.SELECT
        });
        return rows[0] || null;
    }

    async createBuild(data) {
        const id = generateId();

        // JSON array fields that need JSON.stringify
        const jsonFields = [
            'tags', 'ram_ids', 'storage_ids', 'fan_ids',
            'expansion_card_ids', 'monitor_ids', 'cable_ids', 'peripheral_ids',
            'compatibility_issues'
        ];

        // All allowed columns (excluding build_id, created_at, updated_at)
        const allowed = [
            'name', 'user_id', 'description', 'build_purpose', 'tags',
            'cpu_id', 'motherboard_id', 'gpu_id', 'psu_id', 'case_id', 'cooler_id',
            'ram_ids', 'storage_ids', 'fan_ids',
            'expansion_card_ids', 'monitor_ids', 'cable_ids', 'peripheral_ids',
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

        await sequelizeMaster.query(sql, { replacements: values, type: QueryTypes.INSERT });
        const rows = await sequelizeMaster.query('SELECT * FROM pc_components.builds WHERE build_id = ?', {
            replacements: [id], type: QueryTypes.SELECT
        });
        return rows[0] || null;
    }

    async updateBuild(id, data) {
        const fields = [];
        const values = [];

        // JSON array fields that need JSON.stringify
        const jsonFields = [
            'tags', 'ram_ids', 'storage_ids', 'fan_ids',
            'expansion_card_ids', 'monitor_ids', 'cable_ids', 'peripheral_ids',
            'compatibility_issues'
        ];

        // All allowed columns
        const allowed = [
            'name', 'user_id', 'description', 'build_purpose', 'tags',
            'cpu_id', 'motherboard_id', 'gpu_id', 'psu_id', 'case_id', 'cooler_id',
            'ram_ids', 'storage_ids', 'fan_ids',
            'expansion_card_ids', 'monitor_ids', 'cable_ids', 'peripheral_ids',
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

        if (fields.length === 0) return null;

        values.push(id);

        await sequelizeMaster.query(`UPDATE pc_components.builds SET ${fields.join(', ')} WHERE build_id = ?`, {
            replacements: values, type: QueryTypes.UPDATE
        });
        const rows = await sequelizeMaster.query('SELECT * FROM pc_components.builds WHERE build_id = ?', {
            replacements: [id], type: QueryTypes.SELECT
        });
        return rows[0] || null;
    }

    async deleteBuild(id) {
        await sequelizeMaster.query('UPDATE pc_components.builds SET is_active = 0 WHERE build_id = ?', {
            replacements: [id], type: QueryTypes.UPDATE
        });
        return true;
    }
}

module.exports = new PCBuildService();
