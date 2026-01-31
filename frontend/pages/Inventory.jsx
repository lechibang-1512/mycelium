import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api.js';
import { formatCurrency, formatNumber } from '../utils/formatters.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Boxes, Smartphone, Wrench, Search, AlertTriangle, Inbox, Download, RefreshCw, XCircle, Coins } from 'lucide-react';

export default function Inventory() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { hasPermission } = useAuth();
    const activeTab = searchParams.get('tab') || 'phones';

    const [phonesData, setPhonesData] = useState([]);
    const [sparePartsData, setSparePartsData] = useState([]);
    const [phonesLoading, setPhonesLoading] = useState(false);
    const [spareLoading, setSpareLoading] = useState(false);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState('');
    const [manufacturer, setManufacturer] = useState('');
    const [lowStockOnly, setLowStockOnly] = useState(false);

    const phonesLoadedRef = useRef(false);
    const spareLoadedRef = useRef(false);
    const searchTimer = useRef(null);

    const canWrite = hasPermission('inventory:write') || hasPermission('inventory:manage');

    const loadPhones = useCallback(async (q = search) => {
        setPhonesLoading(true);
        setError(null);
        try {
            const result = await api.get('/inventory', { search: q, lowStock: lowStockOnly });
            const data = Array.isArray(result) ? result : (Array.isArray(result?.data) ? result.data : []);
            setPhonesData(data);
            phonesLoadedRef.current = true;
        } catch (_err) {
            setError('Failed to load inventory');
        } finally {
            setPhonesLoading(false);
        }
    }, [lowStockOnly]);

    const loadSpareParts = useCallback(async () => {
        setSpareLoading(true);
        try {
            const result = await api.get('/spare-parts');
            const data = result?.data || result || [];
            setSparePartsData(Array.isArray(data) ? data : []);
            spareLoadedRef.current = true;
        } catch (_err) {
            setError('Failed to load spare parts');
        } finally {
            setSpareLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'phones' && !phonesLoadedRef.current) loadPhones();
        if (activeTab === 'spare-parts' && !spareLoadedRef.current) loadSpareParts();
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'phones') return;
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => loadPhones(search), 300);
        return () => clearTimeout(searchTimer.current);
    }, [search, lowStockOnly]);

    const switchTab = (tab) => setSearchParams({ tab });

    const manufacturers = [...new Set(phonesData.map(p => p.device_maker).filter(Boolean))].sort();

    const filteredPhones = manufacturer
        ? phonesData.filter(p => p.device_maker === manufacturer)
        : phonesData;

    const items = activeTab === 'spare-parts' ? sparePartsData : filteredPhones;
    const total = items.length;
    
    // Calculate stock levels
    const lowStockCount = items.filter(p => {
        const qty = activeTab === 'phones' ? Number(p.total_inventory || 0) : (p.available_quantity ?? p.total_quantity ?? 0);
        const reorder = p.reorder_point || 5;
        return qty > 0 && qty <= reorder;
    }).length;
    
    const outOfStockCount = items.filter(p => {
        const qty = activeTab === 'phones' ? Number(p.total_inventory || 0) : (p.available_quantity ?? p.total_quantity ?? 0);
        return qty === 0;
    }).length;
    
    const totalValue = items.reduce((sum, p) => {
        const qty = activeTab === 'phones' ? Number(p.total_inventory || 0) : (p.available_quantity ?? 0);
        const price = activeTab === 'phones' ? Number(p.device_price || 0) : Number(p.unit_price || 0);
        return sum + (qty * price);
    }, 0);

    return (
        <div className="max-w-7xl mx-auto w-full">
            <PageHeader
                title="Inventory Master"
                subtitle="Aggregate view of stock levels and valuations"
                icon={Boxes}
                action={canWrite && (
                    <Link 
                        to="/inventory-receive" 
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/20 transition-all focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 no-underline"
                    >
                        <Download className="w-4 h-4" />
                        Receive Stock
                    </Link>
                )}
            />

            {error && (
                <div className="mb-6 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm" role="alert">
                    <span className="flex items-center gap-2 font-medium">
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                        {error}
                    </span>
                    <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 transition-colors p-1">
                        <XCircle className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <Card className="hover:shadow-md transition-shadow">
                    <div className="p-4 flex flex-col items-center text-center">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mb-2">
                            <Boxes className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h4 className="font-bold text-2xl text-slate-800">{formatNumber(total, 'en', 0)}</h4>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total SKUs</span>
                    </div>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <div className="p-4 flex flex-col items-center text-center">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mb-2">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <h4 className="font-bold text-2xl text-slate-800">{formatNumber(lowStockCount, 'en', 0)}</h4>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Low Stock</span>
                    </div>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <div className="p-4 flex flex-col items-center text-center">
                        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center mb-2">
                            <XCircle className="w-5 h-5 text-rose-600" />
                        </div>
                        <h4 className="font-bold text-2xl text-slate-800">{formatNumber(outOfStockCount, 'en', 0)}</h4>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Out of Stock</span>
                    </div>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-default">
                    <div className="p-4 flex flex-col items-center text-center">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
                            <Coins className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h4 className="font-bold text-2xl text-slate-800">{formatCurrency(totalValue)}</h4>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Value</span>
                    </div>
                </Card>
            </div>

            {/* Inventory Container */}
            <Card noPadding>
                {/* Custom Tabs */}
                <div className="flex border-b border-slate-200 px-2 pt-2 bg-slate-50/50">
                    {[
                        { key: 'phones', icon: Smartphone, label: 'Devices / Phones' }, 
                        { key: 'spare-parts', icon: Wrench, label: 'Spare Parts' }
                    ].map(tab => {
                        const active = activeTab === tab.key;
                        const Icon = tab.icon;
                        return (
                            <button 
                                key={tab.key} 
                                onClick={() => switchTab(tab.key)}
                                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-all ${
                                    active 
                                        ? 'border-indigo-600 text-indigo-700' 
                                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                                }`}
                            >
                                <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="p-4 sm:p-6">
                    {/* Device Inventory Tab */}
                    {activeTab === 'phones' && (
                        <div className="space-y-4">
                            {/* Toolbar */}
                            <div className="flex flex-col lg:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input 
                                        value={search} 
                                        onChange={e => setSearch(e.target.value)} 
                                        placeholder="Search devices..." 
                                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors bg-slate-50/50" 
                                    />
                                </div>
                                <div className="w-full lg:w-48">
                                    <select 
                                        value={manufacturer} 
                                        onChange={e => setManufacturer(e.target.value)} 
                                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-slate-700 bg-slate-50/50"
                                    >
                                        <option value="">All Manufacturers</option>
                                        {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={lowStockOnly} 
                                            onChange={e => setLowStockOnly(e.target.checked)} 
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600/50 w-4 h-4 cursor-pointer" 
                                        />
                                        <span className={lowStockOnly ? 'text-indigo-700' : 'text-slate-700'}>Low Stock Only</span>
                                    </label>
                                    <button 
                                        onClick={() => { phonesLoadedRef.current = false; loadPhones(); }} 
                                        className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors tooltip"
                                        title="Refresh List"
                                    >
                                        <RefreshCw className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Phones Table */}
                            {phonesLoading ? <Spinner fullPage /> : filteredPhones.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                    <Inbox className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="text-lg font-medium text-slate-500">No matching products found</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-200 mt-2">
                                    <table className="w-full text-sm whitespace-nowrap">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-4 text-left font-semibold text-slate-600">Product Name</th>
                                                <th className="px-6 py-4 text-left font-semibold text-slate-600">Manufacturer</th>
                                                <th className="px-6 py-4 text-right font-semibold text-slate-600">Base Price</th>
                                                <th className="px-6 py-4 text-right font-semibold text-slate-600">Stock Available</th>
                                                <th className="px-6 py-4 text-center font-semibold text-slate-600">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {filteredPhones.map((p, idx) => {
                                                const qty = Number(p.total_inventory || 0);
                                                const reorder = p.reorder_point || 5;
                                                const statusVariant = qty === 0 ? 'danger' : qty <= reorder ? 'warning' : 'success';
                                                const statusText = qty === 0 ? 'Out of Stock' : qty <= reorder ? 'Low Stock' : 'In Stock';
                                                
                                                return (
                                                    <tr 
                                                        key={idx} 
                                                        className="hover:bg-slate-50 transition-colors cursor-pointer" 
                                                        onClick={() => window.location.href = `/inventory-product?id=${p.product_id}`}
                                                    >
                                                        <td className="px-6 py-4 font-semibold text-slate-900">{p.product_name || p.device_name || '—'}</td>
                                                        <td className="px-6 py-4 text-slate-600 font-medium">{p.device_maker || '—'}</td>
                                                        <td className="px-6 py-4 text-right text-slate-600 font-medium">{formatCurrency(p.device_price || 0)}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className="font-bold text-slate-800 text-base">{formatNumber(qty, 'en', 0)}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <Badge variant={statusVariant}>{statusText}</Badge>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Spare Parts Tab */}
                    {activeTab === 'spare-parts' && (
                        <div>
                            {spareLoading ? <Spinner fullPage /> : sparePartsData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                    <Wrench className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="text-lg font-medium text-slate-500">No spare parts found</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-200 mt-2">
                                    <table className="w-full text-sm whitespace-nowrap">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-4 text-left font-semibold text-slate-600">Part Name</th>
                                                <th className="px-6 py-4 text-left font-semibold text-slate-600">Category</th>
                                                <th className="px-6 py-4 text-right font-semibold text-slate-600">Unit Price</th>
                                                <th className="px-6 py-4 text-right font-semibold text-slate-600">Available Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {sparePartsData.map((p, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 font-semibold text-slate-900">{p.name || p.part_name || '—'}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[0.7rem] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                                            {p.category || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-slate-600 font-medium">{formatCurrency(p.unit_price || 0)}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="font-bold text-slate-800 text-base">{formatNumber(p.available_quantity ?? p.total_quantity ?? 0, 'en', 0)}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
