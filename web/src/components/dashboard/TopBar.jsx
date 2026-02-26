import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function TopBar({ onMenuClick }) {
    const { user, clearAuth } = useAuth();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [userMenu, setUserMenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const fn = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenu(false); };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    const initials = user?.fullName
        ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
        : 'AD';

    return (
        <header className="h-14 bg-white border-b border-gray-200/80 flex items-center gap-3 px-4 sticky top-0 z-30 shrink-0">
            {/* Search bar */}
            <div className="flex-1 max-w-md">
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search dams, sensors, alerts..."
                        className="w-full bg-gray-100 border border-transparent rounded-lg pl-9 pr-3 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    />
                </div>
            </div>

            <div className="flex-1" />

            {/* Right: notification + user */}
            <div className="flex items-center gap-1">
                {/* Notification bell */}
                <button className="relative w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                </button>

                {/* Divider */}
                <div className="w-px h-6 bg-gray-200 mx-1" />

                {/* User avatar + menu */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setUserMenu((p) => !p)}
                        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                            {initials}
                        </div>
                        <div className="hidden sm:block text-left">
                            <p className="text-sm font-medium text-gray-800 leading-tight max-w-[110px] truncate">
                                {user?.fullName || 'Admin'}
                            </p>
                            <p className="text-xs text-gray-400 leading-tight truncate">
                                {user?.role?.name || 'Administrator'}
                            </p>
                        </div>
                        <svg className="w-4 h-4 text-gray-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Dropdown */}
                    {userMenu && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-200/60 overflow-hidden z-50">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <p className="text-sm font-semibold text-gray-900 truncate">{user?.fullName}</p>
                                <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
                                <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                    {user?.role?.code || 'ADMIN'}
                                </span>
                            </div>
                            <div className="p-1">
                                <button
                                    onClick={() => { clearAuth(); navigate('/login'); }}
                                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Sign out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
