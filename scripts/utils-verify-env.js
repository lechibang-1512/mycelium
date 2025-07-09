#!/usr/bin/env node

/**
 * verify-env.js
 *
 * 1) Verifies that .env and .env.example exist
 * 2) Logs all required variables and their values (or marks them missing)
 * 3) Validates presence, placeholders, duplicates, and types
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_KEYS = [
  // Main DB
  'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_SSL',
  // Suppliers DB
  'SUPPLIERS_DB_HOST', 'SUPPLIERS_DB_PORT', 'SUPPLIERS_DB_USER',
  'SUPPLIERS_DB_PASSWORD', 'SUPPLIERS_DB_NAME', 'SUPPLIERS_DB_SSL',
  // Auth DB
  'AUTH_DB_HOST', 'AUTH_DB_PORT', 'AUTH_DB_USER',
  'AUTH_DB_PASSWORD', 'AUTH_DB_NAME', 'AUTH_DB_SSL',
  // Session & Server
  'SESSION_SECRET', 'PORT', 'NODE_ENV'
];

const PLACEHOLDER_REGEX = [
  /your_database_user/i,
  /your_database_password/i,
  /your_session_secret_here/i
];

/**
 * Parse a .env file into key/value pairs, detect duplicates.
 */
function parseEnvFile(content) {
  const lines = content.split(/\r?\n/);
  const env = {};
  const seen = new Set();
  const duplicates = new Set();

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 0) continue;

    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();

    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
    env[key] = value;
  }

  return { env, duplicates: [...duplicates] };
}

/**
 * Main validation routine.
 */
function validateEnv(root) {
  const envPath      = path.join(root, '.env');
  const examplePath  = path.join(root, '.env.example');
  let allGood = true;

  // 1) Check existence of .env and .env.example
  console.log('🔍 Checking for environment files:');
  [ {name: '.env', path: envPath}, {name: '.env.example', path: examplePath} ]
    .forEach(file => {
      if (fs.existsSync(file.path)) {
        console.log(`  ✅ Found ${file.name}`);
      } else {
        console.error(`  ❌ Missing ${file.name}`);
        allGood = false;
      }
    });

  // If .env is missing, we cannot proceed
  if (!fs.existsSync(envPath)) {
    process.exit(1);
  }

  // 2) Read and parse .env
  const content = fs.readFileSync(envPath, 'utf-8');
  const { env, duplicates } = parseEnvFile(content);

  // 3) Log all required variables and their current values
  console.log('\n📝 Current variable values:');
  for (const key of REQUIRED_KEYS) {
    if (key in env) {
      console.log(`  ${key} = ${env[key]}`);
    } else {
      console.log(`  ${key} = <missing>`);
    }
  }

  // 4) Validate presence
  console.log('\n🔧 Validating required keys:');
  for (const key of REQUIRED_KEYS) {
    if (!(key in env)) {
      console.error(`  ❌ Missing required key: ${key}`);
      allGood = false;
    }
  }

  // 5) Detect placeholder values
  console.log('\n🔒 Checking for placeholders:');
  for (const [key, val] of Object.entries(env)) {
    if (PLACEHOLDER_REGEX.some(rx => rx.test(val))) {
      console.error(`  ❌ Placeholder detected for ${key}: "${val}"`);
      allGood = false;
    }
  }

  // 6) Detect duplicates
  if (duplicates.length) {
    console.log('\n🧩 Duplicate keys found:');
    duplicates.forEach(key => {
      console.error(`  ❌ ${key}`);
      allGood = false;
    });
  }

  // 7) Type validation for ports and SSL flags
  console.log('\n⚙️ Validating types:');
  ['DB_PORT','SUPPLIERS_DB_PORT','AUTH_DB_PORT','PORT'].forEach(k => {
    const v = env[k];
    if (v && !/^\d+$/.test(v)) {
      console.error(`  ❌ ${k} must be a number, got "${v}"`);
      allGood = false;
    }
  });
  ['DB_SSL','SUPPLIERS_DB_SSL','AUTH_DB_SSL'].forEach(k => {
    const v = env[k]?.toLowerCase();
    if (v && v !== 'true' && v !== 'false') {
      console.error(`  ❌ ${k} must be true|false, got "${env[k]}"`);
      allGood = false;
    }
  });

  // 8) Final result
  if (allGood) {
    console.log('\n✅ All checks passed. Your .env is good to go.');
    process.exit(0);
  } else {
    console.error('\n❌ Some checks failed. Please review the errors above.');
    process.exit(1);
  }
}

// --- Run ---
validateEnv(process.cwd());
