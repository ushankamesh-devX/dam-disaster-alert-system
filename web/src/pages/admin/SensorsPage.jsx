import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    getAllSensors, getSensorsByStatus,
    getSensorTypes, createSensor, deleteSensor,
} from '../../services/sensor.service';
import { getAllDamsList } from '../../services/dam.service';
import SensorSparkline from '../../components/sensors/SensorSparkline';

// ─── Constants ────────────────────────────────────────────────────────────────
const SENSOR_STATUSES = ['active', 'inactive', 'faulty', 'maintenance', 'calibrating'];

const statusStyle = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    INACTIVE: 'bg-gray-50 text-gray-500 border-gray-200',
    FAULTY: 'bg-red-50 text-red-600 border-red-200',
    MAINTENANCE: 'bg-amber-50 text-amber-700 border-amber-200',
    CALIBRATING: 'bg-blue-50 text-blue-700 border-blue-200',
};
function sStyle(s = '') { return statusStyle[(s || '').toUpperCase()] || 'bg-gray-50 text-gray-500 border-gray-200'; }

// ─── Tiny shared components ───────────────────────────────────────────────────
function Badge({ children, className }) {
    return <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-md border ${className}`}>{children}</span>;
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

// ─── Create Sensor Modal ──────────────────────────────────────────────────────
function CreateSensorModal({ dams, sensorTypes, onClose, onCreated }) {
    const EMPTY = {
        sensorUid: '', damId: '', sensorTypeId: '', name: '', description: '',
        locationOnDam: '', latitude: '', longitude: '', elevationMeters: '',
        manufacturer: '', model: '', serialNumber: '',
        installationDate: '', calibrationDate: '', nextCalibrationDate: '',
        minReading: '', maxReading: '', warningThreshold: '', criticalThreshold: '',
        readingIntervalSeconds: '60', status: 'active',
    };
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    
    const set = (k, v) => {
        setForm(f => {
            const next = { ...f, [k]: v };
            // Auto-generate sensor UID when dam is selected
            if (k === 'damId' && v) {
                const selectedDam = dams.find(d => String(d.id) === String(v));
                if (selectedDam && (!f.sensorUid || f.sensorUid === '' || /-S\d+$/.test(f.sensorUid))) {
                    const initials = (selectedDam.name || '').split(' ').filter(Boolean).map(w => w[0].toUpperCase()).join('');
                    const uniqueSuffix = Math.floor(100 + Math.random() * 900);
                    next.sensorUid = `${initials}-S${uniqueSuffix}`;
                }
            }
            return next;
        });
    };

    const validate = () => {
        const e = {};
        if (!form.sensorUid) e.sensorUid = 'Required';
        if (!form.damId) e.damId = 'Required';
        if (!form.sensorTypeId) e.sensorTypeId = 'Required';
        if (!form.name) e.name = 'Required';
        setErrors(e);
        return !Object.keys(e).length;
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const num = ['latitude', 'longitude', 'elevationMeters', 'minReading', 'maxReading', 'warningThreshold', 'criticalThreshold'];
            const int = ['readingIntervalSeconds'];
            const payload = { ...form };
            num.forEach(k => { if (payload[k] !== '') payload[k] = Number(payload[k]); else delete payload[k]; });
            int.forEach(k => { if (payload[k] !== '') payload[k] = parseInt(payload[k]); else delete payload[k]; });
            payload.damId = Number(payload.damId);
            payload.sensorTypeId = Number(payload.sensorTypeId);
            ['installationDate', 'calibrationDate', 'nextCalibrationDate'].forEach(k => { if (!payload[k]) delete payload[k]; });
            const created = await createSensor(payload);
            toast.success(`Sensor "${created.name}" created`);
            onCreated(created);
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to create sensor');
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-900">Add New Sensor</h2>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">✕</button>
                </div>
                <form onSubmit={submit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Inp label="Sensor UID *" placeholder="VIC-WL-001" value={form.sensorUid} onChange={e => set('sensorUid', e.target.value)} error={errors.sensorUid} />
                        <Inp label="Name *" placeholder="Water Level Sensor 1" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Sel label="Dam *" value={form.damId} onChange={e => set('damId', e.target.value)} error={errors.damId}>
                            <option value="">Select dam…</option>
                            {dams.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </Sel>
                        <Sel label="Sensor Type *" value={form.sensorTypeId} onChange={e => set('sensorTypeId', e.target.value)} error={errors.sensorTypeId}>
                            <option value="">Select type…</option>
                            {sensorTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.unit})</option>)}
                        </Sel>
                    </div>
                    <Inp label="Description" value={form.description} onChange={e => set('description', e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                        <Inp label="Location on Dam" placeholder="Dam Crest - Center" value={form.locationOnDam} onChange={e => set('locationOnDam', e.target.value)} />
                        <Sel label="Status" value={form.status} onChange={e => set('status', e.target.value)}>
                            {SENSOR_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </Sel>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Inp label="Latitude" type="number" step="any" value={form.latitude} onChange={e => set('latitude', e.target.value)} />
                        <Inp label="Longitude" type="number" step="any" value={form.longitude} onChange={e => set('longitude', e.target.value)} />
                        <Inp label="Elevation (m)" type="number" step="any" value={form.elevationMeters} onChange={e => set('elevationMeters', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Inp label="Manufacturer" value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} />
                        <Inp label="Model" value={form.model} onChange={e => set('model', e.target.value)} />
                        <Inp label="Serial Number" value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Inp label="Installation Date" type="date" value={form.installationDate} onChange={e => set('installationDate', e.target.value)} />
                        <Inp label="Calibration Date" type="date" value={form.calibrationDate} onChange={e => set('calibrationDate', e.target.value)} />
                        <Inp label="Next Calibration" type="date" value={form.nextCalibrationDate} onChange={e => set('nextCalibrationDate', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                        <Inp label="Min Reading" type="number" step="any" value={form.minReading} onChange={e => set('minReading', e.target.value)} />
                        <Inp label="Max Reading" type="number" step="any" value={form.maxReading} onChange={e => set('maxReading', e.target.value)} />
                        <Inp label="Warning Threshold" type="number" step="any" value={form.warningThreshold} onChange={e => set('warningThreshold', e.target.value)} />
                        <Inp label="Critical Threshold" type="number" step="any" value={form.criticalThreshold} onChange={e => set('criticalThreshold', e.target.value)} />
                    </div>
                    <Inp label="Reading Interval (seconds)" type="number" value={form.readingIntervalSeconds} onChange={e => set('readingIntervalSeconds', e.target.value)} />
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                        <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition">
                            {saving ? 'Creating…' : 'Create Sensor'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ sensor, onClose, onDeleted }) {
    const [loading, setLoading] = useState(false);
    const confirm = async () => {
        setLoading(true);
        try {
            await deleteSensor(sensor.id);
            toast.success(`"${sensor.name}" deleted`);
            onDeleted(sensor.id);
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Delete failed');
        } finally { setLoading(false); }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-lg">⚠</span>
                    <div><h2 className="text-sm font-semibold text-gray-900">Delete Sensor</h2><p className="text-xs text-gray-500">This cannot be undone</p></div>
                </div>
                <p className="text-sm text-gray-700 mb-5">Delete <strong>{sensor.name}</strong> ({sensor.sensorUid})?</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                    <button onClick={confirm} disabled={loading} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition">{loading ? 'Deleting…' : 'Delete'}</button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SensorsPage() {
    const navigate = useNavigate();

    const [sensors, setSensors] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);

    const [dams, setDams] = useState([]);
    const [sensorTypes, setSensorTypes] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [deletingSensor, setDeletingSensor] = useState(null);

    const PAGE_SIZE = 20;

    // Load dropdowns once
    useEffect(() => {
        Promise.allSettled([getAllDamsList(), getSensorTypes()]).then(([dR, tR]) => {
            if (dR.status === 'fulfilled') setDams(dR.value || []);
            if (tR.status === 'fulfilled') setSensorTypes(tR.value || []);
        });
    }, []);

    const load = useCallback(async (p = 0) => {
        setLoading(true);
        try {
            let data;
            if (statusFilter) {
                // GET /sensors/status/{status} → plain array
                const arr = await getSensorsByStatus(statusFilter);
                setSensors(arr || []);
                setTotal(arr?.length ?? 0);
                setTotalPages(1);
                setPage(0);
                setLoading(false);
                return;
            }
            data = await getAllSensors(p, PAGE_SIZE);
            setSensors(data.content ?? []);
            setTotal(data.totalElements ?? 0);
            setTotalPages(data.totalPages ?? 1);
            setPage(data.number ?? p);
        } catch { toast.error('Failed to load sensors'); }
        finally { setLoading(false); }
    }, [statusFilter]);

    useEffect(() => { load(0); }, [statusFilter]);

    // Fleet health counts from loaded sensors (when status filter is active) OR derived from all
    const counts = SENSOR_STATUSES.reduce((acc, s) => {
        acc[s] = sensors.filter(x => (x.status || '').toLowerCase() === s).length;
        return acc;
    }, {});

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Sensors</h1>
                    <p className="text-sm text-gray-400">{loading ? '…' : `${total} sensors`}</p>
                </div>
                <button onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 text-sm font-medium text-white bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm">
                    <span className="text-base leading-none">+</span> Add Sensor
                </button>
            </div>

            {/* Status filter tabs */}
            <div className="flex flex-wrap items-center gap-2">
                {[{ label: 'All', value: '' }, ...SENSOR_STATUSES.map(s => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s }))].map(({ label, value }) => (
                    <button key={value} onClick={() => setStatusFilter(value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${statusFilter === value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {/* Quick health strips */}
            {!statusFilter && !loading && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                        { label: 'Active', color: 'bg-emerald-500', key: 'active' },
                        { label: 'Inactive', color: 'bg-gray-400', key: 'inactive' },
                        { label: 'Faulty', color: 'bg-red-500', key: 'faulty' },
                        { label: 'Maintenance', color: 'bg-amber-400', key: 'maintenance' },
                        { label: 'Calibrating', color: 'bg-blue-500', key: 'calibrating' },
                    ].map(({ label, color, key }) => (
                        <button key={key} onClick={() => setStatusFilter(key)}
                            className="bg-white border border-gray-200 rounded-xl p-3 text-left hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`w-2 h-2 rounded-full ${color}`} />
                                <span className="text-xs text-gray-500">{label}</span>
                            </div>
                            <p className="text-xl font-bold text-gray-900">{counts[key] ?? '—'}</p>
                        </button>
                    ))}
                </div>
            )}

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-left">
                                {['UID', 'Name', 'Dam', 'Type', 'Status', 'Battery', 'Signal', 'Trend (24h)', 'Last Reading', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i}>{Array.from({ length: 10 }).map((_, j) => (
                                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                                    ))}</tr>
                                ))
                            ) : sensors.length === 0 ? (
                                <tr><td colSpan={10} className="py-20 text-center">
                                    <p className="text-sm text-gray-400">No sensors found</p>
                                    <p className="text-xs text-gray-300 mt-1">Add a sensor using the button above</p>
                                </td></tr>
                            ) : sensors.map(s => (
                                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/admin/sensors/${s.id}`)}>
                                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.sensorUid}</td>
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-gray-900 whitespace-nowrap">{s.name}</p>
                                        {s.locationOnDam && <p className="text-[11px] text-gray-400">{s.locationOnDam}</p>}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{s.damName ?? '—'}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{s.sensorType?.name ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        <Badge className={sStyle(s.status)}>{s.status ?? '—'}</Badge>
                                    </td>
                                    <td className="px-4 py-3 text-xs">
                                        {s.batteryLevel != null ? (
                                            <span className={`font-medium ${Number(s.batteryLevel) < 20 ? 'text-red-600' : Number(s.batteryLevel) < 50 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                {Number(s.batteryLevel).toFixed(0)}%
                                            </span>
                                        ) : <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-xs">
                                        {s.signalStrength != null ? (
                                            <span className={`font-medium ${Number(s.signalStrength) < 30 ? 'text-red-600' : Number(s.signalStrength) < 60 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                {Number(s.signalStrength).toFixed(0)}%
                                            </span>
                                        ) : <span className="text-gray-400">—</span>}
                                    </td>
                                    {/* ── Sparkline ── */}
                                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                        <SensorSparkline
                                            sensorId={s.id}
                                            warningThreshold={s.warningThreshold}
                                            criticalThreshold={s.criticalThreshold}
                                            unit={s.sensorType?.unit || ''}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                        {s.lastReadingAt ? new Date(s.lastReadingAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                    </td>
                                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => navigate(`/admin/sensors/${s.id}`)} className="text-xs text-blue-600 hover:underline">View</button>
                                            <button onClick={() => setDeletingSensor(s)} className="text-xs text-red-500 hover:underline">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination (only when not status-filtered since status filter returns an array) */}
                {!statusFilter && totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">Page {page + 1} of {totalPages} · {total} total</p>
                        <div className="flex items-center gap-1">
                            <button disabled={page === 0} onClick={() => load(page - 1)}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">← Prev</button>
                            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                                const pg = Math.max(0, page - 2) + i;
                                if (pg >= totalPages) return null;
                                return <button key={pg} onClick={() => load(pg)}
                                    className={`w-8 h-8 text-xs font-medium rounded-lg border transition ${pg === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}>{pg + 1}</button>;
                            })}
                            <button disabled={page + 1 >= totalPages} onClick={() => load(page + 1)}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">Next →</button>
                        </div>
                    </div>
                )}
            </div>

            {showCreate && (
                <CreateSensorModal dams={dams} sensorTypes={sensorTypes}
                    onClose={() => setShowCreate(false)}
                    onCreated={s => { setSensors(p => [s, ...p]); setTotal(t => t + 1); }} />
            )}
            {deletingSensor && (
                <DeleteModal sensor={deletingSensor}
                    onClose={() => setDeletingSensor(null)}
                    onDeleted={id => { setSensors(p => p.filter(s => s.id !== id)); setTotal(t => t - 1); }} />
            )}
        </div>
    );
}
