import SymbolIcon from '../../components/ui/SymbolIcon';
import { Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { StatusChip as Badge, LoadingSkeleton as Skeleton, Field as Inp, Field as Sel, AppDialog, AppButton } from '../../components/ui/controls';
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
        <AppDialog onClose={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <Typography component="h2" variant="h2" className="text-base font-semibold text-gray-900">Add New Sensor</Typography>
                    <AppButton iconOnly aria-label="Close" onClick={onClose} className="w-7 h-7 flex items-center justify-center"><SymbolIcon name="close" /></AppButton>
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
                        <AppButton type="button" onClick={onClose} className="">Cancel</AppButton>
                        <AppButton variant="contained" type="submit" disabled={saving} className="disabled:opacity-60">
                            {saving ? 'Creating…' : 'Create Sensor'}
                        </AppButton>
                    </div>
                </form>
            </div>
        </AppDialog>
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
        <AppDialog onClose={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-lg"><SymbolIcon name="warning" /></span>
                    <div><Typography component="h2" variant="h2" className="text-sm font-semibold text-gray-900">Delete Sensor</Typography><p className="text-xs text-gray-500">This cannot be undone</p></div>
                </div>
                <p className="text-sm text-gray-700 mb-5">Delete <strong>{sensor.name}</strong> ({sensor.sensorUid})?</p>
                <div className="flex justify-end gap-3">
                    <AppButton onClick={onClose} className="">Cancel</AppButton>
                    <AppButton variant="contained" color="error" onClick={confirm} disabled={loading} className="disabled:opacity-60">{loading ? 'Deleting…' : 'Delete'}</AppButton>
                </div>
            </div>
        </AppDialog>
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
                    <Typography component="h1" variant="h1" className="text-xl font-bold text-gray-900">Sensors</Typography>
                    <p className="text-sm text-gray-400">{loading ? '…' : `${total} sensors`}</p>
                </div>
                <AppButton variant="contained" onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2">
                    <span className="text-base leading-none">+</span> Add Sensor
                </AppButton>
            </div>

            {/* Status filter tabs */}
            <div className="flex flex-wrap items-center gap-2">
                {[{ label: 'All', value: '' }, ...SENSOR_STATUSES.map(s => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s }))].map(({ label, value }) => (
                    <AppButton key={value} onClick={() => setStatusFilter(value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${statusFilter === value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        {label}
                    </AppButton>
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
                        <AppButton variant="outlined" key={key} onClick={() => setStatusFilter(key)}
                            className="">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`w-2 h-2 rounded-full ${color}`} />
                                <span className="text-xs text-gray-500">{label}</span>
                            </div>
                            <p className="text-xl font-bold text-gray-900">{counts[key] ?? '—'}</p>
                        </AppButton>
                    ))}
                </div>
            )}

            {/* Table */}
            <Paper variant="outlined" className="bg-white border border-gray-200   overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="w-full text-sm">
                        <TableHead>
                            <TableRow className="bg-gray-50 border-b border-gray-100 text-left">
                                {['UID', 'Name', 'Dam', 'Type', 'Status', 'Battery', 'Signal', 'Trend (24h)', 'Last Reading', 'Actions'].map(h => (
                                    <TableCell component="th" key={h} className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <TableRow key={i}>{Array.from({ length: 10 }).map((_, j) => (
                                        <TableCell key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></TableCell>
                                    ))}</TableRow>
                                ))
                            ) : sensors.length === 0 ? (
                                <TableRow><TableCell colSpan={10} className="py-20 text-center">
                                    <p className="text-sm text-gray-400">No sensors found</p>
                                    <p className="text-xs text-gray-300 mt-1">Add a sensor using the button above</p>
                                </TableCell></TableRow>
                            ) : sensors.map(s => (
                                <TableRow key={s.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/admin/sensors/${s.id}`)}>
                                    <TableCell className="px-4 py-3 font-mono text-xs text-gray-600">{s.sensorUid}</TableCell>
                                    <TableCell className="px-4 py-3">
                                        <p className="font-medium text-gray-900 whitespace-nowrap">{s.name}</p>
                                        {s.locationOnDam && <p className="text-[11px] text-gray-400">{s.locationOnDam}</p>}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{s.damName ?? '—'}</TableCell>
                                    <TableCell className="px-4 py-3 text-xs text-gray-500">{s.sensorType?.name ?? '—'}</TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Badge className={sStyle(s.status)}>{s.status ?? '—'}</Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-xs">
                                        {s.batteryLevel != null ? (
                                            <span className={`font-medium ${Number(s.batteryLevel) < 20 ? 'text-red-600' : Number(s.batteryLevel) < 50 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                {Number(s.batteryLevel).toFixed(0)}%
                                            </span>
                                        ) : <span className="text-gray-400">—</span>}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-xs">
                                        {s.signalStrength != null ? (
                                            <span className={`font-medium ${Number(s.signalStrength) < 30 ? 'text-red-600' : Number(s.signalStrength) < 60 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                {Number(s.signalStrength).toFixed(0)}%
                                            </span>
                                        ) : <span className="text-gray-400">—</span>}
                                    </TableCell>
                                    {/* ── Sparkline ── */}
                                    <TableCell className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                        <SensorSparkline
                                            sensorId={s.id}
                                            warningThreshold={s.warningThreshold}
                                            criticalThreshold={s.criticalThreshold}
                                            unit={s.sensorType?.unit || ''}
                                        />
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                        {s.lastReadingAt ? new Date(s.lastReadingAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                    </TableCell>
                                    <TableCell className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center gap-2">
                                            <AppButton onClick={() => navigate(`/admin/sensors/${s.id}`)} className="hover:underline">View</AppButton>
                                            <AppButton onClick={() => setDeletingSensor(s)} className="hover:underline">Delete</AppButton>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination (only when not status-filtered since status filter returns an array) */}
                {!statusFilter && totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">Page {page + 1} of {totalPages} · {total} total</p>
                        <div className="flex items-center gap-1">
                            <AppButton variant="outlined" disabled={page === 0} onClick={() => load(page - 1)}
                                className="disabled:opacity-40">← Prev</AppButton>
                            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                                const pg = Math.max(0, page - 2) + i;
                                if (pg >= totalPages) return null;
                                return <AppButton key={pg} onClick={() => load(pg)}
                                    className={`w-8 h-8 text-xs font-medium rounded-lg border transition ${pg === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}>{pg + 1}</AppButton>;
                            })}
                            <AppButton variant="outlined" disabled={page + 1 >= totalPages} onClick={() => load(page + 1)}
                                className="disabled:opacity-40">Next →</AppButton>
                        </div>
                    </div>
                )}
            </Paper>

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
