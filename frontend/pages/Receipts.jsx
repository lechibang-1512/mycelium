import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api.js';
import { formatDate, formatCurrency } from '../utils/formatters.js';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Receipt, Eye } from 'lucide-react';

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
        </div>
    );
}
