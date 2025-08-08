import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ToastProvider } from './contexts/ToastContext.jsx';
import MainLayout from './components/layout/MainLayout.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import Inventory from './pages/Inventory.jsx';
import DeviceInventory from './pages/DeviceInventory.jsx';
import PCInventory from './pages/PCInventory.jsx';
import InventoryReceive from './pages/InventoryReceive.jsx';
import Stocktake from './pages/Stocktake.jsx';
import Disposal from './pages/Disposal.jsx';
import Warehouses from './pages/Warehouses.jsx';
import WarehouseDetail from './pages/WarehouseDetail.jsx';
// Operations
import Invoices from './pages/Invoices.jsx';
import PurchaseOrders from './pages/PurchaseOrders.jsx';
import Receipts from './pages/Receipts.jsx';
import Suppliers from './pages/Suppliers.jsx';
// Services
import Service from './pages/Service.jsx';
import Recommendations from './pages/Recommendations.jsx';
// PC System
import PCBuilds from './pages/PCBuilds.jsx';
import PCBuildForm from './pages/PCBuildForm.jsx';
import PCComponents from './pages/PCComponents.jsx';
import PCComponentForm from './pages/PCComponentForm.jsx';
// Admin
import Users from './pages/Users.jsx';
import UserRoles from './pages/UserRoles.jsx';
// Specs
import SpecsPhones from './pages/SpecsPhones.jsx';
import SpecsParts from './pages/SpecsParts.jsx';



function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes wrapped in MainLayout */}
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/device-inventory" element={<DeviceInventory />} />
            <Route path="/pc-inventory" element={<PCInventory />} />
            <Route path="/inventory-receive" element={<InventoryReceive />} />
            <Route path="/stocktake" element={<Stocktake />} />
            <Route path="/disposal" element={<Disposal />} />
            <Route path="/warehouses" element={<Warehouses />} />
            <Route path="/warehouses/:id" element={<WarehouseDetail />} />
            {/* Operations */}
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/receipts" element={<Receipts />} />
            <Route path="/suppliers" element={<Suppliers />} />
            {/* Services */}
            <Route path="/service" element={<Service />} />
            <Route path="/recommendations" element={<Recommendations />} />
            {/* PC System */}
            <Route path="/pc-builds" element={<PCBuilds />} />
            <Route path="/pc-build-form" element={<PCBuildForm />} />
            <Route path="/pc-build-form/:id" element={<PCBuildForm />} />
            <Route path="/pc-components" element={<PCComponents />} />
            <Route path="/pc-components/:type" element={<PCComponents />} />
            <Route path="/pc-component-form/:type" element={<PCComponentForm />} />
            <Route path="/pc-component-form/:type/:id" element={<PCComponentForm />} />
            {/* Admin */}
            <Route path="/users" element={<Users />} />
            <Route path="/user-roles" element={<UserRoles />} />
            {/* Specs */}
            <Route path="/specs-phones" element={<SpecsPhones />} />
            <Route path="/specs-parts" element={<SpecsParts />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
