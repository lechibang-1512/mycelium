import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Modal, ModalFooter } from '../components/ui/Modal.jsx';
import { Truck, Plus, Edit, Trash2, Ban, CheckCircle, ExternalLink } from 'lucide-react';

const IC = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors shadow-sm';

const EMPTY = { name: '', tax_code: '', category: '', contact_person: '', contact_position: '', email: '', phone: '', website: '', address: '', city: '', province: '', notes: '', is_active: true };

function SupplierModal({ supplier, categories, onClose, onSaved }) {
    const [form, setForm] = useState(supplier ? { ...EMPTY, ...supplier, is_active: !!supplier.is_active } : { ...EMPTY });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name) { setError('Company Name is required'); return; }
        setSaving(true); setError(null);
        try {
            const payload = { ...form, is_active: form.is_active ? 1 : 0 };
            if (supplier) await api.put(`/suppliers/${supplier.id}`, payload);
            else await api.post('/suppliers', payload);
            onSaved(supplier ? 'Supplier updated successfully' : 'Supplier created successfully');
        } catch (err) { 
            setError(err.response?.data?.error || 'Failed to save'); 
        } finally { 
            setSaving(false); 
        }
    };

    const F = ({ k, label, t = 'text', req = false }) => (
        <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}{req && <span className="text-rose-500 ml-1">*</span>}</label>
            <input type={t} value={form[k] || ''} onChange={e => set(k, e.target.value)} required={req} className={IC} />
        </div>
    );

    return (
        <Modal isOpen={true} title={supplier ? 'Edit Supplier' : 'Add New Supplier'} onClose={onClose} size="lg">
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                    {error && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 font-medium shadow-sm">
                            {error}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <F k="name" label="Company Name" req />
                        <F k="tax_code" label="Tax Code" />
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
                            <input list="cat-opts" value={form.category || ''} onChange={e => set('category', e.target.value)} className={IC} />
                            <datalist id="cat-opts">{categories.map(c => <option key={c} value={c}>{c}</option>)}</datalist>
                        </div>
                        <F k="contact_person" label="Contact Person" />
                        <F k="contact_position" label="Position" />
                        <F k="email" label="Email" t="email" />
                        <F k="phone" label="Phone" />
                        <F k="website" label="Website" />
                    </div>
                    
                    <h6 className="text-indigo-700 font-bold text-xs tracking-widest uppercase mt-4 mb-2 pb-2 border-b border-indigo-100">Location</h6>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <F k="address" label="Address" />
                        <F k="city" label="City" />
                        <F k="province" label="Province" />
                    </div>
                    
                    <div className="mt-4">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
                        <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows="2" className={IC}></textarea>
                    </div>
                    <div className="mt-4">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 select-none">
                            <input 
                                type="checkbox" 
                                checked={!!form.is_active} 
                                onChange={e => set('is_active', e.target.checked)} 
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4" 
                            />
                            Active Supplier
                        </label>
                    </div>
                </div>
                <ModalFooter>
                    <button type="button" onClick={onClose} className="rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
                    <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save Supplier'}
                    </button>
                </ModalFooter>
            </form>
        </Modal>
    );
}

export default function Suppliers() {
    const { hasAnyPermission } = useAuth();
    const canWrite = hasAnyPermission(['inventory:write', 'inventory:manage']);
    const canDelete = hasAnyPermission(['inventory:delete', 'inventory:manage']);
    const toast = useToast();

    const [suppliers, setSuppliers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ search: '', category: '', status: '' });
    const [modal, setModal] = useState(null);
    const searchTimer = useRef(null);

    const fetchAll = useCallback(async (f = filters) => {
        setLoading(true);
        try {
            const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
            const [sRes, cRes] = await Promise.all([
                api.get('/suppliers', params), 
                api.get('/suppliers/categories')
            ]);
            setSuppliers(sRes.data?.suppliers || []);
            setCategories(cRes.data?.categories || []);
        } catch { 
            // silent 
        } finally { 
            setLoading(false); 
        }
    }, [filters]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleFilter = (key, val) => {
        const next = { ...filters, [key]: val };
        setFilters(next);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => fetchAll(next), key === 'search' ? 300 : 0);
    };

    const toggleStatus = async (id, currentState) => {
        try { 
            await api.patch(`/suppliers/${id}/status`); 
            fetchAll(); 
            toast.success(`Supplier ${currentState ? 'deactivated' : 'activated'} successfully`);
        } catch { 
            toast.error('Failed to change status'); 
        }
    };

    const deleteSup = async (id) => {
        if (!window.confirm('Delete this supplier? This action cannot be undone.')) return;
        try { 
            await api.del(`/suppliers/${id}`); 
            toast.success('Supplier deleted'); 
            fetchAll(); 
        } catch { 
            toast.error('Failed to delete supplier'); 
        }
    };

    const handleSaved = (text) => { 
        setModal(null); 
        toast.success(text); 
        fetchAll(); 
    };

    return (
        <div className="max-w-7xl mx-auto w-full">
            <PageHeader
                title="Suppliers"
                subtitle="Manage your supplier directory and contacts"
                icon={Truck}
                action={
                    canWrite && (
                        <button 
                            onClick={() => setModal('new')} 
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" /> Add Supplier
                        </button>
                    )
                }
            />

            <div className="mb-6 flex flex-wrap gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <input 
                    value={filters.search} 
                    onChange={e => handleFilter('search', e.target.value)} 
                    placeholder="Search suppliers..." 
                    className={`${IC} flex-1 min-w-[200px]`} 
                />
                <select 
                    value={filters.category} 
                    onChange={e => handleFilter('category', e.target.value)} 
                    className={`${IC} min-w-[180px] w-auto`}
                >
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select 
                    value={filters.status} 
                    onChange={e => handleFilter('status', e.target.value)} 
                    className={`${IC} min-w-[140px] w-auto`}
                >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>

            <Card noPadding>
                {loading ? <Spinner fullPage={false} className="py-16" /> : suppliers.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-lg font-medium text-slate-500">No suppliers found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {['Company', 'Category', 'Contact', 'Email', 'Phone', 'Status'].map(h => (
                                        <th key={h} className="px-5 py-3 font-semibold text-slate-600">
                                            {h}
                                        </th>
                                    ))}
                                    <th className="px-5 py-3 font-semibold text-slate-600 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {suppliers.map((sup, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-4">
                                            <strong className="text-slate-900 font-semibold block">{sup.name}</strong>
                                            {sup.website && (
                                                <a 
                                                    href={sup.website} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline mt-0.5"
                                                >
                                                    <ExternalLink className="w-3 h-3" /> Website
                                                </a>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            {sup.category ? (
                                                <Badge variant="info">{sup.category}</Badge>
                                            ) : (
                                                <span className="text-slate-400">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-slate-700">
                                            <div>{sup.contact_person || 'N/A'}</div>
                                            {sup.contact_position && (
                                                <div className="text-xs text-slate-500">{sup.contact_position}</div>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-slate-600">{sup.email || 'N/A'}</td>
                                        <td className="px-5 py-4 text-slate-600">{sup.phone || 'N/A'}</td>
                                        <td className="px-5 py-4">
                                            <Badge variant={sup.is_active ? 'success' : 'danger'}>
                                                {sup.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {canWrite && (
                                                    <button 
                                                        onClick={() => setModal(sup)} 
                                                        className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors" 
                                                        title="Edit Supplier"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {canWrite && (
                                                    <button 
                                                        onClick={() => toggleStatus(sup.id, sup.is_active)} 
                                                        className={`p-1.5 rounded-md border border-slate-200 transition-colors ${
                                                            sup.is_active 
                                                                ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200' 
                                                                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200'
                                                        }`} 
                                                        title={sup.is_active ? 'Deactivate' : 'Activate'}
                                                    >
                                                        {sup.is_active ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button 
                                                        onClick={() => deleteSup(sup.id)} 
                                                        className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors" 
                                                        title="Delete Supplier"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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

            {modal && (
                <SupplierModal 
                    supplier={modal === 'new' ? null : modal} 
                    categories={categories} 
                    onClose={() => setModal(null)} 
                    onSaved={handleSaved} 
                />
            )}
        </div>
    );
}
