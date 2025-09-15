import React from 'react';

interface StatusModalProps {
    isOpen: boolean;
    message: string;
    onClose: () => void;
}

const StatusModal: React.FC<StatusModalProps> = ({ isOpen, message, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4 fade-in">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm m-4 text-center slide-up">
                <p className="text-gray-800 font-medium mb-6">{message}</p>
                <button
                    onClick={onClose}
                    className="rounded-md bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-blue-800 transition-all duration-200 hover:scale-105 active:scale-100"
                >
                    OK
                </button>
            </div>
        </div>
    );
};

export default StatusModal;