import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const IC = 'w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary bg-white';
const Spinner = () => <div className="text-center py-10"><svg className="animate-spin h-8 w-8 text-primary mx-auto" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>;

const CATEGORIES = ['DISPLAY','BATTERY','MOTHERBOARD','CAMERA_REAR','CAMERA_FRONT','CHARGING_PORT','SPEAKER','MICROPHONE','BUTTON','CASE','ANTENNA','FLEX_CABLE','OTHER'];
const INITIAL = {
    part_name: '', part_code: '', part_category: 'DISPLAY', part_type: '', description: '', is_active: true,
    dimensions: '', weight_g: '', color_variants: '',
    compatible_product_id: '', compatible_device_category: '', compatible_brands: '', compatible_models: '',
    manufacturer: '', manufacturer_part_number: '', quality_grade: 'STANDARD', warranty_months: 3,
    unit_cost: 0, unit_price: 0, currency: 'USD',
    minimum_stock_level: 5, max_stock_level: 50, reorder_point: 10, reorder_quantity: 20, lead_time_days: '', default_supplier_id: '',
    is_hazardous: false, requires_serial_tracking: false, notes: ''
};

function getStockStatus(p) {
    const qty = p.available_quantity ?? p.total_quantity ?? 0;
    const min = p.minimum_stock_level || 0;
    const reorder = p.reorder_point || 0;
    if (qty === 0) return { col: 'bg-danger', text: 'Out of Stock', icon: 'fa-ban' };
    if (qty < min) return { col: 'bg-danger', text: 'Critical', icon: 'fa-exclamation-circle' };
    if (qty <= reorder) return { col: 'bg-warning', text: 'Low Stock', icon: 'fa-exclamation-triangle' };
    return { col: 'bg-success', text: 'In Stock', icon: 'fa-check-circle' };
}

function Section({ title, icon, defaultOpen = true, children }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-border rounded-lg mb-2">
            <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-left hover:bg-surface-body transition-colors cursor-pointer rounded-lg">
                <span><i className={`fas ${icon} mr-2 text-primary`}></i>{title}</span>
                <i className={`fas fa-chevron-${open ? 'up' : 'down'} text-text-muted text-xs`}></i>
            </button>
            {open && <div className="px-4 pb-3 mt-2">{children}</div>}
        </div>
    );
}

function SparePartModal({ part, devices, suppliers, onClose, onSaved }) {
    const isEdit = !!part;
    const [form, setForm] = useState(() => {
        if (!part) return { ...INITIAL };
        const d = { ...INITIAL, ...part, is_active: !!part.is_active, is_hazardous: !!part.is_hazardous, requires_serial_tracking: !!part.requires_serial_tracking };
        if (Array.isArray(d.color_variants)) d.color_variants = d.color_variants.join(', ');
        if (Array.isArray(d.compatible_brands)) d.compatible_brands = d.compatible_brands.join(', ');
        if (Array.isArray(d.compatible_models)) d.compatible_models = d.compatible_models.join(', ');
        return d;
    });
    const [saving, setSaving] = useState(false);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
    const onInp = e => { const { name, type, checked, value } = e.target; set(name, type === 'checkbox' ? checked : value); };

    const F = ({ label, name, type = 'text', step, list, placeholder, hint, req = false }) => (
        <div className="mb-2">
            <label className="block text-sm font-medium text-text-secondary mb-1">{label}{req && <span className="text-danger ml-1">*</span>}</label>
            <input type={type} name={name} value={form[name] ?? ''} onChange={onInp} required={req} step={step} list={list} placeholder={placeholder} className={IC} />
            {hint && <p className="text-text-muted text-xs mt-1">{hint}</p>}
        </div>
    );

    const handleSubmit = async (e) => {
        e.preventDefault(); setSaving(true);
        const payload = {
            ...form,
            color_variants: form.color_variants ? String(form.color_variants).split(',').map(s => s.trim()).filter(Boolean) : null,
            compatible_brands: form.compatible_brands ? String(form.compatible_brands).split(',').map(s => s.trim()).filter(Boolean) : null,
            compatible_models: form.compatible_models ? String(form.compatible_models).split(',').map(s => s.trim()).filter(Boolean) : null,
            weight_g: form.weight_g ? parseFloat(form.weight_g) : null,
            lead_time_days: form.lead_time_days ? parseInt(form.lead_time_days) : null,
            default_supplier_id: form.default_supplier_id || null,
            is_active: form.is_active ? 1 : 0,
            is_hazardous: form.is_hazardous ? 1 : 0,
            requires_serial_tracking: form.requires_serial_tracking ? 1 : 0,
        };
        try {
            const id = part?.spare_part_uuid || part?.uuid || part?.id;
            if (isEdit) await api.put(`/spare-parts/${id}`, payload);
            else await api.post('/spare-parts', payload);
            onSaved(isEdit ? 'Part updated' : 'Part created');
        } catch (err) { alert(err.response?.data?.message || err.response?.data?.error || 'Failed to save'); } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl z-10 flex flex-col max-h-[92vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
                    <h3 className="text-lg font-semibold"><i className={`fas ${isEdit ? 'fa-edit' : 'fa-plus-circle'} mr-2`}></i>{isEdit ? 'Edit Spare Part' : 'Create Spare Part'}</h3>
                    <button onClick={onClose} className="cursor-pointer text-xl text-text-muted">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
                    <div className="px-6 py-4">
                        <Section title="Basic Information" icon="fa-info-circle">
                            <div className="grid grid-cols-6 gap-3">
                                <div className="col-span-3"><F label="Part Name" name="part_name" req placeholder="e.g., iPhone 14 Pro Display" /></div>
                                <div className="col-span-2"><F label="Part Code" name="part_code" placeholder="Auto-generated" hint="Leave blank to auto-generate" /></div>
                                <div className="col-span-1">
                                    <div className="mb-2"><label className="block text-sm font-medium text-text-secondary mb-1">Status</label><select name="is_active" value={form.is_active ? 'true' : 'false'} onChange={e => set('is_active', e.target.value === 'true')} className={IC}><option value="true">Active</option><option value="false">Inactive</option></select></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-2">
                                <div><label className="block text-sm font-medium text-text-secondary mb-1">Category</label><select name="part_category" value={form.part_category} onChange={onInp} className={IC}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                <F label="Part Type" name="part_type" placeholder="e.g., OLED, Li-Ion" />
                            </div>
                            <div className="mb-2"><label className="block text-sm font-medium text-text-secondary mb-1">Description</label><textarea name="description" rows="2" value={form.description || ''} onChange={onInp} className={IC}></textarea></div>
                        </Section>

                        <Section title="Device Compatibility" icon="fa-mobile-alt">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium text-text-secondary mb-1">Compatible Device <span className="text-danger">*</span></label><select name="compatible_product_id" value={form.compatible_product_id || ''} onChange={onInp} required className={IC}><option value="">-- Select a device --</option>{devices.map(d => <option key={d.product_id} value={d.product_id}>{d.device_maker} {d.device_name} {(d.rom || d.ram || d.color) ? `(${[d.rom, d.ram, d.color].filter(Boolean).join(' / ')})` : ''}</option>)}</select></div>
                                <F label="Device Category" name="compatible_device_category" placeholder="e.g., Flagship, Mid-range" />
                                <F label="Compatible Brands" name="compatible_brands" placeholder="Apple, Samsung" hint="Comma-separated" />
                                <F label="Compatible Models" name="compatible_models" placeholder="iPhone 14" hint="Comma-separated" />
                            </div>
                        </Section>

                        <Section title="Physical Specifications" icon="fa-ruler-combined" defaultOpen={false}>
                            <div className="grid grid-cols-3 gap-3">
                                <F label="Dimensions" name="dimensions" placeholder="155x71mm" />
                                <F label="Weight (g)" name="weight_g" type="number" step="0.01" />
                                <F label="Color Variants" name="color_variants" placeholder="Black, White" hint="Comma-separated" />
                            </div>
                        </Section>

                        <Section title="Quality & Warranty" icon="fa-award" defaultOpen={false}>
                            <div className="grid grid-cols-3 gap-3 mb-2">
                                <F label="Manufacturer" name="manufacturer" placeholder="Select or type..." />
                                <F label="Manufacturer Part #" name="manufacturer_part_number" placeholder="OEM part" />
                                <div><label className="block text-sm font-medium text-text-secondary mb-1">Quality Grade</label><select name="quality_grade" value={form.quality_grade} onChange={onInp} className={IC}>{[['OEM','OEM'],['ORIGINAL','Original'],['PREMIUM','Premium Aftermarket'],['STANDARD','Standard'],['ECONOMY','Economy']].map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3"><div className="col-span-1"><F label="Warranty (months)" name="warranty_months" type="number" /></div></div>
                        </Section>

                        <Section title="Pricing" icon="fa-dollar-sign" defaultOpen={false}>
                            <div className="grid grid-cols-3 gap-3">
                                <F label="Unit Cost" name="unit_cost" type="number" step="0.01" hint="Your purchase price" />
                                <F label="Unit Price" name="unit_price" type="number" step="0.01" hint="Selling price" />
                                <div><label className="block text-sm font-medium text-text-secondary mb-1">Currency</label><select name="currency" value={form.currency} onChange={onInp} className={IC}><option value="USD">USD</option><option value="VND">VND</option><option value="EUR">EUR</option></select></div>
                            </div>
                        </Section>

                        <Section title="Inventory Settings" icon="fa-boxes" defaultOpen={false}>
                            <div className="grid grid-cols-3 gap-3 mb-2">
                                <F label="Min Stock Level" name="minimum_stock_level" type="number" />
                                <F label="Max Stock Level" name="max_stock_level" type="number" />
                                <F label="Reorder Point" name="reorder_point" type="number" />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <F label="Reorder Quantity" name="reorder_quantity" type="number" />
                                <F label="Lead Time (days)" name="lead_time_days" type="number" />
                                <div><label className="block text-sm font-medium text-text-secondary mb-1">Default Supplier</label><select name="default_supplier_id" value={form.default_supplier_id || ''} onChange={onInp} className={IC}><option value="">-- Select --</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                            </div>
                        </Section>

                        <Section title="Tracking & Notes" icon="fa-clipboard-list" defaultOpen={false}>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" name="is_hazardous" checked={!!form.is_hazardous} onChange={onInp} className="rounded" />Hazardous Material <span className="text-xs text-text-muted">(special handling)</span></label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" name="requires_serial_tracking" checked={!!form.requires_serial_tracking} onChange={onInp} className="rounded" />Requires Serial Tracking <span className="text-xs text-text-muted">(high-value)</span></label>
                            </div>
                            <div><label className="block text-sm font-medium text-text-secondary mb-1">Notes</label><textarea name="notes" rows="3" value={form.notes || ''} onChange={onInp} className={IC}></textarea></div>
                        </Section>
                    </div>
                    <div className="flex justify-end gap-2 px-6 py-4 border-t border-border flex-shrink-0">
                        <button type="button" onClick={onClose} className="rounded-md bg-secondary px-4 py-2 text-sm text-white cursor-pointer">Cancel</button>
                        <button type="submit" disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white cursor-pointer disabled:opacity-60">{saving ? 'Saving...' : 'Save Spare Part'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function SpecsParts() {
    const { hasAnyPermission } = useAuth();
    const canWrite = hasAnyPermission(['spare_parts:write', 'spare_parts:manage']);
    const canDelete = hasAnyPermission(['spare_parts:delete', 'spare_parts:manage']);

    const [allParts, setAllParts] = useState([]);
    const [parts, setParts] = useState([]);
    const [devices, setDevices] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [includeInactive, setIncludeInactive] = useState(false);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [stock, setStock] = useState('');
    const [modal, setModal] = useState(null);
    const [msg, setMsg] = useState(null);
    const t = useRef(null);

    const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000); };

    const fetchParts = async (inactive = includeInactive) => {
        setLoading(true);
        try {
            const res = await api.get('/spare-parts', { include_inactive: inactive });
            const all = res.data?.data || res.data || [];
            setAllParts(all);
            setCategories(Array.from(new Set(all.map(p => p?.part_category).filter(Boolean))));
        } catch (e) {
            console.error(e);
        } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchParts();
        Promise.all([
            api.get('/reports/products').catch(() => ({ data: [] })),
            api.get('/suppliers').catch(() => ({ data: [] })),
        ]).then(([d, s]) => {
            setDevices(d.data?.products || d.data?.data || (Array.isArray(d.data) ? d.data : []));
            setSuppliers(s.data?.data || (Array.isArray(s.data) ? s.data : []));
        });
    }, []);

    useEffect(() => {
        clearTimeout(t.current);
        t.current = setTimeout(() => {
            const s = search.toLowerCase();
            setParts(allParts.filter(p => {
                if (!p || typeof p !== 'object') return false;
                if (category && p.part_category !== category) return false;
                const st = getStockStatus(p);
                if (stock === 'out' && st.text !== 'Out of Stock') return false;
                if (stock === 'critical' && st.text !== 'Critical') return false;
                if (stock === 'low' && !['Low Stock', 'Critical'].includes(st.text)) return false;
                if (s) return [p.part_name, p.part_code].filter(Boolean).join(' ').toLowerCase().includes(s);
                return true;
            }));
        }, 200);
    }, [search, category, stock, allParts]);

    const handleDelete = async (id) => {
        if (!window.confirm('PERMANENTLY DELETE this part? This cannot be undone.')) return;
        try { await api.del(`/spare-parts/${id}`); showMsg('Part deleted'); fetchParts(); }
        catch (e) { showMsg(e.message || 'Failed to delete', 'error'); }
    };

    const toggleActive = async (part) => {
        const id = part.spare_part_uuid || part.uuid || part.id;
        const label = part.is_active ? 'deactivate' : 'activate';
        if (!window.confirm(`Are you sure you want to ${label} this part?`)) return;
        try { await api.put(`/spare-parts/${id}`, { is_active: !part.is_active }); showMsg(`Part ${label}d`); fetchParts(); }
        catch (e) {
            console.error(e);
            showMsg('Failed to toggle status', 'error');
        }
    };

    const handleSaved = (text) => { setModal(null); showMsg(text); fetchParts(); };

    return (
        <div className="w-full py-4 px-4">
            <div className="flex items-center justify-between mb-4">
                <div><h1 className="text-xl font-bold text-text-primary flex items-center gap-2"><i className="fas fa-tools text-primary"></i>Spare Parts Catalog</h1><p className="text-sm text-text-muted mt-0.5">Manage spare part specifications and inventory settings</p></div>
                {canWrite && <button onClick={() => setModal('new')} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white cursor-pointer hover:bg-primary-dark"><i className="fas fa-plus mr-2"></i>Add Spare Part</button>}
            </div>

            {msg && <div className={`mb-4 flex items-center justify-between rounded-lg border px-4 py-2 text-sm ${msg.type === 'success' ? 'bg-success/10 border-success/30 text-success' : 'bg-danger/10 border-danger/30 text-danger'}`}><span>{msg.text}</span><button onClick={() => setMsg(null)} className="cursor-pointer font-bold">&times;</button></div>}

            <div className="bg-white rounded-lg shadow-sm p-3 mb-4 flex flex-wrap gap-3 items-center">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search parts..." className={`${IC} flex-1 min-w-[180px]`} />
                <select value={category} onChange={e => setCategory(e.target.value)} className={`${IC} min-w-[140px]`}><option value="">All Categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                <select value={stock} onChange={e => setStock(e.target.value)} className={`${IC} min-w-[140px]`}><option value="">All Stock</option><option value="out">Out of Stock</option><option value="critical">Critical</option><option value="low">Low Stock</option></select>
                <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap"><input type="checkbox" checked={includeInactive} onChange={e => { setIncludeInactive(e.target.checked); fetchParts(e.target.checked); }} className="rounded border-border" />Show Inactive</label>
                <small className="text-text-muted ml-auto">Showing {parts.length} of {allParts.length} parts</small>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {loading ? <Spinner /> : parts.length === 0 ? (
                    <div className="text-center py-12 text-text-muted"><i className="fas fa-tools fa-3x opacity-25 mb-3 block"></i><p>No spare parts found</p></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-surface-light border-b border-border">
                                {['Code','Part Name','Category','Compatible Device','Cost','Price','Stock','New','Used','Status', (canWrite || canDelete) ? 'Actions' : null].filter(Boolean).map(h => <th key={h} className="px-3 py-2 text-left text-xs font-medium text-text-secondary">{h}</th>)}
                            </tr></thead>
                            <tbody className="divide-y divide-border">
                                {parts.map((p, i) => {
                                    const id = p.spare_part_uuid || p.uuid || p.id;
                                    const qty = p.available_quantity ?? p.total_quantity ?? 0;
                                    const st = getStockStatus(p);
                                    return (
                                        <tr key={i} className="hover:bg-surface-body transition-colors">
                                            <td className="px-3 py-2"><code className="text-xs">{p.part_code || 'N/A'}</code></td>
                                            <td className="px-3 py-2">{p.part_name || 'Unnamed'}{!p.is_active && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[0.65rem] font-medium bg-secondary text-white">Inactive</span>}{p.quality_grade && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[0.65rem] font-medium bg-info text-white">{p.quality_grade}</span>}</td>
                                            <td className="px-3 py-2"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-white">{p.part_category || 'Uncategorized'}</span></td>
                                            <td className="px-3 py-2">{p.device_name ? <small className="text-primary"><i className="fas fa-mobile-alt mr-1"></i>{p.device_maker} {p.device_name}</small> : <small className="text-text-muted">Universal</small>}</td>
                                            <td className="px-3 py-2">${parseFloat(p.unit_cost || 0).toFixed(2)}</td>
                                            <td className="px-3 py-2">${parseFloat(p.unit_price || 0).toFixed(2)}</td>
                                            <td className="px-3 py-2 text-center"><strong className={qty === 0 ? 'text-danger' : ''}>{qty}</strong></td>
                                            <td className="px-3 py-2 text-center">{p.new_quantity || 0}</td>
                                            <td className="px-3 py-2 text-center">{p.used_quantity || 0}</td>
                                            <td className="px-3 py-2"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white ${st.col}`}><i className={`fas ${st.icon} mr-1`}></i>{st.text}</span></td>
                                            {(canWrite || canDelete) && (
                                                <td className="px-3 py-2">
                                                    <div className="flex gap-1">
                                                        {canWrite && <button onClick={() => setModal(p)} className="px-2 py-1 text-xs border border-primary text-primary rounded hover:bg-primary hover:text-white transition-colors cursor-pointer"><i className="fas fa-edit"></i></button>}
                                                        {canWrite && <button onClick={() => toggleActive(p)} className={`px-2 py-1 text-xs border rounded transition-colors cursor-pointer ${p.is_active ? 'border-warning text-warning hover:bg-warning hover:text-white' : 'border-success text-success hover:bg-success hover:text-white'}`}><i className={`fas ${p.is_active ? 'fa-ban' : 'fa-check'}`}></i></button>}
                                                        {canDelete && <button onClick={() => handleDelete(id)} className="px-2 py-1 text-xs border border-danger text-danger rounded hover:bg-danger hover:text-white transition-colors cursor-pointer"><i className="fas fa-trash"></i></button>}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {modal && <SparePartModal part={modal === 'new' ? null : modal} devices={devices} suppliers={suppliers} onClose={() => setModal(null)} onSaved={handleSaved} />}
        </div>
    );
}
