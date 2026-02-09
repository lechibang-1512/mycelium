import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { } from '../utils/formatters.js';

const CATEGORY_CONFIG = {
    inventory: { icon: 'fa-box', col: 'text-indigo-600', bg: 'bg-indigo-600', label: 'Inventory' },
    warehouse: { icon: 'fa-warehouse', col: 'text-emerald-600', bg: 'bg-emerald-600', label: 'Warehouses' },
    users: { icon: 'fa-users', col: 'text-cyan-600', bg: 'bg-cyan-600', label: 'Users' },
    roles: { icon: 'fa-user-shield', col: 'text-amber-500', bg: 'bg-amber-500', label: 'Roles' },
    permissions: { icon: 'fa-key', col: 'text-rose-600', bg: 'bg-rose-600', label: 'Permissions' },
    suppliers: { icon: 'fa-truck', col: 'text-slate-500', bg: 'bg-slate-500', label: 'Suppliers' },
    receipts: { icon: 'fa-receipt', col: 'text-slate-900', bg: 'bg-slate-900', label: 'Receipts' },
    repairs: { icon: 'fa-tools', col: 'text-indigo-600', bg: 'bg-indigo-600', label: 'Repairs' },
    rma: { icon: 'fa-exchange-alt', col: 'text-amber-500', bg: 'bg-amber-500', label: 'RMA' },
    phones: { icon: 'fa-mobile-alt', col: 'text-cyan-600', bg: 'bg-cyan-600', label: 'Phones' },
    spareparts: { icon: 'fa-cogs', col: 'text-slate-500', bg: 'bg-slate-500', label: 'Spare Parts' },
    stocktake: { icon: 'fa-clipboard-check', col: 'text-emerald-600', bg: 'bg-emerald-600', label: 'Stocktake' },
    reports: { icon: 'fa-chart-bar', col: 'text-indigo-600', bg: 'bg-indigo-600', label: 'Reports' },
    zones: { icon: 'fa-layer-group', col: 'text-cyan-600', bg: 'bg-cyan-600', label: 'Zones' },
    bins: { icon: 'fa-cube', col: 'text-slate-500', bg: 'bg-slate-500', label: 'Bins' },
    system: { icon: 'fa-cog', col: 'text-slate-900', bg: 'bg-slate-900', label: 'System' },
    default: { icon: 'fa-lock', col: 'text-slate-500', bg: 'bg-slate-500', label: 'Other' }
};

const ACTION_STYLES = {
    read: { bg: 'bg-emerald-600', icon: 'fa-eye' },
    write: { bg: 'bg-indigo-600', icon: 'fa-edit' },
    delete: { bg: 'bg-rose-600', icon: 'fa-trash' },
    manage: { bg: 'bg-amber-500 text-amber-500-text', icon: 'fa-cog' },
    admin: { bg: 'bg-slate-900', icon: 'fa-shield-alt' },
    default: { bg: 'bg-slate-500', icon: 'fa-check' }
};

const getCategoryConfig = (category) => CATEGORY_CONFIG[category] || CATEGORY_CONFIG.default;

const getActionStyle = (action) => {
    const la = action.toLowerCase();
    for (const [key, style] of Object.entries(ACTION_STYLES)) {
        if (la.includes(key)) return style;
    }
    return ACTION_STYLES.default;
};

const PermissionGroup = ({ category, perms }) => {
    const [open, setOpen] = useState(false);
    const config = getCategoryConfig(category);

    return (
        <div className="border-b border-slate-200 last:border-b-0">
            <div 
                onClick={() => setOpen(!open)} 
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100 transition-colors cursor-pointer select-none"
            >
                <span className="flex items-center gap-2">
                    <i className={`fas ${config.icon} ${config.col}`}></i>
                    <strong className="text-sm">{config.label}</strong>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[0.6rem] font-medium ${config.bg} text-white`}>{perms.length}</span>
                </span>
                <i className={`fas fa-chevron-down text-slate-500 text-xs transition-transform transform ${open ? 'rotate-180' : ''}`}></i>
            </div>
            {open && (
                <div className="bg-slate-50 px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                        {perms.map((p, idx) => {
                            const s = getActionStyle(p.action);
                            return (
                                <span key={idx} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-normal text-white ${s.bg}`} title={p.full}>
                                    <i className={`fas ${s.icon} mr-1`}></i>{p.action}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function Profile() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/auth/me');
                setProfile(res.data?.user || res.data || res.user);
            } catch (e) {
                console.error(e);
                setError('Failed to load profile details.');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    if (loading) {
        return (
            <div className="text-center py-8">
                <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-3 text-slate-500 text-sm">Loading profile...</p>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="text-center py-8 text-rose-600">
                <i className="fas fa-exclamation-triangle fa-2x mb-3"></i>
                <p>{error || 'Profile not found'}</p>
            </div>
        );
    }

    const { fullName, username, email, id, permissions = [], roles = [] } = profile;

    const groups = {};
    permissions.forEach(perm => {
        const parts = perm.split('.');
        const category = parts.length > 1 ? parts[0].toLowerCase() : 'system';
        const action = parts.length > 1 ? parts.slice(1).join('.') : perm;
        if (!groups[category]) groups[category] = [];
        groups[category].push({ full: perm, action });
    });

    const categoriesList = Object.keys(groups).sort();
    const primaryRole = roles.length > 0 ? (roles[0].name || roles[0]) : 'User';

    return (
        <div className="p-4 lg:p-8 max-w-[1200px] mx-auto w-full flex-1">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold mb-1"><i className="fas fa-user-circle mr-2 text-indigo-600"></i>My Profile</h2>
                    <p className="text-slate-500">View your account information and permissions</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Profile Card */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow-card overflow-hidden flex flex-col h-full">
                        <div className="bg-indigo-600 px-4 py-3 text-white font-medium"><i className="fas fa-id-card mr-2"></i>Account Information</div>
                        <div className="p-4 flex-1">
                            <div className="text-center mb-4">
                                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-dark mb-3">
                                    <i className="fas fa-user text-4xl text-white"></i>
                                </div>
                                <h4 className="text-lg font-bold mb-1">{fullName || username}</h4>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-600 text-white">
                                    <i className="fas fa-shield-alt mr-1"></i>{primaryRole}
                                </span>
                            </div>
                            <div className="divide-y divide-border">
                                <div className="flex justify-between items-center py-2.5">
                                    <span className="text-slate-500"><i className="fas fa-user mr-2"></i>Username</span>
                                    <strong className="text-sm">{username}</strong>
                                </div>
                                <div className="flex justify-between items-center py-2.5">
                                    <span className="text-slate-500"><i className="fas fa-envelope mr-2"></i>Email</span>
                                    <strong className="text-sm">{email || 'Not set'}</strong>
                                </div>
                                <div className="flex justify-between items-center py-2.5">
                                    <span className="text-slate-500"><i className="fas fa-id-badge mr-2"></i>User ID</span>
                                    <code className="bg-slate-50 px-2 py-0.5 rounded text-xs">{id}</code>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200">
                            <h6 className="text-slate-500 text-sm mb-2"><i className="fas fa-users-cog mr-2"></i>Assigned Roles</h6>
                            <div className="flex flex-wrap gap-1">
                                {roles.length > 0 ? roles.map((r, idx) => (
                                    <span key={idx} className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-indigo-600 text-white">
                                        <i className="fas fa-user-tag mr-1"></i>{r.name || r}
                                    </span>
                                )) : (
                                    <span className="text-slate-500 italic text-sm">No roles assigned</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Permissions Card */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-lg shadow-card overflow-hidden flex flex-col h-full">
                        <div className="bg-[#17a2b8] px-4 py-3 text-white font-medium flex justify-between items-center">
                            <span><i className="fas fa-key mr-2"></i>Permissions</span>
                            <span className="flex gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/20">{permissions.length} total</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/20">
                                    {categoriesList.length} {categoriesList.length === 1 ? 'category' : 'categories'}
                                </span>
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[600px]">
                            {permissions.length === 0 ? (
                                <div className="text-center py-10 text-slate-500">
                                    <i className="fas fa-lock text-4xl mb-3"></i>
                                    <p>No specific permissions assigned</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {categoriesList.map((cat, idx) => (
                                        <PermissionGroup key={idx} category={cat} perms={groups[cat]} />
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="px-4 py-3 text-slate-500 text-sm border-t border-slate-200 bg-slate-50">
                            <i className="fas fa-info-circle mr-1"></i>Contact an administrator to request permission changes
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
