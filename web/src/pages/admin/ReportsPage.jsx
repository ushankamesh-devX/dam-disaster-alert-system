import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
    getReports, getReportStats, updateReportStatus,
    assignReport, deleteReport, getReportTypes
} from '../../services/report.service';
import { getAllUsersList } from '../../services/user.service';

// ─── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_LEVELS = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['pending', 'reviewing', 'in_progress', 'resolved', 'rejected', 'duplicate'];

const priorityColors = {
    low: 'bg-gray-50 text-gray-600 border-gray-200',
    medium: 'bg-blue-50 text-blue-700 border-blue-200',
    high: 'bg-amber-50 text-amber-700 border-amber-200',
    critical: 'bg-red-50 text-red-700 border-red-200',
};

const statusColors = {
    pending: 'bg-gray-100 text-gray-600',
    reviewing: 'bg-purple-100 text-purple-700',
    in_progress: 'bg-blue-100 text-blue-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    duplicate: 'bg-orange-100 text-orange-700',
};

// ─── Reusable Components ───────────────────────────────────────────────────────

function Badge({ children, className }) {
    return (
        <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md border ${className}`}>
            {children}
        </span>
    );
}

function Skeleton({ className }) {
    return <div className={`animate-pulse bg-gray-100 rounded ${className}`} />;
}

function Textarea({ label, ...props }) {
    return (
        <div>
            {label && <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>}
            <textarea
                rows={3}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition resize-none"
                {...props}
            />
        </div>
    );
}

function SelectField({ label, children, ...props }) {
    return (
        <div>
            {label && <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>}
            <select
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 bg-white transition"
                {...props}
            >
                {children}
            </select>
        </div>
    );
}

function StatCard({ label, value, icon, color }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${color}`}>{icon}</div>
            <div>
                <p className="text-xs text-gray-400 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value ?? '-'}</p>
            </div>
        </div>
    );
}

// ─── Status Update Modal ───────────────────────────────────────────────────────

function StatusModal({ report, onClose, onSaved }) {
    const [status, setStatus] = useState(report.status);
    const [notes, setNotes] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async (ev) => {
        ev.preventDefault();
        setSaving(true);
        try {
            const payload = { status, notes };
            if (status === 'rejected') payload.rejectionReason = rejectionReason;
            if (status === 'resolved') payload.resolutionNotes = resolutionNotes;
            
            const result = await updateReportStatus(report.id, payload);
            toast.success(`Report status updated to ${status}`);
            onSaved(result);
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to update status');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-900">Update Status: {report.reportNumber}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">✕</button>
                </div>
                <form onSubmit={submit} className="p-6 space-y-4">
                    <SelectField label="New Status" value={status} onChange={e => setStatus(e.target.value)}>
                        {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </SelectField>
                    
                    {status === 'rejected' && (
                        <Textarea label="Rejection Reason *" required value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
                    )}
                    {status === 'resolved' && (
                        <Textarea label="Resolution Notes *" required value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} />
                    )}
                    
                    <Textarea label="Internal Notes (Optional)" value={notes} onChange={e => setNotes(e.target.value)} />

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                        <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60">
                            {saving ? 'Updating…' : 'Update Status'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Assign Modal ──────────────────────────────────────────────────────────────

function AssignModal({ report, users, onClose, onSaved }) {
    const [assignedToUserId, setAssignedToUserId] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async (ev) => {
        ev.preventDefault();
        if (!assignedToUserId) return;
        setSaving(true);
        try {
            const result = await assignReport(report.id, { assignedToUserId: Number(assignedToUserId) });
            toast.success(`Report assigned successfully`);
            onSaved(result);
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to assign report');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-900">Assign Report</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <form onSubmit={submit} className="p-6 space-y-4">
                    <SelectField label="Select Officer" value={assignedToUserId} onChange={e => setAssignedToUserId(e.target.value)} required>
                        <option value="">Select a user...</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
                    </SelectField>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={saving || !assignedToUserId} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-60">
                            {saving ? 'Assigning…' : 'Assign'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteModal({ title, onClose, onConfirm }) {
    const [loading, setLoading] = useState(false);
    const confirm = async () => {
        setLoading(true);
        try { await onConfirm(); onClose(); }
        catch { /* handled by caller */ }
        finally { setLoading(false); }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-lg">⚠</span>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">Confirm Delete</h2>
                        <p className="text-xs text-gray-500">This action cannot be undone</p>
                    </div>
                </div>
                <p className="text-sm text-gray-700 mb-5">Delete report <strong>{title}</strong>?</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                    <button onClick={confirm} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60">
                        {loading ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Report Types Panel ────────────────────────────────────────────────────────

function ReportTypesPanel({ types, loading }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Report Types <span className="text-gray-400 font-normal">({types.length})</span></h2>
            </div>
            <div className="divide-y divide-gray-50">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="px-5 py-3 flex items-center gap-3">
                            <Skeleton className="w-8 h-8 rounded-lg" />
                            <Skeleton className="h-4 w-1/3" />
                        </div>
                    ))
                ) : types.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-8">No report types found</p>
                ) : types.map(type => (
                    <div key={type.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition group">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm shrink-0" style={{ background: type.color || '#6B7280' }}>
                            {type.icon || '📄'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{type.name}</p>
                            <p className="text-xs text-gray-400 truncate">{type.code} · Category: {type.category}</p>
                        </div>
                        <div className="flex flex-col items-end">
                            <Badge className={priorityColors[type.defaultPriority] || priorityColors.medium}>
                                Default: {type.defaultPriority}
                            </Badge>
                        </div>
                        {!type.isActive && <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 shrink-0 ml-2">Inactive</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main Reports Page ─────────────────────────────────────────────────────────

export default function ReportsPage() {
    // State
    const [reports, setReports] = useState([]);
    const [reportTypes, setReportTypes] = useState([]);
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(0);
    
    const [loadingReports, setLoadingReports] = useState(true);
    const [loadingTypes, setLoadingTypes] = useState(true);

    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [filterType, setFilterType] = useState('');

    const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'types'

    // Modals
    const [updatingStatusFor, setUpdatingStatusFor] = useState(null);
    const [assigningFor, setAssigningFor] = useState(null);
    const [deletingReport, setDeletingReport] = useState(null);

    const PAGE_SIZE = 15;

    // Load static data
    useEffect(() => {
        getReportStats().then(setStats).catch(() => {});
        getReportTypes().then(res => {
            setReportTypes(Array.isArray(res) ? res : (res.data || []));
            setLoadingTypes(false);
        }).catch(() => setLoadingTypes(false));
        getAllUsersList().then(setUsers).catch(() => {});
    }, []);

    // Load reports
    const loadReports = useCallback(async (p = 0) => {
        setLoadingReports(true);
        try {
            const params = { page: p, size: PAGE_SIZE };
            if (filterStatus) params.status = filterStatus;
            if (filterPriority) params.priority = filterPriority;
            if (filterType) params.reportTypeId = filterType;
            
            const data = await getReports(params);
            const content = data?.content ?? data ?? [];
            setReports(content);
            setTotal(data?.totalElements ?? content.length);
            setTotalPages(data?.totalPages ?? 1);
            setPage(data?.number ?? p);
        } catch { 
            toast.error('Failed to load reports'); 
        } finally { 
            setLoadingReports(false); 
        }
    }, [filterStatus, filterPriority, filterType]);

    useEffect(() => { 
        loadReports(0); 
    }, [filterStatus, filterPriority, filterType, loadReports]);

    // Handlers
    const handleReportUpdated = (updated) => {
        setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
        getReportStats().then(setStats).catch(() => {}); // Refresh stats
    };

    const handleDelete = async () => {
        try {
            await deleteReport(deletingReport.id);
            toast.success('Report deleted');
            setReports(prev => prev.filter(r => r.id !== deletingReport.id));
            setTotal(t => t - 1);
            getReportStats().then(setStats).catch(() => {});
            setDeletingReport(null);
        } catch (err) {
            toast.error('Delete failed');
            throw err;
        }
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Incident Reports</h1>
                    <p className="text-sm text-gray-400">{loadingReports ? 'Loading…' : `${total} reports found`}</p>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <StatCard label="Total" value={stats?.totalReports} icon="📋" color="bg-gray-50" />
                <StatCard label="Pending" value={stats?.pendingCount} icon="⏳" color="bg-amber-50" />
                <StatCard label="Reviewing" value={stats?.reviewingCount} icon="👀" color="bg-purple-50" />
                <StatCard label="In Progress" value={stats?.inProgressCount} icon="🚧" color="bg-blue-50" />
                <StatCard label="Resolved" value={stats?.resolvedCount} icon="✅" color="bg-emerald-50" />
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 border-b border-gray-200">
                <button onClick={() => setActiveTab('reports')} className={`px-5 py-2.5 text-sm font-medium transition border-b-2 ${activeTab === 'reports' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>📋 Reports</button>
                <button onClick={() => setActiveTab('types')} className={`px-5 py-2.5 text-sm font-medium transition border-b-2 ${activeTab === 'types' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>⚙️ Report Types</button>
            </div>

            {activeTab === 'types' ? (
                <ReportTypesPanel types={reportTypes} loading={loadingTypes} />
            ) : (
                <>
                    {/* Filters */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-end">
                        <div className="min-w-[140px]">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                            <select className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option value="">All statuses</option>
                                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                            </select>
                        </div>
                        <div className="min-w-[140px]">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                            <select className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                                <option value="">All priorities</option>
                                {PRIORITY_LEVELS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="min-w-[160px]">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                            <select className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white" value={filterType} onChange={e => setFilterType(e.target.value)}>
                                <option value="">All types</option>
                                {reportTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        {(filterStatus || filterPriority || filterType) && (
                            <button onClick={() => { setFilterStatus(''); setFilterPriority(''); setFilterType(''); }} className="text-xs text-gray-500 hover:text-gray-800 underline pb-2">Clear</button>
                        )}
                    </div>

                    {/* Table */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-left">
                                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Report #</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Title & Info</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Type / Priority</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Assigned To</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loadingReports ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i}>
                                                {Array.from({ length: 7 }).map((_, j) => (
                                                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : reports.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-16 text-center text-gray-400 text-sm">No reports found</td>
                                        </tr>
                                    ) : reports.map(r => (
                                        <tr key={r.id} className="hover:bg-gray-50/50 transition">
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.reportNumber}</td>
                                            <td className="px-4 py-3 max-w-[200px]">
                                                <p className="font-medium text-gray-900 truncate" title={r.title}>{r.title}</p>
                                                <p className="text-[11px] text-gray-400 truncate">By: {r.isAnonymous ? 'Anonymous' : r.userName}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-xs text-gray-800">{r.reportTypeName}</p>
                                                <Badge className={`mt-1 ${priorityColors[r.priority] || priorityColors.medium}`}>
                                                    {r.priority}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusColors[r.status] || statusColors.pending}`}>
                                                    {r.status?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600">
                                                {r.assignedToName || <span className="text-gray-400 italic">Unassigned</span>}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500">
                                                {new Date(r.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end items-center gap-2">
                                                    <button onClick={() => setUpdatingStatusFor(r)} className="text-[11px] font-medium text-purple-600 hover:underline">Status</button>
                                                    <button onClick={() => setAssigningFor(r)} className="text-[11px] font-medium text-blue-600 hover:underline">Assign</button>
                                                    <button onClick={() => setDeletingReport(r)} className="text-[11px] font-medium text-red-500 hover:underline">Del</button>
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
                                <p className="text-xs text-gray-500">Page {page + 1} of {totalPages}</p>
                                <div className="flex gap-1">
                                    <button disabled={page === 0} onClick={() => loadReports(page - 1)} className="px-3 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-50">Prev</button>
                                    <button disabled={page + 1 >= totalPages} onClick={() => loadReports(page + 1)} className="px-3 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Modals */}
            {updatingStatusFor && (
                <StatusModal report={updatingStatusFor} onClose={() => setUpdatingStatusFor(null)} onSaved={handleReportUpdated} />
            )}
            {assigningFor && (
                <AssignModal report={assigningFor} users={users} onClose={() => setAssigningFor(null)} onSaved={handleReportUpdated} />
            )}
            {deletingReport && (
                <DeleteModal title={deletingReport.reportNumber} onClose={() => setDeletingReport(null)} onConfirm={handleDelete} />
            )}
        </div>
    );
}
