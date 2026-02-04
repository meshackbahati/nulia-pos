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
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs font-bold"
            >
                <div className="w-4 h-4 text-blue-600">
                    <MapPin className="w-full h-full" />
                </div>
                <span className="uppercase tracking-tight">{selectedBranch?.name || 'Select Hub'}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-20 animate-in">
                        <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800 mb-1">Switch Hub</p>
                        {branches.map((branch) => (
                            <button
                                key={branch.id}
                                onClick={() => handleSelectBranch(branch)}
                                className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${selectedBranch?.id === branch.id
                                        ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/40'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
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
