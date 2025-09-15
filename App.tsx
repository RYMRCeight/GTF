import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './services/supabase';
import { User } from '@supabase/supabase-js';
import type { Document, Department, Status, SiteConfig, HistoryEntry } from './types';
import Header from './components/Header';
import PublicPage from './components/PublicPage';
import AdminPage from './components/AdminPage';
import Spinner from './components/ui/Spinner';
import StatusModal from './components/modals/StatusModal';
import ConfirmModal from './components/modals/ConfirmModal';

type Page = 'public' | 'admin';
export type Role = 'admin' | 'encoder';
const ADMIN_UID = '544264a0-dcd6-445d-b59c-63dc0162b4e6';

const App: React.FC = () => {
    const [page, setPage] = useState<Page>('public');
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<Role | null>(null);
    const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
    const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);

    const [documents, setDocuments] = useState<Document[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);

    const [statusModal, setStatusModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; onConfirm: () => void }>({ isOpen: false, message: '', onConfirm: () => {} });

    const showStatus = (message: string) => setStatusModal({ isOpen: true, message });
    const showConfirm = (message: string, onConfirm: () => void) => setConfirmModal({ isOpen: true, message, onConfirm });

    const fetchSiteConfigs = useCallback(async () => {
        const { data, error } = await supabase.from('site_configs').select('logo_url').single();
        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching site configs:', error.message);
        } else if (data) {
            setSiteConfig(data);
        }
    }, []);

    const fetchAllData = useCallback(async () => {
        const docQuery = 'id, created_at, updated_at, title, department, sender:submitter, status, documentNumber, remarks, processingDays';
        const [docs, depts, stats] = await Promise.all([
            supabase.from('documents').select(docQuery).order('created_at', { ascending: false }),
            supabase.from('departments').select('*').order('name'),
            supabase.from('statuses').select('*').order('name')
        ]);

        if (docs.error) console.error('Error fetching documents:', docs.error.message);
        else setDocuments(docs.data as Document[]);

        if (depts.error) console.error('Error fetching departments:', depts.error.message);
        else setDepartments(depts.data as Department[]);
        
        if (stats.error) console.error('Error fetching statuses:', stats.error.message);
        else setStatuses(stats.data as Status[]);

    }, []);

    useEffect(() => {
        fetchSiteConfigs();
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            
            if (currentUser) {
                setRole(currentUser.id === ADMIN_UID ? 'admin' : 'encoder');
                setPage('admin');
                fetchAllData();
            } else {
                setRole(null);
                setPage('public');
            }
            setIsAuthReady(true);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [fetchAllData, fetchSiteConfigs]);
    
    useEffect(() => {
        if (!user) return;

        const documentsChannel = supabase.channel('public:documents')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => fetchAllData())
            .subscribe();
        
        const departmentsChannel = supabase.channel('public:departments')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, () => fetchAllData())
            .subscribe();

        const statusesChannel = supabase.channel('public:statuses')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'statuses' }, () => fetchAllData())
            .subscribe();
        
        const siteConfigsChannel = supabase.channel('public:site_configs')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'site_configs' }, () => fetchSiteConfigs())
            .subscribe();

        return () => {
            supabase.removeChannel(documentsChannel);
            supabase.removeChannel(departmentsChannel);
            supabase.removeChannel(statusesChannel);
            supabase.removeChannel(siteConfigsChannel);
        };
    }, [user, fetchAllData, fetchSiteConfigs]);


    const handleSignOut = () => {
        showConfirm('Are you sure you want to sign out?', async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
                showStatus(`Error signing out: ${error.message}`);
            } else {
                showStatus('You have been successfully signed out.');
                setUser(null);
                setPage('public');
            }
        });
    };

    if (!isAuthReady) {
        return (
            <div className="flex items-center justify-center h-full">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="min-h-full">
            <Header page={page} setPage={setPage} user={user} siteLogoUrl={siteConfig?.logo_url || ''} />
            <main className="py-8 sm:py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {page === 'public' && <PublicPage showStatus={showStatus} />}
                    {page === 'admin' && (
                        <AdminPage 
                            user={user}
                            role={role}
                            documents={documents}
                            departments={departments}
                            statuses={statuses}
                            onSignOut={handleSignOut}
                            showStatus={showStatus}
                            showConfirm={showConfirm}
                            onDataRefresh={fetchAllData}
                        />
                    )}
                </div>
            </main>
            <StatusModal
                isOpen={statusModal.isOpen}
                message={statusModal.message}
                onClose={() => setStatusModal({ isOpen: false, message: '' })}
            />
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onClose={() => setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })}
            />
        </div>
    );
};

export default App;