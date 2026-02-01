import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout';
import { PageSpinner } from './components/ui/Spinner';
import ErrorBoundary from './components/ErrorBoundary';
import { StocktakeProvider } from './contexts/StocktakeContext';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/auth';

// Import Bootstrap CSS
// Bootstrap CSS moved to main.jsx to ensure correct loading order
import '@fortawesome/fontawesome-free/css/all.min.css';

// Login page (not lazy - needed immediately)
import Login from './pages/auth/Login';

// Lazy load all page components for code splitting
// Note: Dashboard removed — redirect to Inventory instead

// Inventory
const Inventory = lazy(() => import('./pages/inventory/Inventory'));
const ProductDetails = lazy(() => import('./pages/products/ProductDetails'));
const ReceiveStock = lazy(() => import('./pages/inventory/ReceiveStock'));
const DispenseStock = lazy(() => import('./pages/inventory/DispenseStock'));
const DeviceInventory = lazy(() => import('./pages/inventory/DeviceInventory'));
const SparePartsInventory = lazy(() => import('./pages/inventory/SparePartsInventory'));
const StockMovement = lazy(() => import('./pages/inventory/StockMovement'));

const CustomerInvoices = lazy(() => import('./pages/documents/CustomerInvoices'));
const DisposalZone = lazy(() => import('./pages/operations/DisposalZone'));

// Specialized Inventory

// Warehouses
const Warehouses = lazy(() => import('./pages/warehouse/Warehouses'));
const WarehouseDetail = lazy(() => import('./pages/warehouse/WarehouseDetail'));

// Suppliers
const Suppliers = lazy(() => import('./pages/suppliers/Suppliers'));

// Invoices
const Invoices = lazy(() => import('./pages/documents/Invoices'));

const Receipts = lazy(() => import('./pages/documents/Receipts'));

// Spare parts & Service Operations (deprecated pages removed - unified in ReceiveStock/DispenseStock)
const ServiceOperations = lazy(() => import('./pages/operations/ServiceOperations'));

// Stocktake & Recommendations
const Stocktake = lazy(() => import('./pages/warehouse/Stocktake'));
const Recommendations = lazy(() => import('./pages/analytics/Recommendations'));

// RBAC Management
const RolesPermissions = lazy(() => import('./pages/admin/RolesPermissions'));
const UserRoles = lazy(() => import('./pages/admin/UserRoles'));
const Users = lazy(() => import('./pages/admin/Users')); // Added Users page
const UserProfile = lazy(() => import('./pages/admin/UserProfile'));


function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <StocktakeProvider>
            <Suspense fallback={<PageSpinner />}>
              <Routes>
                {/* Login route - outside AppLayout */}
                <Route path="/login" element={<Login />} />

                {/* All authenticated routes use AppLayout wrapped in PrivateRoute */}
                <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
                  {/* Home route redirects to Inventory */}
                  <Route path="/" element={<Navigate to="/inventory" replace />} />

                  {/* Inventory */}
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/inventory/product/:id" element={<ProductDetails />} />
                  <Route path="/inventory/receive" element={<ReceiveStock />} />
                  <Route path="/inventory/dispense-stock" element={<DispenseStock />} />
                  <Route path="/inventory/movements" element={<StockMovement />} />

                  {/* Specialized Inventory */}
                  {/* Redirect Phones to Inventory (Merged) */}
                  <Route path="/inventory/phones" element={<Navigate to="/inventory" replace />} />

                  {/* Device & Spare Parts Inventory */}
                  <Route path="/device-inventory" element={<DeviceInventory />} />
                  <Route path="/spare-parts-inventory" element={<SparePartsInventory />} />


                  {/* Warehouses */}
                  <Route path="/warehouses" element={<Warehouses />} />
                  <Route path="/warehouses/:id" element={<WarehouseDetail />} />

                  {/* Suppliers */}
                  <Route path="/suppliers" element={<Suppliers />} />

                  {/* Invoices */}
                  <Route path="/invoices" element={<Invoices />} />


                  <Route path="/inventory-logs" element={<Receipts />} />
                  {/* Redirect old receipts route to inventory-logs */}
                  <Route path="/receipts" element={<Navigate to="/inventory-logs" replace />} />

                  {/* Redirect old operations route to inventory (dashboard removed) */}
                  <Route path="/operations" element={<Navigate to="/inventory" replace />} />

                  {/* Spare parts - redirect to unified pages */}
                  <Route path="/spare-parts" element={<Navigate to="/inventory?tab=spare-parts" replace />} />
                  <Route path="/spare-parts/receive" element={<Navigate to="/inventory/receive" replace />} />
                  <Route path="/spare-parts/dispense" element={<Navigate to="/inventory/dispense-stock" replace />} />

                  {/* Service Operations (Unified Repairs & RMA) */}
                  <Route path="/service" element={<ServiceOperations />} />

                  {/* Customer Invoices & Disposal Zone */}
                  <Route path="/customer-invoices" element={<CustomerInvoices />} />
                  <Route path="/disposal" element={<DisposalZone />} />

                  {/* Redirects for legacy routes */}
                  <Route path="/repairs" element={<Navigate to="/service" state={{ tab: 'repair-jobs' }} replace />} />
                  <Route path="/rma" element={<Navigate to="/service" state={{ tab: 'rma' }} replace />} />

                  {/* Stocktake & Recommendations */}
                  <Route path="/stocktake" element={<Stocktake />} />
                  <Route path="/recommendations" element={<Recommendations />} />

                  {/* RBAC Management */}
                  <Route path="/rbac/roles" element={<RolesPermissions />} />
                  <Route path="/rbac/users" element={<UserRoles />} />
                  <Route path="/users" element={<Users />} /> {/* Added Users route */}


                  {/* User Profile */}
                  <Route path="/profile" element={<UserProfile />} />

                  {/* 404 Catch all */}
                  <Route path="*" element={<Navigate to="/inventory" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </StocktakeProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
