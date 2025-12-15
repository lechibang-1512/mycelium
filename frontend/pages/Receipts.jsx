import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api.js';
import { formatDate, formatCurrency } from '../utils/formatters.js';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Receipt, Eye, FileText } from 'lucide-react';
import { Modal, ModalFooter } from '../components/ui/Modal.jsx';

const IC = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors shadow-sm';

const getConditionVariant = (c) => {
    const m = { 
        new: 'success', 
        used_good: 'info', 
        used_fair: 'warning', 
        poor: 'danger' 
    };
    return m[c?.toLowerCase()] || 'secondary';
};

export default function Receipts() {
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ search: '', source: '', date_from: '', date_to: '' });
    const [activeModal, setActiveModal] = useState({ type: null, data: null });
    const searchTimer = useRef(null);

    const fetchReceipts = useCallback(async (f = filters) => {
        setLoading(true);
        try {
            const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
            const res = await api.get('/receipts', params);
            setReceipts(res.data?.receipts || []);
        } catch { 
            // handle error silently or add toast
        } finally { 
            setLoading(false); 
        }
    }, [filters]);

    useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

    const handleFilter = (key, val) => {
        const next = { ...filters, [key]: val };
        setFilters(next);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => fetchReceipts(next), ['search', 'source'].includes(key) ? 300 : 0);
    };

    return (
        <div className="max-w-7xl mx-auto w-full">
            <PageHeader
                title="Receipts"
                subtitle="View inventory receipt transactions"
                icon={Receipt}
            />

            <div className="mb-6 flex flex-wrap gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <input 
                    value={filters.search} 
                    onChange={e => handleFilter('search', e.target.value)} 
                    placeholder="Search receipts..." 
                    className={`${IC} flex-1 min-w-[200px]`} 
                />
                <input 
                    value={filters.source} 
                    onChange={e => handleFilter('source', e.target.value)} 
                    placeholder="Source document..." 
                    className={`${IC} flex-1 min-w-[200px]`} 
                />
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
                {loading ? <Spinner fullPage={false} className="py-16" /> : receipts.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-lg font-medium text-slate-500">No receipts found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {['Component', 'Condition', 'Qty', 'Unit Cost', 'Source', 'Date', 'Created By'].map((h) => (
                                        <th key={h} className={`px-5 py-3 font-semibold text-slate-600 ${['Qty', 'Unit Cost'].includes(h) ? 'text-right' : ''}`}>
                                            {h}
                                        </th>
                                    ))}
                                    <th className="px-5 py-3 font-semibold text-slate-600 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {receipts.map((rec, i) => {
                                    const src = rec.source_document || rec.invoice_number || rec.po_number;
                                    return (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-5 py-4 font-semibold text-indigo-600">
                                                {rec.component_name || rec.part_number || 'Unknown'}
                                            </td>
                                            <td className="px-5 py-4">
                                                {rec.condition ? (
                                                    <Badge variant={getConditionVariant(rec.condition)}>
                                                        {rec.condition.replace('_', ' ')}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right font-medium text-emerald-600">
                                                +{rec.quantity}
                                            </td>
                                            <td className="px-5 py-4 text-right text-slate-700">
                                                {rec.unit_cost ? formatCurrency(rec.unit_cost) : '-'}
                                            </td>
                                            <td className="px-5 py-4">
                                                {src ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 border border-slate-200 font-mono text-slate-600">
                                                        {src}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                                                {formatDate(rec.transaction_date || rec.created_at)}
                                            </td>
                                            <td className="px-5 py-4 text-slate-600 truncate max-w-[150px]">
                                                {rec.created_by_name || 'System'}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <button 
                                                    onClick={() => setActiveModal({ type: 'view', data: rec })}
                                                    className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors" 
                                                    title="View Detail"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* View Detail Modal */}
            <Modal isOpen={activeModal.type === 'view'} onClose={() => setActiveModal({ type: null, data: null })} title="Receipt Details" wide>
                <div className="p-6">
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-1">{activeModal.data?.component_name || activeModal.data?.part_number || 'Unknown Component'}</h2>
                            <p className="text-slate-500">Received on {formatDate(activeModal.data?.transaction_date || activeModal.data?.created_at)}</p>
                        </div>
                        {activeModal.data?.condition && (
                            <Badge variant={getConditionVariant(activeModal.data?.condition)} className="text-sm px-3 py-1">
                                {activeModal.data.condition.replace('_', ' ').toUpperCase()}
                            </Badge>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Transaction Info</h4>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-slate-600">Quantity:</span>
                                <span className="font-semibold text-emerald-600">+{activeModal.data?.quantity}</span>
                            </div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-slate-600">Unit Cost:</span>
                                <span className="font-medium text-slate-900">{activeModal.data?.unit_cost ? formatCurrency(activeModal.data?.unit_cost) : '-'}</span>
                            </div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-slate-600">Total Value:</span>
                                <span className="font-medium text-slate-900">
                                    {activeModal.data?.unit_cost ? formatCurrency(activeModal.data?.unit_cost * activeModal.data?.quantity) : '-'}
                                </span>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Source Document</h4>
                            <p className="font-mono font-medium text-slate-900 mb-2">
                                {activeModal.data?.source_document || activeModal.data?.invoice_number || activeModal.data?.po_number || 'N/A'}
                            </p>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 mt-4">Received By</h4>
                            <p className="text-sm font-medium text-slate-700">{activeModal.data?.created_by_name || 'System'}</p>
                        </div>
                    </div>
                    {activeModal.data?.notes && (
                        <div className="mb-4">
                            <h4 className="text-sm font-semibold text-slate-800 mb-2">Notes</h4>
                            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">{activeModal.data.notes}</p>
                        </div>
                    )}
                </div>
                <ModalFooter>
                    <button onClick={() => setActiveModal({ type: null, data: null })} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Close</button>
                    <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2">
                        <FileText className="w-4 h-4" /> View Source Document
                    </button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
