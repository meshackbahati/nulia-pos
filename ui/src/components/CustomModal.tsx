import React from 'react';
import { X, AlertTriangle, Info, CheckCircle2, AlertCircle } from 'lucide-react';

interface CustomModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error' | 'confirm';
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    onClose: () => void;
}

export default function CustomModal({
    isOpen,
    title,
    message,
    type = 'info',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    onClose
}: CustomModalProps) {
    if (!isOpen) return null;

    const icons = {
        info: <Info className="w-6 h-6 text-blue-500" />,
        success: <CheckCircle2 className="w-6 h-6 text-emerald-500" />,
        warning: <AlertTriangle className="w-6 h-6 text-amber-500" />,
        error: <AlertCircle className="w-6 h-6 text-destructive" />,
        confirm: <AlertTriangle className="w-6 h-6 text-primary" />,
    };

    const buttonStyles = {
        info: 'bg-blue-500 hover:bg-blue-600 text-white',
        success: 'bg-emerald-500 hover:bg-emerald-600 text-white',
        warning: 'bg-amber-500 hover:bg-amber-600 text-white',
        error: 'bg-destructive hover:bg-destructive/90 text-white',
        confirm: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-muted">
                                {icons[type]}
                            </div>
                            <h3 className="text-lg font-bold text-foreground">{title}</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted rounded-md"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {message}
                    </p>
                </div>

                <div className="bg-muted/30 px-6 py-4 flex items-center justify-end gap-3 border-t border-border">
                    {(type === 'confirm' || onCancel) && (
                        <button
                            onClick={() => {
                                if (onCancel) onCancel();
                                onClose();
                            }}
                            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (onConfirm) onConfirm();
                            onClose();
                        }}
                        className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 ${buttonStyles[type]}`}
                    >
                        {type === 'confirm' ? confirmText : 'OK'}
                    </button>
                </div>
            </div>
        </div>
    );
}
