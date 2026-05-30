#!/bin/bash
# Production fix script for bordershop backend
# Fixes: 1) branch.phoneNumber bug, 2) users table schema mismatch

set -e

echo "=== Production Fix Script ==="
echo "Date: $(date)"
echo ""

# Navigate to backend directory
cd "$(dirname "$0")/.."

echo "1. Running database transformations..."
node scripts/safe-transform-users.js 2>&1 | grep -v "Warning:" | grep -v "To prepare" | grep -v "See https" | grep -v "Use \`node"

echo ""
echo "2. Verifying transformation..."
node scripts/check-tables.js 2>&1 | grep -v "Warning:" | grep -v "To prepare" | grep -v "See https" | grep -v "Use \`node"

echo ""
echo "3. Running remaining migrations..."
npm run db:migrate 2>&1 | grep -E "migrating|migrated|ERROR|==" | tail -20

echo ""
echo "=== Fix Script Complete ==="
echo "Please restart the backend service to apply code changes (sales.js fix)"
