import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NAV = [
    {
        group: 'Overview',
        items: [{ to: '/admin/dashboard', label: 'Dashboard', icon: HomeIcon }],
    },
    {
        group: 'Monitoring',
        items: [
            { to: '/admin/dams', label: 'Dams', icon: DamIcon },
            { to: '/admin/sensors', label: 'Sensors', icon: SensorIcon },
            { to: '/admin/alerts', label: 'Alerts', icon: BellIcon, badge: 3 },
        ],
    },
    {
        group: 'Management',
        items: [
            { to: '/admin/users', label: 'Users', icon: UsersIcon },
            { to: '/admin/regions', label: 'Regions', icon: MapIcon },
            { to: '/admin/roles', label: 'Roles', icon: ShieldIcon },
        ],
    },
    {
        group: 'System',
        items: [
            { to: '/admin/settings', label: 'Settings', icon: CogIcon },
            { to: '/admin/mapFunc', label: 'Map Test', icon: MapIcon },
            { to: '/admin/system-safe-locations-test', label: 'Evacuation Centers Test', icon: MapIcon }
        ],
    },
];

export default function Sidebar({ collapsed, onToggle }) {
    const { clearAuth } = useAuth();
    const navigate = useNavigate();

    return (
        <aside
            style={{ width: collapsed ? 64 : 240 }}
            className="fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-gray-200/80 transition-all duration-200 ease-out"
        >
            {/* Logo row */}
            <div className="flex items-center h-14 px-3 border-b border-gray-200/80 shrink-0 gap-2.5">
                <button
                    onClick={onToggle}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
                >
                    <MenuIcon className="w-5 h-5" />
                </button>
                {!collapsed && (
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
                            <BoltIcon className="w-3.5 h-3.5 text-white" />
                        </span>
                        <span className="text-gray-900 font-semibold text-sm tracking-tight whitespace-nowrap">DDAS Admin</span>
                    </div>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
                {NAV.map(({ group, items }) => (
                    <div key={group}>
                        {!collapsed && (
                            <p className="px-2 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                                {group}
                            </p>
                        )}
                        <div className="space-y-0.5">
                            {items.map(({ to, label, icon: Icon, badge }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    title={collapsed ? label : undefined}
                                    className={({ isActive }) =>
                                        `relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150
                    ${isActive
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                                            {!collapsed && <span className="truncate">{label}</span>}
                                            {badge && !collapsed && (
                                                <span className="ml-auto text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none">
                                                    {badge}
                                                </span>
                                            )}
                                            {badge && collapsed && (
                                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                                            )}
                                        </>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Bottom: Logout */}
            <div className="px-2 pb-3 pt-2 border-t border-gray-200/80 shrink-0">
                <button
                    onClick={() => { clearAuth(); navigate('/login'); }}
                    title={collapsed ? 'Sign out' : undefined}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                    <LogoutIcon className="w-[18px] h-[18px] shrink-0" />
                    {!collapsed && <span>Sign out</span>}
                </button>
            </div>
        </aside>
    );
}

/* Inline icons */
function MenuIcon({ className }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" /></svg>;
}
function BoltIcon({ className }) {
    return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" fill="none" /></svg>;
}
function HomeIcon({ className }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}
function DamIcon({ className }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>;
}
function SensorIcon({ className }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>;
}
function BellIcon({ className }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
}
function UsersIcon({ className }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
}
function MapIcon({ className }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>;
}
function ShieldIcon({ className }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
}
function CogIcon({ className }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function LogoutIcon({ className }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
}
