import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Modal, ModalFooter } from '../components/ui/Modal.jsx';
import { 
    ShieldAlert, Users, Key, Shield, Lock, Pencil, Trash2, Plus, 
    UserCheck, X, ArrowLeft, Box, Warehouse, FileText, Wrench, 
    RotateCcw, BarChart, ClipboardCheck, Monitor, Barcode
} from 'lucide-react';

const IC = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors shadow-sm';

const ROLE_COLORS = { admin: 'danger', manager: 'warning', user: 'info', viewer: 'secondary' };

const PERM_GROUPS = {
    inventory: { label: 'Inventory', icon: Box }, 
    warehouse: { label: 'Warehouse', icon: Warehouse },
    invoice: { label: 'Invoices', icon: FileText }, 
    repair: { label: 'Repairs', icon: Wrench },
    rma: { label: 'RMA', icon: RotateCcw }, 
    users: { label: 'Users', icon: Users },
    reports: { label: 'Reports', icon: BarChart }, 
    stocktake: { label: 'Stocktake', icon: ClipboardCheck },
    'pc-builds': { label: 'PC Builds', icon: Monitor }, 
    serialized: { label: 'Serialized', icon: Barcode },
    rbac: { label: 'Access Control', icon: ShieldAlert }
};

const RoleBadge = ({ name }) => (
    <Badge variant={ROLE_COLORS[name] || 'info'}>{name}</Badge>
);

function AssignModal({ user, roles, onClose, _onSaved }) {
    const toast = useToast();
    const [currentRoles, setCurrentRoles] = useState([]);
    const [avail, setAvail] = useState([]);
    const [selected, setSelected] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const userId = user.user_id || user.id;

    const loadRoles = useCallback(async () => {
        setLoading(true);
        try {
            const r = await api.get(`/rbac/users/${userId}/roles`);
            const cur = r.data?.roles || r.data || [];
            setCurrentRoles(cur);
            setAvail(roles.filter(r => !cur.some(cr => cr.role_id === r.role_id)));
        } catch {
            // handle silently
        } finally { 
            setLoading(false); 
        }
    }, [userId, roles]);

    useEffect(() => { loadRoles(); }, [loadRoles]);

    const handleAssign = async () => {
        if (!selected) return;
        setSaving(true);
        try { 
            await api.post(`/rbac/users/${userId}/roles`, { roleId: selected }); 
            await loadRoles();
            toast.success('Role assigned to user');
        } catch (e) { 
            toast.error(e.response?.data?.error || 'Failed to assign role'); 
        } finally { 
            setSaving(false); 
            setSelected(''); 
        }
    };

    const handleRemove = async (roleId) => {
        if (!window.confirm('Remove this role from user?')) return;
        try { 
            await api.del(`/rbac/users/${userId}/roles/${roleId}`); 
            await loadRoles();
            toast.success('Role removed');
        } catch (e) { 
            toast.error(e.message || 'Failed to remove role'); 
        }
    };

    return (
        <Modal isOpen={true} title={
            <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <span>Manage Roles — {user.username}</span>
            </div>
        } onClose={onClose}>
            <div className="p-6">
                {loading ? <Spinner fullPage={false} className="py-8" /> : (
                    <>
                        <div className="mb-6">
                            <h6 className="text-sm font-semibold text-slate-700 mb-3">Current Roles</h6>
                            <div className="flex flex-wrap gap-2 min-h-[32px] p-4 bg-slate-50 rounded-lg border border-slate-200">
                                {currentRoles.length === 0 ? (
                                    <span className="text-slate-500 text-sm">No roles assigned</span>
                                ) : (
                                    currentRoles.map(r => (
                                        <span key={r.role_id} className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded border border-slate-200 bg-white shadow-sm text-sm font-medium text-slate-700">
                                            {r.name}
                                            <button 
                                                onClick={() => handleRemove(r.role_id)} 
                                                className="p-0.5 rounded-sm hover:bg-rose-100 hover:text-rose-600 text-slate-400 transition-colors"
                                                title="Remove Role"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </span>
                                    ))
                                )}
                            </div>
                        </div>
                        
                        <div className="mb-2">
                            <h6 className="text-sm font-semibold text-slate-700 mb-2">Assign New Role</h6>
                            <div className="flex gap-2">
                                <select 
                                    value={selected} 
                                    onChange={e => setSelected(e.target.value)} 
                                    className={`${IC} flex-1`}
                                >
                                    <option value="">Select a role to assign...</option>
                                    {avail.map(r => <option key={r.role_id} value={r.role_id}>{r.name}</option>)}
                                </select>
                                <button 
                                    onClick={handleAssign} 
                                    disabled={!selected || saving} 
                                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                                >
                                    {saving ? 'Assigning...' : 'Assign Role'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
            <ModalFooter>
                <button 
                    onClick={onClose} 
                    className="rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                    Close
                </button>
            </ModalFooter>
        </Modal>
    );
}

function RoleModal({ role, onClose, onSaved }) {
    const isEdit = !!role;
    const toast = useToast();
    const [name, setName] = useState(role?.name || '');
    const [desc, setDesc] = useState(role?.description || '');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault(); 
        setSaving(true);
        try {
            if (isEdit) {
                await api.put(`/rbac/roles/${role.role_id}`, { name, description: desc });
            } else {
                await api.post('/rbac/roles', { name, description: desc });
            }
            onSaved(isEdit ? 'Role updated successfully' : 'Role created successfully');
        } catch (err) { 
            toast.error(err.response?.data?.error || 'Failed to save role'); 
        } finally { 
            setSaving(false); 
        }
    };

    return (
        <Modal isOpen={true} title={
            <div className="flex items-center gap-2">
                {isEdit ? <Pencil className="w-5 h-5 text-indigo-600" /> : <Plus className="w-5 h-5 text-indigo-600" />}
                <span>{isEdit ? 'Edit Role' : 'Create Role'}</span>
            </div>
        } onClose={onClose}>
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role Name <span className="text-rose-500">*</span></label>
                        <input 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            required 
                            disabled={isEdit && role?.is_system} 
                            className={`${IC} ${isEdit && role?.is_system ? 'bg-slate-50 cursor-not-allowed text-slate-500' : ''}`} 
                        />
                        {isEdit && role?.is_system && <p className="text-xs text-slate-500 mt-1.5">System role name cannot be changed</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                        <textarea 
                            value={desc} 
                            onChange={e => setDesc(e.target.value)} 
                            rows="3" 
                            className={IC}
                        ></textarea>
                    </div>
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
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Role'}
                    </button>
                </ModalFooter>
            </form>
        </Modal>
    );
}

function PermissionsTab({ roles, allPerms }) {
    const toast = useToast();
    const [selectedRoleId, setSelectedRoleId] = useState(null);
    const [rolePerms, setRolePerms] = useState([]);
    const [loading, setLoading] = useState(false);

    const selectRole = async (rid) => {
        setSelectedRoleId(rid); 
        setLoading(true);
        try { 
            const r = await api.get(`/rbac/roles/${rid}/permissions`); 
            setRolePerms(r.data?.permissions || r.data || []); 
        } catch {
            toast.error('Failed to load role permissions');
        } finally { 
            setLoading(false); 
        }
    };

    const togglePerm = async (roleId, permId, isChecked) => {
        try {
            if (isChecked) {
                await api.post(`/rbac/roles/${roleId}/permissions`, { permissionId: permId });
            } else {
                await api.del(`/rbac/roles/${roleId}/permissions/${permId}`);
            }
            // Update local state without refetching for snappy UI
            if (isChecked) {
                setRolePerms([...rolePerms, { permission_id: permId }]);
            } else {
                setRolePerms(rolePerms.filter(p => p.permission_id !== permId));
            }
        } catch (e) { 
            toast.error(e.response?.data?.error || 'Failed to update permission'); 
            selectRole(roleId); 
        }
    };

    const byGroup = {};
    allPerms.forEach(p => { 
        const cat = p.name.split(':')[0]; 
        if (!byGroup[cat]) byGroup[cat] = []; 
        byGroup[cat].push(p); 
    });
    const permIds = new Set(rolePerms.map(p => p.permission_id));
    const role = roles.find(r => r.role_id === selectedRoleId);

    return (
        <div className="flex flex-col md:flex-row gap-6 min-h-[500px]">
            {/* Roles Sidebar */}
            <div className="w-full md:w-64 flex-shrink-0 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex flex-col h-[500px]">
                <div className="p-3 bg-slate-100 border-b border-slate-200 font-semibold text-slate-700 text-sm">
                    Select a Role
                </div>
                <div className="overflow-y-auto flex-1">
                    <ul className="divide-y divide-slate-200">
                        {roles.map(r => (
                            <li key={r.role_id}>
                                <button 
                                    onClick={() => selectRole(r.role_id)} 
                                    className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-colors ${
                                        selectedRoleId === r.role_id 
                                            ? 'bg-indigo-600 text-white' 
                                            : 'hover:bg-indigo-50 text-slate-700'
                                    }`}
                                >
                                    <span className="flex items-center gap-2 font-medium">
                                        {r.is_system && <Lock className={`w-3 h-3 ${selectedRoleId === r.role_id ? 'text-indigo-200' : 'text-slate-400'}`} />}
                                        {r.name}
                                    </span>
                                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                        selectedRoleId === r.role_id ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                        {r.Permissions?.length || 0}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Permissions Grid */}
            <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-[500px]">
                {!selectedRoleId ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                        <ArrowLeft className="w-12 h-12 mb-4 opacity-20 hidden md:block" />
                        <p className="text-lg font-medium text-slate-500">Select a role from the sidebar to manage its permissions.</p>
                    </div>
                ) : loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Spinner fullPage={false} />
                    </div>
                ) : (
                    <>
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <h5 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                                {role && <RoleBadge name={role.name} />}
                                Permissions set for {role?.name}
                            </h5>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {Object.entries(PERM_GROUPS).map(([key, grp]) => {
                                    const gPerms = byGroup[key] || [];
                                    if (!gPerms.length) return null;
                                    const GrpIcon = grp.icon;

                                    return (
                                        <div key={key} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
                                                <GrpIcon className="w-4 h-4 text-indigo-600" />
                                                <strong className="text-sm text-slate-800 tracking-wide">{grp.label}</strong>
                                            </div>
                                            <div className="p-2 flex-1">
                                                {gPerms.map(p => {
                                                    const action = p.name.split(':')[1];
                                                    const lbl = { read: 'Read Data', write: 'Write Data', delete: 'Delete Data', manage: 'Full Management' }[action] || action;
                                                    const isChecked = permIds.has(p.permission_id);
                                                    
                                                    return (
                                                        <label 
                                                            key={p.permission_id} 
                                                            className={`flex items-center gap-3 text-sm cursor-pointer p-2 rounded-lg transition-colors select-none ${
                                                                isChecked ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isChecked} 
                                                                onChange={e => togglePerm(selectedRoleId, p.permission_id, e.target.checked)} 
                                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4 mt-0.5" 
                                                            />
                                                            <div className="flex flex-col">
                                                                <span className={`font-medium ${isChecked ? 'text-indigo-900' : 'text-slate-700'}`}>{lbl}</span>
                                                                <span className="text-xs text-slate-400 font-mono mt-0.5">{p.name}</span>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function UserRoles() {
    const { user: me } = useAuth();
    const isAdmin = me?.roles?.some(r => r.name === 'admin') || me?.role === 'admin';
    const toast = useToast();

    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [allPerms, setAllPerms] = useState([]);
    const [tab, setTab] = useState('users');
    const [loading, setLoading] = useState(true);
    const [assignModal, setAssignModal] = useState(null);
    const [roleModal, setRoleModal] = useState(null);

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [ur, rr, pr] = await Promise.all([
                api.get('/users'), 
                api.get('/rbac/roles'), 
                api.get('/rbac/permissions')
            ]);
            setUsers(ur.data?.users || ur.data || []);
            setRoles(rr.data?.roles || rr.data || []);
            setAllPerms(pr.data?.permissions || pr.data || []);
        } catch {
            // handle silently
        } finally { 
            setLoading(false); 
        }
    }, []);

    useEffect(() => { 
        if (isAdmin) loadAll(); 
    }, [isAdmin, loadAll]);

    const deleteRole = async (id) => {
        const r = roles.find(r => r.role_id === id);
        if (!r || r.is_system) return;
        if (!window.confirm(`Delete role "${r.name}"? This will remove the role from any users who have it.`)) return;
        
        try { 
            await api.del(`/rbac/roles/${id}`); 
            toast.success('Role deleted successfully'); 
            loadAll(); 
        } catch (e) { 
            toast.error(e.message || 'Failed to delete role'); 
        }
    };

    const tabCls = (t) => tab === t
        ? 'flex items-center gap-2 px-5 py-3 text-sm font-bold cursor-pointer text-indigo-600 border-b-2 -mb-px border-indigo-600 bg-indigo-50/50 transition-colors'
        : 'flex items-center gap-2 px-5 py-3 text-sm font-medium cursor-pointer text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-b-2 -mb-px border-transparent transition-colors';

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-sm">
                    <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-rose-600" />
                    </div>
                    <h3 className="font-bold text-xl mb-2 text-slate-800">Access Denied</h3>
                    <p className="text-slate-500 text-sm">You need administrator privileges to view and manage user roles and permissions.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto w-full">
            <PageHeader
                title="User Roles & Permissions"
                subtitle="Manage user access control and security policies"
                icon={ShieldAlert}
            />

            <Card noPadding className="overflow-hidden">
                <div className="border-b border-slate-200 flex bg-white/50" id="tab-buttons">
                    <button className={tabCls('users')} onClick={() => setTab('users')}>
                        <Users className="w-4 h-4" /> Users & Roles
                    </button>
                    <button className={tabCls('perms')} onClick={() => setTab('perms')}>
                        <Key className="w-4 h-4" /> Role Permissions
                    </button>
                    <button className={tabCls('roles')} onClick={() => setTab('roles')}>
                        <Shield className="w-4 h-4" /> Manage Roles
                    </button>
                </div>

                <div className="p-6">
                    {loading ? <Spinner fullPage={false} className="py-16" /> : (
                        <>
                            {tab === 'users' && (
                                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                                    <table className="w-full text-sm text-left bg-white">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                {['ID', 'Username', 'Full Name', 'Email', 'Assigned Roles', 'Status'].map(h => (
                                                    <th key={h} className="px-5 py-3 font-semibold text-slate-600">{h}</th>
                                                ))}
                                                <th className="px-5 py-3 font-semibold text-slate-600 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {users.map((u, _i) => {
                                                const uid = u.user_id || u.id;
                                                return (
                                                    <tr key={uid} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-5 py-4 text-slate-500">{uid}</td>
                                                        <td className="px-5 py-4 font-semibold text-slate-900">{u.username}</td>
                                                        <td className="px-5 py-4 text-slate-700">{u.full_name || u.fullName || '—'}</td>
                                                        <td className="px-5 py-4 text-slate-600">{u.email || '—'}</td>
                                                        <td className="px-5 py-4">
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {u.Roles?.length > 0 ? (
                                                                    u.Roles.map(r => <RoleBadge key={r.role_id} name={r.name} />)
                                                                ) : (
                                                                    <span className="text-slate-400 text-xs italic">No roles</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <Badge variant={u.is_active ? 'success' : 'secondary'}>
                                                                {u.is_active ? 'Active' : 'Inactive'}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-5 py-4 text-right">
                                                            <button 
                                                                onClick={() => setAssignModal(u)} 
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-indigo-600 font-medium hover:bg-indigo-50 hover:border-indigo-200 transition-colors bg-white shadow-sm" 
                                                                title="Manage roles"
                                                            >
                                                                <UserCheck className="w-4 h-4" /> Manage
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {tab === 'perms' && <PermissionsTab roles={roles} allPerms={allPerms} />}

                            {tab === 'roles' && (
                                <div>
                                    <div className="flex justify-end mb-4">
                                        <button 
                                            onClick={() => setRoleModal('new')} 
                                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                                        >
                                            <Plus className="w-4 h-4" /> Create New Role
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                                        <table className="w-full text-sm text-left bg-white">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr>
                                                    {['Role Name', 'Description', 'Type', 'Granted Permissions'].map(h => (
                                                        <th key={h} className="px-5 py-3 font-semibold text-slate-600">{h}</th>
                                                    ))}
                                                    <th className="px-5 py-3 font-semibold text-slate-600 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {roles.map((r) => (
                                                    <tr key={r.role_id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-5 py-4"><RoleBadge name={r.name} /></td>
                                                        <td className="px-5 py-4 text-slate-700">{r.description || '—'}</td>
                                                        <td className="px-5 py-4">
                                                            {r.is_system ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-white shadow-sm">
                                                                    <Lock className="w-3 h-3 text-slate-300" /> System
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-200 bg-white text-slate-600 shadow-sm">
                                                                    Custom
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-4 font-semibold text-slate-700">
                                                            {r.Permissions?.length || 0}
                                                        </td>
                                                        <td className="px-5 py-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button 
                                                                    onClick={() => setRoleModal(r)} 
                                                                    className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors bg-white shadow-sm"
                                                                    title="Edit Role"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </button>
                                                                {!r.is_system && (
                                                                    <button 
                                                                        onClick={() => deleteRole(r.role_id)} 
                                                                        className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors bg-white shadow-sm"
                                                                        title="Delete Role"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </Card>

            {assignModal && (
                <AssignModal 
                    user={assignModal} 
                    roles={roles} 
                    onClose={() => setAssignModal(null)} 
                    onSaved={() => { setAssignModal(null); loadAll(); }} 
                />
            )}
            
            {roleModal && (
                <RoleModal 
                    role={roleModal === 'new' ? null : roleModal} 
                    onClose={() => setRoleModal(null)} 
                    onSaved={(msg) => { setRoleModal(null); toast.success(msg); loadAll(); }} 
                />
            )}
        </div>
    );
}
