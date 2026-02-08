import React, { createContext, useContext, useState, useCallback } from 'react';
import CustomModal from '../components/CustomModal';

type ModalType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

interface ModalOptions {
    title: string;
    message: string;
    type?: ModalType;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
}

interface ModalContextType {
    showAlert: (title: string, message: string, type?: ModalType) => void;
    showConfirm: (options: ModalOptions) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ModalOptions>({
        title: '',
        message: '',
        type: 'info'
    });

    const showAlert = useCallback((title: string, message: string, type: ModalType = 'info') => {
        setOptions({ title, message, type });
        setIsOpen(true);
    }, []);

    const showConfirm = useCallback((confirmOptions: ModalOptions) => {
        setOptions({ ...confirmOptions, type: confirmOptions.type || 'confirm' });
        setIsOpen(true);
    }, []);

    const handleClose = () => {
        setIsOpen(false);
    };

    return (
        <ModalContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            <CustomModal
                isOpen={isOpen}
                onClose={handleClose}
                {...options}
            />
        </ModalContext.Provider>
    );
}

export function useModal() {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
}
