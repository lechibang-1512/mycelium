#!/bin/bash

# Quick Product Regression Test Runner
# Runs only the product-specific tests for faster validation

echo "🚀 Quick Product Regression Test"
echo "================================"
echo "Testing existing product functionality after changes..."
echo ""

# Run product regression tests only
node scripts/regression-tests/product-regression.js

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ QUICK PRODUCT REGRESSION: PASSED"
    echo "All core product functionality is working correctly."
else
    echo ""
    echo "❌ QUICK PRODUCT REGRESSION: FAILED"
    echo "Product functionality issues detected - review required."
fi

exit $EXIT_CODE