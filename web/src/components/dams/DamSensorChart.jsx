import { useEffect, useRef, useState } from 'react';
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import { getSensorsByDam, getSensorReadings } from '../../services/sensor.service';

// Distinct colors for up to 10 sensor lines
const LINE_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
    '#ec4899', '#6366f1',
];

const RANGES = [
    { label: '6h', hours: 6 },
    { label: '24h', hours: 24 },
    { label: '7d', hours: 168 },
    { label: 'All', hours: null },
];

/**
 * DamSensorChart
 * Shows all sensors for a dam on one multi-line Recharts chart.
 * Y-axis is normalised to 0–100% of each sensor's [minReading, maxReading] range
 * so sensors with different units overlap nicely.
 * The tooltip shows the ACTUAL value + unit for each sensor.
 *
 * Props:
 *   damId – numeric
 */
export default function DamSensorChart({ damId }) {
    const [sensors, setSensors] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [range, setRange] = useState('24h');
    const [hiddenKeys, setHiddenKeys] = useState(new Set());
    const metaRef = useRef({}); // sensorId → { name, unit, min, max, warningThreshold, criticalThreshold }

    // Normalise a raw value to 0–100% within [min, max]
    const normalize = (val, min, max) => {
        if (max == null || min == null || max === min) return null;
        return Math.round(((val - min) / (max - min)) * 1000) / 10; // one decimal
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(false);
            try {
                const sensorList = await getSensorsByDam(damId);
                setSensors(sensorList || []);
                if (!sensorList?.length) { setLoading(false); return; }

                // Build sensor metadata map
                const meta = {};
                sensorList.forEach(s => {
                    meta[s.id] = {
                        name: s.name,
                        uid: s.sensorUid,
                        unit: s.sensorType?.unit || '',
                        min: Number(s.minReading ?? 0),
                        max: Number(s.maxReading ?? 100),
                        warning: s.warningThreshold != null ? normalize(Number(s.warningThreshold), Number(s.minReading ?? 0), Number(s.maxReading ?? 100)) : null,
                        critical: s.criticalThreshold != null ? normalize(Number(s.criticalThreshold), Number(s.minReading ?? 0), Number(s.maxReading ?? 100)) : null,
                    };
                });
                metaRef.current = meta;

                // Fetch up to 200 readings per sensor in parallel
                const results = await Promise.allSettled(
                    sensorList.map(s => getSensorReadings(s.id, 0, 200))
                );

                // Build a time-keyed map: { ISO-time → { s1: normPct, s2: normPct, ... } }
                const timeMap = new Map();

                results.forEach((res, idx) => {
                    if (res.status !== 'fulfilled') return;
                    const sId = sensorList[idx].id;
                    const m = meta[sId];
                    const rows = (res.value?.content ?? []).slice().reverse(); // oldest first
                    rows.forEach(r => {
                        // Round to nearest 5-min bucket to co-locate close readings
                        const ts = new Date(r.recordedAt);
                        const bucketMs = Math.round(ts.getTime() / (5 * 60 * 1000)) * (5 * 60 * 1000);
                        const key = new Date(bucketMs).toISOString();
                        if (!timeMap.has(key)) timeMap.set(key, { time: r.recordedAt });
                        const entry = timeMap.get(key);
                        entry[`s${sId}_pct`] = normalize(Number(r.readingValue), m.min, m.max);
                        entry[`s${sId}_raw`] = Number(r.readingValue);
                    });
                });

                // Sort time series and apply range filter
                const hourMs = 3600000;
                const rangeHours = RANGES.find(r => r.label === range)?.hours;
                const cutoff = rangeHours ? Date.now() - rangeHours * hourMs : 0;

                const sorted = [...timeMap.values()]
                    .sort((a, b) => new Date(a.time) - new Date(b.time))
                    .filter(pt => new Date(pt.time).getTime() >= cutoff);

                setChartData(sorted);
            } catch {
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [damId, range]);

    const toggleSensor = (key) => {
        setHiddenKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    // --- Custom Tooltip ---
    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        const time = label ? new Date(label).toLocaleString() : '';
        return (
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs max-w-xs">
                <p className="text-gray-500 mb-2 font-medium">{time}</p>
                {payload.map(p => {
                    if (p.value == null) return null;
                    const sIdStr = p.dataKey; // e.g. "s3_pct"
                    const sId = parseInt(sIdStr.replace('s', '').replace('_pct', ''));
                    const entry = p.payload;
                    const raw = entry[`s${sId}_raw`];
                    const m = metaRef.current[sId];
                    return (
                        <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
                            <span style={{ width: 8, height: 8, borderRadius: 4, background: p.color, display: 'inline-block' }} />
                            <span className="text-gray-600">{m?.name ?? `Sensor ${sId}`}:</span>
                            <span className="font-semibold text-gray-900">
                                {raw != null ? `${Number(raw).toFixed(2)} ${m?.unit ?? ''}` : '—'}
                            </span>
                            <span className="text-gray-400">({Number(p.value).toFixed(1)}%)</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) return (
        <div className="p-6 flex items-center justify-center h-64">
            <span className="text-sm text-gray-400 animate-pulse">Loading sensor data…</span>
        </div>
    );
    if (error) return (
        <div className="p-6 text-center text-sm text-gray-400">Failed to load sensor data</div>
    );
    if (!sensors.length) return (
        <div className="p-6 text-center text-sm text-gray-400">
            No sensors registered for this dam
        </div>
    );

    return (
        <div className="p-5 space-y-4">
            {/* Controls row */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <p className="text-xs font-semibold text-gray-700">All Sensors — Normalised Reading (% of sensor range)</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                        {sensors.length} sensor{sensors.length !== 1 ? 's' : ''} · {chartData.length} data points
                    </p>
                </div>
                {/* Range picker */}
                <div className="flex items-center gap-1.5">
                    {RANGES.map(({ label }) => (
                        <button key={label} onClick={() => setRange(label)}
                            className={`px-3 py-1 text-xs font-medium rounded-full border transition
                                ${range === label ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Sensor toggle pills */}
            <div className="flex flex-wrap gap-2">
                {sensors.map((s, idx) => {
                    const key = `s${s.id}_pct`;
                    const hidden = hiddenKeys.has(key);
                    return (
                        <button key={s.id} onClick={() => toggleSensor(key)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition
                                ${hidden ? 'bg-gray-50 text-gray-400 border-gray-200 opacity-60' : 'bg-white text-gray-700 border-gray-300'}`}>
                            <span style={{ width: 8, height: 8, borderRadius: 4, background: hidden ? '#d1d5db' : LINE_COLORS[idx % LINE_COLORS.length], display: 'inline-block' }} />
                            {s.name}
                            <span className="text-gray-400">({s.sensorType?.unit || '?'})</span>
                        </button>
                    );
                })}
            </div>

            {/* Chart */}
            {chartData.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center gap-2 text-gray-400">
                    <span className="text-3xl">📉</span>
                    <p className="text-sm">No readings in selected range</p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={340}>
                    <LineChart data={chartData} margin={{ top: 8, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                            dataKey="time"
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            tickFormatter={t => {
                                const d = new Date(t);
                                return range === '7d' || range === 'All'
                                    ? d.toLocaleDateString([], { month: 'short', day: 'numeric' })
                                    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            }}
                            interval="preserveStartEnd"
                            minTickGap={50}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            tickFormatter={v => `${v}%`}
                            domain={[0, 100]}
                            width={45}
                            label={{ value: '% of range', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#9ca3af' }, offset: 10 }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            formatter={(value) => {
                                const sId = parseInt(value.replace('s', '').replace('_pct', ''));
                                return metaRef.current[sId]?.name || value;
                            }}
                            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                        />
                        {/* Warning threshold at 80% — rough visual guide */}
                        <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1}
                            label={{ value: 'Warning zone', position: 'insideTopRight', fontSize: 9, fill: '#f59e0b' }} />
                        <ReferenceLine y={95} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1}
                            label={{ value: 'Critical zone', position: 'insideTopRight', fontSize: 9, fill: '#ef4444' }} />

                        {sensors.map((s, idx) => {
                            const key = `s${s.id}_pct`;
                            return (
                                <Line
                                    key={s.id}
                                    type="monotone"
                                    dataKey={key}
                                    name={key}
                                    stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4 }}
                                    connectNulls
                                    hide={hiddenKeys.has(key)}
                                    isAnimationActive={false}
                                />
                            );
                        })}
                    </LineChart>
                </ResponsiveContainer>
            )}

            {/* Per-sensor stat bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                {sensors.map((s, idx) => {
                    const m = metaRef.current[s.id];
                    return (
                        <div key={s.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <div className="flex items-center gap-1.5 mb-1">
                                <span style={{ width: 8, height: 8, borderRadius: 4, background: LINE_COLORS[idx % LINE_COLORS.length], display: 'inline-block' }} />
                                <p className="text-[11px] font-semibold text-gray-700 truncate">{s.name}</p>
                            </div>
                            <p className="text-[10px] text-gray-400">{s.sensorType?.name ?? '—'} · {m?.unit || '—'}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{s.sensorUid}</p>
                            <div className="flex items-center gap-1 mt-1.5">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${(s.status || '').toLowerCase() === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        (s.status || '').toLowerCase() === 'faulty' ? 'bg-red-50 text-red-600 border-red-200' :
                                            'bg-gray-50 text-gray-500 border-gray-200'
                                    }`}>{s.status}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="text-[11px] text-gray-400 text-right">
                Values normalised to % of each sensor's configured min/max range — hover for actual readings
            </p>
        </div>
    );
}
