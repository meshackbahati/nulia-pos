import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: ('admin' | 'manager' | 'head_of_sales' | 'salesperson')[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        // Redirect to login but save the attempted location
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // User authorized but incorrect role
        // Redirect to their appropriate dashboard
        if (user.role === 'salesperson') {
            return <Navigate to="/sales-dashboard" replace />;
        }
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
