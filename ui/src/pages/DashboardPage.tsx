import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            navigate('/auth/login');
            return;
        }

        setUser(JSON.parse(userData));
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/auth/login');
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold">{import.meta.env.VITE_APP_NAME}</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">{user.name}</span>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 text-sm text-white bg-red-600 rounded hover:bg-red-700"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                Welcome to RetailPro!
                            </h2>
                            <p className="text-gray-600">
                                Dashboard functionality coming soon...
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                                Role: {user.role}
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
