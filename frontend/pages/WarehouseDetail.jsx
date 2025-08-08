import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { formatNumber } from '../utils/formatters.js';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { Modal, ModalFooter } from '../components/ui/Modal.jsx';
import { 
    MapPin, User, Plus, ArrowLeft, Pencil, 
    ArrowRightLeft, BarChart3, LayoutGrid, GripHorizontal, 
    Eye, Trash2, CheckCircle2, AlertTriangle, Smartphone, 
    Boxes, Wrench, Inbox
} from 'lucide-react';

const IC = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors bg-white shadow-sm';

// ─── Edit Warehouse Modal ─────────────────────────────────────────────────────

function EditWarehouseModal({ warehouse, warehouseId, onClose, onSaved }) {
    let ci = warehouse.contact_info;
    if (typeof ci === 'string') { try { ci = JSON.parse(ci); } catch { ci = {}; } }

    const [name, setName] = useState(warehouse.name || '');
    const [loc, setLoc] = useState(warehouse.location || '');
    const [desc, setDesc] = useState(warehouse.description || '');
    const [mgr, setMgr] = useState(ci?.manager_name || '');
    const [active, setActive] = useState(warehouse.is_active !== false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault(); setSaving(true); setError(null);
        try {
            await api.put(`/warehouses/${warehouseId}`, {
                name, location: loc, description: desc,
                contactInfo: { manager_name: mgr }, isActive: active
            });
            onSaved('Warehouse updated successfully');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update warehouse');
        } finally { setSaving(false); }
    };

    return (
        <Modal isOpen={true} title="Edit Warehouse" onClose={onClose}>
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                    {error && <div className="text-rose-700 text-sm bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>{error}</div>}
                    <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Name *</label><input value={name} onChange={e => setName(e.target.value)} required className={IC} /></div>
                    <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Location</label><input value={loc} onChange={e => setLoc(e.target.value)} className={IC} /></div>
                    <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows="2" className={IC}></textarea></div>
                    <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Manager Name</label><input value={mgr} onChange={e => setMgr(e.target.value)} className={IC} /></div>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer text-sm font-medium text-slate-700 select-none">
                        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4" />
                        Active Warehouse
                    </label>
                </div>
                <ModalFooter>
                    <button type="button" onClick={onClose} className="rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
                    <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </ModalFooter>
            </form>
        </Modal>
    );
}

// ─── Bin Form Modal ───────────────────────────────────────────────────────────

function BinFormModal({ bin, warehouseId, onClose, onSaved }) {
    const [col, setCol] = useState(bin?.column_position || '');
    const [row, setRow] = useState(bin?.row_position || '');
    const [binPos, setBinPos] = useState(bin?.bin_position || '');
    const [code, setCode] = useState(bin?.bin_code || '');
    const [ptype, setPtype] = useState(bin?.product_type || 'smartphone');
    const [maxCap, setMaxCap] = useState(bin?.max_capacity || '');
    const [active, setActive] = useState(bin ? bin.is_active !== false : true);
    const [notes, setNotes] = useState(bin?.notes || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const updateCode = (c, r, b) => {
        if (!bin && c && r && b) {
            setCode(prev => !prev || prev.startsWith('C') ? `C${c}-R${r}-B${b}` : prev);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setSaving(true); setError(null);
        const finalCode = code || `C${col}-R${row}-B${binPos}`;
        const payload = {
            bin_code: finalCode, column_position: col, row_position: row, bin_position: binPos,
            product_type: ptype, max_capacity: maxCap ? parseInt(maxCap, 10) : null,
            is_active: active, notes: notes.trim() || null
        };
        if (!bin) payload.warehouse_id = warehouseId;
        try {
            if (bin) await api.put(`/bins/${bin.bin_id}`, payload);
            else await api.post('/bins', payload);
            onSaved(bin ? 'Bin updated' : 'Bin created');
        } catch (err) {
            setError(err.response?.data?.error || `Failed to ${bin ? 'update' : 'save'} bin`);
        } finally { setSaving(false); }
    };

    return (
        <Modal isOpen={true} title={bin ? 'Edit Bin' : 'Add New Bin'} onClose={onClose} wide>
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-6">
                    {error && <div className="text-rose-700 text-sm bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>{error}</div>}
                    
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <h6 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-indigo-600"/> Position Setup</h6>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Column *</label><input value={col} onChange={e => { setCol(e.target.value); updateCode(e.target.value, row, binPos); }} required className={IC} /></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Row *</label><input value={row} onChange={e => { setRow(e.target.value); updateCode(col, e.target.value, binPos); }} required className={IC} /></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Bin *</label><input value={binPos} onChange={e => { setBinPos(e.target.value); updateCode(col, row, e.target.value); }} required className={IC} /></div>
                        </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <h6 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><Boxes className="w-4 h-4 text-indigo-600"/> Bin Details</h6>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Bin Code *</label>
                                <input value={code} onChange={e => setCode(e.target.value)} required className={IC} />
                                <div className="text-[10px] text-slate-400 mt-1 font-medium">Auto-generates if empty</div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Product Type *</label>
                                <select value={ptype} onChange={e => setPtype(e.target.value)} className={IC}>
                                    <option value="smartphone">Smartphones</option>
                                    <option value="spare_part">Spare Parts</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Max Capacity</label>
                                <input type="number" value={maxCap} onChange={e => setMaxCap(e.target.value)} min="1" className={IC} />
                            </div>
                            <div className="flex flex-col justify-end pb-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none">
                                    <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4" />
                                    Active Bin
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="2" className={IC}></textarea>
                        </div>
                    </div>
                </div>
                <ModalFooter>
                    <button type="button" onClick={onClose} className="rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
                    <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50">
                        {saving ? 'Saving...' : `${bin ? 'Update' : 'Create'} Bin`}
                    </button>
                </ModalFooter>
            </form>
        </Modal>
    );
}

// ─── Bin Contents Modal ───────────────────────────────────────────────────────

function BinContentsModal({ bin, onClose }) {
    const [contents, setContents] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.get(`/bins/${bin.bin_id}/contents`)
            .then(r => setContents(r?.data?.contents || {}))
            .catch(() => setError('Failed to load bin contents'))
            .finally(() => setLoading(false));
    }, [bin.bin_id]);

    const sum = contents?.summary || {};
    const serialized = contents?.serialized_items || [];
    const aggregate = contents?.aggregate_items || [];

    return (
        <Modal 
            isOpen={true} 
            title={
                <div className="flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-indigo-600"/> 
                    Bin: {bin.bin_code}
                </div>
            } 
            onClose={onClose} 
            wide
        >
            <div className="p-6">
                {loading ? (
                    <Spinner fullPage />
                ) : error ? (
                    <div className="text-center py-8 text-rose-600 font-medium">{error}</div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                            {[
                                { l: 'Total Items', v: sum.total_items || 0, c: 'text-indigo-600', b: 'bg-indigo-50 border-indigo-100' },
                                { l: 'Serialized', v: sum.serialized_count || 0, c: 'text-emerald-600', b: 'bg-emerald-50 border-emerald-100' }, 
                                { l: 'Products', v: sum.unique_products || 0, c: 'text-amber-600', b: 'bg-amber-50 border-amber-100' },
                                { l: 'Spare Parts', v: sum.unique_spare_parts || 0, c: 'text-fuchsia-600', b: 'bg-fuchsia-50 border-fuchsia-100' }
                            ].map((x, i) => (
                                <div key={i} className={`rounded-xl border p-3 text-center ${x.b}`}>
                                    <div className={`text-2xl font-bold ${x.c}`}>{x.v}</div>
                                    <small className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] mt-1 block">{x.l}</small>
                                </div>
                            ))}
                        </div>

                        {serialized.length > 0 && (
                            <div className="mb-6">
                                <h6 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><Smartphone className="w-4 h-4 text-emerald-600"/> Serialized Devices ({serialized.length})</h6>
                                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold text-slate-600">Product</th>
                                                <th className="px-4 py-3 font-semibold text-slate-600">IMEI 1</th>
                                                <th className="px-4 py-3 font-semibold text-slate-600 text-center">Status</th>
                                                <th className="px-4 py-3 font-semibold text-slate-600 text-center">Condition</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {serialized.map((d, i) => (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-semibold text-slate-900">{d.brand || ''} {d.model || d.product_name || ''}</td>
                                                    <td className="px-4 py-3 font-mono text-indigo-600 font-medium">{d.imei_1 || '-'}</td>
                                                    <td className="px-4 py-3 text-center"><Badge variant="primary">{d.status?.replace('_', ' ')}</Badge></td>
                                                    <td className="px-4 py-3 text-center"><Badge variant={d.condition_grade === 'A' ? 'success' : 'secondary'}>{d.condition_grade || 'Unknown'}</Badge></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {aggregate.length > 0 && (
                            <div className="mb-6">
                                <h6 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><Wrench className="w-4 h-4 text-amber-600"/> Aggregate Inventory</h6>
                                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold text-slate-600">Item</th>
                                                <th className="px-4 py-3 font-semibold text-slate-600 text-center">Type</th>
                                                <th className="px-4 py-3 font-semibold text-slate-600 text-right">Quantity</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {aggregate.map((a, i) => (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3">
                                                        <strong className="text-slate-900">{a.spare_part_name || a.product_name || ''}</strong>
                                                        {a.part_code && <small className="block text-slate-500 font-medium mt-0.5">{a.part_code}</small>}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Badge variant={a.spare_part_id ? 'warning' : 'primary'}>{a.spare_part_id ? 'Spare Part' : 'Product'}</Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <strong className="text-slate-800 text-base">{a.quantity}</strong>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {!serialized.length && !aggregate.length && (
                            <div className="text-center py-12 flex flex-col items-center">
                                <Inbox className="w-12 h-12 text-slate-300 mb-3" />
                                <h5 className="font-bold text-lg text-slate-600">Bin is Empty</h5>
                                <p className="text-slate-400 text-sm mt-1">There are no items currently stored here.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
            <ModalFooter>
                <button onClick={onClose} className="rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Close Overview</button>
            </ModalFooter>
        </Modal>
    );
}

// ─── Transfer Modal ───────────────────────────────────────────────────────────

function TransferModal({ bins, warehouseId, onClose, onTransferred }) {
    const actBins = bins.filter(b => b.is_active);
    const [fromBin, setFromBin] = useState('');
    const [toBin, setToBin] = useState('');
    const [binItems, setBinItems] = useState(null);
    const [loadingItems, setLoadingItems] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [destContent, setDestContent] = useState(null);
    const [qty, setQty] = useState('');
    const [reason, setReason] = useState('');
    const [conflict, setConflict] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const loadFromContents = async (binId) => {
        if (!binId) { setBinItems(null); return; }
        setLoadingItems(true);
        setSelectedItem(null); setBinItems(null);
        try {
            const r = await api.get(`/bins/${binId}/contents`);
            setBinItems(r?.data?.contents || {});
        } catch { setBinItems({}); }
        finally { setLoadingItems(false); }
    };

    const _loadDestContents = async (binId) => {
        if (!binId) { setDestContent(null); return; }
        try {
            const r = await api.get(`/bins/${binId}/contents`);
            setDestContent(r?.data?.contents);
        } catch { setDestContent(null); }
    };

    const checkConflict = (item, dc) => {
        if (!item || !dc) { setConflict(''); return; }
        const isSP = item.spare_part_id;
        const destHasP = dc.aggregate_items?.some(i => i.product_id && !i.spare_part_id) || dc.serialized_items?.length > 0;
        const destHasSP = dc.aggregate_items?.some(i => i.spare_part_id);
        if (isSP && destHasP) setConflict('Cannot transfer spare part to this bin: it contains products/devices.');
        else if (!isSP && destHasSP) setConflict('Cannot transfer product/device to this bin: it contains spare parts.');
        else setConflict('');
    };

    const handleSelectItem = (item) => {
        setSelectedItem(item);
        const isDevice = item.imei_1 && !item.quantity;
        setQty(isDevice ? '1' : String(item.quantity || 1));
        checkConflict(item, destContent);
    };

    const handleDestChange = async (binId) => {
        setToBin(binId);
        const dc = binId ? await api.get(`/bins/${binId}/contents`).then(r => r?.data?.contents).catch(() => null) : null;
        setDestContent(dc);
        checkConflict(selectedItem, dc);
    };

    const canSubmit = fromBin && toBin && selectedItem && parseInt(qty) > 0 && !conflict;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true); setError(null);
        try {
            const isDevice = selectedItem.imei_1 && !selectedItem.quantity;
            await api.post('/bins/transfer', {
                warehouseId, fromBinId: fromBin, toBinId: toBin,
                productId: selectedItem.product_id || null,
                sparePartId: selectedItem.spare_part_id || null,
                quantity: isDevice ? 1 : parseInt(qty, 10),
                reason: reason.trim()
            });
            onTransferred(`Transferred ${qty} unit(s) successfully`);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to perform transfer');
        } finally { setSubmitting(false); }
    };

    const aggItems = binItems?.aggregate_items || [];
    const serItems = binItems?.serialized_items || [];
    const hasItems = aggItems.length > 0 || serItems.length > 0;

    return (
        <Modal 
            isOpen={true} 
            title={
                <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-indigo-600"/> 
                    Transfer Stock
                </div>
            } 
            onClose={onClose} 
            wide
        >
            <div className="p-6 space-y-5">
                {error && <div className="text-rose-700 text-sm bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>{error}</div>}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">From Bin *</label>
                        <select value={fromBin} onChange={e => { setFromBin(e.target.value); setSelectedItem(null); setToBin(''); loadFromContents(e.target.value); }} className={IC} required>
                            <option value="">Select source...</option>
                            {actBins.map(b => <option key={b.bin_id} value={b.bin_id}>{b.bin_code}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">To Bin *</label>
                        <select value={toBin} onChange={e => handleDestChange(e.target.value)} disabled={!selectedItem} className={IC} required>
                            <option value="">Select destination...</option>
                            {actBins.filter(b => b.bin_id != fromBin).map(b => <option key={b.bin_id} value={b.bin_id}>{b.bin_code}</option>)}
                        </select>
                    </div>
                </div>

                {fromBin && (
                    <div className="rounded-xl border border-indigo-200 overflow-hidden bg-white shadow-sm">
                        <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2.5 flex items-center gap-2">
                            <Boxes className="w-4 h-4 text-indigo-500" />
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Select Item to Transfer</span>
                        </div>
                        <div className="max-h-[240px] overflow-y-auto">
                            {loadingItems ? (
                                <div className="p-6 flex justify-center"><Spinner /></div>
                            ) : !hasItems ? (
                                <div className="p-6 text-center text-sm font-medium text-slate-400">Selected bin is empty</div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {aggItems.map((item, i) => (
                                        <button key={i} type="button" onClick={() => handleSelectItem(item)}
                                            className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition-colors ${selectedItem === item ? 'bg-indigo-50/50' : 'bg-white'}`}>
                                            <div className="flex justify-between items-center">
                                                <strong className="text-slate-800">{item.spare_part_name || item.product_name || 'Unknown'}</strong>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant={item.spare_part_id ? 'warning' : 'primary'}>{item.spare_part_id ? 'Spare Part' : 'Product'}</Badge>
                                                    <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md text-xs border border-slate-200">{item.quantity} in stock</span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                    {serItems.map((item, i) => (
                                        <button key={i} type="button" onClick={() => handleSelectItem({ ...item, item_type: 'serialized' })}
                                            className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition-colors ${selectedItem === item ? 'bg-indigo-50/50' : 'bg-white'}`}>
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <strong className="text-slate-800">{item.brand || ''} {item.model || item.product_name}</strong>
                                                    <div className="mt-0.5"><code className="text-indigo-600 text-xs font-semibold bg-indigo-50 px-1 rounded">IMEI: {item.imei_1}</code></div>
                                                </div>
                                                <Badge variant="success">Device (Qty 1)</Badge>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {selectedItem && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2 font-medium shadow-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <span>Ready to transfer: <strong>{selectedItem.spare_part_name || selectedItem.product_name || selectedItem.model || 'Item'}</strong></span>
                    </div>
                )}
                
                {conflict && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex items-center gap-2 font-medium shadow-sm">
                        <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                        <span>{conflict}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
                    <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Quantity to move *</label><input type="number" value={qty} onChange={e => setQty(e.target.value)} min="1" disabled={!selectedItem} className={IC} /></div>
                    <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Reason / Reference</label><input value={reason} onChange={e => setReason(e.target.value)} className={IC} placeholder="e.g. consolidation" /></div>
                </div>
            </div>
            <ModalFooter>
                <button onClick={onClose} className="rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
                <button 
                    onClick={handleSubmit} 
                    disabled={!canSubmit || submitting} 
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                >
                    <ArrowRightLeft className="w-4 h-4" />
                    {submitting ? 'Transferring...' : 'Execute Transfer'}
                </button>
            </ModalFooter>
        </Modal>
    );
}

// ─── Bin Grid ─────────────────────────────────────────────────────────────────

function BinGrid({ bins, inventory, onEdit, onDelete, onView, onAddFirst }) {
    if (bins.length === 0) {
        return (
            <div className="text-center py-16 flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-300">
                    <Boxes className="w-8 h-8" />
                </div>
                <h5 className="font-bold text-lg text-slate-800 mb-2">No bins configured</h5>
                <p className="text-slate-500 text-sm mb-6 max-w-sm">Warehouses are divided into Bins to strictly track physical locations of stock.</p>
                <button onClick={onAddFirst} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-all shadow-sm">
                    <Plus className="w-4 h-4" /> Add First Bin
                </button>
            </div>
        );
    }

    const g = {};
    bins.forEach(b => {
        const c = b.column_position || 'Unassigned';
        const r = b.row_position || 'Unassigned';
        if (!g[c]) g[c] = {};
        if (!g[c][r]) g[c][r] = [];
        g[c][r].push(b);
    });

    return (
        <div className="space-y-8">
            {Object.keys(g).sort().map(col => (
                <div key={col} className="bg-slate-50/50 rounded-xl border border-slate-200 p-4 sm:p-5">
                    <h6 className="text-indigo-700 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                        <GripHorizontal className="w-5 h-5 opacity-70" /> 
                        Column Area: <span className="text-slate-900 border border-slate-200 bg-white px-2 py-0.5 rounded shadow-sm">{col}</span>
                    </h6>
                    {Object.keys(g[col]).sort().map(row => (
                        <div key={row} className="ml-2 sm:ml-6 mb-5 last:mb-0">
                            <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                <div className="w-4 border-t border-slate-300"></div> Row {row}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                {g[col][row].map(b => {
                                    const bInv = inventory.filter(i => i.bin_id === b.bin_id);
                                    const uCap = bInv.reduce((s, i) => s + (i.quantity || 0), 0);
                                    const pct = b.max_capacity ? (uCap / b.max_capacity) * 100 : 0;
                                    
                                    let capColor = 'bg-emerald-500';
                                    if (pct >= 90) capColor = 'bg-rose-500';
                                    else if (pct >= 75) capColor = 'bg-amber-500';

                                    return (
                                        <div key={b.bin_id} className={`bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow relative group ${!b.is_active ? 'border-dashed border-slate-300 opacity-60' : 'border-slate-200 hover:border-indigo-300'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="pr-2">
                                                    <strong className="text-sm font-bold text-slate-800 tracking-tight block truncate" title={b.bin_code}>{b.bin_code}</strong>
                                                    <span className="text-[10px] font-semibold text-slate-400 block mt-0.5 uppercase tracking-wider">Position B{b.bin_position || '-'}</span>
                                                </div>
                                                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm border border-slate-100 rounded-md overflow-hidden absolute top-2 right-2 z-10">
                                                    <button onClick={() => onView(b)} title="View Contents" className="p-1.5 text-indigo-600 hover:bg-slate-50"><Eye className="w-3.5 h-3.5"/></button>
                                                    <button onClick={() => onEdit(b)} title="Edit Bin" className="p-1.5 text-slate-600 hover:bg-slate-50 border-l border-r border-slate-100"><Pencil className="w-3.5 h-3.5"/></button>
                                                    <button onClick={() => onDelete(b)} title="Delete Bin" className="p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5"/></button>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-4">
                                                <button onClick={() => onView(b)} className="w-full text-left bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 rounded-md px-2 py-1.5 transition-colors group/btn">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-semibold text-slate-600 group-hover/btn:text-indigo-700 flex items-center gap-1.5">
                                                            <Boxes className="w-3.5 h-3.5" />
                                                            {b.items?.length || 0} unique
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">{b.current_quantity ?? uCap}</span>
                                                    </div>
                                                </button>
                                                
                                                {b.max_capacity && (
                                                    <div className="mt-2.5 group/cap relative">
                                                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                                            <span>Capacity</span>
                                                            <span className={pct >= 90 ? 'text-rose-500' : ''}>{Math.round(pct)}%</span>
                                                        </div>
                                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all duration-500 ease-out ${capColor}`} style={{ width: `${Math.min(100, pct)}%` }}></div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WarehouseDetail() {
    const { id: warehouseId } = useParams();
    const navigate = useNavigate();

    const [warehouse, setWarehouse] = useState(null);
    const [bins, setBins] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    const [editWH, setEditWH] = useState(false);
    const [binForm, setBinForm] = useState(null); 
    const [viewBin, setViewBin] = useState(null);
    const [showTransfer, setShowTransfer] = useState(false);

    const fetchData = useCallback(async () => {
        if (!warehouseId) { setError('No warehouse ID provided'); setLoading(false); return; }
        try {
            const [wRes, bRes, iRes, sRes] = await Promise.all([
                api.get(`/warehouses/${warehouseId}`),
                api.get(`/bins/warehouse/${warehouseId}`),
                api.get(`/warehouses/${warehouseId}/inventory`),
                api.get(`/warehouses/${warehouseId}/statistics`),
            ]);
            setWarehouse(wRes?.data?.warehouse || wRes?.data || {});
            setBins(bRes?.data || []);
            setInventory(iRes?.data?.inventory || []);
            const ss = sRes?.data?.statistics || {};
            setStats({ 
                totalBins: bRes?.data?.length || 0, 
                activeBins: (bRes?.data || []).filter(b => b.is_active).length, 
                totalProducts: ss.unique_products || 0, 
                totalSpareParts: ss.unique_spare_parts || 0, 
                totalItems: ss.total_items || 0 
            });
        } catch (_e) {
            setError('Failed to load warehouse data');
        } finally { setLoading(false); }
    }, [warehouseId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const showMsg = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 4000);
    };

    const handleDeleteBin = async (b) => {
        if (!window.confirm(`Delete Bin "${b.bin_code}"?\nThis will fail if it contains items.`)) return;
        try {
            await api.delete(`/bins/${b.bin_id}`);
            showMsg('Bin deleted successfully');
            fetchData();
        } catch (err) { showMsg(err.response?.data?.error || 'Failed to delete bin', 'error'); }
    };

    const handleSaved = (msg) => {
        setBinForm(null); setEditWH(false);
        showMsg(msg);
        fetchData();
    };

    const handleTransferred = (msg) => {
        setShowTransfer(false);
        showMsg(msg);
        fetchData();
    };

    let ci = warehouse?.contact_info;
    if (typeof ci === 'string') { try { ci = JSON.parse(ci); } catch { ci = {}; } }

    return (
        <div className="max-w-7xl mx-auto w-full">
            {loading && <Spinner message="Loading warehouse details..." fullPage />}

            {!loading && error && (
                <div className="text-center py-16">
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-rose-800 font-medium inline-flex items-center gap-3 shadow-sm">
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                        {error}
                    </div>
                    <div className="mt-6">
                        <button onClick={() => navigate('/warehouses')} className="text-indigo-600 font-medium hover:underline inline-flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" /> Back to Warehouses
                        </button>
                    </div>
                </div>
            )}

            {!loading && !error && warehouse && (
                <>
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pt-2">
                        <div className="flex items-start gap-4">
                            <button onClick={() => navigate('/warehouses')} className="mt-1 p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-slate-50 transition-all shadow-sm">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{warehouse.name}</h1>
                                    <Badge variant={warehouse.is_active ? 'success' : 'secondary'}>{warehouse.is_active ? 'Active' : 'Inactive'}</Badge>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                                    {warehouse.location && (
                                        <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400" /> {warehouse.location}
                                        </p>
                                    )}
                                    {ci?.manager_name && (
                                        <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                            <User className="w-3.5 h-3.5 text-slate-400" /> {ci.manager_name}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button onClick={() => setBinForm(false)} className="rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 mt-1 sm:mt-0 text-sm font-semibold hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Add Bin
                            </button>
                            <button onClick={() => setShowTransfer(true)} className="rounded-lg bg-white text-slate-700 border border-slate-200 px-4 py-2 mt-1 sm:mt-0 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center gap-2">
                                <ArrowRightLeft className="w-4 h-4 text-slate-400" /> Transfer
                            </button>
                            <button onClick={() => setEditWH(true)} className="rounded-lg bg-white text-slate-700 border border-slate-200 px-4 py-2 mt-1 sm:mt-0 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center gap-2">
                                <Pencil className="w-4 h-4 text-slate-400" /> Edit
                            </button>
                        </div>
                    </div>

                    {message && (
                        <div className={`mb-6 flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium shadow-sm transition-all ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                            <span className="flex items-center gap-2">
                                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600"/> : <AlertTriangle className="w-5 h-5 text-rose-600"/>}
                                {message.text}
                            </span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Stats sidebar */}
                        {stats && (
                            <div className="lg:col-span-1">
                                <Card>
                                    <div className="p-5">
                                        <h6 className="font-bold text-sm tracking-wide text-slate-800 mb-5 flex items-center gap-2 uppercase">
                                            <BarChart3 className="w-4 h-4 text-indigo-500" /> Insights
                                        </h6>
                                        <div className="space-y-4">
                                            {[
                                                { l: 'Total Bins', v: stats.totalBins, b: 'bg-indigo-100 text-indigo-800' },
                                                { l: 'Active Bins', v: stats.activeBins, b: 'bg-emerald-100 text-emerald-800' },
                                                { l: 'Products', v: stats.totalProducts, b: 'bg-amber-100 text-amber-800' },
                                                { l: 'Spare Parts', v: stats.totalSpareParts, b: 'bg-fuchsia-100 text-fuchsia-800' },
                                                { l: 'Total Units', v: formatNumber(stats.totalItems, 'en', 0), format: true },
                                            ].map((s, i) => (
                                                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 last:pb-0">
                                                    <span className="text-slate-600 text-sm font-medium">{s.l}</span>
                                                    {s.format ? (
                                                        <strong className="text-base text-slate-900">{s.v}</strong>
                                                    ) : (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold leading-tight ${s.b}`}>{s.v}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* Bins grid */}
                        <div className="lg:col-span-3">
                            <Card>
                                <div className="p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                                    <h6 className="font-bold text-sm tracking-wide text-slate-800 flex items-center gap-2 uppercase">
                                        <LayoutGrid className="w-4 h-4 text-indigo-500" /> Internal Layout
                                    </h6>
                                </div>
                                <div className="p-5 bg-slate-50">
                                    <BinGrid bins={bins} inventory={inventory} onEdit={b => setBinForm(b)} onDelete={handleDeleteBin} onView={b => setViewBin(b)} onAddFirst={() => setBinForm(false)} />
                                </div>
                            </Card>
                        </div>
                    </div>
                </>
            )}

            {/* Modals */}
            {editWH && warehouse && <EditWarehouseModal warehouse={warehouse} warehouseId={warehouseId} onClose={() => setEditWH(false)} onSaved={handleSaved} />}
            {binForm !== null && <BinFormModal bin={binForm || null} warehouseId={warehouseId} onClose={() => setBinForm(null)} onSaved={handleSaved} />}
            {viewBin && <BinContentsModal bin={viewBin} onClose={() => setViewBin(null)} />}
            {showTransfer && <TransferModal bins={bins} warehouseId={warehouseId} onClose={() => setShowTransfer(false)} onTransferred={handleTransferred} />}
        </div>
    );
}
