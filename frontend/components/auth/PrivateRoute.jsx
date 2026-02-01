import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageSpinner } from '../ui/Spinner';

/**
 * PrivateRoute Component
 * Protects routes that require authentication
 * Redirects to login if not authenticated, preserving the intended destination
 */
const PrivateRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    // Show loading spinner while checking auth status
    if (loading) {
        return <PageSpinner message="Checking authentication..." />;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        // Save the attempted location for redirect after login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Render the protected content
    return children;
};

export default PrivateRoute;
