import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Allows: SUPER_ADMIN, ADMIN, DAM_OPERATOR → /admin/dashboard
// Blocks:  NORMAL_USER                     → /home
const AdminRoute = () => {
    const { isAuthenticated, isDashboardUser, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-400">Loading…</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (!isDashboardUser) return <Navigate to="/home" replace />;

    return <Outlet />;
};

export default AdminRoute;

