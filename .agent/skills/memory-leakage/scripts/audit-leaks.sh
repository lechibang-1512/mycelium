#!/bin/bash
# Script to identify potential memory leaks in the Mycelium codebase

echo "=== Memory Leakage Audit ==="
echo ""
echo "🔍 Checking backend/services for pool connections that might not be released:"
# This looks for getConnection but we expect them to be wrapped in withConnection
grep -rn "pool.getConnection" backend/services/

echo ""
echo "🔍 Checking frontend/src for setInterval or addEventListener that might lack cleanup in useEffect:"
grep -rn "setInterval(" frontend/
grep -rn "addEventListener(" frontend/

echo ""
echo "💡 Reminder: Review the above frontend matches to ensure a cleanup function is returned in useEffect!"
