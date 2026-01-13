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

const PRODUCT_COLUMNS = [
    'part_code', 'product_type', 'name', 'description', 'manufacturer', 
    'category', 'unit_cost', 'unit_price', 'currency', 'image_url', 
    'warranty_months', 'reorder_point', 'is_active'
];

class PCComponentService {
    /**
     * Get the table name for a given type in pc_components DB
     */
    _getTableName(type) {
        const mapping = {
            'cpu': 'cpu_specs',
            'gpu': 'gpu_specs',
            'motherboard': 'motherboard_specs',
            'ram': 'ram_specs',
            'storage': 'storage_specs',
            'psu': 'power_supply_specs',
            'case': 'pc_cases_specs',
            'cooling': 'cpu_coolers_specs',
            'fan': 'case_fans_specs',
            'monitor': 'monitors_specs',
            'keyboard': 'keyboard_specs',
            'mouse': 'mouse_specs',
            'headphone': 'headphones_specs',
            'headset': 'headsets_specs',
            'cable': 'cables_specs',
            'expansion': 'expansion_cards_specs'
        };
        return mapping[type] || `${type}_specs`;
    }

    /**
     * Get all valid component types
     */
    getValidTypes() {
        return ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case', 'cooling', 'fan', 'monitor', 'keyboard', 'mouse', 'headphone', 'headset', 'cable', 'expansion'];
    }

    /**
     * Validate and resolve table name for a given type.
     */
    _resolveType(type) {
        const tableName = this._getTableName(type);
        if (!isValidIdentifier(tableName)) {
            throw new ValidationError(`Invalid component type: '${type}'`);
        }
        return { tableName };
    }

    /**
     * Get the schema columns for a component type (Base product + Specs)
     */
    async getSchema(type) {
        if (this.schemaCache && this.schemaCache[type]) return this.schemaCache[type];
        const { tableName } = this._resolveType(type);
        
        // Base schema from products
        const baseSchema = await sequelizeMaster.query(`SHOW COLUMNS FROM master_db.products`, {
            type: QueryTypes.SELECT
        });
        
        // Spec schema from pc_components
        const specSchema = await sequelizeMaster.query(`SHOW COLUMNS FROM pc_components.${tableName}`, {
            type: QueryTypes.SELECT
        });
        
        // Merge schemas, removing duplicates (product_id)
        const allColumns = [...baseSchema];
        const baseColumnNames = baseSchema.map(c => c.Field);
        
        for (const col of specSchema) {
            if (!baseColumnNames.includes(col.Field)) {
                allColumns.push(col);
            }
        }

        if (!this.schemaCache) this.schemaCache = {};
        this.schemaCache[type] = allColumns;
        return allColumns;
    }

    /**
     * Get all components of a specific type
     */
    async getAll(type) {
        const { tableName } = this._resolveType(type);
        return sequelizeMaster.query(`
            SELECT p.*, s.* 
            FROM master_db.products p
            JOIN pc_components.${tableName} s ON p.product_id = s.product_id
            WHERE p.is_active = 1 AND p.product_type = ?
            ORDER BY p.created_at DESC
        `, {
            replacements: [type.toUpperCase()],
            type: QueryTypes.SELECT
        });
    }

    /**
     * Get component by ID
     */
    async getById(type, id) {
        const { tableName } = this._resolveType(type);
        const rows = await sequelizeMaster.query(`
            SELECT p.*, s.* 
            FROM master_db.products p
            JOIN pc_components.${tableName} s ON p.product_id = s.product_id
            WHERE p.product_id = ? AND p.product_type = ?
        `, {
            replacements: [id, type.toUpperCase()], 
            type: QueryTypes.SELECT
        });
        return rows[0] || null;
    }

    /**
     * Create a new component
     */
    async create(type, data) {
        const { tableName } = this._resolveType(type);
        const id = generateId();

        const schema = await this.getSchema(type);
        const validColumns = schema.map(c => c.Field);

        // Separate base product columns from spec columns
        const baseKeys = [];
        const baseValues = [];
        const specKeys = [];
        const specValues = [];

        for (const key of Object.keys(data)) {
            if (data[key] !== undefined && validColumns.includes(key) && key !== 'product_id' && key !== 'created_at' && key !== 'updated_at') {
                if (!isValidIdentifier(key)) {
                    throw new ValidationError(`Invalid column name: '${key}'`);
                }
                if (PRODUCT_COLUMNS.includes(key)) {
                    baseKeys.push(key);
                    baseValues.push(data[key]);
                } else {
                    specKeys.push(key);
                    specValues.push(data[key]);
                }
            }
        }

        // Add mandatory base columns
        baseKeys.push('product_id');
        baseValues.push(id);
        
        if (!baseKeys.includes('product_type')) {
            baseKeys.push('product_type');
            baseValues.push(type.toUpperCase());
        }

        // Add mandatory spec columns
        specKeys.push('product_id');
        specValues.push(id);
        
        // Provide backwards compatibility for type_id fields if present in specs schema
        const typeIdField = type === 'expansion' ? 'expansion_card_id' : (type === 'cooling' ? 'cooler_id' : (type === 'psu' ? 'psu_id' : (type === 'case' ? 'case_id' : type + '_id')));
        if (validColumns.includes(typeIdField) && !specKeys.includes(typeIdField)) {
            specKeys.push(typeIdField);
            specValues.push(id);
        }

        const t = await sequelizeMaster.transaction();
        
        try {
            // 1. Insert into products
            const basePlaceholders = baseKeys.map(() => '?').join(', ');
            const baseSql = `INSERT INTO master_db.products (${baseKeys.map(k => '`' + k + '`').join(', ')}) VALUES (${basePlaceholders})`;
            await sequelizeMaster.query(baseSql, { replacements: baseValues, type: QueryTypes.INSERT, transaction: t });

            // 2. Insert into specs table
            const specPlaceholders = specKeys.map(() => '?').join(', ');
            const specSql = `INSERT INTO pc_components.${tableName} (${specKeys.map(k => '`' + k + '`').join(', ')}) VALUES (${specPlaceholders})`;
            await sequelizeMaster.query(specSql, { replacements: specValues, type: QueryTypes.INSERT, transaction: t });

            await t.commit();
            
            return await this.getById(type, id);
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Update a component
     */
    async update(type, id, data) {
        const { tableName } = this._resolveType(type);

        const schema = await this.getSchema(type);
        const validColumns = schema.map(c => c.Field);

        const baseKeys = [];
        const baseValues = [];
        const specKeys = [];
        const specValues = [];

        for (const key of Object.keys(data)) {
            if (data[key] !== undefined && validColumns.includes(key) && key !== 'product_id' && key !== 'created_at' && key !== 'updated_at') {
                if (!isValidIdentifier(key)) {
                    throw new ValidationError(`Invalid column name: '${key}'`);
                }
                if (PRODUCT_COLUMNS.includes(key)) {
                    baseKeys.push(key);
                    baseValues.push(data[key]);
                } else {
                    specKeys.push(key);
                    specValues.push(data[key]);
                }
            }
        }

        if (baseKeys.length === 0 && specKeys.length === 0) return null;

        const t = await sequelizeMaster.transaction();
        
        try {
            // 1. Update products table
            if (baseKeys.length > 0) {
                const baseSetClause = baseKeys.map(k => '`' + k + '` = ?').join(', ');
                const baseSql = `UPDATE master_db.products SET ${baseSetClause} WHERE product_id = ? AND product_type = ?`;
                await sequelizeMaster.query(baseSql, { replacements: [...baseValues, id, type.toUpperCase()], type: QueryTypes.UPDATE, transaction: t });
            }

            // 2. Update specs table
            if (specKeys.length > 0) {
                const specSetClause = specKeys.map(k => '`' + k + '` = ?').join(', ');
                const specSql = `UPDATE pc_components.${tableName} SET ${specSetClause} WHERE product_id = ?`;
                await sequelizeMaster.query(specSql, { replacements: [...specValues, id], type: QueryTypes.UPDATE, transaction: t });
            }

            await t.commit();
            
            return await this.getById(type, id);
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Delete (soft delete) a component
     */
    async delete(type, id) {
        this._resolveType(type);
        // Soft delete the base product record
        await sequelizeMaster.query(`UPDATE master_db.products SET is_active = 0 WHERE product_id = ? AND product_type = ?`, {
            replacements: [id, type.toUpperCase()], type: QueryTypes.UPDATE
        });
        return true;
    }
}

module.exports = new PCComponentService();
