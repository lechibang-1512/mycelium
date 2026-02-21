import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { formatDate, getStatusVariant } from '../utils/formatters.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Monitor, Plus, Pencil, Trash2 } from 'lucide-react';

export default function PCBuilds() {
    const navigate = useNavigate();
    const { hasAnyPermission } = useAuth();
    const canWrite = hasAnyPermission(['inventory:write', 'inventory:manage']);
    const canDelete = hasAnyPermission(['inventory:delete', 'inventory:manage']);

    const [builds, setBuilds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchBuilds = async () => {
        setLoading(true); setError(null);
        try {
            const res = await api.get('/pc-builds');
            setBuilds(res || []);
        } catch (e) { setError(e.message || 'Failed to load builds'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchBuilds(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this PC build?')) return;
        try { 
            await api.del(`/pc-builds/${id}`); 
            fetchBuilds(); 
        } catch (e) { 
            alert(e.message || 'Failed to delete'); 
        }
    };

    return (
        <div className="max-w-7xl mx-auto w-full">
            <PageHeader
                title="PC Builds"
                subtitle="Manage configurations, assemblies, and custom workstation builds"
                icon={Monitor}
                action={
                    canWrite && (
                        <button 
                            onClick={() => navigate('/pc-build-form')} 
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" /> New Build
                        </button>
                    )
                }
            />

            <Card noPadding>
                {loading ? <Spinner fullPage={false} className="py-16" /> : error ? (
                    <div className="text-center py-12 text-rose-600 font-medium">{error}</div>
                ) : builds.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <Monitor className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-lg font-medium text-slate-500">No PC builds found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Name</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Purpose</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Status</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Created</th>
                                    {(canWrite || canDelete) && <th className="px-5 py-3 font-semibold text-slate-600 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {builds.map((b) => (
                                    <tr key={b.build_id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-4 font-semibold text-slate-900">{b.name}</td>
                                        <td className="px-5 py-4 text-slate-600">{b.build_purpose || '-'}</td>
                                        <td className="px-5 py-4">
                                            <Badge variant={getStatusVariant(b.status)}>
                                                {(b.status || 'draft').replace('_', ' ')}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-4 text-slate-500 font-medium">
                                            {formatDate(b.created_at)}
                                        </td>
                                        {(canWrite || canDelete) && (
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {canWrite && (
                                                        <button 
                                                            onClick={() => navigate(`/pc-build-form/${b.build_id}`)} 
                                                            className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                                                            title="Edit Build"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button 
                                                            onClick={() => handleDelete(b.build_id)} 
                                                            className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                                                            title="Delete Build"
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
        </div>
    );
}
