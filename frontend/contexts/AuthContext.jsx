import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

/**
 * Authentication Provider
 * Manages user authentication state and permissions across the application
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [permissionsLoading, setPermissionsLoading] = useState(false);

    const checkAuthStatus = useCallback(async () => {
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // Check auth status on mount
    useEffect(() => {
        checkAuthStatus();
    }, [checkAuthStatus]);

    const login = async (username, password) => {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            setUser(data.user);
            return { success: true };
        }

        return { success: false, error: data.error || 'Login failed' };
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
        }
    };

    /**
     * Refresh permissions from server
     * Call this after admin changes user roles/permissions
     */
    const refreshPermissions = useCallback(async () => {
        if (!user?.id) return;

        setPermissionsLoading(true);
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
            }
        } catch (error) {
            console.error('Failed to refresh permissions:', error);
        } finally {
            setPermissionsLoading(false);
        }
    }, [user?.id]);

    /**
     * Check if user has a specific permission
     * @param {string} permissionName - Permission name to check
     * @returns {boolean} Whether user has the permission
     */
    const hasPermission = useCallback((permissionName) => {
        if (!user?.permissions) return false;
        return user.permissions.includes(permissionName);
    }, [user?.permissions]);

    /**
     * Check if user has any of the specified permissions
     * @param {string[]} permissionNames - Array of permission names
     * @returns {boolean} Whether user has any of the permissions
     */
    const hasAnyPermission = useCallback((permissionNames) => {
        if (!user?.permissions || !permissionNames?.length) return false;
        return permissionNames.some(perm => user.permissions.includes(perm));
    }, [user?.permissions]);

    /**
     * Check if user has all of the specified permissions
     * @param {string[]} permissionNames - Array of permission names
     * @returns {boolean} Whether user has all of the permissions
     */
    const hasAllPermissions = useCallback((permissionNames) => {
        if (!user?.permissions || !permissionNames?.length) return false;
        return permissionNames.every(perm => user.permissions.includes(perm));
    }, [user?.permissions]);

    /**
     * Check if user has a specific role
     * @param {string} roleName - Role name to check
     * @returns {boolean} Whether user has the role
     */
    const hasRole = useCallback((roleName) => {
        if (!user?.roles) return false;
        return user.roles.some(role => role.name === roleName);
    }, [user?.roles]);

    /**
     * Check if user has any of the specified roles
     * @param {string[]} roleNames - Array of role names
     * @returns {boolean} Whether user has any of the roles
     */
    const hasAnyRole = useCallback((roleNames) => {
        if (!user?.roles || !roleNames?.length) return false;
        return roleNames.some(name => user.roles.some(role => role.name === name));
    }, [user?.roles]);

    const value = {
        // User state
        user,
        loading,
        isAuthenticated: !!user,

        // Auth actions
        login,
        logout,
        checkAuthStatus,

        // Permissions
        permissions: user?.permissions || [],
        roles: user?.roles || [],
        permissionsLoading,
        refreshPermissions,

        // Permission helpers
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
        hasAnyRole
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

/**
 * Hook to access auth context
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
