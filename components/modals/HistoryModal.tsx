import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import type { HistoryEntry } from '../../types';
import Spinner from '../ui/Spinner';

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    docId: string;
    showStatus: (message: string) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, docId, showStatus }) => {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && docId) {
            const fetchHistory = async () => {
                setIsLoading(true);
                const { data, error } = await supabase
                    .from('document_history')
                    .select('*')
                    .eq('document_id', docId)
                    .order('created_at', { ascending: true });

                if (error) {
                    showStatus(`Error fetching history: ${error.message}`);
                } else {
                    setHistory(data as HistoryEntry[]);
                }
                setIsLoading(false);
            };
            fetchHistory();
        }
    }, [isOpen, docId, showStatus]);

    if (!isOpen) return null;

    const formatDuration = (milliseconds: number) => {
        if (milliseconds < 0) return 'N/A';
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours % 24}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes % 60}m ${seconds % 60}s`;
        return `${seconds % 60}s`;
    };

    let previousDate: Date | null = null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4 fade-in">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-4xl m-4 slide-up">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Document History</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="overflow-y-auto max-h-[70vh] border border-slate-200 rounded-lg">
                    {isLoading ? <div className="p-10"><Spinner /></div> : (
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performed By</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {history.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-10 text-gray-500">No history found for this document.</td></tr>
                                ) : (
                                    history.map((entry, index) => {
                                        const entryDate = new Date(entry.created_at);
                                        const duration = previousDate ? formatDuration(entryDate.getTime() - previousDate.getTime()) : 'N/A';
                                        previousDate = entryDate;
                                        const actionDisplay = `${entry.action || 'Updated'} (${entry.status || 'N/A'})`;

                                        return (
                                            <tr key={entry.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{entryDate.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-sm text-gray-800">{entry.department || '—'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-800 font-medium">{actionDisplay}</td>
                                                <td className="px-6 py-4 text-sm text-gray-800">{entry.received_by || '—'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{duration}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500 break-words">{entry.remarks || '—'}</td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HistoryModal;