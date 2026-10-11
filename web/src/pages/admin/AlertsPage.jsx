import SymbolIcon from '../../components/ui/SymbolIcon';
import { Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { StatusChip as Badge, LoadingSkeleton as Skeleton, Field as Input, TextareaField as Textarea, Field as Select, AppDialog, AppButton, DetailDrawer, AppInput, AppSelect } from '../../components/ui/controls';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
    getAllAlerts, searchAlerts, getAlertAnalytics,
    createAlert, updateAlertStatus, toggleSimulationMode,
    broadcastToRegion, emergencyOverride,
    bulkResolve, bulkEscalate,
} from '../../services/alertService';
import { getAllDamsList } from '../../services/dam.service';
import { getAllRegionsList } from '../../services/region.service';

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITIES = ['info', 'warning', 'critical', 'emergency'];
const STATUSES = ['draft', 'active', 'escalated', 'resolved', 'expired', 'cancelled'];

const severityStyle = {
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    critical: 'bg-orange-50 text-orange-700 border-orange-200',
    emergency: 'bg-red-50 text-red-700 border-red-200',
};
const severityDot = {
    info: 'bg-blue-500',
    warning: 'bg-amber-500',
    critical: 'bg-orange-500',
    emergency: 'bg-red-500',
};
const statusStyle = {
    draft: 'bg-gray-50 text-gray-600 border-gray-200',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    escalated: 'bg-orange-50 text-orange-700 border-orange-200',
    resolved: 'bg-blue-50 text-blue-600 border-blue-200',
    expired: 'bg-gray-50 text-gray-400 border-gray-200',
    cancelled: 'bg-red-50 text-red-500 border-red-200',
};
function sevStyle(s = '') { return severityStyle[(s || '').toLowerCase()] || severityStyle.info; }
function sevDot(s = '') { return severityDot[(s || '').toLowerCase()] || 'bg-gray-400'; }
function statStyle(s = '') { return statusStyle[(s || '').toLowerCase()] || statusStyle.draft; }

// ─── Shared micro-components ──────────────────────────────────────────────────







// ─── Create Alert Modal ───────────────────────────────────────────────────────

function CreateAlertModal({ dams, regions, onClose, onCreated }) {
    const EMPTY = { alertTypeId: '1', title: '', message: '', severity: 'warning', status: 'active', damId: '', regionId: '' };
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const validate = () => {
        const e = {};
        if (!form.title.trim()) e.title = 'Required';
        if (!form.message.trim()) e.message = 'Required';
        if (!form.severity) e.severity = 'Required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = {
                alertTypeId: Number(form.alertTypeId) || 1,
                title: form.title,
                message: form.message,
                severity: form.severity,
                status: form.status || undefined,
                damId: form.damId ? Number(form.damId) : undefined,
                regionId: form.regionId ? Number(form.regionId) : undefined,
            };
            const created = await createAlert(payload);
            toast.success(`Alert "${created.title}" created`);
            onCreated(created);
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to create alert');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppDialog onClose={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <Typography component="h2" variant="h2" className="text-base font-semibold text-gray-900">Create New Alert</Typography>
                    <AppButton iconOnly aria-label="Close" onClick={onClose} className="w-7 h-7 flex items-center justify-center"><SymbolIcon name="close" /></AppButton>
                </div>
                <form onSubmit={submit} className="p-6 space-y-4">
                    <Input label="Title *" placeholder="Dam overflow warning — Mahaweli Zone" value={form.title} onChange={e => set('title', e.target.value)} error={errors.title} />
                    <Textarea label="Message *" placeholder="Detailed alert message…" value={form.message} onChange={e => set('message', e.target.value)} error={errors.message} />
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Severity *" value={form.severity} onChange={e => set('severity', e.target.value)}>
                            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                        <Select label="Initial Status" value={form.status} onChange={e => set('status', e.target.value)}>
                            {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Dam (optional)" value={form.damId} onChange={e => set('damId', e.target.value)}>
                            <option value="">None</option>
                            {dams.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </Select>
                        <Select label="Region (optional)" value={form.regionId} onChange={e => set('regionId', e.target.value)}>
                            <option value="">None</option>
                            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </Select>
                    </div>
                    <Input label="Alert Type ID" type="number" min="1" value={form.alertTypeId} onChange={e => set('alertTypeId', e.target.value)} />
                    <div className="flex justify-end gap-3 pt-2">
                        <AppButton type="button" onClick={onClose} className="">Cancel</AppButton>
                        <AppButton variant="contained" type="submit" disabled={saving} className="disabled:opacity-60">
                            {saving ? 'Creating…' : 'Create Alert'}
                        </AppButton>
                    </div>
                </form>
            </div>
        </AppDialog>
    );
}

// ─── Region Broadcast Modal ───────────────────────────────────────────────────

function RegionBroadcastModal({ regions, dams, onClose, onBroadcasted }) {
    const [form, setForm] = useState({ regionId: '', alertTypeId: '1', title: '', message: '', severity: 'critical', damId: '' });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const validate = () => {
        const e = {};
        if (!form.regionId) e.regionId = 'Required';
        if (!form.title.trim()) e.title = 'Required';
        if (!form.message.trim()) e.message = 'Required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = {
                alertTypeId: Number(form.alertTypeId) || 1,
                title: form.title,
                message: form.message,
                severity: form.severity,
                damId: form.damId ? Number(form.damId) : undefined,
            };
            const result = await broadcastToRegion(Number(form.regionId), payload);
            toast.success(`Broadcast sent to region`);
            onBroadcasted(result);
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Broadcast failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppDialog onClose={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <Typography component="h2" variant="h2" className="text-base font-semibold text-gray-900">Region Broadcast</Typography>
                        <p className="text-xs text-gray-400 mt-0.5">Only users in the selected region will be notified</p>
                    </div>
                    <AppButton iconOnly aria-label="Close" onClick={onClose} className="w-7 h-7 flex items-center justify-center"><SymbolIcon name="close" /></AppButton>
                </div>
                <form onSubmit={submit} className="p-6 space-y-4">
                    <Select label="Target Region *" value={form.regionId} onChange={e => set('regionId', e.target.value)}>
                        <option value="">Select region…</option>
                        {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </Select>
                    {errors.regionId && <p className="text-xs text-red-500 -mt-2">{errors.regionId}</p>}
                    <Input label="Title *" placeholder="Regional alert title" value={form.title} onChange={e => set('title', e.target.value)} error={errors.title} />
                    <Textarea label="Message *" placeholder="Alert message for the region…" value={form.message} onChange={e => set('message', e.target.value)} error={errors.message} />
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Severity" value={form.severity} onChange={e => set('severity', e.target.value)}>
                            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                        <Select label="Dam (optional)" value={form.damId} onChange={e => set('damId', e.target.value)}>
                            <option value="">None</option>
                            {dams.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </Select>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <AppButton type="button" onClick={onClose} className="">Cancel</AppButton>
                        <AppButton type="submit" disabled={saving} className="disabled:opacity-60">
                            {saving ? 'Broadcasting…' : 'Broadcast to Region'}
                        </AppButton>
                    </div>
                </form>
            </div>
        </AppDialog>
    );
}

// ─── Emergency Override Modal ─────────────────────────────────────────────────

function EmergencyOverrideModal({ onClose, onBroadcasted }) {
    const [form, setForm] = useState({ alertTypeId: '1', title: 'EMERGENCY BROADCAST', message: '', severity: 'emergency' });
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.message.trim()) {
            toast.error('Title and message are required');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                alertTypeId: Number(form.alertTypeId) || 1,
                title: form.title,
                message: form.message,
                severity: form.severity,
            };
            const result = await emergencyOverride(payload);
            toast.success('Emergency override broadcast sent!');
            onBroadcasted(result);
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Emergency broadcast failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppDialog onClose={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-red-100 bg-red-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-lg"><SymbolIcon name="alert" /></span>
                        <div>
                            <Typography component="h2" variant="h2" className="text-base font-bold text-red-800">Emergency Override</Typography>
                            <p className="text-xs text-red-600">Bypasses all queues · Forces emergency severity · SUPER_ADMIN only</p>
                        </div>
                    </div>
                </div>
                <form onSubmit={submit} className="p-6 space-y-4">
                    <Input label="Title *" value={form.title} onChange={e => set('title', e.target.value)} />
                    <Textarea label="Emergency Message *" placeholder="Describe the emergency situation…" value={form.message} onChange={e => set('message', e.target.value)} />
                    <div className="flex justify-end gap-3 pt-2">
                        <AppButton type="button" onClick={onClose} className="">Cancel</AppButton>
                        <AppButton variant="contained" color="error" type="submit" disabled={saving} className="disabled:opacity-60">
                            {saving ? 'Sending…' : <><SymbolIcon name="alert" /> BROADCAST NOW</>}
                        </AppButton>
                    </div>
                </form>
            </div>
        </AppDialog>
    );
}

// ─── Bulk Action Modal ────────────────────────────────────────────────────────

function BulkActionModal({ type, dams, onClose, onDone }) {
    const isResolve = type === 'resolve';
    const [form, setForm] = useState({ damId: '', severity: '' });
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.damId && !form.severity) {
            toast.error('At least one filter (dam or severity) is required');
            return;
        }
        setSaving(true);
        try {
            const criteria = {};
            if (form.damId) criteria.damId = Number(form.damId);
            if (form.severity) criteria.severity = form.severity;

            const result = isResolve
                ? await bulkResolve(criteria)
                : await bulkEscalate(criteria);

            toast.success(`${result.length} alert(s) ${isResolve ? 'resolved' : 'escalated'}`);
            onDone(result);
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || `Bulk ${type} failed`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppDialog onClose={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <Typography component="h2" variant="h2" className="text-base font-semibold text-gray-900">Bulk {isResolve ? 'Resolve' : 'Escalate'}</Typography>
                    <AppButton iconOnly aria-label="Close" onClick={onClose} className="w-7 h-7 flex items-center justify-center"><SymbolIcon name="close" /></AppButton>
                </div>
                <form onSubmit={submit} className="p-6 space-y-4">
                    <p className="text-xs text-gray-500">
                        {isResolve
                            ? 'Resolve all active alerts matching the criteria below.'
                            : 'Escalate all active alerts matching the criteria below.'}
                    </p>
                    <Select label="Filter by Dam" value={form.damId} onChange={e => set('damId', e.target.value)}>
                        <option value="">Any dam</option>
                        {dams.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </Select>
                    <Select label="Filter by Severity" value={form.severity} onChange={e => set('severity', e.target.value)}>
                        <option value="">Any severity</option>
                        {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                    <div className="flex justify-end gap-3 pt-2">
                        <AppButton type="button" onClick={onClose} className="">Cancel</AppButton>
                        <AppButton type="submit" disabled={saving}
                            className={`px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60 transition ${isResolve ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                            {saving ? 'Processing…' : isResolve ? 'Resolve All Matching' : 'Escalate All Matching'}
                        </AppButton>
                    </div>
                </form>
            </div>
        </AppDialog>
    );
}

// ─── Update Status Modal ──────────────────────────────────────────────────────

function StatusUpdateModal({ alert, onClose, onUpdated }) {
    const [status, setStatus] = useState(alert.status || 'active');
    const [saving, setSaving] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const updated = await updateAlertStatus(alert.id, status);
            toast.success(`Alert #${alert.id} status → ${status}`);
            onUpdated(updated);
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Status update failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppDialog onClose={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <Typography component="h2" variant="h2" className="text-sm font-semibold text-gray-900">Update Status — #{alert.id}</Typography>
                    <AppButton iconOnly aria-label="Close" onClick={onClose} className="w-7 h-7 flex items-center justify-center"><SymbolIcon name="close" /></AppButton>
                </div>
                <form onSubmit={submit} className="p-5 space-y-4">
                    <Select label="New Status" value={status} onChange={e => setStatus(e.target.value)}>
                        {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </Select>
                    <div className="flex justify-end gap-3 pt-1">
                        <AppButton type="button" onClick={onClose} className="">Cancel</AppButton>
                        <AppButton variant="contained" type="submit" disabled={saving} className="disabled:opacity-60">
                            {saving ? 'Saving…' : 'Update'}
                        </AppButton>
                    </div>
                </form>
            </div>
        </AppDialog>
    );
}

// ─── Alert Detail Drawer ──────────────────────────────────────────────────────

function AlertDrawer({ alert, dams, onClose, onUpdated }) {
    const [activeAction, setActiveAction] = useState(null);
    const [toggling, setToggling] = useState(false);

    const dam = dams.find(d => d.id === alert.damId);

    const handleToggleSim = async () => {
        setToggling(true);
        try {
            const updated = await toggleSimulationMode(alert.id, !alert.simulationMode);
            toast.success(`Simulation mode ${updated.simulationMode ? 'enabled' : 'disabled'}`);
            onUpdated(updated);
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Toggle failed');
        } finally {
            setToggling(false);
        }
    };

    return (
        <DetailDrawer onClose={onClose}>
            {/* Overlay */}


            {/* Panel */}
            <div className="flex h-full flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${sevDot(alert.severity)}`} />
                        <Typography component="h2" variant="h2" className="text-sm font-bold text-gray-900">Alert #{alert.id}</Typography>
                        {alert.simulationMode && <Badge className="bg-violet-50 text-violet-600 border-violet-200">DRILL</Badge>}
                    </div>
                    <AppButton iconOnly aria-label="Close" onClick={onClose} className="w-7 h-7 flex items-center justify-center"><SymbolIcon name="close" /></AppButton>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Severity + Status badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={sevStyle(alert.severity)}>{alert.severity}</Badge>
                        <Badge className={statStyle(alert.status)}>{alert.status}</Badge>
                    </div>

                    {/* Title & Message */}
                    <div>
                        <Typography component="h3" variant="h3" className="text-lg font-bold text-gray-900 leading-snug mb-2">{alert.title}</Typography>
                        <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-100">{alert.message}</p>
                    </div>

                    {/* Detail Fields */}
                    <div className="divide-y divide-gray-50">
                        {[
                            { label: 'UUID', value: alert.uuid },
                            { label: 'Alert Type', value: alert.alertTypeName || `ID: ${alert.alertTypeId}` },
                            { label: 'Dam', value: dam ? dam.name : (alert.damId ? `ID: ${alert.damId}` : '—') },
                            { label: 'Region ID', value: alert.regionId ?? '—' },
                            { label: 'Simulation Mode', value: alert.simulationMode ? 'Yes (Drill)' : 'No (Live)' },
                            { label: 'Created', value: alert.createdAt ? new Date(alert.createdAt).toLocaleString() : '—' },
                            { label: 'Updated', value: alert.updatedAt ? new Date(alert.updatedAt).toLocaleString() : '—' },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex items-start justify-between gap-4 py-2.5">
                                <span className="text-xs text-gray-500 whitespace-nowrap">{label}</span>
                                <span className="text-xs font-medium text-gray-800 text-right break-all">{String(value)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-gray-100 space-y-2 shrink-0">
                    <div className="grid grid-cols-2 gap-2">
                        <AppButton variant="outlined" onClick={() => setActiveAction('status')}
                            className="">
                            Change Status
                        </AppButton>
                        <AppButton variant="outlined" onClick={handleToggleSim} disabled={toggling}
                            className="disabled:opacity-60">
                            {toggling ? 'Toggling…' : alert.simulationMode ? 'Disable Drill' : 'Enable Drill'}
                        </AppButton>
                    </div>
                </div>
            </div>

            {/* Nested modals */}
            {activeAction === 'status' && (
                <StatusUpdateModal
                    alert={alert}
                    onClose={() => setActiveAction(null)}
                    onUpdated={(updated) => { onUpdated(updated); setActiveAction(null); }}
                />
            )}
        </DetailDrawer>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, onClick, active }) {
    return (
        <AppButton onClick={onClick}
            className={`bg-white border rounded-xl p-4 text-left hover:shadow-md transition-shadow w-full ${active ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${color}`}>{icon}</div>
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        </AppButton>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AlertsPage() {
    // Data
    const [alerts, setAlerts] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [dams, setDams] = useState([]);
    const [regions, setRegions] = useState([]);

    // UI State
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterSeverity, setFilterSeverity] = useState('');
    const [filterRegion, setFilterRegion] = useState('');

    // Modals
    const [showCreate, setShowCreate] = useState(false);
    const [showRegionBroadcast, setShowRegionBroadcast] = useState(false);
    const [showEmergencyOverride, setShowEmergencyOverride] = useState(false);
    const [bulkActionType, setBulkActionType] = useState(null); // 'resolve' | 'escalate'
    const [selectedAlert, setSelectedAlert] = useState(null);

    const searchTimer = useRef(null);
    const hasFilters = filterStatus || filterSeverity || filterRegion;

    // ── Load lookup data once ──────────────────────────────────────────────────
    useEffect(() => {
        Promise.allSettled([getAllDamsList(), getAllRegionsList(), getAlertAnalytics()]).then(([dR, rR, aR]) => {
            if (dR.status === 'fulfilled') setDams(dR.value || []);
            if (rR.status === 'fulfilled') setRegions(rR.value || []);
            if (aR.status === 'fulfilled') setAnalytics(aR.value);
        });
    }, []);

    // ── Load alerts ────────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        try {
            let data;
            if (hasFilters) {
                data = await searchAlerts({
                    status: filterStatus || undefined,
                    severity: filterSeverity || undefined,
                    regionId: filterRegion || undefined,
                });
            } else {
                data = await getAllAlerts();
            }
            // Client-side search by title/uuid/id
            if (search.trim()) {
                const q = search.trim().toLowerCase();
                data = data.filter(a =>
                    (a.title && a.title.toLowerCase().includes(q)) ||
                    (a.uuid && a.uuid.toLowerCase().includes(q)) ||
                    String(a.id) === q
                );
            }
            // Sort newest first
            data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setAlerts(data);
        } catch {
            toast.error('Failed to load alerts');
        } finally {
            setLoading(false);
        }
    }, [search, filterStatus, filterSeverity, filterRegion, hasFilters]);

    useEffect(() => {
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => load(), search ? 400 : 0);
        return () => clearTimeout(searchTimer.current);
    }, [search, filterStatus, filterSeverity, filterRegion, load]);

    const refreshAnalytics = async () => {
        try {
            const a = await getAlertAnalytics();
            setAnalytics(a);
        } catch { /* silent */ }
    };

    const handleAlertCreated = (alert) => {
        setAlerts(prev => [alert, ...prev]);
        refreshAnalytics();
    };

    const handleAlertUpdated = (updated) => {
        setAlerts(prev => prev.map(a => a.id === updated.id ? updated : a));
        if (selectedAlert?.id === updated.id) setSelectedAlert(updated);
        refreshAnalytics();
    };

    const handleBulkDone = () => {
        load();
        refreshAnalytics();
    };

    const handleBroadcasted = (alert) => {
        setAlerts(prev => [alert, ...prev]);
        refreshAnalytics();
    };

    const clearFilters = () => {
        setSearch('');
        setFilterStatus('');
        setFilterSeverity('');
        setFilterRegion('');
    };

    // Count helpers
    const activeCount = analytics?.totalActive ?? alerts.filter(a => a.status === 'active').length;
    const resolvedCount = analytics?.totalResolved ?? alerts.filter(a => a.status === 'resolved').length;
    const totalCount = analytics?.totalAlerts ?? alerts.length;
    const escalatedCount = alerts.filter(a => a.status === 'escalated').length;

    return (
        <div className="space-y-5">
            {/* ── Header ───────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <Typography component="h1" variant="h1" className="text-xl font-bold text-gray-900">Alert Management</Typography>
                    <p className="text-sm text-gray-400">{loading ? '…' : `${alerts.length} alerts displayed`}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <AppButton variant="contained" onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2">
                        <span className="text-base leading-none">+</span> Create Alert
                    </AppButton>
                    <AppButton onClick={() => setShowRegionBroadcast(true)}
                        className="flex items-center gap-2">
                        <SymbolIcon name="sensor" /> Region Broadcast
                    </AppButton>
                    <AppButton variant="contained" color="error" onClick={() => setShowEmergencyOverride(true)}
                        className="flex items-center gap-2">
                        <SymbolIcon name="alert" /> Emergency Override
                    </AppButton>
                </div>
            </div>

            {/* ── Stat Cards ───────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total Alerts" value={totalCount} icon={<SymbolIcon name="chart" />} color="bg-gray-50"
                    onClick={() => clearFilters()} active={!hasFilters && !search} />
                <StatCard label="Active" value={activeCount} icon={<SymbolIcon name="alert" />} color="bg-emerald-50"
                    onClick={() => { setFilterStatus(filterStatus === 'active' ? '' : 'active'); setFilterSeverity(''); setFilterRegion(''); }}
                    active={filterStatus === 'active'} />
                <StatCard label="Escalated" value={escalatedCount} icon={<SymbolIcon name="warning" />} color="bg-orange-50"
                    onClick={() => { setFilterStatus(filterStatus === 'escalated' ? '' : 'escalated'); setFilterSeverity(''); setFilterRegion(''); }}
                    active={filterStatus === 'escalated'} />
                <StatCard label="Resolved" value={resolvedCount} icon={<SymbolIcon name="check" />} color="bg-blue-50"
                    onClick={() => { setFilterStatus(filterStatus === 'resolved' ? '' : 'resolved'); setFilterSeverity(''); setFilterRegion(''); }}
                    active={filterStatus === 'resolved'} />
            </div>

            {/* ── Search + Filters ─────────────────────────────────────────────── */}
            <Paper variant="outlined" className="bg-white border border-gray-200  p-4  flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"><SymbolIcon name="search" /></span>
                        <AppInput aria-label="Title, UUID, or ID…"
                            className="w-full"
                            placeholder="Title, UUID, or ID…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="min-w-[130px]">
                    <label htmlFor="field-AlertsPage-37012" className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                    <AppSelect id="field-AlertsPage-37012" className="w-full"
                        value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">All statuses</option>
                        {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </AppSelect>
                </div>
                <div className="min-w-[130px]">
                    <label htmlFor="field-AlertsPage-37655" className="block text-xs font-medium text-gray-500 mb-1">Severity</label>
                    <AppSelect id="field-AlertsPage-37655" className="w-full"
                        value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
                        <option value="">All severities</option>
                        {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </AppSelect>
                </div>
                <div className="min-w-[140px]">
                    <label htmlFor="field-AlertsPage-38286" className="block text-xs font-medium text-gray-500 mb-1">Region</label>
                    <AppSelect id="field-AlertsPage-38286" className="w-full"
                        value={filterRegion} onChange={e => setFilterRegion(e.target.value)}>
                        <option value="">All regions</option>
                        {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </AppSelect>
                </div>
                {(hasFilters || search) && (
                    <AppButton onClick={clearFilters} className="underline self-end">Clear all</AppButton>
                )}
            </Paper>

            {/* ── Bulk Action Buttons ──────────────────────────────────────────── */}
            <div className="flex items-center gap-2">
                <AppButton variant="outlined" onClick={() => setBulkActionType('resolve')}
                    className="">
                    Bulk Resolve
                </AppButton>
                <AppButton variant="outlined" onClick={() => setBulkActionType('escalate')}
                    className="">
                    Bulk Escalate
                </AppButton>
            </div>

            {/* ── Alerts Table ─────────────────────────────────────────────────── */}
            <Paper variant="outlined" className="bg-white border border-gray-200   overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="w-full text-sm">
                        <TableHead>
                            <TableRow className="bg-gray-50 border-b border-gray-100 text-left">
                                {['ID', 'Title', 'Severity', 'Status', 'Dam', 'Region', 'Drill', 'Created', 'Actions'].map(h => (
                                    <TableCell component="th" key={h} className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: 9 }).map((_, j) => (
                                            <TableCell key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : alerts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="py-20 text-center">
                                        <p className="text-sm text-gray-400">No alerts found</p>
                                        <p className="text-xs text-gray-300 mt-1">Try adjusting filters or create a new alert</p>
                                    </TableCell>
                                </TableRow>
                            ) : alerts.map(alert => {
                                const dam = dams.find(d => d.id === alert.damId);
                                const region = regions.find(r => r.id === alert.regionId);
                                return (
                                    <TableRow key={alert.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                                        onClick={() => setSelectedAlert(alert)}>
                                        <TableCell className="px-4 py-3 font-mono text-xs font-medium text-gray-600">#{alert.id}</TableCell>
                                        <TableCell className="px-4 py-3">
                                            <p className="font-medium text-gray-900 whitespace-nowrap max-w-[220px] truncate">{alert.title}</p>
                                            <p className="text-[10px] text-gray-400 font-mono truncate max-w-[180px]">{alert.uuid}</p>
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${sevDot(alert.severity)}`} />
                                                <Badge className={sevStyle(alert.severity)}>{alert.severity}</Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <Badge className={statStyle(alert.status)}>{alert.status}</Badge>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{dam ? dam.name : (alert.damId ?? '—')}</TableCell>
                                        <TableCell className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{region ? region.name : (alert.regionId ?? '—')}</TableCell>
                                        <TableCell className="px-4 py-3">
                                            {alert.simulationMode
                                                ? <Badge className="bg-violet-50 text-violet-600 border-violet-200">DRILL</Badge>
                                                : <span className="text-xs text-gray-400">Live</span>}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                            {alert.createdAt ? new Date(alert.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                        </TableCell>
                                        <TableCell className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center gap-2">
                                                <AppButton onClick={() => setSelectedAlert(alert)} className="hover:underline">View</AppButton>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </Paper>

            {/* ── Modals ───────────────────────────────────────────────────────── */}
            {showCreate && (
                <CreateAlertModal dams={dams} regions={regions}
                    onClose={() => setShowCreate(false)}
                    onCreated={handleAlertCreated} />
            )}
            {showRegionBroadcast && (
                <RegionBroadcastModal regions={regions} dams={dams}
                    onClose={() => setShowRegionBroadcast(false)}
                    onBroadcasted={handleBroadcasted} />
            )}
            {showEmergencyOverride && (
                <EmergencyOverrideModal
                    onClose={() => setShowEmergencyOverride(false)}
                    onBroadcasted={handleBroadcasted} />
            )}
            {bulkActionType && (
                <BulkActionModal type={bulkActionType} dams={dams}
                    onClose={() => setBulkActionType(null)}
                    onDone={handleBulkDone} />
            )}
            {selectedAlert && (
                <AlertDrawer alert={selectedAlert} dams={dams}
                    onClose={() => setSelectedAlert(null)}
                    onUpdated={handleAlertUpdated} />
            )}
        </div>
    );
}

