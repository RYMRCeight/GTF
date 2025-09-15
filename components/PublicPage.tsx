import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import type { Document } from '../types';
import Spinner from './ui/Spinner';
import HistoryModal from './modals/HistoryModal';
import { SearchIcon, DocumentIcon, HistoryIcon } from './Icons';

const PublicPage: React.FC<{ showStatus: (message: string) => void; }> = ({ showStatus }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [senderName, setSenderName] = useState('');
    const [results, setResults] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [noResults, setNoResults] = useState(false);
    
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyDocId, setHistoryDocId] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!searchTerm.trim() || !senderName.trim()) {
            showStatus("Please enter both a document identifier and a sender's name.");
            return;
        }
        
        setIsLoading(true);
        setNoResults(false);
        setResults([]);

        const docQuery = 'id, created_at, updated_at, title, department, sender:submitter, status, documentNumber, remarks, processingDays';
        const { data, error } = await supabase
            .from('documents')
            .select(docQuery)
            .ilike('submitter', `%${senderName.trim()}%`)
            .or(`documentNumber.ilike.%${searchTerm.trim()}%,title.ilike.%${searchTerm.trim()}%`);

        setIsLoading(false);

        if (error) {
            console.error('Error searching documents:', error.message);
            showStatus(`Error searching: ${error.message}`);
            return;
        }

        if (data.length === 0) {
            setNoResults(true);
        } else {
            setResults(data as Document[]);
        }
    };

    const openHistoryModal = (docId: string) => {
        setHistoryDocId(docId);
        setIsHistoryModalOpen(true);
    };

    return (
        <div className="fade-in">
            <section className="mb-12">
                <div className="max-w-xl mx-auto bg-white p-8 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-semibold leading-tight text-gray-900 mb-2 text-center">Track a Document</h2>
                    <p className="text-gray-600 mb-6 text-center">Enter the document number or title and the sender's name to check its status.</p>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="search-term" className="sr-only">Document Number or Title</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <SearchIcon />
                                </div>
                                <input
                                    type="text"
                                    id="search-term"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Enter Document Number or Title"
                                    className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-gray-900 bg-white ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow duration-150"
                                />
                            </div>
                        </div>
                        <div>
                             <label htmlFor="sender-name" className="sr-only">Sender's Name</label>
                            <input
                                type="text"
                                id="sender-name"
                                value={senderName}
                                onChange={(e) => setSenderName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Enter Sender's Name"
                                className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 bg-white ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow duration-150"
                            />
                        </div>
                        <button onClick={handleSearch} disabled={isLoading} className="w-full rounded-md bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all duration-200 hover:scale-[1.02] active:scale-100">
                            {isLoading ? 'Searching...' : 'Search Document'}
                        </button>
                    </div>
                </div>
            </section>
            <div className="space-y-4">
                {isLoading && (
                    <div className="text-center text-gray-500 py-20">
                        <Spinner />
                        <h3 className="mt-4 text-sm font-semibold text-gray-900">Searching for your document...</h3>
                    </div>
                )}
                {noResults && (
                    <div className="text-center text-gray-500 py-20 slide-up">
                        <DocumentIcon />
                        <h3 className="mt-4 text-sm font-semibold text-gray-900">Document Not Found</h3>
                        <p className="mt-1 text-sm text-gray-500">Please check the details and try again.</p>
                    </div>
                )}
                {results.map((doc, index) => (
                    <div key={doc.id} className="bg-white rounded-lg shadow-md p-6 border border-slate-200 slide-up" style={{ animationDelay: `${index * 100}ms`, opacity: 0 }}>
                        <div className="flex flex-col sm:flex-row items-start justify-between mb-3">
                            <h3 className="text-lg font-semibold text-gray-800 mb-2 sm:mb-0">{doc.title}</h3>
                            <div className="flex items-center space-x-3">
                                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-200">
                                    {doc.status}
                                </span>
                                <button onClick={() => openHistoryModal(doc.id)} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition" title="View History">
                                    <HistoryIcon />
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">
                            <span className="font-medium text-gray-700">Document No:</span> {doc.documentNumber}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm text-gray-600 mb-4 border-t border-slate-100 pt-4">
                            <div><span className="font-medium text-gray-800">Sender:</span> {doc.sender}</div>
                            <div><span className="font-medium text-gray-800">Processing Days:</span> {doc.processingDays}</div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 text-xs text-gray-400">
                            <span>Created: <span className="font-medium text-gray-500">{new Date(doc.created_at).toLocaleString()}</span></span>
                            <span>Last Updated: <span className="font-medium text-gray-500">{new Date(doc.updated_at).toLocaleString()}</span></span>
                        </div>
                    </div>
                ))}
            </div>
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

export default PublicPage;