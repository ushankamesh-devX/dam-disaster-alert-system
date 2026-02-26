import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    getDams, filterDams, searchDams,
    createDam, deleteDam, getAllDamsList,
} from '../../services/dam.service';
import { getAllRegionsList } from '../../services/region.service';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAM_STATUSES = ['operational', 'under_maintenance', 'decommissioned', 'under_construction'];
const DAM_TYPES = ['gravity', 'arch', 'buttress', 'earth_fill', 'rock_fill', 'composite'];
const HAZARD_STATUSES = ['safe', 'watch', 'warning', 'danger', 'extreme_danger'];
const RISK_CLASSES = ['low', 'medium', 'high', 'very_high', 'extreme'];

const hazardColors = {
    SAFE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    WATCH: 'bg-blue-50 text-blue-700 border-blue-200',
    WARNING: 'bg-amber-50 text-amber-700 border-amber-200',
    DANGER: 'bg-orange-50 text-orange-700 border-orange-200',
    EXTREME_DANGER: 'bg-red-50 text-red-700 border-red-200',
};
const statusColors = {
    OPERATIONAL: 'text-emerald-600',
    UNDER_MAINTENANCE: 'text-amber-600',
    DECOMMISSIONED: 'text-gray-400',
    UNDER_CONSTRUCTION: 'text-blue-600',
};
function hColor(s = '') { return hazardColors[(s || '').toUpperCase()] || hazardColors.SAFE; }
function sColor(s = '') { return statusColors[(s || '').toUpperCase()] || 'text-gray-500'; }

// ─── Shared tiny components ───────────────────────────────────────────────────

function Badge({ children, className }) {
    return <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-md border ${className}`}>{children}</span>;
}
function Skeleton({ className }) {
    return <div className={`animate-pulse bg-gray-100 rounded ${className}`} />;
}
function Input({ label, error, ...props }) {
    return (
        <div>
            {label && <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>}
            <input className={`w-full text-sm px-3 py-2 rounded-lg border ${error ? 'border-red-400' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition`} {...props} />
            {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
        </div>
    );
}
function Select({ label, children, ...props }) {
    return (
        <div>
            {label && <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>}
            <select className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 bg-white transition" {...props}>
                {children}
            </select>
        </div>
    );
}

// ─── Create Dam Modal ─────────────────────────────────────────────────────────

function CreateDamModal({ regions, onClose, onCreated }) {
    const EMPTY = {
        code: '', name: '', nameSi: '', regionId: '', locationDescription: '',
        latitude: '', longitude: '', damType: 'gravity', heightMeters: '', lengthMeters: '',
        reservoirCapacityMcm: '', yearCompleted: '', riverName: '', purpose: '',
        operatorOrganization: '', contactPhone: '', contactEmail: '', emergencyPhone: '',
        status: 'operational', riskClassification: 'medium',
    };
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const validate = () => {
        const e = {};
        if (!form.code) e.code = 'Required';
        if (!form.name) e.name = 'Required';
        if (!form.regionId) e.regionId = 'Required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = { ...form };
            ['latitude', 'longitude', 'heightMeters', 'lengthMeters', 'reservoirCapacityMcm', 'yearCompleted'].forEach(k => {
                if (payload[k] !== '') payload[k] = Number(payload[k]);
                else delete payload[k];
            });
            ['regionId'].forEach(k => { if (payload[k]) payload[k] = Number(payload[k]); });
            const created = await createDam(payload);
            toast.success(`Dam "${created.name}" created`);
            onCreated(created);
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to create dam');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-900">Add New Dam</h2>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">✕</button>
                </div>
                <form onSubmit={submit} className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Code *" placeholder="VIC001" value={form.code} onChange={e => set('code', e.target.value)} error={errors.code} />
                        <Input label="Name *" placeholder="Victoria Dam" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Name (Sinhala)" value={form.nameSi} onChange={e => set('nameSi', e.target.value)} />
                        <Select label="Region *" value={form.regionId} onChange={e => set('regionId', e.target.value)} error={errors.regionId}>
                            <option value="">Select region…</option>
                            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Dam Type" value={form.damType} onChange={e => set('damType', e.target.value)}>
                            {DAM_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                        </Select>
                        <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)}>
                            {DAM_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Latitude" type="number" step="any" placeholder="7.2276" value={form.latitude} onChange={e => set('latitude', e.target.value)} />
                        <Input label="Longitude" type="number" step="any" placeholder="80.7867" value={form.longitude} onChange={e => set('longitude', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Input label="Height (m)" type="number" step="any" value={form.heightMeters} onChange={e => set('heightMeters', e.target.value)} />
                        <Input label="Length (m)" type="number" step="any" value={form.lengthMeters} onChange={e => set('lengthMeters', e.target.value)} />
                        <Input label="Capacity (MCM)" type="number" step="any" value={form.reservoirCapacityMcm} onChange={e => set('reservoirCapacityMcm', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="River Name" value={form.riverName} onChange={e => set('riverName', e.target.value)} />
                        <Input label="Year Completed" type="number" placeholder="1985" value={form.yearCompleted} onChange={e => set('yearCompleted', e.target.value)} />
                    </div>
                    <Input label="Purpose" placeholder="hydropower,irrigation,flood_control" value={form.purpose} onChange={e => set('purpose', e.target.value)} />
                    <Input label="Operator Organisation" value={form.operatorOrganization} onChange={e => set('operatorOrganization', e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Contact Phone" value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} />
                        <Input label="Emergency Phone" value={form.emergencyPhone} onChange={e => set('emergencyPhone', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Contact Email" type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} />
                        <Select label="Risk Classification" value={form.riskClassification} onChange={e => set('riskClassification', e.target.value)}>
                            {RISK_CLASSES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                        </Select>
                    </div>
                    <Input label="Location Description" value={form.locationDescription} onChange={e => set('locationDescription', e.target.value)} />

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                        <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition">
                            {saving ? 'Creating…' : 'Create Dam'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ dam, onClose, onDeleted }) {
    const [loading, setLoading] = useState(false);
    const confirm = async () => {
        setLoading(true);
        try {
            await deleteDam(dam.id);
            toast.success(`"${dam.name}" deleted`);
            onDeleted(dam.id);
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Delete failed');
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-lg">⚠</span>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">Delete Dam</h2>
                        <p className="text-xs text-gray-500">This action cannot be undone</p>
                    </div>
                </div>
                <p className="text-sm text-gray-700 mb-5">Are you sure you want to delete <strong>{dam.name}</strong> ({dam.code})?</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                    <button onClick={confirm} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition">
                        {loading ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DamsPage() {
    const navigate = useNavigate();

    const [dams, setDams] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);

    const [regions, setRegions] = useState([]);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ status: '', regionId: '', hazardStatus: '' });
    const [showCreate, setShowCreate] = useState(false);
    const [deletingDam, setDeletingDam] = useState(null);

    const PAGE_SIZE = 15;
    const searchTimer = useRef(null);
    const hasFilters = filters.status || filters.regionId || filters.hazardStatus;

    // Load regions once
    useEffect(() => {
        getAllRegionsList().then(setRegions).catch(() => { });
    }, []);

    const load = useCallback(async (p = 0) => {
        setLoading(true);
        try {
            let data;
            if (search.trim()) {
                data = await searchDams(search.trim(), p, PAGE_SIZE);
            } else if (hasFilters) {
                data = await filterDams({ ...filters, page: p, size: PAGE_SIZE });
            } else {
                data = await getDams(p, PAGE_SIZE);
            }
            // Spring Page: { content, totalElements, totalPages, number }
            setDams(data.content ?? data ?? []);
            setTotal(data.totalElements ?? (data.content?.length ?? 0));
            setTotalPages(data.totalPages ?? 1);
            setPage(data.number ?? p);
        } catch {
            toast.error('Failed to load dams');
        } finally {
            setLoading(false);
        }
    }, [search, filters, hasFilters]);

    useEffect(() => { load(0); }, [filters]);

    // Debounce search
    useEffect(() => {
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => load(0), 400);
        return () => clearTimeout(searchTimer.current);
    }, [search]);

    const onFilterChange = (k, v) => setFilters(f => ({ ...f, [k]: v }));
    const clearFilters = () => { setFilters({ status: '', regionId: '', hazardStatus: '' }); setSearch(''); };

    const handleCreated = (dam) => {
        setDams(prev => [dam, ...prev]);
        setTotal(t => t + 1);
    };

    const handleDeleted = (id) => {
        setDams(prev => prev.filter(d => d.id !== id));
        setTotal(t => t - 1);
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Dams</h1>
                    <p className="text-sm text-gray-400">{loading ? '…' : `${total} dams in registry`}</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 text-sm font-medium text-white bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
                >
                    <span className="text-base leading-none">+</span> Add Dam
                </button>
            </div>

            {/* Search + Filters */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                        <input
                            className="w-full text-sm pl-8 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
                            placeholder="Name, code, river…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="min-w-[140px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                    <select className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white transition" value={filters.status} onChange={e => onFilterChange('status', e.target.value)}>
                        <option value="">All statuses</option>
                        {DAM_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                </div>
                <div className="min-w-[140px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Hazard</label>
                    <select className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white transition" value={filters.hazardStatus} onChange={e => onFilterChange('hazardStatus', e.target.value)}>
                        <option value="">All hazard levels</option>
                        {HAZARD_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                </div>
                <div className="min-w-[140px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Region</label>
                    <select className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white transition" value={filters.regionId} onChange={e => onFilterChange('regionId', e.target.value)}>
                        <option value="">All regions</option>
                        {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </div>
                {(hasFilters || search) && (
                    <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-gray-800 underline self-end pb-2">Clear all</button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-left">
                                {['Code', 'Name', 'Region', 'Type', 'Hazard', 'Status', 'Risk', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 8 }).map((_, j) => (
                                            <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : dams.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-20 text-center">
                                        <p className="text-sm text-gray-400">No dams found</p>
                                        <p className="text-xs text-gray-300 mt-1">Try adjusting filters or add a new dam</p>
                                    </td>
                                </tr>
                            ) : dams.map(dam => (
                                <tr key={dam.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/admin/dams/${dam.id}`)}>
                                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-600">{dam.code}</td>
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-gray-900 whitespace-nowrap">{dam.name}</p>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{dam.regionName ?? '—'}</td>
                                    <td className="px-4 py-3 text-gray-500 text-xs capitalize">{(dam.damType ?? '').toLowerCase().replace('_', ' ') || '—'}</td>
                                    <td className="px-4 py-3">
                                        <Badge className={hColor(dam.overallHazardStatus)}>
                                            {dam.overallHazardStatus ?? 'Safe'}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs font-medium capitalize ${sColor(dam.status)}`}>
                                            {(dam.status ?? '').replace('_', ' ') || '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500 capitalize">{(dam.riskClassification ?? '').replace('_', ' ') || '—'}</td>
                                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => navigate(`/admin/dams/${dam.id}`)}
                                                className="text-xs text-blue-600 hover:underline font-medium"
                                            >View</button>
                                            <button
                                                onClick={() => setDeletingDam(dam)}
                                                className="text-xs text-red-500 hover:underline font-medium"
                                            >Delete</button>
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
                        <p className="text-xs text-gray-500">
                            Page {page + 1} of {totalPages} · {total} total dams
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                disabled={page === 0}
                                onClick={() => load(page - 1)}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
                            >← Prev</button>
                            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                                const pg = Math.max(0, page - 2) + i;
                                if (pg >= totalPages) return null;
                                return (
                                    <button key={pg} onClick={() => load(pg)}
                                        className={`w-8 h-8 text-xs font-medium rounded-lg border transition ${pg === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}
                                    >{pg + 1}</button>
                                );
                            })}
                            <button
                                disabled={page + 1 >= totalPages}
                                onClick={() => load(page + 1)}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
                            >Next →</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showCreate && (
                <CreateDamModal
                    regions={regions}
                    onClose={() => setShowCreate(false)}
                    onCreated={handleCreated}
                />
            )}
            {deletingDam && (
                <DeleteModal
                    dam={deletingDam}
                    onClose={() => setDeletingDam(null)}
                    onDeleted={handleDeleted}
                />
            )}
        </div>
    );
}
