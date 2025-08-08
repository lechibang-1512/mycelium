import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { useToast } from '../contexts/ToastContext.jsx';

const Spinner = () => (
    <svg className="animate-spin h-4 w-4 inline mr-2" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export default function InventoryReceive() {
    const toast = useToast();
    const [invoices, setInvoices] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [hierarchicalBins, setHierarchicalBins] = useState({});
    const [manifest, setManifest] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);

    const [selInvoice, setSelInvoice] = useState('');
    const [selWarehouse, setSelWarehouse] = useState('');
    const [selColumn, setSelColumn] = useState('');
    const [selRow, setSelRow] = useState('');
    const [selBin, setSelBin] = useState('');
    const [quantity, setQuantity] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        const init = async () => {
            const [invRes, whRes] = await Promise.all([
                api.get('/receiving/invoices').catch(() => null),
                api.get('/warehouses').catch(() => null)
            ]);
            if (invRes) {
                const data = Array.isArray(invRes.data) ? invRes.data : (Array.isArray(invRes) ? invRes : []);
                setInvoices(data);
            }
            if (whRes) {
                const whs = whRes.warehouses || whRes.data?.warehouses || [];
                setWarehouses(whs);
                if (whs.length === 1) {
                    setSelWarehouse(String(whs[0].warehouse_id));
                    loadBins(whs[0].warehouse_id);
                }
            }
        };
        init();
    }, []);

    const loadManifest = async (uuid) => {
        if (!uuid) { setManifest(null); setSelectedItem(null); return; }
        try {
            const res = await api.get(`/receiving/invoices/${uuid}/manifest`);
            setManifest(res);
        } catch (_e) {
            setError('Failed to load invoice manifest');
        }
    };

    const loadBins = async (warehouseId) => {
        if (!warehouseId) { setHierarchicalBins({}); setSelColumn(''); setSelRow(''); setSelBin(''); return; }
        try {
            const res = await api.get(`/warehouses/${warehouseId}/columns`);
            setHierarchicalBins(res.columns || {});
        } catch (e) { console.error(e); }
    };

    const handleInvoiceChange = (e) => {
        setSelInvoice(e.target.value);
        setSelectedItem(null);
        setQuantity('');
        loadManifest(e.target.value);
    };

    const handleWarehouseChange = (e) => {
        setSelWarehouse(e.target.value);
        setSelColumn(''); setSelRow(''); setSelBin('');
        setHierarchicalBins({});
        loadBins(e.target.value);
    };

    const handleColumnChange = (e) => {
        setSelColumn(e.target.value);
        setSelRow(''); setSelBin('');
    };

    const handleRowChange = (e) => {
        setSelRow(e.target.value);
        setSelBin('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null); setSuccess(null);
        if (!selInvoice) { setError('Please select an invoice.'); return; }
        if (!selWarehouse) { setError('Please select a warehouse.'); return; }
        if (!selBin) { setError('Please select a bin.'); return; }
        if (!selectedItem) { setError('Please select an item from the manifest.'); return; }

        setSubmitting(true);
        try {
            const body = {
                warehouseId: selWarehouse,
                binId: selBin,
                notes: `Received from invoice ${manifest?.invoice?.invoice_number || selInvoice}`,
                items: [{
                    itemId: selectedItem.item_id,
                    productUuid: selectedItem.product_uuid || selectedItem.resolved_product_id || selectedItem.product_id,
                    quantityReceived: parseInt(quantity, 10),
                    unitCost: selectedItem.unit_price,
                    notes: `Received via invoice ${selInvoice}`
                }]
            };
            await api.post(`/receiving/invoices/${selInvoice}/receive`, body);
            setSuccess('Stock received successfully!');
            toast.success('Stock received successfully!');
            setSelectedItem(null);
            setQuantity('');
            await loadManifest(selInvoice);
        } catch (err) {
            const msg = err.message || 'Failed to receive stock';
            setError(msg);
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const inv = manifest?.invoice;
    const items = manifest?.items || [];
    const columns = Object.keys(hierarchicalBins).sort((a, b) => Number(a) - Number(b));
    const rows = selColumn && hierarchicalBins[selColumn] ? Object.keys(hierarchicalBins[selColumn].rows || {}).sort((a, b) => Number(a) - Number(b)) : [];
    const bins = selColumn && selRow && hierarchicalBins[selColumn]?.rows?.[selRow] ? (hierarchicalBins[selColumn].rows[selRow].bins || []) : [];

    return (
        <div className="w-full py-4 px-4 max-w-7xl">
            <div className="mb-4">
                <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
                    <i className="fas fa-arrow-down text-success"></i>Receive Stock
                </h1>
                <p className="text-sm text-text-muted mt-0.5">Receive items from supplier invoices into warehouse bins</p>
            </div>

            {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-danger text-sm flex items-center justify-between" role="alert">
                <span><i className="fas fa-exclamation-triangle mr-2"></i>{error}</span>
                <button onClick={() => setError(null)} className="cursor-pointer"><i className="fas fa-times"></i></button>
            </div>}
            {success && <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-success text-sm flex items-center justify-between">
                <span><i className="fas fa-check-circle mr-2"></i>{success}</span>
                <button onClick={() => setSuccess(null)} className="cursor-pointer"><i className="fas fa-times"></i></button>
            </div>}

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left: Invoice + Manifest */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Invoice select */}
                        <div className="bg-white rounded-lg shadow-sm p-4">
                            <h6 className="font-semibold text-sm mb-3"><i className="fas fa-file-invoice text-primary mr-2"></i>Select Invoice</h6>
                            <select value={selInvoice} onChange={handleInvoiceChange} className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                                <option value="">Choose an invoice to receive...</option>
                                {invoices.map(inv => {
                                    const amt = inv.total_amount ? ` | ${parseFloat(inv.total_amount).toLocaleString('vi-VN')} ${inv.currency || 'VND'}` : '';
                                    const status = inv.receiving_status ? ` (${inv.receiving_status})` : '';
                                    return <option key={inv.uuid} value={inv.uuid}>{inv.invoice_number} - {inv.supplier_name}{status}{amt}</option>;
                                })}
                            </select>
                        </div>

                        {/* Invoice summary */}
                        {inv && (
                            <div className="bg-white rounded-lg shadow-sm p-4">
                                <h6 className="font-semibold text-sm mb-3"><i className="fas fa-info-circle text-info mr-2"></i>Invoice Summary</h6>
                                <div className="grid grid-cols-2 gap-3 text-center">
                                    {[
                                        { label: 'Invoice #', value: inv.invoice_number, color: 'text-primary' },
                                        { label: 'Supplier', value: inv.supplier_name, color: 'text-info' },
                                        { label: 'Items', value: items.length, color: 'text-warning' },
                                        { label: inv.currency || 'VND', value: new Intl.NumberFormat('vi-VN').format(inv.total_amount || 0), color: 'text-success' },
                                    ].map((s, i) => (
                                        <div key={i}>
                                            <div className={`${s.color} text-lg font-bold`}>{s.value}</div>
                                            <small className="text-text-muted">{s.label}</small>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Manifest items */}
                        {items.length > 0 && (
                            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                                <div className="px-4 py-3 border-b border-border flex justify-between items-center">
                                    <h6 className="font-semibold text-sm"><i className="fas fa-list mr-2 text-primary"></i>Manifest Items</h6>
                                    <span className="text-xs text-text-muted">{items.filter(i => i.is_product_resolved).length}/{items.length} resolved</span>
                                </div>
                                <div className="divide-y divide-border max-h-64 overflow-y-auto">
                                    {items.map((item, idx) => (
                                        <button key={idx} type="button"
                                            onClick={() => { setSelectedItem(item); setQuantity(String(item.quantity_remaining ?? item.quantity ?? '')); }}
                                            className={`w-full text-left px-4 py-2 hover:bg-surface-light transition-colors cursor-pointer ${selectedItem?.item_id === item.item_id ? 'bg-primary/5 font-bold text-primary' : ''} ${item.receiving_complete ? 'text-text-muted' : ''}`}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <span className="text-sm">{item.product_name || item.invoice_product_name || item.description}</span>
                                                    {item.receiving_complete && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-white ml-1">Received</span>}
                                                    <div className="text-text-muted text-xs mt-0.5">
                                                        Remaining: <strong>{item.quantity_remaining}/{item.quantity}</strong>
                                                        <span className="ml-2">Price: <strong>{new Intl.NumberFormat().format(item.unit_price || item.unit_cost || 0)}</strong></span>
                                                    </div>
                                                </div>
                                                {item.requires_serial_tracking && <i className="fas fa-barcode text-text-muted ml-2" title="Requires serial tracking"></i>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Location + Receive */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Selected item indicator */}
                        {selectedItem && (
                            <div className="bg-success/5 border border-success/30 rounded-lg px-4 py-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-2"><i className="fas fa-check-circle text-success"></i><strong className="text-sm">Product Selected</strong></div>
                                        <div className="mt-1"><span className="font-bold text-sm">{selectedItem.product_name || selectedItem.invoice_product_name || ''}</span></div>
                                        <small className="text-text-muted text-xs">Type: {selectedItem.product_type || 'Device'}</small>
                                    </div>
                                    <button type="button" onClick={() => { setSelectedItem(null); setQuantity(''); }} className="rounded border border-border px-3 py-1 text-xs text-text-secondary hover:bg-surface-light cursor-pointer">
                                        <i className="fas fa-times mr-1"></i>Clear
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Warehouse */}
                        {manifest && (
                            <div className="bg-white rounded-lg shadow-sm p-4">
                                <h6 className="font-semibold text-sm mb-3"><i className="fas fa-warehouse text-success mr-2"></i>Select Destination</h6>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-text-muted mb-1">Warehouse</label>
                                        <select value={selWarehouse} onChange={handleWarehouseChange} className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                                            <option value="">Select Warehouse...</option>
                                            {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}{w.location ? ` (${w.location})` : ''}</option>)}
                                        </select>
                                    </div>

                                    {columns.length > 0 && (
                                        <div>
                                            <label className="block text-xs font-medium text-text-muted mb-1">Column</label>
                                            <select value={selColumn} onChange={handleColumnChange} className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                                                <option value="">Select Column...</option>
                                                {columns.map(c => <option key={c} value={c}>Column {c}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {rows.length > 0 && (
                                        <div>
                                            <label className="block text-xs font-medium text-text-muted mb-1">Row</label>
                                            <select value={selRow} onChange={handleRowChange} className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                                                <option value="">Select Row...</option>
                                                {rows.map(r => <option key={r} value={r}>Row {r}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {bins.length > 0 && (
                                        <div>
                                            <label className="block text-xs font-medium text-text-muted mb-1">Bin</label>
                                            <select value={selBin} onChange={e => setSelBin(e.target.value)} className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                                                <option value="">Select Bin...</option>
                                                {bins.map(b => <option key={b.bin_id} value={b.bin_id}>{b.bin_code} (Position B{b.bin_position})</option>)}
                                            </select>
                                            {selColumn && selRow && <p className="text-xs text-text-muted mt-1"><i className="fas fa-map-marker-alt mr-1"></i>Location: C{selColumn}-R{selRow}</p>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Quantity + Submit */}
                        {manifest && (
                            <div className="bg-white rounded-lg shadow-sm p-4">
                                <h6 className="font-semibold text-sm mb-3"><i className="fas fa-hashtag text-warning mr-2"></i>Quantity</h6>
                                <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" placeholder="Enter quantity to receive"
                                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 mb-4" />
                                <button type="submit" disabled={submitting} className="w-full rounded-lg bg-success px-4 py-3 text-sm font-semibold text-white hover:bg-success-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
                                    {submitting ? <><Spinner />Processing...</> : <><i className="fas fa-check mr-2"></i>Receive Stock</>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}
