import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Monitor, ArrowLeft, Save, Loader2, AlertTriangle } from 'lucide-react';

const COMPONENT_TYPES = ['cpu', 'motherboard', 'gpu', 'psu', 'case', 'cooling'];

function getPrimaryKey(type) {
    const m = {
        cpu: 'cpu_id', motherboard: 'motherboard_id', gpu: 'gpu_id', ram: 'ram_id',
        storage: 'storage_id', psu: 'psu_id', case: 'case_id', cooling: 'cooler_id'
    };
    return m[type] || `${type}_id`;
}

function getOptionLabel(type, item) {
    switch (type) {
        case 'cpu':         return `${item.name} (${item.socket || ''})`;
        case 'motherboard': return `${item.name} (${item.socket || ''})`;
        case 'gpu':         return `${item.name} (${item.gpu_chipset || ''})`;
        case 'psu':         return `${item.name} (${item.wattage || ''}W)`;
        case 'case':        return `${item.name} (${item.form_factor || ''})`;
        case 'cooling':     return `${item.name} (${item.type || ''})`;
        default:            return item.name || '';
    }
}

import { IC } from '../utils/styles.js';

export default function PCBuildForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasAnyPermission, user } = useAuth();
    const toast = useToast();
    
    const isEdit = !!id;
    const canWrite = hasAnyPermission(['inventory:write', 'inventory:manage']);

    const [formData, setFormData] = useState({
        name: '',
        build_purpose: 'Gaming',
        status: 'draft',
        description: '',
        cpu_id: '',
        motherboard_id: '',
        gpu_id: '',
        psu_id: '',
        case_id: '',
        cooler_id: '',
        total_tdp_watts: '',
        estimated_price: '',
        total_price: '',
        currency: 'VND',
        image_url: '',
        user_id: user?.id || '',
        is_public: false,
        compatibility_status: 'unchecked',
        notes: ''
    });
    
    const [options, setOptions] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!canWrite) {
            setError("You do not have permission to access this page.");
            setLoading(false);
            return;
        }

        const loadData = async () => {
            try {
                // Fetch all components concurrently
                const resArr = await Promise.all(
                    COMPONENT_TYPES.map(t => api.get(`/pc-components/${t}`).catch(() => []))
                );
                
                const newOptions = {};
                COMPONENT_TYPES.forEach((t, i) => { 
                    newOptions[t] = resArr[i] || []; 
                });
                setOptions(newOptions);

                if (isEdit) {
                    const buildRes = await api.get(`/pc-builds/${id}`);
                    setFormData(prev => ({
                        ...prev,
                        ...buildRes,
                        // Ensure nulls are converted to empty strings for select inputs
                        cpu_id: buildRes.cpu_id || '',
                        motherboard_id: buildRes.motherboard_id || '',
                        gpu_id: buildRes.gpu_id || '',
                        psu_id: buildRes.psu_id || '',
                        case_id: buildRes.case_id || '',
                        cooler_id: buildRes.cooler_id || '',
                        total_tdp_watts: buildRes.total_tdp_watts ?? '',
                        estimated_price: buildRes.estimated_price ?? '',
                        total_price: buildRes.total_price ?? '',
                    }));
                }
            } catch (_err) {
                setError('Failed to load component options or build details.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [isEdit, id, canWrite, user?.id]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        const dataToSubmit = { ...formData };
        
        // Convert empty string relations to null
        ['cpu_id', 'motherboard_id', 'gpu_id', 'psu_id', 'case_id', 'cooler_id'].forEach(k => {
            if (dataToSubmit[k] === '') dataToSubmit[k] = null;
        });

        try {
            if (isEdit) {
                await api.put(`/pc-builds/${id}`, dataToSubmit);
                toast.success('Build updated successfully');
            } else {
                await api.post(`/pc-builds`, dataToSubmit);
                toast.success('Build created successfully');
            }
            navigate('/pc-builds');
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to save build');
            window.scrollTo(0, 0);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto w-full">
            <PageHeader
                title={isEdit ? `Edit Build: ${formData.name || ''}` : "New PC Build"}
                subtitle="Configure system components and specifications"
                icon={Monitor}
                action={
                    <button 
                        onClick={() => navigate('/pc-builds')} 
                        className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                }
            />

            {loading ? (
                <Card noPadding><Spinner fullPage={false} className="py-20" /></Card>
            ) : !canWrite ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-rose-800 font-medium shadow-sm flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5" />
                    You do not have permission to access this page.
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-rose-800 font-medium shadow-sm flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5" />
                            {error}
                        </div>
                    )}
                    
                    <Card>
                        <div className="p-6">
                            <h6 className="text-indigo-700 font-bold text-sm tracking-widest uppercase mb-4 pb-2 border-b border-indigo-100">Basic Info</h6>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-x-5 gap-y-8 mb-8">
                                <div className="md:col-span-6">
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1">Build Name <span className="text-rose-500">*</span></label>
                                    <input type="text" name="name" required value={formData.name} onChange={handleChange} className={IC} />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Purpose</label>
                                    <select name="build_purpose" value={formData.build_purpose} onChange={handleChange} className={IC}>
                                        <option value="Gaming">Gaming</option>
                                        <option value="Workstation">Workstation</option>
                                        <option value="Office">Office</option>
                                        <option value="Server">Server</option>
                                        <option value="HTPC">HTPC</option>
                                        <option value="Streaming">Streaming</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Status</label>
                                    <select name="status" value={formData.status} onChange={handleChange} className={IC}>
                                        <option value="draft">Draft</option>
                                        <option value="planned">Planned</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
                                <textarea rows="2" name="description" value={formData.description} onChange={handleChange} className={IC}></textarea>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="p-6">
                            <h6 className="text-indigo-700 font-bold text-sm tracking-widest uppercase mb-4 pb-2 border-b border-indigo-100">Core Components</h6>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-8">
                                {COMPONENT_TYPES.map(t => {
                                    const keyName = t === 'motherboard' ? 'motherboard_id' : t === 'case' ? 'case_id' : t === 'cooling' ? 'cooler_id' : `${t}_id`;
                                    const label = t === 'cpu' ? 'CPU' : t === 'gpu' ? 'GPU' : t === 'psu' ? 'PSU' : t.charAt(0).toUpperCase() + t.slice(1);
                                    return (
                                        <div key={t}>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">{label}</label>
                                            <select name={keyName} value={formData[keyName]} onChange={handleChange} className={IC}>
                                                <option value="">Select {label}...</option>
                                                {(options[t] || []).map(item => (
                                                    <option key={item[getPrimaryKey(t)]} value={item[getPrimaryKey(t)]}>
                                                        {getOptionLabel(t, item)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="p-6">
                            <h6 className="text-indigo-700 font-bold text-sm tracking-widest uppercase mb-4 pb-2 border-b border-indigo-100">Metadata & Extras</h6>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-8 mb-8">
                                <div><label className="block text-sm font-bold text-slate-700 mb-1.5">Total TDP (W)</label><input type="number" name="total_tdp_watts" value={formData.total_tdp_watts} onChange={handleChange} className={IC} /></div>
                                <div><label className="block text-sm font-bold text-slate-700 mb-1.5">Estimated Price</label><input type="number" name="estimated_price" value={formData.estimated_price} onChange={handleChange} className={IC} /></div>
                                <div><label className="block text-sm font-bold text-slate-700 mb-1.5">Total Price</label><input type="number" name="total_price" value={formData.total_price} onChange={handleChange} className={IC} /></div>
                                <div><label className="block text-sm font-bold text-slate-700 mb-1.5">Currency</label><input type="text" name="currency" value={formData.currency} onChange={handleChange} className={IC} /></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-x-5 gap-y-8 mb-8">
                                <div className="md:col-span-4">
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Image URL</label>
                                    <input type="text" name="image_url" value={formData.image_url} onChange={handleChange} className={IC} />
                                </div>
                                <div className="md:col-span-4">
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">User ID</label>
                                    <input type="text" name="user_id" value={formData.user_id} onChange={handleChange} className={IC} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Compatibility</label>
                                    <select name="compatibility_status" value={formData.compatibility_status} onChange={handleChange} className={IC}>
                                        <option value="unchecked">Unchecked</option>
                                        <option value="compatible">Compatible</option>
                                        <option value="warnings">Warnings</option>
                                        <option value="incompatible">Incompatible</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">&nbsp;</label>
                                    <div className="flex items-center h-[38px]">
                                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer select-none">
                                            <input type="checkbox" name="is_public" checked={formData.is_public} onChange={handleChange} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4 cursor-pointer" />
                                            Public Build
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Notes</label>
                                <textarea rows="2" name="notes" value={formData.notes} onChange={handleChange} className={IC}></textarea>
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end gap-3 sticky bottom-4">
                        <button 
                            type="button" 
                            onClick={() => navigate('/pc-builds')} 
                            className="rounded-lg bg-white border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm" 
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={submitting} 
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
                        >
                            {submitting ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="w-4 h-4" /> Save Build</>
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
