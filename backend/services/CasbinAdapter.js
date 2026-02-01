const { Helper } = require('casbin');
const { withConnection } = require('../utils/queryHelper');

/**
 * CasbinAdapter
 * Adapts Casbin to use the application's MariaDB connection pool
 */
class CasbinAdapter {
    /**
     * @param {Object} pool - MariaDB connection pool
     */
    constructor(pool) {
        this.pool = pool;
        this.tableName = 'security_db.casbin_rules';
        this.filtered = false;
    }

    /**
     * Create the adapter
     * @param {Object} pool 
     * @returns {CasbinAdapter}
     */
    static async newAdapter(pool) {
        const adapter = new CasbinAdapter(pool);
        await adapter.createTable();
        return adapter;
    }

    /**
     * Create the policy table if it doesn't exist
     */
    async createTable() {
        return withConnection(this.pool, async (conn) => {
            await conn.query(`
                CREATE TABLE IF NOT EXISTS ${this.tableName} (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    ptype VARCHAR(100),
                    v0 VARCHAR(100),
                    v1 VARCHAR(100),
                    v2 VARCHAR(100),
                    v3 VARCHAR(100),
                    v4 VARCHAR(100),
                    v5 VARCHAR(100)
                )
            `);
        });
    }

    /**
     * Load all policy rules from the storage
     * @param {Object} model 
     */
    async loadPolicy(model) {
        return withConnection(this.pool, async (conn) => {
            const rows = await conn.query(`SELECT * FROM ${this.tableName}`);

            for (const row of rows) {
                const line = this.loadPolicyLine(row);
                Helper.loadPolicyLine(line, model);
            }
        });
    }

    loadPolicyLine(row) {
        let line = row.ptype;
        if (row.v0) line += ', ' + row.v0;
        if (row.v1) line += ', ' + row.v1;
        if (row.v2) line += ', ' + row.v2;
        if (row.v3) line += ', ' + row.v3;
        if (row.v4) line += ', ' + row.v4;
        if (row.v5) line += ', ' + row.v5;
        return line;
    }

    /**
     * Save all policy rules to the storage
     * @param {Object} model 
     */
    async savePolicy(model) {
        return withConnection(this.pool, async (conn) => {
            await conn.query(`DELETE FROM ${this.tableName}`);

            const astMap = model.model.get('p');
            for (const [ptype, ast] of astMap) {
                for (const rule of ast.policy) {
                    await this.savePolicyLine(ptype, rule, conn);
                }
            }

            const gAstMap = model.model.get('g');
            for (const [ptype, ast] of gAstMap) {
                for (const rule of ast.policy) {
                    await this.savePolicyLine(ptype, rule, conn);
                }
            }
        });
    }

    async savePolicyLine(ptype, rule, conn) {
        const row = {
            ptype,
            v0: rule[0] || '',
            v1: rule[1] || '',
            v2: rule[2] || '',
            v3: rule[3] || '',
            v4: rule[4] || '',
            v5: rule[5] || ''
        };

        await conn.query(`
            INSERT INTO ${this.tableName} (ptype, v0, v1, v2, v3, v4, v5)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [row.ptype, row.v0, row.v1, row.v2, row.v3, row.v4, row.v5]);
    }

    /**
     * Add a policy rule to the storage
     * @param {string} sec 
     * @param {string} ptype 
     * @param {Array} rule 
     */
    async addPolicy(sec, ptype, rule) {
        return withConnection(this.pool, async (conn) => {
            await this.savePolicyLine(ptype, rule, conn);
            return true;
        });
    }

    /**
     * Remove a policy rule from the storage
     * @param {string} sec 
     * @param {string} ptype 
     * @param {Array} rule 
     */
    async removePolicy(sec, ptype, rule) {
        return withConnection(this.pool, async (conn) => {
            let sql = `DELETE FROM ${this.tableName} WHERE ptype = ?`;
            const params = [ptype];

            rule.forEach((value, index) => {
                const col = `v${index}`;
                if (value) {
                    sql += ` AND ${col} = ?`;
                    params.push(value);
                }
            });

            const result = await conn.query(sql, params);
            return result.affectedRows > 0;
        });
    }

    /**
     * Remove policy rules that match the filter from the storage
     * @param {string} sec 
     * @param {string} ptype 
     * @param {number} fieldIndex 
     * @param {...string} fieldValues 
     */
    async removeFilteredPolicy(sec, ptype, fieldIndex, ...fieldValues) {
        return withConnection(this.pool, async (conn) => {
            let sql = `DELETE FROM ${this.tableName} WHERE ptype = ?`;
            const params = [ptype];

            fieldValues.forEach((value, i) => {
                if (value) {
                    const col = `v${fieldIndex + i}`;
                    sql += ` AND ${col} = ?`;
                    params.push(value);
                }
            });

            const result = await conn.query(sql, params);
            return result.affectedRows > 0;
        });
    }
}

module.exports = CasbinAdapter;
