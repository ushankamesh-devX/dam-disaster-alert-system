import SymbolIcon from '../components/ui/SymbolIcon';
import { lazy } from 'react';
import { Typography } from '@mui/material';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import AuthLayout from '../layouts/AuthLayout';
import AdminLayout from '../layouts/AdminLayout';
import ProtectedRoute from '../components/guards/ProtectedRoute';
import AdminRoute from '../components/guards/AdminRoute';

const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const HomePage = lazy(() => import('../pages/HomePage'));
const PublicAlertsPage = lazy(() => import('../pages/PublicAlertsPage'));
const DashboardPage = lazy(() => import('../pages/admin/DashboardPage'));
const DamsPage = lazy(() => import('../pages/admin/DamsPage'));
const DamDetailPage = lazy(() => import('../pages/admin/DamDetailPage'));
const SensorsPage = lazy(() => import('../pages/admin/SensorsPage'));
const SensorDetailPage = lazy(() => import('../pages/admin/SensorDetailPage'));
const AlertsPage = lazy(() => import('../pages/admin/AlertsPage'));
const UsersPage = lazy(() => import('../pages/admin/UsersPage'));
const RolesPage = lazy(() => import('../pages/admin/RolesPage'));
const RegionsPage = lazy(() => import('../pages/admin/RegionsPage'));
const MapFuncPage = lazy(() => import('../pages/admin/MapFuncPage'));
const MapDetailedPage = lazy(() => import('../pages/admin/MapDetailedPage'));
const NewsPage = lazy(() => import('../pages/admin/NewsPage'));
const SystemSafeLocationsMapFuncPage = lazy(() => import('../pages/admin/SystemSafeLocationsMapFuncPage'));
const DeviceKeysPage = lazy(() => import('../pages/admin/DeviceKeysPage'));
const ReportsPage = lazy(() => import('../pages/admin/ReportsPage'));


function Soon({ title }) {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <p className="text-3xl mb-2"><SymbolIcon name="construction" /></p>
                <Typography component="h2" variant="h2" className="text-lg font-semibold text-gray-800">{title}</Typography>
                <p className="text-sm text-gray-400 mt-1">Coming soon</p>
            </div>
        </div>
    );
}

const router = createBrowserRouter([
    { path: '/', element: <Navigate to="/login" replace /> },

    // ── Public Information Page (no authentication required) ─────────────────
    { path: '/alerts', element: <PublicAlertsPage /> },
    { path: '/public/alerts', element: <Navigate to="/alerts" replace /> },

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
                    { path: '/admin/device-keys', element: <DeviceKeysPage /> },
                    { path: '/admin/alerts', element: <AlertsPage /> },
                    { path: '/admin/reports', element: <ReportsPage /> },
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
                    <Typography component="h1" variant="h1" className="text-5xl font-bold text-gray-200 mb-4">404</Typography>
                    <p className="text-gray-500 text-sm">Page not found</p>
                </div>
            </div>
        ),
    },
]);

export default router;