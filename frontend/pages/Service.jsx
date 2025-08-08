import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api.js';
import { formatCurrency } from '../utils/formatters.js';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Wrench, Undo2, Search, Settings } from 'lucide-react';

const getStatusVariant = (st) => {
    const s = (st || '').toLowerCase();
    if (s.includes('pending')) return 'secondary';
    if (s.includes('ordered') || s.includes('awaiting_return')) return 'warning';
    if (s.includes('progress') || s.includes('processing')) return 'primary';
    if (s.includes('completed') || s.includes('resolved') || s.includes('closed')) return 'success';
    if (s.includes('cancelled')) return 'danger';
    return 'secondary';
};

const getPriorityVariant = (p) => {
    const pr = (p || '').toLowerCase();
    if (pr === 'low') return 'secondary';
    if (pr === 'medium' || pr === 'normal') return 'info';
    if (pr === 'high') return 'warning';
    if (pr === 'urgent' || pr === 'critical') return 'danger';
    return 'secondary';
};

const IC = 'block w-full py-2 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors bg-white';

function RepairsPanel() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const t = useRef(null);

    const load = async (s = search, st = status) => {
        setLoading(true);
        try {
            const p = {};
            if (s) p.search = s;
            if (st) p.status = st;
            const res = await api.get('/repair-jobs', p);
            setData(Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []));
        } catch (e) {
            console.error(e);
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleSearch = (v) => { setSearch(v); clearTimeout(t.current); t.current = setTimeout(() => load(v, status), 300); };
    const handleStatus = (v) => { setStatus(v); load(search, v); };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                        value={search} 
                        onChange={e => handleSearch(e.target.value)} 
                        placeholder="Search repairs by job, IMEI, or customer..." 
                        className={`pl-10 ${IC}`} 
                    />
                </div>
                <div className="w-full sm:w-48">
                    <select value={status} onChange={e => handleStatus(e.target.value)} className={IC}>
                        <option value="">All Statuses</option>
                        {['PENDING','PARTS_ORDERED','IN_PROGRESS','COMPLETED','CANCELLED'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                </div>
            </div>
            
            <Card noPadding>
                {loading ? <Spinner fullPage={false} className="py-12" /> : data.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <Wrench className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-lg font-medium">No repair jobs found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {['Job #','Device','IMEI/Serial','Customer','Status','Priority','Est. Cost'].map(h => (
                                        <th key={h} className="px-5 py-3 font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {data.map((j, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-3"><code className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold border border-slate-200">{j.job_number}</code></td>
                                        <td className="px-5 py-3">
                                            <div className="font-semibold text-slate-900">{j.device_name || 'Unknown'}</div>
                                            {j.device_maker && <div className="text-xs font-medium text-slate-500 mt-0.5">{j.device_maker}</div>}
                                        </td>
                                        <td className="px-5 py-3">
                                            {j.device_imei && <div className="text-xs text-slate-600"><span className="text-slate-400 mr-1">IMEI:</span> {j.device_imei}</div>}
                                            {j.device_serial_number && <div className="text-xs text-slate-600 mt-0.5"><span className="text-slate-400 mr-1">S/N:</span> {j.device_serial_number}</div>}
                                            {!j.device_imei && !j.device_serial_number && <span className="text-slate-400">-</span>}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="font-medium text-slate-800">{j.customer_name || '-'}</div>
                                            {j.customer_phone && <div className="text-xs text-slate-500 mt-0.5">{j.customer_phone}</div>}
                                        </td>
                                        <td className="px-5 py-3">
                                            <Badge variant={getStatusVariant(j.status)}>{(j.status || '').replace(/_/g, ' ')}</Badge>
                                        </td>
                                        <td className="px-5 py-3">
                                            <Badge variant={getPriorityVariant(j.priority)}>{j.priority}</Badge>
                                        </td>
                                        <td className="px-5 py-3 font-semibold text-slate-700">{formatCurrency(j.estimated_cost || 0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}

function RMAPanel() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const t = useRef(null);

    const load = async (s = search, st = status) => {
        setLoading(true);
        try {
            const p = {};
            if (s) p.search = s;
            if (st) p.status = st;
            const res = await api.get('/rma', p);
            setData(Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []));
        } catch (e) {
            console.error(e);
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleSearch = (v) => { setSearch(v); clearTimeout(t.current); t.current = setTimeout(() => load(v, status), 300); };
    const handleStatus = (v) => { setStatus(v); load(search, v); };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                        value={search} 
                        onChange={e => handleSearch(e.target.value)} 
                        placeholder="Search RMAs..." 
                        className={`pl-10 ${IC}`} 
                    />
                </div>
                <div className="w-full sm:w-48">
                    <select value={status} onChange={e => handleStatus(e.target.value)} className={IC}>
                        <option value="">All Statuses</option>
                        {['pending','awaiting_return','processing','resolved','closed'].map(s => <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>)}
                    </select>
                </div>
            </div>
            
            <Card noPadding>
                {loading ? <Spinner fullPage={false} className="py-12" /> : data.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <Undo2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-lg font-medium">No RMAs found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {['RMA #','Customer','Warehouse','Status','Priority','Value'].map(h => (
                                        <th key={h} className="px-5 py-3 font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {data.map((r, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-3">
                                            <strong className="text-slate-900 block">{r.rma_number}</strong>
                                            <code className="text-[10px] text-slate-400 font-medium">{r.rma_id}</code>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="font-medium text-slate-800">{r.customer_name || '-'}</div>
                                            {r.customer_email && <div className="text-xs text-slate-500 mt-0.5">{r.customer_email}</div>}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="font-semibold text-slate-700">{r.warehouse_name || '-'}</div>
                                            {r.warehouse_location && <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">{r.warehouse_location}</div>}
                                        </td>
                                        <td className="px-5 py-3">
                                            <Badge variant={getStatusVariant(r.status)}>{(r.status || '').replace(/_/g, ' ').toUpperCase()}</Badge>
                                        </td>
                                        <td className="px-5 py-3">
                                            <Badge variant={getPriorityVariant(r.priority)}>{r.priority}</Badge>
                                        </td>
                                        <td className="px-5 py-3 font-semibold text-slate-700">{formatCurrency(r.total_value || 0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}

export default function Service() {
    const [tab, setTab] = useState('repairs');

    return (
        <div className="max-w-7xl mx-auto w-full">
            <PageHeader
                title="Service Center"
                subtitle="Track hardware repairs and process return merchandise authorizations (RMA)"
                icon={Settings}
            />

            <Card noPadding>
                {/* Tabs Header */}
                <div className="flex border-b border-slate-200 bg-slate-50 px-2 pt-2">
                    <button 
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${tab === 'repairs' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`} 
                        onClick={() => setTab('repairs')}
                    >
                        <Wrench className={`w-4 h-4 ${tab === 'repairs' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        Repairs
                    </button>
                    <button 
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${tab === 'rma' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`} 
                        onClick={() => setTab('rma')}
                    >
                        <Undo2 className={`w-4 h-4 ${tab === 'rma' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        RMA (Returns)
                    </button>
                </div>
                
                {/* Panel Content */}
                <div className="p-4 sm:p-6 bg-slate-50/50">
                    {tab === 'repairs' ? <RepairsPanel /> : <RMAPanel />}
                </div>
            </Card>
        </div>
    );
}
