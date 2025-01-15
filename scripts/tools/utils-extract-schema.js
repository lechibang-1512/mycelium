#!/usr/bin/env node

const { initializeProject, getProjectPath } = require('./utils-project-root');
const { projectRoot } = initializeProject({ verbose: false, requireEnv: false });
const { spawn } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// Constants
const SYSTEM_SCHEMAS = ['information_schema', 'performance_schema', 'mysql', 'sys'];
const DEFAULT_DB_PORT = 3306;
const DEFAULT_HOST = '127.0.0.1';
const CONNECTION_TIMEOUT = 10000;
const QUERY_TIMEOUT = 30000;

// Parse CLI arguments
const args = process.argv.slice(2);

/**
 * Get argument value by flag
 * @param {string} flag - Flag name (e.g., '--format')
 * @returns {string|null} - Argument value or null
 */
function getArgValue(flag) {
  const index = args.indexOf(flag);
  if (index !== -1 && args[index + 1] && !args[index + 1].startsWith('-')) {
    return args[index + 1];
  }
  return null;
}

const cliOptions = {
  verbose: args.includes('--verbose') || args.includes('-v'),
  dumpOnly: args.includes('--dump-only'),
  analyzeOnly: args.includes('--analyze-only'),
  testOnly: args.includes('--test-only'),
  skipInstall: args.includes('--skip-install'),
  help: args.includes('--help') || args.includes('-h'),
  // New export options
  export: args.includes('--export'),
  format: (getArgValue('--format') || 'json').toLowerCase(),
  schema: getArgValue('--schema'),
  output: getArgValue('--output')
};

if (cliOptions.help) {
  console.log(`
🔧 Database Schema Extract Tool

Usage: node utils-extract-schema.js [options]

Options:
  --verbose, -v      Show verbose output
  --dump-only        Only dump schemas, skip interactive menu
  --analyze-only     Only analyze existing schemas
  --test-only        Only test database connectivity
  --skip-install     Skip automatic dependency installation
  --help, -h         Show this help message

Export Options:
  --export           Export schema(s) to file (non-interactive)
  --format <type>    Export format: json or csv (default: json)
  --schema <name>    Specify schema name to export (exports all if omitted)
  --output <dir>     Output directory for exports (default: sql directory)

Examples:
  node utils-extract-schema.js --dump-only
  node utils-extract-schema.js --test-only --verbose
  node utils-extract-schema.js --export --format json
  node utils-extract-schema.js --export --format csv --schema master_db
  node utils-extract-schema.js --export --format json --output ./exports
`);
  process.exit(0);
}

/**
 * Load environment variables from .env files
 * @returns {boolean} - Whether any .env files were loaded
 */
function loadEnvironmentVariables() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const candidateNames = ['.env', `.env.${nodeEnv}`, '.env.local', `.env.${nodeEnv}.local`];
  const searchDirs = [process.cwd(), __dirname, path.join(__dirname, '..'), path.join(process.cwd(), '..')];
  const foundFiles = [];

  for (const dir of searchDirs) {
    for (const name of candidateNames) {
      const p = path.join(dir, name);
      try {
        if (fsSync.existsSync(p)) foundFiles.push(p);
      } catch { /* Ignore file access errors */ }
    }
  }

  const files = [...new Set(foundFiles)];
  if (files.length === 0) {
    console.warn('⚠️  No .env files found. Using system environment variables only.');
    return false;
  }

  if (cliOptions.verbose) console.log('🔍 Loading .env files:');
  files.forEach(f => cliOptions.verbose && console.log(`  - ${f}`));
  const dotenv = require('dotenv');

  let loadedCount = 0;
  for (const filePath of files) {
    try {
      const src = fsSync.readFileSync(filePath);
      const parsed = dotenv.parse(src);
      for (const [k, v] of Object.entries(parsed)) {
        if (!process.env[k]) process.env[k] = v; // Don't override existing vars
      }
      loadedCount++;
    } catch (err) {
      console.warn(`⚠️ Could not load ${filePath}: ${err.message}`);
    }
  }

  if (cliOptions.verbose) console.log(`✅ Loaded ${loadedCount} .env file(s)`);
  return loadedCount > 0;
}

loadEnvironmentVariables();

/**
 * Build database configurations from environment variables
 * Supports multiple formats: DATABASES_JSON, DATABASES list, and individual *_DB_NAME vars
 * @returns {Array<{name: string, config: object}>} - Array of database configurations
 */
function buildDbConfigs() {
  const result = [];
  const parseBool = v => String(v).toLowerCase() === 'true';

  /**
   * Validate database configuration
   * @param {object} config - Database config object
   * @returns {boolean} - Whether config is valid
   */
  const isValidConfig = (config) => {
    if (!config.user || !config.password) {
      cliOptions.verbose && console.warn(`⚠️  Invalid config: missing credentials`);
      return false;
    }
    if (!config.database) {
      cliOptions.verbose && console.warn(`⚠️  Invalid config: missing database name`);
      return false;
    }
    return true;
  };

  // Method 1: DATABASES_JSON - Full JSON configuration array
  if (process.env.DATABASES_JSON) {
    try {
      const parsed = JSON.parse(process.env.DATABASES_JSON);
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          const cfg = {
            name: entry.name || entry.database || 'unnamed_db',
            config: {
              host: entry.host || process.env.DB_HOST || DEFAULT_HOST,
              port: Number(entry.port || process.env.DB_PORT || DEFAULT_DB_PORT),
              user: entry.user || process.env.DB_USER,
              password: entry.password || process.env.DB_PASSWORD,
              database: entry.database || entry.db || process.env.DB_NAME,
              ssl: parseBool(entry.ssl || process.env.DB_SSL),
              connectTimeout: CONNECTION_TIMEOUT,
              queryTimeout: QUERY_TIMEOUT
            }
          };
          if (isValidConfig(cfg.config)) {
            result.push(cfg);
          }
        }
        if (result.length) {
          console.log(`ℹ️  Loaded ${result.length} DB(s) from DATABASES_JSON`);
          return result;
        }
      }
    } catch (err) {
      console.warn('⚠️  Failed to parse DATABASES_JSON:', err.message);
      cliOptions.verbose && console.warn(err.stack);
    }
  }

  // Method 2: DATABASES - Comma-separated list of database names
  if (process.env.DATABASES) {
    const names = process.env.DATABASES.split(',').map(s => s.trim()).filter(Boolean);
    for (const n of names) {
      const up = n.toUpperCase();
      const cfg = {
        name: n,
        config: {
          host: process.env[`${up}_DB_HOST`] || process.env.DB_HOST || DEFAULT_HOST,
          port: Number(process.env[`${up}_DB_PORT`] || process.env.DB_PORT || DEFAULT_DB_PORT),
          user: process.env[`${up}_DB_USER`] || process.env.DB_USER,
          password: process.env[`${up}_DB_PASSWORD`] || process.env.DB_PASSWORD,
          database: process.env[`${up}_DB_NAME`] || process.env.DB_NAME,
          ssl: parseBool(process.env[`${up}_DB_SSL`] || process.env.DB_SSL),
          connectTimeout: CONNECTION_TIMEOUT,
          queryTimeout: QUERY_TIMEOUT
        }
      };
      if (isValidConfig(cfg.config)) {
        result.push(cfg);
      }
    }
    if (result.length) {
      console.log(`ℹ️  Loaded ${result.length} DB(s) from DATABASES: ${names.join(', ')}`);
      return result;
    }
  }

  // Method 3: Auto-discover from *_DB_NAME environment variables
  cliOptions.verbose && console.log('ℹ️  Scanning for *_DB_NAME environment variables...');
  const dbNameKeys = Object.keys(process.env).filter(k => k.endsWith('_DB_NAME')).sort();

  if (dbNameKeys.length > 0) {
    cliOptions.verbose && console.log(`   Found ${dbNameKeys.length} DB_NAME variables: ${dbNameKeys.join(', ')}`);
    for (const key of dbNameKeys) {
      const prefix = key.replace('_DB_NAME', '');
      const up = prefix ? `${prefix}_` : '';
      const dbNameValue = process.env[key];
      if (!dbNameValue) {
        cliOptions.verbose && console.warn(`   Skipping ${key}: empty value`);
        continue;
      }
      const logicalName = (prefix.toLowerCase() || 'default');
      const config = {
        host: process.env[`${up}DB_HOST`] || process.env.DB_HOST || DEFAULT_HOST,
        port: Number(process.env[`${up}DB_PORT`] || process.env.DB_PORT || DEFAULT_DB_PORT),
        user: process.env[`${up}DB_USER`] || process.env.DB_USER,
        password: process.env[`${up}DB_PASSWORD`] || process.env.DB_PASSWORD,
        database: dbNameValue,
        ssl: parseBool(process.env[`${up}DB_SSL`] || process.env.DB_SSL),
        connectTimeout: CONNECTION_TIMEOUT,
        queryTimeout: QUERY_TIMEOUT
      };
      if (isValidConfig(config)) {
        result.push({ name: logicalName, config });
      }
    }

    // Ensure the plain DB_NAME is included if present and not already added
    if (process.env.DB_NAME && !result.some(r => r.config.database === process.env.DB_NAME)) {
      const defaultConfig = {
        host: process.env.DB_HOST || DEFAULT_HOST,
        port: Number(process.env.DB_PORT || DEFAULT_DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: parseBool(process.env.DB_SSL),
        connectTimeout: CONNECTION_TIMEOUT,
        queryTimeout: QUERY_TIMEOUT
      };
      if (isValidConfig(defaultConfig)) {
        result.unshift({ name: 'default', config: defaultConfig });
      }
    }

    // Deduplicate by name (first occurrence wins)
    const uniqueNames = new Map();
    for (const cfg of result) {
      if (!uniqueNames.has(cfg.name)) {
        uniqueNames.set(cfg.name, cfg);
      }
    }
    const uniqueResults = [...uniqueNames.values()];

    if (uniqueResults.length > 0) {
      console.log(`ℹ️  Found ${uniqueResults.length} DB config(s): ${uniqueResults.map(r => `${r.name} (${r.config.database})`).join(', ')}`);
      return uniqueResults;
    }
  }

  // Fallback: Create default config if DB_NAME is present
  if (process.env.DB_NAME) {
    const defaultConfig = {
      host: process.env.DB_HOST || DEFAULT_HOST,
      port: Number(process.env.DB_PORT || DEFAULT_DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: parseBool(process.env.DB_SSL),
      connectTimeout: CONNECTION_TIMEOUT,
      queryTimeout: QUERY_TIMEOUT
    };
    if (isValidConfig(defaultConfig)) {
      result.push({ name: 'default', config: defaultConfig });
    }
  }

  if (result.length) {
    console.log(`ℹ️  Using ${result.length} DB config(s)`);
    return result;
  }

  // Final fallback: no valid DBs detected, return generic config (may fail connection)
  console.warn('⚠️  No valid database configurations found. Using fallback config.');
  console.warn('   Please check your environment variables.');
  return [{
    name: 'fallback',
    config: {
      host: process.env.DB_HOST || DEFAULT_HOST,
      port: Number(process.env.DB_PORT || DEFAULT_DB_PORT),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'test',
      ssl: parseBool(process.env.DB_SSL),
      connectTimeout: CONNECTION_TIMEOUT,
      queryTimeout: QUERY_TIMEOUT
    }
  }];
}

const dbs = buildDbConfigs();
const PROJECT_ROOT = projectRoot;
const SQL_DIR = getProjectPath('sql');

/**
 * Check and install required dependencies
 * @returns {Promise<void>}
 */
async function checkAndInstallDependencies() {
  const requiredPackages = ['inquirer', 'node-sql-parser', 'mariadb'];
  const missingPackages = [];

  if (cliOptions.verbose) console.log('🔍 Checking dependencies...');

  for (const pkg of requiredPackages) {
    try {
      require.resolve(pkg);
      cliOptions.verbose && console.log(`  ✅ ${pkg}`);
    } catch {
      console.log(`  ❌ ${pkg} (missing)`);
      missingPackages.push(pkg);
    }
  }

  if (missingPackages.length > 0) {
    if (cliOptions.skipInstall) {
      console.error(`\n❌ Missing dependencies: ${missingPackages.join(', ')}`);
      console.error('   Run: npm install ' + missingPackages.join(' '));
      process.exit(1);
    }

    console.log(`📦 Installing: ${missingPackages.join(', ')}`);
    const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const args = ['install', ...missingPackages];
    const child = spawn(command, args, { stdio: 'inherit', cwd: PROJECT_ROOT });

    return new Promise((resolve, reject) => {
      child.on('close', code => {
        if (code === 0) {
          console.log('✅ Dependencies installed successfully');
          resolve();
        } else {
          reject(new Error(`npm install failed with code ${code}`));
        }
      });
      child.on('error', reject);
    });
  }

  cliOptions.verbose && console.log('✅ All dependencies present');
}

/**
 * Create a connection pool for a database configuration
 * @param {object} dbConfig - Database configuration
 * @returns {object} - MariaDB connection pool
 */
function createPool(dbConfig) {
  const mariadb = require('mariadb');
  return mariadb.createPool({
    ...dbConfig,
    connectionLimit: 5,
    acquireTimeout: CONNECTION_TIMEOUT
  });
}

/**
 * Safely close a database connection
 * @param {object} conn - Database connection
 * @returns {Promise<void>}
 */
async function safeClose(conn) {
  if (conn) {
    try {
      if (conn.end) await conn.end();
      else if (conn.release) conn.release();
    } catch (err) {
      cliOptions.verbose && console.warn('Warning closing connection:', err.message);
    }
  }
}

async function run() {
  console.log('\n🔧 Database Schema Extract Tool');
  console.log('===============================');
  console.log(`📁 Project Root: ${PROJECT_ROOT}`);
  console.log(`📂 SQL Directory: ${SQL_DIR}`);
  console.log(`🗄️  Databases: ${dbs.length} configured\n`);

  let inquirer, Parser;
  try {
    inquirer = (await import('inquirer')).default;
    Parser = require('node-sql-parser').Parser;
  } catch (error) {
    console.error('❌ Dependency load failed:', error.message);
    process.exit(1);
  }

  const parser = new Parser();

  /**
   * Ensure SQL directory exists
   * @returns {Promise<void>}
   */
  async function ensureSqlDirExists() {
    try {
      await fs.access(SQL_DIR);
      cliOptions.verbose && console.log(`✓ SQL directory exists: ${SQL_DIR}`);
    } catch {
      console.log(`📁 Creating SQL directory: ${SQL_DIR}`);
      await fs.mkdir(SQL_DIR, { recursive: true });
    }
  }

  /**
   * Dump database schemas to SQL files
   * @returns {Promise<{success: number, failed: number, schemas: number}>}
   */
  async function dumpDatabaseSchemas() {
    const mariadb = require('mariadb');
    await ensureSqlDirExists();

    const stats = { success: 0, failed: 0, schemas: 0 };
    console.log('\n📥 Dumping Database Schemas');
    console.log('━'.repeat(50));

    for (const db of dbs) {
      console.log(`\n🔌 Connecting to: ${db.name} (${db.config.host}:${db.config.port})`);
      let conn;

      try {
        if (!db.config.user || !db.config.password) {
          console.error(`   ❌ Missing credentials for ${db.name}`);
          stats.failed++;
          continue;
        }

        // Connect without specifying a database
        const baseConfig = { ...db.config };
        delete baseConfig.database;
        conn = await mariadb.createConnection(baseConfig);

        // Get list of all databases
        const dbList = await conn.query('SHOW DATABASES');
        const allSchemas = dbList.map(r => Object.values(r)[0]);
        const userSchemas = allSchemas.filter(s =>
          !SYSTEM_SCHEMAS.includes(s.toLowerCase())
        );

        if (userSchemas.length === 0) {
          console.log(`   ⚠️  No user schemas found`);
          continue;
        }

        console.log(`   Found ${userSchemas.length} schema(s): ${userSchemas.join(', ')}`);

        for (const schemaName of userSchemas) {
          try {
            await conn.query(`USE \`${schemaName}\``);

            // Get tables and views
            const tables = await conn.query(
              'SELECT TABLE_NAME, TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_TYPE, TABLE_NAME',
              [schemaName]
            );

            if (tables.length === 0) {
              console.log(`   ⚠️  Schema '${schemaName}' is empty`);
              continue;
            }

            let schemaSQL = `-- Schema for ${schemaName}\n`;
            schemaSQL += `-- Generated on ${new Date().toISOString()}\n`;
            schemaSQL += `-- Total objects: ${tables.length}\n`;
            schemaSQL += `\nCREATE DATABASE IF NOT EXISTS \`${schemaName}\`;\n`;
            schemaSQL += `USE \`${schemaName}\`;\n\n`;

            let objectCount = { tables: 0, views: 0, errors: 0 };

            for (const row of tables) {
              const tableName = row.TABLE_NAME;
              const tableType = (row.TABLE_TYPE || '').toUpperCase();
              const showCmd = tableType === 'VIEW' ? 'SHOW CREATE VIEW' : 'SHOW CREATE TABLE';

              try {
                const result = await conn.query(`${showCmd} \`${tableName}\``);
                const createSQL = Object.values(result[0])[1];
                schemaSQL += `-- ${tableType}: ${tableName}\n${createSQL};\n\n`;

                if (tableType === 'VIEW') objectCount.views++;
                else objectCount.tables++;
              } catch (err) {
                schemaSQL += `-- ERROR: Could not dump ${tableName}: ${err.message}\n\n`;
                objectCount.errors++;
                cliOptions.verbose && console.warn(`      ⚠️  Failed to dump ${tableName}:`, err.message);
              }
            }

            const outputFile = path.join(SQL_DIR, `${schemaName}-schema.sql`);
            await fs.writeFile(outputFile, schemaSQL);

            console.log(`   ✅ ${schemaName}: ${objectCount.tables} tables, ${objectCount.views} views`);
            if (objectCount.errors > 0) {
              console.log(`      ⚠️  ${objectCount.errors} object(s) failed to dump`);
            }
            console.log(`      📄 ${outputFile}`);

            stats.schemas++;
            stats.success++;
          } catch (err) {
            console.error(`   ❌ Failed to dump schema '${schemaName}': ${err.message}`);
            stats.failed++;
          }
        }

        await conn.end();
      } catch (err) {
        console.error(`   ❌ Connection failed for ${db.name}: ${err.message}`);
        cliOptions.verbose && console.error(err.stack);
        stats.failed++;
        await safeClose(conn);
      }
    }

    console.log('\n' + '━'.repeat(50));
    console.log(`📊 Summary: ${stats.success} successful, ${stats.failed} failed, ${stats.schemas} schema(s) dumped`);
    console.log('━'.repeat(50) + '\n');

    return stats;
  }

  /**
   * Get list of available schema files
   * @returns {Promise<string[]>} - Array of schema names
   */
  async function getAvailableSchemas() {
    await ensureSqlDirExists();
    try {
      const files = await fs.readdir(SQL_DIR);
      const schemaFiles = files.filter(f => f.endsWith('-schema.sql'));
      const schemas = schemaFiles.map(f => f.replace('-schema.sql', ''));

      cliOptions.verbose && console.log(`Found ${schemas.length} schema file(s): ${schemas.join(', ')}`);
      return schemas;
    } catch (err) {
      console.warn('⚠️  Could not read SQL directory:', err.message);
      return [];
    }
  }

  /**
   * Parse schema file and extract structured data
   * @param {string} schemaName - Name of the schema
   * @returns {Promise<object|null>} - Parsed schema data or null on error
   */
  async function parseSchemaFile(schemaName) {
    const filePath = path.join(SQL_DIR, `${schemaName}-schema.sql`);

    let ast, content;
    try {
      content = await fs.readFile(filePath, 'utf8');
      try {
        ast = parser.astify(content, { database: 'MariaDB' });
      } catch {
        cliOptions.verbose && console.warn('⚠️  SQL parsing failed, using regex fallback');
        ast = [];
      }
    } catch (err) {
      console.error(`❌ Error reading ${schemaName}: ${err.message}`);
      return null;
    }

    // Extract tables and views from AST
    let tables = ast.filter(node => node.type === 'create' && node.keyword === 'table');
    let views = ast.filter(node => node.type === 'create' && node.keyword === 'view');

    // Improved regex fallback for full table parsing
    if (tables.length === 0) {
      tables = parseTablesWithRegex(content);
    }
    if (views.length === 0) {
      views = parseViewsWithRegex(content);
    }

    const tableList = tables.map(t => t.table?.[0]?.table || t.tableName).filter(Boolean);
    const viewList = views.map(v => v.table?.[0]?.table || v.viewName).filter(Boolean);

    return {
      schemaName,
      content,
      ast,
      tables,
      views,
      tableList,
      viewList
    };
  }

  /**
   * Parse CREATE TABLE statements using regex when AST parser fails
   * @param {string} content - SQL content
   * @returns {Array} - Array of table objects compatible with AST format
   */
  function parseTablesWithRegex(content) {
    const tables = [];

    // Match CREATE TABLE statements - capture everything between ( and ) ENGINE
    // The pattern matches: CREATE TABLE `name` ( ... ) ENGINE=
    const tableBlockRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`([^`]+)`\s*\(([\s\S]*?)\)\s*ENGINE=/gi;

    for (const match of content.matchAll(tableBlockRegex)) {
      const tableName = match[1];
      const tableBody = match[2];

      const createDefinitions = [];

      // Parse column definitions
      const lines = tableBody.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines and constraint-only lines
        if (!trimmedLine || trimmedLine.startsWith('PRIMARY KEY') ||
          trimmedLine.startsWith('UNIQUE KEY') || trimmedLine.startsWith('KEY ') ||
          trimmedLine.startsWith('FOREIGN KEY') || trimmedLine.startsWith('CONSTRAINT')) {

          // Parse indexes
          const indexMatch = trimmedLine.match(/^(?:UNIQUE\s+)?KEY\s+`?([^`\s(]+)`?\s*\(([^)]+)\)/i);
          if (indexMatch) {
            const columns = indexMatch[2].split(',').map(c => c.trim().replace(/`/g, '').split(' ')[0]);
            createDefinitions.push({
              resource: 'index',
              index: indexMatch[1],
              index_type: trimmedLine.startsWith('UNIQUE') ? 'UNIQUE' : 'INDEX',
              columns: columns.map(col => ({ column: col }))
            });
          }

          // Parse primary key
          const pkMatch = trimmedLine.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)/i);
          if (pkMatch) {
            const columns = pkMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
            createDefinitions.push({
              constraint_type: 'primary key',
              columns: columns.map(col => ({ column: col }))
            });
          }

          // Parse foreign key constraints: CONSTRAINT `name` FOREIGN KEY (`col`) REFERENCES `table` (`col`)
          const fkMatch = trimmedLine.match(/^CONSTRAINT\s+`([^`]+)`\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+`([^`]+)`\s*\(([^)]+)\)/i);
          if (fkMatch) {
            const constraintName = fkMatch[1];
            const columns = fkMatch[2].split(',').map(c => c.trim().replace(/`/g, ''));
            const refTable = fkMatch[3];
            const refColumns = fkMatch[4].split(',').map(c => c.trim().replace(/`/g, ''));

            createDefinitions.push({
              constraint_type: 'foreign key',
              constraint_name: constraintName,
              columns: columns.map(col => ({ column: col })),
              reference: {
                table: refTable,
                columns: refColumns.map(col => ({ column: col }))
              }
            });
          }

          continue;
        }

        // Column definition regex
        const colMatch = trimmedLine.match(/^`([^`]+)`\s+(\w+)(?:\(([^)]+)\))?\s*(.*?)(?:,|$)/);
        if (colMatch) {
          const colName = colMatch[1];
          const dataType = colMatch[2].toUpperCase();
          const length = colMatch[3] || null;
          const modifiers = colMatch[4] || '';

          const columnDef = {
            resource: 'column',
            column: { column: colName },
            definition: {
              dataType: dataType,
              length: length ? parseInt(length.split(',')[0], 10) : null
            },
            nullable: !modifiers.toUpperCase().includes('NOT NULL'),
            auto_increment: modifiers.toUpperCase().includes('AUTO_INCREMENT'),
            unique: modifiers.toUpperCase().includes('UNIQUE'),
            primary_key: modifiers.toUpperCase().includes('PRIMARY KEY')
          };

          // Extract default value
          const defaultMatch = modifiers.match(/DEFAULT\s+([^\s,]+|'[^']*')/i);
          if (defaultMatch) {
            columnDef.default_val = { value: { value: defaultMatch[1].replace(/^'|'$/g, '') } };
          }

          // Extract comment
          const commentMatch = modifiers.match(/COMMENT\s+'([^']*)'/i);
          if (commentMatch) {
            columnDef.comment = { value: { value: commentMatch[1] } };
          }

          createDefinitions.push(columnDef);
        }
      }

      tables.push({
        type: 'create',
        keyword: 'table',
        table: [{ table: tableName }],
        tableName: tableName,
        create_definitions: createDefinitions
      });
    }

    return tables;
  }

  /**
   * Parse CREATE VIEW statements using regex
   * @param {string} content - SQL content
   * @returns {Array} - Array of view objects
   */
  function parseViewsWithRegex(content) {
    const views = [];

    // Match CREATE VIEW statements - be more precise
    const viewRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?(?:ALGORITHM\s*=\s*\w+\s+)?(?:DEFINER\s*=\s*`[^`]+`@`[^`]+`\s+)?(?:SQL\s+SECURITY\s+\w+\s+)?VIEW\s+`([^`]+)`\s+AS/gi;

    for (const match of content.matchAll(viewRegex)) {
      const viewName = match[1];
      views.push({
        type: 'create',
        keyword: 'view',
        table: [{ table: viewName }],
        viewName: viewName
      });
    }

    return views;
  }

  /**
   * Build export data structure from parsed schema
   * @param {object} parsed - Parsed schema data
   * @returns {object} - Export-ready data structure
   */
  function buildExportData(parsed) {
    const { schemaName, content, tables, tableList, viewList } = parsed;

    const exportData = {
      schemaName,
      exportedAt: new Date().toISOString(),
      statistics: {
        tables: tableList.length,
        views: viewList.length,
        totalObjects: tableList.length + viewList.length,
        fileSizeKB: parseFloat((content.length / 1024).toFixed(2)),
        linesOfSQL: content.split('\n').length
      },
      tables: {},
      views: viewList
    };

    for (const t of tables) {
      const name = t.table[0].table;
      exportData.tables[name] = {
        columns: [],
        indexes: [],
        constraints: [],
        primaryKey: null
      };

      if (!t.create_definitions) continue;

      for (const def of t.create_definitions) {
        if (def.resource === 'column') {
          const colInfo = {
            name: def.column.column,
            type: def.definition?.dataType || 'UNKNOWN',
            length: def.definition?.length || null,
            nullable: def.nullable !== false,
            autoIncrement: def.auto_increment || false,
            defaultValue: def.default_val?.value?.value || null,
            isPrimaryKey: def.primary_key || false,
            isUnique: def.unique || false,
            comment: def.comment?.value?.value || null
          };
          exportData.tables[name].columns.push(colInfo);
        } else if (def.resource === 'index') {
          exportData.tables[name].indexes.push({
            name: def.index || null,
            type: def.index_type || 'INDEX',
            columns: def.columns?.map(c => c.column) || []
          });
        } else if (def.constraint_type === 'primary key') {
          exportData.tables[name].primaryKey = def.columns?.map(c => c.column) || [];
        } else if (def.constraint_type === 'foreign key') {
          exportData.tables[name].constraints.push({
            type: 'FOREIGN KEY',
            columns: def.columns?.map(c => c.column) || [],
            references: {
              table: def.reference?.table || null,
              columns: def.reference?.columns?.map(c => c.column) || []
            }
          });
        }
      }
    }

    return exportData;
  }

  /**
   * Export schema to JSON format
   * @param {string} schemaName - Name of the schema
   * @param {string} outputDir - Output directory (optional)
   * @returns {Promise<string|null>} - Output file path or null on error
   */
  async function exportToJSON(schemaName, outputDir = null) {
    const parsed = await parseSchemaFile(schemaName);
    if (!parsed) return null;

    const exportData = buildExportData(parsed);
    const outDir = outputDir || SQL_DIR;
    const outFile = path.join(outDir, `${schemaName}-schema.json`);

    await fs.writeFile(outFile, JSON.stringify(exportData, null, 2));
    return outFile;
  }

  /**
   * Export schema to CSV format
   * @param {string} schemaName - Name of the schema
   * @param {string} outputDir - Output directory (optional)
   * @returns {Promise<string[]|null>} - Array of output file paths or null on error
   */
  async function exportToCSV(schemaName, outputDir = null) {
    const parsed = await parseSchemaFile(schemaName);
    if (!parsed) return null;

    const exportData = buildExportData(parsed);
    const outDir = outputDir || SQL_DIR;
    const outputFiles = [];

    /**
     * Escape CSV value
     * @param {any} value - Value to escape
     * @returns {string} - Escaped CSV value
     */
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Export columns CSV
    const columnsFile = path.join(outDir, `${schemaName}-columns.csv`);
    const columnsHeader = 'table_name,column_name,data_type,length,nullable,auto_increment,default_value,is_primary_key,is_unique,comment\n';
    let columnsData = columnsHeader;

    for (const [tableName, tableData] of Object.entries(exportData.tables)) {
      for (const col of tableData.columns) {
        columnsData += [
          escapeCSV(tableName),
          escapeCSV(col.name),
          escapeCSV(col.type),
          escapeCSV(col.length),
          escapeCSV(col.nullable ? 'YES' : 'NO'),
          escapeCSV(col.autoIncrement ? 'YES' : 'NO'),
          escapeCSV(col.defaultValue),
          escapeCSV(col.isPrimaryKey ? 'YES' : 'NO'),
          escapeCSV(col.isUnique ? 'YES' : 'NO'),
          escapeCSV(col.comment)
        ].join(',') + '\n';
      }
    }
    await fs.writeFile(columnsFile, columnsData);
    outputFiles.push(columnsFile);

    // Export indexes CSV
    const indexesFile = path.join(outDir, `${schemaName}-indexes.csv`);
    const indexesHeader = 'table_name,index_name,index_type,columns\n';
    let indexesData = indexesHeader;

    for (const [tableName, tableData] of Object.entries(exportData.tables)) {
      for (const idx of tableData.indexes) {
        indexesData += [
          escapeCSV(tableName),
          escapeCSV(idx.name),
          escapeCSV(idx.type),
          escapeCSV(idx.columns.join(';'))
        ].join(',') + '\n';
      }
    }
    await fs.writeFile(indexesFile, indexesData);
    outputFiles.push(indexesFile);

    // Export constraints CSV (foreign keys)
    const constraintsFile = path.join(outDir, `${schemaName}-constraints.csv`);
    const constraintsHeader = 'table_name,constraint_type,columns,ref_table,ref_columns\n';
    let constraintsData = constraintsHeader;

    for (const [tableName, tableData] of Object.entries(exportData.tables)) {
      for (const constraint of tableData.constraints) {
        constraintsData += [
          escapeCSV(tableName),
          escapeCSV(constraint.type),
          escapeCSV(constraint.columns.join(';')),
          escapeCSV(constraint.references?.table),
          escapeCSV(constraint.references?.columns?.join(';'))
        ].join(',') + '\n';
      }
    }
    await fs.writeFile(constraintsFile, constraintsData);
    outputFiles.push(constraintsFile);

    // Export summary CSV
    const summaryFile = path.join(outDir, `${schemaName}-summary.csv`);
    const summaryHeader = 'object_type,object_name,column_count,index_count,constraint_count\n';
    let summaryData = summaryHeader;

    for (const [tableName, tableData] of Object.entries(exportData.tables)) {
      summaryData += [
        'TABLE',
        escapeCSV(tableName),
        tableData.columns.length,
        tableData.indexes.length,
        tableData.constraints.length
      ].join(',') + '\n';
    }
    for (const viewName of exportData.views) {
      summaryData += [
        'VIEW',
        escapeCSV(viewName),
        '',
        '',
        ''
      ].join(',') + '\n';
    }
    await fs.writeFile(summaryFile, summaryData);
    outputFiles.push(summaryFile);

    return outputFiles;
  }

  /**
   * Analyze a schema file and provide interactive exploration
   * @param {string} schemaName - Name of the schema to analyze
   * @returns {Promise<void>}
   */
  async function analyzeSchema(schemaName) {
    console.log(`\n🔍 Analyzing schema: ${schemaName}`);

    const parsed = await parseSchemaFile(schemaName);
    if (!parsed) return;

    const { tableList, viewList, tables, content } = parsed;

    console.log(`   Tables: ${tableList.length}, Views: ${viewList.length}`);

    if (tableList.length === 0 && viewList.length === 0) {
      console.log('⚠️  No tables or views found in this schema');
      return;
    }

    const { choice } = await inquirer.prompt([{
      type: 'list',
      name: 'choice',
      message: `What to do with '${schemaName}'?`,
      choices: [
        'List All Objects',
        'Explore Table',
        'Export to JSON',
        'Export to CSV',
        'Show Statistics',
        'Back'
      ]
    }]);

    if (choice === 'List All Objects') {
      console.log(`\n📋 Tables (${tableList.length}):`);
      tableList.forEach((t, i) => console.log(`   ${i + 1}. ${t}`));
      if (viewList.length > 0) {
        console.log(`\n👁️  Views (${viewList.length}):`);
        viewList.forEach((v, i) => console.log(`   ${i + 1}. ${v}`));
      }
    } else if (choice === 'Explore Table') {
      if (tableList.length === 0) {
        console.log('⚠️  No tables available to explore');
        return;
      }

      const { selectedTable } = await inquirer.prompt([{
        type: 'list',
        name: 'selectedTable',
        message: 'Select table:',
        choices: tableList
      }]);

      const tableAST = tables.find(t => t.table[0].table === selectedTable);

      if (tableAST && tableAST.create_definitions) {
        console.log(`\n📋 Table: ${selectedTable}`);
        console.log('━'.repeat(70));
        console.log('Column Name'.padEnd(25) + 'Type'.padEnd(20) + 'Nullable'.padEnd(10) + 'Constraints');
        console.log('━'.repeat(70));

        tableAST.create_definitions.forEach(def => {
          if (def.resource === 'column') {
            const colName = def.column.column;
            const colType = def.definition?.dataType || 'UNKNOWN';
            const nullable = def.nullable !== false ? 'YES' : 'NO';
            const constraints = [];
            if (def.auto_increment) constraints.push('AUTO_INCREMENT');
            if (def.unique) constraints.push('UNIQUE');
            if (def.primary_key) constraints.push('PRIMARY KEY');

            console.log(
              colName.substring(0, 24).padEnd(25) +
              colType.substring(0, 19).padEnd(20) +
              nullable.padEnd(10) +
              constraints.join(', ')
            );
          }
        });
        console.log('━'.repeat(70));
      } else {
        console.log('⚠️  Could not parse table structure');
      }
    } else if (choice === 'Export to JSON') {
      const outFile = await exportToJSON(schemaName);
      if (outFile) {
        console.log(`✅ Exported JSON: ${outFile}`);
      }
    } else if (choice === 'Export to CSV') {
      const outFiles = await exportToCSV(schemaName);
      if (outFiles && outFiles.length > 0) {
        console.log(`✅ Exported ${outFiles.length} CSV file(s):`);
        outFiles.forEach(f => console.log(`   📄 ${f}`));
      }
    } else if (choice === 'Show Statistics') {
      console.log(`\n📊 Schema Statistics: ${schemaName}`);
      console.log('━'.repeat(50));
      console.log(`Total Tables:       ${tableList.length}`);
      console.log(`Total Views:        ${viewList.length}`);
      console.log(`Total Objects:      ${tableList.length + viewList.length}`);
      console.log(`File Size:          ${(content.length / 1024).toFixed(2)} KB`);
      console.log(`Lines of SQL:       ${content.split('\n').length}`);
      console.log('━'.repeat(50));
    }
  }

  /**
   * Non-interactive export of all or specified schema(s)
   * @param {string|null} schemaName - Schema name or null for all
   * @param {string} format - Export format: 'json' or 'csv'
   * @param {string|null} outputDir - Output directory or null for default
   * @returns {Promise<{success: number, failed: number}>}
   */
  async function exportSchemas(schemaName, format, outputDir) {
    const schemas = await getAvailableSchemas();

    if (schemas.length === 0) {
      console.error('❌ No schemas found. Run --dump-only first.');
      return { success: 0, failed: 0 };
    }

    const toExport = schemaName
      ? schemas.filter(s => s === schemaName)
      : schemas;

    if (toExport.length === 0) {
      console.error(`❌ Schema '${schemaName}' not found.`);
      console.log(`   Available schemas: ${schemas.join(', ')}`);
      return { success: 0, failed: 0 };
    }

    // Ensure output directory exists
    const outDir = outputDir ? path.resolve(outputDir) : SQL_DIR;
    try {
      await fs.mkdir(outDir, { recursive: true });
    } catch { /* Directory exists */ }

    console.log(`\n📤 Exporting ${toExport.length} schema(s) to ${format.toUpperCase()}`);
    console.log(`� Output directory: ${outDir}`);
    console.log('━'.repeat(60));

    const results = { success: 0, failed: 0 };

    for (const schema of toExport) {
      try {
        if (format === 'csv') {
          const files = await exportToCSV(schema, outDir);
          if (files && files.length > 0) {
            console.log(`✅ ${schema}: ${files.length} CSV file(s)`);
            files.forEach(f => cliOptions.verbose && console.log(`   📄 ${path.basename(f)}`));
            results.success++;
          } else {
            throw new Error('No files generated');
          }
        } else {
          const file = await exportToJSON(schema, outDir);
          if (file) {
            console.log(`✅ ${schema}: ${path.basename(file)}`);
            results.success++;
          } else {
            throw new Error('No file generated');
          }
        }
      } catch (err) {
        console.error(`❌ ${schema}: ${err.message}`);
        results.failed++;
      }
    }

    console.log('━'.repeat(60));
    console.log(`📊 Export complete: ${results.success} success, ${results.failed} failed`);

    return results;
  }

  /**
   * Test database connectivity with detailed diagnostics
   * @returns {Promise<{passed: number, failed: number}>}
   */
  async function testDatabaseConnectivity() {
    const mariadb = require('mariadb');
    const results = { passed: 0, failed: 0 };

    console.log('\n🔌 Testing Database Connectivity');
    console.log('━'.repeat(70));

    for (const db of dbs) {
      const startTime = Date.now();
      let conn;

      process.stdout.write(`Testing ${db.name.padEnd(20)} ... `);

      try {
        conn = await mariadb.createConnection(db.config);

        // Test query
        const result = await conn.query('SELECT VERSION() as version, DATABASE() as current_db');
        const duration = Date.now() - startTime;

        console.log(`✅ OK (${duration}ms)`);

        if (cliOptions.verbose && result[0]) {
          console.log(`   Version: ${result[0].version}`);
          console.log(`   Database: ${result[0].current_db || 'none'}`);
          console.log(`   Host: ${db.config.host}:${db.config.port}`);
        }

        // Test schema access
        if (db.config.database) {
          try {
            await conn.query(`USE \`${db.config.database}\``);
            const tables = await conn.query(
              'SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?',
              [db.config.database]
            );
            cliOptions.verbose && console.log(`   Tables: ${tables[0].count}`);
          } catch (schemaErr) {
            console.log(`   ⚠️  Cannot access database '${db.config.database}': ${schemaErr.message}`);
          }
        }

        await conn.end();
        results.passed++;
      } catch (err) {
        const duration = Date.now() - startTime;
        console.log(`❌ FAILED (${duration}ms)`);
        console.error(`   Error: ${err.message}`);

        if (cliOptions.verbose) {
          console.error(`   Code: ${err.code || 'N/A'}`);
          console.error(`   SQL State: ${err.sqlState || 'N/A'}`);
        }

        await safeClose(conn);
        results.failed++;
      }
    }

    console.log('━'.repeat(70));
    console.log(`📊 Results: ${results.passed} passed, ${results.failed} failed out of ${dbs.length}`);
    console.log('━'.repeat(70) + '\n');

    return results;
  }

  /**
   * Main interactive menu
   * @returns {Promise<void>}
   */
  async function mainMenu() {
    const schemas = await getAvailableSchemas();

    const menuChoices = [
      'Test Connectivity',
      'Dump Schemas',
      schemas.length > 0 ? 'Analyze Schema' : { name: 'Analyze Schema (no schemas available)', disabled: true },
      'Show Configuration',
      'Exit'
    ];

    const { choice } = await inquirer.prompt([{
      type: 'list',
      name: 'choice',
      message: 'What would you like to do?',
      choices: menuChoices,
      pageSize: 10
    }]);

    if (choice === 'Test Connectivity') {
      const results = await testDatabaseConnectivity();
      if (results.failed > 0) {
        const { retry } = await inquirer.prompt([{
          type: 'confirm',
          name: 'retry',
          message: 'Some connections failed. Retry?',
          default: false
        }]);
        if (retry) await testDatabaseConnectivity();
      }
    } else if (choice === 'Dump Schemas') {
      const stats = await dumpDatabaseSchemas();
      if (stats.schemas > 0) {
        console.log(`✅ Successfully dumped ${stats.schemas} schema(s)`);
      }
    } else if (choice === 'Analyze Schema') {
      const availableSchemas = await getAvailableSchemas();
      if (availableSchemas.length === 0) {
        console.log('⚠️  No schemas found. Dump schemas first.');
      } else {
        const { selectedSchema } = await inquirer.prompt([{
          type: 'list',
          name: 'selectedSchema',
          message: 'Select schema to analyze:',
          choices: availableSchemas
        }]);
        await analyzeSchema(selectedSchema);
      }
    } else if (choice === 'Show Configuration') {
      console.log('\n🔧 Current Configuration');
      console.log('━'.repeat(70));
      dbs.forEach((db, i) => {
        console.log(`\n${i + 1}. ${db.name}`);
        console.log(`   Host:     ${db.config.host}:${db.config.port}`);
        console.log(`   Database: ${db.config.database || '(none specified)'}`);
        console.log(`   User:     ${db.config.user}`);
        console.log(`   SSL:      ${db.config.ssl ? 'enabled' : 'disabled'}`);
      });
      console.log('\n' + '━'.repeat(70));
    } else {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    }

    // Loop back to menu
    await mainMenu();
  }

  // Handle CLI-driven shortcuts
  if (cliOptions.testOnly) {
    await testDatabaseConnectivity();
    process.exit(0);
  } else if (cliOptions.dumpOnly) {
    await dumpDatabaseSchemas();
    process.exit(0);
  } else if (cliOptions.export) {
    // Validate format
    if (!['json', 'csv'].includes(cliOptions.format)) {
      console.error(`❌ Invalid format: '${cliOptions.format}'. Use 'json' or 'csv'.`);
      process.exit(1);
    }
    await exportSchemas(cliOptions.schema, cliOptions.format, cliOptions.output);
    process.exit(0);
  } else if (cliOptions.analyzeOnly) {
    const schemas = await getAvailableSchemas();
    if (schemas.length === 0) {
      console.log('⚠️  No schemas found. Run dump first.');
      process.exit(1);
    }
    const { selectedSchema } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedSchema',
      message: 'Select schema:',
      choices: schemas
    }]);
    await analyzeSchema(selectedSchema);
    process.exit(0);
  } else {
    // Interactive mode
    await mainMenu();
  }
}

// Main execution
if (require.main === module) {
  checkAndInstallDependencies()
    .then(run)
    .catch(err => {
      console.error('\n❌ Fatal Error:', err.message);
      if (cliOptions.verbose) {
        console.error('\nStack trace:');
        console.error(err.stack);
      }
      process.exit(1);
    });
}

// Export for potential programmatic use
module.exports = {
  buildDbConfigs,
  loadEnvironmentVariables,
  checkAndInstallDependencies,
  createPool,
  safeClose,
  PROJECT_ROOT,
  SQL_DIR
};
