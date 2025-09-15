import React from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
    onClose: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, message, onConfirm, onClose }) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4 fade-in">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm m-4 text-center slide-up">
                <p className="text-gray-800 font-medium mb-6">{message}</p>
                <div className="mt-4 flex justify-center space-x-4">
                     <button
                        onClick={onClose}
                        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                    >
                        No, Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
                    >
                        Yes, Continue
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;