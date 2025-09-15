import React, { useState, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import type { Document, Department, Status } from '../types';
import type { Role } from '../App';
import { StatTotalIcon, StatPendingIcon, StatApprovedIcon, StatOtherIcon, DocumentIcon, EditIcon, HistoryIcon } from './Icons';
import DocumentModal from './modals/DocumentModal';
import HistoryModal from './modals/HistoryModal';
import Spinner from './ui/Spinner';

interface AdminDashboardProps {
    user: User;
    role: Role;
    documents: Document[];
    departments: Department[];
    statuses: Status[];
    onSignOut: () => void;
    showStatus: (message: string) => void;
    showConfirm: (message: string, onConfirm: () => void) => void;
    onDataRefresh: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, role, documents, departments, statuses, onSignOut, showStatus, showConfirm, onDataRefresh }) => {
    // Filters State
    const [departmentFilter, setDepartmentFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [senderFilter, setSenderFilter] = useState('');
    
    // Modals State
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [editingDocument, setEditingDocument] = useState<Document | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyDocId, setHistoryDocId] = useState<string | null>(null);
    
    // Site Settings State
    const [isUploading, setIsUploading] = useState(false);

    // Department Management State
    const [newDepartmentName, setNewDepartmentName] = useState('');
    
    // Status Management State
    const [newStatusName, setNewStatusName] = useState('');
    const [editingStatus, setEditingStatus] = useState<Status | null>(null);

    const stats = useMemo(() => {
        const total = documents.length;
        const approved = documents.filter(d => d.status.toLowerCase() === 'approved' || d.status.toLowerCase() === 'completed').length;
        const pending = documents.filter(d => ['reviewing', 'submitted', 'in process', 'forwarded'].includes(d.status.toLowerCase())).length;
        const other = total - approved - pending;
        return { total, approved, pending, other };
    }, [documents]);

    const filteredDocuments = useMemo(() => {
        let filtered = documents;

        if (departmentFilter !== 'All') {
            filtered = filtered.filter(doc => doc.department === departmentFilter);
        }

        if (senderFilter.trim()) {
            filtered = filtered.filter(doc =>
                doc.sender.toLowerCase().includes(senderFilter.trim().toLowerCase())
            );
        }

        if (searchTerm.trim()) {
            const lowercasedSearchTerm = searchTerm.trim().toLowerCase();
            filtered = filtered.filter(doc =>
                doc.title.toLowerCase().includes(lowercasedSearchTerm) ||
                doc.documentNumber.toLowerCase().includes(lowercasedSearchTerm)
            );
        }
        return filtered;
    }, [documents, departmentFilter, searchTerm, senderFilter]);

    const handleUploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const filePath = `logos/lgu_logo_${Date.now()}`;
        
        try {
            const { error: uploadError } = await supabase.storage.from('lgu-assets').upload(filePath, file, { upsert: true });
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('lgu-assets').getPublicUrl(filePath);
            const { error: dbError } = await supabase.from('site_configs').upsert({ id: 1, logo_url: publicUrlData.publicUrl }, { onConflict: 'id' });
            if (dbError) throw dbError;

            showStatus("Logo uploaded successfully!");
        } catch (error: any) {
            showStatus(`Failed to upload logo: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddDepartment = async () => {
        if (!newDepartmentName.trim()) return;
        const { error } = await supabase.from('departments').insert({ name: newDepartmentName.trim() });
        if (error) {
            showStatus(`Error adding department: ${error.message}`);
        } else {
            setNewDepartmentName('');
            showStatus('Department added successfully.');
        }
    };

    const handleStatusSubmit = async () => {
        if (!newStatusName.trim()) return;
        if (editingStatus) { // Update
            const { error } = await supabase.from('statuses').update({ name: newStatusName.trim() }).eq('id', editingStatus.id);
            if (error) showStatus(`Error updating status: ${error.message}`);
            else {
                setEditingStatus(null);
                setNewStatusName('');
                showStatus('Status updated successfully.');
            }
        } else { // Add
            const { error } = await supabase.from('statuses').insert({ name: newStatusName.trim() });
            if (error) showStatus(`Error adding status: ${error.message}`);
            else {
                setNewStatusName('');
                showStatus('Status added successfully.');
            }
        }
    };

    const openDocumentModal = (doc: Document | null) => {
        setEditingDocument(doc);
        setIsDocModalOpen(true);
    };
    
    const openHistoryModal = (docId: string) => {
        setHistoryDocId(docId);
        setIsHistoryModalOpen(true);
    };

    const statusColors: { [key: string]: string } = {
        'Submitted': 'bg-blue-100 text-blue-800 ring-blue-200',
        'Reviewing': 'bg-yellow-100 text-yellow-800 ring-yellow-200',
        'Approved': 'bg-green-100 text-green-800 ring-green-200',
        'Rejected': 'bg-red-100 text-red-800 ring-red-200',
        'In Process': 'bg-purple-100 text-purple-800 ring-purple-200',
        'Forwarded': 'bg-indigo-100 text-indigo-800 ring-indigo-200',
        'Completed': 'bg-teal-100 text-teal-800 ring-teal-200',
        'Default': 'bg-slate-100 text-slate-800 ring-slate-200',
    };

    return (
        <div className="fade-in space-y-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold leading-tight text-slate-900">
                        {role === 'admin' ? 'Admin Dashboard' : 'Encoder Dashboard'}
                    </h2>
                    <p className="text-slate-500">Welcome, {user.email}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 mt-4 sm:mt-0">
                    <button onClick={() => openDocumentModal(null)} className="w-full sm:w-auto rounded-md bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-blue-800 transition-all duration-200 hover:scale-105 active:scale-100">
                        New Document
                    </button>
                    <button onClick={onSignOut} className="w-full sm:w-auto rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Stats */}
            <section>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Total Documents" value={stats.total} icon={<StatTotalIcon />} />
                    <StatCard title="Pending Review" value={stats.pending} icon={<StatPendingIcon />} />
                    <StatCard title="Approved / Completed" value={stats.approved} icon={<StatApprovedIcon />} />
                    <StatCard title="Other Statuses" value={stats.other} icon={<StatOtherIcon />} />
                </div>
            </section>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Management Column - Admin Only */}
                {role === 'admin' && (
                    <div className="lg:col-span-1 space-y-8">
                        <ManagementSection title="Site Settings">
                            <label htmlFor="logo-file-input" className="block text-sm font-medium text-gray-700 mb-2">Upload New Logo</label>
                            <input type="file" id="logo-file-input" accept="image/*" onChange={handleUploadLogo} disabled={isUploading} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"/>
                            {isUploading && <div className="mt-2"><Spinner /></div>}
                        </ManagementSection>

                        <ManagementSection title="Departments">
                            <div className="flex items-center w-full">
                                <input type="text" value={newDepartmentName} onChange={(e) => setNewDepartmentName(e.target.value)} placeholder="New Department Name" className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 bg-white ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow duration-150"/>
                                <button onClick={handleAddDepartment} className="ml-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors flex-shrink-0">Add</button>
                            </div>
                        </ManagementSection>

                         <ManagementSection title="Statuses">
                            <div className="flex items-center w-full mb-4">
                                <input type="text" value={newStatusName} onChange={e => setNewStatusName(e.target.value)} placeholder={editingStatus ? 'Update status name' : 'New Status Name'} className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 bg-white ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow duration-150" />
                                <button onClick={handleStatusSubmit} className="ml-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors flex-shrink-0">{editingStatus ? 'Update' : 'Add'}</button>
                                {editingStatus && <button onClick={() => { setEditingStatus(null); setNewStatusName(''); }} className="ml-2 text-xs text-gray-500 hover:text-gray-700">Cancel</button>}
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {statuses.map(s => (
                                    <div key={s.id} className="flex justify-between items-center bg-slate-50 rounded-md p-2 border border-slate-200">
                                        <span className="text-slate-800 text-sm">{s.name}</span>
                                        <button onClick={() => { setEditingStatus(s); setNewStatusName(s.name); }} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                                    </div>
                                ))}
                            </div>
                        </ManagementSection>
                    </div>
                )}
                
                {/* Documents Column */}
                <div className={role === 'admin' ? "lg:col-span-2" : "lg:col-span-3"}>
                     <section>
                        <div className="flex flex-col lg:flex-row justify-between items-center mb-6 gap-4">
                            <h2 className="text-xl font-bold leading-tight text-slate-900">Document Records</h2>
                            <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Search title or number..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="block w-full sm:w-auto rounded-md border-0 py-2 px-3 text-gray-900 bg-white ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow duration-150"
                                />
                                 <input 
                                    type="text" 
                                    placeholder="Filter by sender..." 
                                    value={senderFilter} 
                                    onChange={e => setSenderFilter(e.target.value)}
                                    className="block w-full sm:w-auto rounded-md border-0 py-2 px-3 text-gray-900 bg-white ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow duration-150"
                                />
                                <select id="department-filter" value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} className="block w-full sm:w-auto rounded-md border-0 py-2 px-3 text-gray-900 bg-white ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow duration-150">
                                    <option value="All">All Departments</option>
                                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-4">
                           {filteredDocuments.length === 0 ? (
                                <div className="text-center text-gray-500 py-20 border-2 border-dashed border-slate-200 rounded-lg">
                                    <DocumentIcon />
                                    <h3 className="mt-4 text-sm font-semibold text-gray-900">No Documents Found</h3>
                                    <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or create a new document.</p>
                                </div>
                           ) : (
                                filteredDocuments.map((doc, index) => (
                                     <div key={doc.id} className="bg-white rounded-lg shadow-md p-6 border border-slate-200 transition-all duration-300 hover:shadow-lg hover:border-blue-500 slide-up" style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}>
                                        <div className="flex flex-col sm:flex-row items-start justify-between mb-3">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-2 sm:mb-0 pr-4">{doc.title}</h3>
                                            <div className="flex items-center space-x-3 flex-shrink-0">
                                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[doc.status] || statusColors['Default']}`}>{doc.status}</span>
                                                <button onClick={() => openHistoryModal(doc.id)} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition" title="View History"><HistoryIcon /></button>
                                                <button onClick={() => openDocumentModal(doc)} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition" title="Edit Document"><EditIcon /></button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-500 mb-3"><span className="font-medium text-gray-700">Doc No:</span> {doc.documentNumber}</p>
                                        <p className="text-sm text-gray-500"><span className="font-medium text-gray-700">Department:</span> {doc.department}</p>
                                        <p className="text-sm text-gray-500 mb-4"><span className="font-medium text-gray-700">Sender:</span> {doc.sender}</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 text-xs text-gray-400 border-t border-slate-100 pt-3">
                                            <span>Created: <span className="font-medium text-gray-500">{new Date(doc.created_at).toLocaleString()}</span></span>
                                            <span>Updated: <span className="font-medium text-gray-500">{new Date(doc.updated_at).toLocaleString()}</span></span>
                                        </div>
                                    </div>
                                ))
                           )}
                        </div>
                    </section>
                </div>
            </div>

            {isDocModalOpen && (
                <DocumentModal
                    isOpen={isDocModalOpen}
                    onClose={() => setIsDocModalOpen(false)}
                    documentToEdit={editingDocument}
                    departments={departments}
                    statuses={statuses}
                    showStatus={showStatus}
                    showConfirm={showConfirm}
                    onDataRefresh={onDataRefresh}
                    documentsCount={documents.length}
                    user={user}
                    role={role}
                />
            )}
            
            {isHistoryModalOpen && historyDocId && (
                <HistoryModal 
                    isOpen={isHistoryModalOpen}
                    onClose={() => setIsHistoryModalOpen(false)}
                    docId={historyDocId}
                    showStatus={showStatus}
                />
            )}
        </div>
    );
};

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white rounded-xl shadow-md p-6 flex items-center space-x-4 border border-slate-200">
        <div className="rounded-full bg-slate-100 p-4">{icon}</div>
        <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
    </div>
);

const ManagementSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
            {children}
        </div>
    </section>
);

export default AdminDashboard;