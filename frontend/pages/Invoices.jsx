import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api.js';
import { formatDate, formatCurrency } from '../utils/formatters.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { FileText, Plus, Eye, Send, Save } from 'lucide-react';
import { Modal, ModalFooter } from '../components/ui/Modal.jsx';

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
    const canWrite = hasAnyPermission(['invoice:write', 'invoice:manage']);
    const [invoices, setInvoices] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ search: '', supplier_id: '', status: '', date_from: '', date_to: '' });
    const [activeModal, setActiveModal] = useState({ type: null, data: null });
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

    const handleCreateInvoice = async (formData) => {
        // Mock API call for creating Invoice
        console.log('Creating Invoice with data:', formData);
        setActiveModal({ type: null, data: null });
        fetchInvoices();
    };

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
                        <button 
                            onClick={() => setActiveModal({ type: 'create', data: null })}
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                        >
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
                                                    onClick={() => setActiveModal({ type: 'view', data: inv })}
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

            {/* Create Invoice Modal */}
            <Modal isOpen={activeModal.type === 'create'} onClose={() => setActiveModal({ type: null, data: null })} title="Create Invoice" wide>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                            <select className={IC}>
                                <option value="">Select a supplier...</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                            <input type="date" className={IC} />
                        </div>
                    </div>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-medium text-sm text-slate-700 flex justify-between items-center">
                            <span>Line Items</span>
                            <button className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold flex items-center gap-1">
                                <Plus className="w-4 h-4" /> Add Item
                            </button>
                        </div>
                        <div className="p-8 text-center text-slate-400">
                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No items added to this invoice yet.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tax Rate (%)</label>
                            <input type="number" className={IC} defaultValue="10" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Shipping Fee</label>
                            <input type="number" className={IC} defaultValue="0" />
                        </div>
                    </div>
                </div>
                <ModalFooter>
                    <button onClick={() => setActiveModal({ type: null, data: null })} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                    <button onClick={() => handleCreateInvoice({})} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2">
                        <Save className="w-4 h-4" /> Save Invoice
                    </button>
                </ModalFooter>
            </Modal>

            {/* View Detail Modal */}
            <Modal isOpen={activeModal.type === 'view'} onClose={() => setActiveModal({ type: null, data: null })} title={`Invoice Details: ${activeModal.data?.invoice_number}`} wide>
                <div className="p-6">
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-1">{activeModal.data?.invoice_number}</h2>
                            <p className="text-slate-500">Dated {formatDate(activeModal.data?.invoice_date || activeModal.data?.created_at)}</p>
                        </div>
                        <Badge variant={getStatusVariant(activeModal.data?.status)} className="text-sm px-3 py-1">
                            {(activeModal.data?.status || 'UNKNOWN').replace('_', ' ').toUpperCase()}
                        </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Supplier Info</h4>
                            <p className="font-medium text-slate-900">{activeModal.data?.supplier_name}</p>
                            <p className="text-sm text-slate-600 mt-1">Payment Method: {activeModal.data?.payment_method || 'TM/CK'}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Invoice Summary</h4>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-slate-600">Subtotal:</span>
                                <span className="font-medium text-slate-900">{formatCurrency(activeModal.data?.subtotal || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-slate-600">Tax Amount:</span>
                                <span className="font-medium text-slate-900">{formatCurrency(activeModal.data?.tax_amount || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                                <span className="text-sm font-bold text-slate-900">Total Value:</span>
                                <span className="font-bold text-indigo-700">{formatCurrency(activeModal.data?.total_amount_cache)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Item</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 text-right">Qty</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 text-right">Unit Price</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr>
                                    <td colSpan="4" className="px-4 py-8 text-center text-slate-500 bg-white">
                                        Line items will be displayed here.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <ModalFooter>
                    <button onClick={() => setActiveModal({ type: null, data: null })} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Close</button>
                    <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Download PDF
                    </button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
