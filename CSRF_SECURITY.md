# CSRF Security Implementation

## Overview
This document describes the comprehensive CSRF (Cross-Site Request Forgery) protection implemented in this application to prevent malicious cross-site request attacks.

## Implementation Details

### 1. CSRF Middleware Configuration
- **Library Used**: `@dr.pogodin/csurf` - A modern CSRF protection middleware
- **Cookie Configuration**: 
  - HttpOnly: `true` (prevents client-side JavaScript access)
  - Secure: `true` in production (HTTPS only)
  - SameSite: `strict` (prevents cross-site cookie sharing)

### 2. Token Validation
The CSRF middleware looks for tokens in multiple locations (in order of preference):
1. `req.body._csrf` - Hidden form field
2. `req.query._csrf` - URL query parameter
3. `req.headers['x-csrf-token']` - Custom header
4. `req.headers['csrf-token']` - Alternative header
5. `req.headers['x-xsrf-token']` - XSRF header

### 3. Route Protection
- **Protected Methods**: POST, PUT, PATCH, DELETE
- **Exempt Methods**: GET, HEAD, OPTIONS (safe methods)
- **API Exemptions**: GET requests to `/api/*` routes
- **Special Endpoints**: `/csrf-token` endpoint for AJAX applications

### 4. Form Integration
All POST forms include CSRF tokens via hidden input fields:
```html
<input type="hidden" name="_csrf" value="<%= csrfToken %>">
```

Protected forms include:
- User login/registration
- Inventory management (receive/sell stock)
- Supplier management
- Phone management
- User profile updates
- Admin user management

### 5. Error Handling
- **AJAX Requests**: Returns JSON error with 403 status
- **Regular Requests**: Renders user-friendly error page
- **Logging**: Comprehensive error logging for security monitoring

### 6. Token Endpoint
- **URL**: `/csrf-token`
- **Method**: GET
- **Response**: `{"csrfToken": "token-value"}`
- **Usage**: For AJAX applications to retrieve fresh tokens

## Security Benefits

1. **Prevents CSRF Attacks**: Malicious websites cannot forge requests
2. **Session Protection**: Validates that requests originate from legitimate forms
3. **Token Rotation**: Fresh tokens for each session
4. **Comprehensive Coverage**: All state-changing operations protected

## Testing CSRF Protection

### Valid Request (with token):
```bash
# Get token
TOKEN=$(curl -s http://localhost:3000/csrf-token | jq -r '.csrfToken')

# Make authenticated request
curl -X POST http://localhost:3000/inventory/sell \
  -d "_csrf=$TOKEN&phone_id=1&quantity=1" \
  -H "Content-Type: application/x-www-form-urlencoded"
```

### Invalid Request (without token):
```bash
# This will be rejected with 403 error
curl -X POST http://localhost:3000/inventory/sell \
  -d "phone_id=1&quantity=1" \
  -H "Content-Type: application/x-www-form-urlencoded"
```

## Compliance
This implementation addresses:
- **OWASP Top 10**: Cross-Site Request Forgery prevention
- **CWE-352**: Cross-Site Request Forgery vulnerability
- **Security Best Practices**: Industry standard CSRF protection

## Monitoring
The application logs all CSRF validation failures for security monitoring and includes:
- Request method and path
- Request headers
- Request body (in development mode)
- Timestamp of the attempt

This comprehensive CSRF protection ensures that all state-changing operations in the application are protected against cross-site request forgery attacks.
