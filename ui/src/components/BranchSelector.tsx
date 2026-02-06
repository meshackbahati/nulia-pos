import { useState, useEffect } from 'react';
import { ChevronDown, MapPin, Globe } from 'lucide-react';
import api from '../lib/api-client';
import { useAuth } from '../contexts/AuthContext';

interface Branch {
    id: string;
    name: string;
    currency: string;
}

export default function BranchSelector() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        const savedBranchId = localStorage.getItem('selectedBranchId');
        if (savedBranchId && branches.length > 0) {
            const branch = branches.find(b => b.id === savedBranchId);
            if (branch) setSelectedBranch(branch);
        } else if (branches.length > 0) {
            // Default select first branch only if NOT admin or if admin has explicity selected one previously
            // Actually, for admin default should be "All Branches" (null) if nothing saved
            if (user?.role !== 'admin') {
                setSelectedBranch(branches[0]);
            }
        }
    }, [branches, user]);

    const fetchBranches = async () => {
        try {
            const res = await api.getBranches();
            if (res.data.branches) {
                setBranches(res.data.branches);
            }
        } catch (error) {
            console.error('Failed to fetch branches:', error);
        }
    };

    const handleSelectBranch = (branch: Branch | null) => {
        setSelectedBranch(branch);
        if (branch) {
            localStorage.setItem('selectedBranchId', branch.id);
            window.dispatchEvent(new CustomEvent('branchChanged', { detail: branch }));
        } else {
            localStorage.removeItem('selectedBranchId'); // All Branches
            window.dispatchEvent(new CustomEvent('branchChanged', { detail: null }));
        }
        setIsOpen(false);
        window.location.reload();
    };

    if (branches.length <= 1 && user?.role !== 'admin') return null;

    return (
        <div className="relative font-body">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary/20 transition-all text-xs font-bold shadow-sm"
            >
                <div className="w-4 h-4 text-primary">
                    {selectedBranch ? <MapPin className="w-full h-full" /> : <Globe className="w-full h-full" />}
                </div>
                <span className="uppercase tracking-tight">{selectedBranch?.name || 'All Branches'}</span>
                <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-popover rounded-xl shadow-xl border border-border py-2 z-20 animate-in fade-in zoom-in-95 duration-200">
                        <p className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50 mb-1">Switch Hub</p>
                        {user?.role === 'admin' && (
                            <button
                                onClick={() => handleSelectBranch(null)}
                                className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${!selectedBranch
                                    ? 'text-primary bg-primary/10'
                                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                                    }`}
                            >
                                All Branches
                            </button>
                        )}
                        {branches.map((branch) => (
                            <button
                                key={branch.id}
                                onClick={() => handleSelectBranch(branch)}
                                className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${selectedBranch?.id === branch.id
                                    ? 'text-primary bg-primary/10'
                                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                                    }`}
                            >
                                {branch.name}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
