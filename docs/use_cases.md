# Mycelium Inventory Management System - Use Case Description

> **Version:** 2.0  
> **Created:** October 22, 2025  
> **Last Updated:** October 25, 2025  
> **System:** Mycelium Inventory Management System

## Table of Contents

1. [System Description](#1-system-description)
2. [Actor Identification](#2-actor-identification)
3. [Actor Goals](#3-actor-goals)
4. [Use Case Scenarios](#4-use-case-scenarios)
   - [Admin Use Cases](#uc-a1-user-management-warehouse-admin)
   - [Staff Use Cases](#uc-s1-product-management-warehouse-staff)
   - [All User Use Cases](#uc-u1-view-analytics-dashboard-all-authenticated-users)
5. [Alternate Flows](#5-alternate-flows)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)

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

### UC-S8: Zone Replacement and Redistribution (Warehouse Staff)

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