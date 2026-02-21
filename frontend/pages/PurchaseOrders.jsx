import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api.js';
import { formatDate, formatCurrency, getStatusVariant } from '../utils/formatters.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { ShoppingCart, Plus, Eye, PackagePlus, HelpCircle, AlertTriangle, CheckCircle, XCircle, FileText, Check, AlertCircle, Save } from 'lucide-react';
import { Modal, ModalFooter } from '../components/ui/Modal.jsx';

import { IC } from '../utils/styles.js';

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
    const canWrite = hasAnyPermission(['inventory:write', 'inventory:manage']);
    const canReceive = hasAnyPermission(['inventory:write', 'inventory:manage']);

    const [pos, setPos] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ search: '', supplier_id: '', status: '', date_from: '', date_to: '' });
    const [activeModal, setActiveModal] = useState({ type: null, data: null });
    const searchTimer = useRef(null);

    const fetchPOs = useCallback(async (f = filters) => {
        setLoading(true);
        try {
            const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
            const res = await api.get('/invoices/purchase-orders', params);
            setPos(res.data?.purchaseOrders || []);
            setStats(res.data?.stats || {});
        } catch (e) {
            console.error(e);
        } finally { setLoading(false); }
    }, [filters]);

    useEffect(() => {
        api.get('/invoices/suppliers').then(r => setSuppliers(r.data?.suppliers || [])).catch(() => {});
        fetchPOs();
    }, [fetchPOs]);

    const handleCreatePO = async (formData) => {
        // Mock API call for creating PO
        console.log('Creating PO with data:', formData);
        setActiveModal({ type: null, data: null });
        fetchPOs();
    };

    const handleReceivePO = async (poData) => {
        // Mock API call for receiving PO
        console.log('Receiving PO items:', poData);
        setActiveModal({ type: null, data: null });
        fetchPOs();
    };

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
                        <button 
                            onClick={() => setActiveModal({ type: 'create', data: null })}
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                        >
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
                                            <Badge variant={getStatusVariant(po.status)}>
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
                                                    onClick={() => setActiveModal({ type: 'view', data: po })}
                                                    className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors" 
                                                    title="View Detail"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {canReceive && ['issued', 'partially_received'].includes(po.status?.toLowerCase()) && (
                                                    <button 
                                                        onClick={() => setActiveModal({ type: 'receive', data: po })}
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

            {/* Create PO Modal */}
            <Modal isOpen={activeModal.type === 'create'} onClose={() => setActiveModal({ type: null, data: null })} title="Create Purchase Order" wide>
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
                            <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery Date</label>
                            <input type="date" className={IC} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                        <textarea className={`${IC} resize-none h-24`} placeholder="Add any special instructions..."></textarea>
                    </div>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-medium text-sm text-slate-700 flex justify-between items-center">
                            <span>Line Items</span>
                            <button className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold flex items-center gap-1">
                                <Plus className="w-4 h-4" /> Add Item
                            </button>
                        </div>
                        <div className="p-8 text-center text-slate-400">
                            <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No items added to this PO yet.</p>
                        </div>
                    </div>
                </div>
                <ModalFooter>
                    <button onClick={() => setActiveModal({ type: null, data: null })} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                    <button onClick={() => handleCreatePO({})} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2">
                        <Save className="w-4 h-4" /> Save Purchase Order
                    </button>
                </ModalFooter>
            </Modal>

            {/* View Detail Modal */}
            <Modal isOpen={activeModal.type === 'view'} onClose={() => setActiveModal({ type: null, data: null })} title={`PO Details: ${activeModal.data?.po_number}`} wide>
                <div className="p-6">
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-1">{activeModal.data?.po_number}</h2>
                            <p className="text-slate-500">Created on {formatDate(activeModal.data?.created_at)}</p>
                        </div>
                        <Badge variant={getStatusVariant(activeModal.data?.status)} className="text-sm px-3 py-1">
                            {(activeModal.data?.status || 'UNKNOWN').replace('_', ' ').toUpperCase()}
                        </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Supplier Info</h4>
                            <p className="font-medium text-slate-900">{activeModal.data?.supplier_name}</p>
                            <p className="text-sm text-slate-600 mt-1">Contact specific details would go here if joined.</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Order Summary</h4>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-slate-600">Total Value:</span>
                                <span className="font-semibold text-slate-900">{formatCurrency(activeModal.data?.total_amount_cache)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-slate-600">Expected Date:</span>
                                <span className="font-medium text-slate-900">-</span>
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

            {/* Receive Items Modal */}
            <Modal isOpen={activeModal.type === 'receive'} onClose={() => setActiveModal({ type: null, data: null })} title={`Receive Items: ${activeModal.data?.po_number}`} wide>
                <div className="p-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 mb-6">
                        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                        <div>
                            <h4 className="text-sm font-bold text-blue-900 mb-1">Receiving Process</h4>
                            <p className="text-sm text-blue-800">Please verify the quantities and condition of all items received from this purchase order before confirming.</p>
                        </div>
                    </div>
                    
                    <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Item</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 text-center">Ordered</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 text-center">Previously Rcvd</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 text-center">Receive Now</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr>
                                    <td colSpan="4" className="px-4 py-8 text-center text-slate-500 bg-white">
                                        Line items to receive will be displayed here.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Receiving Notes</label>
                        <textarea className={`${IC} resize-none h-20`} placeholder="Any damages, missing items, or notes..."></textarea>
                    </div>
                </div>
                <ModalFooter>
                    <button onClick={() => setActiveModal({ type: null, data: null })} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                    <button onClick={() => handleReceivePO(activeModal.data)} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2">
                        <Check className="w-4 h-4" /> Confirm Receipt
                    </button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
