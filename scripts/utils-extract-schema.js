const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Database configs from server.js
const dbs = [
  {
    name: 'master_specs_db',
    config: {
      host: '127.0.0.1',
      user: 'lechibang',
      password: '1212',
      database: 'master_specs_db',
    }
  },
  {
    name: 'suppliers_db',
    config: {
      host: '127.0.0.1',
      user: 'lechibang',
      password: '1212',
      database: 'suppliers_db',
    }
  },
  {
    name: 'users_db',
    config: {
      host: '127.0.0.1',
      user: 'lechibang',
      password: '1212',
      database: 'users_db',
    }
  }
];

const sqlDir = path.join(__dirname, 'sql');
if (!fs.existsSync(sqlDir)) {
  fs.mkdirSync(sqlDir);
}

dbs.forEach(({ name, config }) => {
  const outputFile = path.join(sqlDir, `${name}-schema.sql`);
  // Use /usr/bin/mariadb-dump instead of mysqldump
  const cmd = `/usr/bin/mariadb-dump -h${config.host} -u${config.user} -p${config.password} --no-data ${config.database} > "${outputFile}"`;
  console.log(`Extracting schema for ${name} to ${outputFile}`);
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error extracting schema for ${name}:`, error.message);
      return;
    }
    if (stderr) {
      console.error(`mariadb-dump stderr for ${name}:`, stderr);
    }
    console.log(`Schema extraction for ${name} complete.`);
  });
});
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        