#!/bin/bash

# setup.sh - Automated setup script for Mycelium ERP

echo "🍄 Mycelium ERP Setup 🍄"
echo "============================="

# 0. Environment Setup
echo "🔧 Phase 0: Environment Setup..."
if [ ! -f ".env" ]; then
    echo "   .env not found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "   ✅ .env created."
    else
        echo "   ⚠️ .env.example not found! Skipping .env creation."
    fi
else
    echo "   .env exists, skipping."
fi

# 1. Install Dependencies
echo "📦 Phase 1: Installing Dependencies..."
if [ -d "node_modules" ]; then
    echo "   node_modules exists, skipping install (run 'npm ci' to force)"
else
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ npm install failed!"
        exit 1
    fi
fi

# 2. Seed Database
echo "🌱 Phase 2: Seeding Database..."
node scripts/tools/seed-db.js
if [ $? -ne 0 ]; then
    echo "❌ Database seeding failed!"
    exit 1
fi

# 3. Initialize RBAC
echo "🔐 Phase 3: Initializing RBAC (Skipped - handled by DB schemas)..."
# node scripts/init-rbac.js
# if [ $? -ne 0 ]; then
#     echo "❌ RBAC initialization failed!"
#     exit 1
# fi

echo "============================="
echo "✅ Setup Complete!"
echo "   Run 'npm start' to launch the server."
