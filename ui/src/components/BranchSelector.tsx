import { useState, useEffect } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import api from '../lib/api-client';

interface Branch {
    id: string;
    name: string;
    currency: string;
}

export default function BranchSelector() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        const savedBranchId = localStorage.getItem('selectedBranchId');
        if (savedBranchId && branches.length > 0) {
            const branch = branches.find(b => b.id === savedBranchId);
            if (branch) setSelectedBranch(branch);
        } else if (branches.length > 0) {
            setSelectedBranch(branches[0]);
        }
    }, [branches]);

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

    const handleSelectBranch = (branch: Branch) => {
        setSelectedBranch(branch);
        localStorage.setItem('selectedBranchId', branch.id);
        setIsOpen(false);
        window.dispatchEvent(new CustomEvent('branchChanged', { detail: branch }));
        window.location.reload();
    };

    if (branches.length <= 1) return null;

    return (
        <div className="relative font-body">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary/20 transition-all text-xs font-bold shadow-sm"
            >
                <div className="w-4 h-4 text-primary">
                    <MapPin className="w-full h-full" />
                </div>
                <span className="uppercase tracking-tight">{selectedBranch?.name || 'Select Hub'}</span>
                <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-popover rounded-xl shadow-xl border border-border py-2 z-20 animate-in fade-in zoom-in-95 duration-200">
                        <p className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50 mb-1">Switch Hub</p>
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
