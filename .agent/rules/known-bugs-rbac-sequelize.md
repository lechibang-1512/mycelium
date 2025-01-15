
# Known Bug: RBAC Sequelize Models vs. security_db Schema

## Summary

The `security_db` RBAC tables use `id` as the primary key column name, **not** `role_id` or `permission_id`.
The Sequelize models must use Sequelize's `field` option to map the JS-facing property name to the actual DB column.

---

## Table Schema (source of truth)

| Table | PK column | FK / other columns |
|---|---|---|
| `roles` | `role_id` (CHAR 36) | `name`, `description`, `is_system`, `created_at`, `updated_at` |
| `permissions` | `permission_id` (CHAR 36) | `name`, `description`, `resource`, `action`, `created_at` |
| `user_roles` | `user_id`, `role_id` (CHAR 36) | `assigned_at` |
| `role_permissions` | `role_id`, `permission_id` (CHAR 36) | `created_at` |

> ⚠️ `permissions` has **`resource`** and **`action`** columns — there is NO `category` column.
> ⚠️ `roles` has an **`is_system`** column.
> ⚠️ Junction tables (`user_roles`, `role_permissions`) use composite Primary Keys. They do **not** have a standalone `id` column.
> ⚠️ `role_permissions` uses **`created_at`**, not `granted_at`.

---

## Correct Model Patterns

### Role.js

```javascript
const Role = sequelizeSecurity.define('Role', {
    role_id: { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
    name: { ... },
    description: { ... },
    is_system: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_at: { ... },
    updated_at: { ... },
}, { tableName: 'roles', timestamps: false });
```

### Permission.js

```javascript
const Permission = sequelizeSecurity.define('Permission', {
    permission_id: { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
    name: { ... },
    description: { ... },
    resource: { type: DataTypes.STRING(50), allowNull: true },
    action:   { type: DataTypes.STRING(50), allowNull: true },
    category: {
        type: DataTypes.VIRTUAL,              // backward-compat alias
        get() { return this.getDataValue('resource'); },
    },
    created_at: { ... },
}, { tableName: 'permissions', timestamps: false });
```

### UserRole.js

```javascript
const UserRole = sequelizeSecurity.define('UserRole', {
    user_id:     { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
    role_id:     { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
    assigned_at: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
}, { tableName: 'user_roles', timestamps: false });
```

### RolePermission.js

```javascript
const RolePermission = sequelizeSecurity.define('RolePermission', {
    role_id:       { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
    permission_id: { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
    created_at:    { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
}, { tableName: 'role_permissions', timestamps: false });
```

---

## RBACService Rules

- **Never** use `'category'` in Sequelize `attributes` arrays — it is a VIRTUAL field and will not be selected. Use `['resource', 'action']` instead and map to `category` in JS.
- **Always** pass a generated `id` when calling `UserRole.create()` and `RolePermission.create()` — they have their own PK.
- **Never** sort by `category` in `findAll` order — sort by `resource` (the real column).

```javascript
// ✅ Correct
attributes: ['permission_id', 'name', 'description', 'resource', 'action']
await UserRole.create({ id: generateId(), user_id, role_id });
order: [['resource', 'ASC'], ['name', 'ASC']]

// ❌ Wrong
attributes: ['permission_id', 'name', 'description', 'category']
await UserRole.create({ user_id, role_id });
order: [['category', 'ASC'], ['name', 'ASC']]
```

---

## Error Signature

If you see this error on login or session validation, the models are out of sync with the DB:

```
SequelizeDatabaseError: Unknown column 'Roles.role_id' in 'SELECT'
at RBACService.getUserPermissions
at AuthService.validateSession
at authMiddleware
```

Fix: check the `field: 'id'` mapping in `Role.js` and `Permission.js`.
