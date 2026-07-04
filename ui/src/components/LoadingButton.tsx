import { Loader2 } from 'lucide-react';

interface LoadingButtonProps {
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
    children: React.ReactNode;
    className?: string;
}

export default function LoadingButton({ onClick, loading, disabled, variant = 'primary', children, className = '' }: LoadingButtonProps) {
    const base = 'flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2';
    const variants = {
        primary: 'bg-primary text-primary-foreground hover:opacity-90',
        secondary: 'bg-secondary/30 text-foreground hover:bg-secondary/50',
        danger: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className={`${base} ${variants[variant]} ${loading ? 'opacity-60 cursor-not-allowed' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
        >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {children}
        </button>
    );
}
