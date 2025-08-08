import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils/formatters.js';

// NOTE: Disposal API is mocked on backend — kept as-is per original design
const disposalAPI = {
    getPending: () => Promise.resolve({ data: { success: true, data: [] } }),
    getHistory: () => Promise.resolve({ data: { success: true, data: [] } }),
    moveToDisposal: (_payload) => Promise.resolve({ data: { success: true } }),
    completeDisposal: (_payload) => Promise.resolve({ data: { success: true } }),
};

const getBadgeCls = (status) =>
    ({ pending: 'bg-warning text-warning-text', approved: 'bg-info text-white', disposed: 'bg-danger text-white' }[status] || 'bg-secondary text-white');

function MoveModal({ onClose, onMoved }) {
    const [type, setType] = useState('device');
    const [id, setId] = useState('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true); setError(null);
        try {
            const res = await disposalAPI.moveToDisposal({ item_type: type, item_id: parseInt(id, 10), reason, notes });
            if (res.data?.success) onMoved({ item_type: type, item_id: parseInt(id, 10), reason, notes });
            else setError(res.data?.error || 'Failed');
        } catch { setError('Failed to move item'); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={onClose}></div>
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md z-10 p-6">
                <h5 className="font-bold text-lg mb-4"><i className="fas fa-trash-alt mr-2 text-warning"></i>Move to Disposal</h5>
                {error && <div className="mb-3 text-danger text-sm bg-danger/10 border border-danger/30 rounded px-3 py-2">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium mb-1">Item Type</label>
                        <select value={type} onChange={e => setType(e.target.value)} className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                            <option value="device">Device</option>
                            <option value="spare_part">Spare Part</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1">Item ID *</label>
                        <input type="number" value={id} onChange={e => setId(e.target.value)} required className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1">Reason *</label>
                        <input type="text" value={reason} onChange={e => setReason(e.target.value)} required className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1">Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="2" className="w-full border border-border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"></textarea>
                    </div>
                    <div className="flex gap-3 justify-end pt-2">
                        <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface-light cursor-pointer">Cancel</button>
                        <button type="submit" disabled={submitting} className="rounded-md bg-warning text-warning-text px-4 py-2 text-sm cursor-pointer disabled:opacity-60">
                            {submitting ? 'Moving...' : 'Move to Disposal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function DisposeModal({ item, onClose, onDisposed }) {
    const [method, setMethod] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true); setError(null);
        try {
            const res = await disposalAPI.completeDisposal({ disposal_id: item.id, disposal_method: method, notes });
            if (res.data?.success) onDisposed({ ...item, disposal_method: method });
            else setError(res.data?.error || 'Failed');
        } catch { setError('Failed to dispose item'); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={onClose}></div>
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md z-10 p-6">
                <h5 className="font-bold text-lg mb-2 text-danger"><i className="fas fa-exclamation-triangle mr-2"></i>Permanently Dispose</h5>
                <div className="mb-4 text-sm bg-surface-light rounded px-3 py-2">
                    <strong>Item:</strong> {item.item_name || `#${item.item_id}`}<br />
                    <strong>Reason:</strong> {item.reason}
                </div>
                {error && <div className="mb-3 text-danger text-sm bg-danger/10 border border-danger/30 rounded px-3 py-2">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium mb-1">Disposal Method *</label>
                        <select value={method} onChange={e => setMethod(e.target.value)} required className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                            <option value="">Select method...</option>
                            <option value="scrap">Scrap</option>
                            <option value="sell">Sell for Parts</option>
                            <option value="donate">Donate</option>
                            <option value="recycle">Recycle</option>
                            <option value="destroy">Destroy</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1">Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="2" className="w-full border border-border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"></textarea>
                    </div>
                    <div className="flex gap-3 justify-end pt-2">
                        <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface-light cursor-pointer">Cancel</button>
                        <button type="submit" disabled={submitting} className="rounded-md bg-danger text-white px-4 py-2 text-sm cursor-pointer disabled:opacity-60">
                            {submitting ? 'Disposing...' : 'Permanently Dispose'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function Disposal() {
    const [pending, setPending] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [showMove, setShowMove] = useState(false);
    const [disposeItem, setDisposeItem] = useState(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [p, h] = await Promise.all([disposalAPI.getPending(), disposalAPI.getHistory()]);
                setPending(p.data?.data || []);
                setHistory(h.data?.data || []);
            } catch { setAlert({ type: 'error', text: 'Failed to load disposal data' }); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const showAlert = (type, text) => {
        setAlert({ type, text });
        if (type === 'success') setTimeout(() => setAlert(null), 3000);
    };

    const handleMoved = (item) => {
        setShowMove(false);
        setPending(p => [...p, { ...item, id: Date.now(), status: 'pending', created_at: new Date().toISOString() }]);
        showAlert('success', 'Item moved to disposal zone!');
    };

    const handleDisposed = (item) => {
        setDisposeItem(null);
        setPending(p => p.filter(x => x.id !== item.id));
        setHistory(h => [{ ...item, disposed_at: new Date().toISOString() }, ...h]);
        showAlert('success', 'Item permanently disposed!');
    };

    return (
        <div className="w-full py-4 px-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-xl font-bold text-text-primary flex items-center gap-2"><i className="fas fa-trash-alt text-danger"></i>Disposal Management</h1>
                    <p className="text-sm text-text-muted mt-0.5">Manage items flagged for disposal</p>
                </div>
                <button onClick={() => setShowMove(true)} className="rounded-md bg-warning text-warning-text px-4 py-2 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity">
                    <i className="fas fa-plus mr-2"></i>Move to Disposal
                </button>
            </div>

            {alert && (
                <div className={`mb-4 flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${alert.type === 'success' ? 'bg-success/10 border-success/30 text-success' : 'bg-danger/10 border-danger/30 text-danger'}`}>
                    <span><i className={`fas ${alert.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2`}></i>{alert.text}</span>
                    <button onClick={() => setAlert(null)} className="cursor-pointer font-bold text-lg ml-4">&times;</button>
                </div>
            )}

            {/* Pending */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-4">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <h6 className="font-semibold text-sm"><i className="fas fa-clock text-warning mr-2"></i>Pending Disposal</h6>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning text-warning-text">{pending.length}</span>
                </div>
                {loading ? (
                    <div className="py-10 text-center text-text-muted"><i className="fas fa-spinner fa-spin text-2xl"></i></div>
                ) : pending.length === 0 ? (
                    <div className="text-center py-10 text-text-muted"><i className="fas fa-check-circle text-4xl opacity-25 mb-3 block text-success"></i><p>No items pending disposal</p></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-surface-light"><tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Type</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Item</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Reason</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Moved By</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Date</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Status</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Actions</th>
                            </tr></thead>
                            <tbody className="divide-y divide-border">
                                {pending.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-surface-body transition-colors">
                                        <td className="px-3 py-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white ${item.item_type === 'device' ? 'bg-primary' : 'bg-info'}`}>
                                                <i className={`fas fa-${item.item_type === 'device' ? 'mobile-alt' : 'cogs'} mr-1`}></i>
                                                {item.item_type === 'device' ? 'Device' : 'Spare Part'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2"><strong>{item.item_name || `#${item.item_id}`}</strong>{item.imei && <small className="text-text-muted block">IMEI: {item.imei}</small>}</td>
                                        <td className="px-3 py-2">{item.reason}</td>
                                        <td className="px-3 py-2">{item.moved_by_name || 'Unknown'}</td>
                                        <td className="px-3 py-2">{formatDate(item.created_at || new Date().toISOString())}</td>
                                        <td className="px-3 py-2"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getBadgeCls(item.status || 'pending')}`}>{item.status || 'pending'}</span></td>
                                        <td className="px-3 py-2">
                                            <button onClick={() => setDisposeItem(item)} className="rounded-md bg-danger px-3 py-1 text-xs text-white hover:bg-danger-dark transition-colors cursor-pointer">
                                                <i className="fas fa-trash mr-1"></i>Dispose
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* History */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                    <h6 className="font-semibold text-sm"><i className="fas fa-history text-secondary mr-2"></i>Disposal History</h6>
                </div>
                {history.length === 0 ? (
                    <div className="text-center py-10 text-text-muted"><i className="fas fa-inbox fa-3x opacity-25 mb-3 block"></i><p>No disposal history yet</p></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-surface-light"><tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Item</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Reason</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Method</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Disposed By</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Date</th>
                            </tr></thead>
                            <tbody className="divide-y divide-border">
                                {history.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-surface-body transition-colors">
                                        <td className="px-3 py-2">{item.item_name || `#${item.item_id}`}{item.imei && <small className="text-text-muted block">{item.imei}</small>}</td>
                                        <td className="px-3 py-2">{item.reason}</td>
                                        <td className="px-3 py-2">{item.disposal_method || 'N/A'}</td>
                                        <td className="px-3 py-2">{item.disposed_by_name || 'Unknown'}</td>
                                        <td className="px-3 py-2">{formatDate(item.disposed_at || new Date().toISOString())}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showMove && <MoveModal onClose={() => setShowMove(false)} onMoved={handleMoved} />}
            {disposeItem && <DisposeModal item={disposeItem} onClose={() => setDisposeItem(null)} onDisposed={handleDisposed} />}
        </div>
    );
}
