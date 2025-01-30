#!/bin/bash
# This script runs on first MariaDB container startup.
# It creates both databases and imports the schema exports.

set -e

echo "🔧 Creating databases..."
mariadb -u root -p"$MARIADB_ROOT_PASSWORD" <<-EOSQL
    CREATE DATABASE IF NOT EXISTS master_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE DATABASE IF NOT EXISTS security_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

    GRANT ALL PRIVILEGES ON master_db.* TO '$MARIADB_USER'@'%';
    GRANT ALL PRIVILEGES ON security_db.* TO '$MARIADB_USER'@'%';
    FLUSH PRIVILEGES;
EOSQL

echo "📦 Importing master_db schema..."
mariadb -u root -p"$MARIADB_ROOT_PASSWORD" master_db < /docker-entrypoint-initdb.d/master_db.sql

echo "🔐 Importing security_db schema..."
mariadb -u root -p"$MARIADB_ROOT_PASSWORD" security_db < /docker-entrypoint-initdb.d/security_db.sql

echo "✅ Database initialization complete!"
