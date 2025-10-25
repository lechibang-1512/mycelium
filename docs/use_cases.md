# Mycelium Inventory Management System - Use Case Description

> **Version:** 3.0  
> **Created:** October 22, 2025  
> **Last Updated:** December 2024  
> **System:** Mycelium Inventory Management System

## Table of Contents

1. [System Description](#1-system-description)
2. [Actor Identification](#2-actor-identification)
3. [Actor Goals](#3-actor-goals)
4. [Use Case Scenarios](#4-use-case-scenarios)
   - [Authentication Use Cases](#authentication-use-cases)
   - [Admin Use Cases](#uc-a1-user-management-warehouse-admin)
   - [Staff Use Cases](#uc-s1-product-management-warehouse-staff)
   - [All User Use Cases](#uc-u1-view-analytics-dashboard-all-authenticated-users)
5. [Alternate Flows](#5-alternate-flows)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Version History](#8-version-history)

---

## 1. System Description

### What is Mycelium?

**Mycelium** is a secure, web-based inventory management system designed for small-to-medium businesses managing complex warehouse operations. The system is built as a **software application** using Node.js, Express, and MySQL, providing a comprehensive solution for inventory tracking, warehouse management, and business analytics.

### Core Features

The system offers the following key features:

- **Multi-warehouse Inventory Management**: Track stock across multiple warehouses with zone-level granularity
- **Batch and Serial Number Tracking**: Complete traceability with FIFO/FEFO strategies for compliance
- **QR Code Integration**: Generate and scan QR codes for products, locations, and batches
- **Supplier Management**: Maintain supplier relationships and track performance
- **Receipt Management**: Immutable transaction records for purchases and sales
- **Advanced Analytics**: Real-time dashboards with KPIs and business intelligence
- **Role-based Access Control**: Secure authentication with Admin and Staff roles
- **Session Security**: Dynamic session management with token invalidation

### Goals and Objectives

The system accomplishes the following business goals:

1. **Operational Efficiency**: Streamline inventory operations through automated tracking and QR code integration
2. **Inventory Accuracy**: Maintain precise stock levels with multi-level tracking (warehouse → zone → bin → batch → serial)
3. **Compliance and Traceability**: Ensure complete audit trails and batch tracking for regulatory requirements
4. **Business Intelligence**: Provide real-time insights through comprehensive analytics and reporting
5. **Security and Control**: Implement robust access controls and session management for data protection
6. **Scalability**: Support growth from single warehouse to multi-warehouse operations

### How It Meets These Goals

- **Real-time Updates**: All inventory movements are tracked immediately with automatic stock level adjustments
- **Hierarchical Organization**: Warehouse → Zone → Bin structure allows precise location tracking
- **Immutable Records**: Receipt system creates permanent transaction history for audit compliance
- **Automated Alerts**: System monitors stock levels and generates alerts for low stock, expiry, and other conditions
- **Multi-database Architecture**: Separate databases for inventory, suppliers, and security ensure data integrity
- **Service-oriented Design**: Modular architecture with dedicated services for different business functions

### System Architecture

The system follows a three-tier architecture:

- **Presentation Layer**: EJS templates with responsive web interface
- **Application Layer**: Node.js/Express with middleware for authentication, CSRF protection, and rate limiting
- **Data Layer**: Three logical MySQL databases for separation of concerns:
  - `master_specs_db`: Inventory and warehouse operations
  - `suppliers_db`: Supplier management
  - `security_db`: Authentication and security

---

## 2. Actor Identification

### Primary Actors

#### 2.1 Warehouse Admin
- **Type**: Individual user with administrative privileges
- **Role**: `admin` in the system
- **Behavior**: Full system access including user management, system configuration, and all operational capabilities
- **Stakeholder Role**: Primary system administrator and business owner

#### 2.2 Warehouse Staff
- **Type**: Individual user with operational privileges  
- **Role**: `staff` in the system
- **Behavior**: Day-to-day inventory operations, warehouse management, and supplier interactions
- **Stakeholder Role**: Front-line operational users who handle inventory transactions

### Secondary Actors

#### 2.3 System (Automated Processes)
- **Type**: Automated background processes
- **Behavior**: Scheduled monitoring, alert generation, session cleanup, and analytics updates
- **Integration**: Internal system processes that support primary actor workflows

#### 2.4 External Systems (Future Integration)
- **Type**: Third-party systems and APIs
- **Behavior**: Potential integration points for ERP systems, shipping providers, and external databases
- **Current Status**: Not implemented but architecture supports future integration

### Actor Behavior Patterns

**Shared Behaviors** (Admin and Staff):
- Both actors require authentication and session management
- Both use QR code scanning and basic inventory viewing
- Both access analytics dashboards (with different permission levels)
- Both perform inventory transactions within their authorization scope

**Distinct Behaviors**:
- **Admins**: Focus on system configuration, user management, and oversight
- **Staff**: Focus on operational tasks, inventory movements, and customer-facing activities

---

## 3. Actor Goals

### 3.1 Warehouse Admin Goals

#### Primary Goals
1. **User Management**: Create and manage user accounts, assign roles, and maintain security
2. **System Oversight**: Monitor system performance, security events, and user activities
3. **Configuration Management**: Set up warehouses, zones, and system parameters
4. **Data Integrity**: Ensure accurate inventory data and resolve discrepancies
5. **Compliance Management**: Maintain audit trails and ensure regulatory compliance

#### Secondary Goals
1. **Business Intelligence**: Access comprehensive analytics and generate reports
2. **Security Management**: Manage sessions, force logouts, and handle security incidents
3. **Bulk Operations**: Perform mass updates and data management tasks
4. **System Maintenance**: Handle system configuration changes and troubleshooting

### 3.2 Warehouse Staff Goals

#### Primary Goals
1. **Inventory Operations**: Receive stock, process sales, and manage inventory movements
2. **Warehouse Management**: Organize inventory by zones and bins for optimal efficiency
3. **Supplier Coordination**: Maintain supplier information and track performance
4. **Transaction Processing**: Create and manage receipts for all inventory movements
5. **Quality Control**: Ensure accurate data entry and proper inventory handling

#### Secondary Goals
1. **Efficiency Enhancement**: Use QR codes and automation to speed up operations
2. **Information Access**: View analytics and reports relevant to their operations
3. **Problem Resolution**: Identify and report inventory discrepancies or issues
4. **Process Improvement**: Suggest improvements based on operational experience

### 3.3 System (Automated) Goals

#### Primary Goals
1. **Monitoring and Alerting**: Continuously monitor inventory levels and generate alerts
2. **Data Integrity**: Maintain consistent data across all databases and transactions
3. **Security Enforcement**: Validate sessions, enforce access controls, and log security events
4. **Performance Optimization**: Maintain system responsiveness and data accuracy

#### Secondary Goals
1. **Analytics Processing**: Generate reports and calculate KPIs automatically
2. **Maintenance Tasks**: Clean up expired sessions and maintain database performance
3. **Audit Trail Management**: Ensure complete logging of all system activities
4. **Security Event Logging**: Track all authentication events with risk scoring
5. **Token Management**: Maintain token blacklist and invalidate expired sessions

---

## 4. Use Case Scenarios

### Authentication Use Cases

### UC-AUTH1: User Authentication and Login (All Users)

#### Basic Flow - User Login
1. **Preconditions**: User has valid credentials
2. **Trigger**: User needs to access the system
3. **Main Success Scenario**:
   - User navigates to login page (`/login`)
   - System displays login form with CSRF protection
   - User enters username/email and password
   - System validates credentials against auth database
   - System verifies user is active (not locked/inactive)
   - System creates new session with secure session ID
   - System regenerates session ID after login
   - System logs successful login event
   - System redirects to dashboard based on role
4. **Postconditions**: User authenticated, session created, security event logged
5. **Routes**: GET `/login`, POST `/login`

#### Basic Flow - User Logout
1. **Preconditions**: User is authenticated
2. **Trigger**: User wants to end session securely
3. **Main Success Scenario**:
   - User clicks logout button
   - System invalidates current session
   - System clears session cookies
   - System logs logout event
   - System redirects to login page
4. **Postconditions**: User session terminated, logout event logged
5. **Routes**: GET `/logout`

#### Basic Flow - Password Reset Request
1. **Preconditions**: User has forgotten password
2. **Trigger**: User cannot log in
3. **Main Success Scenario**:
   - User navigates to forgot password page (`/forgot-password`)
   - User enters registered email address
   - System validates email exists in database
   - System generates secure password reset token
   - System stores token with expiration time
   - System sends reset link to user email
   - System displays confirmation message
4. **Postconditions**: Reset token generated and sent
5. **Routes**: GET `/forgot-password`, POST `/forgot-password`

#### Basic Flow - Password Reset Completion
1. **Preconditions**: User has valid reset token
2. **Trigger**: User clicks reset link from email
3. **Main Success Scenario**:
   - User navigates to reset password page with token
   - System validates token is not expired
   - System displays new password form
   - User enters new password twice
   - System validates password strength
   - System hashes new password with bcrypt
   - System updates user password
   - System invalidates reset token
   - System logs password change event
   - System redirects to login page
4. **Postconditions**: Password updated, old token invalidated
5. **Routes**: GET `/reset-password/:token`, POST `/reset-password/:token`

### UC-AUTH2: Session Management (Admin)

#### Basic Flow - View All Active Sessions
1. **Preconditions**: Admin is authenticated
2. **Trigger**: Admin needs to monitor user sessions
3. **Main Success Scenario**:
   - Admin navigates to session management (`/admin/sessions`)
   - System queries all active sessions from database
   - System displays session list with:
     - User details (username, full name, role)
     - Session information (login time, last activity, IP address)
     - Session status (active, idle)
   - Admin can filter by user or date range
4. **Postconditions**: Complete session overview displayed
5. **Routes**: GET `/admin/sessions`

#### Basic Flow - Force User Logout
1. **Preconditions**: Admin is authenticated
2. **Trigger**: Admin needs to terminate user session (security concern)
3. **Main Success Scenario**:
   - Admin identifies problematic session
   - Admin clicks "Force Logout" button
   - System confirms action
   - System invalidates all user tokens
   - System destroys all user sessions
   - System logs forced logout event with admin ID
   - System displays confirmation
4. **Postconditions**: User sessions terminated, security event logged
5. **Routes**: POST `/admin/sessions/logout-user/:userId`

#### Basic Flow - View User Session History
1. **Preconditions**: Admin is authenticated
2. **Trigger**: Admin needs to audit user activity
3. **Main Success Scenario**:
   - Admin navigates to specific user sessions
   - System displays all sessions for user (active and expired)
   - System shows session details:
     - Login/logout timestamps
     - IP addresses used
     - Session duration
     - Activity during session
   - Admin can identify unusual patterns
4. **Postconditions**: User session history displayed for audit
5. **Routes**: GET `/admin/sessions/user/:userId`

---

### Admin Use Cases

### UC-A1: User Management (Warehouse Admin)

#### Basic Flow - Create New User
1. **Preconditions**: Admin is authenticated and has admin role
2. **Trigger**: Admin wants to add a new staff member
3. **Main Success Scenario**:
   - Admin navigates to User Management (`/users`)
   - System displays user list with "Add New User" option
   - Admin clicks "Add New User" button
   - System renders user creation form with CSRF protection
   - Admin enters: username, email, password, role (staff/admin), full name
   - System validates input (unique username/email, password strength)
   - System hashes password with bcrypt and stores user record
   - System logs user creation event in security database
   - System displays success message and returns to user list
4. **Postconditions**: New user account created, audit trail logged
5. **Routes**: GET `/users/new`, POST `/users`

#### Basic Flow - Session Management
1. **Preconditions**: Admin is authenticated
2. **Trigger**: Admin needs to monitor or terminate user sessions
3. **Main Success Scenario**:
   - Admin navigates to Session Management (`/admin/sessions`)
   - System displays all active sessions with user details, IP addresses, login times
   - Admin identifies problematic session (e.g., suspicious activity)
   - Admin clicks "Force Logout" for specific user
   - System invalidates all tokens for that user
   - System terminates user sessions immediately
   - System logs security event with admin ID and reason
   - System displays confirmation message
4. **Postconditions**: User sessions terminated, security event logged
5. **Routes**: GET `/admin/sessions`, POST `/admin/sessions/logout-user/:userId`, GET `/admin/sessions/user/:userId`

#### Basic Flow - View User Details
1. **Preconditions**: Admin is authenticated
2. **Trigger**: Admin needs to review detailed user information
3. **Main Success Scenario**:
   - Admin navigates to User Management (`/users`)
   - Admin clicks on specific user to view details
   - System displays comprehensive user profile:
     - Basic information (username, email, role, status)
     - Security event history (logins, failed attempts, status changes)
     - Active sessions list
     - User statistics (total logins, recent activity, failed attempts)
   - Admin can take actions: edit user, reset lockout, toggle status, view sessions
4. **Postconditions**: Admin has complete view of user activity and status
5. **Routes**: GET `/users/:id`

#### Basic Flow - Edit User
1. **Preconditions**: Admin is authenticated, user exists
2. **Trigger**: Admin needs to update user information
3. **Main Success Scenario**:
   - Admin navigates to edit form for specific user
   - System displays current user information
   - Admin updates: full name, email, role, active status, password (optional)
   - System validates changes (unique email, password strength if changing)
   - System updates user record with timestamp
   - System logs user modification event
   - System displays success confirmation
4. **Postconditions**: User record updated, audit trail logged
5. **Routes**: GET `/users/:id/edit`, POST `/users/:id/update`

#### Basic Flow - Bulk User Operations
1. **Preconditions**: Admin is authenticated
2. **Trigger**: Admin needs to perform action on multiple users
3. **Main Success Scenario**:
   - Admin navigates to User Management (`/users`)
   - Admin selects multiple users (up to 100)
   - Admin chooses action: activate, deactivate, or unlock
   - System validates selection (cannot include admin's own account)
   - Admin confirms bulk action
   - System performs operation on all selected users
   - For deactivate: System force-logs out affected users
   - System logs bulk action with count and user IDs
   - System displays success message with affected count
4. **Postconditions**: Multiple users updated, audit trail logged
5. **Routes**: POST `/users/bulk-action`

#### Basic Flow - Reset Account Lockout
1. **Preconditions**: Admin is authenticated, user account is locked
2. **Trigger**: User account locked due to failed login attempts
3. **Main Success Scenario**:
   - Admin views user details showing locked status
   - Admin clicks "Reset Failed Attempts" or "Unlock Account"
   - System resets failed_login_attempts to 0
   - System clears locked_until timestamp
   - System logs unlock event with admin ID
   - System displays confirmation message
   - User can now attempt to login again
4. **Postconditions**: User account unlocked, security event logged
5. **Routes**: POST `/users/:id/reset-failed-attempts`

#### Basic Flow - Delete User
1. **Preconditions**: Admin is authenticated, target user exists and is not the admin themselves
2. **Trigger**: Admin needs to remove user from system
3. **Main Success Scenario**:
   - Admin navigates to user details or user list
   - Admin clicks "Delete User" action
   - System displays confirmation dialog with warning
   - Admin confirms deletion
   - System performs soft delete (sets user as inactive, preserves audit trail)
   - System invalidates all user sessions and tokens
   - System logs deletion event with admin ID
   - System displays confirmation message
   - User removed from active user list but preserved in database
4. **Postconditions**: User soft-deleted, sessions terminated, audit trail preserved
5. **Routes**: DELETE `/users/:id`

#### Basic Flow - Toggle User Status
1. **Preconditions**: Admin is authenticated, target user exists
2. **Trigger**: Admin needs to quickly enable/disable user access
3. **Main Success Scenario**:
   - Admin views user in user list
   - Admin clicks status toggle button (Active ↔ Inactive)
   - System flips user's active status
   - If deactivating: System invalidates user sessions and tokens
   - System logs status change event
   - System updates UI to reflect new status
   - System displays confirmation message
4. **Postconditions**: User status changed, sessions terminated if deactivated
5. **Routes**: POST `/users/:id/toggle-status`

---

### Staff Use Cases

### UC-S1: Product Management (Warehouse Staff)

#### Basic Flow - Manage Product Catalog
1. **Preconditions**: Staff is authenticated
2. **Trigger**: Need to view, add, edit, or manage product information
3. **Main Success Scenario**:
   - Staff navigates to main product listing (`/`)
   - System displays paginated product list with search functionality
   - Staff can: view product details, add new products, edit existing products
   - For viewing: Staff clicks product to see detailed specifications
   - For adding: Staff navigates to add form, enters complete product specifications
   - For editing: Staff navigates to edit form, modifies product data
   - System validates input and updates specs_db table
   - Admin users can additionally delete products
4. **Postconditions**: Product catalog updated in specs_db table
5. **Routes**: 
   - GET `/` - Product listing with search and pagination (all users)
   - GET `/phone/:id` - View product details (all users)
   - GET `/phones/add` - Add product form (staff/admin)
   - GET `/phones/:id/edit` - Edit product form (staff/admin)
   - POST `/phones` - Create product (staff/admin)
   - POST `/phones/:id` - Update product (staff/admin)
   - POST `/phones/:id/delete` - Delete product (admin only)

### UC-S2: Receive Stock (Warehouse Staff)

#### Basic Flow - Process Incoming Shipment
1. **Preconditions**: Staff is authenticated, supplier and products exist, warehouse configured
2. **Trigger**: Physical shipment arrives at warehouse
3. **Main Success Scenario**:
   - Staff navigates to Receive Stock (`/inventory/receive`)
   - System displays form with dropdowns for: suppliers, products, warehouses, zones
   - Staff selects supplier, product, and destination warehouse/zone
   - Staff enters: quantity received, unit cost, batch number, expiry date (if applicable)
   - Staff optionally enters: PO number, notes, tax information
   - Staff submits form with CSRF token validation
   - System validates: positive quantity, valid supplier/product IDs, warehouse capacity
   - System calculates total cost including taxes and fees
   - System updates inventory levels in target warehouse/zone
   - System creates immutable receipt record with unique ID
   - System logs inventory movement in audit trail
   - System generates QR code for new batch (if batch tracking enabled)
   - System displays success confirmation with receipt number
4. **Postconditions**: Inventory increased, receipt created, audit trail logged
5. **Routes**: GET `/inventory/receive`, POST `/inventory/receive`

#### Basic Flow - Batch and Serial Tracking
1. **Preconditions**: Product requires batch/serial tracking
2. **Extended Scenario**:
   - During receive process, staff enters batch number and expiry date
   - For serialized items, staff enters individual serial numbers
   - System validates: unique batch numbers, valid expiry dates, unique serials
   - System creates batch record with tracking information
   - System creates individual serial records linked to batch
   - System generates QR codes for batch and each serial number
   - System sets up automatic expiry alerts based on expiry date
4. **Postconditions**: Batch and serial records created, QR codes generated, alerts configured

### UC-S3: Sell Stock (Warehouse Staff)

#### Basic Flow - Process Outgoing Sale
1. **Preconditions**: Staff is authenticated, sufficient stock available
2. **Trigger**: Customer purchase or internal stock issue
3. **Main Success Scenario**:
   - Staff navigates to Sell Stock (`/inventory/sell`)
   - System displays available products with current stock levels
   - Staff selects product and enters quantity to sell
   - Staff selects source warehouse and zone
   - System validates stock availability in selected location
   - System applies FIFO/FEFO logic to select appropriate batches
   - Staff confirms batch selection or manually overrides
   - System decrements inventory from selected batches
   - System creates sales receipt with transaction details
   - System updates inventory levels across affected locations
   - System checks for low stock conditions and generates alerts
   - System logs inventory movement in audit trail
   - System displays transaction confirmation
4. **Postconditions**: Inventory decreased, sales receipt created, stock alerts updated
5. **Routes**: GET `/inventory/sell`, POST `/inventory/sell`

### UC-S4: Warehouse Management (Warehouse Staff)

#### Basic Flow - Create New Warehouse
1. **Preconditions**: Staff is authenticated with warehouse management permissions
2. **Trigger**: Business expansion requires new warehouse location
3. **Main Success Scenario**:
   - Staff navigates to Warehouse Management (`/warehouses`)
   - System displays current warehouses with "Add New" option
   - Staff clicks "Add New Warehouse"
   - System renders warehouse creation form
   - Staff enters: warehouse name, address, capacity, contact information
   - Staff configures default zones (receiving, storage, shipping, etc.)
   - System validates input and checks for duplicate names
   - System creates warehouse record with unique ID
   - System auto-creates default zones with standard configurations
   - System logs warehouse creation event
   - System redirects to warehouse detail view
4. **Postconditions**: New warehouse created, default zones established
5. **Routes**: GET `/warehouses`, POST `/warehouses`

#### Basic Flow - Zone and Bin Management
1. **Preconditions**: Warehouse exists, staff has management permissions
2. **Trigger**: Need to organize inventory by specific locations
3. **Main Success Scenario**:
   - Staff selects warehouse and navigates to zone management
   - System displays current zones with capacity and utilization
   - Staff creates new zone with type (storage, picking, receiving, etc.)
   - Staff defines bin structure: aisle-shelf-bin addressing
   - System validates bin addressing format and uniqueness
   - System creates zone and bin records
   - System updates warehouse capacity calculations
   - System generates QR codes for new zones and bins
4. **Postconditions**: Zone structure established, QR codes generated

### UC-S5: QR Code Operations (Warehouse Staff)

#### Basic Flow - Generate Product QR Code
1. **Preconditions**: Staff is authenticated, product exists
2. **Trigger**: Need QR codes for inventory tracking or labeling
3. **Main Success Scenario**:
   - Staff navigates to QR Code Generator (`/qrcode/generate`)
   - System displays options: product, location, batch, serial
   - Staff selects "Product" and chooses specific product
   - Staff optionally includes additional metadata (batch, location)
   - System generates QR code with encoded product information
   - System stores QR code image in public directory
   - System displays QR code with download and print options
   - Staff can generate multiple QR codes for bulk operations
4. **Postconditions**: QR code generated, available for printing/use
5. **Routes**: GET `/qrcode/generate`, POST `/api/qrcode/product/:id`

#### Basic Flow - Scan QR Code
1. **Preconditions**: User has camera access, QR code available
2. **Trigger**: Need to quickly access product/location information
3. **Main Success Scenario**:
   - User navigates to QR Scanner (`/qrcode/scan`)
   - System requests camera permission
   - User points camera at QR code
   - System decodes QR data and validates format
   - System identifies QR type (product, location, batch, serial)
   - System displays context-appropriate actions based on user role
   - User selects desired action (view details, edit, transfer, etc.)
   - System navigates to appropriate page with pre-filled data
4. **Postconditions**: Quick access to relevant system functionality
5. **Routes**: GET `/qrcode/scan`, POST `/api/qrcode/process`

### UC-S6: Supplier Management (Warehouse Staff)

#### Basic Flow - Create New Supplier
1. **Preconditions**: Staff is authenticated
2. **Trigger**: New vendor relationship needs to be established
3. **Main Success Scenario**:
   - Staff navigates to Supplier Management (`/suppliers`)
   - System displays current suppliers with "Add New" option
   - Staff clicks "Add New Supplier"
   - System renders supplier creation form
   - Staff enters: company name, contact information, payment terms, lead times
   - Staff adds contact persons with roles and contact details
   - System validates input and checks for duplicate suppliers
   - System creates supplier record in suppliers database
   - System sets initial status as "Active"
   - System logs supplier creation event
   - System displays success confirmation
4. **Postconditions**: New supplier created and available for transactions
5. **Routes**: GET `/suppliers`, GET `/suppliers/add`, POST `/suppliers`

#### Basic Flow - View Supplier Details
1. **Preconditions**: Staff is authenticated, supplier exists
2. **Trigger**: Need to review complete supplier information
3. **Main Success Scenario**:
   - Staff navigates to Supplier Management
   - Staff clicks on specific supplier
   - System displays comprehensive supplier profile:
     - Company information (name, address, contact)
     - Contact persons with roles
     - Payment terms and lead times
     - Performance metrics (order history, on-time delivery rate)
     - Recent transactions
     - Status and notes
   - Staff can take actions: edit, deactivate, or delete supplier
4. **Postconditions**: Complete supplier information displayed
5. **Routes**: GET `/supplier/:id`

#### Basic Flow - Edit Supplier
1. **Preconditions**: Staff is authenticated, supplier exists
2. **Trigger**: Need to update supplier information
3. **Main Success Scenario**:
   - Staff navigates to supplier details
   - Staff clicks "Edit Supplier" button
   - System displays supplier edit form with current data
   - Staff updates: company name, contact info, payment terms, lead times
   - Staff can add/edit/remove contact persons
   - System validates changes (duplicate check, required fields)
   - System updates supplier record
   - System logs modification event with timestamp
   - System displays success confirmation
4. **Postconditions**: Supplier information updated, audit trail logged
5. **Routes**: GET `/supplier/:id/edit`, POST `/supplier/:id`

#### Basic Flow - Delete Supplier
1. **Preconditions**: Staff is authenticated, supplier exists
2. **Trigger**: Supplier relationship ended or duplicate record
3. **Main Success Scenario**:
   - Staff navigates to supplier details or list
   - Staff clicks "Delete Supplier" action
   - System checks for active orders or recent transactions
   - If active orders exist, system warns and asks for confirmation
   - Staff confirms deletion
   - System performs soft delete (marks as inactive, preserves history)
   - System logs deletion event
   - System displays confirmation message
4. **Postconditions**: Supplier marked inactive, historical data preserved
5. **Routes**: POST `/supplier/:id/delete`

---

### All User Use Cases

### UC-U1: View Analytics Dashboard (All Authenticated Users)

#### Basic Flow - Access Business Intelligence
1. **Preconditions**: User is authenticated
2. **Trigger**: Need to view current business metrics and KPIs
3. **Main Success Scenario**:
   - User navigates to Dashboard (`/dashboard`) or Analytics (`/analytics`)
   - System queries multiple databases for real-time metrics
   - System calculates KPIs: total products, total inventory, low stock count, supplier count
   - System displays key metrics: total revenue, units sold, recent transactions, top products
   - System shows low stock products and alerts with specific thresholds
   - System generates charts for: inventory trends, warehouse utilization, receipt volumes
   - System displays role-appropriate metrics (staff see operational data, admin sees all)
   - User can filter data by date range, warehouse, or product category
   - System provides drill-down capabilities from summary to detailed views
   - User can export reports in multiple formats (PDF, CSV, Excel)
4. **Postconditions**: User has current business intelligence information
5. **Routes**: GET `/dashboard`, GET `/analytics`, GET `/warehouses/analytics`

#### Key Dashboard Metrics Implemented:
- **Product Statistics**: Total products, total inventory, low stock alerts (≤5 units)
- **Supplier Management**: Active supplier count and relationship status
- **Transaction Analysis**: Recent transactions with type and quantity details
- **Performance Analytics**: Top-selling products by transaction volume
- **Financial Metrics**: Revenue calculations, average order value, growth rates
- **Inventory Health**: Low stock products list, inventory value, turnover analysis

### UC-U2: View and Manage Receipts (All Authenticated Users)

#### Basic Flow - Receipt Management
1. **Preconditions**: User is authenticated
2. **Trigger**: Need to view, search, or export transaction receipts
3. **Main Success Scenario**:
   - User navigates to Receipts (`/receipts`)
   - System displays paginated list of all receipts with product and supplier information
   - User can view individual receipt details with full transaction information
   - User can search receipts by various criteria (date, type, product)
   - User can access receipt analytics dashboard
   - Staff/Admin can export receipts in multiple formats
   - Staff/Admin can perform bulk operations on receipts
4. **Postconditions**: User has access to complete receipt history
5. **Routes**: 
   - GET `/receipts` - List all receipts (all users)
   - GET `/receipt/:receipt_id` - View receipt details (all users)
   - GET `/receipts/analytics` - Receipt analytics dashboard (all users)
   - POST `/receipts/bulk-export` - Bulk export receipts (staff/admin)
   - GET `/receipts/export/:format` - Export receipts in format (all users)
   - POST `/receipts/:receipt_id/delete` - Delete individual receipt (staff/admin)
   - POST `/receipts/bulk-delete` - Bulk delete receipts (staff/admin)

### UC-U3: View Stock Alerts (All Authenticated Users)

#### Basic Flow - Monitor Inventory Alerts
1. **Preconditions**: User is authenticated
2. **Trigger**: Need to monitor inventory conditions and alerts
3. **Main Success Scenario**:
   - User navigates to Stock Alerts (`/stock-alerts`)
   - System displays comprehensive alerts: low stock, out of stock, expiring items
   - System shows warehouse-specific low stock alerts
   - System displays expiring batches with days until expiry
   - User can filter alerts by warehouse, severity, or type
   - Staff/Admin can take corrective action directly from alerts
4. **Postconditions**: User is informed of critical inventory conditions
5. **Routes**:
   - GET `/stock-alerts` - View all stock alerts (all users)
   - GET `/warehouses/low-stock-alerts` - Low stock alerts by warehouse (all users)
   - GET `/warehouses/batches/expiring` - Expiring batch alerts (all users)

### UC-U4: Reports and Data Export (All Authenticated Users)

#### Basic Flow - Generate and Export Reports
1. **Preconditions**: User is authenticated
2. **Trigger**: Need to generate business reports
3. **Main Success Scenario**:
   - User navigates to Reports (`/reports`)
   - System displays available report types and filters
   - User selects report parameters (date range, warehouse, product categories)
   - System generates report with comprehensive data
   - User can export report in desired format
4. **Postconditions**: User has exported report data for analysis
5. **Routes**: GET `/reports`

### UC-U5: Profile Management (All Authenticated Users)

#### Basic Flow - Manage User Profile
1. **Preconditions**: User is authenticated
2. **Trigger**: Need to view or update personal profile information
3. **Main Success Scenario**:
   - User navigates to Profile (`/profile`)
   - System displays current user information
   - User can update: full name, email, password
   - System validates changes and updates user record
   - System logs profile changes for audit
4. **Postconditions**: User profile updated
5. **Routes**: 
   - GET `/profile` - View profile (all users)
   - POST `/profile/update` - Update profile (all users)

### UC-S7: Advanced Warehouse Operations (Warehouse Staff)

#### Basic Flow - Advanced Inventory Management
1. **Preconditions**: Staff is authenticated, warehouses configured
2. **Trigger**: Need to perform advanced warehouse operations
3. **Main Success Scenario**:
   - Staff performs inventory transfers between warehouses/zones
   - Staff creates and manages inventory batches with tracking
   - Staff manages serialized inventory with unique serial numbers
   - Staff optimizes zone distribution and product placement
   - Staff performs bulk warehouse operations
   - Staff tracks inventory movements across locations
   - Staff manages bin locations within zones
4. **Postconditions**: Advanced warehouse operations completed, audit trail maintained
5. **Routes**:
   - POST `/warehouses/transfer` - Transfer inventory
   - POST `/warehouses/batches` - Create batch
   - POST `/warehouses/serial` - Create serialized inventory
   - GET `/warehouses/serial/:serialNumber` - Serial lookup
   - GET `/warehouses/distribution/overview` - Distribution overview
   - GET `/warehouses/:id/zones/efficiency` - Zone efficiency metrics
   - POST `/warehouses/:id/distribute` - Distribute products to zones
   - GET `/warehouses/:id/products/:productId/optimize` - Optimize placement
   - POST `/warehouses/bulk-operations` - Bulk operations
   - GET `/warehouses/movement-tracking` - Track movements
   - GET `/warehouses/zone-management` - Zone management interface
   - GET `/warehouses/:warehouseId/zones/:zoneId/bins/available` - Available bins
   - GET `/warehouses/:warehouseId/product/:productId/bins` - Product bins
   - PUT `/warehouses/:warehouseId/zones/:zoneId/product/:productId/bin` - Update bin

#### Basic Flow - Warehouse Analytics and Reporting
1. **Preconditions**: Staff is authenticated, warehouse data exists
2. **Trigger**: Need to analyze warehouse performance and efficiency
3. **Main Success Scenario**:
   - Staff navigates to Warehouse Analytics (`/warehouses/analytics`)
   - System displays comprehensive warehouse metrics:
     - Total capacity utilization across all warehouses
     - Inventory value and distribution
     - Zone efficiency scores
     - Movement velocity (products in/out per day)
     - Stock turnover rates
   - Staff can filter by warehouse, date range, or zone
   - Staff views zone-level analytics:
     - Capacity utilization per zone
     - Product diversity (number of different products)
     - Movement frequency
     - Efficiency score (based on utilization and turnover)
   - Staff can export analytics reports
   - System provides optimization recommendations
4. **Postconditions**: Warehouse performance analyzed, insights available
5. **Routes**: 
   - GET `/warehouses/analytics` - Overall warehouse analytics dashboard
   - GET `/warehouses/:id/analytics` - Specific warehouse detailed analytics
   - GET `/warehouses/:id/zones/efficiency` - Zone efficiency metrics
   - GET `/warehouses/:id/capacity-report` - Capacity utilization report
   - GET `/warehouses/:id/movement-report` - Inventory movement analysis
   - GET `/warehouses/:id/turnover-report` - Stock turnover metrics

--- UC-S8: Zone Replacement and Redistribution (Warehouse Staff)

#### Basic Flow - Single Zone Replacement
1. **Preconditions**: Staff is authenticated, product exists in source zone
2. **Trigger**: Need to move inventory from one zone to another
3. **Main Success Scenario**:
   - Staff navigates to Zone Management interface
   - Staff selects product, warehouse, source zone, and destination zone
   - Staff enters quantity to move
   - Staff optionally provides reason for transfer
   - System validates: sufficient quantity in source, capacity in destination
   - System checks that source and destination zones are different
   - System moves inventory from source to destination
   - System updates warehouse_product_locations for both zones
   - System logs zone replacement operation
   - System displays success confirmation with updated quantities
4. **Postconditions**: Inventory redistributed, locations updated, movement logged
5. **Routes**: POST `/warehouses/zones/replace/single`

#### Basic Flow - Multi-Zone Redistribution
1. **Preconditions**: Staff is authenticated, product exists in warehouse
2. **Trigger**: Need to optimize distribution across multiple zones
3. **Main Success Scenario**:
   - Staff navigates to Zone Management interface
   - Staff selects product and warehouse
   - Staff views current distribution across zones
   - Staff defines target distribution (zone ID → quantity mapping)
   - Staff selects strategy: "optimize" or "even"
   - System calculates required movements
   - System validates total quantity matches current inventory
   - System performs multiple zone transfers atomically
   - System updates all affected zone locations
   - System logs multi-zone redistribution with strategy
   - System displays summary of changes
4. **Postconditions**: Product optimally distributed, all locations updated
5. **Routes**: POST `/warehouses/zones/replace/multi`

### UC-S9: Bin Location Management (Warehouse Staff)

#### Basic Flow - Find Available Bins
1. **Preconditions**: Staff is authenticated, warehouse and zone exist
2. **Trigger**: Need to assign incoming inventory to bin locations
3. **Main Success Scenario**:
   - Staff receives inventory to warehouse/zone
   - Staff requests available bin locations
   - System queries warehouse_product_locations for empty bins
   - System returns list of available bins with addressing (aisle-shelf-bin)
   - Staff selects appropriate bin for product
   - System reserves bin location
4. **Postconditions**: Available bins identified for assignment
5. **Routes**: GET `/warehouses/:warehouseId/zones/:zoneId/bins/available`

#### Basic Flow - View Product Bin Locations
1. **Preconditions**: Staff is authenticated, product exists in warehouse
2. **Trigger**: Need to locate product within warehouse
3. **Main Success Scenario**:
   - Staff searches for product in warehouse
   - Staff requests bin location details
   - System queries all zones containing product
   - System returns: zone names, quantities, bin addresses (aisle-shelf-bin)
   - Staff can filter by specific zone if needed
   - System displays visual warehouse map with product locations
4. **Postconditions**: Staff knows exact physical location of products
5. **Routes**: GET `/warehouses/:warehouseId/product/:productId/bins`

#### Basic Flow - Update Bin Location
1. **Preconditions**: Staff is authenticated, product exists at location
2. **Trigger**: Product moved to different bin within zone
3. **Main Success Scenario**:
   - Staff navigates to product location management
   - Staff selects product, warehouse, and zone
   - Staff enters new bin address: aisle, shelf, bin
   - System validates bin address format
   - System checks bin availability
   - System updates warehouse_product_locations record
   - System logs bin location change
   - System displays confirmation with new address
4. **Postconditions**: Bin location updated, change logged
5. **Routes**: PUT `/warehouses/:warehouseId/zones/:zoneId/product/:productId/bin`

### UC-S10: Supplier Status Management (Warehouse Staff)

#### Basic Flow - Toggle Supplier Active Status
1. **Preconditions**: Staff is authenticated, supplier exists
2. **Trigger**: Need to quickly activate or deactivate supplier
3. **Main Success Scenario**:
   - Staff navigates to Supplier Management
   - Staff views supplier list with status indicators
   - Staff clicks toggle status button for supplier
   - System checks current status
   - System flips is_active flag (1 ↔ 0)
   - System updates supplier record
   - System returns new status
   - UI updates to reflect current status
4. **Postconditions**: Supplier status changed
5. **Routes**: POST `/suppliers/:id/toggle-status`

### UC-S11: Warehouse and Zone CRUD Operations (Warehouse Staff)

#### Basic Flow - Create Warehouse
1. **Preconditions**: Staff is authenticated with admin permissions
2. **Trigger**: Business opens new warehouse facility
3. **Main Success Scenario**:
   - Staff navigates to Warehouse Management
   - Staff clicks "Add New Warehouse"
   - Staff enters: name, address, city, country, capacity, contact info
   - System validates input and checks for duplicates
   - System creates warehouse record
   - System optionally creates default zones (receiving, storage, shipping)
   - System generates warehouse ID
   - System logs warehouse creation
   - System redirects to warehouse details view
4. **Postconditions**: New warehouse created and available for operations
5. **Routes**: POST `/warehouses`

#### Basic Flow - Update Warehouse
1. **Preconditions**: Warehouse exists, staff has permissions
2. **Trigger**: Need to update warehouse information
3. **Main Success Scenario**:
   - Staff navigates to warehouse details
   - Staff clicks "Edit Warehouse"
   - Staff updates information
   - System validates changes
   - System updates warehouse record
   - System logs modification
   - System displays success confirmation
4. **Postconditions**: Warehouse information updated
5. **Routes**: PUT `/warehouses/:id`

#### Basic Flow - Create Zone
1. **Preconditions**: Warehouse exists, staff has permissions
2. **Trigger**: Need to add new zone to warehouse
3. **Main Success Scenario**:
   - Staff selects warehouse
   - Staff clicks "Add Zone"
   - Staff enters: zone name, type (receiving/storage/picking/shipping), capacity
   - System validates zone information
   - System creates zone record linked to warehouse
   - System updates warehouse capacity calculations
   - System generates QR code for zone
   - System logs zone creation
4. **Postconditions**: New zone created and available
5. **Routes**: POST `/warehouses/:id/zones`

#### Basic Flow - Update Zone
1. **Preconditions**: Zone exists, staff has permissions
2. **Trigger**: Need to modify zone configuration
3. **Main Success Scenario**:
   - Staff navigates to zone details
   - Staff updates zone information
   - System validates changes
   - System updates zone record
   - System recalculates warehouse capacity
   - System logs modification
4. **Postconditions**: Zone updated
5. **Routes**: PUT `/warehouses/:warehouseId/zones/:zoneId`

### UC-U6: View Expiring Batches (All Authenticated Users)

#### Basic Flow - Monitor Expiring Inventory
1. **Preconditions**: User is authenticated, batch tracking enabled
2. **Trigger**: Need to monitor products approaching expiry
3. **Main Success Scenario**:
   - User navigates to Expiring Batches view
   - System queries batch_tracking table for batches with upcoming expiry
   - User specifies time window (default: 30 days)
   - System displays batches expiring within timeframe:
     - Product name and details
     - Batch number and lot number
     - Warehouse and zone location
     - Current quantity remaining
     - Expiry date and days remaining
     - Supplier information
   - User can filter by warehouse, product, or urgency
   - User can sort by expiry date or quantity
   - Staff can take action: move stock, mark for disposal, notify sales
4. **Postconditions**: User aware of expiring inventory for action
5. **Routes**: GET `/warehouses/batches/expiring`

### UC-U7: Advanced Inventory APIs (All Authenticated Users)

#### Basic Flow - Query Warehouse Zones
1. **Preconditions**: User is authenticated, warehouse exists
2. **Trigger**: Application needs zone information for warehouse
3. **Main Success Scenario**:
   - System receives API request with warehouse ID
   - System validates warehouse exists
   - System queries all zones for warehouse
   - System returns JSON with zone details:
     - Zone ID, name, type
     - Capacity and utilization
     - Active status
   - Response includes BigInt conversion for compatibility
4. **Postconditions**: Zone data available for client use
5. **Routes**: GET `/api/warehouse/:warehouseId/zones`

#### Basic Flow - Check Product Stock at Location
1. **Preconditions**: User is authenticated, location and product exist
2. **Trigger**: Need real-time stock level at specific location
3. **Main Success Scenario**:
   - System receives request: warehouse ID, zone ID, product ID
   - System validates all IDs are numeric and exist
   - System queries warehouse_product_locations table
   - System calculates available quantity (total - reserved)
   - System returns stock details:
     - Quantity on hand
     - Reserved quantity
     - Available quantity
     - Bin location (aisle-shelf-bin)
   - Returns null if product not at that location
4. **Postconditions**: Real-time stock data available
5. **Routes**: GET `/api/warehouse/:warehouseId/zone/:zoneId/product/:productId/stock`

#### Basic Flow - Get Zone Distribution for Product
1. **Preconditions**: User is authenticated, warehouse and product exist
2. **Trigger**: Need to see how product is distributed across zones
3. **Main Success Scenario**:
   - System receives warehouse ID and product ID
   - System queries all zones in warehouse
   - System left-joins with product locations
   - System returns zone distribution:
     - Zone ID and name
     - Zone type
     - Quantity in that zone (0 if none)
     - Reserved quantity
     - Available quantity
     - Bin locations
   - Includes zones with zero inventory for complete picture
4. **Postconditions**: Complete distribution view available
5. **Routes**: GET `/api/warehouse/:warehouseId/product/:productId`

#### Basic Flow - Get Current Distribution Analysis
1. **Preconditions**: User is authenticated
2. **Trigger**: Need analysis of current product distribution
3. **Main Success Scenario**:
   - System receives warehouse and product IDs
   - System calculates distribution metrics
   - System provides zone-by-zone breakdown
   - System includes all warehouse zones
   - System returns analysis for optimization decisions
4. **Postconditions**: Distribution analysis available for planning
5. **Routes**: GET `/api/warehouse/:warehouseId/product/:productId/current-distribution`

---

### UC-S12: Inventory Audit System (Warehouse Staff)

#### Basic Flow - Create Audit
1. **Preconditions**: Staff is authenticated
2. **Trigger**: Need to conduct periodic inventory audit
3. **Main Success Scenario**:
   - Staff navigates to audit management (`/audit`)
   - Staff clicks "Create New Audit"
   - System displays audit creation form
   - Staff selects warehouse and audit type (full/partial/cycle)
   - Staff optionally selects specific zones or products
   - System validates selections
   - System creates audit worksheet with expected quantities
   - System assigns unique audit ID
   - System sets status to "Pending"
   - System displays audit worksheet for counting
4. **Postconditions**: Audit created, worksheet generated
5. **Routes**: GET `/audit/new`, POST `/audit`

#### Basic Flow - Record Physical Count
1. **Preconditions**: Audit exists in "Pending" or "In Progress" status
2. **Trigger**: Staff performs physical count
3. **Main Success Scenario**:
   - Staff scans item or enters product ID
   - System displays expected quantity from system
   - Staff enters actual physical count
   - System records count with timestamp and staff ID
   - System calculates variance (actual - expected)
   - System flags major discrepancies (>10% variance)
   - System updates audit status to "In Progress"
   - System displays next item to count
4. **Postconditions**: Physical count recorded, variances calculated
5. **Routes**: POST `/audit/:id/count`

#### Basic Flow - Review Audit Discrepancies
1. **Preconditions**: Physical counts recorded
2. **Trigger**: Need to review and explain variances
3. **Main Success Scenario**:
   - Staff navigates to audit details (`/audit/:id`)
   - System displays all items with variances
   - System highlights major discrepancies in red
   - Staff reviews each discrepancy
   - Staff adds notes explaining variances (damaged, theft, miscounting)
   - Staff marks items as "Reviewed"
   - System categorizes discrepancies by type
   - System calculates total value of discrepancies
4. **Postconditions**: Discrepancies reviewed and documented
5. **Routes**: GET `/audit/:id`, POST `/audit/:id/discrepancy/:itemId/note`

#### Basic Flow - Submit Audit for Approval
1. **Preconditions**: All items counted and reviewed
2. **Trigger**: Staff completes audit
3. **Main Success Scenario**:
   - Staff reviews audit summary
   - Staff clicks "Submit for Approval"
   - System validates all items have been counted
   - System generates audit report with:
     - Total items audited
     - Total discrepancies found
     - Value of discrepancies
     - Discrepancy breakdown by category
   - System changes status to "Pending Approval"
   - System notifies admin
   - System displays confirmation
4. **Postconditions**: Audit submitted, admin notified
5. **Routes**: POST `/audit/:id/submit`

#### Basic Flow - Approve Audit (Admin)
1. **Preconditions**: Audit in "Pending Approval" status, user is admin
2. **Trigger**: Admin needs to finalize audit
3. **Main Success Scenario**:
   - Admin navigates to audit details
   - Admin reviews discrepancies and notes
   - Admin determines if acceptable
   - Admin clicks "Approve Audit"
   - System updates inventory quantities to match physical counts
   - System creates adjustment transactions
   - System logs all changes with audit ID reference
   - System changes status to "Completed"
   - System archives audit report
4. **Postconditions**: Inventory adjusted, audit completed
5. **Routes**: POST `/audit/:id/approve`

#### Basic Flow - Reject Audit (Admin)
1. **Preconditions**: Audit in "Pending Approval" status, user is admin
2. **Trigger**: Admin finds issues requiring recount
3. **Main Success Scenario**:
   - Admin reviews audit
   - Admin identifies problems (unexplained variances, missing notes)
   - Admin clicks "Reject Audit"
   - Admin enters rejection reason
   - System changes status back to "In Progress"
   - System notifies staff with rejection reason
   - Staff can modify counts and resubmit
4. **Postconditions**: Audit rejected, staff notified
5. **Routes**: POST `/audit/:id/reject`

---

### UC-S13: Equipment Management (Warehouse Staff)

#### Basic Flow - Register Equipment
1. **Preconditions**: Staff is authenticated
2. **Trigger**: New equipment acquired
3. **Main Success Scenario**:
   - Staff navigates to equipment management (`/equipment`)
   - Staff clicks "Add New Equipment"
   - System displays equipment registration form
   - Staff enters details:
     - Equipment name and description
     - Category (forklift, scanner, pallet jack, etc.)
     - Serial number
     - Purchase date and cost
     - Assigned warehouse and zone
   - System validates unique serial number
   - System sets initial status to "Operational"
   - System records initial condition as "Excellent"
   - System creates equipment record
   - System generates equipment ID
4. **Postconditions**: Equipment registered in system
5. **Routes**: GET `/equipment/new`, POST `/equipment`

#### Basic Flow - Update Equipment Condition
1. **Preconditions**: Equipment exists in system
2. **Trigger**: Regular inspection or noticed issue
3. **Main Success Scenario**:
   - Staff navigates to equipment details (`/equipment/:id`)
   - Staff clicks "Update Condition"
   - System displays condition assessment form
   - Staff selects new condition (Excellent/Good/Fair/Poor/Damaged)
   - Staff adds notes about condition
   - Staff optionally attaches photos
   - System records condition change with timestamp
   - System maintains condition history
   - If condition is "Poor" or "Damaged", system suggests maintenance
4. **Postconditions**: Condition updated, history recorded
5. **Routes**: POST `/equipment/:id/condition`

#### Basic Flow - Request Maintenance
1. **Preconditions**: Equipment needs repair or maintenance
2. **Trigger**: Equipment malfunction or scheduled maintenance due
3. **Main Success Scenario**:
   - Staff navigates to equipment details
   - Staff clicks "Request Maintenance"
   - System displays maintenance request form
   - Staff enters:
     - Issue description
     - Priority (Low/Medium/High/Critical)
     - Urgency (can it wait or immediate)
   - System creates maintenance request
   - System changes equipment status to "Maintenance Required"
   - System notifies maintenance team
   - System displays estimated downtime if available
4. **Postconditions**: Maintenance request created, team notified
5. **Routes**: POST `/equipment/:id/maintenance-request`

#### Basic Flow - Complete Maintenance
1. **Preconditions**: Equipment in maintenance
2. **Trigger**: Maintenance work completed
3. **Main Success Scenario**:
   - Maintenance staff navigates to equipment
   - Staff clicks "Complete Maintenance"
   - System displays maintenance completion form
   - Staff enters:
     - Work performed
     - Parts replaced
     - Labor hours
     - Cost
   - Staff updates condition status
   - System changes status to "Operational"
   - System records maintenance in history
   - System notifies equipment owner
4. **Postconditions**: Equipment operational, maintenance logged
5. **Routes**: POST `/equipment/:id/maintenance-complete`

#### Basic Flow - View Equipment Status
1. **Preconditions**: User is authenticated
2. **Trigger**: Need to check equipment availability
3. **Main Success Scenario**:
   - User navigates to equipment list
   - System displays all equipment with status indicators:
     - Operational (green)
     - Maintenance Required (yellow)
     - Under Maintenance (blue)
     - Out of Service (red)
   - User can filter by warehouse, category, status
   - User clicks equipment for full history
4. **Postconditions**: Equipment status visible
5. **Routes**: GET `/equipment`, GET `/equipment/:id`

---

### UC-S14: Consumables Tracking (Warehouse Staff)

#### Basic Flow - Register Consumable Item
1. **Preconditions**: Staff is authenticated
2. **Trigger**: Need to track consumable supplies
3. **Main Success Scenario**:
   - Staff navigates to consumables management (`/consumables`)
   - Staff clicks "Add New Consumable"
   - System displays registration form
   - Staff enters:
     - Item name and description
     - Category (packaging, cleaning, safety, office)
     - Unit of measure (pieces, rolls, boxes)
     - Minimum quantity threshold
     - Maximum quantity threshold
     - Default reorder quantity
   - System creates consumable record
   - System initializes quantity to 0
4. **Postconditions**: Consumable registered in system
5. **Routes**: GET `/consumables/new`, POST `/consumables`

#### Basic Flow - Record Consumption
1. **Preconditions**: Consumable exists in system
2. **Trigger**: Staff uses consumable items
3. **Main Success Scenario**:
   - Staff navigates to consumables list
   - Staff selects item used
   - Staff clicks "Record Usage"
   - System displays consumption form
   - Staff enters:
     - Quantity consumed
     - Purpose/reason (which department/project)
     - Date of consumption
   - System validates sufficient quantity available
   - System deducts from current stock
   - System records consumption in history
   - System calculates new burn rate
   - If below minimum threshold, system triggers reorder alert
4. **Postconditions**: Consumption recorded, stock updated
5. **Routes**: POST `/consumables/:id/consume`

#### Basic Flow - Replenish Consumables
1. **Preconditions**: Consumable restocked
2. **Trigger**: Received new supply
3. **Main Success Scenario**:
   - Staff navigates to consumable details
   - Staff clicks "Add Stock"
   - System displays replenishment form
   - Staff enters:
     - Quantity received
     - Cost per unit
     - Supplier
     - Receipt/invoice number
   - System adds to current stock
   - System records replenishment in history
   - System updates average cost
   - System clears reorder alert if quantity above minimum
4. **Postconditions**: Stock replenished, alert cleared
5. **Routes**: POST `/consumables/:id/replenish`

#### Basic Flow - View Consumption Report
1. **Preconditions**: User is authenticated
2. **Trigger**: Need to analyze consumption patterns
3. **Main Success Scenario**:
   - User navigates to consumables reports (`/consumables/reports`)
   - User selects date range and filters
   - System calculates consumption metrics:
     - Total consumption by item
     - Consumption by department/project
     - Burn rate (consumption per day)
     - Estimated depletion date
     - Cost of consumption
   - System displays charts and graphs
   - User can export report to PDF/Excel
4. **Postconditions**: Consumption report generated
5. **Routes**: GET `/consumables/reports`

#### Basic Flow - Set Reorder Alert
1. **Preconditions**: Consumable exists
2. **Trigger**: Need to prevent stockouts
3. **Main Success Scenario**:
   - Staff navigates to consumable settings
   - Staff sets minimum quantity threshold
   - Staff sets reorder quantity
   - System monitors stock level
   - When quantity falls below minimum:
     - System generates alert
     - System notifies purchasing staff
     - System suggests reorder quantity based on burn rate
4. **Postconditions**: Reorder alert configured
5. **Routes**: POST `/consumables/:id/settings`

---

### UC-S15: High-Value Item Tracking (Warehouse Staff)

#### Basic Flow - Register High-Value Item
1. **Preconditions**: Staff is authenticated
2. **Trigger**: Receiving high-value items (above configured threshold)
3. **Main Success Scenario**:
   - System detects item value exceeds threshold during receipt
   - System prompts for enhanced documentation
   - Staff enters additional details:
     - Serial numbers
     - Condition on receipt
     - Photos
     - Insurance information
     - Expected depreciation schedule
   - System creates high-value tracking record
   - System assigns unique tracking ID
   - System initializes custody chain
   - System sets first custodian as receiving staff
4. **Postconditions**: High-value item registered with enhanced tracking
5. **Routes**: POST `/high-value`

#### Basic Flow - Transfer Custody
1. **Preconditions**: High-value item exists
2. **Trigger**: Item needs to move between staff/locations
3. **Main Success Scenario**:
   - Current custodian initiates transfer
   - System displays transfer form
   - Custodian enters:
     - New custodian (user ID)
     - Transfer reason
     - New location
   - System creates transfer request
   - System notifies new custodian
   - New custodian must acknowledge receipt
   - System requires both parties' digital signatures
   - System updates custody chain
   - System records transfer timestamp
4. **Postconditions**: Custody transferred, chain of custody updated
5. **Routes**: POST `/high-value/:id/transfer`, POST `/high-value/:id/acknowledge-transfer`

#### Basic Flow - Acknowledge Custody Transfer
1. **Preconditions**: Transfer request pending
2. **Trigger**: New custodian receives notification
3. **Main Success Scenario**:
   - New custodian navigates to pending transfers
   - System displays transfer details
   - Custodian inspects item condition
   - Custodian confirms item matches description
   - Custodian clicks "Accept Transfer"
   - System requires confirmation
   - System completes transfer in chain of custody
   - System updates item location
   - System notifies original custodian
4. **Postconditions**: Transfer completed, both parties confirmed
5. **Routes**: POST `/high-value/:id/acknowledge-transfer`

#### Basic Flow - View Chain of Custody
1. **Preconditions**: High-value item exists
2. **Trigger**: Audit or investigation requires custody history
3. **Main Success Scenario**:
   - User navigates to high-value item details
   - System displays complete custody chain:
     - All custodians (chronologically)
     - Transfer dates and times
     - Transfer reasons
     - Locations at each transfer
     - Digital signatures/acknowledgments
   - System shows any breaks or anomalies in chain
   - User can export custody report for compliance
4. **Postconditions**: Complete custody history visible
5. **Routes**: GET `/high-value/:id/custody-chain`

#### Basic Flow - Approve High-Value Sale (Admin)
1. **Preconditions**: Sale request for high-value item, user is admin
2. **Trigger**: Staff attempts to sell high-value item
3. **Main Success Scenario**:
   - Staff creates sale request (cannot complete without approval)
   - System creates approval request
   - System notifies admin
   - Admin navigates to approval queue (`/high-value/approvals`)
   - Admin reviews sale details:
     - Item details and condition
     - Sale price vs. market value
     - Buyer information
     - Custody chain
   - Admin approves or rejects with reason
   - If approved, system allows sale transaction to proceed
   - System logs admin decision
4. **Postconditions**: Sale approved or rejected, decision logged
5. **Routes**: GET `/high-value/approvals`, POST `/high-value/:id/approve-sale`, POST `/high-value/:id/reject-sale`

#### Basic Flow - Configure Value Threshold (Admin)
1. **Preconditions**: User is admin
2. **Trigger**: Need to set what constitutes "high-value"
3. **Main Success Scenario**:
   - Admin navigates to system settings
   - Admin clicks "High-Value Settings"
   - Admin enters threshold amount (e.g., $5000)
   - Admin sets approval requirements:
     - Require admin approval for sales
     - Require dual custody for transfers
     - Require condition photos
   - System saves configuration
   - System applies to all future transactions
   - Existing items re-evaluated against new threshold
4. **Postconditions**: Value threshold configured
5. **Routes**: GET `/high-value/settings`, POST `/high-value/settings`

---

## 5. Alternate Flows

### AF-A1: User Management - Account Lockout
**Trigger**: User exceeds failed login attempts
**Alternate Flow**:
1. System detects 5 consecutive failed login attempts
2. System locks user account automatically
3. System logs security event with IP address and timestamps
4. Admin receives notification of account lockout
5. Admin navigates to user management to investigate
6. Admin can reset failed attempts counter after verification
7. System unlocks account and notifies user

### AF-A2: Session Management - Suspicious Activity
**Trigger**: Multiple concurrent sessions from different locations
**Alternate Flow**:
1. System detects suspicious session patterns
2. System flags sessions for admin review
3. Admin investigates session details (IP, device, location)
4. Admin forces logout of suspicious sessions
5. System invalidates all tokens for affected user
6. System requires password reset on next login
7. Security event logged with admin response

### AF-S1: Receive Stock - Insufficient Capacity
**Trigger**: Incoming shipment exceeds warehouse capacity
**Alternate Flow**:
1. Staff attempts to receive stock at full warehouse
2. System validates capacity before processing
3. System displays capacity exceeded error
4. Staff can: split shipment across warehouses, override capacity (with admin approval), or defer receipt
5. If override selected, system requires admin authorization
6. System logs capacity override event
7. System processes receipt with capacity warning

### AF-S2: Sell Stock - Insufficient Inventory
**Trigger**: Sale quantity exceeds available stock
**Alternate Flow**:
1. Staff attempts to sell more than available stock
2. System prevents negative inventory by default
3. System displays insufficient stock error with current levels
4. Staff options: reduce quantity, check other warehouses, create backorder
5. If backorder created, system logs pending sale
6. System can notify when stock replenished
7. Staff processes partial sale or waits for restock

### AF-S3: QR Code Scanning - Invalid/Damaged Code
**Trigger**: QR code is unreadable or contains invalid data
**Alternate Flow**:
1. User attempts to scan damaged QR code
2. System fails to decode or validates malformed data
3. System displays error message with retry options
4. User can: retry scan, manually enter product ID, request new QR code
5. If manual entry, system validates product existence
6. System logs QR scan failure for quality tracking
7. Staff can generate replacement QR code

### AF-S4: Warehouse Operations - Concurrent Modifications
**Trigger**: Multiple users modify same inventory simultaneously
**Alternate Flow**:
1. Two staff members attempt to modify same product stock
2. System detects concurrent modification attempt
3. First transaction succeeds, second receives conflict error
4. System displays current stock levels to second user
5. Second user can: retry with updated information, or abort transaction
6. System logs concurrent access attempt
7. User completes transaction with current data

### AF-U1: Dashboard Access - Database Connectivity Issues
**Trigger**: Database connection fails during dashboard load
**Alternate Flow**:
1. User navigates to dashboard during database maintenance
2. System attempts database connection and fails
3. System displays cached data with "limited connectivity" warning
4. System provides basic functionality with local cache
5. System automatically retries connection in background
6. When connection restored, system updates dashboard data
7. System logs connectivity issue for monitoring

### AF-A3: Bulk User Operations - Partial Failure
**Trigger**: Some users in bulk operation fail validation
**Alternate Flow**:
1. Administrator selects multiple users for bulk action
2. System processes each user individually in transaction
3. Some users fail (invalid state, missing permissions, etc.)
4. System logs each failure with specific reason
5. System completes successful operations and rolls back failures
6. System displays summary: X succeeded, Y failed with details
7. System provides detailed failure report for investigation
8. Administrator can retry failed users after corrections

### AF-S4: Zone Replacement - Insufficient Destination Capacity
**Trigger**: Destination zone lacks capacity for transfer
**Alternate Flow**:
1. Staff attempts to move inventory to full destination zone
2. System validates destination capacity before transfer
3. System displays capacity exceeded error with current utilization
4. Staff options: reduce transfer quantity, select different zone, or split across multiple zones
5. If split selected, system calculates optimal distribution
6. System processes partial transfer with capacity constraints
7. System logs capacity constraint event
8. Staff completes transfer within capacity limits

### AF-S5: Bin Location Management - Bin Already Occupied
**Trigger**: Attempting to assign product to occupied bin
**Alternate Flow**:
1. Staff attempts to update bin location for product
2. System validates bin availability
3. System detects bin already contains different product
4. System displays error with current bin occupant details
5. Staff options: select different bin, consolidate products if compatible, or relocate existing product first
6. System prevents bin conflicts and inventory mixing
7. System logs bin assignment attempt
8. Staff resolves conflict and completes assignment

### AF-U2: Warehouse Analytics - Insufficient Data
**Trigger**: Insufficient data for meaningful analytics
**Alternate Flow**:
1. User accesses warehouse analytics dashboard
2. System queries for historical data
3. Insufficient transactions or timespan for trend analysis
4. System displays limited analytics with data availability notice
5. System suggests: expanding date range, adding more transaction data
6. System shows available metrics even with limited data
7. User can export raw data for external analysis

---

## 6. Functional Requirements

### FR-1: Authentication and Authorization

#### FR-1.1: User Authentication
- **Requirement**: System shall authenticate users using username/email and password with account lockout
- **Implementation**: bcrypt hashing, session-based authentication, failed login attempt tracking
- **Validation**: Password strength requirements, account lockout after failed attempts, security event logging
- **Database Support**: `users` table with `failed_login_attempts`, `locked_until`, and `last_login` tracking
- **Use Cases**: UC-U1 (all user authentication flows)

#### FR-1.2: Role-based Access Control
- **Requirement**: System shall enforce role-based permissions (Admin, Staff)
- **Implementation**: Middleware functions (isAdmin, isStaffOrAdmin)
- **Validation**: Route-level permission checks, UI element hiding
- **Use Cases**: UC-A1, UC-A2 (admin-only functions)

#### FR-1.3: Session Management
- **Requirement**: System shall provide secure session management with token invalidation and security logging
- **Implementation**: Dynamic session secrets, token blacklist (`invalidated_tokens` table), security event logging
- **Validation**: Session expiry, concurrent session detection, comprehensive security event tracking
- **Database Support**: `security_events`, `invalidated_tokens`, and `user_token_validity` tables
- **Use Cases**: UC-A2 (session management)

### FR-2: Inventory Management

#### FR-2.1: Multi-level Inventory Tracking
- **Requirement**: System shall track inventory at warehouse → zone → product location levels with both bulk and serialized tracking
- **Implementation**: `warehouses` → `warehouse_zones` → `warehouse_product_locations` for bulk inventory, plus `serialized_inventory` for individual items
- **Validation**: Location capacity validation, unique serial enforcement, warehouse distribution overview
- **Database Support**: Complex relational structure with foreign key constraints and inventory views
- **Use Cases**: UC-S1, UC-S2, UC-S3 (inventory operations)

#### FR-2.2: Batch and Serial Tracking
- **Requirement**: System shall support batch tracking with FIFO/FEFO selection strategies
- **Implementation**: Batch table with expiry dates, selection algorithms
- **Validation**: Unique batch numbers, valid expiry dates
- **Use Cases**: UC-S1, UC-S2 (batch management)

#### FR-2.3: Stock Level Management
- **Requirement**: System shall prevent negative stock levels and maintain accurate counts
- **Implementation**: Transaction-based updates with validation
- **Validation**: Stock availability checks before sales
- **Use Cases**: UC-S2 (sell stock), AF-S2 (insufficient inventory)

### FR-3: Warehouse Operations

#### FR-3.1: Multi-warehouse Support
- **Requirement**: System shall support multiple warehouses with independent operations
- **Implementation**: Warehouse master table with zone hierarchies
- **Validation**: Unique warehouse names, capacity management
- **Use Cases**: UC-S3 (warehouse management)

#### FR-3.2: Zone and Bin Management
- **Requirement**: System shall provide configurable zone types and bin addressing
- **Implementation**: Zone types (receiving, storage, picking, shipping), aisle-shelf-bin structure
- **Validation**: Unique addressing, capacity constraints
- **Use Cases**: UC-S3 (zone management)

#### FR-3.3: Inventory Transfers
- **Requirement**: System shall support intra and inter-warehouse transfers
- **Implementation**: Transfer table with source/destination tracking
- **Validation**: Stock availability, capacity validation
- **Use Cases**: UC-S3 (transfer operations)

### FR-4: Receipt Management

#### FR-4.1: Immutable Transaction Records
- **Requirement**: System shall create permanent receipt records for all transactions with complete audit trails
- **Implementation**: `receipts` table with JSON `receipt_data` field, linked to `inventory_log` for movement tracking
- **Validation**: No deletion of posted receipts, complete transaction logging, referential integrity
- **Database Support**: Receipt ID linking across inventory logs, supplier references, transaction date tracking
- **Use Cases**: UC-S2, UC-S3 (transaction processing)

#### FR-4.2: Multi-format Export
- **Requirement**: System shall export receipts in multiple formats (PDF, CSV, Excel, JSON)
- **Implementation**: Format-specific generation services
- **Validation**: Data integrity across formats
- **Use Cases**: UC-U1 (reporting), business workflows

### FR-5: QR Code Integration

#### FR-5.1: QR Code Generation
- **Requirement**: System shall generate QR codes for products, locations, batches, and serials
- **Implementation**: QRCode library with metadata encoding
- **Validation**: Unique QR payloads, version control
- **Use Cases**: UC-S4 (QR operations)

#### FR-5.2: QR Code Scanning
- **Requirement**: System shall provide in-browser QR scanning with camera access
- **Implementation**: Browser-based camera API, QR decoding library
- **Validation**: Format validation, payload verification
- **Use Cases**: UC-S4 (scan operations), AF-S3 (error handling)

### FR-6: Supplier Management

#### FR-6.1: Supplier Master Data
- **Requirement**: System shall maintain supplier information with contact management
- **Implementation**: Suppliers table with related contacts table
- **Validation**: Unique supplier names, required contact information
- **Use Cases**: UC-S5 (supplier management)

#### FR-6.2: Supplier Performance Tracking
- **Requirement**: System shall track supplier performance and status
- **Implementation**: Performance metrics calculation, status management
- **Validation**: Historical data integrity, status change logging
- **Use Cases**: UC-S5 (supplier operations)

### FR-7: Analytics and Reporting

#### FR-7.1: Real-time Dashboard
- **Requirement**: System shall provide real-time analytics dashboards with KPIs
- **Implementation**: Dashboard services with cached calculations
- **Validation**: Data consistency, performance optimization
- **Use Cases**: UC-U1 (dashboard access)

#### FR-7.2: Stock Monitoring and Alerts
- **Requirement**: System shall automatically monitor stock levels and generate alerts
- **Implementation**: Scheduled processes, alert generation services
- **Validation**: Alert thresholds, notification delivery
- **Use Cases**: Automated monitoring, proactive management

### FR-8: Advanced Session Security

#### FR-8.1: Token Invalidation and Blacklist
- **Requirement**: System shall maintain token blacklist for immediate session invalidation across all instances
- **Implementation**: `TokenInvalidationService` with `invalidated_tokens` table, `SessionManagementService` for session lifecycle
- **Validation**: Token uniqueness in blacklist, automatic cleanup of expired tokens, blacklist check on every authenticated request
- **Database Support**: `invalidated_tokens` with token hash, user ID, and expiry timestamp
- **Use Cases**: UC-A1 (force logout all sessions, session management)

#### FR-8.2: Comprehensive Security Event Logging
- **Requirement**: All security-sensitive operations shall be logged with full context for audit and investigation
- **Implementation**: `SecurityLogger` service writes to `security_events` table with event types, user context, IP addresses, outcomes
- **Validation**: Complete audit trail, immutable logs, searchable event history
- **Event Types**: Login attempts, account lockouts, password changes, session operations, permission changes
- **Use Cases**: All UC-A* (admin security operations), security investigations

### FR-9: Advanced Warehouse Operations

#### FR-9.1: Zone Replacement and Redistribution
- **Requirement**: System shall support single-zone transfers and multi-zone redistribution with capacity validation
- **Implementation**: Zone replacement routes with transaction-safe inventory movements, capacity checking before transfers
- **Validation**: Sufficient source quantity, adequate destination capacity, same-warehouse constraint, atomic multi-zone operations
- **Strategies**: "optimize" (efficiency-based distribution) and "even" (equal distribution) for multi-zone operations
- **Use Cases**: UC-S8 (zone replacement)

#### FR-9.2: Bin Location Management
- **Requirement**: System shall provide three-level bin addressing (aisle-shelf-bin) with availability tracking and conflict prevention
- **Implementation**: Bin location fields in `warehouse_product_locations`, API routes for bin queries and updates
- **Validation**: Unique bin occupancy per product, bin address format validation, prevent overwrite of occupied bins
- **Query Capabilities**: Find available bins in zone, locate all bins for product, update bin assignments with conflict detection
- **Use Cases**: UC-S9 (bin location management)

#### FR-9.3: Warehouse and Zone CRUD
- **Requirement**: System shall provide complete create/read/update operations for warehouses and zones with proper cascading
- **Implementation**: Warehouse and zone management routes with validation and relationship handling
- **Validation**: Unique warehouse names, capacity calculations, zone type validation (receiving/storage/picking/shipping)
- **Features**: Create warehouses with default zones, add zones to existing warehouses, update warehouse/zone configurations
- **Use Cases**: UC-S4 (warehouse CRUD), UC-S11 (zone CRUD)

#### FR-9.4: Distribution Optimization
- **Requirement**: System shall analyze and optimize product placement across warehouse zones for efficiency
- **Implementation**: `WarehouseService.optimizeProductPlacement()` with zone efficiency scoring, distribution analysis APIs
- **Validation**: Balanced distribution strategies, capacity-aware recommendations, zone type considerations
- **Analytics**: Zone efficiency metrics, distribution overview, placement optimization suggestions
- **Use Cases**: UC-S7 (advanced warehouse operations)

### FR-10: Bulk Operations Support

#### FR-10.1: Bulk User Management
- **Requirement**: Administrators shall perform bulk operations on multiple users simultaneously (activate, deactivate, delete, change role)
- **Implementation**: POST `/users/bulk-action` with action type and user ID array, transaction-safe processing
- **Validation**: Per-user validation with partial success support, detailed success/failure reporting
- **Operations**: Bulk activate, bulk deactivate, bulk delete (soft delete preserving audit), bulk role change
- **Use Cases**: UC-A1.3 (bulk user operations)

#### FR-10.2: Bulk Receipt Operations
- **Requirement**: Users shall export and delete receipts in bulk with format options and transaction safety
- **Implementation**: Bulk export (POST `/receipts/bulk-export`) with format selection, bulk delete (POST `/receipts/bulk-delete`) with referential integrity
- **Validation**: Receipt existence checks, permission validation, cascading relationship handling
- **Export Formats**: PDF, CSV, Excel, JSON with consistent data structure
- **Use Cases**: UC-U2 (receipt management)

#### FR-10.3: Bulk Warehouse Operations
- **Requirement**: Staff shall perform bulk warehouse operations (transfers, batch operations, distribution changes)
- **Implementation**: POST `/warehouses/bulk-operations` with operation type routing and batch processing
- **Validation**: Capacity validation across all operations, atomic transactions, rollback on any failure
- **Operations**: Bulk transfers, bulk zone assignments, bulk capacity adjustments
- **Use Cases**: UC-S7 (advanced warehouse operations)

### FR-11: RESTful API Endpoints

#### FR-11.1: Warehouse Zone API
- **Requirement**: System shall provide API access to warehouse zone information for integration and mobile apps
- **Implementation**: GET `/api/warehouse/:warehouseId/zones` returns JSON zone list with BigInt conversion
- **Response Format**: Array of zone objects with id, name, type, capacity, utilization, status
- **Validation**: Warehouse existence, numeric ID validation
- **Use Cases**: UC-U7 (API access)

#### FR-11.2: Stock Location API
- **Requirement**: System shall provide real-time stock level queries at warehouse-zone-product level
- **Implementation**: GET `/api/warehouse/:warehouseId/zone/:zoneId/product/:productId/stock`
- **Response Format**: JSON with on_hand, reserved, available quantities, bin location
- **Validation**: All IDs numeric and exist, returns null for non-existent locations
- **Use Cases**: UC-U7 (stock queries)

#### FR-11.3: Product Distribution API
- **Requirement**: System shall provide complete product distribution view across warehouse zones
- **Implementation**: GET `/api/warehouse/:warehouseId/product/:productId` and `/current-distribution`
- **Response Format**: Zone-by-zone breakdown including zones with zero inventory for planning
- **Analytics**: Current distribution, optimization recommendations, capacity analysis
- **Use Cases**: UC-U7 (distribution analysis)

### FR-12: Inventory Audit System

#### FR-12.1: Audit Workflow Management
- **Requirement**: System shall provide complete audit lifecycle from creation through approval with variance detection
- **Implementation**: `routes/audit.js` with audit status workflow (Pending → In Progress → Pending Approval → Completed/Rejected)
- **Validation**: All items counted before submission, admin-only approval, major discrepancy flagging (>10% variance)
- **Database Support**: `audits` table with status tracking, `audit_items` with expected/actual quantities, `audit_discrepancies` for variance notes
- **Use Cases**: UC-S12 (audit operations)

#### FR-12.2: Physical Count Recording
- **Requirement**: System shall record physical counts with timestamp and staff identification, calculating variances automatically
- **Implementation**: POST `/audit/:id/count` with real-time variance calculation
- **Validation**: Numeric quantity validation, duplicate count prevention, staff authentication
- **Features**: Variance calculation (actual - expected), major discrepancy highlighting, progress tracking
- **Use Cases**: UC-S12 (physical counting)

#### FR-12.3: Discrepancy Management
- **Requirement**: System shall categorize and document all discrepancies with staff explanations and admin review
- **Implementation**: Discrepancy notes system with categorization (damaged, theft, miscounting, system error)
- **Validation**: Mandatory notes for major discrepancies, review workflow enforcement
- **Analytics**: Total value of discrepancies, discrepancy breakdown by category, trend analysis
- **Use Cases**: UC-S12 (discrepancy review)

#### FR-12.4: Audit Approval and Reconciliation
- **Requirement**: Admin shall approve audits to update inventory quantities with complete audit trail
- **Implementation**: POST `/audit/:id/approve` creates adjustment transactions, updates inventory, logs all changes
- **Validation**: Admin-only approval, final validation of all counts, referential integrity
- **Reconciliation**: Automatic inventory quantity updates, adjustment transaction creation, audit report archival
- **Use Cases**: UC-S12 (audit approval)

### FR-13: Equipment Management

#### FR-13.1: Equipment Lifecycle Tracking
- **Requirement**: System shall track equipment from registration through decommissioning with complete history
- **Implementation**: `routes/equipment.js` with equipment master data, status tracking, condition history
- **Validation**: Unique serial numbers, required metadata (category, purchase date, cost), status validation
- **Database Support**: `equipment` table with status and condition fields, `equipment_condition_history` for audit trail
- **Use Cases**: UC-S13 (equipment registration and tracking)

#### FR-13.2: Equipment Condition Assessment
- **Requirement**: System shall maintain condition history with ratings and support degradation tracking
- **Implementation**: POST `/equipment/:id/condition` with condition scale (Excellent/Good/Fair/Poor/Damaged)
- **Validation**: Valid condition values, mandatory notes for condition changes, photo attachment support
- **Features**: Condition history timeline, automatic maintenance suggestions for poor conditions, trend analysis
- **Use Cases**: UC-S13 (condition updates)

#### FR-13.3: Maintenance Request and Tracking
- **Requirement**: System shall manage maintenance requests from creation through completion with cost tracking
- **Implementation**: Maintenance request workflow with priority levels (Low/Medium/High/Critical), status tracking
- **Validation**: Equipment status updates during maintenance, completion validation, cost recording
- **Features**: Maintenance team notifications, downtime estimates, maintenance history with costs and parts
- **Use Cases**: UC-S13 (maintenance operations)

#### FR-13.4: Equipment Status Management
- **Requirement**: System shall provide real-time equipment status visibility with filtering and availability tracking
- **Implementation**: Equipment list with status indicators (Operational/Maintenance Required/Under Maintenance/Out of Service)
- **Validation**: Status transitions enforcement, warehouse/zone assignment validation
- **Features**: Filter by status/category/warehouse, availability dashboard, utilization metrics
- **Use Cases**: UC-S13 (status monitoring)

### FR-14: Consumables Tracking

#### FR-14.1: Consumable Item Management
- **Requirement**: System shall track consumable supplies with min/max thresholds and automatic reorder alerts
- **Implementation**: `routes/consumables.js` with consumable master data, quantity tracking, threshold management
- **Validation**: Unique item names per category, valid unit of measure, logical min/max thresholds
- **Database Support**: `consumables` table with quantity, thresholds, reorder settings, `consumable_history` for transactions
- **Use Cases**: UC-S14 (consumable registration)

#### FR-14.2: Consumption Recording and Tracking
- **Requirement**: System shall record consumption with purpose tracking and automatic stock deduction
- **Implementation**: POST `/consumables/:id/consume` with quantity, purpose, department/project allocation
- **Validation**: Sufficient quantity validation, negative stock prevention, purpose documentation
- **Features**: Consumption history, burn rate calculation (consumption per day), depletion date estimation
- **Use Cases**: UC-S14 (consumption recording)

#### FR-14.3: Consumable Replenishment
- **Requirement**: System shall track replenishment with supplier and cost information
- **Implementation**: POST `/consumables/:id/replenish` with quantity, cost, supplier, invoice reference
- **Validation**: Numeric quantity and cost validation, supplier reference validation, max threshold alerts
- **Features**: Average cost calculation, reorder alert clearing, replenishment history
- **Use Cases**: UC-S14 (stock replenishment)

#### FR-14.4: Consumption Analytics
- **Requirement**: System shall provide consumption reports with burn rate analysis and cost tracking
- **Implementation**: GET `/consumables/reports` with date range filtering, department/project breakdowns
- **Validation**: Valid date ranges, authorized access to cost data
- **Analytics**: Total consumption by item, consumption by department, burn rate trends, cost analysis, depletion forecasts
- **Use Cases**: UC-S14 (consumption reports)

#### FR-14.5: Automatic Reorder Alerts
- **Requirement**: System shall automatically generate reorder alerts when stock falls below minimum threshold
- **Implementation**: Real-time threshold monitoring with notification generation
- **Validation**: Valid threshold configuration, alert suppression for items being replenished
- **Features**: Alert dashboard, purchasing notification, suggested reorder quantities based on burn rate
- **Use Cases**: UC-S14 (reorder alerts)

### FR-15: High-Value Item Tracking

#### FR-15.1: High-Value Item Registration
- **Requirement**: System shall identify and register items exceeding configured value threshold with enhanced documentation
- **Implementation**: `routes/high-value.js` with automatic detection during receipt, enhanced metadata collection
- **Validation**: Serial number requirements, condition documentation, insurance information, photo uploads
- **Database Support**: `high_value_items` table, `custody_chain` for complete transfer history
- **Use Cases**: UC-S15 (high-value registration)

#### FR-15.2: Chain of Custody Management
- **Requirement**: System shall maintain complete, unbroken chain of custody for all high-value items
- **Implementation**: Custody transfer workflow with dual acknowledgment (initiator and recipient)
- **Validation**: Both parties must confirm transfer, reason documentation required, timestamp recording
- **Features**: Complete custody history, digital signatures/acknowledgments, break detection, compliance reporting
- **Use Cases**: UC-S15 (custody transfers)

#### FR-15.3: Custody Transfer Workflow
- **Requirement**: System shall enforce secure transfer process with notifications and acknowledgments
- **Implementation**: POST `/high-value/:id/transfer` creates request, POST `/high-value/:id/acknowledge-transfer` completes
- **Validation**: Current custodian verification, new custodian notification, condition inspection on receipt
- **Features**: Pending transfer dashboard, transfer notifications, refusal capability, location tracking
- **Use Cases**: UC-S15 (transfer operations)

#### FR-15.4: High-Value Sale Approval
- **Requirement**: Admin approval shall be required for all sales of high-value items
- **Implementation**: Sale approval workflow with admin queue, approval/rejection with reasons
- **Validation**: Admin-only approval authority, sale price vs. market value validation, buyer documentation
- **Features**: Approval queue dashboard, sale history, custody chain verification before sale
- **Use Cases**: UC-S15 (sale approvals)

#### FR-15.5: Value Threshold Configuration
- **Requirement**: Administrators shall configure what constitutes "high-value" and associated requirements
- **Implementation**: GET/POST `/high-value/settings` for threshold and policy configuration
- **Validation**: Numeric threshold validation, policy enforcement settings
- **Features**: Configurable threshold amount, admin approval requirements, dual custody toggle, photo requirement settings
- **Re-evaluation**: Existing items checked against new threshold when changed
- **Use Cases**: UC-S15 (threshold configuration)

---

## 7. Non-Functional Requirements

### NFR-1: Security

#### NFR-1.1: Data Protection
- **Requirement**: All sensitive data must be encrypted at rest and in transit
- **Acceptance Criteria**: 
  - HTTPS enforcement for all client-server communication
  - bcrypt password hashing with appropriate cost factor
  - Secure cookie configuration (HttpOnly, SameSite, Secure)
- **Testing**: Security audit, penetration testing

#### NFR-1.2: Access Control
- **Requirement**: System must enforce strict access control and audit all actions
- **Acceptance Criteria**:
  - Role-based access control with middleware enforcement
  - CSRF protection on all state-changing operations
  - Comprehensive audit logging with IP tracking
- **Testing**: Access control matrix validation, audit log verification

#### NFR-1.3: Session Security
- **Requirement**: Sessions must be secure with automatic timeout and invalidation
- **Acceptance Criteria**:
  - Dynamic session secret rotation
  - Token invalidation capability
  - Concurrent session detection and management
- **Testing**: Session security testing, timeout validation

### NFR-2: Performance

#### NFR-2.1: Response Time
- **Requirement**: Dashboard and common operations must load within 1 second
- **Acceptance Criteria**:
  - Page load times under 1 second for typical operations
  - Database query optimization with indexing
  - Caching strategy for frequently accessed data
- **Testing**: Load testing, performance monitoring

#### NFR-2.2: Scalability
- **Requirement**: System must support growth to tens of thousands of SKUs
- **Acceptance Criteria**:
  - Database optimization for large datasets
  - Pagination for large result sets
  - Asynchronous processing for heavy operations
- **Testing**: Scalability testing, performance benchmarking

#### NFR-2.3: Concurrent Users
- **Requirement**: System must support multiple concurrent users without degradation
- **Acceptance Criteria**:
  - Database connection pooling
  - Optimistic locking for concurrent updates
  - Rate limiting to prevent abuse
- **Testing**: Concurrent user testing, stress testing

### NFR-3: Reliability

#### NFR-3.1: Data Integrity
- **Requirement**: System must maintain data consistency across all operations
- **Acceptance Criteria**:
  - Database transactions with proper rollback
  - Foreign key constraints and validation
  - Backup and recovery procedures
- **Testing**: Data integrity testing, recovery testing

#### NFR-3.2: Error Handling
- **Requirement**: System must handle errors gracefully with meaningful messages
- **Acceptance Criteria**:
  - Comprehensive error handling with user-friendly messages
  - Logging of all errors for troubleshooting
  - Fallback options for critical operations
- **Testing**: Error scenario testing, exception handling validation

#### NFR-3.3: Availability
- **Requirement**: System must be available 99% of the time during business hours
- **Acceptance Criteria**:
  - Monitoring and alerting for system health
  - Graceful degradation during maintenance
  - Quick recovery from failures
- **Testing**: Availability monitoring, failover testing

### NFR-4: Usability

#### NFR-4.1: User Interface
- **Requirement**: Interface must be intuitive and require minimal training
- **Acceptance Criteria**:
  - Responsive design for various screen sizes
  - Consistent navigation and layout
  - Clear visual feedback for all actions
- **Testing**: Usability testing, user acceptance testing

#### NFR-4.2: Accessibility
- **Requirement**: System must be accessible to users with disabilities
- **Acceptance Criteria**:
  - WCAG 2.1 AA compliance
  - Keyboard navigation support
  - Screen reader compatibility
- **Testing**: Accessibility testing, compliance validation

### NFR-5: Maintainability

#### NFR-5.1: Code Quality
- **Requirement**: Code must be maintainable with clear documentation
- **Acceptance Criteria**:
  - Modular architecture with separation of concerns
  - Comprehensive documentation and comments
  - Consistent coding standards
- **Testing**: Code review, static analysis

#### NFR-5.2: Monitoring and Diagnostics
- **Requirement**: System must provide comprehensive monitoring and logging
- **Acceptance Criteria**:
  - Application performance monitoring
  - Detailed error logging and tracking
  - Business metrics and KPI monitoring
- **Testing**: Monitoring validation, log analysis

### NFR-6: Session Security and Token Management

#### NFR-6.1: Token Blacklist Performance
- **Requirement**: Token blacklist checking must not degrade authentication performance
- **Acceptance Criteria**:
  - Blacklist check < 50ms per authentication
  - Indexed database queries on token hash
  - Automatic cleanup of expired tokens (daily scheduled job)
  - Blacklist size < 100MB for typical workload
- **Testing**: Authentication performance testing with large blacklists, cleanup job validation

#### NFR-6.2: Security Event Audit Trail
- **Requirement**: All security events must be logged with complete context and retained appropriately
- **Acceptance Criteria**:
  - Event logging overhead < 10ms per operation
  - Minimum 1-year retention for security events
  - Immutable audit logs (append-only)
  - Searchable by user, event type, date range, outcome
  - IP address and user agent capture
- **Testing**: Audit log integrity testing, search performance testing, retention policy validation

#### NFR-6.3: Session Validation Performance
- **Requirement**: Session validation must not impact page load times
- **Acceptance Criteria**:
  - Session validation < 10ms per request
  - Efficient session store with connection pooling
  - Graceful handling of session store failures
  - Automatic session cleanup for expired sessions
- **Testing**: Session validation performance testing, concurrent session testing

### NFR-7: Bulk Operations Performance

#### NFR-7.1: Bulk User Operations Scalability
- **Requirement**: Bulk user operations must handle at least 1000 users within 30 seconds
- **Acceptance Criteria**:
  - Per-user processing time < 30ms
  - Transaction-safe processing with rollback on fatal errors
  - Partial success support with detailed reporting
  - Progress indication for operations > 5 seconds
  - Memory-efficient processing (streaming for large batches)
- **Testing**: Bulk operation performance testing with varying user counts, memory profiling

#### NFR-7.2: Bulk Receipt Export Performance
- **Requirement**: Bulk receipt exports must generate files within reasonable time based on volume
- **Acceptance Criteria**:
  - 100 receipts → < 5 seconds
  - 1000 receipts → < 30 seconds
  - 10000 receipts → < 5 minutes
  - Streaming generation for large exports (no memory limit)
  - Format-appropriate compression (ZIP for CSV/Excel)
- **Testing**: Export performance testing across formats and volumes, memory usage validation

#### NFR-7.3: Bulk Warehouse Operations Atomicity
- **Requirement**: Bulk warehouse operations must be fully atomic with proper transaction boundaries
- **Acceptance Criteria**:
  - All-or-nothing processing for critical operations (transfers, stock adjustments)
  - Partial success with rollback for non-critical operations
  - Deadlock detection and retry logic
  - Maximum transaction time: 60 seconds
  - Clear failure reporting with affected items
- **Testing**: Transaction isolation testing, concurrent bulk operation testing, deadlock scenario validation

---

## Conclusion

This use case description provides a comprehensive overview of the Mycelium Inventory Management System, detailing how Warehouse Admins and Warehouse Staff interact with the system to achieve their operational goals. The system's modular architecture, robust security model, and comprehensive feature set make it suitable for businesses requiring sophisticated inventory management with strong audit capabilities and real-time visibility.

The functional and non-functional requirements ensure that the system meets both operational needs and quality standards, providing a solid foundation for business growth and regulatory compliance.

---

## 8. Version History

### Version 3.0 (December 2024)

**Major Update: Documentation Alignment with Implementation**

This version brings the use case documentation into complete alignment with the actual system implementation, documenting all features that were previously implemented but undocumented.

#### New Use Cases Added

**Authentication Use Cases:**
- **UC-AUTH1: User Authentication and Login** - Complete authentication flows including login, logout, password reset request, and password reset completion
- **UC-AUTH2: Session Management** - Admin session monitoring, force logout, and user session history

**Inventory Management Use Cases:**
- **UC-S12: Inventory Audit System** - Complete audit lifecycle from creation through approval with variance detection and reconciliation
  - Routes: 10 endpoints covering audit creation, physical counting, discrepancy management, and admin approval
  - Features: Variance calculation, major discrepancy flagging (>10%), reconciliation workflow
  
- **UC-S13: Equipment Management** - Equipment lifecycle tracking from registration to decommissioning
  - Routes: 8 endpoints for equipment CRUD, condition assessment, maintenance requests
  - Features: Operational status tracking, condition history, priority-based maintenance, cost tracking
  
- **UC-S14: Consumables Tracking** - Consumable inventory management with usage tracking and burn rate analysis
  - Routes: 6 endpoints for consumables CRUD, consumption recording, replenishment, reporting
  - Features: Burn rate calculation, depletion estimates, automatic reorder alerts, department/project allocation
  
- **UC-S15: High-Value Item Tracking** - Enhanced security and chain of custody for high-value items
  - Routes: 10 endpoints for high-value registration, custody transfers, approvals, threshold configuration
  - Features: Chain of custody tracking, dual acknowledgment transfers, admin sale approval, configurable value thresholds

#### Enhanced Use Cases

**UC-A1: User Management**
- Added: DELETE `/users/:id` - Delete user account
- Added: POST `/users/:id/toggle-status` - Toggle user active status
- Added: POST `/users/bulk-action` - Bulk user operations (activate, deactivate, delete, change role)
- Enhanced session management flows with comprehensive security event logging

**UC-S6: Supplier Management**
- Added: GET `/supplier/:id` - View supplier details
- Added: GET `/supplier/:id/edit` - Edit supplier form
- Added: POST `/supplier/:id` - Update supplier
- Added: POST `/supplier/:id/delete` - Delete supplier
- Completed full CRUD operations for supplier management

**UC-S7: Advanced Warehouse Operations**
- Added 6 analytics endpoints for warehouse performance metrics
- Added zone efficiency tracking and optimization recommendations
- Enhanced distribution analysis with current-distribution endpoint
- Documented complete warehouse analytics suite

**UC-U2: Receipt Management**
- Added: GET `/receipts/export/:format` - Multi-format export (PDF, CSV, Excel, JSON)
- Added: POST `/receipts/bulk-export` - Bulk receipt export
- Added: POST `/receipts/bulk-delete` - Bulk receipt deletion
- Enhanced receipt operations with bulk capabilities

#### New Functional Requirements

- **FR-12: Inventory Audit System** - Complete audit workflow management, physical count recording, discrepancy management, audit approval and reconciliation
- **FR-13: Equipment Management** - Equipment lifecycle tracking, condition assessment, maintenance request and tracking, status management
- **FR-14: Consumables Tracking** - Consumable item management, consumption recording, replenishment, analytics, automatic reorder alerts
- **FR-15: High-Value Item Tracking** - High-value item registration, chain of custody management, custody transfer workflow, sale approval, value threshold configuration

#### Implementation Status

- **100% Implementation Coverage** - All documented use cases now have corresponding route implementations
- **40+ New Endpoints** - Documentation now covers all 40+ endpoints across the four new route files
- **Complete Feature Documentation** - All major features implemented in the codebase are now documented
- **Route-Level Specification** - Every use case now includes specific route mappings for implementation reference

#### Documentation Improvements

- Added comprehensive authentication flows previously undocumented
- Enhanced alternate flow documentation with additional error scenarios
- Improved route specification format for better implementation mapping
- Added detailed validation requirements for each use case
- Enhanced database support documentation with specific table references

#### Validation and Quality Assurance

- Conducted comprehensive codebase validation against documentation
- Verified all routes documented in use cases exist in implementation
- Validated all major features have corresponding use case documentation
- Created detailed validation report (USE_CASE_VALIDATION_REPORT.md)
- Confirmed 100% alignment between documentation and implementation

---

### Version 2.0 (October 2025)

**Initial Comprehensive Documentation**

- Complete system description and architecture
- Core use cases for user management, inventory operations, warehouse management
- Functional and non-functional requirements
- Alternate flow documentation
- Security and compliance requirements

#### Core Use Cases (v2.0)
- UC-A1: User Management
- UC-A2: Session Secret Management
- UC-S1: Product Management
- UC-S2: Stock Operations (Receive/Sell)
- UC-S3: Warehouse Management
- UC-S4: QR Code Operations
- UC-S5: Supplier Management
- UC-S6: Multi-Zone Inventory Operations
- UC-S7: Advanced Warehouse Operations
- UC-S8: Bin Location Management
- UC-S9: Warehouse and Zone CRUD
- UC-S10: Serialized Inventory Tracking
- UC-S11: Phone-Specific Inventory Management
- UC-U1: View Analytics Dashboard
- UC-U2: Receipt Management

---

### Version 1.0 (October 2025)

**Initial Release**

- Basic system architecture definition
- Core actor identification
- Initial use case framework
- Preliminary functional requirements