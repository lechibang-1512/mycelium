/**
 * Database Helper Utilities
 * Shared utilities for database operations across routes
 */

/**
 * Cache for table columns to avoid repeated SHOW COLUMNS queries
 * Structure: { tableName: Set<columnName> }
 */
const tableColumnsCache = {};

/**
 * Get columns for a given table with caching
 * @param {Object} pool - Database connection pool
 * @param {string} tableName - Name of the table (can include database prefix like 'master_db.specs_db')
 * @returns {Promise<Set<string>>} Set of column names for the table
 * @example
 * const columns = await getTableColumns(pool, 'smartphone_repair_jobs');
 * if (columns.has('device_name')) { ... }
 */
async function getTableColumns(pool, tableName) {
  // Validate table name to prevent SQL injection
  if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  if (!tableColumnsCache[tableName]) {
    const rows = await pool.query(`SHOW COLUMNS FROM ${tableName}`);
    tableColumnsCache[tableName] = new Set(rows.map(r => r.Field));
  }
  return tableColumnsCache[tableName];
}



/**
 * Build a dynamic INSERT query that only includes columns that exist in the table
 * @param {string} tableName - Name of the table
 * @param {Object} data - Key-value pairs of data to insert
 * @param {Set<string>} availableColumns - Set of columns that exist in the table
 * @returns {Object} { columns: string[], values: any[], placeholders: string }
 * @example
 * const { columns, values, placeholders } = buildDynamicInsert('users', { name: 'John', email: 'john@example.com' }, availableColumns);
 * // SQL: INSERT INTO users (name, email) VALUES (?, ?)
 */
function buildDynamicInsert(tableName, data, availableColumns) {
  const columns = [];
  const values = [];

  for (const [key, value] of Object.entries(data)) {
    if (availableColumns.has(key)) {
      columns.push(key);
      values.push(value);
    }
  }

  const placeholders = values.map(() => '?').join(', ');

  return { columns, values, placeholders };
}





module.exports = {
  getTableColumns
};
