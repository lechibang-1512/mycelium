import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Modal, ModalFooter } from '../components/ui/Modal.jsx';
import { Users as UsersIcon, UserPlus, Pencil, Trash2, Save } from 'lucide-react';

const IC = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors shadow-sm';

function UserModal({ user, onClose, onSaved }) {
    const isEdit = !!user;
    const [form, setForm] = useState({ 
        username: user?.username || '', 
        fullName: user?.fullName || user?.full_name || '', 
        email: user?.email || '', 
        password: '', 
        is_active: user ? !!user.is_active : true 
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isEdit && !form.password) { 
            setError('Password is required for new users'); 
            return; 
        }
        setSaving(true); 
        setError(null);
        try {
            const payload = { 
                username: form.username, 
                fullName: form.fullName, 
                email: form.email, 
                is_active: form.is_active 
            };
            if (form.password) payload.password = form.password;
            
            if (isEdit) {
                await api.put(`/users/${user.id || user.user_id}`, payload);
            } else {
                await api.post('/users', payload);
            }
            onSaved(isEdit ? 'User updated successfully' : 'User created successfully');
        } catch (err) { 
            setError(err.response?.data?.error || 'Failed to save user'); 
        } finally { 
            setSaving(false); 
        }
    };

    return (
        <Modal isOpen={true} title={isEdit ? 'Edit User' : 'Create User'} onClose={onClose}>
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-5">
                    {error && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 font-medium shadow-sm">
                            {error}
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Username <span className="text-rose-500">*</span></label>
                        <input 
                            value={form.username} 
                            onChange={e => set('username', e.target.value)} 
                            required 
                            disabled={isEdit} 
                            className={`${IC} ${isEdit ? 'bg-slate-50 cursor-not-allowed text-slate-500' : ''}`} 
                        />
                        {isEdit && <p className="text-xs text-slate-500 mt-1.5">Username cannot be changed</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                        <input 
                            value={form.fullName} 
                            onChange={e => set('fullName', e.target.value)} 
                            className={IC} 
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                        <input 
                            type="email" 
                            value={form.email} 
                            onChange={e => set('email', e.target.value)} 
                            className={IC} 
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Password {!isEdit && <span className="text-rose-500">*</span>}
                        </label>
                        <input 
                            type="password" 
                            value={form.password} 
                            onChange={e => set('password', e.target.value)} 
                            required={!isEdit} 
                            placeholder={isEdit ? 'Enter a new password to reset' : 'Enter secure password'} 
                            className={IC} 
                        />
                        {isEdit && <p className="text-xs text-slate-500 mt-1.5">Leave blank to keep current password</p>}
                    </div>

                    <div className="pt-2">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                            <input 
                                type="checkbox" 
                                checked={form.is_active} 
                                onChange={e => set('is_active', e.target.checked)} 
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4" 
                            />
                            <div className="flex flex-col">
                                <span>Account Active</span>
                                <span className="text-xs text-slate-500 font-normal">
                                    {form.is_active ? 'User can log in and access the system' : 'User will be forbidden from logging in'}
                                </span>
                            </div>
                        </label>
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
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
                    </button>
                </ModalFooter>
            </form>
        </Modal>
    );
}

export default function Users() {
    const { hasAnyPermission } = useAuth();
    const canWrite = hasAnyPermission(['users:write', 'users:manage']);
    const canDelete = hasAnyPermission(['users:delete', 'users:manage']);
    const toast = useToast();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);

    const fetchUsers = async () => {
        setLoading(true);
        try { 
            const r = await api.get('/users'); 
            setUsers(r.data?.users || r.data || []); 
        } catch (e) { 
            toast.error(e.response?.data?.error || 'Failed to load users'); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this user? This action cannot be undone.')) return;
        try { 
            await api.del(`/users/${id}`); 
            toast.success('User deleted'); 
            fetchUsers(); 
        } catch (e) { 
            toast.error(e.message || 'Failed to delete user'); 
        }
    };

    const handleSaved = (text) => { 
        setModal(null); 
        toast.success(text); 
        fetchUsers(); 
    };

    return (
        <div className="max-w-7xl mx-auto w-full">
            <PageHeader
                title="Users"
                subtitle="Manage user accounts and system access"
                icon={UsersIcon}
                action={
                    canWrite && (
                        <button 
                            onClick={() => setModal('new')} 
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            <UserPlus className="w-4 h-4" /> Create User
                        </button>
                    )
                }
            />

            <Card noPadding>
                {loading ? <Spinner fullPage={false} className="py-16" /> : users.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-lg font-medium text-slate-500">No users found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {['ID', 'Username', 'Full Name', 'Email', 'Status'].map(h => (
                                        <th key={h} className="px-5 py-3 font-semibold text-slate-600">{h}</th>
                                    ))}
                                    {(canWrite || canDelete) && (
                                        <th className="px-5 py-3 font-semibold text-slate-600 text-right">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {users.map((u, i) => {
                                    const id = u.id || u.user_id;
                                    return (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-5 py-4 text-slate-500">{id}</td>
                                            <td className="px-5 py-4 font-semibold text-slate-900">{u.username}</td>
                                            <td className="px-5 py-4 text-slate-700">{u.fullName || u.full_name || '—'}</td>
                                            <td className="px-5 py-4 text-slate-600">{u.email || '—'}</td>
                                            <td className="px-5 py-4">
                                                <Badge variant={u.is_active ? 'success' : 'secondary'}>
                                                    {u.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            {(canWrite || canDelete) && (
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {canWrite && (
                                                            <button 
                                                                onClick={() => setModal(u)} 
                                                                className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors" 
                                                                title="Edit User"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button 
                                                                onClick={() => handleDelete(id)} 
                                                                className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors" 
                                                                title="Delete User"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {modal && (
                <UserModal 
                    user={modal === 'new' ? null : modal} 
                    onClose={() => setModal(null)} 
                    onSaved={handleSaved} 
                />
            )}
        </div>
    );
}
