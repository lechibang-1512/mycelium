---
name: Mongoose Model Development
description: How to create and modify MongoDB models in Mycelium
---

# Mongoose Model Development

## Overview

Mycelium uses Mongoose 9 for MongoDB interactions. Models are located in `backend/models/`.

## Model Structure

```javascript
// backend/models/Example.js

const mongoose = require('mongoose');

const exampleSchema = new mongoose.Schema({
  // String field with validation
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },

  // Enum field
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  },

  // Reference to another model
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },

  // Nested object
  metadata: {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    source: String,
    tags: [String]
  },

  // Number with validation
  quantity: {
    type: Number,
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },

  // Date fields
  expiresAt: Date,

  // Boolean
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,  // Adds createdAt, updatedAt
  collection: 'examples'  // Explicit collection name
});

// Indexes
exampleSchema.index({ name: 1 });
exampleSchema.index({ warehouse: 1, status: 1 });
exampleSchema.index({ 'metadata.tags': 1 });

// Virtual field (computed, not stored)
exampleSchema.virtual('displayName').get(function() {
  return `${this.name} (${this.status})`;
});

// Instance method
exampleSchema.methods.activate = function() {
  this.status = 'active';
  return this.save();
};

// Static method
exampleSchema.statics.findByWarehouse = function(warehouseId) {
  return this.find({ warehouse: warehouseId }).lean();
};

// Pre-save hook
exampleSchema.pre('save', function(next) {
  if (this.isNew) {
    // Initialization logic
  }
  next();
});

// Ensure virtuals are included in JSON
exampleSchema.set('toJSON', { virtuals: true });
exampleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Example', exampleSchema);
```

## Steps to Create a New Model

1. **Create model file** in `backend/models/`
2. **Define schema** with field types and validation
3. **Add indexes** for frequently queried fields
4. **Export model** at the end of file
5. **Register in index.js** (optional, for centralized imports)

## Field Types Reference

| Mongoose Type | JavaScript Type | Example |
|---------------|-----------------|---------|
| `String` | string | `name: String` |
| `Number` | number | `quantity: Number` |
| `Boolean` | boolean | `isActive: Boolean` |
| `Date` | Date | `createdAt: Date` |
| `ObjectId` | ObjectId | `ref: 'Model'` |
| `Array` | array | `tags: [String]` |
| `Mixed` | any | `metadata: mongoose.Schema.Types.Mixed` |

## Relationships

### One-to-One / Many-to-One
```javascript
supplier: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Supplier',
  required: true
}
```

### One-to-Many (embedded)
```javascript
items: [{
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  quantity: Number,
  price: Number
}]
```

### Many-to-Many (reference array)
```javascript
tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }]
```

## Existing Models Reference

| Model | Key Fields | Relationships |
|-------|------------|---------------|
| `User` | username, email, passwordHash | role -> Role |
| `Role` | name, permissions[] | - |
| `Inventory` | sku, quantity, lot | warehouse, zone, bin, product |
| `Warehouse` | name, code, zones[] | embedded zones with bins |
| `Supplier` | name, contact, address | - |
| `RMA` | rmaNumber, status | items[], supplier |
| `Transaction` | type, quantity, timestamp | inventory, user |

## Common Patterns

### Soft Delete
```javascript
deletedAt: { type: Date, default: null }

// Query only non-deleted
exampleSchema.pre(/^find/, function(next) {
  this.where({ deletedAt: null });
  next();
});

// Soft delete method
exampleSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};
```

### Audit Fields
```javascript
createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
```

## Schema Registration

Add to `backend/models/index.js` if centralized import is needed:

```javascript
module.exports = {
  // ... existing models
  Example: require('./Example')
};
```
