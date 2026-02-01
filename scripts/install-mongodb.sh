#!/bin/bash
# MongoDB Installation and User Setup Script
# Run with: sudo bash install-mongodb.sh
# 
# This script includes a workaround for Debian 13's SHA1 policy expiry (Feb 2026)

set -e

echo "=== MongoDB Installation Script for Debian 13 ==="

# Step 1: Apply SHA1 policy workaround for Debian 13 Sequoia
echo "[1/7] Applying SHA1 policy workaround for Sequoia GPG verifier..."
mkdir -p /etc/crypto-policies/back-ends/

if [ -f /usr/share/apt/default-sequoia.config ]; then
    cp /usr/share/apt/default-sequoia.config /etc/crypto-policies/back-ends/apt-sequoia.config
    
    # Extend SHA1 expiry dates to 2030
    sed -i 's/sha1\.second_preimage_resistance = .*/sha1.second_preimage_resistance = 2030-01-01/' /etc/crypto-policies/back-ends/apt-sequoia.config
    
    # Also update signature.v3 if present
    if grep -q "signature.v3" /etc/crypto-policies/back-ends/apt-sequoia.config; then
        sed -i 's/signature\.v3 = .*/signature.v3 = 2030-01-01/' /etc/crypto-policies/back-ends/apt-sequoia.config
    fi
    
    echo "  SHA1 policy extended to 2030-01-01"
else
    echo "  Warning: default-sequoia.config not found, skipping workaround"
fi

# Step 2: Install dependencies
echo "[2/7] Installing dependencies..."
apt-get update
apt-get install -y gnupg curl

# Step 3: Add MongoDB GPG key
echo "[3/7] Adding MongoDB GPG key..."
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor --yes

# Step 4: Add MongoDB repository
echo "[4/7] Adding MongoDB repository..."
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Step 5: Install MongoDB
echo "[5/7] Installing MongoDB..."
apt-get update
apt-get install -y mongodb-org

# Step 6: Start MongoDB service
echo "[6/7] Starting MongoDB service..."
systemctl daemon-reload
systemctl start mongod
systemctl enable mongod

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to start..."
sleep 5

# Check if MongoDB is running
if ! systemctl is-active --quiet mongod; then
    echo "Error: MongoDB failed to start. Check: journalctl -u mongod"
    exit 1
fi

# Step 7: Create user with credentials lechibang/1212
echo "[7/7] Creating database user..."
mongosh admin --eval '
  db.createUser({
    user: "lechibang",
    pwd: "1212",
    roles: [
      { role: "root", db: "admin" },
      { role: "readWrite", db: "mycelium" },
      { role: "dbAdmin", db: "mycelium" }
    ]
  });
'

# Initialize the mycelium database
mongosh mycelium --eval '
  db.createCollection("_init");
  db.getCollection("_init").drop();
  print("Database mycelium initialized");
'

echo ""
echo "=== MongoDB Installation Complete! ==="
echo ""
echo "Connection details:"
echo "  URI: mongodb://lechibang:1212@localhost:27017/mycelium?authSource=admin"
echo ""
echo "To test connection:"
echo "  mongosh 'mongodb://lechibang:1212@localhost:27017/mycelium?authSource=admin'"
echo ""
echo "MongoDB service status:"
systemctl status mongod --no-pager | head -5
