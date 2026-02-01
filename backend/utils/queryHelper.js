/**
 * Database Query Helper
 * Wrapper to handle database connections with automatic release
 */

/**
 * Validate SQL identifier (table name, column name) to prevent SQL injection
 * Only allows alphanumeric characters and underscores
 * @param {string} identifier - The identifier to validate
 * @returns {boolean} True if valid
 */
function isValidIdentifier(identifier) {
    if (typeof identifier !== 'string' || identifier.length === 0) {
        return false;
    }
    // Only allow alphanumeric characters, underscores, and periods (for schema.table)
    return /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(identifier);
}

/**
 * Execute a database query with automatic connection management
 * @param {Pool} pool - MariaDB connection pool
 * @param {Function} callback - Async function that receives connection
 * @returns {Promise<*>} Result from the callback
 */
async function withConnection(pool, callback) {
    const conn = await pool.getConnection();
    try {
        return await callback(conn);
    } finally {
        conn.release();
    }
}

/**
 * Execute a database transaction with automatic rollback on error
 * @param {Pool} pool - MariaDB connection pool
 * @param {Function} callback - Async function that receives connection
 * @returns {Promise<*>} Result from the callback
 */
async function withTransaction(pool, callback) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const result = await callback(conn);
        await conn.commit();
        return result;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

/**
 * Execute a simple query (syntactic sugar for common pattern)
 * @param {Pool} pool - MariaDB connection pool
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
async function query(pool, sql, params = []) {
    return withConnection(pool, conn => conn.query(sql, params));
}

/**
 * Execute a query and return the first result
 * @param {Pool} pool - MariaDB connection pool
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Object|null>} First result or null
 */
async function queryOne(pool, sql, params = []) {
    const results = await query(pool, sql, params);
    return results.length > 0 ? results[0] : null;
}

/**
 * Execute a query and return a single value from the first row
 * @param {Pool} pool - MariaDB connection pool
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @param {string} column - Column name to return (default: first column)
 * @returns {Promise<*|null>} Single value or null
 */
async function queryValue(pool, sql, params = [], column = null) {
    const result = await queryOne(pool, sql, params);
    if (!result) return null;

    if (column) {
        return result[column];
    }

    // Return first column value
    const keys = Object.keys(result);
    return keys.length > 0 ? result[keys[0]] : null;
}

/**
 * Check if a record exists
 * @param {Pool} pool - MariaDB connection pool
 * @param {string} table - Table name (must be alphanumeric with underscores)
 * @param {Object} conditions - Where conditions (keys must be valid column names)
 * @returns {Promise<boolean>} True if exists
 * @throws {Error} If table name or column names are invalid
 */
async function exists(pool, table, conditions) {
    // Validate table name to prevent SQL injection
    if (!isValidIdentifier(table)) {
        throw new Error(`Invalid table name: ${table}. Only alphanumeric characters and underscores are allowed.`);
    }

    // Validate column names to prevent SQL injection
    const columns = Object.keys(conditions);
    for (const column of columns) {
        if (!isValidIdentifier(column)) {
            throw new Error(`Invalid column name: ${column}. Only alphanumeric characters and underscores are allowed.`);
        }
    }

    const where = columns.map(key => `${key} = ?`).join(' AND ');
    const values = Object.values(conditions);

    const count = await queryValue(
        pool,
        `SELECT COUNT(*) as count FROM ${table} WHERE ${where}`,
        values,
        'count'
    );

    return count > 0;
}

/**
 * Insert a row and return the insertId
 * @param {Pool} pool - MariaDB connection pool
 * @param {string} table - Table name (must be valid identifier)
 * @param {Object} data - Key-value pairs to insert
 * @returns {Promise<number>} Insert ID
 */
async function insert(pool, table, data) {
    if (!isValidIdentifier(table)) {
        throw new Error(`Invalid table name: ${table}`);
    }

    const columns = Object.keys(data);
    for (const col of columns) {
        if (!isValidIdentifier(col)) {
            throw new Error(`Invalid column name: ${col}`);
        }
    }

    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    const result = await query(pool, sql, Object.values(data));
    return result.insertId;
}

/**
 * Update rows matching conditions
 * @param {Pool} pool - MariaDB connection pool
 * @param {string} table - Table name
 * @param {Object} data - Key-value pairs to update
 * @param {Object} conditions - Where conditions
 * @returns {Promise<number>} Affected rows count
 */
async function update(pool, table, data, conditions) {
    if (!isValidIdentifier(table)) {
        throw new Error(`Invalid table name: ${table}`);
    }

    const setClauses = [];
    const values = [];

    for (const [col, val] of Object.entries(data)) {
        if (!isValidIdentifier(col)) {
            throw new Error(`Invalid column name: ${col}`);
        }
        setClauses.push(`${col} = ?`);
        values.push(val);
    }

    const whereClauses = [];
    for (const [col, val] of Object.entries(conditions)) {
        if (!isValidIdentifier(col)) {
            throw new Error(`Invalid column name: ${col}`);
        }
        whereClauses.push(`${col} = ?`);
        values.push(val);
    }

    const sql = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`;
    const result = await query(pool, sql, values);
    return result.affectedRows;
}

/**
 * Find a single row by ID
 * @param {Pool} pool - MariaDB connection pool
 * @param {string} table - Table name
 * @param {*} id - ID value
 * @param {string} idColumn - ID column name (default: 'id')
 * @returns {Promise<Object|null>} Row or null
 */
async function findById(pool, table, id, idColumn = 'id') {
    if (!isValidIdentifier(table) || !isValidIdentifier(idColumn)) {
        throw new Error('Invalid table or column name');
    }
    return queryOne(pool, `SELECT * FROM ${table} WHERE ${idColumn} = ?`, [id]);
}

/**
 * Find all rows with optional filtering, ordering, and pagination
 * @param {Pool} pool - MariaDB connection pool
 * @param {string} table - Table name
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Rows
 */
async function findAll(pool, table, options = {}) {
    if (!isValidIdentifier(table)) {
        throw new Error(`Invalid table name: ${table}`);
    }

    const { where = {}, orderBy, limit, offset } = options;
    const params = [];
    let sql = `SELECT * FROM ${table}`;

    // WHERE clause
    const conditions = Object.entries(where);
    if (conditions.length > 0) {
        const clauses = [];
        for (const [col, val] of conditions) {
            if (!isValidIdentifier(col)) {
                throw new Error(`Invalid column name: ${col}`);
            }
            clauses.push(`${col} = ?`);
            params.push(val);
        }
        sql += ` WHERE ${clauses.join(' AND ')}`;
    }

    // ORDER BY clause
    if (orderBy && isValidIdentifier(orderBy.replace(/^-/, ''))) {
        const dir = orderBy.startsWith('-') ? 'DESC' : 'ASC';
        const col = orderBy.replace(/^-/, '');
        sql += ` ORDER BY ${col} ${dir}`;
    }

    // LIMIT/OFFSET
    if (limit) {
        sql += ` LIMIT ?`;
        params.push(parseInt(limit));
        if (offset) {
            sql += ` OFFSET ?`;
            params.push(parseInt(offset));
        }
    }

    return query(pool, sql, params);
}

module.exports = {
    withConnection,
    withTransaction,
    isValidIdentifier,
    query,
    queryOne,
    queryValue,
    exists,
    insert,
    update,
    findById,
    findAll
};
