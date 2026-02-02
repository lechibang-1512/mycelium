---
name: Debugging
description: How to debug and troubleshoot issues in Mycelium
---

# Debugging in Mycelium

## Server Logs

### Log file location
```
/media/lechibang/Work and play/Work/mycelium/server.log
```

### View recent logs
```bash
tail -100 server.log          # Last 100 lines
tail -f server.log            # Follow live
grep "ERROR" server.log       # Search errors
grep "user_id" server.log     # Filter by pattern
```

### Log format
```
[2026-01-15T10:30:45.123Z] 📡 GET /api/inventory from 127.0.0.1
```

## Common Startup Issues

### "Missing required environment variables"

Check `.env` file exists and has required variables:
```bash
cat .env | grep MONGODB_URI
```

Required variables:
- `MONGODB_URI` - MongoDB connection string

### "Port already in use"

Kill existing process:
```bash
npm run util:kill-server
# or
pkill -f "node.*server.cjs"
```

### "MongoDB connection failed"

1. Check MongoDB is running: `mongosh`
2. Verify connection string in `.env`
3. Check network/firewall

### "Casbin Enforcer not initialized"

CasbinService.init() must be called before enforce(). This happens automatically on startup in `server.cjs`.

## Debugging API Issues

### 401 Unauthorized

1. Check session cookie exists
2. Verify session is valid in database
3. Check IP fingerprinting if changed networks

```javascript
// In route handler, log user
console.log('req.user:', req.user);
```

### 403 Forbidden (Permission denied)

1. Check user has required role
2. Verify role has permission assigned
3. Check Casbin sync status

```javascript
// Debug permissions
const CasbinService = require('../services/CasbinService');
const perms = await CasbinService.getUserPermissions(userId);
console.log('User permissions:', perms);
```

### 500 Internal Server Error

1. Check server.log for stack trace
2. Add console.log in suspected code path
3. Verify database connectivity

## Debugging Frontend Issues

### React Query cache issues

```javascript
// Force refetch
queryClient.invalidateQueries({ queryKey: ['inventory'] });

// Clear all cache
queryClient.clear();
```

### Permission checks not updating

```javascript
const { refreshPermissions } = useAuth();
await refreshPermissions();  // Force reload from server
```

### API errors not showing

Check browser Network tab for failed requests. Toast messages require:
```javascript
import toast from 'react-hot-toast';
toast.error('Error message');
```

## Database Debugging

### MongoDB shell
```bash
mongosh mycelium

# Show collections
show collections

# Find document
db.users.findOne({ username: 'admin' })

# Check indexes
db.inventory.getIndexes()
```

### Check Casbin rules
```javascript
// In mongosh
db.casbin_rules.find().limit(10)

// Count policies
db.casbin_rules.countDocuments()
```

## Test Debugging

### Run single test
```bash
npm run test:mocha -- --grep "should return inventory"
```

### Debug mode with breakpoints
```bash
node --inspect-brk node_modules/.bin/mocha scripts/tests/unit/InventoryService.test.js
```

Then open `chrome://inspect` in Chrome.

### Skip tests
```javascript
describe.skip('Slow Tests', () => { ... });
it.only('Single Test', () => { ... });
```

## Performance Issues

### Slow API responses

1. Check MongoDB query performance
2. Add indexes for frequently queried fields
3. Use `.lean()` for read operations
4. Check for N+1 query patterns

```javascript
// Add explain to see query plan
const plan = await Model.find({...}).explain('executionStats');
console.log(plan.executionStats);
```

### High memory usage

1. Check for memory leaks in long-running operations
2. Use streaming for large data exports
3. Limit query results with pagination

## Useful Debug Commands

```bash
# Check running processes
ps aux | grep node

# Monitor system resources
top -p $(pgrep -f "node.*server")

# Check MongoDB connections
mongosh --eval "db.serverStatus().connections"

# Verify environment
npm run util:verify-env
```

## Adding Debug Logging

```javascript
// Temporary debug logging
console.log('[DEBUG]', JSON.stringify(data, null, 2));

// With timestamp
console.log(`[${new Date().toISOString()}] [DEBUG]`, message);

// Service-specific prefix
console.log('[InventoryService]', operation, result);
```

Remember to remove debug logs before committing!
