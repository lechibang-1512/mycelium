import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api.js';

const AuthContext = createContext(null);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const data = await api.get('/auth/me');
            if (data?.user) {
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        try {
            const data = await api.post('/auth/login', { username, password });
            if (data?.success && data?.user) {
                setUser(data.user);
                return { success: true };
            }
            return { success: false, error: data?.error || 'Login failed' };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch { /* ignore */ }
        setUser(null);
    };

    const hasPermission = (perm) => user?.permissions?.includes(perm) ?? false;
    const hasAnyPermission = (perms) => perms.some(p => user?.permissions?.includes(p));
    const hasRole = (role) => user?.roles?.includes(role) ?? false;

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, hasAnyPermission, hasRole }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
