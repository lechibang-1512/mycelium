// Load environment variables
require('dotenv').config();

const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// --- CONFIGURATION ---
const dbs = [
  { name: 'master_specs_db', config: { host: process.env.DB_HOST || '127.0.0.1', user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'master_specs_db' } },
  { name: 'suppliers_db', config: { host: process.env.SUPPLIERS_DB_HOST || '127.0.0.1', user: process.env.SUPPLIERS_DB_USER, password: process.env.SUPPLIERS_DB_PASSWORD, database: process.env.SUPPLIERS_DB_NAME || 'suppliers_db' } },
  { name: 'users_db', config: { host: process.env.AUTH_DB_HOST || '127.0.0.1', user: process.env.AUTH_DB_USER, password: process.env.AUTH_DB_PASSWORD, database: process.env.AUTH_DB_NAME || 'users_db' } }
];
const SQL_DIR = path.join(__dirname, '..', 'sql'); // Create sql directory in project root


/**
 * Checks if required npm packages are installed, and installs them if they are missing.
 */
async function checkAndInstallDependencies() {
    const requiredPackages = ['inquirer', 'node-sql-parser'];
    const missingPackages = [];
    console.log('Checking for required dependencies...');

    for (const pkg of requiredPackages) {
        try {
            require.resolve(pkg);
            console.log(` ✓ ${pkg} is already installed.`);
        } catch (err) {
            console.log(` ✗ ${pkg} is missing.`);
            missingPackages.push(pkg);
        }
    }

    if (missingPackages.length > 0) {
        console.log('\nAttempting to install missing dependencies with npm...');
        console.log('This might take a moment.');

        // Determine the npm command based on the OS
        const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        const args = ['install', ...missingPackages];

        // Spawn a child process to run npm install
        const child = spawn(command, args, { stdio: 'inherit' });

        return new Promise((resolve, reject) => {
            child.on('close', code => {
                if (code === 0) {
                    console.log('\nDependencies installed successfully.');
                    resolve();
                } else {
                    console.error(`\nError: npm install exited with code ${code}`);
                    console.error('Please try running "npm install" manually and then restart the script.');
                    reject(new Error(`npm install failed for: ${missingPackages.join(', ')}`));
                }
            });
            child.on('error', err => {
                console.error('Failed to start npm process.', err);
                reject(err);
            });
        });
    } else {
        console.log('All dependencies are satisfied.\n');
    }
}


/**
 * Main application logic. This function only runs after dependencies are verified.
 */
async function run() {
    // --- DYNAMICALLY LOAD DEPENDENCIES ---
    let inquirer;
    let Parser;
    try {
        // Now that installation is confirmed, it's safe to load the modules.
        inquirer = (await import('inquirer')).default;
        Parser = require('node-sql-parser').Parser;
    } catch (error) {
        console.error('\nFatal: Could not load dependencies even after installation check.', error);
        console.error('Please ensure you have Node.js and npm installed correctly.');
        process.exit(1);
    }
    const parser = new Parser();

    // --- HELPER & ANALYSIS FUNCTIONS (Defined inside run to have access to inquirer/parser) ---

    async function ensureSqlDirExists() {
        try { await fs.access(SQL_DIR); } catch (error) { await fs.mkdir(SQL_DIR); }
    }

    async function dumpDatabaseSchemas() {
        const mariadb = require('mariadb');
        await ensureSqlDirExists();
        
        console.log('\n--- Database Schema Dumping ---');
        
        for (const db of dbs) {
            console.log(`\nConnecting to ${db.name}...`);
            
            let conn;
            try {
                // Create connection pool for this database
                const pool = mariadb.createPool({
                    ...db.config,
                    connectionLimit: 1
                });
                
                conn = await pool.getConnection();
                console.log(`✓ Connected to ${db.name}`);
                
                // Get all tables in the database
                const tables = await conn.query("SHOW TABLES");
                
                if (tables.length === 0) {
                    console.log(`  No tables found in ${db.name}`);
                    conn.end();
                    pool.end();
                    continue;
                }
                
                console.log(`  Found ${tables.length} tables, generating schema...`);
                
                // Generate CREATE TABLE statements for each table
                let schemaSQL = `-- Schema dump for ${db.name}\n-- Generated on ${new Date().toISOString()}\n\n`;
                
                for (const tableRow of tables) {
                    const tableName = Object.values(tableRow)[0]; // Get table name from result
                    
                    try {
                        const createTableResult = await conn.query(`SHOW CREATE TABLE \`${tableName}\``);
                        const createStatement = createTableResult[0]['Create Table'];
                        schemaSQL += `-- Table: ${tableName}\n${createStatement};\n\n`;
                    } catch (tableError) {
                        console.warn(`    Warning: Could not get schema for table ${tableName}: ${tableError.message}`);
                        schemaSQL += `-- Warning: Could not dump table ${tableName} - ${tableError.message}\n\n`;
                    }
                }
                
                // Write schema to file
                const outputFile = path.join(SQL_DIR, `${db.name}-schema.sql`);
                await fs.writeFile(outputFile, schemaSQL);
                console.log(`  ✓ Schema saved to: ${outputFile}`);
                
                conn.end();
                pool.end();
                
            } catch (error) {
                console.error(`  ✗ Failed to dump ${db.name}:`, error.message);
                if (conn) conn.end();
            }
        }
        
        console.log('\n--- Schema dumping completed ---\n');
    }

    async function getAvailableSchemas() {
        await ensureSqlDirExists();
        
        try {
            const files = await fs.readdir(SQL_DIR);
            const schemaFiles = files.filter(file => file.endsWith('-schema.sql'));
            
            if (schemaFiles.length === 0) {
                console.log('\nNo schema files found in sql/ directory.');
                console.log('Please run "Dump Database Schemas" first to generate schema files.\n');
                return [];
            }
            
            // Extract schema names by removing '-schema.sql' suffix
            return schemaFiles.map(file => file.replace('-schema.sql', ''));
        } catch (error) {
            console.error('Error reading SQL directory:', error.message);
            return [];
        }
    }

    async function analyzeSchema(schemaName) {
      const filePath = path.join(SQL_DIR, `${schemaName}-schema.sql`);
      let ast;

      try {
        const sqlContent = await fs.readFile(filePath, 'utf8');
        ast = parser.astify(sqlContent, { database: 'MariaDB' });
      } catch (err) {
        console.error(`Error reading or parsing ${filePath}:`, err.message);
        return;
      }
      
      const tables = ast.filter(node => node.type === 'create' && node.keyword === 'table');
      if (tables.length === 0) {
          console.log('No "CREATE TABLE" statements found in this schema file.');
          return;
      }

      const { choice } = await inquirer.prompt([
        {
          type: 'list', name: 'choice', message: `What do you want to do with the '${schemaName}' schema?`,
          choices: [
            '1. Describe database (List all tables)',
            '2. Explore a specific table\'s schema',
            '3. Export entire schema to JSON',
            new inquirer.Separator(),
            'Back to main menu',
          ],
        },
      ]);

      switch (choice.split('.')[0]) {
        case '1': describeDatabase(tables); break;
        case '2': await exploreTableSchema(tables); break;
        case '3': await exportSchemaToJson(schemaName, ast); break;
        case 'Back to main menu': return;
      }
      
      await analyzeSchema(schemaName); // Show menu again
    }
    
    // Functions describeDatabase, exploreTableSchema, exportSchemaToJson remain the same
    // ...
    function describeDatabase(tables) {
      console.log('\n--- Tables in Schema ---');
      tables.forEach(table => { console.log(`- ${table.table[0].table}`); });
      console.log('------------------------\n');
    }

    async function exploreTableSchema(tables) {
      const tableNames = tables.map(t => t.table[0].table);
      const { selectedTable } = await inquirer.prompt([
        { type: 'list', name: 'selectedTable', message: 'Which table do you want to explore?', choices: tableNames },
      ]);
      const tableAST = tables.find(t => t.table[0].table === selectedTable);
      console.log(`\n--- Schema for table: ${selectedTable} ---`);
      tableAST.create_definitions.forEach(def => {
        if (def.resource === 'column') {
          const colName = `\`${def.column.column}\``;
          const colType = def.definition.dataType;
          const nullable = def.nullable?.value === 'not null' ? 'NOT NULL' : 'NULL';
          const defaultValue = def.default_val ? `DEFAULT ${def.default_val.value.value}` : '';
          const autoIncrement = def.auto_increment ? 'AUTO_INCREMENT' : '';
          console.log(`  ${colName.padEnd(25)} ${colType.padEnd(20)} ${nullable.padEnd(12)} ${autoIncrement} ${defaultValue}`);
        } else if (def.resource === 'constraint') {
          const constraintType = def.constraint_type.toUpperCase();
          const colNames = def.definition.map(c => `\`${c.column}\``).join(', ');
          console.log(`  CONSTRAINT (${constraintType}) on ${colNames}`);
        }
      });
      console.log('-------------------------------------------\n');
    }

    async function exportSchemaToJson(schemaName, ast) {
      const outputObject = { schemaName, tables: {}, otherStatements: [] };
      const tables = ast.filter(node => node.type === 'create' && node.keyword === 'table');
      tables.forEach(tableNode => {
        const tableName = tableNode.table[0].table;
        outputObject.tables[tableName] = { columns: [], constraints: [] };
        tableNode.create_definitions.forEach(def => {
          if (def.resource === 'column') {
            outputObject.tables[tableName].columns.push({ name: def.column.column, type: def.definition.dataType, nullable: def.nullable?.value !== 'not null', defaultValue: def.default_val?.value.value || null, autoIncrement: !!def.auto_increment });
          } else if (def.resource === 'constraint') {
            outputObject.tables[tableName].constraints.push({ name: def.constraint, type: def.constraint_type, columns: def.definition.map(c => c.column) });
          }
        });
      });
      const outputFile = path.join(SQL_DIR, `${schemaName}-schema.json`);
      try {
        await fs.writeFile(outputFile, JSON.stringify(outputObject, null, 2));
        console.log(`\n ✓ Schema successfully exported to: ${outputFile}\n`);
      } catch(err) {
        console.error(`\n ✗ Failed to write JSON file:`, err.message);
      }
    }


    // --- MAIN MENU ---
    async function mainMenu() {
      const { choice } = await inquirer.prompt([
        {
          type: 'list', name: 'choice', message: 'What would you like to do?',
          choices: [
            '1. Dump Database Schemas (from live DB)',
            '2. Analyze Existing SQL Schema (from .sql files)',
            new inquirer.Separator(),
            'Exit',
          ],
        },
      ]);

      switch (choice.split('.')[0]) {
        case '1':
          await dumpDatabaseSchemas().catch(() => console.log("\nDump operation failed. Returning to menu."));
          await mainMenu();
          break;
        case '2':
          const schemas = await getAvailableSchemas();
          if (schemas.length > 0) {
            const { selectedSchema } = await inquirer.prompt([
                { type: 'list', name: 'selectedSchema', message: 'Which schema do you want to analyze?', choices: schemas }
            ]);
            await analyzeSchema(selectedSchema);
          }
          await mainMenu();
          break;
        case 'Exit':
          console.log('Goodbye!');
          process.exit(0);
      }
    }

    // Start the application's main menu
    await mainMenu();
}

// --- SCRIPT ENTRY POINT ---
// First, check and install dependencies, then start the main application logic.
checkAndInstallDependencies()
    .then(run) // If check/install is successful, run the app
    .catch(() => {
        // If checkAndInstallDependencies rejects, the error is already logged.
        // We exit gracefully.
        process.exit(1);
    });