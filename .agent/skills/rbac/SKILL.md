---
name: RBAC and Permissions
description: How to work with Role-Based Access Control using Casbin in Mycelium
---

# RBAC and Permissions in Mycelium

## Overview

Mycelium uses **Casbin** with MongoDB adapter for Role-Based Access Control. The system consists of:
- **CasbinService** - Policy enforcement engine
- **Role model** - Stores roles with embedded permissions
- **Permissions registry** - Defines all available permissions
- **AuthContext** (frontend) - Permission checking in React

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  AuthContext.hasPermission() → checks user.permissions[]    │
└──────────────────────────┬──────────────────────────────────┘
                           │ /api/auth/me
┌──────────────────────────▼──────────────────────────────────┐
│                      Backend API                             │
│  checkPermission(resource, action) middleware                │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    CasbinService                             │
│  enforce(userId, resource, action) → true/false             │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                       MongoDB                                │
│  roles collection (permissions[])                            │
│  casbin_rules collection (policy storage)                    │
└─────────────────────────────────────────────────────────────┘
```

## Permission Format

Permissions follow the pattern: `resource.action`

```javascript
// Examples
'inventory.read'    // Read inventory
'inventory.write'   // Create/update inventory
'inventory.delete'  // Delete inventory
'inventory.manage'  // Full access (implies read, write, delete)
'system.admin'      // Full system access
```

## Permission Hierarchy

The `manage` action implies all other actions for that resource:

```javascript
// Having 'inventory.manage' automatically grants:
// - inventory.read
// - inventory.write
// - inventory.delete
```

## Adding a New Permission

### 1. Add to shared permissions

Edit `shared/permissions.cjs`:

```javascript
const PERMISSIONS = {
  // ... existing permissions
  
  // Add new permission
  NEWRESOURCE_READ: 'newresource.read',
  NEWRESOURCE_WRITE: 'newresource.write',
  NEWRESOURCE_DELETE: 'newresource.delete',
  NEWRESOURCE_MANAGE: 'newresource.manage',
};

// Add to hierarchy if using 'manage' pattern
const PERMISSION_HIERARCHY = {
  // ... existing
  'newresource.manage': ['newresource.read', 'newresource.write', 'newresource.delete'],
};
```

### 2. Add permission definitions

Edit `backend/utils/permissions.js`:

```javascript
const PERMISSION_DEFINITIONS = [
  // ... existing definitions
  
  { name: PERMISSIONS.NEWRESOURCE_READ, description: 'View new resources', resource: 'newresource', action: 'read' },
  { name: PERMISSIONS.NEWRESOURCE_WRITE, description: 'Create/update new resources', resource: 'newresource', action: 'write' },
  { name: PERMISSIONS.NEWRESOURCE_DELETE, description: 'Delete new resources', resource: 'newresource', action: 'delete' },
  { name: PERMISSIONS.NEWRESOURCE_MANAGE, description: 'Full new resource management', resource: 'newresource', action: 'manage' },
];
```

### 3. Assign to roles

Update roles in MongoDB or use the admin UI to assign permissions to roles.

### 4. Sync Casbin policies

Restart server or call:
```javascript
await CasbinService.syncFromMongoDB();
```

## Backend Permission Check

### In routes (recommended)

```javascript
const { checkPermission } = require('../middleware/rbac');

// Single permission
router.get('/', checkPermission('inventory', 'read'), handler);

// The middleware checks: CasbinService.enforce(userId, 'inventory', 'read')
```

### Direct service call

```javascript
const CasbinService = require('../services/CasbinService');

// Check permission
const allowed = await CasbinService.enforce(userId, 'inventory', 'read');

// Get user's roles
const roles = await CasbinService.getRolesForUser(userId);

// Get all permissions for user
const { roles, permissions } = await CasbinService.getUserPermissions(userId);
```

## Frontend Permission Check

### Using AuthContext hook

```jsx
import { useAuth } from '../../contexts/AuthContext';

function InventoryPage() {
  const { hasPermission, hasAnyPermission, hasRole } = useAuth();

  return (
    <>
      {/* Single permission */}
      {hasPermission('inventory.write') && (
        <Button>Add Item</Button>
      )}

      {/* Any of multiple permissions */}
      {hasAnyPermission(['inventory.write', 'inventory.manage']) && (
        <Button>Edit Item</Button>
      )}

      {/* Role check */}
      {hasRole('admin') && (
        <AdminPanel />
      )}
    </>
  );
}
```

### Using shared permissions constants

```jsx
import { PERMISSIONS } from '../../../shared/permissions.cjs';

{hasPermission(PERMISSIONS.INVENTORY_WRITE) && (
  <Button>Add Item</Button>
)}
```

## CasbinService API Reference

| Method | Description |
|--------|-------------|
| `init()` | Initialize enforcer (called on startup) |
| `enforce(userId, resource, action)` | Check permission |
| `hasRole(userId, roleName)` | Check if user has role |
| `getRolesForUser(userId)` | Get user's role names |
| `getUserPermissions(userId)` | Get roles and permissions |
| `addPolicy(subject, resource, action)` | Add policy rule |
| `removePolicy(subject, resource, action)` | Remove policy rule |
| `addRoleForUser(userId, roleName)` | Assign role to user |
| `deleteRoleForUser(userId, roleName)` | Remove role from user |
| `syncRolePolicies(roleName, permissions)` | Sync role's permissions |
| `syncFromMongoDB()` | Full sync from database |

## Troubleshooting

### Permission denied unexpectedly

1. Check if permission is assigned to role in database
2. Check if user has the role assigned
3. Verify Casbin sync ran: look for `[Casbin] Synced X permission policies` in logs
4. Manually trigger sync: restart server or call `CasbinService.syncFromMongoDB()`

### Frontend shows stale permissions

Call `refreshPermissions()` from AuthContext after admin changes roles:

```jsx
const { refreshPermissions } = useAuth();
await refreshPermissions();
```

### Greyed-out permissions in admin UI

This is usually the "Permission Expansion Paradox" - see Knowledge Item on RBAC troubleshooting.
