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
    ShieldCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import BranchSelector from './BranchSelector';

interface LayoutProps {
    children: React.ReactNode;
    role?: 'manager' | 'admin' | 'sales' | 'all';
}

export default function Layout({ children }: LayoutProps) {
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
        { label: 'Branches', icon: Globe, path: '/manager/branches' },
        { label: 'Products', icon: Package, path: '/products' },
        { label: 'Inventory', icon: ShoppingBag, path: '/manager/purchase-orders' },
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
        if (role === 'salesperson') return ['Dashboard', 'POS Terminal', 'Products'].includes(item.label);
        if (role === 'head_of_sales') return !['Settings', 'Branches'].includes(item.label);
        if (role === 'manager') return item.label !== 'Branches';
        return true;
    });

    return (
        <div className="min-h-screen bg-background text-foreground flex font-body transition-colors duration-500">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-[60] lg:hidden backdrop-blur-md animate-in fade-in"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Natural Glass style */}
            <aside
                className={`fixed lg:sticky top-0 left-0 z-[70] h-screen glass border-r transition-all duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    } ${isCollapsed ? 'lg:w-24' : 'lg:w-80'}`}
            >
                <div className="h-full flex flex-col p-6">
                    {/* Header: Brand Node */}
                    <div className="flex items-center justify-between mb-12 overflow-hidden px-2">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 shrink-0 border border-white/20">
                                <Store className="w-6 h-6 text-primary-foreground" />
                            </div>
                            {!isCollapsed && (
                                <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                                    <h1 className="text-xl font-black tracking-tighter uppercase">RE <span className="text-primary text-sm font-bold">PRO</span></h1>
                                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-1">RetailPro OS v2</p>
                                </div>
                            )}
                        </div>
                        <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden lg:flex p-2 bg-secondary/50 rounded-xl"><Menu className="w-5 h-5" /></button>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 bg-secondary/50 rounded-xl"><X className="w-5 h-5" /></button>
                    </div>

                    {/* Navigation Arena */}
                    <nav className="flex-1 space-y-2 px-1">
                        {filteredMenu.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${isActive
                                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
                                        : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                                        }`}
                                >
                                    <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary-foreground' : 'group-hover:text-primary transition-colors'}`} />
                                    {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Node Status */}
                    <div className="mt-auto pt-8 border-t border-white/10 overflow-hidden">
                        <div className="glass-card p-4 flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            {!isCollapsed && (
                                <div className="flex-1 min-w-0 animate-in fade-in">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground truncate">{user?.firstName}</p>
                                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest truncate">{user?.role}</p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleLogout}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 rounded-2xl transition-all ${isCollapsed ? 'justify-center' : ''}`}
                        >
                            <LogOut className="w-4 h-4 shrink-0" />
                            {!isCollapsed && <span>De-Authenticate</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Execution Arena */}
            <div className="flex-1 flex flex-col min-h-screen min-w-0">
                {/* Top Navbar Node */}
                <header className="sticky top-0 z-50 h-20 bg-background/60 backdrop-blur-xl border-b px-8 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-3 bg-secondary/50 rounded-2xl text-muted-foreground hover:text-foreground"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="hidden sm:flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                                Active Module: <span className="text-foreground">{menuItems.find(i => i.path === location.pathname)?.label || 'System Core'}</span>
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:block">
                            <BranchSelector />
                        </div>
                        <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
                        <ThemeToggle />
                    </div>
                </header>

                {/* Main Content Node */}
                <main className="flex-1 p-6 lg:p-12 max-w-[1920px] mx-auto w-full animate-in fade-in duration-700">
                    {children}
                </main>
            </div>
        </div>
    );
}
