import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api.js';
import { formatKPI, formatCurrency, formatNumber, getStatusColor } from '../utils/formatters.js';
import { useToast } from '../contexts/ToastContext.jsx';
import { Card, CardHeader, CardContent } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { LayoutDashboard, Boxes, Coins, AlertTriangle, Wrench, RotateCcw, TrendingUp, Warehouse } from 'lucide-react';

export default function Dashboard() {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState({
        kpis: null,
        trend: [],
        util: [],
        service: {}
    });

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [kpisRes, trendRes, utilRes, serviceRes] = await Promise.all([
                    api.get('/dashboard/kpis'),
                    api.get('/dashboard/stock-trend', { days: 7 }),
                    api.get('/dashboard/warehouse-util'),
                    api.get('/dashboard/service-summary'),
                ]);

                setData({
                    kpis: kpisRes?.data || {},
                    trend: trendRes?.data || [],
                    util: utilRes?.data || [],
                    service: serviceRes?.data || {}
                });
            } catch (err) {
                console.error('Dashboard fetch error:', err);
                setError('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const renderKPIs = () => {
        const kpis = data.kpis;
        const cards = [
            { icon: Boxes, color: 'text-indigo-600', bg: 'bg-indigo-100', value: formatKPI(kpis?.total_skus || 0), label: 'Total SKUs' },
            { icon: Boxes, color: 'text-emerald-600', bg: 'bg-emerald-100', value: formatKPI(kpis?.total_stock_quantity || 0), label: 'Items in Stock' },
            { icon: Coins, color: 'text-amber-600', bg: 'bg-amber-100', value: formatCurrency(kpis?.total_stock_value || 0), label: 'Stock Value' },
            { icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-100', value: formatKPI(kpis?.low_stock_count || 0), label: 'Low Stock', href: '/recommendations' },
            { icon: Wrench, color: 'text-cyan-600', bg: 'bg-cyan-100', value: formatKPI(kpis?.pending_repairs || 0), label: 'Pending Repairs', href: '/service' },
            { icon: RotateCcw, color: 'text-slate-600', bg: 'bg-slate-100', value: formatKPI(kpis?.open_rmas || 0), label: 'Open RMAs', href: '/service' },
        ];

        return cards.map((c, idx) => {
            const CardWrapper = c.href ? Link : 'div';
            const hoverClass = c.href ? ' hover:shadow-md transition-shadow' : '';
            const Icon = c.icon;
            
            return (
                <CardWrapper key={idx} to={c.href} className={`block no-underline ${hoverClass}`}>
                    <Card className="h-full border-none shadow-sm ring-1 ring-slate-200">
                        <CardContent className="p-4 sm:p-5 flex flex-col items-center text-center">
                            <div className={`w-12 h-12 rounded-full ${c.bg} flex items-center justify-center mb-3`}>
                                <Icon className={`w-6 h-6 ${c.color}`} strokeWidth={2.5} />
                            </div>
                            <h3 className="font-bold text-2xl text-slate-900 mb-1">{c.value}</h3>
                            <span className="text-sm font-medium text-slate-500">{c.label}</span>
                        </CardContent>
                    </Card>
                </CardWrapper>
            );
        });
    };

    const renderStockTrend = () => {
        if (!data.trend || data.trend.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                    <TrendingUp className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm font-medium">No stock movements in the last 7 days</p>
                </div>
            );
        }

        const maxVal = Math.max(...data.trend.map(d => Math.max(d.inbound, d.outbound)), 1);
        const barW = data.trend.length > 0 ? Math.floor(280 / data.trend.length) : 40;

        return (
            <div className="flex flex-col h-full">
                <svg viewBox="0 0 320 160" className="w-full h-48 drop-shadow-sm">
                    <text x="0" y="15" fontSize="10" className="fill-slate-400 font-medium">{formatNumber(maxVal, 'en', 0)}</text>
                    <text x="0" y="135" fontSize="10" className="fill-slate-400 font-medium">0</text>
                    
                    {/* Grid lines */}
                    <line x1="30" y1="20" x2="320" y2="20" className="stroke-slate-100" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="30" y1="75" x2="320" y2="75" className="stroke-slate-100" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="30" y1="130" x2="320" y2="130" className="stroke-slate-200" strokeWidth="1" />
                    
                    {data.trend.map((d, i) => {
                        const x = 35 + i * barW;
                        const inH = (d.inbound / maxVal) * 100;
                        const outH = (d.outbound / maxVal) * 100;
                        const bw = Math.max(barW / 2 - 3, 4);
                        const dateLabel = new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' });
                        
                        return (
                            <g key={i} className="group">
                                {/* Invisible hover target for tooltips could go here */}
                                <rect x={x} y={130 - inH} width={bw} height={inH} className="fill-emerald-500 hover:fill-emerald-400 transition-colors cursor-pointer" rx="2"><title>Inbound: {d.inbound}</title></rect>
                                <rect x={x + bw + 2} y={130 - outH} width={bw} height={outH} className="fill-rose-500 hover:fill-rose-400 transition-colors cursor-pointer" rx="2"><title>Outbound: {d.outbound}</title></rect>
                                <text x={x + bw} y="150" fontSize="9" className="fill-slate-500 font-medium" textAnchor="middle">{dateLabel}</text>
                            </g>
                        );
                    })}
                </svg>
                <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="text-xs font-semibold text-slate-600">Inbound</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                        <span className="text-xs font-semibold text-slate-600">Outbound</span>
                    </div>
                </div>
            </div>
        );
    };

    const renderWarehouseUtil = () => {
        if (!data.util || data.util.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                    <Warehouse className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm font-medium">No warehouses found</p>
                </div>
            );
        }

        return (
            <div className="space-y-5">
                {data.util.map((w, idx) => {
                    const pct = w.utilization_pct || 0;
                    const isHigh = pct > 80;
                    const isMed = pct > 50;
                    
                    const barColor = isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500';
                    const badgeVariant = isHigh ? 'danger' : isMed ? 'warning' : 'success';
                    
                    return (
                        <div key={idx} className="group">
                            <div className="flex justify-between items-center mb-2">
                                <Link to={`/warehouses?id=${w.warehouse_id}`} className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors flex items-center gap-2">
                                    {w.warehouse_name}
                                </Link>
                                <Badge variant={badgeVariant}>{pct}% Utilized</Badge>
                            </div>
                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                <div className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                            </div>
                            <div className="mt-1.5 flex justify-between text-xs font-medium text-slate-500">
                                <span>{w.used_bins}/{w.total_bins} active bins</span>
                                <span>{formatNumber(w.used_capacity, 'en', 0)}/{formatNumber(w.total_capacity, 'en', 0)} items</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderBadges = (items) => {
        if (!items || items.length === 0) {
            return <p className="text-slate-400 text-sm italic py-2">No active records</p>;
        }
        return (
            <div className="flex flex-wrap gap-2">
                {items.map((r, idx) => (
                    <Badge key={idx} variant={getStatusColor(r.status)}>
                        {r.status}: {r.count}
                    </Badge>
                ))}
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto w-full">
            <PageHeader
                title="Dashboard"
                subtitle="Overview of your inventory operations"
                icon={LayoutDashboard}
            />

            {loading && <Spinner message="Loading dashboard..." fullPage />}

            {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 font-medium mb-6 flex items-center gap-3 shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    {error}
                </div>
            )}

            {!loading && !error && (
                <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        {renderKPIs()}
                    </div>

                    {/* Main Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader 
                                title="Stock Movement" 
                                subtitle="Last 7 Days (Inbound vs Outbound)"
                                action={<div className="p-2 bg-indigo-50 rounded-lg"><TrendingUp className="w-5 h-5 text-indigo-600" /></div>}
                            />
                            <CardContent>
                                {renderStockTrend()}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader 
                                title="Warehouse Utilization" 
                                subtitle="Capacity usage across active locations"
                                action={<div className="p-2 bg-emerald-50 rounded-lg"><Warehouse className="w-5 h-5 text-emerald-600" /></div>}
                            />
                            <CardContent>
                                {renderWarehouseUtil()}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Service Summary Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader 
                                title="Repair Jobs" 
                                subtitle="Current status of all open repair tickets"
                                action={<div className="p-2 bg-cyan-50 rounded-lg"><Wrench className="w-5 h-5 text-cyan-600" /></div>}
                            />
                            <CardContent>
                                {renderBadges(data.service?.repairs)}
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader 
                                title="RMA Status" 
                                subtitle="Return processing pipeline"
                                action={<div className="p-2 bg-slate-100 rounded-lg"><RotateCcw className="w-5 h-5 text-slate-600" /></div>}
                            />
                            <CardContent>
                                {renderBadges(data.service?.rmas)}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
