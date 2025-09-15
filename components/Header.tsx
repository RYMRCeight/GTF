import React from 'react';
import type { User } from '@supabase/supabase-js';

interface HeaderProps {
    page: 'public' | 'admin';
    setPage: (page: 'public' | 'admin') => void;
    user: User | null;
    siteLogoUrl: string;
}

const Header: React.FC<HeaderProps> = ({ setPage, user, siteLogoUrl }) => {
    return (
        <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-slate-200">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <img 
                            src={siteLogoUrl || "https://placehold.co/40x40/8B5CF6/FFFFFF?text=GTF"} 
                            alt="Go Track Framework Logo" 
                            className="h-10 w-10 rounded-full mr-4 object-cover" 
                        />
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Go Track Framework</h1>
                            <p className="text-sm text-slate-500">Smart Document Tracking</p>
                        </div>
                    </div>
                     {!user && (
                        <nav className="flex items-center space-x-2">
                            <button onClick={() => setPage('public')} className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors">Public</button>
                            <button onClick={() => setPage('admin')} className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors">Admin</button>
                        </nav>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;