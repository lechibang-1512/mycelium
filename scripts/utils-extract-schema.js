// Auto-detect and load environment variables from multiple possible locations
const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * Auto-detect .env file location and load it
 */
function loadEnvironmentVariables() {
  const possiblePaths = [
    // Current working directory
    path.join(process.cwd(), '.env'),
    // Script directory
    path.join(__dirname, '.env'),
    // Parent directory of script
    path.join(__dirname, '..', '.env'),
    // Grandparent directory of script (in case script is in subdirectory)
    path.join(__dirname, '..', '..', '.env'),
    // Common project root patterns
    path.join(process.cwd(), '..', '.env'),
  ];

  let envFound = false;
  for (const envPath of possiblePaths) {
    try {
      if (require('fs').existsSync(envPath)) {
        console.log(`🔍 Found .env file at: ${envPath}`);
        require('dotenv').config({ path: envPath });
        envFound = true;
        break;
      }
    } catch (error) {
      // Continue searching
    }
  }

  if (!envFound) {
    console.warn('⚠️  No .env file found. Using system environment variables only.');
    console.warn('   Searched locations:');
    possiblePaths.forEach(p => console.warn(`   - ${p}`));
  }

  return envFound;
}

// Load environment variables
loadEnvironmentVariables();

// --- CONFIGURATION ---
const dbs = [
  {
    name: 'master_specs_db',
    config: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'master_specs_db',
      ssl: process.env.DB_SSL === 'true'
    }
  },
  {
    name: 'suppliers_db',
    config: {
      host: process.env.SUPPLIERS_DB_HOST || '127.0.0.1',
      port: Number(process.env.SUPPLIERS_DB_PORT) || 3306,
      user: process.env.SUPPLIERS_DB_USER,
      password: process.env.SUPPLIERS_DB_PASSWORD,
      database: process.env.SUPPLIERS_DB_NAME || 'suppliers_db',
      ssl: process.env.SUPPLIERS_DB_SSL === 'true'
    }
  },
  {
    name: 'security_db',
    config: {
      host: process.env.AUTH_DB_HOST || '127.0.0.1',
      port: Number(process.env.AUTH_DB_PORT) || 3306,
      user: process.env.AUTH_DB_USER,
      password: process.env.AUTH_DB_PASSWORD,
      database: process.env.AUTH_DB_NAME || 'security_db',
      ssl: process.env.AUTH_DB_SSL === 'true'
    }
  }
];

// --- CONFIGURATION ---
// Auto-detect SQL directory location
function getProjectRoot() {
  let currentDir = __dirname;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    // Check if this looks like project root (has package.json)
    const packageJsonPath = path.join(currentDir, 'package.json');
    try {
      if (require('fs').existsSync(packageJsonPath)) {
        console.log(`📁 Detected project root: ${currentDir}`);
        return currentDir;
      }
    } catch (error) {
      // Continue searching
    }
    
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached filesystem root
    currentDir = parentDir;
    attempts++;
  }

  // Fallback to script's parent directory
  console.log(`📁 Using fallback directory: ${path.dirname(__dirname)}`);
  return path.dirname(__dirname);
}

const PROJECT_ROOT = getProjectRoot();
const SQL_DIR = path.join(PROJECT_ROOT, 'sql');

/**
 * Ensures required packages are installed.
 */
async function checkAndInstallDependencies() {
  const requiredPackages = ['inquirer', 'node-sql-parser', 'mariadb'];
  const missingPackages = [];

  console.log('🔍 Checking dependencies...');

  for (const pkg of requiredPackages) {
    try {
      require.resolve(pkg);
      console.log(`  ✅ ${pkg} - found`);
    } catch {
      console.log(`  ❌ ${pkg} - missing`);
      missingPackages.push(pkg);
    }
  }

  if (missingPackages.length > 0) {
    console.log(`\n📦 Installing missing packages: ${missingPackages.join(', ')}`);
    const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const args = ['install', ...missingPackages];
    const child = spawn(command, args, { stdio: 'inherit', cwd: PROJECT_ROOT });

    return new Promise((resolve, reject) => {
      child.on('close', code => {
        if (code === 0) {
          console.log('✅ Dependencies installed successfully\n');
          resolve();
        } else {
          reject(new Error(`npm install failed with exit code ${code}`));
        }
      });
      child.on('error', reject);
    });
  } else {
    console.log('✅ All dependencies are already installed\n');
  }
}

/**
 * Main application logic
 */
async function run() {
  console.log('🔧 Database Schema Extract Tool');
  console.log('================================');
  console.log(`📁 Current Working Directory: ${process.cwd()}`);
  console.log(`📁 Script Location: ${__dirname}`);
  console.log(`📁 Project Root: ${PROJECT_ROOT}`);
  console.log(`📂 SQL Directory: ${SQL_DIR}`);
  console.log('');

  // Validate environment variables
  const requiredVars = [
    'DB_USER', 'DB_PASSWORD', 'DB_NAME',
    'SUPPLIERS_DB_USER', 'SUPPLIERS_DB_PASSWORD', 'SUPPLIERS_DB_NAME',
    'AUTH_DB_USER', 'AUTH_DB_PASSWORD', 'AUTH_DB_NAME'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️  Warning: Some environment variables are missing:');
    missingVars.forEach(varName => console.warn(`   - ${varName}`));
    console.warn('   Database operations may fail for missing configurations.');
    console.warn('');
  } else {
    console.log('✅ All required environment variables are present');
    console.log('');
  }

  let inquirer, Parser;
  try {
    inquirer = (await import('inquirer')).default;
    Parser = require('node-sql-parser').Parser;
  } catch (error) {
    console.error('Failed to load dependencies:', error.message);
    process.exit(1);
  }

  const parser = new Parser();

  async function ensureSqlDirExists() {
    try {
      await fs.access(SQL_DIR);
      console.log(`📂 SQL directory exists: ${SQL_DIR}`);
    } catch {
      console.log(`📂 Creating SQL directory: ${SQL_DIR}`);
      await fs.mkdir(SQL_DIR, { recursive: true });
    }
  }

  async function dumpDatabaseSchemas() {
    const mariadb = require('mariadb');
    await ensureSqlDirExists();

    console.log('\n--- Database Schema Dumping ---');
    console.log('Note: This will overwrite any existing schema files');
    console.log('');

    for (const db of dbs) {
      console.log(`\nConnecting to ${db.name} at ${db.config.host}:${db.config.port}...`);
      let conn;
      
      try {
        // Validate required connection parameters
        if (!db.config.user || !db.config.password) {
          console.error(`  ✗ Missing credentials for ${db.name}. Check your environment variables.`);
          continue;
        }

        // Use direct connection instead of pool for simpler schema dumping
        conn = await mariadb.createConnection({
          ...db.config,
          connectTimeout: 30000,  // 30 seconds
          acquireTimeout: 30000,  // 30 seconds
          timeout: 60000,         // 60 seconds for queries
          multipleStatements: false,
          trace: false
        });

        console.log(`✓ Connected to ${db.name}`);

        // Test connection with a simple query first
        await conn.query("SELECT 1");
        console.log(`  ✓ Connection test successful`);

        const tables = await conn.query("SHOW TABLES");

        if (tables.length === 0) {
          console.log(`  No tables in ${db.name}`);
          await conn.end();
          continue;
        }

        console.log(`  Found ${tables.length} tables`);
        let schemaSQL = `-- Schema for ${db.name}\n-- Generated on ${new Date().toISOString()}\n\n`;

        for (const row of tables) {
          const tableName = Object.values(row)[0];
          console.log(`    Processing table: ${tableName}`);
          try {
            const createTable = await conn.query(`SHOW CREATE TABLE \`${tableName}\``);
            schemaSQL += `-- Table: ${tableName}\n${createTable[0]['Create Table']};\n\n`;
          } catch (err) {
            console.error(`    ✗ Could not dump table ${tableName}: ${err.message}`);
            schemaSQL += `-- Could not dump table ${tableName}: ${err.message}\n\n`;
          }
        }

        const outputFile = path.join(SQL_DIR, `${db.name}-schema.sql`);
        
        // Check if file exists and warn about overwrite
        try {
          await fs.access(outputFile);
          console.log(`  📝 Overwriting existing file: ${outputFile}`);
        } catch (error) {
          // File doesn't exist, that's fine
          console.log(`  📝 Creating new file: ${outputFile}`);
        }
        
        await fs.writeFile(outputFile, schemaSQL);
        console.log(`  ✓ Schema saved to ${outputFile}`);

        await conn.end();
      } catch (error) {
        console.error(`  ✗ Failed to dump ${db.name}: ${error.message}`);
        
        // Provide more specific error guidance
        if (error.message.includes('timeout')) {
          console.error(`    This is usually a network connectivity issue or the database is not running.`);
        } else if (error.message.includes('Access denied')) {
          console.error(`    Check your database credentials in the environment variables.`);
        } else if (error.message.includes('Unknown database')) {
          console.error(`    The database '${db.config.database}' doesn't exist.`);
        } else if (error.message.includes('ECONNREFUSED')) {
          console.error(`    Cannot connect to ${db.config.host}:${db.config.port}. Is the database server running?`);
        }
        
        if (conn) {
          try {
            await conn.end();
          } catch (closeError) {
            // Ignore close errors
          }
        }
      }
    }

    console.log('\n--- Schema dumping completed ---\n');
  }

  async function getAvailableSchemas() {
    await ensureSqlDirExists();
    try {
      const files = await fs.readdir(SQL_DIR);
      return files.filter(f => f.endsWith('-schema.sql')).map(f => f.replace('-schema.sql', ''));
    } catch (err) {
      console.error('Failed to read SQL dir:', err.message);
      return [];
    }
  }

  async function analyzeSchema(schemaName) {
    const parser = new Parser();
    const filePath = path.join(SQL_DIR, `${schemaName}-schema.sql`);
    let ast;

    try {
      const content = await fs.readFile(filePath, 'utf8');
      ast = parser.astify(content, { database: 'MariaDB' });
    } catch (err) {
      console.error(`Error reading/parsing ${schemaName}: ${err.message}`);
      return;
    }

    const tables = ast.filter(node => node.type === 'create' && node.keyword === 'table');
    if (tables.length === 0) {
      console.log('No CREATE TABLE found in schema.');
      return;
    }

    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: `What do you want to do with '${schemaName}'?`,
        choices: [
          '1. Describe database (List tables)',
          '2. Explore a specific table\'s schema',
          '3. Export entire schema to JSON',
          new inquirer.Separator(),
          'Back to main menu',
        ]
      }
    ]);

    switch (choice.split('.')[0]) {
      case '1': describeDatabase(tables); break;
      case '2': await exploreTableSchema(tables); break;
      case '3': await exportSchemaToJson(schemaName, ast); break;
      default: return;
    }

    await analyzeSchema(schemaName); // repeat menu
  }

  function describeDatabase(tables) {
    console.log('\n--- Tables ---');
    tables.forEach(t => console.log(`- ${t.table[0].table}`));
    console.log('--------------\n');
  }

  async function exploreTableSchema(tables) {
    const tableNames = tables.map(t => t.table[0].table);
    const { selectedTable } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedTable',
        message: 'Select a table to explore:',
        choices: tableNames
      }
    ]);

    const tableAST = tables.find(t => t.table[0].table === selectedTable);
    console.log(`\n--- ${selectedTable} ---`);
    tableAST.create_definitions.forEach(def => {
      if (def.resource === 'column') {
        const col = def.column.column;
        const type = def.definition.dataType;
        const nullable = def.nullable?.value === 'not null' ? 'NOT NULL' : 'NULL';
        const defVal = def.default_val?.value?.value ? `DEFAULT ${def.default_val.value.value}` : '';
        const autoInc = def.auto_increment ? 'AUTO_INCREMENT' : '';
        console.log(`  \`${col}\` ${type} ${nullable} ${autoInc} ${defVal}`);
      } else if (def.resource === 'constraint') {
        const cols = def.definition.map(c => `\`${c.column}\``).join(', ');
        console.log(`  CONSTRAINT ${def.constraint_type.toUpperCase()} ON ${cols}`);
      }
    });
    console.log('------------------------\n');
  }

  async function exportSchemaToJson(schemaName, ast) {
    const tables = ast.filter(node => node.type === 'create' && node.keyword === 'table');
    const json = {
      schemaName,
      tables: {},
      otherStatements: []
    };

    for (const t of tables) {
      const name = t.table[0].table;
      json.tables[name] = {
        columns: [],
        constraints: []
      };
      for (const def of t.create_definitions) {
        if (def.resource === 'column') {
          json.tables[name].columns.push({
            name: def.column.column,
            type: def.definition.dataType,
            nullable: def.nullable?.value !== 'not null',
            defaultValue: def.default_val?.value?.value || null,
            autoIncrement: !!def.auto_increment
          });
        } else if (def.resource === 'constraint') {
          json.tables[name].constraints.push({
            name: def.constraint,
            type: def.constraint_type,
            columns: def.definition.map(c => c.column)
          });
        }
      }
    }

    const outFile = path.join(SQL_DIR, `${schemaName}-schema.json`);
    try {
      // Check if file exists and warn about overwrite
      try {
        await fs.access(outFile);
        console.log(`📝 Overwriting existing JSON file: ${outFile}`);
      } catch (error) {
        // File doesn't exist, that's fine
        console.log(`📝 Creating new JSON file: ${outFile}`);
      }
      
      await fs.writeFile(outFile, JSON.stringify(json, null, 2));
      console.log(`\n✓ JSON exported to: ${outFile}\n`);
    } catch (err) {
      console.error(`✗ Failed to export JSON: ${err.message}`);
    }
  }

  async function testDatabaseConnectivity() {
    const mariadb = require('mariadb');
    console.log('\n--- Testing Database Connectivity ---');

    for (const db of dbs) {
      console.log(`\nTesting connection to ${db.name}...`);
      
      // Check if credentials are available
      if (!db.config.user || !db.config.password) {
        console.error(`  ✗ Missing credentials for ${db.name}`);
        console.error(`    Required env vars: DB_USER, DB_PASSWORD (or specific DB variants)`);
        continue;
      }

      let conn;
      try {
        conn = await mariadb.createConnection({
          ...db.config,
          connectTimeout: 5000,  // Shorter timeout for connectivity test
          acquireTimeout: 5000
        });

        // Test basic connectivity
        await conn.query("SELECT 1 as test");
        console.log(`  ✓ ${db.name} connection successful`);
        
        // Test database access
        const result = await conn.query("SELECT DATABASE() as current_db");
        console.log(`  ✓ Current database: ${result[0].current_db || 'none'}`);
        
        await conn.end();
      } catch (error) {
        console.error(`  ✗ ${db.name} connection failed: ${error.message}`);
        if (conn) {
          try {
            await conn.end();
          } catch (e) {
            // Ignore close errors
          }
        }
      }
    }
    console.log('\n--- Connectivity test completed ---\n');
  }

  async function mainMenu() {
    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'Choose an action:',
        choices: [
          '1. Test Database Connectivity',
          '2. Dump Database Schemas (live DB)',
          '3. Analyze Existing SQL Schema (from file)',
          new inquirer.Separator(),
          'Exit'
        ]
      }
    ]);

    switch (choice.split('.')[0]) {
      case '1':
        await testDatabaseConnectivity();
        return mainMenu();
      case '2':
        await dumpDatabaseSchemas();
        return mainMenu();
      case '3':
        const schemas = await getAvailableSchemas();
        if (schemas.length === 0) {
          console.log('No schema files found.');
        } else {
          const { selectedSchema } = await inquirer.prompt([
            { type: 'list', name: 'selectedSchema', message: 'Select schema file:', choices: schemas }
          ]);
          await analyzeSchema(selectedSchema);
        }
        return mainMenu();
      default:
        console.log('Goodbye!');
        process.exit(0);
    }
  }

  await mainMenu();
}

checkAndInstallDependencies()
  .then(run)
  .catch(err => {
    console.error('❌ Initialization failed:', err.message);
    console.error('');
    console.error('Troubleshooting tips:');
    console.error('1. Make sure you are running this from a directory with access to the project');
    console.error('2. Ensure .env file exists in the project root or current directory');
    console.error('3. Check that Node.js and npm are properly installed');
    console.error('4. Try running: npm install');
    console.error('');
    process.exit(1);
  });
