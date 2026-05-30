import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Store,
    LayoutDashboard,
    Package,
    Users,
    Settings,
    LogOut,
    Menu,
    ShoppingBag,
    TrendingUp,
    Truck,
    Globe,
    X,
    ShieldCheck,
    ChevronLeft,
    ChevronRight,
    History
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import BranchSelector from './BranchSelector';

interface LayoutProps {
    children: React.ReactNode;
    role?: 'manager' | 'admin' | 'sales' | 'all';
    noScroll?: boolean;
}

export default function Layout({ children, noScroll = false }: LayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // Close sidebar on route change on mobile
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]);

    const menuItems = [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { label: 'POS Terminal', icon: Store, path: '/pos' },
        { label: 'Sales History', icon: History, path: '/sales-history' },
        { label: 'Branches', icon: Globe, path: '/manager/branches' },
        { label: 'Products', icon: Package, path: '/products' },
        { label: 'Inventory', icon: ShoppingBag, path: '/manager/purchase-orders' },
        { label: 'Transfer', icon: Truck, path: '/manager/inventory-transfer' },
        { label: 'Suppliers', icon: Truck, path: '/manager/suppliers' },
        { label: 'People', icon: Users, path: '/users' },
        { label: 'Analytics', icon: TrendingUp, path: '/analytics' },
        { label: 'Settings', icon: Settings, path: '/manager/settings' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/auth/login');
    };

    const filteredMenu = menuItems.filter(item => {
        if (!user) return false;
        const role = user.role;
        if (role === 'salesperson') return ['Dashboard', 'POS Terminal', 'Sales History', 'Products'].includes(item.label);
        if (role === 'head_of_sales') return !['Settings', 'Branches'].includes(item.label);
        if (role === 'manager') return item.label !== 'Branches';
        return true;
    });

    return (
        <div className="h-screen bg-background text-foreground flex font-body transition-colors duration-500 overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-[100] lg:hidden backdrop-blur-md animate-in fade-in"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Enhanced Visibility & Interaction */}
            <aside
                className={`fixed lg:relative top-0 left-0 z-[110] h-full glass border-r border-white/10 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    } ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}`}
            >
                <div className="h-full flex flex-col p-4 lg:p-6 relative overflow-hidden">
                    {/* Desktop Collapse Toggle - Floating Bridge */}
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex absolute -right-3 top-8 w-7 h-7 bg-primary text-primary-foreground rounded-full items-center justify-center shadow-xl border border-white/20 hover:scale-110 active:scale-95 transition-all z-[120]"
                    >
                        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                    </button>

                    {/* Header: Brand Node - High Contrast */}
                    <div className="flex-none flex items-center justify-between mb-8 lg:mb-12 overflow-hidden px-1">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-primary rounded-xl lg:rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/40 shrink-0 border border-white/30">
                                <Store className="w-5 h-5 lg:w-6 lg:h-6 text-primary-foreground" />
                            </div>
                            {!isCollapsed && (
                                <div className="animate-in fade-in duration-700">
                                    <h1 className="text-lg lg:text-xl font-black tracking-tighter text-foreground leading-none py-1">
                                        RETAIL<span className="text-primary italic">PRO</span>
                                    </h1>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em]">Node v2.0</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 bg-secondary/50 rounded-xl text-foreground hover:bg-destructive/10 hover:text-destructive transition-all"><X className="w-5 h-5" /></button>
                    </div>

                    {/* Navigation Arena */}
                    <nav className="flex-1 space-y-2 px-0.5 overflow-y-auto scrollbar-hide">
                        {filteredMenu.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-3 lg:gap-4 px-4 py-3 lg:px-5 lg:py-4 rounded-xl lg:rounded-[1.25rem] transition-all duration-300 group relative ${isActive
                                        ? 'bg-primary text-primary-foreground shadow-2xl shadow-primary/30 border border-white/10'
                                        : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                                        }`}
                                >
                                    <item.icon className={`w-4 h-4 lg:w-5 lg:h-5 shrink-0 ${isActive ? 'text-primary-foreground' : 'group-hover:text-primary group-hover:scale-110 transition-all'}`} />
                                    {!isCollapsed && <span className="text-[10px] lg:text-[11px] font-black uppercase tracking-[0.15em]">{item.label}</span>}
                                    
                                    {isActive && !isCollapsed && (
                                        <div className="absolute right-4 w-1 h-1 rounded-full bg-white animate-pulse" />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Node Status */}
                    <div className="flex-none mt-auto pt-6 lg:pt-8 border-t border-white/10 overflow-hidden">
                        <div className={`glass-card p-3 lg:p-4 flex items-center gap-3 lg:gap-4 mb-4 lg:mb-6 border-white/5 ${isCollapsed ? 'justify-center' : ''}`}>
                            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shrink-0">
                                <ShieldCheck className="w-4 h-4 lg:w-5 lg:h-5" />
                            </div>
                            {!isCollapsed && (
                                <div className="flex-1 min-w-0 animate-in fade-in duration-500">
                                    <p className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest text-foreground truncate">{user?.firstName}</p>
                                    <p className="text-[8px] lg:text-[9px] font-bold text-muted-foreground uppercase tracking-widest truncate opacity-60">{user?.role}</p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleLogout}
                            className={`w-full flex items-center gap-3 lg:gap-4 px-4 py-3 lg:px-5 lg:py-4 text-[10px] lg:text-[11px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 rounded-xl lg:rounded-2xl transition-all ${isCollapsed ? 'justify-center' : ''}`}
                        >
                            <LogOut className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" />
                            {!isCollapsed && <span>Logout</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Execution Arena */}
            <div className="flex-1 flex flex-col h-full min-w-0 relative overflow-hidden">
                {/* Top Navbar Node */}
                <header className="sticky top-0 z-50 h-16 lg:h-20 bg-background/40 backdrop-blur-2xl border-b border-white/5 px-4 lg:px-8 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4 lg:gap-6">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2.5 bg-secondary/50 rounded-xl text-foreground hover:bg-primary/20 hover:text-primary transition-all border border-white/5 shadow-xl"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="hidden sm:flex items-center gap-3 lg:gap-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                            <div>
                                <h2 className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.3em] lg:tracking-[0.4em] text-muted-foreground truncate max-w-[150px] lg:max-w-none">
                                    Active: <span className="text-foreground border-b-2 border-primary/30 pb-0.5">{menuItems.find(i => i.path === location.pathname)?.label || 'System'}</span>
                                </h2>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 lg:gap-6">
                        <div className="scale-90 lg:scale-100">
                            <BranchSelector />
                        </div>
                        <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
                        <div className="p-1 lg:p-1.5 bg-secondary/30 rounded-xl lg:rounded-2xl border border-white/5 flex items-center">
                             <ThemeToggle />
                        </div>
                    </div>
                </header>

                {/* Main Content Node */}
                <main className={`flex-1 ${noScroll ? 'overflow-hidden' : 'p-4 lg:p-10 max-w-[1920px] mx-auto w-full animate-in fade-in duration-1000 overflow-y-auto'}`}>
                    {children}
                </main>
            </div>
        </div>
    );
}
