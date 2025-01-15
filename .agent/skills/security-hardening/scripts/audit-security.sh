#!/bin/bash
# Script to identify potential security vulnerabilities in the Mycelium codebase

echo "=== Security Hardening Audit ==="
echo ""
echo "🔍 Checking backend/services for unparameterized SQL queries (string interpolation in SQL):"
grep -rnP "\`(SELECT|INSERT|UPDATE|DELETE).*\$\{.*\}\`" backend/services/

echo ""
echo "🔍 Checking frontend/ for dangerous HTML injections:"
grep -rn "dangerouslySetInnerHTML" frontend/

echo ""
echo "💡 Reminder: Any dynamic SQL identifiers must pass through isValidIdentifier()."
