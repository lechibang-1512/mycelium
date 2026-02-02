---
trigger: always_on
---

# Testing Rules

## Test File Location

- **Unit tests**: `scripts/tests/unit/`
- **Integration tests**: `scripts/tests/integration/`
- **Service tests**: `scripts/tests/ServiceName.test.js`

## Test Naming

```javascript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should do expected behavior', () => {});
    it('should handle edge case', () => {});
    it('should throw error when invalid input', () => {});
  });
});
```

## Test Structure

```javascript
const { expect } = require('chai');
const sinon = require('sinon');

describe('Feature', () => {
  // Setup before all tests
  before(async () => {
    // One-time setup
  });

  // Setup before each test
  beforeEach(async () => {
    // Reset state
  });

  // Cleanup after each test
  afterEach(() => {
    sinon.restore();
  });

  // Cleanup after all tests
  after(async () => {
    // Final cleanup
  });

  it('should work correctly', async () => {
    // Arrange
    const input = {...};
    
    // Act
    const result = await Service.method(input);
    
    // Assert
    expect(result).to.deep.equal(expected);
  });
});
```

## Required Assertions

Every test must have at least one assertion:
```javascript
expect(result).to.exist;
expect(result).to.equal(expected);
expect(array).to.have.lengthOf(3);
```

## Mock External Dependencies

```javascript
// Mock database calls
sinon.stub(Model, 'find').returns({
  lean: sinon.stub().resolves([])
});

// Mock services
sinon.stub(ExternalService, 'fetch').resolves(mockData);
```

## Always Restore Mocks

```javascript
afterEach(() => {
  sinon.restore();
});
```

## Running Tests

```bash
npm test                   # All tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:mocha -- --grep "pattern"  # Specific test
```
