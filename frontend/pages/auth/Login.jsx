import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

/**
 * Login Page
 * Simple login form with username/password authentication
 */
const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const usernameInputRef = useRef(null);

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Redirect destination after login
    const from = location.state?.from?.pathname || '/inventory';

    // Focus the username input on mount (accessible alternative to autoFocus)
    useEffect(() => {
        usernameInputRef.current?.focus();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await login(username, password);

            if (result.success) {
                toast.success('Login successful!');
                navigate(from, { replace: true });
            } else {
                setError(result.error || 'Login failed');
                toast.error(result.error || 'Login failed');
            }
        } catch (_err) {
            setError('An error occurred. Please try again.');
            toast.error('An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <div className="card shadow-lg" style={{ width: '100%', maxWidth: '400px' }}>
                <div className="card-body p-5">
                    {/* Logo/Header */}
                    <div className="text-center mb-4">
                        <h2 className="fw-bold text-primary mb-1">
                            <i className="fas fa-cubes me-2"></i>
                            Mycelium
                        </h2>
                        <p className="text-muted">Inventory Management System</p>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div className="alert alert-danger py-2" role="alert">
                            <i className="fas fa-exclamation-circle me-2"></i>
                            {error}
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="username" className="form-label">
                                <i className="fas fa-user me-1"></i> Username
                            </label>
                            <input
                                type="text"
                                className="form-control form-control-lg"
                                id="username"
                                ref={usernameInputRef}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter username"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="password" className="form-label">
                                <i className="fas fa-lock me-1"></i> Password
                            </label>
                            <input
                                type="password"
                                className="form-control form-control-lg"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-100"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-sign-in-alt me-2"></i>
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
