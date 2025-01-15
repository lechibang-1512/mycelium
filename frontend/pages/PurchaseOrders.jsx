import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api.js';
import { formatDate, formatCurrency } from '../utils/formatters.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { ShoppingCart, Plus, Eye, PackagePlus, HelpCircle, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const IC = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors shadow-sm';

const getPOStatusVariant = (s) => {
    const m = { 
        draft: 'secondary', 
        issued: 'info', 
        partially_received: 'warning', 
        received: 'success', 
        cancelled: 'danger' 
    };
    return m[s?.toLowerCase()] || 'secondary';
};

const MatchIcon = ({ status }) => {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s === 'matched') return <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" title={status} />;
    if (s === 'partial') return <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" title={status} />;
    if (s === 'discrepancy') return <XCircle className="w-5 h-5 text-rose-500 mx-auto" title={status} />;
    return <HelpCircle className="w-5 h-5 text-slate-400 mx-auto" title={status} />;
};

export default function PurchaseOrders() {
    const { hasAnyPermission } = useAuth();
    const canWrite = hasAnyPermission(['procurement.write', 'procurement.manage']);
    const canReceive = hasAnyPermission(['inventory.receive', 'inventory.manage']);

    const [pos, setPos] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ search: '', supplier_id: '', status: '', date_from: '', date_to: '' });
    const searchTimer = useRef(null);

    const fetchPOs = useCallback(async (f = filters) => {
        setLoading(true);
        try {
            const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
            const res = await api.get('/invoices/purchase-orders', params);
            setPos(res.data?.purchaseOrders || []);
            setStats(res.data?.stats || {});
        } catch { } finally { setLoading(false); }
    }, [filters]);

    useEffect(() => {
        api.get('/invoices/suppliers').then(r => setSuppliers(r.data?.suppliers || [])).catch(() => {});
        fetchPOs();
    }, [fetchPOs]);

    const handleFilter = (key, val) => {
        const next = { ...filters, [key]: val };
        setFilters(next);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => fetchPOs(next), key === 'search' ? 300 : 0);
    };

    const totalValue = pos.reduce((s, p) => s + parseFloat(p.total_amount_cache || 0), 0);
    const draftCount = pos.filter(p => ['draft', 'issued'].includes(p.status?.toLowerCase())).length;

    return (
        <div className="max-w-7xl mx-auto w-full">
            <PageHeader
                title="Purchase Orders"
                subtitle="Manage procurement and purchase orders"
                icon={ShoppingCart}
                action={
                    canWrite && (
                        <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm">
                            <Plus className="w-4 h-4" /> Create PO
                        </button>
                    )
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="flex flex-col items-center justify-center py-6">
                    <div className="text-3xl font-bold text-indigo-700 mb-1">{stats.total_count || pos.length}</div>
                    <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total POs</div>
                </Card>
                <Card className="flex flex-col items-center justify-center py-6">
                    <div className="text-3xl font-bold text-emerald-600 mb-1">{formatCurrency(totalValue)}</div>
                    <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Value</div>
                </Card>
                <Card className="flex flex-col items-center justify-center py-6">
                    <div className="text-3xl font-bold text-amber-500 mb-1">{draftCount}</div>
                    <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Pending</div>
                </Card>
            </div>

            <div className="mb-6 flex flex-wrap gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <input 
                    value={filters.search} 
                    onChange={e => handleFilter('search', e.target.value)} 
                    placeholder="Search POs..." 
                    className={`${IC} flex-1 min-w-[200px]`} 
                />
                <select 
                    value={filters.supplier_id} 
                    onChange={e => handleFilter('supplier_id', e.target.value)} 
                    className={`${IC} min-w-[180px] w-auto`}
                >
                    <option value="">All Suppliers</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select 
                    value={filters.status} 
                    onChange={e => handleFilter('status', e.target.value)} 
                    className={`${IC} min-w-[160px] w-auto`}
                >
                    <option value="">All Statuses</option>
                    {['draft','issued','partially_received','received','cancelled'].map(s => (
                        <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
                    ))}
                </select>
                <input 
                    type="date" 
                    value={filters.date_from} 
                    onChange={e => handleFilter('date_from', e.target.value)} 
                    className={`${IC} w-auto`} 
                />
                <input 
                    type="date" 
                    value={filters.date_to} 
                    onChange={e => handleFilter('date_to', e.target.value)} 
                    className={`${IC} w-auto`} 
                />
            </div>

            <Card noPadding>
                {loading ? <Spinner fullPage={false} className="py-16" /> : pos.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-lg font-medium text-slate-500">No purchase orders found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {['PO #', 'Supplier', 'Date', 'Status', 'Total'].map(h => (
                                        <th key={h} className={`px-5 py-3 font-semibold text-slate-600 ${h === 'Total' ? 'text-right' : ''}`}>
                                            {h}
                                        </th>
                                    ))}
                                    <th className="px-5 py-3 font-semibold text-slate-600 text-center">Match</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {pos.map((po, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-4 font-semibold text-indigo-600 cursor-pointer hover:underline">
                                            {po.po_number}
                                        </td>
                                        <td className="px-5 py-4 text-slate-700 font-medium truncate max-w-[200px]">
                                            {po.supplier_name}
                                        </td>
                                        <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                                            {formatDate(po.po_date || po.created_at)}
                                        </td>
                                        <td className="px-5 py-4">
                                            <Badge variant={getPOStatusVariant(po.status)}>
                                                {(po.status || 'UNKNOWN').replace('_', ' ').toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-4 text-right font-medium text-slate-900">
                                            {formatCurrency(po.total_amount_cache)}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <MatchIcon status={po.match_status} />
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors" 
                                                    title="View Detail"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {canReceive && ['issued', 'partially_received'].includes(po.status?.toLowerCase()) && (
                                                    <button 
                                                        className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors" 
                                                        title="Receive Items"
                                                    >
                                                        <PackagePlus className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
