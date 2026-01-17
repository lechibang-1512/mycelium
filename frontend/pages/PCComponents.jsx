import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Cpu, Plus, Pencil, Trash2 } from 'lucide-react';

const TYPES = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case', 'cooling', 'fan'];

const COL_CONFIG = {
    cpu: ['name', 'manufacturer', 'socket', 'cores_total', 'base_clock_ghz', 'unit_price'],
    gpu: ['name', 'manufacturer', 'gpu_chipset', 'memory_size_gb', 'unit_price'],
    motherboard: ['name', 'manufacturer', 'socket', 'form_factor', 'unit_price'],
    ram: ['name', 'manufacturer', 'type', 'capacity_total_gb', 'speed_mhz', 'unit_price'],
    storage: ['name', 'manufacturer', 'type', 'capacity_gb', 'unit_price'],
    psu: ['name', 'manufacturer', 'wattage', 'type', 'efficiency_rating', 'unit_price'],
    case: ['name', 'manufacturer', 'form_factor', 'color', 'unit_price'],
    cooling: ['name', 'manufacturer', 'type', 'tdp_rating_watts', 'unit_price'],
    fan: ['name', 'manufacturer', 'size_mm', 'quantity_in_pack', 'unit_price']
};

const COL_LABELS = { 
    name: 'Name', manufacturer: 'Manufacturer', socket: 'Socket', cores_total: 'Cores', 
    base_clock_ghz: 'Base Clock', unit_price: 'Price', gpu_chipset: 'Chipset', 
    memory_size_gb: 'VRAM (GB)', form_factor: 'Form Factor', memory_type: 'Memory Type', 
    type: 'Type', capacity_total_gb: 'Capacity (GB)', speed_mhz: 'Speed', 
    capacity_gb: 'Capacity', wattage: 'Wattage', efficiency_rating: 'Efficiency',
    color: 'Color', tdp_rating_watts: 'TDP Rating', size_mm: 'Size (mm)',
    quantity_in_pack: 'Pack Qty'
};

function getId(item, type) {
    const specificKey = `${type}_id`;
    if (item[specificKey]) return item[specificKey];
    const mapping = { psu: 'power_supply_id', case: 'pc_case_id' };
    if (mapping[type] && item[mapping[type]]) return item[mapping[type]];
    const idKey = Object.keys(item).find(k => k.endsWith('_id') && k !== 'supplier_id');
    return item[idKey];
}

export default function PCComponents() {
    const { type: typeParam } = useParams();
    const navigate = useNavigate();
    const { hasAnyPermission } = useAuth();
    
    // Default to cpu if invalid type
    const type = TYPES.includes(typeParam) ? typeParam : 'cpu';

    const canWrite = hasAnyPermission(['inventory:write', 'inventory:manage']);
    const canDelete = hasAnyPermission(['inventory:delete', 'inventory:manage']);

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchItems = async () => {
        setLoading(true); setError(null);
        try {
            const res = await api.get(`/pc-components/${type}`);
            setItems(res || []);
        } catch (e) { setError(e.message || 'Failed to load components'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchItems(); }, [type]);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this component? This action cannot be undone.')) return;
        try { 
            await api.del(`/pc-components/${type}/${id}`); 
            fetchItems(); 
        } catch (e) { 
            alert(e.message || 'Failed to delete'); 
        }
    };

    const cols = COL_CONFIG[type] || ['name', 'manufacturer'];

    return (
        <div className="max-w-7xl mx-auto w-full">
            <PageHeader
                title={`${type.toUpperCase()} Components`}
                subtitle="Manage PC hardware catalog and specifications"
                icon={Cpu}
                action={
                    canWrite && (
                        <button 
                            onClick={() => navigate(`/pc-component-form/${type}`)} 
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" /> Add Component
                        </button>
                    )
                }
            />

            {/* Type Navigation */}
            <div className="mb-6 flex flex-wrap gap-2">
                {TYPES.map(t => (
                    <button 
                        key={t} 
                        onClick={() => navigate(`/pc-components/${t}`)} 
                        className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all shadow-sm ${type === t ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}
                    >
                        {t === 'psu' ? 'PSU' : t}
                    </button>
                ))}
            </div>

            <Card noPadding>
                {loading ? <Spinner fullPage={false} className="py-16" /> : error ? (
                    <div className="text-center py-12 text-rose-600 font-medium">{error}</div>
                ) : items.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <Cpu className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-lg font-medium text-slate-500">No {type.toUpperCase()} components found</p>
                        <p className="text-sm mt-1">Click &quot;Add Component&quot; to create your first entry.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {cols.map(c => (
                                        <th key={c} className="px-5 py-3 font-semibold text-slate-600 uppercase text-[11px] tracking-wider">
                                            {COL_LABELS[c] || c.replace(/_/g, ' ')}
                                        </th>
                                    ))}
                                    {(canWrite || canDelete) && <th className="px-5 py-3 font-semibold text-slate-600 text-right uppercase text-[11px] tracking-wider">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {items.map((item, i) => {
                                    const id = getId(item, type);
                                    return (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            {cols.map(c => (
                                                <td key={c} className={`px-5 py-3 ${c === 'name' ? 'font-semibold text-slate-900' : 'text-slate-600 font-medium'}`}>
                                                    {c === 'unit_price' && item.currency ? `${item[c] ?? '-'} ${item.currency}` : String(item[c] ?? '-')}
                                                </td>
                                            ))}
                                            {(canWrite || canDelete) && (
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {canWrite && (
                                                            <button 
                                                                onClick={() => navigate(`/pc-component-form/${type}/${id}`)} 
                                                                className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                                                                title="Edit Component"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button 
                                                                onClick={() => handleDelete(id)} 
                                                                className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                                                                title="Delete Component"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
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
            </Card>
        </div>
    );
}
