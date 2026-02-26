import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllRoles } from '../../services/user.service';
import { getUsersByRole } from '../../services/user.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Skeleton({ className }) { return <div className={`animate-pulse bg-gray-100 rounded ${className}`} />; }

const MODULE_ICONS = {
    users: '👤', dams: '🏔️', sensors: '📡',
    alerts: '🚨', regions: '🗺️', roles: '🔑',
    reports: '📊', settings: '⚙️', system: '🔧',
};

const ACTION_COLORS = {
    view: 'bg-blue-50 text-blue-700 border-blue-200',
    create: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    edit: 'bg-amber-50 text-amber-700 border-amber-200',
    delete: 'bg-red-50 text-red-600 border-red-200',
    manage: 'bg-violet-50 text-violet-700 border-violet-200',
};
function actionColor(action = '') {
    const a = action.toLowerCase();
    if (a.includes('delete')) return ACTION_COLORS.delete;
    if (a.includes('create')) return ACTION_COLORS.create;
    if (a.includes('edit') || a.includes('update')) return ACTION_COLORS.edit;
    if (a.includes('manage')) return ACTION_COLORS.manage;
    return ACTION_COLORS.view;
}

const PRIORITY_LABELS = { 1: 'Highest', 2: 'High', 3: 'Medium', 4: 'Low', 5: 'Lowest' };
const PRIORITY_COLORS = {
    1: 'bg-red-100 text-red-700',
    2: 'bg-orange-100 text-orange-700',
    3: 'bg-amber-100 text-amber-700',
    4: 'bg-blue-100 text-blue-700',
    5: 'bg-gray-100 text-gray-600',
};

// ─── Role Detail Drawer ───────────────────────────────────────────────────────
function RoleDrawer({ role, onClose }) {
    const [userCount, setUserCount] = useState(null);
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    useEffect(() => {
        setLoadingUsers(true);
        getUsersByRole(role.id, 0, 10)
            .then(page => {
                setUserCount(page?.totalElements ?? 0);
                setUsers(page?.content ?? []);
            })
            .catch(() => { })
            .finally(() => setLoadingUsers(false));
    }, [role.id]);

    // Group permissions by module
    const byModule = {};
    (role.permissions || []).forEach(p => {
        const mod = (p.module || 'general').toLowerCase();
        if (!byModule[mod]) byModule[mod] = [];
        byModule[mod].push(p);
    });
    const modules = Object.entries(byModule).sort(([a], [b]) => a.localeCompare(b));

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
            <div className="fixed right-0 top-0 h-full z-50 w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100"
                    style={{ borderLeft: `4px solid ${role.color || '#6366f1'}` }}>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-gray-900">{role.name}</h2>
                            {role.isDefault && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Default</span>}
                            {role.isSystemRole && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">System</span>}
                        </div>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{role.code}</p>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Meta */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">Priority</p>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[role.priorityLevel] || 'bg-gray-100 text-gray-600'}`}>
                                {PRIORITY_LABELS[role.priorityLevel] || `L${role.priorityLevel}`}
                            </span>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">Permissions</p>
                            <p className="text-xl font-bold text-gray-900">{(role.permissions || []).length}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">Users</p>
                            <p className="text-xl font-bold text-gray-900">{loadingUsers ? '…' : (userCount ?? '—')}</p>
                        </div>
                    </div>

                    {/* Description */}
                    {role.description && (
                        <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3">{role.description}</p>
                    )}

                    {/* Permissions by module */}
                    <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Permissions by Module</h3>
                        {modules.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-6">No permissions assigned</p>
                        ) : (
                            <div className="space-y-3">
                                {modules.map(([mod, perms]) => (
                                    <div key={mod} className="border border-gray-100 rounded-xl overflow-hidden">
                                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                                            <span>{MODULE_ICONS[mod] || '📄'}</span>
                                            <span className="text-xs font-semibold text-gray-700 capitalize">{mod}</span>
                                            <span className="ml-auto text-[10px] text-gray-400">{perms.length} permission{perms.length !== 1 ? 's' : ''}</span>
                                        </div>
                                        <div className="p-3 flex flex-wrap gap-1.5">
                                            {perms.sort((a, b) => (a.action || '').localeCompare(b.action || '')).map(p => (
                                                <span key={p.id}
                                                    title={p.description || p.code}
                                                    className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${actionColor(p.action)}`}>
                                                    {p.action || p.code}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent users with this role */}
                    {!loadingUsers && users.length > 0 && (
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                Recent Users ({userCount} total)
                            </h3>
                            <div className="space-y-2">
                                {users.slice(0, 6).map(u => {
                                    const initials = (u.fullName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                                    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500'];
                                    const color = colors[(u.fullName?.charCodeAt(0) || 0) % colors.length];
                                    return (
                                        <div key={u.id} className="flex items-center gap-2.5 py-1.5">
                                            <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>{initials}</div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-gray-800 truncate">{u.fullName}</p>
                                                <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                                            </div>
                                            <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 font-medium
                                                ${(u.status || '').toLowerCase() === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                                {u.status}
                                            </span>
                                        </div>
                                    );
                                })}
                                {userCount > 6 && <p className="text-[10px] text-gray-400 text-center">+{userCount - 6} more users</p>}
                            </div>
                        </div>
                    )}

                    {/* Meta footer */}
                    <div className="text-[11px] text-gray-400 pt-2 border-t border-gray-50">
                        Created {role.createdAt ? new Date(role.createdAt).toLocaleDateString() : '—'}
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── Role Card ────────────────────────────────────────────────────────────────
function RoleCard({ role, onClick }) {
    const permsCount = (role.permissions || []).length;
    const modulesSet = new Set((role.permissions || []).map(p => (p.module || 'general').toLowerCase()));
    const accentColor = role.color || '#6366f1';

    return (
        <button onClick={onClick}
            className="text-left w-full bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group">
            {/* Accent strip */}
            <div className="h-1.5 w-full" style={{ background: accentColor }} />

            <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-gray-900">{role.name}</h3>
                            {role.isDefault && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Default</span>
                            )}
                            {role.isSystemRole && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">System</span>
                            )}
                        </div>
                        <p className="text-[11px] font-mono text-gray-400 mt-0.5">{role.code}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[role.priorityLevel] || 'bg-gray-100 text-gray-500'}`}>
                        P{role.priorityLevel}
                    </span>
                </div>

                {/* Description */}
                {role.description && (
                    <p className="text-xs text-gray-500 mb-4 line-clamp-2">{role.description}</p>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                    <span><strong className="text-gray-900">{permsCount}</strong> permissions</span>
                    <span><strong className="text-gray-900">{modulesSet.size}</strong> modules</span>
                </div>

                {/* Module icons */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {[...modulesSet].sort().map(mod => (
                        <span key={mod} title={mod}
                            className="w-7 h-7 text-sm rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                            {MODULE_ICONS[mod] || '📄'}
                        </span>
                    ))}
                    {modulesSet.size === 0 && <span className="text-[11px] text-gray-300 italic">No permissions</span>}
                </div>

                {/* Permissions preview pills */}
                <div className="flex flex-wrap gap-1">
                    {(role.permissions || []).slice(0, 5).map(p => (
                        <span key={p.id} className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${actionColor(p.action)}`}>{p.action || p.code}</span>
                    ))}
                    {permsCount > 5 && (
                        <span className="text-[10px] text-gray-400 px-1.5 py-0.5">+{permsCount - 5} more</span>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${role.isActive ? 'text-emerald-700 bg-emerald-50' : 'text-gray-500 bg-gray-100'}`}>
                    {role.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="text-[11px] text-blue-600 group-hover:underline font-medium">View details →</span>
            </div>
        </button>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RolesPage() {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState(null);
    const [filterModule, setFilterModule] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        setLoading(true);
        getAllRoles()
            .then(list => setRoles(list || []))
            .catch(() => toast.error('Failed to load roles'))
            .finally(() => setLoading(false));
    }, []);

    // All unique modules across all roles
    const allModules = [...new Set(
        roles.flatMap(r => (r.permissions || []).map(p => (p.module || 'general').toLowerCase()))
    )].sort();

    // Filtered view
    const visible = roles.filter(r => {
        const matchSearch = !search ||
            r.name?.toLowerCase().includes(search.toLowerCase()) ||
            r.code?.toLowerCase().includes(search.toLowerCase()) ||
            r.description?.toLowerCase().includes(search.toLowerCase());
        const matchModule = !filterModule ||
            (r.permissions || []).some(p => (p.module || '').toLowerCase() === filterModule);
        return matchSearch && matchModule;
    }).sort((a, b) => (a.priorityLevel || 99) - (b.priorityLevel || 99));

    // Summary stats
    const totalPerms = roles.reduce((acc, r) => acc + (r.permissions?.length || 0), 0);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Roles & Permissions</h1>
                    <p className="text-sm text-gray-400">
                        {loading ? '…' : `${roles.length} roles · ${totalPerms} permissions across ${allModules.length} modules`}
                    </p>
                </div>
            </div>

            {/* Summary stat strip */}
            {!loading && roles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Total Roles', value: roles.length, color: 'bg-violet-500' },
                        { label: 'Active Roles', value: roles.filter(r => r.isActive).length, color: 'bg-emerald-500' },
                        { label: 'Total Permissions', value: totalPerms, color: 'bg-blue-500' },
                        { label: 'System Roles', value: roles.filter(r => r.isSystemRole).length, color: 'bg-amber-500' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`w-2 h-2 rounded-full ${color}`} />
                                <span className="text-xs text-gray-500">{label}</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Search + Module filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search roles by name, code, or description…"
                        className="w-full text-sm pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition" />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <button onClick={() => setFilterModule('')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${!filterModule ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        All Modules
                    </button>
                    {allModules.map(mod => (
                        <button key={mod} onClick={() => setFilterModule(m => m === mod ? '' : mod)}
                            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full border transition capitalize
                                ${filterModule === mod ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                            {MODULE_ICONS[mod] || '📄'} {mod}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cards grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 w-full" />)}
                </div>
            ) : visible.length === 0 ? (
                <div className="py-20 text-center">
                    <p className="text-4xl mb-3">🔑</p>
                    <p className="text-sm text-gray-400">No roles match your search</p>
                    {(search || filterModule) && (
                        <button onClick={() => { setSearch(''); setFilterModule(''); }} className="mt-2 text-xs text-blue-600 underline">Clear filters</button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visible.map(role => (
                        <RoleCard key={role.id} role={role} onClick={() => setSelectedRole(role)} />
                    ))}
                </div>
            )}

            {/* Permissions matrix table */}
            {!loading && roles.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                        <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Permission Matrix</h2>
                        <p className="text-[11px] text-gray-400 mt-0.5">All permissions by role (sorted by priority)</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap sticky left-0 bg-white z-10 min-w-[180px]">Permission</th>
                                    {[...roles].sort((a, b) => (a.priorityLevel || 99) - (b.priorityLevel || 99)).map(r => (
                                        <th key={r.id} className="px-3 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                            <div style={{ color: r.color || '#6366f1' }}>{r.name}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {/* Collect all unique permissions across all roles */}
                                {(() => {
                                    const allPermsMap = {};
                                    roles.forEach(r => {
                                        (r.permissions || []).forEach(p => {
                                            allPermsMap[p.code] = p;
                                        });
                                    });
                                    const sortedRoles = [...roles].sort((a, b) => (a.priorityLevel || 99) - (b.priorityLevel || 99));
                                    return Object.values(allPermsMap)
                                        .sort((a, b) => `${a.module}:${a.action}`.localeCompare(`${b.module}:${b.action}`))
                                        .map(perm => (
                                            <tr key={perm.code} className="hover:bg-gray-50/50">
                                                <td className="px-4 py-2.5 sticky left-0 bg-white">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm">{MODULE_ICONS[(perm.module || '').toLowerCase()] || '📄'}</span>
                                                        <div>
                                                            <p className="font-medium text-gray-800">{perm.action || perm.code}</p>
                                                            <p className="text-[10px] text-gray-400 capitalize">{perm.module}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                {sortedRoles.map(r => {
                                                    const has = (r.permissions || []).some(p => p.code === perm.code);
                                                    return (
                                                        <td key={r.id} className="px-3 py-2.5 text-center">
                                                            {has
                                                                ? <span className="text-emerald-500 text-base">✓</span>
                                                                : <span className="text-gray-200 text-base">✕</span>}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ));
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Detail Drawer */}
            {selectedRole && (
                <RoleDrawer role={selectedRole} onClose={() => setSelectedRole(null)} />
            )}
        </div>
    );
}
