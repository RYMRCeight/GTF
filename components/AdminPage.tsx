
import React from 'react';
import type { User } from '@supabase/supabase-js';
import type { Document, Department, Status } from '../types';
import type { Role } from '../App';
import LoginPage from './LoginPage';
import AdminDashboard from './AdminDashboard';

interface AdminPageProps {
    user: User | null;
    role: Role | null;
    documents: Document[];
    departments: Department[];
    statuses: Status[];
    onSignOut: () => void;
    showStatus: (message: string) => void;
    showConfirm: (message: string, onConfirm: () => void) => void;
    onDataRefresh: () => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ user, role, ...rest }) => {
    if (!user || !role) {
        return <LoginPage showStatus={rest.showStatus} />;
    }

    return <AdminDashboard user={user} role={role} {...rest} />;
};

export default AdminPage;
