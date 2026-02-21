import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api.js';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Smartphone, Search, RefreshCw, AlertTriangle, Inbox } from 'lucide-react';

const LIMIT = 50;

import { getStatusVariant, getDeviceConditionVariant as getConditionVariant } from '../utils/formatters.js';

export default function DeviceInventory() {
    const [devices, setDevices] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const searchTimer = useRef(null);

    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get('/serialized-inventory/stats');
            setStats(res?.data || res);
        } catch (e) { console.error(e); }
    }, []);

    const fetchDevices = useCallback(async (pg = page) => {
        setLoading(true);
        setError(null);
        try {
            const params = { limit: LIMIT, offset: (pg - 1) * LIMIT };
            if (search) params.search = search;
            if (status) params.status = status;
            const res = await api.get('/serialized-inventory/devices', params);
            const data = res?.data?.data || res?.data || res || [];
            setDevices(Array.isArray(data) ? data : []);
        } catch (_e) {
            setError('Failed to load devices');
        } finally {
            setLoading(false);
        }
    }, [search, status, page]);

    useEffect(() => { fetchStats(); }, []);
    
    useEffect(() => {
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => { setPage(1); fetchDevices(1); }, 300);
        return () => clearTimeout(searchTimer.current);
    }, [search, status]);
    
    useEffect(() => { fetchDevices(page); }, [page]);

    const byStatus = stats?.byStatus || {};

    return (
        <div className="max-w-7xl mx-auto w-full">
            <PageHeader
                title="Device Inventory"
                subtitle="Serialized device tracking by IMEI across all warehouses"
                icon={Smartphone}
                action={
                    <button 
                        onClick={() => { fetchStats(); fetchDevices(page); }} 
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm focus:ring-2 focus:ring-indigo-100"
                    >
                        <RefreshCw className="w-4 h-4 text-slate-500" />
                        Refresh
                    </button>
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Devices', val: stats?.devices || 0, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
                    { label: 'Available', val: byStatus.available || 0, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
                    { label: 'Reserved', val: byStatus.reserved || 0, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                    { label: 'In Repair', val: byStatus.in_repair || 0, color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200' },
                ].map((s, i) => (
                    <Card key={i} className={`border-l-4 ${s.bg}`}>
                        <div className="p-4 text-center">
                            <h3 className={`text-3xl font-bold ${s.color}`}>{s.val}</h3>
                            <small className="text-slate-600 font-medium block mt-1">{s.label}</small>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <Card className="mb-6 p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <input 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            placeholder="Search by IMEI, model, or specs..." 
                            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors bg-slate-50 placeholder:text-slate-400" 
                        />
                    </div>
                    <select 
                        value={status} 
                        onChange={e => setStatus(e.target.value)} 
                        className="block w-full sm:w-48 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors bg-slate-50 text-slate-700"
                    >
                        <option value="">All Statuses</option>
                        {['available', 'reserved', 'sold', 'in_repair', 'disposed'].map(s => (
                            <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                        ))}
                    </select>
                </div>
            </Card>

            {error && (
                <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 font-medium flex items-center gap-3 shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    {error}
                </div>
            )}

            {/* Table */}
            <Card noPadding>
                {loading ? (
                    <Spinner message="Loading serialized devices..." fullPage />
                ) : devices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <Inbox className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium text-slate-500">No devices found matching your criteria</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {['IMEI 1', 'Model', 'Specs', 'Status', 'Condition', 'Location'].map(h => (
                                        <th key={h} className="px-6 py-4 font-semibold text-slate-600 tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {devices.map((d, idx) => {
                                    const loc = [d.warehouse_name || 'Unknown', d.zone_name, d.bin_name].filter(Boolean).join(' › ');
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-indigo-600 font-medium">{d.imei_1}</td>
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-slate-900">{d.model_name || 'Unknown'}</p>
                                                {d.manufacturer && <p className="text-xs font-medium text-slate-500">{d.manufacturer}</p>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {d.color && <span className="inline-flex items-center px-2 py-0.5 rounded text-[0.65rem] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">{d.color}</span>}
                                                    <span className="text-slate-600 font-medium text-xs">
                                                        {(d.ram || d.rom) ? `${d.ram || '?'} / ${d.rom || '?'}` : '—'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={getStatusVariant(d.status)}>
                                                    {(d.status || '').replace('_', ' ').toUpperCase()}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={getConditionVariant(d.condition_grade)}>
                                                    {(d.condition_grade || '').toUpperCase()}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-slate-500 font-medium text-xs truncate max-w-[200px] block" title={loc}>{loc}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
                    <span className="text-sm font-medium text-slate-500">Showing {devices.length} devices (Page {page})</span>
                    <div className="flex gap-2">
                        <button 
                            disabled={page === 1} 
                            onClick={() => setPage(p => p - 1)} 
                            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-white transition-colors bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-100"
                        >
                            Previous
                        </button>
                        <span className="rounded-lg bg-indigo-600 text-white font-semibold px-4 py-2 text-sm shadow-sm">{page}</span>
                        <button 
                            disabled={devices.length < LIMIT} 
                            onClick={() => setPage(p => p + 1)} 
                            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-white transition-colors bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-100"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
