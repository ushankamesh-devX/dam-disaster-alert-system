import SymbolIcon from '../../components/ui/SymbolIcon';
import { Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { StatusChip as Badge, LoadingSkeleton as Skeleton, Field as Inp, Field as Sel, AppDialog, AppButton, AppInput } from '../../components/ui/controls';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts';
import {
    getSensorById, getLatestReading, getSensorReadings,
    updateSensor, deleteSensor, createReading,
} from '../../services/sensor.service';
import { getAllDamsList } from '../../services/dam.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusStyle = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    INACTIVE: 'bg-gray-50 text-gray-500 border-gray-200',
    FAULTY: 'bg-red-50 text-red-600 border-red-200',
    MAINTENANCE: 'bg-amber-50 text-amber-700 border-amber-200',
    CALIBRATING: 'bg-blue-50 text-blue-700 border-blue-200',
};
function sStyle(s = '') { return statusStyle[(s || '').toUpperCase()] || 'bg-gray-50 text-gray-500 border-gray-200'; }

const SENSOR_STATUSES = ['active', 'inactive', 'faulty', 'maintenance', 'calibrating'];
const QUALITIES = ['good', 'questionable', 'bad', 'missing'];

function InfoRow({ label, value }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0">
            <span className="text-xs text-gray-500 whitespace-nowrap">{label}</span>
            <span className="text-xs font-medium text-gray-800 text-right">{value || '—'}</span>
        </div>
    );
}





// ─── Edit Sensor Modal ────────────────────────────────────────────────────────
function EditModal({ sensor, dams, onClose, onUpdated }) {
    const [form, setForm] = useState({
        name: sensor.name || '',
        description: sensor.description || '',
        locationOnDam: sensor.locationOnDam || '',
        status: sensor.status || 'active',
        manufacturer: sensor.manufacturer || '',
        model: sensor.model || '',
        warningThreshold: sensor.warningThreshold ?? '',
        criticalThreshold: sensor.criticalThreshold ?? '',
        readingIntervalSeconds: sensor.readingIntervalSeconds ?? '',
        nextCalibrationDate: sensor.nextCalibrationDate || '',
    });
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form };
            ['warningThreshold', 'criticalThreshold'].forEach(k => { if (payload[k] !== '') payload[k] = Number(payload[k]); else delete payload[k]; });
            if (payload.readingIntervalSeconds !== '') payload.readingIntervalSeconds = parseInt(payload.readingIntervalSeconds); else delete payload.readingIntervalSeconds;
            if (!payload.nextCalibrationDate) delete payload.nextCalibrationDate;
            const updated = await updateSensor(sensor.id, payload);
            toast.success('Sensor updated');
            onUpdated(updated);
            onClose();
        } catch (err) { toast.error(err?.response?.data?.message || 'Update failed'); }
        finally { setSaving(false); }
    };
    return (
        <AppDialog onClose={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <Typography component="h2" variant="h2" className="text-base font-semibold text-gray-900">Edit Sensor — {sensor.sensorUid}</Typography>
                    <AppButton iconOnly aria-label="Close" onClick={onClose} className="w-7 h-7 flex items-center justify-center"><SymbolIcon name="close" /></AppButton>
                </div>
                <form onSubmit={submit} className="p-6 space-y-4">
                    <Inp label="Name" value={form.name} onChange={e => set('name', e.target.value)} />
                    <Inp label="Description" value={form.description} onChange={e => set('description', e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                        <Inp label="Location on Dam" value={form.locationOnDam} onChange={e => set('locationOnDam', e.target.value)} />
                        <Sel label="Status" value={form.status} onChange={e => set('status', e.target.value)}>
                            {SENSOR_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </Sel>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Inp label="Manufacturer" value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} />
                        <Inp label="Model" value={form.model} onChange={e => set('model', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Inp label="Warning Threshold" type="number" step="any" value={form.warningThreshold} onChange={e => set('warningThreshold', e.target.value)} />
                        <Inp label="Critical Threshold" type="number" step="any" value={form.criticalThreshold} onChange={e => set('criticalThreshold', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Inp label="Reading Interval (s)" type="number" value={form.readingIntervalSeconds} onChange={e => set('readingIntervalSeconds', e.target.value)} />
                        <Inp label="Next Calibration Date" type="date" value={form.nextCalibrationDate} onChange={e => set('nextCalibrationDate', e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-3 pt-1">
                        <AppButton type="button" onClick={onClose} className="">Cancel</AppButton>
                        <AppButton variant="contained" type="submit" disabled={saving} className="disabled:opacity-60">{saving ? 'Saving…' : 'Save Changes'}</AppButton>
                    </div>
                </form>
            </div>
        </AppDialog>
    );
}

// ─── Log Reading Modal ────────────────────────────────────────────────────────
function LogReadingModal({ sensor, onClose, onLogged }) {
    const [form, setForm] = useState({ readingValue: '', unit: sensor.sensorType?.unit || '', quality: 'good', recordedAt: '' });
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.readingValue) { toast.error('Reading value required'); return; }
        setSaving(true);
        try {
            const payload = {
                sensorId: sensor.id,
                readingValue: Number(form.readingValue),
                unit: form.unit || undefined,
                quality: form.quality,
                recordedAt: form.recordedAt || undefined,
            };
            const logged = await createReading(payload);
            toast.success('Reading logged');
            onLogged(logged);
            onClose();
        } catch (err) { toast.error(err?.response?.data?.message || 'Failed to log reading'); }
        finally { setSaving(false); }
    };
    return (
        <AppDialog onClose={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <Typography component="h2" variant="h2" className="text-sm font-semibold text-gray-900">Log Manual Reading</Typography>
                    <AppButton iconOnly aria-label="Close" onClick={onClose} className="w-7 h-7 flex items-center justify-center"><SymbolIcon name="close" /></AppButton>
                </div>
                <form onSubmit={submit} className="p-5 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Inp label={`Value (${form.unit || 'unit'})`} type="number" step="any" placeholder="e.g. 115.4" value={form.readingValue} onChange={e => set('readingValue', e.target.value)} />
                        <Inp label="Unit" value={form.unit} onChange={e => set('unit', e.target.value)} />
                    </div>
                    <Sel label="Quality" value={form.quality} onChange={e => set('quality', e.target.value)}>
                        {QUALITIES.map(q => <option key={q} value={q}>{q.charAt(0).toUpperCase() + q.slice(1)}</option>)}
                    </Sel>
                    <div>
                        <label htmlFor="field-SensorDetailPage-10233" className="block text-xs font-medium text-gray-700 mb-1">Recorded At (optional)</label>
                        <AppInput id="field-SensorDetailPage-10233" type="datetime-local" className="w-full"
                            value={form.recordedAt} onChange={e => set('recordedAt', e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-3 pt-1">
                        <AppButton type="button" onClick={onClose} className="">Cancel</AppButton>
                        <AppButton variant="contained" type="submit" disabled={saving} className="disabled:opacity-60">{saving ? 'Logging…' : 'Log Reading'}</AppButton>
                    </div>
                </form>
            </div>
        </AppDialog>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SensorDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [sensor, setSensor] = useState(null);
    const [latest, setLatest] = useState(null);
    const [readings, setReadings] = useState([]);
    const [readPage, setReadPage] = useState(0);
    const [readTotal, setReadTotal] = useState(0);
    const [readTotalPages, setReadTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [readLoading, setReadLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('info');
    const [editOpen, setEditOpen] = useState(false);
    const [logOpen, setLogOpen] = useState(false);
    const [dams, setDams] = useState([]);

    // ── Chart state ──────────────────────────────────────────────────────────
    const [chartData, setChartData] = useState([]);
    const [chartRange, setChartRange] = useState('24h');  // '24h' | '7d' | 'all'
    const [chartLoading, setChartLoading] = useState(false);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [sRes, lRes, dRes] = await Promise.allSettled([
                    getSensorById(id),
                    getLatestReading(id),
                    getAllDamsList(),
                ]);
                if (sRes.status === 'fulfilled') setSensor(sRes.value);
                else { toast.error('Sensor not found'); navigate('/admin/sensors'); return; }
                if (lRes.status === 'fulfilled') setLatest(lRes.value);
                if (dRes.status === 'fulfilled') setDams(dRes.value || []);
            } finally { setLoading(false); }
        };
        fetchAll();
    }, [id]);

    const loadReadings = async (p = 0) => {
        setReadLoading(true);
        try {
            const data = await getSensorReadings(id, p, 20);
            setReadings(data.content ?? []);
            setReadTotal(data.totalElements ?? 0);
            setReadTotalPages(data.totalPages ?? 1);
            setReadPage(data.number ?? p);
        } catch { toast.error('Failed to load readings'); }
        finally { setReadLoading(false); }
    };

    const loadChartData = async () => {
        setChartLoading(true);
        try {
            // Fetch up to 500 readings to get a good chart (most-recent first from API)
            const data = await getSensorReadings(id, 0, 500);
            const rows = (data.content ?? []).slice().reverse(); // oldest → newest
            const hourMs = 3600000;
            const cutoff = chartRange === '24h' ? Date.now() - 24 * hourMs
                : chartRange === '7d' ? Date.now() - 7 * 24 * hourMs
                    : 0;
            const filtered = rows.filter(r => new Date(r.recordedAt).getTime() >= cutoff);
            setChartData(filtered.map(r => ({
                time: r.recordedAt,
                value: Number(r.readingValue),
                quality: r.quality,
            })));
        } catch { toast.error('Failed to load chart data'); }
        finally { setChartLoading(false); }
    };

    useEffect(() => { if (activeTab === 'readings') loadReadings(0); }, [activeTab]);
    useEffect(() => { if (activeTab === 'chart') loadChartData(); }, [activeTab, chartRange]);

    if (loading) return (
        <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-3 gap-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}</div>
            <Skeleton className="h-80" />
        </div>
    );
    if (!sensor) return null;

    const qualityStyle = { good: 'text-emerald-600', questionable: 'text-amber-600', bad: 'text-red-600', missing: 'text-gray-400' };
    const TABS = ['info', 'chart', 'readings'];

    return (
        <div className="space-y-5">
            {/* Breadcrumb + Header */}
            <div>
                <AppButton onClick={() => navigate('/admin/sensors')} className="flex items-center gap-1 mb-2">
                    ← Back to Sensors
                </AppButton>
                <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <Typography component="h1" variant="h1" className="text-xl font-bold text-gray-900">{sensor.name}</Typography>
                            <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{sensor.sensorUid}</span>
                            <Badge className={sStyle(sensor.status)}>{sensor.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-400 mt-0.5">
                            {sensor.sensorType?.name ?? '—'} · {sensor.damName ?? '—'}
                            {sensor.locationOnDam && ` · ${sensor.locationOnDam}`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <AppButton variant="outlined" onClick={() => setLogOpen(true)}
                            className="">
                            + Log Reading
                        </AppButton>
                        <AppButton variant="outlined" onClick={() => setEditOpen(true)}
                            className="">
                            Edit
                        </AppButton>
                    </div>
                </div>
            </div>

            {/* Quick stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Latest Reading', value: latest ? `${Number(latest.readingValue).toFixed(2)} ${latest.unit || ''}` : '—', sub: latest ? new Date(latest.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No reading', highlight: true },
                    { label: 'Battery', value: sensor.batteryLevel != null ? `${Number(sensor.batteryLevel).toFixed(0)}%` : '—', sub: Number(sensor.batteryLevel) < 20 ? 'Low battery!' : 'Normal' },
                    { label: 'Signal Strength', value: sensor.signalStrength != null ? `${Number(sensor.signalStrength).toFixed(0)}%` : '—', sub: Number(sensor.signalStrength) < 30 ? 'Weak signal' : 'Good signal' },
                    { label: 'Read Interval', value: sensor.readingIntervalSeconds ? `${sensor.readingIntervalSeconds}s` : '—', sub: 'Between readings' },
                ].map(({ label, value, sub, highlight }) => (
                    <div key={label} className={`rounded-xl p-4 border ${highlight ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'} shadow-sm`}>
                        <p className={`text-xs mb-1 ${highlight ? 'text-blue-200' : 'text-gray-500'}`}>{label}</p>
                        <p className={`text-xl font-bold ${highlight ? 'text-white' : 'text-gray-900'}`}>{value}</p>
                        <p className={`text-xs mt-0.5 ${highlight ? 'text-blue-200' : 'text-gray-400'}`}>{sub}</p>
                    </div>
                ))}
            </div>

            {/* Threshold indicators */}
            {(sensor.warningThreshold != null || sensor.criticalThreshold != null) && (
                <Paper variant="outlined" className="bg-white border border-gray-200  p-4  flex gap-6 flex-wrap">
                    <div>
                        <p className="text-xs text-gray-500">Warning threshold</p>
                        <p className="text-sm font-semibold text-amber-600">{sensor.warningThreshold != null ? `${Number(sensor.warningThreshold).toFixed(2)} ${sensor.sensorType?.unit || ''}` : '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Critical threshold</p>
                        <p className="text-sm font-semibold text-red-600">{sensor.criticalThreshold != null ? `${Number(sensor.criticalThreshold).toFixed(2)} ${sensor.sensorType?.unit || ''}` : '—'}</p>
                    </div>
                    {latest && (
                        <div>
                            <p className="text-xs text-gray-500">Latest quality</p>
                            <p className={`text-sm font-semibold capitalize ${qualityStyle[latest.quality?.toLowerCase()] || 'text-gray-600'}`}>{latest.quality || '—'}</p>
                        </div>
                    )}
                </Paper>
            )}

            {/* Tabs */}
            <Paper variant="outlined" className="bg-white border border-gray-200   overflow-hidden">
                <div className="flex border-b border-gray-100">
                    {TABS.map(tab => (
                        <AppButton key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-5 py-3 text-sm font-medium capitalize transition ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>
                            {tab === 'readings' ? 'Readings History' : tab === 'chart' ? 'Chart' : 'Sensor Info'}
                        </AppButton>
                    ))}
                </div>

                {activeTab === 'info' && (
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Typography component="h3" variant="h3" className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Device Information</Typography>
                            <InfoRow label="Sensor UID" value={sensor.sensorUid} />
                            <InfoRow label="Type" value={sensor.sensorType?.name} />
                            <InfoRow label="Manufacturer" value={sensor.manufacturer} />
                            <InfoRow label="Model" value={sensor.model} />
                            <InfoRow label="Serial Number" value={sensor.serialNumber} />
                            <InfoRow label="Location on Dam" value={sensor.locationOnDam} />
                            <InfoRow label="Elevation" value={sensor.elevationMeters != null ? `${Number(sensor.elevationMeters).toFixed(1)} m` : null} />
                            <InfoRow label="Coordinates" value={sensor.latitude && sensor.longitude ? `${sensor.latitude}, ${sensor.longitude}` : null} />
                        </div>
                        <div>
                            <Typography component="h3" variant="h3" className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Calibration & Thresholds</Typography>
                            <InfoRow label="Installation Date" value={sensor.installationDate} />
                            <InfoRow label="Last Calibration" value={sensor.calibrationDate} />
                            <InfoRow label="Next Calibration" value={sensor.nextCalibrationDate} />
                            <InfoRow label="Min Reading" value={sensor.minReading != null ? `${Number(sensor.minReading).toFixed(2)} ${sensor.sensorType?.unit || ''}` : null} />
                            <InfoRow label="Max Reading" value={sensor.maxReading != null ? `${Number(sensor.maxReading).toFixed(2)} ${sensor.sensorType?.unit || ''}` : null} />
                            <InfoRow label="Warning Threshold" value={sensor.warningThreshold != null ? `${Number(sensor.warningThreshold).toFixed(2)} ${sensor.sensorType?.unit || ''}` : null} />
                            <InfoRow label="Critical Threshold" value={sensor.criticalThreshold != null ? `${Number(sensor.criticalThreshold).toFixed(2)} ${sensor.sensorType?.unit || ''}` : null} />
                            <InfoRow label="Unit" value={sensor.sensorType?.unit} />
                            <InfoRow label="Dam" value={sensor.damName} />
                            <InfoRow label="Last Reading At" value={sensor.lastReadingAt ? new Date(sensor.lastReadingAt).toLocaleString() : null} />
                        </div>
                    </div>
                )}

                {/* ── Chart Tab ────────────────────────────────────────── */}
                {activeTab === 'chart' && (
                    <div className="p-5 space-y-4">
                        {/* Range picker */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 mr-1">Range:</span>
                            {[{ label: 'Last 24h', v: '24h' }, { label: 'Last 7 days', v: '7d' }, { label: 'All data', v: 'all' }].map(({ label, v }) => (
                                <AppButton key={v} onClick={() => setChartRange(v)}
                                    className={`px-3 py-1 text-xs font-medium rounded-full border transition ${chartRange === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                                    {label}
                                </AppButton>
                            ))}
                        </div>

                        {chartLoading ? (
                            <div className="h-72 flex items-center justify-center text-sm text-gray-400">
                                <span className="animate-pulse">Loading chart…</span>
                            </div>
                        ) : chartData.length === 0 ? (
                            <div className="h-72 flex flex-col items-center justify-center gap-2 text-sm text-gray-400">
                                <span className="text-3xl"><SymbolIcon name="chart" /></span>
                                <p>No readings in selected range</p>
                                <AppButton onClick={() => setLogOpen(true)} className="underline">Log a manual reading</AppButton>
                            </div>
                        ) : (
                            <ResponsiveContainer initialDimension={{ width: 300, height: 220 }} minWidth={0} width="100%" height={320}>
                                <LineChart data={chartData} margin={{ top: 8, right: 20, bottom: 20, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="time"
                                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                                        tickFormatter={t => {
                                            const d = new Date(t);
                                            return chartRange === '7d' || chartRange === 'all'
                                                ? d.toLocaleDateString([], { month: 'short', day: 'numeric' })
                                                : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        }}
                                        interval="preserveStartEnd"
                                        minTickGap={40}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                                        tickFormatter={v => v.toFixed(1)}
                                        domain={['auto', 'auto']}
                                        unit={` ${sensor.sensorType?.unit || ''}`}
                                        width={60}
                                    />
                                    <Tooltip
                                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}
                                        formatter={(v, _n, props) => [
                                            `${Number(v).toFixed(3)} ${sensor.sensorType?.unit || ''}`,
                                            `Reading (${props.payload?.quality || 'good'})`
                                        ]}
                                        labelFormatter={t => new Date(t).toLocaleString()}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    {/* Warning threshold */}
                                    {sensor.warningThreshold != null && (
                                        <ReferenceLine
                                            y={Number(sensor.warningThreshold)}
                                            stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1.5}
                                            label={{ value: `Warning (${Number(sensor.warningThreshold).toFixed(1)})`, position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }}
                                        />
                                    )}
                                    {/* Critical threshold */}
                                    {sensor.criticalThreshold != null && (
                                        <ReferenceLine
                                            y={Number(sensor.criticalThreshold)}
                                            stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1.5}
                                            label={{ value: `Critical (${Number(sensor.criticalThreshold).toFixed(1)})`, position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }}
                                        />
                                    )}
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        name={sensor.sensorType?.name || 'Reading'}
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        dot={{ r: 2, fill: '#3b82f6', strokeWidth: 0 }}
                                        activeDot={{ r: 5 }}
                                        connectNulls
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                        <p className="text-[11px] text-gray-400 text-right">{chartData.length} data points · API returns newest-first, chart shows oldest→newest</p>
                    </div>
                )}

                {/* ── Readings Tab ─────────────────────────────────────── */}
                {activeTab === 'readings' && (
                    <div className="p-5">
                        {readLoading ? (
                            <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10" />)}</div>
                        ) : readings.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-sm text-gray-400">No readings recorded yet</p>
                                <AppButton onClick={() => setLogOpen(true)} className="mt-3 underline">Log a manual reading</AppButton>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <Table className="w-full text-sm">
                                        <TableHead>
                                            <TableRow className="bg-gray-50 border-b border-gray-100 text-left">
                                                {['Value', 'Unit', 'Quality', 'Recorded At', 'Received At'].map(h => (
                                                    <TableCell component="th" key={h} className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{h}</TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody className="divide-y divide-gray-50">
                                            {readings.map(r => (
                                                <TableRow key={r.id} className="hover:bg-gray-50/50">
                                                    <TableCell className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">
                                                        {Number(r.readingValue).toFixed(3)}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 text-xs text-gray-500">{r.unit || sensor.sensorType?.unit || '—'}</TableCell>
                                                    <TableCell className="px-4 py-3">
                                                        <span className={`text-xs font-medium capitalize ${qualityStyle[r.quality?.toLowerCase()] || 'text-gray-600'}`}>
                                                            {r.quality || '—'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 text-xs text-gray-600">
                                                        {r.recordedAt ? new Date(r.recordedAt).toLocaleString() : '—'}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 text-xs text-gray-400">
                                                        {r.receivedAt ? new Date(r.receivedAt).toLocaleString() : '—'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                {readTotalPages > 1 && (
                                    <div className="flex items-center justify-between mt-4">
                                        <p className="text-xs text-gray-500">Page {readPage + 1} of {readTotalPages} · {readTotal} readings</p>
                                        <div className="flex gap-1">
                                            <AppButton variant="outlined" disabled={readPage === 0} onClick={() => loadReadings(readPage - 1)}
                                                className="disabled:opacity-40">← Prev</AppButton>
                                            <AppButton variant="outlined" disabled={readPage + 1 >= readTotalPages} onClick={() => loadReadings(readPage + 1)}
                                                className="disabled:opacity-40">Next →</AppButton>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </Paper>

            {/* Modals */}
            {editOpen && <EditModal sensor={sensor} dams={dams} onClose={() => setEditOpen(false)} onUpdated={setSensor} />}
            {logOpen && <LogReadingModal sensor={sensor} onClose={() => setLogOpen(false)} onLogged={r => { setLatest(r); if (activeTab === 'readings') setReadings(p => [r, ...p]); }} />}
        </div>
    );
}
