import { useState, useEffect } from 'react';
import { ChevronDown, MapPin, Globe, Check } from 'lucide-react';
import api from '../lib/api-client';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Branch {
    id: string;
    name: string;
    currency: string;
}

export default function BranchSelector() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const { user, switchBranch } = useAuth();

    useEffect(() => {
        fetchBranches();
    }, []);

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

    const handleSwitchBranch = async (branch: Branch | null) => {
        if (!user || user.role !== 'admin') return;

        try {
            if (branch) {
                await switchBranch(branch.id);
            } else {
                // For "All Branches" view - just update local state
                // This doesn't call backend, just clears active branch for analytics
                localStorage.removeItem('selectedBranchId');
                window.dispatchEvent(new CustomEvent('branchChanged', { detail: null }));
            }
            setIsOpen(false);
            // Reload to reflect changes
            window.location.reload();
        } catch (error: any) {
            console.error('Failed to switch branch:', error);
            toast.error(error.message || 'Failed to switch branch');
        }
    };

    // Don't render if no branches or only one branch for non-admins
    if (branches.length <= 1 && user?.role !== 'admin') return null;

    const activeBranch = user?.branch;

    return (
        <div className="relative font-body">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary/20 transition-all text-xs font-bold shadow-sm"
            >
                <div className="w-4 h-4 text-primary">
                    {activeBranch ? <MapPin className="w-full h-full" /> : <Globe className="w-full h-full" />}
                </div>
                <span className="uppercase tracking-tight">{activeBranch?.name || 'All Branches'}</span>
                <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-popover rounded-xl shadow-xl border border-border py-2 z-20 animate-in fade-in zoom-in-95 duration-200">
                        <p className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50 mb-1">
                            Switch Branch
                        </p>

                        {/* Show current active branch */}
                        {activeBranch && (
                            <div className="px-4 py-1.5 text-[10px] text-muted-foreground">
                                Active: <span className="text-foreground font-medium">{activeBranch.name}</span>
                            </div>
                        )}

                        {user?.role === 'admin' && (
                            <button
                                onClick={() => handleSwitchBranch(null)}
                                className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors flex items-center justify-between
                                    ${!activeBranch
                                        ? 'text-primary bg-primary/10'
                                        : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                                    }`}
                            >
                                <span>All Branches (Analytics)</span>
                                {!activeBranch && <Check className="w-3 h-3" />}
                            </button>
                        )}

                        <div className="border-t border-border/50 my-1" />

                        {branches.map((branch) => (
                            <button
                                key={branch.id}
                                onClick={() => handleSwitchBranch(branch)}
                                className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors flex items-center justify-between
                                    ${activeBranch?.id === branch.id
                                        ? 'text-primary bg-primary/10'
                                        : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                                    }`}
                            >
                                <span>{branch.name}</span>
                                {activeBranch?.id === branch.id && <Check className="w-3 h-3" />}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
