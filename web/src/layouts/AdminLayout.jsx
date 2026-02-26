import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';

export default function AdminLayout() {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((p) => !p)} />
            <div
                className="flex-1 flex flex-col transition-all duration-200 ease-out"
                style={{ marginLeft: collapsed ? 64 : 240 }}
            >
                <TopBar onMenuClick={() => setCollapsed((p) => !p)} />
                <main className="flex-1 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
