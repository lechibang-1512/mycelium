import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api.js';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { 
    TrendingUp, AlertTriangle, CheckCircle2, 
    PackagePlus, X, LayoutGrid, List, RefreshCw, 
    Zap, Box, Settings 
} from 'lucide-react';

const urgencyColor = { 
    CRITICAL: 'danger', 
    HIGH: 'warning', 
    MEDIUM: 'info', 
    LOW: 'secondary' 
};

const IC = 'block w-full py-2 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors bg-white';

function RecCard({ rec, type, onAction, selected, onToggle }) {
    const isProduct = type === 'reorder';
    const head = isProduct ? `${rec.device_maker || ''} ${rec.device_name || ''}` : rec.part_name || '';
    const uLabel = rec.urgency_level === 'CRITICAL' ? 'CRITICAL' : rec.urgency_level || 'UNKNOWN';
    const isCritical = rec.urgency_level === 'CRITICAL';

    return (
        <label className={`block cursor-pointer bg-white rounded-xl shadow-sm border p-4 relative hover:shadow-md transition-all ${isCritical ? 'border-rose-400' : 'border-slate-200 hover:border-indigo-300'} ${selected ? 'ring-2 ring-indigo-500 border-transparent' : ''}`}>
            <div className="absolute top-4 right-4 z-10">
                <input 
                    type="checkbox" 
                    checked={selected} 
                    onChange={onToggle} 
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 transition-shadow cursor-pointer" 
                />
            </div>
            
            <div className="pr-8 mb-4">
                <h6 className="font-bold text-sm text-slate-900 leading-tight mb-1.5">{head}</h6>
                {!isProduct && rec.part_code && (
                    <code className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mr-2 border border-slate-200 inline-block mb-1.5">
                        {rec.part_code}
                    </code>
                )}
                <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-1">
                    <Box className="w-3.5 h-3.5 text-slate-400" />
                    {rec.warehouse_name || 'All Warehouses'}
                </div>
            </div>
            
            <div className="mb-4">
                <Badge variant={urgencyColor[rec.urgency_level] || 'secondary'}>
                    {isCritical && <AlertTriangle className="w-3 h-3 mr-1 inline -mt-0.5" />}
                    {uLabel}
                </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-100 rounded-lg p-2.5 mb-4">
                <div className="text-center">
                    <span className="text-slate-500 uppercase text-[9px] font-bold tracking-wider block mb-1">Stock</span>
                    <span className={`text-sm font-bold ${parseFloat(rec.current_stock) <= 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                        {rec.current_stock || 0}
                    </span>
                </div>
                <div className="text-center border-l border-r border-slate-200">
                    <span className="text-slate-500 uppercase text-[9px] font-bold tracking-wider block mb-1">Reorder</span>
                    <span className="text-sm font-semibold text-slate-800">{rec.reorder_point || 0}</span>
                </div>
                <div className="text-center">
                    <span className="text-indigo-600 uppercase text-[9px] font-bold tracking-wider block mb-1">Order Qty</span>
                    <span className="text-sm font-bold text-indigo-700">{rec.recommended_quantity || 0}</span>
                </div>
            </div>
            
            {(rec.estimated_stockout_date || rec.supplier_name) && (
                <div className="space-y-1.5 mb-4 px-1">
                    {rec.estimated_stockout_date && (
                        <div className="text-xs flex justify-between">
                            <span className="text-slate-500 font-medium">Est. Stockout:</span>
                            <span className="text-rose-600 font-bold">{rec.estimated_stockout_date?.split('T')[0]}</span>
                        </div>
                    )}
                    {rec.supplier_name && (
                        <div className="text-xs flex justify-between">
                            <span className="text-slate-500 font-medium">Supplier:</span>
                            <span className="text-slate-800 font-semibold truncate pl-2">{rec.supplier_name}</span>
                        </div>
                    )}
                </div>
            )}
            
            <div className="grid grid-cols-5 gap-2 mt-auto pt-2 border-t border-slate-100">
                <button 
                    onClick={(e) => { e.preventDefault(); onAction(rec.recommendation_id, 'ACKNOWLEDGED', type); }} 
                    className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ack
                </button>
                <button 
                    onClick={(e) => { e.preventDefault(); onAction(rec.recommendation_id, 'ORDERED', type); }} 
                    className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm transition-colors"
                >
                    <PackagePlus className="w-3.5 h-3.5" /> Order
                </button>
                <button 
                    onClick={(e) => { e.preventDefault(); onAction(rec.recommendation_id, isProduct ? 'DISMISSED' : 'CANCELLED', type); }} 
                    className="col-span-1 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-rose-600 transition-colors"
                    title="Dismiss"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </label>
    );
}

export default function Recommendations() {
    const [tab, setTab] = useState('reorder');
    const [rawProducts, setRawProducts] = useState([]);
    const [rawParts, setRawParts] = useState([]);
    const [stats, setStats] = useState({});
    const [partsStats, setPartsStats] = useState({});
    const [warehouses, setWarehouses] = useState([]);
    const [filters, setFilters] = useState({ search: '', warehouse_id: '', urgency_level: '', sortBy: 'urgency', showCriticalOnly: false });
    const [viewMode, setViewMode] = useState('card');
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [msg, setMsg] = useState(null);

    const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 5000); };

    const fetchAll = useCallback(async (f = filters) => {
        setLoading(true);
        try {
            const p = {};
            if (f.warehouse_id) p.warehouse_id = f.warehouse_id;
            if (f.urgency_level) p.urgency_level = f.urgency_level;
            const [r1, r2, r3, r4] = await Promise.all([
                api.get('/recommendations/reorder', p).catch(() => ({ data: { data: [] } })),
                api.get('/recommendations/summary', p).catch(() => ({ data: { data: {} } })),
                api.get('/spare-parts/recommendations', p).catch(() => ({ data: { data: [] } })),
                api.get('/spare-parts/recommendations/summary', p).catch(() => ({ data: { data: {} } })),
            ]);
            setRawProducts(r1?.data?.data || []); setStats(r2?.data?.data || {});
            setRawParts(r3?.data?.data || []); setPartsStats(r4?.data?.data || {});
            setSelectedItems(new Set());
        } catch { showMsg('Failed to load recommendations', 'error'); } finally { setLoading(false); }
    }, [filters]);

    useEffect(() => {
        api.get('/warehouses').then(r => setWarehouses(r?.data?.warehouses || r?.data?.data || [])).catch(() => {});
        fetchAll();
    }, []);

    useEffect(() => {
        if (!autoRefresh) return;
        const iv = setInterval(() => fetchAll(), 5 * 60 * 1000);
        return () => clearInterval(iv);
    }, [autoRefresh, fetchAll]);

    const handleFilterChange = (key, val) => {
        const next = { ...filters, [key]: val };
        setFilters(next);
        if (['warehouse_id', 'urgency_level'].includes(key)) fetchAll(next);
    };

    const getFiltered = () => {
        let d = tab === 'reorder' ? [...rawProducts] : [...rawParts];
        const s = filters.search.toLowerCase();
        if (s) d = d.filter(r => [(r.device_name || r.part_name), r.device_maker, r.part_code, r.warehouse_name].filter(Boolean).join(' ').toLowerCase().includes(s));
        if (filters.showCriticalOnly) d = d.filter(r => r.urgency_level === 'CRITICAL');
        const urgOrd = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        if (filters.sortBy === 'urgency') d.sort((a, b) => (urgOrd[b.urgency_level] || 0) - (urgOrd[a.urgency_level] || 0));
        else if (filters.sortBy === 'quantity') d.sort((a, b) => parseFloat(b.recommended_quantity || 0) - parseFloat(a.recommended_quantity || 0));
        else if (filters.sortBy === 'current_stock') d.sort((a, b) => parseFloat(a.current_stock || 0) - parseFloat(b.current_stock || 0));
        return d;
    };

    const updateStatus = async (id, status, type) => {
        try {
            if (type === 'reorder') await api.put(`/recommendations/${id}/status`, { status });
            else await api.put(`/spare-parts/recommendations/${id}/status`, { status });
            showMsg(`Status updated to ${status}`);
            fetchAll();
        } catch (e) { showMsg(e.response?.data?.error || 'Failed to update', 'error'); }
    };

    const handleBulkAction = async (action) => {
        if (selectedItems.size === 0) return;
        if (!window.confirm(`Bulk act on ${selectedItems.size} items?`)) return;
        await Promise.allSettled(Array.from(selectedItems).map(id => tab === 'reorder' ? api.put(`/recommendations/${id}/status`, { status: action }) : api.put(`/spare-parts/recommendations/${id}/status`, { status: action })));
        showMsg(`Bulk action completed`); fetchAll();
    };

    const handleGenerate = async () => {
        if (!window.confirm('Run AI engine to generate recommendations for all stock?')) return;
        setGenerating(true);
        try {
            const [pr, sp] = await Promise.all([api.post('/recommendations/generate', { recalculate_usage: true }), api.post('/spare-parts/recommendations/generate', { recalculate_usage: true })]);
            showMsg(`Analysis complete. Found ${pr?.data?.count || 0} product and ${sp?.data?.count || 0} spare part alerts.`);
            fetchAll();
        } catch (err) { showMsg(err.response?.data?.error || 'Failed to generate', 'error'); } finally { setGenerating(false); }
    };

    const toggleSelect = (id) => setSelectedItems(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
    const toggleAll = () => { const d = getFiltered(); setSelectedItems(prev => prev.size === d.length ? new Set() : new Set(d.map(r => r.recommendation_id))); };

    const filtered = getFiltered();
    const tCrit = (stats.criticalCount || 0) + (partsStats.criticalCount || 0);
    const tHigh = (stats.highPriorityCount || 0) + (partsStats.highCount || 0);
    const tPend = (stats.reorderCount || 0) + (partsStats.pendingCount || 0);

    return (
        <div className="max-w-7xl mx-auto w-full">
            <PageHeader
                title="Purchasing Recommendations"
                subtitle="AI-powered reorder alerts based on turnover rates and stock levels"
                icon={TrendingUp}
                action={
                    <div className="flex items-center gap-3">
                        <label className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer bg-white border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors shadow-sm">
                            <input 
                                type="checkbox" 
                                checked={autoRefresh} 
                                onChange={e => setAutoRefresh(e.target.checked)} 
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4" 
                            />
                            Auto-refresh
                        </label>
                        <button 
                            onClick={handleGenerate} 
                            disabled={generating} 
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-white" />}
                            {generating ? 'Analyzing...' : 'Run Analysis'}
                        </button>
                    </div>
                }
            />

            {msg && (
                <div className={`mb-6 flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium shadow-sm transition-all ${msg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                    <span className="flex items-center gap-2">
                        {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600"/> : <AlertTriangle className="w-5 h-5 text-rose-600"/>}
                        {msg.text}
                    </span>
                    <button onClick={() => setMsg(null)} className="opacity-60 hover:opacity-100 transition-opacity"><X className="w-5 h-5"/></button>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[
                    { l: 'Critical Stockouts', v: tCrit, c: 'text-rose-600', b: 'bg-rose-50 border-rose-200' }, 
                    { l: 'High Priority', v: tHigh, c: 'text-amber-600', b: 'bg-amber-50 border-amber-200' }, 
                    { l: 'Total Pending', v: tPend, c: 'text-indigo-600', b: 'bg-indigo-50 border-indigo-200' }
                ].map((s) => (
                    <Card key={s.l} noPadding className={`border ${s.b}`}>
                        <div className="p-5 text-center">
                            <div className={`text-4xl font-black mb-1 ${s.c}`}>{s.v}</div>
                            <div className="text-slate-600 font-semibold text-sm uppercase tracking-wider">{s.l}</div>
                        </div>
                    </Card>
                ))}
            </div>

            <Card className="mb-6">
                <div className="p-1 flex flex-col md:flex-row gap-4 items-center">
                    <input 
                        value={filters.search} 
                        onChange={e => handleFilterChange('search', e.target.value)} 
                        placeholder="Filter list..." 
                        className={`flex-1 ${IC}`} 
                    />
                    <select value={filters.warehouse_id} onChange={e => handleFilterChange('warehouse_id', e.target.value)} className={`md:w-48 ${IC}`}>
                        <option value="">All Warehouses</option>
                        {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>)}
                    </select>
                    <select value={filters.sortBy} onChange={e => handleFilterChange('sortBy', e.target.value)} className={`md:w-48 ${IC}`}>
                        <option value="urgency">Sort by: Urgency</option>
                        <option value="quantity">Sort by: Req. Quantity</option>
                        <option value="current_stock">Sort by: Stock Level</option>
                    </select>
                    
                    <div className="flex items-center gap-4 border-l border-slate-200 pl-4">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none">
                            <input type="checkbox" checked={filters.showCriticalOnly} onChange={e => handleFilterChange('showCriticalOnly', e.target.checked)} className="rounded border-slate-300 text-rose-600 focus:ring-rose-600 w-4 h-4" />
                            <span className="text-rose-700">Critical Alerts Only</span>
                        </label>
                        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button onClick={() => setViewMode('card')} className={`rounded px-2.5 py-1.5 transition-colors ${viewMode === 'card' ? 'bg-white text-indigo-600 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-900'}`}><LayoutGrid className="w-4 h-4"/></button>
                            <button onClick={() => setViewMode('table')} className={`rounded px-2.5 py-1.5 transition-colors ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-900'}`}><List className="w-4 h-4"/></button>
                        </div>
                    </div>
                </div>
            </Card>

            {selectedItems.size > 0 && (
                <div className="sticky top-20 z-20 bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3 mb-6 flex flex-wrap items-center gap-4 shadow-md w-full max-w-7xl">
                    <span className="text-sm font-semibold text-indigo-800 bg-white px-2 py-1 rounded-md border border-indigo-100">
                        {selectedItems.size} items selected
                    </span>
                    <div className="flex gap-2">
                        <button onClick={() => handleBulkAction('ACKNOWLEDGED')} className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors shadow-sm"><CheckCircle2 className="w-4 h-4"/> Acknowledge</button>
                        <button onClick={() => handleBulkAction('ORDERED')} className="flex items-center gap-1.5 rounded-lg border border-indigo-600 bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"><PackagePlus className="w-4 h-4"/> Mark Ordered</button>
                    </div>
                    <button onClick={() => setSelectedItems(new Set())} className="ml-auto text-sm font-medium text-indigo-400 hover:text-indigo-600 transition-colors underline">Clear Selection</button>
                </div>
            )}

            <Card noPadding>
                {/* Tabs */}
                <div className="flex border-b border-slate-200 bg-slate-50 px-2 pt-2 rounded-t-xl overflow-x-auto custom-scrollbar">
                    <button 
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-all whitespace-nowrap ${tab === 'reorder' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`} 
                        onClick={() => { setTab('reorder'); setSelectedItems(new Set()); }}
                    >
                        <Box className={`w-4 h-4 ${tab === 'reorder' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        Finished Products 
                        <span className={`ml-1.5 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${tab === 'reorder' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>{rawProducts.length} pending</span>
                    </button>
                    <button 
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-all whitespace-nowrap ${tab === 'spare-parts' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`} 
                        onClick={() => { setTab('spare-parts'); setSelectedItems(new Set()); }}
                    >
                        <Settings className={`w-4 h-4 ${tab === 'spare-parts' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        Spare Parts
                        <span className={`ml-1.5 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${tab === 'spare-parts' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>{rawParts.length} pending</span>
                    </button>
                </div>

                <div className="p-4 sm:p-6 bg-slate-50/50">
                    {loading ? <Spinner fullPage={false} className="py-20" /> : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h5 className="font-bold text-lg text-slate-700">All Stock Levels Healthy</h5>
                            <p className="text-sm font-medium mt-1">No pending recommendations matching your criteria.</p>
                        </div>
                    ) : viewMode === 'card' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {filtered.map(r => <RecCard key={r.recommendation_id} rec={r} type={tab} onAction={updateStatus} selected={selectedItems.has(r.recommendation_id)} onToggle={() => toggleSelect(r.recommendation_id)} />)}
                        </div>
                    ) : (
                        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 w-10 text-center"><input type="checkbox" onChange={toggleAll} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer w-4 h-4" /></th>
                                        {[tab === 'reorder' ? 'Product' : 'Spare Part','Location','Curr. Stock','Reorder Pt','Order Qty','Urgency Level','Required By','Quick Actions'].map(h => (
                                            <th key={h} className="px-4 py-3 font-semibold text-slate-600">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {filtered.map(r => {
                                        const isCritical = r.urgency_level === 'CRITICAL';
                                        return (
                                            <tr key={r.recommendation_id} className={`hover:bg-slate-50 transition-colors ${selectedItems.has(r.recommendation_id) ? 'bg-indigo-50/50' : ''}`}>
                                                <td className="px-4 py-3 text-center"><input type="checkbox" checked={selectedItems.has(r.recommendation_id)} onChange={() => toggleSelect(r.recommendation_id)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer w-4 h-4" /></td>
                                                <td className="px-4 py-3">
                                                    <strong className="text-slate-900 block">{tab === 'reorder' ? `${r.device_maker || ''} ${r.device_name || ''}` : r.part_name || ''}</strong>
                                                    {tab !== 'reorder' && r.part_code && <code className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1 py-0.5 rounded border border-slate-200">{r.part_code}</code>}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 font-medium">{r.warehouse_name || 'All'}</td>
                                                <td className={`px-4 py-3 text-right font-bold ${parseFloat(r.current_stock) <= 0 ? 'text-rose-600' : 'text-slate-700'}`}>{r.current_stock || 0}</td>
                                                <td className="px-4 py-3 text-right text-slate-500 font-medium">{r.reorder_point || 0}</td>
                                                <td className="px-4 py-3 text-right font-bold text-indigo-600 bg-indigo-50/50">{r.recommended_quantity || 0}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge variant={urgencyColor[r.urgency_level] || 'secondary'}>
                                                        {isCritical && <AlertTriangle className="w-3 h-3 mr-1 inline -mt-0.5" />}
                                                        {r.urgency_level || 'UNKNOWN'}
                                                    </Badge>
                                                </td>
                                                <td className={`px-4 py-3 font-semibold text-right ${r.estimated_stockout_date ? 'text-rose-600' : 'text-slate-400'}`}>{r.estimated_stockout_date ? r.estimated_stockout_date.split('T')[0] : '—'}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2">
                                                        <button onClick={() => updateStatus(r.recommendation_id, 'ACKNOWLEDGED', tab)} className="p-1.5 rounded-md border border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors" title="Acknowledge"><CheckCircle2 className="w-4 h-4" /></button>
                                                        <button onClick={() => updateStatus(r.recommendation_id, 'ORDERED', tab)} className="p-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors" title="Mark Ordered"><PackagePlus className="w-4 h-4" /></button>
                                                        <button onClick={() => updateStatus(r.recommendation_id, tab === 'reorder' ? 'DISMISSED' : 'CANCELLED', tab)} className="p-1.5 rounded-md border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors" title="Dismiss"><X className="w-4 h-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
