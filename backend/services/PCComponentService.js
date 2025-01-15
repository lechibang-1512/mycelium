const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { generateId } = require('../utils/generateId');
const { ValidationError } = require('../utils/errors');

/**
 * Validate that a string is a safe SQL identifier (alphanumeric + underscores only).
 */
function isValidIdentifier(name) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

class PCComponentService {
    /**
     * Get the primary key column name for a given type
     */
    _getPrimaryKey(type) {
        const mapping = {
            'cpu': 'cpu_id',
            'gpu': 'gpu_id',
            'motherboard': 'motherboard_id',
            'ram': 'ram_id',
            'storage': 'storage_id',
            'psu': 'psu_id',
            'case': 'case_id',
            'cooling': 'cooler_id',
            'fan': 'fan_id',
            'monitor': 'monitor_id',
            'keyboard': 'keyboard_id',
            'mouse': 'mouse_id',
            'headphone': 'headphone_id',
            'headset': 'headset_id',
            'cable': 'cable_id',
            'expansion': 'expansion_card_id'
        };
        return mapping[type] || `${type}_id`;
    }

    /**
     * Get the table name for a given type
     */
    _getTableName(type) {
        const mapping = {
            'cpu': 'cpu',
            'gpu': 'gpu',
            'motherboard': 'motherboard',
            'ram': 'ram',
            'storage': 'storage',
            'psu': 'power_supply',
            'case': 'pc_cases',
            'cooling': 'cpu_coolers',
            'fan': 'case_fans',
            'monitor': 'monitors',
            'keyboard': 'keyboard',
            'mouse': 'mouse',
            'headphone': 'headphones',
            'headset': 'headsets',
            'cable': 'cables',
            'expansion': 'expansion_cards'
        };
        return mapping[type] || type;
    }

    /**
     * Get all valid component types
     */
    getValidTypes() {
        return ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case', 'cooling', 'fan', 'monitor', 'keyboard', 'mouse', 'headphone', 'headset', 'cable', 'expansion'];
    }

    /**
     * Validate and resolve table/pk names for a given type.
     */
    _resolveType(type) {
        const tableName = this._getTableName(type);
        const pk = this._getPrimaryKey(type);
        if (!isValidIdentifier(tableName) || !isValidIdentifier(pk)) {
            throw new ValidationError(`Invalid component type: '${type}'`);
        }
        return { tableName, pk };
    }

    /**
     * Get the schema columns for a component type
     */
    async getSchema(type) {
        if (this.schemaCache && this.schemaCache[type]) return this.schemaCache[type];
        const { tableName } = this._resolveType(type);
        const schema = await sequelizeMaster.query(`SHOW COLUMNS FROM pc_components.${tableName}`, {
            type: QueryTypes.SELECT
        });
        if (!this.schemaCache) this.schemaCache = {};
        this.schemaCache[type] = schema;
        return schema;
    }

    /**
     * Get all components of a specific type
     */
    async getAll(type) {
        const { tableName } = this._resolveType(type);
        return sequelizeMaster.query(`SELECT * FROM pc_components.${tableName} WHERE is_active = 1 ORDER BY created_at DESC`, {
            type: QueryTypes.SELECT
        });
    }

    /**
     * Get component by ID
     */
    async getById(type, id) {
        const { tableName, pk } = this._resolveType(type);
        const rows = await sequelizeMaster.query(`SELECT * FROM pc_components.${tableName} WHERE ${pk} = ?`, {
            replacements: [id], type: QueryTypes.SELECT
        });
        return rows[0] || null;
    }

    /**
     * Create a new component
     */
    async create(type, data) {
        const { tableName, pk } = this._resolveType(type);
        const id = generateId();

        const schema = await this.getSchema(type);
        const validColumns = schema.map(c => c.Field);

        const keys = Object.keys(data).filter(k => 
            data[k] !== undefined && validColumns.includes(k) && k !== pk && k !== 'created_at' && k !== 'updated_at'
        );
        const values = keys.map(k => data[k]);

        // Validate all column names
        for (const key of keys) {
            if (!isValidIdentifier(key)) {
                throw new ValidationError(`Invalid column name: '${key}'`);
            }
        }

        keys.unshift(pk);
        values.unshift(id);

        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO pc_components.${tableName} (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders})`;

        await sequelizeMaster.query(sql, { replacements: values, type: QueryTypes.INSERT });
        const rows = await sequelizeMaster.query(`SELECT * FROM pc_components.${tableName} WHERE ${pk} = ?`, {
            replacements: [id], type: QueryTypes.SELECT
        });
        return rows[0] || null;
    }

    /**
     * Update a component
     */
    async update(type, id, data) {
        const { tableName, pk } = this._resolveType(type);

        const schema = await this.getSchema(type);
        const validColumns = schema.map(c => c.Field);

        const keys = Object.keys(data).filter(k => 
            data[k] !== undefined && validColumns.includes(k) && k !== pk && k !== 'created_at' && k !== 'updated_at'
        );
        if (keys.length === 0) return null;

        // Validate all column names
        for (const key of keys) {
            if (!isValidIdentifier(key)) {
                throw new ValidationError(`Invalid column name: '${key}'`);
            }
        }

        const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
        const values = keys.map(k => data[k]);
        values.push(id);

        const sql = `UPDATE pc_components.${tableName} SET ${setClause} WHERE ${pk} = ?`;

        await sequelizeMaster.query(sql, { replacements: values, type: QueryTypes.UPDATE });
        const rows = await sequelizeMaster.query(`SELECT * FROM pc_components.${tableName} WHERE ${pk} = ?`, {
            replacements: [id], type: QueryTypes.SELECT
        });
        return rows[0] || null;
    }

    /**
     * Delete (soft delete) a component
     */
    async delete(type, id) {
        const { tableName, pk } = this._resolveType(type);
        await sequelizeMaster.query(`UPDATE pc_components.${tableName} SET is_active = 0 WHERE ${pk} = ?`, {
            replacements: [id], type: QueryTypes.UPDATE
        });
        return true;
    }
}

module.exports = new PCComponentService();
