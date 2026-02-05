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
    Truck
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
        { label: 'Products', icon: Package, path: '/products' },
        { label: 'Inventory', icon: ShoppingBag, path: '/manager/purchase-orders' },
        { label: 'Suppliers', icon: Truck, path: '/manager/suppliers' },
        { label: 'People', icon: Users, path: '/users' },
        { label: 'Analytics', icon: TrendingUp, path: '/manager/analytics' },
        { label: 'Settings', icon: Settings, path: '/manager/settings' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/auth/login');
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex font-body">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-card border-r transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    } ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}`}
            >
                <div className="h-full flex flex-col p-4">
                    {/* Logo & Toggle */}
                    <div className="flex items-center justify-between mb-10 px-2 overflow-hidden">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 shrink-0">
                                <Store className="w-6 h-6" />
                            </div>
                            {!isCollapsed && (
                                <div className="animate-in fade-in slide-in-from-left-2">
                                    <h1 className="text-xl font-display font-bold tracking-tight">BorderShop</h1>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                        {user?.role?.replace(/_/g, ' ') || 'Manager'}
                                    </p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className={`p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-all duration-300 ${isCollapsed ? 'lg:flex absolute top-4 left-5 bg-card border shadow-sm z-50 animate-pulse-subtle' : 'hidden lg:flex'}`}
                        >
                            <Menu className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1">
                        {menuItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group font-medium ${isActive
                                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                        }`}
                                    title={isCollapsed ? item.label : ''}
                                >
                                    <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary transition-colors'
                                        }`} />
                                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Profile */}
                    <div className="mt-auto pt-6 border-t overflow-hidden">
                        <div className="flex items-center gap-3 px-2 mb-4">
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-lg font-bold text-primary shrink-0">
                                {user?.firstName?.[0] || 'U'}
                            </div>
                            {!isCollapsed && (
                                <div className="flex-1 min-w-0 animate-in fade-in">
                                    <p className="text-sm font-bold truncate">{user?.firstName || 'User'}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleLogout}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors ${isCollapsed ? 'justify-center' : ''
                                }`}
                            title={isCollapsed ? 'Sign Out' : ''}
                        >
                            <LogOut className="w-4 h-4 shrink-0" />
                            {!isCollapsed && <span>Sign Out</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-screen min-w-0">
                {/* Top Navbar */}
                <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-md border-b px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h2 className="text-lg font-display font-semibold hidden sm:block">
                            {menuItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <BranchSelector />
                        <div className="h-6 w-px bg-border hidden sm:block"></div>
                        <ThemeToggle />
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 lg:p-10 max-w-[1920px] mx-auto w-full animate-in">
                    {children}
                </main>
            </div>
        </div>
    );
}
