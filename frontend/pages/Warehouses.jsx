import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api.js';
import { formatNumber } from '../utils/formatters.js';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Warehouse, MapPin, Box, Database, Package } from 'lucide-react';

export default function Warehouses() {
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const result = await api.get('/warehouses');
                setWarehouses(result.warehouses || result.data?.warehouses || []);
            } catch (err) {
                setError('Failed to load warehouses');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    return (
        <div className="max-w-7xl mx-auto w-full">
            <PageHeader
                title="Warehouses"
                subtitle="Manage physical storage locations, zones, and bins"
                icon={Warehouse}
            />

            {error && (
                <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 font-medium shadow-sm">
                    {error}
                </div>
            )}

            {loading ? (
                <Spinner message="Loading warehouses..." fullPage />
            ) : warehouses.length === 0 ? (
                <Card noPadding>
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <Warehouse className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium text-slate-500">No warehouses configured</p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {warehouses.map(w => (
                        <Link
                            key={w.warehouse_id}
                            to={`/warehouses/${w.warehouse_id}`}
                            className="block no-underline group"
                        >
                            <Card className="h-full border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-200 group-hover:-translate-y-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h5 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">
                                            {w.name}
                                        </h5>
                                        {w.location && (
                                            <div className="flex items-center text-slate-500 text-sm mt-1">
                                                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                                {w.location}
                                            </div>
                                        )}
                                    </div>
                                    <Badge variant={w.is_active ? 'success' : 'secondary'}>
                                        {w.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-lg p-3 border border-slate-100">
                                    <div className="text-center">
                                        <div className="flex justify-center mb-1"><Box className="w-4 h-4 text-indigo-500" /></div>
                                        <div className="font-bold text-slate-900">{formatNumber(w.total_bins || 0, 'en', 0)}</div>
                                        <small className="text-slate-500 font-medium text-[10px] uppercase">Bins</small>
                                    </div>
                                    <div className="text-center border-l border-r border-slate-200">
                                        <div className="flex justify-center mb-1"><Database className="w-4 h-4 text-emerald-500" /></div>
                                        <div className="font-bold text-slate-900">{formatNumber(w.total_capacity || 0, 'en', 0)}</div>
                                        <small className="text-slate-500 font-medium text-[10px] uppercase">Capacity</small>
                                    </div>
                                    <div className="text-center">
                                        <div className="flex justify-center mb-1"><Package className="w-4 h-4 text-amber-500" /></div>
                                        <div className="font-bold text-slate-900">{formatNumber(w.total_products || w.unique_products || 0, 'en', 0)}</div>
                                        <small className="text-slate-500 font-medium text-[10px] uppercase">Products</small>
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
