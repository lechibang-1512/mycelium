import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api.js';
import { formatDate, formatCurrency } from '../utils/formatters.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { FileText, Plus, Eye, Send } from 'lucide-react';

const IC = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors shadow-sm';

const getStatusVariant = (s) => {
    const m = { 
        draft: 'secondary', 
        pending: 'warning', 
        approved: 'info', 
        paid: 'success', 
        cancelled: 'danger' 
    };
    return m[s?.toLowerCase()] || 'secondary';
};

export default function Invoices() {
    const { hasAnyPermission } = useAuth();
    const canWrite = hasAnyPermission(['procurement.write', 'procurement.manage']);
    const [invoices, setInvoices] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ search: '', supplier_id: '', status: '', date_from: '', date_to: '' });
    const searchTimer = useRef(null);

    const fetchInvoices = useCallback(async (f = filters) => {
        setLoading(true);
        try {
            const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
            const res = await api.get('/invoices', params);
            setInvoices(res.data?.invoices || []);
        } catch { 
            // Handle error silently or show toast in a real app
        } finally { 
            setLoading(false); 
        }
    }, [filters]);

    useEffect(() => {
        api.get('/suppliers').then(r => setSuppliers(r.data?.suppliers || [])).catch(() => {});
        fetchInvoices();
    }, [fetchInvoices]);

    const handleFilter = (key, val) => {
        const next = { ...filters, [key]: val };
        setFilters(next);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => fetchInvoices(next), key === 'search' ? 300 : 0);
    };

    const submitInvoice = async (id) => {
        if (!window.confirm('Submit invoice for approval?')) return;
        try { 
            await api.patch(`/invoices/${id}/status`, { status: 'pending' }); 
            fetchInvoices(); 
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="max-w-7xl mx-auto w-full">
            <PageHeader
                title="Invoices"
                subtitle="Manage supplier invoices and payments"
                icon={FileText}
                action={
                    canWrite && (
                        <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm">
                            <Plus className="w-4 h-4" /> Create Invoice
                        </button>
                    )
                }
            />

            <div className="mb-6 flex flex-wrap gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <input 
                    value={filters.search} 
                    onChange={e => handleFilter('search', e.target.value)} 
                    placeholder="Search invoices..." 
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
                    {['draft','pending','approved','paid','cancelled'].map(s => (
                        <option key={s} value={s}>{s.toUpperCase()}</option>
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
                {loading ? <Spinner fullPage={false} className="py-16" /> : invoices.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-lg font-medium text-slate-500">No invoices found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {['Invoice #', 'Supplier', 'Date', 'Due Date', 'Status', 'Total'].map(h => (
                                        <th key={h} className={`px-5 py-3 font-semibold text-slate-600 ${h === 'Total' ? 'text-right' : ''}`}>
                                            {h}
                                        </th>
                                    ))}
                                    <th className="px-5 py-3 font-semibold text-slate-600 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {invoices.map((inv, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-4 font-semibold text-indigo-600 cursor-pointer hover:underline">
                                            {inv.invoice_number}
                                        </td>
                                        <td className="px-5 py-4 text-slate-700 font-medium truncate max-w-[200px]">
                                            {inv.supplier_name}
                                        </td>
                                        <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                                            {formatDate(inv.invoice_date || inv.created_at)}
                                        </td>
                                        <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                                            {inv.due_date ? formatDate(inv.due_date) : '-'}
                                        </td>
                                        <td className="px-5 py-4">
                                            <Badge variant={getStatusVariant(inv.status)}>
                                                {(inv.status || 'UNKNOWN').replace('_', ' ').toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-4 text-right font-medium text-slate-900">
                                            {formatCurrency(inv.total_amount_cache)}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors" 
                                                    title="View"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {canWrite && inv.status === 'draft' && (
                                                    <button 
                                                        onClick={() => submitInvoice(inv.id)} 
                                                        className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors" 
                                                        title="Submit"
                                                    >
                                                        <Send className="w-4 h-4" />
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
