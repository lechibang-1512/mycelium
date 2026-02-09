import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const Spinner = () => (
    <div className="text-center py-10">
        <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

function AdjustModal({ item, onClose, onSaved }) {
    const [quantity, setQuantity] = useState(item?.quantity ?? 0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await api.post('/pc-inventory/update', {
                type: item.component_type,
                id: item.component_id,
                quantity: parseInt(quantity, 10),
                warehouse_id: item.warehouse_id
            });
            onSaved();
        } catch (err) {
            setError(err.message || 'Failed to update stock');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
            <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md z-10">
                <h5 className="font-bold text-lg mb-4">Adjust Stock</h5>
                {error && <div className="mb-3 rounded bg-rose-600/10 border border-rose-600/30 px-3 py-2 text-rose-600 text-sm">{error}</div>}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                    <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/40" />
                </div>
                <div className="flex gap-3 justify-end">
                    <button onClick={onClose} className="rounded-md border border-slate-200 px-4 py-2 text-sm cursor-pointer hover:bg-slate-50">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm cursor-pointer disabled:opacity-60 hover:bg-indigo-600-dark">
                        {saving ? <><i className="fas fa-spinner fa-spin mr-1"></i>Saving...</> : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function PCInventory() {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editItem, setEditItem] = useState(null);
    const { hasPermission } = useAuth();
    const canWrite = hasPermission('inventory:write') || hasPermission('inventory:manage');

    const fetchInventory = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/pc-inventory');
            setInventory(res?.data || []);
        } catch (_e) {
            setError('Failed to load PC inventory');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInventory(); }, []);

    return (
        <div className="w-full py-4 px-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <i className="fas fa-desktop text-indigo-600"></i>PC Component Inventory
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Stock levels for PC components by warehouse</p>
                </div>
            </div>

            {error && <div className="mb-4 rounded-lg border border-rose-600/30 bg-rose-600/10 px-4 py-3 text-rose-600 text-sm">{error}</div>}

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {loading ? <Spinner /> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-3 px-4 font-medium text-slate-700">Type</th>
                                    <th className="text-left py-3 px-4 font-medium text-slate-700">Component ID</th>
                                    <th className="text-left py-3 px-4 font-medium text-slate-700">Quantity</th>
                                    <th className="text-left py-3 px-4 font-medium text-slate-700">Warehouse</th>
                                    <th className="text-left py-3 px-4 font-medium text-slate-700">Location</th>
                                    {canWrite && <th className="text-left py-3 px-4 font-medium text-slate-700">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {inventory.length === 0 ? (
                                    <tr><td colSpan={canWrite ? 6 : 5} className="text-center py-8 text-slate-500">No inventory records found.</td></tr>
                                ) : inventory.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">{item.component_type}</td>
                                        <td className="px-4 py-3">{item.component_id}</td>
                                        <td className="px-4 py-3 font-bold">{item.quantity}</td>
                                        <td className="px-4 py-3">{item.warehouse_id || '-'}</td>
                                        <td className="px-4 py-3">{item.location || '-'}</td>
                                        {canWrite && (
                                            <td className="px-4 py-3">
                                                <button onClick={() => setEditItem(item)} className="rounded border border-indigo-600 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-600/10 cursor-pointer">
                                                    <i className="fas fa-edit mr-1"></i>Adjust
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {editItem && (
                <AdjustModal
                    item={editItem}
                    onClose={() => setEditItem(null)}
                    onSaved={() => { setEditItem(null); fetchInventory(); }}
                />
            )}
        </div>
    );
}
