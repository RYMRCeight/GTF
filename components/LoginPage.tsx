import React, { useState } from 'react';
import { supabase } from '../services/supabase';

const LoginPage: React.FC<{ showStatus: (message: string) => void; }> = ({ showStatus }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError) {
            setError(signInError.message);
            showStatus(`Login failed: ${signInError.message}`);
        }
        // Success is handled by the onAuthStateChange listener in App.tsx
        setLoading(false);
    };

    return (
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 sm:p-10 fade-in">
            <h2 className="text-2xl font-semibold leading-tight text-gray-900 text-center mb-6">Administrator Access</h2>
            <form onSubmit={handleLogin} className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">Email Address</label>
                    <div className="mt-2">
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 bg-white ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow duration-150"
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">Password</label>
                     <div className="mt-2">
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 bg-white ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow duration-150"
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-md bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all duration-200 hover:scale-[1.02] active:scale-100"
                >
                    {loading ? 'Signing In...' : 'Sign In'}
                </button>
            </form>
            {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
        </div>
    );
};

export default LoginPage;