---
name: Testing
description: How to write and run tests in Mycelium
---

# Testing in Mycelium

## Overview

Mycelium uses Mocha + Chai + Supertest for testing. Tests are located in `scripts/tests/`.

## Test Structure

```
scripts/tests/
├── unit/           # Unit tests
├── integration/    # API integration tests
└── *.test.js       # Service tests
```

## Unit Test Example

```javascript
// scripts/tests/unit/ExampleService.test.js

const { expect } = require('chai');
const sinon = require('sinon');
const ExampleService = require('../../../backend/services/ExampleService');
const Example = require('../../../backend/models/Example');

describe('ExampleService', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('getAll', () => {
    it('should return all items', async () => {
      const mockItems = [{ name: 'Test1' }, { name: 'Test2' }];
      sinon.stub(Example, 'find').returns({
        lean: sinon.stub().resolves(mockItems)
      });

      const result = await ExampleService.getAll();

      expect(result).to.deep.equal(mockItems);
      expect(Example.find.calledOnce).to.be.true;
    });

    it('should apply filters', async () => {
      sinon.stub(Example, 'find').returns({
        lean: sinon.stub().resolves([])
      });

      await ExampleService.getAll({ status: 'active' });

      expect(Example.find.calledWith({ status: 'active' })).to.be.true;
    });
  });

  describe('create', () => {
    it('should create and return item', async () => {
      const data = { name: 'New Item' };
      const savedItem = { _id: '123', ...data };
      
      sinon.stub(Example.prototype, 'save').resolves(savedItem);

      const result = await ExampleService.create(data);

      expect(result.name).to.equal(data.name);
    });
  });
});
```

## Integration Test Example

```javascript
// scripts/tests/integration/example.test.js

const request = require('supertest');
const { expect } = require('chai');
const app = require('../../../backend/server.cjs');
const Example = require('../../../backend/models/Example');

describe('Example API', () => {
  let authCookie;

  before(async () => {
    // Login to get session cookie
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'testpass' });
    authCookie = res.headers['set-cookie'];
  });

  beforeEach(async () => {
    // Clean up before each test
    await Example.deleteMany({});
  });

  describe('GET /api/example', () => {
    it('should return 200 and array of items', async () => {
      await Example.create({ name: 'Test Item', status: 'active' });

      const res = await request(app)
        .get('/api/example')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.data).to.be.an('array');
      expect(res.body.data).to.have.lengthOf(1);
    });
  });

  describe('POST /api/example', () => {
    it('should create new item', async () => {
      const res = await request(app)
        .post('/api/example')
        .set('Cookie', authCookie)
        .send({ name: 'New Item', status: 'active' })
        .expect(201);

      expect(res.body.success).to.be.true;
      expect(res.body.data.name).to.equal('New Item');
    });

    it('should return 400 for invalid data', async () => {
      const res = await request(app)
        .post('/api/example')
        .set('Cookie', authCookie)
        .send({}) // Missing required fields
        .expect(400);

      expect(res.body.success).to.be.false;
    });
  });
});
```

## Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

## Test Helpers

### Database Fixtures

```javascript
// scripts/tests/fixtures/examples.js

const Example = require('../../../backend/models/Example');

async function seedExamples() {
  await Example.deleteMany({});
  return Example.insertMany([
    { name: 'Item 1', status: 'active' },
    { name: 'Item 2', status: 'inactive' }
  ]);
}

async function cleanExamples() {
  await Example.deleteMany({});
}

module.exports = { seedExamples, cleanExamples };
```

### Auth Helper

```javascript
// scripts/tests/helpers/auth.js

const request = require('supertest');
const app = require('../../../backend/server.cjs');

async function getAuthCookie(username = 'admin', password = 'testpass') {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username, password });
  return res.headers['set-cookie'];
}

module.exports = { getAuthCookie };
```

## Assertions (Chai)

```javascript
// Equality
expect(value).to.equal(expected);
expect(obj).to.deep.equal(expectedObj);

// Type checks
expect(arr).to.be.an('array');
expect(obj).to.be.an('object');
expect(fn).to.be.a('function');

// Truthiness
expect(value).to.be.true;
expect(value).to.be.false;
expect(value).to.be.null;
expect(value).to.exist;

// Arrays
expect(arr).to.have.lengthOf(3);
expect(arr).to.include('item');
expect(arr).to.be.empty;

// Objects
expect(obj).to.have.property('name');
expect(obj).to.have.property('count', 5);
expect(obj).to.include({ name: 'test' });

// Errors
expect(() => fn()).to.throw();
expect(() => fn()).to.throw('error message');
await expect(asyncFn()).to.be.rejected;
```

## Mocking with Sinon

```javascript
const sinon = require('sinon');

// Stub
const stub = sinon.stub(object, 'method').returns(value);
const asyncStub = sinon.stub(object, 'method').resolves(value);

// Spy
const spy = sinon.spy(object, 'method');
expect(spy.calledOnce).to.be.true;
expect(spy.calledWith(arg)).to.be.true;

// Restore after each test
afterEach(() => sinon.restore());
```

## Tips

1. **Isolate tests** - each test should be independent
2. **Clean up** - use beforeEach/afterEach to reset state
3. **Mock external services** - don't call real APIs
4. **Test error cases** - not just happy paths
5. **Use descriptive names** - clear test descriptions
