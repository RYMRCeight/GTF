import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import type { User } from '@supabase/supabase-js';
import type { Document, Department, Status } from '../../types';
import type { Role } from '../../App';

interface DocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentToEdit: Document | null;
    departments: Department[];
    statuses: Status[];
    showStatus: (message: string) => void;
    showConfirm: (message: string, onConfirm: () => void) => void;
    onDataRefresh: () => void;
    documentsCount: number;
    user: User;
    role: Role;
}

const DocumentModal: React.FC<DocumentModalProps> = ({ isOpen, onClose, documentToEdit, departments, statuses, showStatus, showConfirm, onDataRefresh, documentsCount, user, role }) => {
    const [formData, setFormData] = useState({
        title: '',
        department: '',
        sender: '',
        received_by: user.email || '',
        status: '',
        remarks: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (documentToEdit) {
            setFormData({
                title: documentToEdit.title,
                department: documentToEdit.department,
                sender: documentToEdit.sender,
                received_by: user.email || '',
                status: documentToEdit.status,
                remarks: documentToEdit.remarks || '',
            });
        } else {
            setFormData({
                title: '', department: '', sender: '', received_by: user.email || '', status: '', remarks: '',
            });
        }
    }, [documentToEdit, user]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const correctRecentHistoryEntry = async (docId: string, action: string, received_by: string | null, statusOverride?: string) => {
        // Give the trigger a moment to fire and commit.
        await new Promise(resolve => setTimeout(resolve, 250));

        const { data: historyEntry, error: findError } = await supabase
            .from('document_history')
            .select('id, created_at')
            .eq('document_id', docId)
            .is('action', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (findError || !historyEntry) {
            console.warn(`Could not find trigger-generated history entry for doc ${docId}. Creating fallback.`, findError);
            const { error: insertError } = await supabase.from('document_history').insert([{
                document_id: docId,
                action,
                received_by,
                department: formData.department,
                status: statusOverride || formData.status,
                remarks: formData.remarks,
            }]);
            
            if (insertError) {
                showStatus(`Failed to log history: ${insertError.message}`);
            }
        } else {
            const { error: updateError } = await supabase
                .from('document_history')
                .update({ action, received_by })
                .eq('id', historyEntry.id);

            if (updateError) {
                showStatus(`Failed to update history: ${updateError.message}`);
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.department || !formData.sender || !formData.status) {
            showStatus("Please fill out all required fields.");
            return;
        }
        setIsSaving(true);
        let error = null;

        const { received_by, ...docData } = formData;
        const { sender, ...restOfDocData } = docData;
        const docDataForSupabase = { ...restOfDocData, submitter: sender };

        if (documentToEdit) { // Update
            const { error: updateError } = await supabase.from('documents').update(docDataForSupabase).eq('id', documentToEdit.id);
            error = updateError;
            if (!error) {
                const hasMeaningfulChange = docData.department !== documentToEdit.department ||
                                          docData.status !== documentToEdit.status ||
                                          docData.remarks !== (documentToEdit.remarks || '');
                if (hasMeaningfulChange) {
                    await correctRecentHistoryEntry(documentToEdit.id, 'Updated', user.email || '');
                }
            }
        } else { // Create
            const today = new Date();
            const year = today.getFullYear().toString().slice(-2);
            const month = (today.getMonth() + 1).toString().padStart(2, '0');
            const count = documentsCount + 1;
            const documentNumber = `LGU-${year}${month}-${count}`;
            
            const { data: newDocument, error: insertError } = await supabase
                .from('documents')
                .insert([{ ...docDataForSupabase, documentNumber, processingDays: 0 }])
                .select()
                .single();
                
            error = insertError;

            if (!error && newDocument) {
                await correctRecentHistoryEntry(newDocument.id, 'Created', user.email || '');
            }
        }

        if (error) {
            showStatus(`Error saving document: ${error.message}`);
        } else {
            showStatus(documentToEdit ? "Document updated successfully!" : "Document created successfully!");
            onDataRefresh();
            onClose();
        }
        setIsSaving(false);
    };

    const handleDelete = () => {
        if (!documentToEdit || role !== 'admin') return;
        showConfirm("Are you sure you want to delete this document and all its history?", async () => {
            // Deleting the document should cascade or be handled by triggers, but for safety:
            const { error: historyError } = await supabase.from('document_history').delete().eq('document_id', documentToEdit.id);
            if (historyError) {
                showStatus(`Could not clear history, but will attempt to delete document: ${historyError.message}`);
            }
            const { error: docError } = await supabase.from('documents').delete().eq('id', documentToEdit.id);
            if (docError) {
                showStatus(`Error deleting document: ${docError.message}`);
            } else {
                showStatus("Document deleted successfully.");
                onDataRefresh();
                onClose();
            }
        });
    };

    const handleHistoryAction = async (action: 'Received' | 'Released' | 'Completed') => {
        if (!documentToEdit) return;

        setIsSaving(true);
        let nextStatus = '';
        if (action === 'Received') nextStatus = 'In Process';
        if (action === 'Released') nextStatus = 'Forwarded';
        if (action === 'Completed') nextStatus = 'Completed';

        const { received_by, ...docData } = formData;
        const { sender, ...restOfDocData } = docData;
        const docDataForSupabase = { ...restOfDocData, submitter: sender };

        // 1. Update the document first. This will fire the trigger which creates the 'null' action history entry.
        const { error: updateError } = await supabase
            .from('documents')
            .update({ ...docDataForSupabase, status: nextStatus })
            .eq('id', documentToEdit.id);

        if (updateError) {
            showStatus(`Failed to update document: ${updateError.message}`);
            setIsSaving(false);
            return;
        }

        // 2. Now, find and correct the history entry that the trigger just created.
        await correctRecentHistoryEntry(
            documentToEdit.id,
            action,
            formData.received_by,
            nextStatus
        );

        showStatus(`Document successfully marked as ${action}!`);
        onDataRefresh();
        onClose();
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4 fade-in">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg m-4 slide-up">
                <h3 className="text-xl font-semibold mb-6 text-slate-900">{documentToEdit ? 'Edit Document' : 'Add New Document'}</h3>
                <form onSubmit={handleSave} className="space-y-4">
                    <InputField id="title" label="Document Title" value={formData.title} onChange={handleChange} required />
                    <SelectField id="department" label="Department" value={formData.department} onChange={handleChange} options={departments.map(d => d.name)} required />
                    <InputField id="sender" label="Sender" value={formData.sender} onChange={handleChange} required />
                    {documentToEdit && (role === 'admin' || role === 'encoder') && <InputField id="received_by" label="Action Performed By" value={formData.received_by} onChange={handleChange} required />}
                    <SelectField id="status" label="Status" value={formData.status} onChange={handleChange} options={statuses.map(s => s.name)} required />
                    <TextareaField id="remarks" label="Remarks (optional)" value={formData.remarks} onChange={handleChange} />

                    <div className="pt-6 flex justify-between items-center">
                        {documentToEdit && role === 'admin' ? (
                             <button type="button" onClick={handleDelete} className="text-sm font-semibold text-red-600 hover:text-red-800 transition-colors">Delete Document</button>
                        ) : <div />}
                        <div className="flex items-center space-x-2">
                            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">Cancel</button>
                            <button type="submit" disabled={isSaving} className="rounded-md bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all duration-200 hover:scale-105 active:scale-100">
                                {isSaving ? 'Saving...' : 'Save Document'}
                            </button>
                        </div>
                    </div>
                    {documentToEdit && (role === 'admin' || role === 'encoder') && (
                        <div className="mt-4 pt-4 border-t border-slate-200 flex space-x-2">
                             <button type="button" disabled={isSaving} onClick={() => handleHistoryAction('Received')} className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50 transition-colors">Receive</button>
                             <button type="button" disabled={isSaving} onClick={() => handleHistoryAction('Released')} className="flex-1 rounded-md bg-yellow-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-600 disabled:opacity-50 transition-colors">Release</button>
                             <button type="button" disabled={isSaving} onClick={() => handleHistoryAction('Completed')} className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">Complete</button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

// Sub-components for form fields
const InputField: React.FC<{ id: string, label: string, value: string, onChange: (e: any) => void, required?: boolean }> = ({ id, label, value, onChange, required }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium leading-6 text-gray-700">{label}</label>
        <div className="mt-2">
            <input type="text" id={id} value={value} onChange={onChange} required={required} className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 bg-white ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow duration-150" />
        </div>
    </div>
);
const SelectField: React.FC<{ id: string, label: string, value: string, onChange: (e: any) => void, options: string[], required?: boolean }> = ({ id, label, value, onChange, options, required }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium leading-6 text-gray-700">{label}</label>
        <div className="mt-2">
            <select id={id} value={value} onChange={onChange} required={required} className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 bg-white ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow duration-150">
                <option value="">Select a {label}</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    </div>
);
const TextareaField: React.FC<{ id: string, label: string, value: string, onChange: (e: any) => void }> = ({ id, label, value, onChange }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium leading-6 text-gray-700">{label}</label>
        <div className="mt-2">
            <textarea id={id} value={value} onChange={onChange} rows={3} className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 bg-white ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow duration-150"></textarea>
        </div>
    </div>
);

export default DocumentModal;