import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    getAllUsers, searchUsers, getUsersByStatus, getUsersByRole,
    adminCreateUser, updateUserProfile, updateUserStatus,
    updateUserRole, deleteUser, restoreUser,
    getUserStats, getAllRoles,
} from '../../services/user.service';

// ─── Constants ────────────────────────────────────────────────────────────────
const USER_STATUSES = ['active', 'inactive', 'suspended', 'pending_verification'];

const statusStyle = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    INACTIVE: 'bg-gray-50 text-gray-500 border-gray-200',
    SUSPENDED: 'bg-red-50 text-red-600 border-red-200',
    PENDING_VERIFICATION: 'bg-amber-50 text-amber-700 border-amber-200',
};
function sStyle(s = '') { return statusStyle[(s || '').toUpperCase()] || 'bg-gray-50 text-gray-500 border-gray-200'; }

const statusDot = {
    ACTIVE: 'bg-emerald-500',
    INACTIVE: 'bg-gray-400',
    SUSPENDED: 'bg-red-500',
    PENDING_VERIFICATION: 'bg-amber-400',
};
function sDot(s = '') { return statusDot[(s || '').toUpperCase()] || 'bg-gray-300'; }

// ─── Shared micro-components ──────────────────────────────────────────────────
function Badge({ children, className }) {
    return <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-md border capitalize ${className}`}>{children}</span>;
}
function Skeleton({ className }) { return <div className={`animate-pulse bg-gray-100 rounded ${className}`} />; }
function Inp({ label, error, ...p }) {
    return (
        <div>
            {label && <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>}
            <input className={`w-full text-sm px-3 py-2 rounded-lg border ${error ? 'border-red-400' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition`} {...p} />
            {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
        </div>
    );
}
function Sel({ label, children, ...p }) {
    return (
        <div>
            {label && <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>}
            <select className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition" {...p}>{children}</select>
        </div>
    );
}

// ─── Avatar initials ─────────────────────────────────────────────────────────
function Avatar({ name, url, size = 8 }) {
    const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500', 'bg-orange-500'];
    const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
    return url
        ? <img src={url} alt={name} className={`w-${size} h-${size} rounded-full object-cover`} />
        : <div className={`w-${size} h-${size} rounded-full ${color} flex items-center justify-center text-white text-xs font-bold`}>{initials}</div>;
}

// ─── Create User Modal ────────────────────────────────────────────────────────
function CreateUserModal({ roles, onClose, onCreated }) {
    const EMPTY = { fullName: '', email: '', phoneNumber: '', password: '', roleId: '', languagePreference: 'en', status: 'active' };
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const validate = () => {
        const e = {};
        if (!form.fullName) e.fullName = 'Required';
        if (!form.email) e.email = 'Required';
        if (!form.password || form.password.length < 8) e.password = 'Min 8 characters';
        if (!form.roleId) e.roleId = 'Required';
        setErrors(e);
        return !Object.keys(e).length;
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = { ...form, roleId: Number(form.roleId) };
            if (!payload.phoneNumber) delete payload.phoneNumber;
            const created = await adminCreateUser(payload);
            toast.success(`User "${created.fullName}" created`);
            onCreated(created);
            onClose();
        } catch (err) { toast.error(err?.response?.data?.message || 'Failed to create user'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-900">Create New User</h2>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">✕</button>
                </div>
                <form onSubmit={submit} className="p-6 space-y-4">
                    <Inp label="Full Name *" placeholder="Jane Doe" value={form.fullName} onChange={e => set('fullName', e.target.value)} error={errors.fullName} />
                    <Inp label="Email *" type="email" placeholder="jane@example.com" value={form.email} onChange={e => set('email', e.target.value)} error={errors.email} />
                    <Inp label="Phone Number" placeholder="+94771234567" value={form.phoneNumber} onChange={e => set('phoneNumber', e.target.value)} />
                    <Inp label="Password *" type="password" placeholder="Min 8 characters" value={form.password} onChange={e => set('password', e.target.value)} error={errors.password} />
                    <div className="grid grid-cols-2 gap-4">
                        <Sel label="Role *" value={form.roleId} onChange={e => set('roleId', e.target.value)} error={errors.roleId}>
                            <option value="">Select role…</option>
                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </Sel>
                        <Sel label="Status" value={form.status} onChange={e => set('status', e.target.value)}>
                            {USER_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </Sel>
                    </div>
                    <Sel label="Language" value={form.languagePreference} onChange={e => set('languagePreference', e.target.value)}>
                        <option value="en">English</option>
                        <option value="si">සිංහල (Sinhala)</option>
                        <option value="ta">தமிழ் (Tamil)</option>
                    </Sel>
                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                        <button type="submit" disabled={saving} className="px-5 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition">{saving ? 'Creating…' : 'Create User'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────
function EditProfileModal({ user, onClose, onUpdated }) {
    const [form, setForm] = useState({ fullName: user.fullName || '', phoneNumber: user.phoneNumber || '', languagePreference: user.languagePreference || 'en' });
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const updated = await updateUserProfile(user.id, form);
            toast.success('Profile updated');
            onUpdated(updated);
            onClose();
        } catch (err) { toast.error(err?.response?.data?.message || 'Update failed'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900">Edit Profile — {user.email}</h2>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">✕</button>
                </div>
                <form onSubmit={submit} className="p-5 space-y-3">
                    <Inp label="Full Name" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
                    <Inp label="Phone Number" value={form.phoneNumber} onChange={e => set('phoneNumber', e.target.value)} />
                    <Sel label="Language" value={form.languagePreference} onChange={e => set('languagePreference', e.target.value)}>
                        <option value="en">English</option>
                        <option value="si">සිංහල</option>
                        <option value="ta">தமிழ்</option>
                    </Sel>
                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                        <button type="submit" disabled={saving} className="px-4 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition">{saving ? 'Saving…' : 'Save'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Change Status Modal ──────────────────────────────────────────────────────
function ChangeStatusModal({ user, onClose, onUpdated }) {
    const [status, setStatus] = useState(user.status || 'active');
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const updated = await updateUserStatus(user.id, { status, reason: reason || undefined });
            toast.success('Status updated');
            onUpdated(updated);
            onClose();
        } catch (err) { toast.error(err?.response?.data?.message || 'Failed to update status'); }
        finally { setSaving(false); }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900">Change Status — {user.fullName}</h2>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">✕</button>
                </div>
                <form onSubmit={submit} className="p-5 space-y-3">
                    <Sel label="New Status" value={status} onChange={e => setStatus(e.target.value)}>
                        {USER_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </Sel>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Reason (optional)</label>
                        <textarea rows={2} className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition resize-none" value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for status change…" />
                    </div>
                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                        <button type="submit" disabled={saving} className="px-4 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition">{saving ? 'Saving…' : 'Update'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Change Role Modal ────────────────────────────────────────────────────────
function ChangeRoleModal({ user, roles, onClose, onUpdated }) {
    const [roleId, setRoleId] = useState(user.role?.id || '');
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!roleId) { toast.error('Select a role'); return; }
        setSaving(true);
        try {
            const updated = await updateUserRole(user.id, { roleId: Number(roleId), reason: reason || undefined });
            toast.success('Role updated');
            onUpdated(updated);
            onClose();
        } catch (err) { toast.error(err?.response?.data?.message || 'Failed to update role'); }
        finally { setSaving(false); }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900">Change Role — {user.fullName}</h2>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">✕</button>
                </div>
                <form onSubmit={submit} className="p-5 space-y-3">
                    <Sel label="New Role" value={roleId} onChange={e => setRoleId(e.target.value)}>
                        <option value="">Select role…</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </Sel>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Reason (optional)</label>
                        <textarea rows={2} className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition resize-none" value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for role change…" />
                    </div>
                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                        <button type="submit" disabled={saving} className="px-4 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition">{saving ? 'Saving…' : 'Update'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────
function DeleteModal({ user, onClose, onDeleted }) {
    const [saving, setSaving] = useState(false);
    const confirm = async () => {
        setSaving(true);
        try {
            await deleteUser(user.id);
            toast.success(`"${user.fullName}" deactivated`);
            onDeleted(user.id);
            onClose();
        } catch (err) { toast.error(err?.response?.data?.message || 'Failed to delete'); }
        finally { setSaving(false); }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-lg">⚠</span>
                    <div><h2 className="text-sm font-semibold text-gray-900">Deactivate User</h2><p className="text-xs text-gray-500">This is a soft delete — user can be restored</p></div>
                </div>
                <p className="text-sm text-gray-700 mb-5">Deactivate <strong>{user.fullName}</strong> ({user.email})?</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                    <button onClick={confirm} disabled={saving} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition">{saving ? 'Deactivating…' : 'Deactivate'}</button>
                </div>
            </div>
        </div>
    );
}

// ─── User Detail Drawer ───────────────────────────────────────────────────────
function UserDrawer({ user, roles, onClose, onUpdated }) {
    const [activeAction, setActiveAction] = useState(null); // 'edit' | 'status' | 'role'

    const handleRestore = async () => {
        try {
            const updated = await restoreUser(user.id);
            toast.success('User restored');
            onUpdated(updated);
        } catch (err) { toast.error(err?.response?.data?.message || 'Restore failed'); }
    };

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
            <div className="fixed right-0 top-0 h-full z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900">User Details</h2>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">✕</button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Profile header */}
                    <div className="flex items-center gap-3">
                        <Avatar name={user.fullName} url={user.avatarUrl} size={12} />
                        <div>
                            <p className="text-sm font-semibold text-gray-900">{user.fullName}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                            {user.phoneNumber && <p className="text-xs text-gray-400">{user.phoneNumber}</p>}
                        </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                        <Badge className={sStyle(user.status)}>{(user.status || '').replace(/_/g, ' ')}</Badge>
                        {user.role && <Badge className="bg-violet-50 text-violet-700 border-violet-200">{user.role.name}</Badge>}
                        {user.languagePreference && <Badge className="bg-gray-50 text-gray-600 border-gray-200">{user.languagePreference.toUpperCase()}</Badge>}
                    </div>

                    {/* Info rows */}
                    {[
                        { label: 'User ID', value: `#${user.id}` },
                        { label: 'UUID', value: user.uuid },
                        { label: 'Created', value: user.createdAt ? new Date(user.createdAt).toLocaleString() : '—' },
                        { label: 'Last Login', value: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never' },
                        { label: 'Email Verified', value: user.emailVerifiedAt ? new Date(user.emailVerifiedAt).toLocaleString() : '—' },
                        { label: 'Notifications', value: user.notificationEnabled ? 'Enabled' : 'Disabled' },
                        { label: 'Last Location', value: user.lastKnownLatitude ? `${Number(user.lastKnownLatitude).toFixed(4)}, ${Number(user.lastKnownLongitude).toFixed(4)}` : '—' },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex items-start justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
                            <span className="text-xs text-gray-500 whitespace-nowrap">{label}</span>
                            <span className="text-xs font-medium text-gray-800 text-right break-all">{value || '—'}</span>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-gray-100 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setActiveAction('edit')} className="py-2 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition">Edit Profile</button>
                        <button onClick={() => setActiveAction('status')} className="py-2 text-xs font-medium text-blue-700 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition">Change Status</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setActiveAction('role')} className="py-2 text-xs font-medium text-violet-700 border border-violet-200 bg-violet-50 rounded-lg hover:bg-violet-100 transition">Change Role</button>
                        {(user.status || '').toLowerCase() === 'inactive' ? (
                            <button onClick={handleRestore} className="py-2 text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition">Restore User</button>
                        ) : (
                            <button onClick={() => setActiveAction('delete')} className="py-2 text-xs font-medium text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition">Deactivate</button>
                        )}
                    </div>
                </div>
            </div>

            {/* Nested modals */}
            {activeAction === 'edit' && <EditProfileModal user={user} onClose={() => setActiveAction(null)} onUpdated={u => { onUpdated(u); setActiveAction(null); }} />}
            {activeAction === 'status' && <ChangeStatusModal user={user} onClose={() => setActiveAction(null)} onUpdated={u => { onUpdated(u); setActiveAction(null); }} />}
            {activeAction === 'role' && <ChangeRoleModal user={user} roles={roles} onClose={() => setActiveAction(null)} onUpdated={u => { onUpdated(u); setActiveAction(null); }} />}
            {activeAction === 'delete' && <DeleteModal user={user} onClose={() => setActiveAction(null)} onDeleted={() => { onUpdated(null); onClose(); }} />}
        </>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState(null);
    const [roles, setRoles] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQ, setSearchQ] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const searchRef = useRef(null);

    // Fetch roles + stats once
    useEffect(() => {
        Promise.allSettled([getAllRoles(), getUserStats()]).then(([rR, sR]) => {
            if (rR.status === 'fulfilled') setRoles(rR.value || []);
            if (sR.status === 'fulfilled') setStats(sR.value);
        });
    }, []);

    const load = useCallback(async (p = 0) => {
        setLoading(true);
        try {
            let data;
            if (searchQ.trim()) {
                data = await searchUsers(searchQ.trim(), p, PAGE_SIZE);
            } else if (statusFilter) {
                data = await getUsersByStatus(statusFilter, p, PAGE_SIZE);
            } else {
                data = await getAllUsers(p, PAGE_SIZE);
            }
            setUsers(data?.content ?? []);
            setTotal(data?.totalElements ?? 0);
            setTotalPages(data?.totalPages ?? 1);
            setPage(data?.number ?? p);
        } catch { toast.error('Failed to load users'); }
        finally { setLoading(false); }
    }, [searchQ, statusFilter]);

    useEffect(() => {
        const t = setTimeout(() => load(0), searchQ ? 350 : 0);
        return () => clearTimeout(t);
    }, [searchQ, statusFilter]);

    const handleUserUpdated = (updated) => {
        if (!updated) { setUsers(prev => prev.filter(u => u.id !== selectedUser?.id)); setSelectedUser(null); return; }
        setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
        setSelectedUser(updated);
    };

    const statCards = [
        { label: 'Active', count: stats?.totalActive ?? '—', color: 'bg-emerald-500', status: 'active' },
        { label: 'Inactive', count: stats?.totalInactive ?? '—', color: 'bg-gray-400', status: 'inactive' },
        { label: 'Suspended', count: stats?.totalSuspended ?? '—', color: 'bg-red-500', status: 'suspended' },
        { label: 'Pending', count: stats?.totalPending ?? '—', color: 'bg-amber-400', status: 'pending_verification' },
    ];

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Users</h1>
                    <p className="text-sm text-gray-400">{loading ? '…' : `${total} users`}</p>
                </div>
                <button onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 text-sm font-medium text-white bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm">
                    <span className="text-base leading-none">+</span> Add User
                </button>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {statCards.map(({ label, count, color, status }) => (
                    <button key={status} onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
                        className={`bg-white border rounded-xl p-4 text-left hover:shadow-md transition-shadow ${statusFilter === status ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                            <span className="text-xs text-gray-500">{label}</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{count}</p>
                    </button>
                ))}
            </div>

            {/* Search + status filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                    <input ref={searchRef} value={searchQ} onChange={e => { setSearchQ(e.target.value); setStatusFilter(''); }}
                        placeholder="Search by name, email, or phone…"
                        className="w-full text-sm pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition" />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    {[{ label: 'All', value: '' }, ...USER_STATUSES.map(s => ({ label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), value: s }))].map(({ label, value }) => (
                        <button key={value} onClick={() => { setStatusFilter(value); setSearchQ(''); }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${statusFilter === value && !searchQ ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-left">
                                {['User', 'Email', 'Role', 'Status', 'Last Login', 'Created', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                                    ))}</tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr><td colSpan={7} className="py-16 text-center">
                                    <p className="text-sm text-gray-400">No users found</p>
                                    {(searchQ || statusFilter) && <button onClick={() => { setSearchQ(''); setStatusFilter(''); }} className="mt-2 text-xs text-blue-600 underline">Clear filters</button>}
                                </td></tr>
                            ) : users.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                                    onClick={() => setSelectedUser(u)}>
                                    {/* User cell with avatar */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <Avatar name={u.fullName} url={u.avatarUrl} size={8} />
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm whitespace-nowrap">{u.fullName}</p>
                                                {u.phoneNumber && <p className="text-[11px] text-gray-400">{u.phoneNumber}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-600">{u.email}</td>
                                    <td className="px-4 py-3">
                                        {u.role
                                            ? <Badge className="bg-violet-50 text-violet-700 border-violet-200">{u.role.name}</Badge>
                                            : <span className="text-xs text-gray-400">—</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${sDot(u.status)}`} />
                                            <Badge className={sStyle(u.status)}>{(u.status || '').replace(/_/g, ' ')}</Badge>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                    </td>
                                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setSelectedUser(u)} className="text-xs text-blue-600 hover:underline">View</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">Page {page + 1} of {totalPages} · {total} total</p>
                        <div className="flex gap-1">
                            <button disabled={page === 0} onClick={() => load(page - 1)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                                const pg = Math.max(0, page - 2) + i;
                                if (pg >= totalPages) return null;
                                return <button key={pg} onClick={() => load(pg)}
                                    className={`w-8 h-8 text-xs font-medium rounded-lg border transition ${pg === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}>{pg + 1}</button>;
                            })}
                            <button disabled={page + 1 >= totalPages} onClick={() => load(page + 1)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Side drawer */}
            {selectedUser && (
                <UserDrawer user={selectedUser} roles={roles}
                    onClose={() => setSelectedUser(null)}
                    onUpdated={handleUserUpdated} />
            )}

            {/* Create modal */}
            {showCreate && (
                <CreateUserModal roles={roles}
                    onClose={() => setShowCreate(false)}
                    onCreated={u => { setUsers(p => [u, ...p]); setTotal(t => t + 1); }} />
            )}
        </div>
    );
}
