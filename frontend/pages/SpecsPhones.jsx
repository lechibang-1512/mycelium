import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Modal, ModalFooter } from '../components/ui/Modal.jsx';
import { 
    Smartphone, Info, Cpu, Monitor, Camera, Battery, Ruler, Shield, 
    MemoryStick, Wifi, ToggleLeft, Plus, Pencil, Trash2, Search, Palette
} from 'lucide-react';

import { IC } from '../utils/styles.js';

const TABS = [
    { key: 'basic', icon: Info, label: 'Basic Info' },
    { key: 'specs', icon: Cpu, label: 'Specs' },
    { key: 'display', icon: Monitor, label: 'Display' },
    { key: 'camera', icon: Camera, label: 'Camera' },
    { key: 'battery', icon: Battery, label: 'Battery' },
    { key: 'physical', icon: Ruler, label: 'Physical' },
    { key: 'warranty', icon: Shield, label: 'Warranty' },
];

const INITIAL = {
    device_name: '', device_maker: '', device_price: 0, color: '', water_and_dust_rating: '', operating_system: '',
    processor: '', gpu: '', ram: '', rom: '', expandable_memory: '',
    display_size: '', display_type: '', resolution: '', refresh_rate: '', hdr_support: '', display_features: '',
    rear_camera_main: '', rear_camera_ultrawide: '', rear_camera_telephoto: '', optical_zoom: '', rear_camera_features: '', front_camera: '', front_camera_features: '',
    battery_capacity: '', fast_charging: '', wireless_charging: '', reverse_charging: '', connector: '', sim_card: '', nfc: '', wireless_connectivity: '',
    length_mm: '', width_mm: '', thickness_mm: '', weight_g: '', security_features: '', sensors: '', package_contents: '',
    warranty_months: 12, warranty_type: 'MANUFACTURER', warranty_notes: '', is_active: true, is_discontinued: false, launch_date: '', end_of_life_date: ''
};

function FI({ label, name, value, onChange, type = 'text', required = false, step }) {
    return (
        <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}{required && <span className="text-rose-500 ml-1">*</span>}</label>
            <input type={type} name={name} value={value || ''} onChange={onChange} required={required} step={step} className={IC} />
        </div>
    );
}

function FS({ label, name, value, onChange, options }) {
    return (
        <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
            <select name={name} value={value || ''} onChange={onChange} className={IC}>
                <option value="">Select...</option>
                {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
        </div>
    );
}

function CB({ label, name, checked, onChange, text }) {
    return (
        <div>
            <label className="flex items-center gap-2 text-sm cursor-pointer font-medium text-slate-700 select-none">
                <input 
                    type="checkbox" 
                    name={name} 
                    checked={!!checked} 
                    onChange={onChange} 
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4 mt-0.5" 
                />
                <div className="flex flex-col">
                    <span>{label}</span>
                    {text && <span className="text-xs text-slate-500 font-normal">{text}</span>}
                </div>
            </label>
        </div>
    );
}

function PhoneModal({ phone, onClose, onSaved }) {
    const toast = useToast();
    const [form, setForm] = useState(phone ? { 
        ...INITIAL, 
        ...phone, 
        is_active: !!phone.is_active, 
        is_discontinued: !!phone.is_discontinued, 
        rom: phone.rom || phone.device_storage || '' 
    } : { ...INITIAL });
    const [activeTab, setActiveTab] = useState('basic');
    const [saving, setSaving] = useState(false);
    const isEdit = !!phone;

    const set = (name, val) => setForm(p => ({ ...p, [name]: val }));
    const onInput = (e) => {
        const { name, type, checked, value } = e.target;
        set(name, type === 'checkbox' ? checked : value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); 
        setSaving(true);
        const payload = { ...form };
        ['device_price', 'display_size', 'length_mm', 'width_mm', 'thickness_mm', 'weight_g'].forEach(k => { 
            if (payload[k] === '' || payload[k] === null) payload[k] = null; 
            else if (payload[k]) payload[k] = parseFloat(payload[k]); 
        });
        if (payload.warranty_months) payload.warranty_months = parseInt(payload.warranty_months, 10);
        
        try {
            if (isEdit) {
                await api.put(`/phones/${phone.product_id}`, payload);
            } else {
                await api.post('/phones', payload);
            }
            onSaved(isEdit ? 'Product updated successfully' : 'Product added successfully');
        } catch (err) { 
            toast.error(err.message || 'Failed to save product'); 
        } finally { 
            setSaving(false); 
        }
    };

    return (
        <Modal 
            isOpen={true}
            title={
                <div className="flex items-center gap-2">
                    {isEdit ? <Pencil className="w-5 h-5 text-indigo-600" /> : <Smartphone className="w-5 h-5 text-indigo-600" />}
                    <span>{isEdit ? 'Edit Phone Model' : 'Add Phone Model'}</span>
                </div>
            } 
            onClose={onClose} 
            size="2xl"
        >
            <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto custom-scrollbar">
                {TABS.map(t => {
                    const TabIcon = t.icon;
                    return (
                        <button 
                            key={t.key} 
                            type="button" 
                            onClick={() => setActiveTab(t.key)} 
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                                activeTab === t.key 
                                    ? 'border-indigo-600 text-indigo-600 bg-white' 
                                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                        >
                            <TabIcon className="w-4 h-4" /> {t.label}
                        </button>
                    );
                })}
            </div>
            
            <form onSubmit={handleSubmit}>
                <div className="p-6 overflow-y-auto" style={{ minHeight: '350px', maxHeight: '50vh' }}>
                    {activeTab === 'basic' && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-8">
                                <FI label="Manufacturer" name="device_maker" value={form.device_maker} onChange={onInput} required />
                                <FI label="Device Name" name="device_name" value={form.device_name} onChange={onInput} required />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-8">
                                <FI label="Price (MSRP $)" name="device_price" value={form.device_price} onChange={onInput} type="number" required step="0.01" />
                                <FI label="Color Variant" name="color" value={form.color} onChange={onInput} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-8">
                                <FI label="Operating System" name="operating_system" value={form.operating_system} onChange={onInput} />
                                <FI label="Water & Dust Rating" name="water_and_dust_rating" value={form.water_and_dust_rating} onChange={onInput} />
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'specs' && (
                        <div className="space-y-6">
                            <div>
                                <h6 className="flex items-center gap-2 text-indigo-700 font-bold text-xs tracking-widest uppercase mb-3 pb-2 border-b border-indigo-100">
                                    <Cpu className="w-4 h-4" /> Processor & Performance
                                </h6>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-8">
                                    <FI label="Processor" name="processor" value={form.processor} onChange={onInput} />
                                    <FI label="GPU" name="gpu" value={form.gpu} onChange={onInput} />
                                </div>
                            </div>
                            <div>
                                <h6 className="flex items-center gap-2 text-indigo-700 font-bold text-xs tracking-widest uppercase mb-3 pb-2 border-b border-indigo-100">
                                    <MemoryStick className="w-4 h-4" /> Memory
                                </h6>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-8">
                                    <FI label="RAM" name="ram" value={form.ram} onChange={onInput} />
                                    <FI label="ROM/Storage" name="rom" value={form.rom} onChange={onInput} />
                                    <FI label="Expandable Memory" name="expandable_memory" value={form.expandable_memory} onChange={onInput} />
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'display' && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-8">
                                <FI label="Display Size (inches)" name="display_size" value={form.display_size} onChange={onInput} type="number" step="0.01" />
                                <FS label="Display Type" name="display_type" value={form.display_type} onChange={onInput} options={[
                                    {v:'LCD',l:'LCD'}, {v:'IPS_LCD',l:'IPS LCD'}, {v:'OLED',l:'OLED'}, 
                                    {v:'AMOLED',l:'AMOLED'}, {v:'SUPER_AMOLED',l:'Super AMOLED'}, {v:'OTHER',l:'Other'}
                                ]} />
                                <FI label="Resolution" name="resolution" value={form.resolution} onChange={onInput} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-8">
                                <FI label="Refresh Rate" name="refresh_rate" value={form.refresh_rate} onChange={onInput} />
                                <FI label="HDR Support" name="hdr_support" value={form.hdr_support} onChange={onInput} />
                                <FI label="Display Features" name="display_features" value={form.display_features} onChange={onInput} />
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'camera' && (
                        <div className="space-y-6">
                            <div>
                                <h6 className="flex items-center gap-2 text-indigo-700 font-bold text-xs tracking-widest uppercase mb-3 pb-2 border-b border-indigo-100">
                                    <Camera className="w-4 h-4" /> Rear Camera
                                </h6>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-8 mb-5">
                                    <FI label="Main Sensor" name="rear_camera_main" value={form.rear_camera_main} onChange={onInput} />
                                    <FI label="Ultrawide" name="rear_camera_ultrawide" value={form.rear_camera_ultrawide} onChange={onInput} />
                                    <FI label="Telephoto" name="rear_camera_telephoto" value={form.rear_camera_telephoto} onChange={onInput} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-8">
                                    <FI label="Optical Zoom" name="optical_zoom" value={form.optical_zoom} onChange={onInput} />
                                    <FI label="Rear Camera Features" name="rear_camera_features" value={form.rear_camera_features} onChange={onInput} />
                                </div>
                            </div>
                            <div>
                                <h6 className="flex items-center gap-2 text-indigo-700 font-bold text-xs tracking-widest uppercase mb-3 pb-2 border-b border-indigo-100">
                                    <Camera className="w-4 h-4" /> Front Camera
                                </h6>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-8">
                                    <FI label="Front Camera" name="front_camera" value={form.front_camera} onChange={onInput} />
                                    <FI label="Front Features" name="front_camera_features" value={form.front_camera_features} onChange={onInput} />
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'battery' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-8">
                                <FI label="Battery Capacity" name="battery_capacity" value={form.battery_capacity} onChange={onInput} />
                                <FI label="Fast Charging" name="fast_charging" value={form.fast_charging} onChange={onInput} />
                                <FI label="Connector Type" name="connector" value={form.connector} onChange={onInput} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-8">
                                <FI label="Wireless Charging" name="wireless_charging" value={form.wireless_charging} onChange={onInput} />
                                <FI label="Reverse Charging" name="reverse_charging" value={form.reverse_charging} onChange={onInput} />
                            </div>
                            <div>
                                <h6 className="flex items-center gap-2 text-indigo-700 font-bold text-xs tracking-widest uppercase mb-3 pb-2 border-b border-indigo-100">
                                    <Wifi className="w-4 h-4" /> Connectivity
                                </h6>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-8">
                                    <FI label="SIM Support" name="sim_card" value={form.sim_card} onChange={onInput} />
                                    <FI label="NFC Support" name="nfc" value={form.nfc} onChange={onInput} />
                                    <FI label="Wireless standard" name="wireless_connectivity" value={form.wireless_connectivity} onChange={onInput} />
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'physical' && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-8">
                                <FI label="Length (mm)" name="length_mm" value={form.length_mm} onChange={onInput} type="number" step="0.1" />
                                <FI label="Width (mm)" name="width_mm" value={form.width_mm} onChange={onInput} type="number" step="0.1" />
                                <FI label="Thickness (mm)" name="thickness_mm" value={form.thickness_mm} onChange={onInput} type="number" step="0.1" />
                                <FI label="Weight (g)" name="weight_g" value={form.weight_g} onChange={onInput} type="number" step="0.1" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-8">
                                <FI label="Security Features" name="security_features" value={form.security_features} onChange={onInput} />
                                <FI label="Sensors" name="sensors" value={form.sensors} onChange={onInput} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Package Contents</label>
                                <textarea name="package_contents" value={form.package_contents || ''} onChange={onInput} rows="2" className={IC}></textarea>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'warranty' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-8">
                                <FI label="Warranty (months)" name="warranty_months" value={form.warranty_months} onChange={onInput} type="number" />
                                <FS label="Warranty Type" name="warranty_type" value={form.warranty_type} onChange={onInput} options={[
                                    {v:'MANUFACTURER',l:'Manufacturer'}, 
                                    {v:'STORE',l:'Store'}, 
                                    {v:'UNKNOWN',l:'Unknown'}
                                ]} />
                                <FI label="Warranty Notes" name="warranty_notes" value={form.warranty_notes} onChange={onInput} />
                            </div>
                            <div>
                                <h6 className="flex items-center gap-2 text-indigo-700 font-bold text-xs tracking-widest uppercase mb-4 pb-2 border-b border-indigo-100">
                                    <ToggleLeft className="w-4 h-4" /> Product Status
                                </h6>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-8 mb-8">
                                    <CB label="Active Listing" name="is_active" checked={form.is_active} onChange={onInput} text="Available for sale in catalog" />
                                    <CB label="Discontinued" name="is_discontinued" checked={form.is_discontinued} onChange={onInput} text="By manufacturer (EOL)" />
                                </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-8">
                                    <FI label="Launch Date" name="launch_date" value={form.launch_date} onChange={onInput} type="date" />
                                    <FI label="End of Life Date" name="end_of_life_date" value={form.end_of_life_date} onChange={onInput} type="date" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <ModalFooter>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={saving} 
                        className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : isEdit ? 'Update Phone Model' : 'Add Phone Model'}
                    </button>
                </ModalFooter>
            </form>
        </Modal>
    );
}

export default function SpecsPhones() {
    const { hasAnyPermission } = useAuth();
    const canWrite = hasAnyPermission(['inventory:write', 'inventory:manage']);
    const canDelete = hasAnyPermission(['inventory:delete', 'inventory:manage']);
    const toast = useToast();

    const [allPhones, setAllPhones] = useState([]);
    const [phones, setPhones] = useState([]);
    const [makers, setMakers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [includeInactive, setIncludeInactive] = useState(false);
    const [search, setSearch] = useState('');
    const [maker, setMaker] = useState('');
    const [modal, setModal] = useState(null);
    const searchTimer = useRef(null);

    const fetchPhones = async (inactive = includeInactive) => {
        setLoading(true);
        try {
            const res = await api.get('/phones', { include_inactive: inactive });
            const all = Array.isArray(res.products) ? res.products : [];
            setAllPhones(all);
            setMakers(Array.from(new Set(all.map(p => p?.device_maker).filter(Boolean))).sort());
        } catch {
            toast.error('Failed to load phone catalog');
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { fetchPhones(); }, []);

    useEffect(() => {
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            setPhones(allPhones.filter(p => {
                if (!p || typeof p !== 'object') return false;
                if (maker && p.device_maker !== maker) return false;
                if (search) return Object.values(p).filter(v => v).join(' ').toLowerCase().includes(search.toLowerCase());
                return true;
            }));
        }, 200);
    }, [search, maker, allPhones]);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this product catalog entry? This action cannot be undone.')) return;
        try { 
            await api.del(`/phones/${id}`); 
            toast.success('Product deleted successfully'); 
            fetchPhones(); 
        } catch (e) { 
            toast.error(e.message || 'Failed to delete product'); 
        }
    };

    const handleSaved = (text) => { 
        setModal(null); 
        toast.success(text); 
        fetchPhones(); 
    };

    return (
        <div className="max-w-7xl mx-auto w-full">
            <PageHeader
                title="Phone Catalog"
                subtitle="Manage manufacturer specifications for mobile devices"
                icon={Smartphone}
                action={
                    canWrite && (
                        <button 
                            onClick={() => setModal('new')} 
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" /> Add Phone Model
                        </button>
                    )
                }
            />

            <div className="mb-6 flex flex-wrap gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        placeholder="Search devices, specs, or SKUs..." 
                        className={`${IC.replace('px-3', 'pl-9 pr-3')} w-full`} 
                    />
                </div>
                <select 
                    value={maker} 
                    onChange={e => setMaker(e.target.value)} 
                    className={`${IC} min-w-[180px] w-auto`}
                >
                    <option value="">All Manufacturers</option>
                    {makers.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <div className="flex items-center px-4 bg-white border border-slate-200 rounded-lg">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none">
                        <input 
                            type="checkbox" 
                            checked={includeInactive} 
                            onChange={e => { 
                                setIncludeInactive(e.target.checked); 
                                fetchPhones(e.target.checked); 
                            }} 
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4" 
                        />
                        Include Inactive
                    </label>
                </div>
            </div>

            <Card noPadding>
                {loading ? <Spinner fullPage={false} className="py-16" /> : phones.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-lg font-medium text-slate-500">No products match your filters</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Product Line</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Key Specifications</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600 text-right">MSRP</th>
                                    {(canWrite || canDelete) && (
                                        <th className="px-5 py-3 font-semibold text-slate-600 text-right">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {phones.map((p, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center">
                                                <div className="mr-4 hidden sm:flex w-12 h-12 rounded-xl bg-slate-50 items-center justify-center border border-slate-200 flex-shrink-0 shadow-sm">
                                                    <Smartphone className="text-indigo-400 w-6 h-6" />
                                                </div>
                                                <div>
                                                    <strong className="block text-slate-900 font-semibold">{p.device_name || 'Unknown Device'}</strong>
                                                    <span className="text-slate-500 text-sm font-medium">{p.device_maker || 'Generic'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex flex-col gap-1.5 text-xs">
                                                {p.color && (
                                                    <div className="flex items-center gap-1.5 text-slate-600">
                                                        <Palette className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>{p.color}</span>
                                                    </div>
                                                )}
                                                {(p.device_storage || p.ram || p.rom) && (
                                                    <div className="flex items-center gap-1.5 text-slate-600">
                                                        <MemoryStick className="w-3.5 h-3.5 text-slate-400" />
                                                        <span className="font-mono bg-slate-100 px-1 rounded text-[11px]">
                                                            {[p.device_storage, p.ram, p.rom].filter(Boolean).join(' / ')}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="font-bold text-emerald-600 text-base">
                                                ${parseFloat(p.device_price || 0).toFixed(2)}
                                            </div>
                                        </td>
                                        {(canWrite || canDelete) && (
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {canWrite && (
                                                        <button 
                                                            onClick={() => setModal(p)} 
                                                            className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors" 
                                                            title="Edit Product"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button 
                                                            onClick={() => handleDelete(p.product_id)} 
                                                            className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors" 
                                                            title="Delete Product"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {modal && (
                <PhoneModal 
                    phone={modal === 'new' ? null : modal} 
                    onClose={() => setModal(null)} 
                    onSaved={handleSaved} 
                />
            )}
        </div>
    );
}
