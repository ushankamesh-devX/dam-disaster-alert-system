import { createBrowserRouter, Navigate } from 'react-router-dom';

import AuthLayout from '../layouts/AuthLayout';
import AdminLayout from '../layouts/AdminLayout';
import ProtectedRoute from '../components/guards/ProtectedRoute';
import AdminRoute from '../components/guards/AdminRoute';

import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import HomePage from '../pages/HomePage';
import DashboardPage from '../pages/admin/DashboardPage';
import DamsPage from '../pages/admin/DamsPage';
import DamDetailPage from '../pages/admin/DamDetailPage';
import SensorsPage from '../pages/admin/SensorsPage';
import SensorDetailPage from '../pages/admin/SensorDetailPage';
import UsersPage from '../pages/admin/UsersPage';
import RolesPage from '../pages/admin/RolesPage';
import RegionsPage from '../pages/admin/RegionsPage';
import MapFuncPage from '../pages/admin/MapFuncPage';
import MapDetailedPage from '../pages/admin/MapDetailedPage';
import NewsPage from '../pages/admin/NewsPage';
import SystemSafeLocationsMapFuncPage from '../pages/admin/SystemSafeLocationsMapFuncPage';


function Soon({ title }) {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <p className="text-3xl mb-2">🚧</p>
                <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
                <p className="text-sm text-gray-400 mt-1">Coming soon</p>
            </div>
        </div>
    );
}

const router = createBrowserRouter([
    { path: '/', element: <Navigate to="/login" replace /> },

    {
        element: <AuthLayout />,
        children: [
            { path: '/login', element: <LoginPage /> },
            { path: '/register', element: <RegisterPage /> },
        ],
    },

    {
        element: <ProtectedRoute />,
        children: [
            { path: '/home', element: <HomePage /> },
        ],
    },

    {
        element: <AdminRoute />,
        children: [
            {
                element: <AdminLayout />,
                children: [
                    { path: '/admin', element: <Navigate to="/admin/dashboard" replace /> },
                    { path: '/admin/dashboard', element: <DashboardPage /> },
                    { path: '/admin/dams', element: <DamsPage /> },
                    { path: '/admin/dams/:id', element: <DamDetailPage /> },
                    { path: '/admin/dams/:id/map', element: <MapDetailedPage /> },
                    { path: '/admin/sensors', element: <SensorsPage /> },
                    { path: '/admin/sensors/:id', element: <SensorDetailPage /> },
                    { path: '/admin/alerts', element: <Soon title="Alerts" /> },
                    { path: '/admin/users', element: <UsersPage /> },
                    { path: '/admin/regions', element: <RegionsPage /> },
                    { path: '/admin/roles', element: <RolesPage /> },
                    { path: '/admin/news', element: <NewsPage /> },
                    { path: '/admin/settings', element: <Soon title="Settings" /> },
                    { path: '/admin/mapFunc', element: <MapFuncPage /> },
                    { path: '/admin/system-safe-locations-test', element: <SystemSafeLocationsMapFuncPage /> },
                ],
            },
        ],
    },

    {
        path: '*',
        element: (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center text-center">
                <div>
                    <h1 className="text-5xl font-bold text-gray-200 mb-4">404</h1>
                    <p className="text-gray-500 text-sm">Page not found</p>
                </div>
            </div>
        ),
    },
]);

export default router;