import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { 
    LayoutDashboard, Package, Smartphone, Download, 
    ClipboardCheck, Lightbulb, Truck, Warehouse, Wrench, 
    FileText, ShoppingCart, Receipt, Users, Shield, Menu, 
    LogOut, User as UserIcon, ChevronDown, Monitor, Component, 
    Cpu, Activity, Boxes
} from 'lucide-react';

export default function MainLayout() {
    const { user, logout, hasPermission, hasAnyPermission, hasRole } = useAuth();
    const location = useLocation();
    const activePath = location.pathname;
    
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    
    // Helper to check if a path is active
    const isActive = (path) => {
        if (path === '/dashboard' && activePath === '/dashboard') return true;
        if (path !== '/dashboard' && activePath.startsWith(path)) return true;
        return false;
    };

    const NavItem = ({ to, icon: Icon, label, onClick }) => {
        const active = isActive(to);
        return (
            <Link 
                to={to} 
                onClick={onClick}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active 
                        ? 'bg-indigo-50 text-indigo-700' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
                <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                {label}
            </Link>
        );
    };

    const NavGroup = ({ title, children }) => (
        <div className="mb-6">
            <h3 className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                {title}
            </h3>
            <div className="space-y-1">
                {children}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 shadow-sm transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                flex flex-col
            `}>
                {/* Logo Area */}
                <div className="h-16 flex items-center px-6 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/20">
                            <Package className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900">Mycelium</span>
                    </div>
                </div>

                {/* Navigation Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    
                    <NavGroup title="Overview">
                        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={() => setSidebarOpen(false)} />
                    </NavGroup>

                    {hasAnyPermission(['inventory:read', 'stocktake:read']) && (
                        <NavGroup title="Inventory">
                            {hasPermission('inventory:read') && (
                                <>
                                    <NavItem to="/inventory" icon={Boxes} label="All Stock" onClick={() => setSidebarOpen(false)} />
                                    <NavItem to="/device-inventory" icon={Smartphone} label="Devices" onClick={() => setSidebarOpen(false)} />
                                </>
                            )}
                            {hasPermission('inventory:write') && (
                                <NavItem to="/inventory-receive" icon={Download} label="Receive Stock" onClick={() => setSidebarOpen(false)} />
                            )}
                            {hasPermission('stocktake:read') && (
                                <NavItem to="/stocktake" icon={ClipboardCheck} label="Stocktake" onClick={() => setSidebarOpen(false)} />
                            )}
                            {hasPermission('inventory:read') && (
                                <NavItem to="/recommendations" icon={Lightbulb} label="Recommendations" onClick={() => setSidebarOpen(false)} />
                            )}
                        </NavGroup>
                    )}

                    {hasAnyPermission(['warehouse:read', 'repair:read']) && (
                        <NavGroup title="Operations">
                            {hasPermission('warehouse:read') && (
                                <NavItem to="/warehouses" icon={Warehouse} label="Warehouses" onClick={() => setSidebarOpen(false)} />
                            )}
                            {hasPermission('inventory:read') && (
                                <NavItem to="/suppliers" icon={Truck} label="Suppliers" onClick={() => setSidebarOpen(false)} />
                            )}
                            {hasAnyPermission(['repair:read', 'rma:read']) && (
                                <NavItem to="/service" icon={Wrench} label="Service Center" onClick={() => setSidebarOpen(false)} />
                            )}
                        </NavGroup>
                    )}

                    {/* Temporary links for PC System until we merge them perfectly */}
                    <NavGroup title="PC Assembly">
                        <NavItem to="/pc-inventory" icon={Monitor} label="PC Inventory" onClick={() => setSidebarOpen(false)} />
                        <NavItem to="/pc-builds" icon={Activity} label="Work Orders" onClick={() => setSidebarOpen(false)} />
                        <NavItem to="/pc-components" icon={Cpu} label="Components" onClick={() => setSidebarOpen(false)} />
                    </NavGroup>

                    {hasPermission('invoice:read') && (
                        <NavGroup title="Procurement">
                            <NavItem to="/purchase-orders" icon={ShoppingCart} label="Purchase Orders" onClick={() => setSidebarOpen(false)} />
                            <NavItem to="/invoices" icon={FileText} label="Invoices" onClick={() => setSidebarOpen(false)} />
                            <NavItem to="/receipts" icon={Receipt} label="Receipts" onClick={() => setSidebarOpen(false)} />
                        </NavGroup>
                    )}

                    {hasRole('admin') && (
                        <NavGroup title="Administration">
                            <NavItem to="/users" icon={Users} label="User Management" onClick={() => setSidebarOpen(false)} />
                            <NavItem to="/user-roles" icon={Shield} label="Access Roles" onClick={() => setSidebarOpen(false)} />
                            <NavItem to="/specs-phones" icon={Component} label="Device Catalog" onClick={() => setSidebarOpen(false)} />
                        </NavGroup>
                    )}
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col lg:pl-64 min-w-0 transition-all duration-300">
                {/* Top Navbar */}
                <header className="h-16 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={toggleSidebar}
                            className="p-2 rounded-md text-slate-500 hover:bg-slate-100 lg:hidden"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* User Menu */}
                        {user ? (
                            <div className="relative">
                                <button 
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center gap-2.5 p-1.5 pl-3 border border-slate-200 rounded-full hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-indigo-100"
                                >
                                    <span className="text-sm font-semibold text-slate-700 hidden sm:block">
                                        {user.fullName || user.username}
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                                        {(user.fullName || user.username).charAt(0).toUpperCase()}
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-slate-400 mr-1 hidden sm:block" />
                                </button>
                                
                                {userMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)}></div>
                                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50 animate-fade-in origin-top-right">
                                            <div className="px-4 py-3 border-b border-slate-100">
                                                <p className="text-sm font-semibold text-slate-900 truncate">
                                                    {user.fullName || user.username}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                                    {user.email || 'Admin User'}
                                                </p>
                                            </div>
                                            <div className="py-1">
                                                <Link 
                                                    to="/profile" 
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                                >
                                                    <UserIcon className="w-4 h-4 text-slate-400" />
                                                    My Profile
                                                </Link>
                                            </div>
                                            <div className="py-1 border-t border-slate-100">
                                                <button 
                                                    onClick={() => {
                                                        setUserMenuOpen(false);
                                                        logout();
                                                    }}
                                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors font-medium"
                                                >
                                                    <LogOut className="w-4 h-4 text-rose-500" />
                                                    Sign Out
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <Link 
                                to="/login" 
                                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>
                </header>

                {/* Page Content Output */}
                <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
