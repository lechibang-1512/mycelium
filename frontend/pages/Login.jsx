import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { Package, Lock, User, ArrowRight, ShieldCheck, Box, Activity } from 'lucide-react';

export default function Login() {
    const { login, user } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (user) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const result = await login(username, password);
            if (result.success) {
                toast.success('Login successful!');
                navigate('/dashboard');
            } else {
                setError(result.error || 'Invalid credentials. Please try again.');
                toast.error(result.error || 'Login failed');
            }
        } catch {
            setError('An error occurred connecting to the server. Please check your connection.');
            toast.error('An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] font-sans relative overflow-hidden">
            {/* Background Decorative Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] rounded-full bg-blue-400/20 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[50%] rounded-full bg-indigo-400/20 blur-[120px] pointer-events-none"></div>

            <div className="w-full max-w-5xl h-[650px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex overflow-hidden relative z-10 mx-4 border border-slate-100">
                {/* Left Side - Visual Story */}
                <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-12 flex-col justify-between relative overflow-hidden text-white">
                    {/* Abstract tech shapes overlay */}
                    <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(100,150,255,0.4) 0%, transparent 50%)' }}></div>
                    <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                    
                    <div className="relative z-10 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg shadow-black/20">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white/90">Mycelium ERP</span>
                    </div>

                    <div className="relative z-10 mb-8">
                        <h2 className="text-4xl font-extrabold leading-tight tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-100">
                            Next-Gen Inventory Solutions
                        </h2>
                        <p className="text-slate-300 text-lg font-light leading-relaxed mb-8 max-w-[384px]">
                            Seamless asset tracking, warehouse intelligence, and unified operations built for scale.
                        </p>
                        
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-slate-300 bg-white/5 w-fit px-4 py-2 rounded-lg border border-white/10 backdrop-blur-sm">
                                <Box className="w-4 h-4 text-blue-300" />
                                <span className="text-sm font-medium">Real-time Stock Tracking</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-300 bg-white/5 w-fit px-4 py-2 rounded-lg border border-white/10 backdrop-blur-sm">
                                <Activity className="w-4 h-4 text-blue-300" />
                                <span className="text-sm font-medium">Predictive Analytics</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-300 bg-white/5 w-fit px-4 py-2 rounded-lg border border-white/10 backdrop-blur-sm">
                                <ShieldCheck className="w-4 h-4 text-blue-300" />
                                <span className="text-sm font-medium">Enterprise Grade Security</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full lg:w-[55%] p-8 sm:p-12 md:p-16 flex flex-col justify-center bg-white relative">
                    <div className="max-w-[384px] w-full mx-auto">
                        
                        <div className="text-center lg:text-left mb-10">
                            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 tracking-tight">Welcome back</h3>
                            <p className="text-slate-500 font-medium text-sm">Please log in to your dashboard to continue.</p>
                        </div>

                        {error && (
                            <div className="transform transition-all duration-300 rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-6 flex items-start gap-3 shadow-sm shadow-red-100/50">
                                <div className="p-1 rounded-full bg-red-100 text-red-600 mt-0.5">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-red-800">Authentication Failed</h4>
                                    <p className="text-xs text-red-600 mt-0.5">{error}</p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-1.5">
                                <label htmlFor="username" className="text-sm font-semibold text-slate-700">Username</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <input
                                        type="text"
                                        id="username"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all duration-200 disabled:opacity-60 text-slate-900 font-medium placeholder-slate-400"
                                        placeholder="jsmith or hr_admin"
                                        required
                                        autoFocus
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</label>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <input
                                        type="password"
                                        id="password"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all duration-200 disabled:opacity-60 text-slate-900 font-medium placeholder-slate-400"
                                        placeholder="••••••••"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="group relative w-full flex justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden mt-6"
                                disabled={isSubmitting}
                            >
                                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center justify-center gap-2">
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Authenticating...
                                        </>
                                    ) : (
                                        <>
                                            Sign In
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </div>
                            </button>
                        </form>
                        
                        <div className="mt-10 text-center">
                            <p className="text-xs text-slate-400 font-medium">
                                Secure Login System &copy; {new Date().getFullYear()} Mycelium ERP
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
