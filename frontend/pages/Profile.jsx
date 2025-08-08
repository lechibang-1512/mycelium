import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { } from '../utils/formatters.js';

const CATEGORY_CONFIG = {
    inventory: { icon: 'fa-box', col: 'text-primary', bg: 'bg-primary', label: 'Inventory' },
    warehouse: { icon: 'fa-warehouse', col: 'text-success', bg: 'bg-success', label: 'Warehouses' },
    users: { icon: 'fa-users', col: 'text-info', bg: 'bg-info', label: 'Users' },
    roles: { icon: 'fa-user-shield', col: 'text-warning', bg: 'bg-warning', label: 'Roles' },
    permissions: { icon: 'fa-key', col: 'text-danger', bg: 'bg-danger', label: 'Permissions' },
    suppliers: { icon: 'fa-truck', col: 'text-secondary', bg: 'bg-secondary', label: 'Suppliers' },
    receipts: { icon: 'fa-receipt', col: 'text-text-primary', bg: 'bg-text-primary', label: 'Receipts' },
    repairs: { icon: 'fa-tools', col: 'text-primary', bg: 'bg-primary', label: 'Repairs' },
    rma: { icon: 'fa-exchange-alt', col: 'text-warning', bg: 'bg-warning', label: 'RMA' },
    phones: { icon: 'fa-mobile-alt', col: 'text-info', bg: 'bg-info', label: 'Phones' },
    spareparts: { icon: 'fa-cogs', col: 'text-secondary', bg: 'bg-secondary', label: 'Spare Parts' },
    stocktake: { icon: 'fa-clipboard-check', col: 'text-success', bg: 'bg-success', label: 'Stocktake' },
    reports: { icon: 'fa-chart-bar', col: 'text-primary', bg: 'bg-primary', label: 'Reports' },
    zones: { icon: 'fa-layer-group', col: 'text-info', bg: 'bg-info', label: 'Zones' },
    bins: { icon: 'fa-cube', col: 'text-secondary', bg: 'bg-secondary', label: 'Bins' },
    system: { icon: 'fa-cog', col: 'text-text-primary', bg: 'bg-text-primary', label: 'System' },
    default: { icon: 'fa-lock', col: 'text-secondary', bg: 'bg-secondary', label: 'Other' }
};

const ACTION_STYLES = {
    read: { bg: 'bg-success', icon: 'fa-eye' },
    write: { bg: 'bg-primary', icon: 'fa-edit' },
    delete: { bg: 'bg-danger', icon: 'fa-trash' },
    manage: { bg: 'bg-warning text-warning-text', icon: 'fa-cog' },
    admin: { bg: 'bg-text-primary', icon: 'fa-shield-alt' },
    default: { bg: 'bg-secondary', icon: 'fa-check' }
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
        <div className="border-b border-border last:border-b-0">
            <div 
                onClick={() => setOpen(!open)} 
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-body transition-colors cursor-pointer select-none"
            >
                <span className="flex items-center gap-2">
                    <i className={`fas ${config.icon} ${config.col}`}></i>
                    <strong className="text-sm">{config.label}</strong>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[0.6rem] font-medium ${config.bg} text-white`}>{perms.length}</span>
                </span>
                <i className={`fas fa-chevron-down text-text-muted text-xs transition-transform transform ${open ? 'rotate-180' : ''}`}></i>
            </div>
            {open && (
                <div className="bg-surface-light px-4 py-3">
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
                <svg className="animate-spin h-8 w-8 text-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-3 text-text-muted text-sm">Loading profile...</p>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="text-center py-8 text-danger">
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
                    <h2 className="text-2xl font-bold mb-1"><i className="fas fa-user-circle mr-2 text-primary"></i>My Profile</h2>
                    <p className="text-text-muted">View your account information and permissions</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Profile Card */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow-card overflow-hidden flex flex-col h-full">
                        <div className="bg-primary px-4 py-3 text-white font-medium"><i className="fas fa-id-card mr-2"></i>Account Information</div>
                        <div className="p-4 flex-1">
                            <div className="text-center mb-4">
                                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-dark mb-3">
                                    <i className="fas fa-user text-4xl text-white"></i>
                                </div>
                                <h4 className="text-lg font-bold mb-1">{fullName || username}</h4>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-success text-white">
                                    <i className="fas fa-shield-alt mr-1"></i>{primaryRole}
                                </span>
                            </div>
                            <div className="divide-y divide-border">
                                <div className="flex justify-between items-center py-2.5">
                                    <span className="text-text-muted"><i className="fas fa-user mr-2"></i>Username</span>
                                    <strong className="text-sm">{username}</strong>
                                </div>
                                <div className="flex justify-between items-center py-2.5">
                                    <span className="text-text-muted"><i className="fas fa-envelope mr-2"></i>Email</span>
                                    <strong className="text-sm">{email || 'Not set'}</strong>
                                </div>
                                <div className="flex justify-between items-center py-2.5">
                                    <span className="text-text-muted"><i className="fas fa-id-badge mr-2"></i>User ID</span>
                                    <code className="bg-surface-light px-2 py-0.5 rounded text-xs">{id}</code>
                                </div>
                            </div>
                        </div>
                        <div className="bg-surface-light px-4 py-3 border-t border-border">
                            <h6 className="text-text-muted text-sm mb-2"><i className="fas fa-users-cog mr-2"></i>Assigned Roles</h6>
                            <div className="flex flex-wrap gap-1">
                                {roles.length > 0 ? roles.map((r, idx) => (
                                    <span key={idx} className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-primary text-white">
                                        <i className="fas fa-user-tag mr-1"></i>{r.name || r}
                                    </span>
                                )) : (
                                    <span className="text-text-muted italic text-sm">No roles assigned</span>
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
                                <div className="text-center py-10 text-text-muted">
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
                        <div className="px-4 py-3 text-text-muted text-sm border-t border-border bg-surface-light">
                            <i className="fas fa-info-circle mr-1"></i>Contact an administrator to request permission changes
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
