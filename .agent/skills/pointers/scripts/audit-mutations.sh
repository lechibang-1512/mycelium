#!/bin/bash
# Script to identify potential unintended reference mutations

echo "=== Pointer & Reference Mutation Audit ==="
echo ""
echo "🔍 Checking backend/services for array mutations (push/splice) on potentially shared object references:"
grep -rn "\.push(" backend/services/
grep -rn "\.splice(" backend/services/

echo ""
echo "🔍 Checking frontend/ for direct React state mutations:"
grep -rn "state\..*=" frontend/
# Avoid pushing directly to state arrays
grep -rn "\.push(" frontend/

echo ""
echo "💡 Reminder: Always use spread operators [...arr] or structuredClone() when modifying cached state."
