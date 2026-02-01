# Tests Directory

This directory contains all automated tests for the Mycelium inventory management system.

## Quick Start

```bash
# Run all tests (comprehensive suite)
npm test

# Run specific test types
npm run test:unit           # Unit tests (services)
npm run test:integration    # Integration tests (API)
npm run test:services       # Service unit tests only
npm run test:api            # API integration tests only

# Run with coverage
npm run test:coverage
npm run test:coverage:report

# Run specific test file
npx mocha scripts/tests/unit/WarehouseService.test.js

# Watch mode for development
npm run test:watch
```

## Structure

```
tests/
├── README.md                                # This file
├── setup.js                                 # Global test configuration
├── run-all-tests.js                         # Unified test runner
│
├── helpers/
│   └── api-test-helper.js                  # Reusable test utilities
│
├── unit/                                    # Unit tests (services)
│   ├── WarehouseService.test.js            # Warehouse service
│   ├── SupplierService.test.js             # Supplier service
│   ├── BatchTrackingService.test.js        # Batch tracking
│   └── SerialTrackingService.test.js       # Serial tracking
│
├── integration/                             # API integration tests
│   ├── api.inventory.test.js               # Inventory endpoints
│   ├── api.warehouses.test.js              # Warehouse & zones
│   ├── api.dashboard.test.js               # Dashboard statistics
│   └── api.suppliers.test.js               # Supplier management
│
├── performance/                             # Performance tests
│   └── api.performance.test.js             # Load & speed tests
│
└── legacy/
    ├── InventoryTransactionService.test.js # Transaction service tests
    ├── zone-based-regression-test.js       # Regression tests
    └── comprehensive-api-test-suite.js     # Comprehensive API tests
```

## Test Types

### 1. Integration Tests
Test API endpoints with real HTTP requests.

**Location:** `tests/integration/`

**Run:**
```bash
npm run test:integration
```

### 2. Unit Tests
Test individual service classes in isolation.

**Location:** `tests/unit/` or root level

**Run:**
```bash
npm run test:unit
```

### 3. Performance Tests
Test response times and load handling.

**Location:** `tests/performance/`

**Run:**
```bash
npx mocha tests/performance/**/*.test.js
```

### 4. Regression Tests
Test critical workflows for breaking changes.

**Run:**
```bash
npm run test:zone-regression
```

## Writing Tests

### Example Integration Test

```javascript
const { expect } = require('chai');
const { APITestHelper } = require('./helpers/api-test-helper');

describe('My API Feature', function() {
    let api;
    
    before(async function() {
        api = new APITestHelper();
        await api.login();
    });
    
    it('should work correctly', async function() {
        const response = await api.get('/api/my-endpoint');
        expect(response.status).to.equal(200);
    });
});
```

### Example Unit Test

```javascript
const { expect } = require('chai');
const MyService = require('../services/MyService');

describe('MyService', function() {
    let service;
    
    before(function() {
        service = new MyService();
    });
    
    it('should process data correctly', function() {
        const result = service.process(input);
        expect(result).to.equal(expected);
    });
});
```

## Test Utilities

### APITestHelper
Make authenticated HTTP requests easily:

```javascript
const { APITestHelper } = require('./helpers/api-test-helper');
const api = new APITestHelper();

await api.login();
const response = await api.get('/api/inventory');
const posted = await api.post('/api/inventory', data);
```

### TestDataGenerator
Generate test data:

```javascript
const { TestDataGenerator } = require('./helpers/api-test-helper');

const product = TestDataGenerator.product();
const warehouse = TestDataGenerator.warehouse();
```

### AssertionHelpers
Common assertions:

```javascript
const { AssertionHelpers } = require('./helpers/api-test-helper');

AssertionHelpers.assertSuccess(response);
AssertionHelpers.assertFields(object, ['id', 'name']);
```

## Configuration

### Mocha Configuration
File: `config/.mocharc.js`

- Default timeout: 10 seconds
- Reporter: spec
- Auto-require: tests/setup.js

### Coverage Configuration
File: `.nycrc.js` (project root)

- Coverage thresholds: 60-70%
- Reports: text, html, lcov
- Output: `coverage/` directory

## Test Data

Tests automatically:
- Create test fixtures (suppliers, warehouses, etc.)
- Clean up after tests
- Use isolated test user (ID: 999)
- Prefix test data with "TEST-"

## Environment

Tests require:
- Running server (http://localhost:3000)
- Database connection
- Admin credentials in `.env`

```bash
DB_HOST=127.0.0.1
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=master_db
ADMIN_PASSWORD=your_admin_password
```

## Coverage

Generate coverage report:

```bash
npm run test:coverage        # Run with coverage
npm run test:coverage:report # View HTML report
```

View coverage at: `coverage/index.html`

## Debugging

### Run Single Test
```bash
npx mocha tests/integration/api.inventory.test.js
```

### Run With Pattern
```bash
npx mocha --grep "inventory"
```

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/mocha tests/my.test.js
```

### Verbose Output
```bash
npx mocha --reporter tap
```

## Continuous Integration

Tests are CI/CD ready:
- Exit codes (0 = success, 1 = failure)
- JSON reports available
- Coverage reports generated
- Parallel execution supported

## Performance Benchmarks

Expected response times:
- Health check: < 500ms
- Dashboard stats: < 2s
- Inventory list: < 3s
- Product details: < 1s

## Documentation

- **Quick Reference:** `../TESTING_QUICK_REF.md`
- **Full Guide:** `API_TESTING_GUIDE.md`
- **Improvements:** `../API_TESTING_IMPROVEMENTS.md`

## Contributing

When adding new tests:
1. Follow existing patterns
2. Use test helpers
3. Clean up test data
4. Update documentation
5. Run tests before committing

## Support

For issues or questions:
1. Check `API_TESTING_GUIDE.md`
2. Review existing test examples
3. Check Mocha/Chai documentation
4. Review test output for hints

## License

Same as project license.
