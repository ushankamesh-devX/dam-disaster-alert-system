import SymbolIcon from '../../components/ui/SymbolIcon';
import { Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { LoadingSkeleton as Skeleton, DetailDrawer, AppButton, AppInput } from '../../components/ui/controls';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllRoles } from '../../services/user.service';
import { getUsersByRole } from '../../services/user.service';
import { Users, Waves, RadioTower, Bell, Globe, KeyRound, ClipboardList, Settings, Wrench, FileText, Search, Check, Minus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton as UiSkeleton } from '@/components/ui/skeleton';
import {
    Table as UiTable, TableBody as UiTableBody, TableCell as UiTableCell, TableHead as UiTableHead,
    TableHeader as UiTableHeader, TableRow as UiTableRow,
} from '@/components/ui/table';

// ─── Helpers ──────────────────────────────────────────────────────────────────


const MODULE_ICONS = {
    users: <SymbolIcon name="users" />, dams: <SymbolIcon name="dam" />, sensors: <SymbolIcon name="sensor" />,
    alerts: <SymbolIcon name="alert" />, regions: <SymbolIcon name="map" />, roles: <SymbolIcon name="key" />,
    reports: <SymbolIcon name="chart" />, settings: <SymbolIcon name="settings" />, system: <SymbolIcon name="construction" />,
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

    // The drawer mounts fresh for each role, so loadingUsers already starts as true
    useEffect(() => {
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
        <DetailDrawer onClose={onClose}>

            <div className="flex h-full flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100"
                    style={{ borderLeft: `4px solid ${role.color || '#6366f1'}` }}>
                    <div>
                        <div className="flex items-center gap-2">
                            <Typography component="h2" variant="h2" className="text-sm font-bold text-gray-900">{role.name}</Typography>
                            {role.isDefault && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Default</span>}
                            {role.isSystemRole && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">System</span>}
                        </div>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{role.code}</p>
                    </div>
                    <AppButton iconOnly aria-label="Close" onClick={onClose} className="w-7 h-7 flex items-center justify-center"><SymbolIcon name="close" /></AppButton>
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
                        <Typography component="h3" variant="h3" className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Permissions by Module</Typography>
                        {modules.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-6">No permissions assigned</p>
                        ) : (
                            <div className="space-y-3">
                                {modules.map(([mod, perms]) => (
                                    <div key={mod} className="border border-gray-100 rounded-xl overflow-hidden">
                                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                                            <span>{MODULE_ICONS[mod] || <SymbolIcon name="report" />}</span>
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
                            <Typography component="h3" variant="h3" className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                Recent Users ({userCount} total)
                            </Typography>
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
        </DetailDrawer>
    );
}

// ─── Role Card ────────────────────────────────────────────────────────────────
const MODULE_LUCIDE = { users: Users, dams: Waves, sensors: RadioTower, alerts: Bell, regions: Globe, roles: KeyRound, reports: ClipboardList, settings: Settings, system: Wrench };

/** { module: ['view', 'create', ...] } so a card can say what each permission covers. */
function permissionsByModule(role) {
    const map = {};
    (role.permissions || []).forEach((p) => {
        const mod = (p.module || 'general').toLowerCase();
        (map[mod] ||= []).push((p.action || p.code || '').replaceAll('_', ' '));
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
}

function RoleCard({ role, onClick }) {
    const permsCount = (role.permissions || []).length;
    const modules = permissionsByModule(role);

    return (
        <Card className="gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
            <button type="button" onClick={onClick} className="flex h-full flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="h-1 w-full" style={{ background: role.color || 'var(--primary)' }} />
                <CardHeader className="gap-1 px-5 pt-4 pb-3">
                    <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-base">{role.name}</CardTitle>
                        <Badge variant="outline" className="shrink-0 tabular-nums" title={PRIORITY_LABELS[role.priorityLevel] ? `${PRIORITY_LABELS[role.priorityLevel]} priority` : 'Priority'}>
                            P{role.priorityLevel}
                        </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <code className="text-xs text-muted-foreground">{role.code}</code>
                        {role.isDefault && <Badge variant="secondary">Default</Badge>}
                        {role.isSystemRole && <Badge variant="secondary">System</Badge>}
                    </div>
                    {role.description && <CardDescription className="line-clamp-2">{role.description}</CardDescription>}
                </CardHeader>

                <CardContent className="flex-1 space-y-1.5 px-5 pb-4">
                    {modules.length === 0 && <p className="text-sm text-muted-foreground">No permissions</p>}
                    {modules.map(([mod, actions]) => {
                        const Icon = MODULE_LUCIDE[mod] || FileText;
                        return (
                            <div key={mod} className="flex items-start gap-2 text-sm">
                                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                                <span className="w-16 shrink-0 font-medium capitalize">{mod}</span>
                                <span className="text-muted-foreground">{actions.join(', ')}</span>
                            </div>
                        );
                    })}
                </CardContent>

                <CardFooter className="justify-between border-t px-5 py-2.5 text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className={`size-2 rounded-full ${role.isActive ? 'bg-success' : 'bg-muted-foreground'}`} />
                        {role.isActive ? 'Active' : 'Inactive'} · {permsCount} permissions
                    </span>
                    <span className="font-medium text-primary">View details →</span>
                </CardFooter>
            </button>
        </Card>
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


    const sortedRoles = [...roles].sort((a, b) => (a.priorityLevel || 99) - (b.priorityLevel || 99));
    const allPerms = Object.values(Object.fromEntries(roles.flatMap((r) => (r.permissions || []).map((p) => [p.code, p]))))
        .sort((a, b) => `${a.module}:${a.action}`.localeCompare(`${b.module}:${b.action}`));

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-xl font-semibold">Roles & Permissions</h1>
                <p className="text-sm text-muted-foreground">
                    {loading ? 'Loading…' : `${roles.length} roles · ${roles.filter((r) => r.isActive).length} active · ${allPerms.length} permissions across ${allModules.length} modules`}
                </p>
            </div>

            {/* Search + Module filter */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative md:w-80">
                    <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input aria-label="Search roles" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search roles…" className="pl-8" />
                </div>
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by module">
                    <Button size="sm" variant={!filterModule ? 'default' : 'outline'} onClick={() => setFilterModule('')}>All modules</Button>
                    {allModules.map((mod) => {
                        const Icon = MODULE_LUCIDE[mod] || FileText;
                        return (
                            <Button key={mod} size="sm" variant={filterModule === mod ? 'default' : 'outline'} className="capitalize"
                                aria-pressed={filterModule === mod} onClick={() => setFilterModule((m) => (m === mod ? '' : mod))}>
                                <Icon /> {mod}
                            </Button>
                        );
                    })}
                </div>
            </div>

            {/* Cards grid */}
            {loading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => <UiSkeleton key={i} className="h-64 w-full rounded-xl" />)}
                </div>
            ) : visible.length === 0 ? (
                <div className="rounded-xl border border-dashed py-16 text-center">
                    <KeyRound className="mx-auto mb-2 size-8 text-muted-foreground" aria-hidden />
                    <p className="text-sm text-muted-foreground">No roles match your search</p>
                    {(search || filterModule) && (
                        <Button variant="link" onClick={() => { setSearch(''); setFilterModule(''); }}>Clear filters</Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {visible.map((role) => (
                        <RoleCard key={role.id} role={role} onClick={() => setSelectedRole(role)} />
                    ))}
                </div>
            )}

            {/* Permissions matrix */}
            {!loading && roles.length > 0 && (
                <Card className="gap-0 py-0">
                    <CardHeader className="border-b px-5 py-3">
                        <CardTitle className="text-sm">Permission matrix</CardTitle>
                        <CardDescription>Which role has which permission, highest priority first</CardDescription>
                    </CardHeader>
                    <UiTable>
                        <UiTableHeader>
                            <UiTableRow>
                                <UiTableHead className="sticky left-0 z-10 min-w-48 bg-card">Permission</UiTableHead>
                                {sortedRoles.map((r) => <UiTableHead key={r.id} className="text-center">{r.name}</UiTableHead>)}
                            </UiTableRow>
                        </UiTableHeader>
                        <UiTableBody>
                            {allPerms.map((perm) => {
                                const Icon = MODULE_LUCIDE[(perm.module || '').toLowerCase()] || FileText;
                                return (
                                    <UiTableRow key={perm.code}>
                                        <UiTableCell className="sticky left-0 bg-card">
                                            <div className="flex items-center gap-2">
                                                <Icon className="size-4 text-muted-foreground" aria-hidden />
                                                <span className="capitalize">{perm.module}</span>
                                                <span className="text-muted-foreground">· {(perm.action || perm.code).replaceAll('_', ' ')}</span>
                                            </div>
                                        </UiTableCell>
                                        {sortedRoles.map((r) => {
                                            const has = (r.permissions || []).some((p) => p.code === perm.code);
                                            return (
                                                <UiTableCell key={r.id} className="text-center">
                                                    {has
                                                        ? <Check className="mx-auto size-4 text-success" aria-label="Yes" />
                                                        : <Minus className="mx-auto size-4 text-border" aria-label="No" />}
                                                </UiTableCell>
                                            );
                                        })}
                                    </UiTableRow>
                                );
                            })}
                        </UiTableBody>
                    </UiTable>
                </Card>
            )}

            {/* Detail Drawer */}
            {selectedRole && (
                <RoleDrawer role={selectedRole} onClose={() => setSelectedRole(null)} />
            )}
        </div>
    );
}
