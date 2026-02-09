import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api.js';
import { formatDateOnly, formatDateTime } from '../utils/formatters.js';
import { useAuth } from '../contexts/AuthContext.jsx';

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_COLORS = { PLANNED: 'bg-slate-500', IN_PROGRESS: 'bg-indigo-600', COMPLETED: 'bg-cyan-600', APPROVED: 'bg-emerald-600', CANCELLED: 'bg-rose-600' };
const StatusBadge = ({ s }) => <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium text-white ${STATUS_COLORS[s] || 'bg-slate-500'}`}>{(s || '').replace('_', ' ')}</span>;
const TypeBadge = ({ t }) => (!t || t === 'full')
    ? <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium text-white bg-slate-500"><i className="fas fa-boxes mr-1"></i>FULL</span>
    : <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium text-white bg-cyan-600"><i className="fas fa-sync-alt mr-1"></i>CYCLE</span>;

const VarBadge = ({ v }) => {
    if (v == null) return <span>-</span>;
    const num = parseFloat(v);
    if (num === 0) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white bg-emerald-600">Match</span>;
    if (num > 0) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white bg-cyan-600">+{num}</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white bg-rose-600">{num}</span>;
};

const Spinner = () => (
    <div className="text-center py-10">
        <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

// ─── Modals ──────────────────────────────────────────────────────────────────

function CountModal({ item, onClose, onSaved }) {
    const [qty, setQty] = useState(item?.qty ?? '');
    const [notes, setNotes] = useState(item?.notes ?? '');
    const [saving, setSaving] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put(`/stocktake/items/${item.id}/count`, { counted_quantity: parseFloat(qty), notes });
            onSaved();
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm z-10 p-6">
                <h5 className="font-bold text-lg mb-4">Record Count</h5>
                <form onSubmit={handleSave} className="space-y-5">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Counted Quantity</label>
                        <input type="number" step="0.01" value={qty} onChange={e => setQty(e.target.value)} required autoFocus className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/40" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/40" />
                    </div>
                    <div className="flex gap-3 justify-end pt-2">
                        <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-4 py-2 text-sm cursor-pointer hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={saving} className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm cursor-pointer disabled:opacity-60">
                            {saving ? 'Saving...' : 'Save Count'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function CreateModal({ warehouses, onClose, onCreated }) {
    const [type, setType] = useState('full');
    const [warehouseId, setWarehouseId] = useState('');
    const [notes, setNotes] = useState('');
    const [limit, setLimit] = useState(50);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true); setError(null);
        try {
            if (type === 'full') {
                await api.post('/stocktake', { warehouse_id: warehouseId, notes });
            } else {
                await api.post('/stocktake/cycle', { warehouse_id: warehouseId, limit: parseInt(limit, 10), notes });
            }
            onCreated();
        } catch (err) {
            setError(err.message || 'Failed to create count');
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md z-10 p-6">
                <h5 className="font-bold text-lg mb-4"><i className="fas fa-plus mr-2 text-indigo-600"></i>Create Inventory Count</h5>
                {error && <div className="mb-3 text-rose-600 text-sm bg-rose-600/10 border border-rose-600/30 rounded px-3 py-2">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-2">Count Type</label>
                        <div className="flex gap-4">
                            {['full', 'cycle'].map(t => (
                                <label key={t} className="flex items-center gap-2 cursor-pointer text-sm capitalize">
                                    <input type="radio" name="count_type" value={t} checked={type === t} onChange={() => setType(t)} /> {t} Count
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Warehouse</label>
                        <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} required className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/40">
                            <option value="">Select Warehouse...</option>
                            {warehouses.map(w => <option key={w.id || w.warehouse_id} value={w.id || w.warehouse_id}>{w.warehouse_name || w.name}</option>)}
                        </select>
                    </div>
                    {type === 'cycle' && (
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Limit (items)</label>
                            <input type="number" value={limit} onChange={e => setLimit(e.target.value)} min="1" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/40" />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="2" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-600/40"></textarea>
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-4 py-2 text-sm cursor-pointer hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={saving} className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm cursor-pointer disabled:opacity-60">
                            {saving ? 'Creating...' : 'Create Count'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function DetailModal({ count, canWrite, canApprove, canManage, onClose, onAction, onCountItem, onDeleteItem }) {
    if (!count) return null;
    const c = count;
    const prog = c.total_items ? Math.round((c.counted_items / c.total_items) * 100) : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
            <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-4xl z-10 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <h5 className="font-bold text-lg"><i className="fas fa-clipboard-check mr-2 text-indigo-600"></i>{c.stocktake_number}</h5>
                        <StatusBadge s={c.status} />
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-900 cursor-pointer"><i className="fas fa-times text-lg"></i></button>
                </div>

                <div className="overflow-y-auto flex-1 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-slate-50 rounded-lg p-4">
                            <h6 className="text-xs font-semibold text-slate-500 uppercase mb-3"><i className="fas fa-info-circle mr-1"></i>Details</h6>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-slate-500">Warehouse:</span><span>{c.warehouse_name}</span></div>
                                <div className="flex justify-between items-center"><span className="text-slate-500">Type:</span><TypeBadge t={c.count_type} /></div>
                                <div className="flex justify-between"><span className="text-slate-500">Created:</span><span>{formatDateTime(c.created_at)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Notes:</span><span>{c.notes || '-'}</span></div>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                            <h6 className="text-xs font-semibold text-slate-500 uppercase mb-3"><i className="fas fa-chart-bar mr-1"></i>Progress</h6>
                            <div className="flex justify-between text-sm mb-1"><span>Items Counted</span><strong>{c.counted_items || 0} / {c.total_items || 0}</strong></div>
                            <div className="w-full h-2 bg-border rounded-full overflow-hidden mb-4"><div className="h-full bg-indigo-600" style={{ width: `${prog}%` }}></div></div>
                            <div className="grid grid-cols-3 text-center divide-x divide-border">
                                <div><div className="text-xl font-bold text-emerald-600">{(c.items || []).filter(i => i.variance === 0).length}</div><div className="text-[10px] text-slate-500 uppercase">Matched</div></div>
                                <div><div className="text-xl font-bold text-rose-600">{(c.items || []).filter(i => i.variance && i.variance !== 0).length}</div><div className="text-[10px] text-slate-500 uppercase">Variance</div></div>
                                <div><div className="text-xl font-bold text-cyan-600">{Math.abs(parseFloat(c.total_variance_qty || 0))}</div><div className="text-[10px] text-slate-500 uppercase">Tot. Var</div></div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap mb-4 pb-4 border-b border-slate-200">
                        {canWrite && c.status === 'PLANNED' && <button onClick={() => onAction('start', c.stocktake_id)} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm cursor-pointer hover:bg-emerald-600-dark"><i className="fas fa-play mr-2"></i>Start Counting</button>}
                        {canWrite && c.status === 'IN_PROGRESS' && <button onClick={() => onAction('complete', c.stocktake_id)} className="px-3 py-1.5 bg-cyan-600 text-white rounded text-sm cursor-pointer"><i className="fas fa-check mr-2"></i>Complete Count</button>}
                        {canApprove && c.status === 'COMPLETED' && <button onClick={() => onAction('approve', c.stocktake_id)} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm cursor-pointer"><i className="fas fa-check-double mr-2"></i>Approve &amp; Apply</button>}
                        {canManage && ['PLANNED', 'IN_PROGRESS', 'COMPLETED'].includes(c.status) && <button onClick={() => onAction('cancel', c.stocktake_id)} className="px-3 py-1.5 border border-amber-500 text-amber-500 rounded text-sm cursor-pointer"><i className="fas fa-times mr-2"></i>Cancel</button>}
                    </div>

                    {/* Items table */}
                    <h6 className="font-semibold text-sm mb-2"><i className="fas fa-list mr-1"></i>Items</h6>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr><th className="px-3 py-2 text-left text-xs font-medium text-slate-700">Product</th><th className="px-3 py-2 text-left text-xs font-medium text-slate-700">Bin</th><th className="px-3 py-2 text-center text-xs font-medium text-slate-700">Sys</th><th className="px-3 py-2 text-center text-xs font-medium text-slate-700">Counted</th><th className="px-3 py-2 text-center text-xs font-medium text-slate-700">Variance</th><th className="px-3 py-2 text-right text-xs font-medium text-slate-700">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {(c.items || []).map((item, idx) => (
                                    <tr key={idx} className={item.variance && item.variance !== 0 ? 'bg-amber-500/5' : ''}>
                                        <td className="px-3 py-2"><strong className="block">{item.device_name || item.part_name || '-'}</strong><small className="text-slate-500">{item.device_maker || ''}</small></td>
                                        <td className="px-3 py-2"><small>{item.bin_location || ''}</small></td>
                                        <td className="px-3 py-2 text-center">{item.system_quantity}</td>
                                        <td className="px-3 py-2 text-center">
                                            {item.counted_quantity !== null
                                                ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-600 text-white">{item.counted_quantity}</span>
                                                : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-50 border border-slate-200 text-slate-500">Pending</span>}
                                        </td>
                                        <td className="px-3 py-2 text-center"><VarBadge v={item.variance} /></td>
                                        <td className="px-3 py-2 text-right">
                                            {canWrite && ['PLANNED', 'IN_PROGRESS'].includes(c.status) ? (
                                                <div className="flex gap-1 justify-end">
                                                    <button onClick={() => onCountItem({ id: item.id, qty: item.counted_quantity, notes: item.notes || '' })} className={`px-2 py-1 text-[10px] rounded cursor-pointer ${item.counted_quantity !== null ? 'border border-indigo-600 text-indigo-600 hover:bg-indigo-600/10' : 'bg-indigo-600 text-white hover:bg-indigo-600-dark'}`}>{item.counted_quantity !== null ? 'Update' : 'Count'}</button>
                                                    <button onClick={() => onDeleteItem(item.id)} className="px-2 py-1 text-[10px] rounded border border-rose-600 text-rose-600 hover:bg-rose-600/10 cursor-pointer"><i className="fas fa-trash"></i></button>
                                                </div>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Stocktake() {
    const { hasPermission, hasAnyPermission } = useAuth();
    const canWrite = hasAnyPermission(['stocktake:write', 'stocktake:manage']);
    const canDelete = hasAnyPermission(['stocktake:delete', 'stocktake:manage']);
    const canApprove = hasAnyPermission(['stocktake:approve', 'stocktake:manage']);
    const canManage = hasPermission('stocktake:manage');

    const [counts, setCounts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [dueItems, setDueItems] = useState([]);
    const [accuracy, setAccuracy] = useState([]);
    const [loading, setLoading] = useState(false);

    const [filters, setFilters] = useState({ warehouse_id: '', status: '', count_type: '' });
    const [search, setSearch] = useState('');
    const [message, setMessage] = useState(null);

    const [showCreate, setShowCreate] = useState(false);
    const [showDue, setShowDue] = useState(false);
    const [selectedCount, setSelectedCount] = useState(null);
    const [countItem, setCountItem] = useState(null);



    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const params = { limit: 200, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
            const [countsRes, accuracyRes, dueRes, whRes] = await Promise.all([
                api.get('/stocktake', params),
                api.get('/stocktake/accuracy'),
                api.get('/stocktake/due-items', { limit: 50 }),
                api.get('/warehouses'),
            ]);
            let data = countsRes?.data?.data || [];
            if (filters.count_type) data = data.filter(c => filters.count_type === 'full' ? (!c.count_type || c.count_type === 'full') : c.count_type === 'cycle');
            setCounts(Array.isArray(data) ? data : []);
            setAccuracy(accuracyRes?.data?.data || []);
            setDueItems(dueRes?.data?.data || []);
            setWarehouses(whRes?.data?.warehouses || whRes?.data?.data || []);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Failed to load data' });
        }
        finally { setLoading(false); }
    }, [filters]);

    useEffect(() => { fetchAll(); }, [filters]);

    const handleAction = async (action, id) => {
        try {
            if (action === 'start') await api.put(`/stocktake/${id}/start`);
            else if (action === 'complete') await api.put(`/stocktake/${id}/complete`);
            else if (action === 'approve') {
                if (!window.confirm('Approve this count and apply inventory adjustments?\nThis action cannot be undone.')) return;
                await api.put(`/stocktake/${id}/approve`);
            } else if (action === 'cancel') {
                const r = window.prompt('Enter cancellation reason:');
                if (!r) return;
                await api.put(`/stocktake/${id}/cancel`, { reason: r });
            } else if (action === 'delete') {
                if (!window.confirm('Permanently delete this stocktake? Cannot be undone.')) return;
                await api.del(`/stocktake/${id}`);
                setSelectedCount(null);
            }
            setMessage({ type: 'success', text: 'Action completed successfully' });
            fetchAll();
            if (selectedCount?.stocktake_id === id && action !== 'delete') fetchCountDetail(id);
        } catch (err) { setMessage({ type: 'error', text: err.message || `Failed to ${action}` }); }
    };

    const fetchCountDetail = async (id) => {
        try {
            const res = await api.get(`/stocktake/${id}`);
            setSelectedCount(res?.data?.data);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Failed to fetch detail' });
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (!window.confirm('Remove this item from the stocktake?')) return;
        try {
            await api.del(`/stocktake/items/${itemId}`);
            setMessage({ type: 'success', text: 'Item removed' });
            if (selectedCount) fetchCountDetail(selectedCount.stocktake_id);
        } catch (err) { setMessage({ type: 'error', text: err.message || 'Failed to delete item' }); }
    };

    const filtered = search
        ? counts.filter(c => (c.stocktake_number || '').toLowerCase().includes(search.toLowerCase()) || (c.warehouse_name || '').toLowerCase().includes(search.toLowerCase()))
        : counts;

    const active = counts.filter(c => ['PLANNED', 'IN_PROGRESS'].includes(c.status)).length;
    const completed = counts.filter(c => c.status === 'COMPLETED').length;
    const approved = counts.filter(c => c.status === 'APPROVED').length;
    const cycleCounts = counts.filter(c => c.count_type === 'cycle').length;
    let ira = null;
    if (accuracy.length > 0) {
        const tc = accuracy.reduce((s, a) => s + (Number(a.products_counted) || 0), 0);
        const tm = accuracy.reduce((s, a) => s + (Number(a.products_matched) || 0), 0);
        if (tc > 0) ira = ((tm / tc) * 100).toFixed(1);
    }
    const iraColor = ira >= 98 ? 'text-emerald-600' : ira >= 95 ? 'text-amber-500' : ira ? 'text-rose-600' : 'text-slate-500';

    return (
        <div className="w-full py-4 px-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><i className="fas fa-clipboard-check text-indigo-600"></i>Stocktake</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Inventory accuracy counting and reconciliation</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchAll} className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer" title="Refresh"><i className="fas fa-sync-alt"></i></button>
                    {canWrite && <button onClick={() => setShowDue(true)} className="rounded-md border border-amber-500 text-amber-500 px-3 py-2 text-sm cursor-pointer hover:bg-amber-500/10 relative">
                        <i className="fas fa-exclamation-triangle mr-2"></i>Due Items
                        {dueItems.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center">{dueItems.length}</span>}
                    </button>}
                    {canManage && <button onClick={() => setShowCreate(true)} className="rounded-md bg-indigo-600 text-white px-3 py-2 text-sm cursor-pointer hover:bg-indigo-600-dark"><i className="fas fa-plus mr-2"></i>New Count</button>}
                </div>
            </div>

            {message && (
                <div className={`mb-4 flex items-center justify-between rounded-lg border px-4 py-2 text-sm ${message.type === 'success' ? 'bg-emerald-600/10 border-emerald-600/30 text-emerald-600' : 'bg-rose-600/10 border-rose-600/30 text-rose-600'}`}>
                    <span><i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2`}></i>{message.text}</span>
                    <button onClick={() => setMessage(null)} className="cursor-pointer">&times;</button>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
                {[
                    { label: 'Active Counts', val: active, color: 'text-indigo-600' },
                    { label: 'Pending Approval', val: completed, color: 'text-cyan-600' },
                    { label: 'Approved', val: approved, color: 'text-emerald-600' },
                    { label: 'Cycle Counts', val: cycleCounts, color: 'text-purple-600' },
                    { label: 'Items Due', val: dueItems.length, color: 'text-amber-500' },
                    { label: 'Overall IRA', val: ira ? `${ira}%` : '-', color: iraColor },
                ].map((s, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-card p-3 text-center">
                        <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
                        <small className="text-slate-500 text-xs">{s.label}</small>
                    </div>
                ))}
            </div>

            {/* IRA Accuracy */}
            {accuracy.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                    {accuracy.map((a, idx) => {
                        const pct = parseFloat(a.ira_pct) || 0;
                        const color = pct >= 98 ? 'success' : pct >= 95 ? 'warning' : 'danger';
                        return (
                            <div key={idx} className="border border-slate-200 rounded-lg p-3">
                                <h6 className="text-sm font-semibold truncate mb-2">{a.warehouse_name}</h6>
                                <div className={`text-2xl font-bold mb-1 text-${color}`}>{a.ira_pct || '0.00'}%</div>
                                <div className="h-2 bg-border rounded-full overflow-hidden mb-2">
                                    <div className={`h-full rounded-full bg-${color}`} style={{ width: `${Math.min(100, pct)}%` }}></div>
                                </div>
                                <small className="text-slate-500 block"><i className="fas fa-check-circle text-emerald-600 mr-1"></i>{a.products_matched || 0} matched</small>
                                <small className="text-slate-500 block"><i className="fas fa-times-circle text-rose-600 mr-1"></i>{a.products_with_variance || 0} var</small>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-3 mb-4 flex flex-wrap gap-3 items-center">
                <div className="flex flex-1 min-w-[200px]">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-slate-200 bg-slate-50 px-3 text-slate-500"><i className="fas fa-search"></i></span>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search counts..." className="flex-1 rounded-r-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/40" />
                </div>
                <select value={filters.warehouse_id} onChange={e => setFilters(f => ({ ...f, warehouse_id: e.target.value }))} className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none min-w-[160px]">
                    <option value="">All Warehouses</option>
                    {warehouses.map(w => <option key={w.id || w.warehouse_id} value={w.id || w.warehouse_id}>{w.warehouse_name || w.name}</option>)}
                </select>
                <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none min-w-[140px]">
                    <option value="">All Statuses</option>
                    {['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'CANCELLED'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
                <select value={filters.count_type} onChange={e => setFilters(f => ({ ...f, count_type: e.target.value }))} className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none min-w-[120px]">
                    <option value="">All Types</option>
                    <option value="full">Full</option>
                    <option value="cycle">Cycle</option>
                </select>
                <button onClick={() => { setFilters({ warehouse_id: '', status: '', count_type: '' }); setSearch(''); }} className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer text-slate-700">Reset</button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {loading ? <Spinner /> : filtered.length === 0 ? (
                    <div className="text-center py-12 text-slate-500"><i className="fas fa-clipboard-list text-4xl opacity-25 block mb-3"></i><p>No inventory counts found</p></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-slate-50 border-b border-slate-200">
                                {['Count #', 'Type', 'Warehouse', 'Status', 'Progress', 'Total Variance', 'Started At', 'Actions'].map(h => (
                                    <th key={h} className="px-3 py-2 text-left font-medium text-slate-700 whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody className="divide-y divide-border">
                                {filtered.map((c, idx) => {
                                    const prog = c.total_items ? Math.round((c.counted_items / c.total_items) * 100) : 0;
                                    return (
                                        <tr key={idx} className={`${c.status === 'IN_PROGRESS' ? 'bg-amber-500/10' : 'hover:bg-slate-50'} transition-colors`}>
                                            <td className="px-3 py-2.5">
                                                <button onClick={() => fetchCountDetail(c.stocktake_id)} className="text-indigo-600 font-bold hover:underline cursor-pointer">{c.stocktake_number}</button>
                                            </td>
                                            <td className="px-3 py-2.5"><TypeBadge t={c.count_type} /></td>
                                            <td className="px-3 py-2.5">{c.warehouse_name}</td>
                                            <td className="px-3 py-2.5"><StatusBadge s={c.status} /></td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center justify-between text-[10px] mb-1"><span>{c.counted_items || 0} / {c.total_items || 0}</span></div>
                                                <div className="w-full h-1.5 bg-border rounded-full overflow-hidden"><div className="h-full bg-indigo-600" style={{ width: `${prog}%` }}></div></div>
                                            </td>
                                            <td className="px-3 py-2.5"><VarBadge v={c.total_variance_qty} /></td>
                                            <td className="px-3 py-2.5 text-xs">{c.started_at ? formatDateOnly(c.started_at) : '-'}</td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex gap-1 justify-end">
                                                    <button onClick={() => fetchCountDetail(c.stocktake_id)} title="View" className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"><i className="fas fa-eye"></i></button>
                                                    {canWrite && c.status === 'PLANNED' && <button onClick={() => handleAction('start', c.stocktake_id)} title="Start" className="w-7 h-7 flex items-center justify-center rounded bg-emerald-600 text-white cursor-pointer hover:bg-emerald-600-dark"><i className="fas fa-play text-xs"></i></button>}
                                                    {canDelete && <button onClick={() => handleAction('delete', c.stocktake_id)} title="Delete" className="w-7 h-7 flex items-center justify-center rounded border border-rose-600 text-rose-600 hover:bg-rose-600/10 cursor-pointer"><i className="fas fa-trash text-xs"></i></button>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showCreate && <CreateModal warehouses={warehouses} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); setMessage({ type: 'success', text: 'Count created successfully' }); fetchAll(); }} />}
            {selectedCount && <DetailModal count={selectedCount} canWrite={canWrite} canApprove={canApprove} canManage={canManage} onClose={() => setSelectedCount(null)} onAction={handleAction} onCountItem={setCountItem} onDeleteItem={handleDeleteItem} onRefresh={() => fetchCountDetail(selectedCount.stocktake_id)} />}
            {countItem && <CountModal item={countItem} onClose={() => setCountItem(null)} onSaved={() => { setCountItem(null); setMessage({ type: 'success', text: 'Count recorded' }); if (selectedCount) fetchCountDetail(selectedCount.stocktake_id); }} />}

            {/* Due Items Modal */}
            {showDue && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowDue(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h5 className="font-bold text-lg"><i className="fas fa-exclamation-triangle text-amber-500 mr-2"></i>Items Due for Counting ({dueItems.length})</h5>
                            <button onClick={() => setShowDue(false)} className="text-slate-500 cursor-pointer"><i className="fas fa-times text-lg"></i></button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-4">
                            {dueItems.length === 0 ? (
                                <div className="text-center py-10"><i className="fas fa-check-circle text-4xl text-emerald-600 mb-3 opacity-50 block"></i><p className="text-slate-500 text-sm">All items are up to date!</p></div>
                            ) : (
                                <>
                                    <div className="rounded-lg border border-cyan-600/30 bg-cyan-600/10 px-3 py-2 text-xs text-cyan-600 mb-3"><i className="fas fa-info-circle mr-2"></i>These items have exceeded their count frequency.</div>
                                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                        <table className="w-full text-sm">
                                            <thead><tr className="bg-slate-50 border-b border-slate-200">
                                                <th className="px-3 py-2 text-left text-[11px] font-medium text-slate-700 uppercase">Product</th>
                                                <th className="px-3 py-2 text-left text-[11px] font-medium text-slate-700 uppercase">Warehouse</th>
                                                <th className="px-3 py-2 text-center text-[11px] font-medium text-slate-700 uppercase">Qty</th>
                                                <th className="px-3 py-2 text-right text-[11px] font-medium text-slate-700 uppercase">Overdue</th>
                                            </tr></thead>
                                            <tbody className="divide-y divide-border">
                                                {dueItems.slice(0, 25).map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-3 py-2"><strong className="block">{item.device_name || item.part_name || '-'}</strong><small className="text-slate-500">{item.device_maker || ''}</small></td>
                                                        <td className="px-3 py-2">{item.warehouse_name}</td>
                                                        <td className="px-3 py-2 text-center">{item.quantity}</td>
                                                        <td className="px-3 py-2 text-right"><span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold text-rose-600 bg-rose-600/10">{Math.max(0, item.days_since_count - item.count_frequency_days)} days</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {dueItems.length > 25 && <p className="text-center text-xs text-slate-500 mt-2">...and {dueItems.length - 25} more items</p>}
                                    <div className="mt-4 text-center">
                                        <button onClick={() => { setShowDue(false); setShowCreate(true); }} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded cursor-pointer font-medium hover:bg-indigo-600-dark">
                                            <i className="fas fa-sync-alt mr-2"></i>Create Cycle Count for Due Items
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
