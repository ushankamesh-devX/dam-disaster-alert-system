import { useEffect, useState } from 'react';
import { getDamStatistics, getAllDamStatuses, getHighRiskDamStatuses, getAllDamsList } from '../../services/dam.service';
import { getSensorsByStatus } from '../../services/sensor.service';
import { getCurrentUser } from '../../services/user.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hazardColor = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'CRITICAL' || s === 'EXTREME') return { dot: 'bg-red-500', bar: 'bg-red-500', badge: 'bg-red-50 text-red-600 border-red-200' };
    if (s === 'HIGH') return { dot: 'bg-orange-500', bar: 'bg-orange-400', badge: 'bg-orange-50 text-orange-600 border-orange-200' };
    if (s === 'MEDIUM') return { dot: 'bg-amber-400', bar: 'bg-amber-400', badge: 'bg-amber-50 text-amber-600 border-amber-200' };
    return { dot: 'bg-emerald-500', bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
};

function Badge({ status }) {
    const { badge } = hazardColor(status);
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold uppercase tracking-wide ${badge}`}>
            {status || 'normal'}
        </span>
    );
}

function WaterBar({ pct, status }) {
    const { bar } = hazardColor(status);
    const safe = Math.min(Math.max(Number(pct) || 0, 0), 100);
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${safe}%` }} />
            </div>
            <span className="text-xs font-medium text-gray-600 w-8 text-right">{safe.toFixed(0)}%</span>
        </div>
    );
}

function Skeleton({ className }) {
    return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const [damStats, setDamStats] = useState(null);
    const [damStatuses, setDamStatuses] = useState([]);
    const [highRisk, setHighRisk] = useState([]);
    const [allDams, setAllDams] = useState([]);
    const [sensors, setSensors] = useState({ active: 0, inactive: 0, faulty: 0, maintenance: 0 });
    const [userStats, setUserStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                // Parallel fetch all data needed for the dashboard
                const [damStatsRes, damStatusesRes, highRiskRes, allDamListRes, userStatsRes,
                    activeSens, inactiveSens, faultySens, maintSens] = await Promise.allSettled([
                        getDamStatistics(),         // { totalDams, activeDams }
                        getAllDamStatuses(),         // List<DamCurrentStatusResponse>
                        getHighRiskDamStatuses(),   // List<DamCurrentStatusResponse>
                        getAllDamsList(),            // List<DamListResponse>
                        getCurrentUser(),           // we use user.service for /users/me (user stats via UserController /users/stats below)
                        getSensorsByStatus('active'),       // array
                        getSensorsByStatus('inactive'),
                        getSensorsByStatus('faulty'),
                        getSensorsByStatus('maintenance'),
                    ]);

                if (cancelled) return;

                if (damStatsRes.status === 'fulfilled') setDamStats(damStatsRes.value);
                if (damStatusesRes.status === 'fulfilled') setDamStatuses(damStatusesRes.value || []);
                if (highRiskRes.status === 'fulfilled') setHighRisk(highRiskRes.value || []);
                if (allDamListRes.status === 'fulfilled') setAllDams(allDamListRes.value || []);

                // Aggregate sensor counts
                setSensors({
                    active: activeSens.status === 'fulfilled' ? (activeSens.value?.length ?? 0) : 0,
                    inactive: inactiveSens.status === 'fulfilled' ? (inactiveSens.value?.length ?? 0) : 0,
                    faulty: faultySens.status === 'fulfilled' ? (faultySens.value?.length ?? 0) : 0,
                    maintenance: maintSens.status === 'fulfilled' ? (maintSens.value?.length ?? 0) : 0,
                });
            } catch (e) {
                if (!cancelled) setError('Failed to load dashboard data.');
                console.error(e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    const totalSensors = sensors.active + sensors.inactive + sensors.faulty + sensors.maintenance;
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // ── Stat Cards ──────────────────────────────────────────────────────────────

    const STATS = [
        {
            label: 'Total Dams',
            value: loading ? '—' : (damStats?.totalDams ?? allDams.length ?? '—'),
            sub: loading ? '' : `${damStats?.activeDams ?? '—'} active`,
            up: true,
            color: 'text-blue-600', bg: 'bg-blue-50', icon: DamIcon,
        },
        {
            label: 'Active Sensors',
            value: loading ? '—' : sensors.active,
            sub: loading ? '' : `${sensors.inactive + sensors.faulty} offline/faulty`,
            up: (sensors.inactive + sensors.faulty) === 0,
            color: 'text-violet-600', bg: 'bg-violet-50', icon: SensorIcon,
        },
        {
            label: 'High-Risk Dams',
            value: loading ? '—' : highRisk.length,
            sub: loading ? '' : highRisk.length === 0 ? 'All systems normal' : `${highRisk.length} need attention`,
            up: highRisk.length === 0,
            color: highRisk.length > 0 ? 'text-red-500' : 'text-emerald-600',
            bg: highRisk.length > 0 ? 'bg-red-50' : 'bg-emerald-50',
            icon: AlertIcon,
        },
        {
            label: 'Total Sensors',
            value: loading ? '—' : totalSensors,
            sub: loading ? '' : `${sensors.maintenance} in maintenance`,
            up: sensors.maintenance === 0,
            color: 'text-emerald-600', bg: 'bg-emerald-50', icon: UsersIcon,
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-sm text-gray-400 mt-0.5">{today}</p>
                </div>
                <div className="flex items-center gap-2">
                    {error && (
                        <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
                            ⚠ {error}
                        </span>
                    )}
                    <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        System live
                    </span>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-1.5 text-sm text-gray-600 bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium"
                    >
                        <RefreshIcon className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {STATS.map(({ label, value, sub, up, color, bg, icon: Icon }) => (
                    <div key={label} className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                            <span className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                                <Icon className={`w-5 h-5 ${color}`} />
                            </span>
                            {loading ? (
                                <Skeleton className="w-16 h-4" />
                            ) : (
                                <span className={`flex items-center gap-1 text-xs font-medium ${up ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {up ? '↑' : '↓'} {sub}
                                </span>
                            )}
                        </div>
                        {loading
                            ? <Skeleton className="w-16 h-8 mb-1" />
                            : <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
                        }
                        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
                    </div>
                ))}
            </div>

            {/* Middle row: High-Risk Dams + All Dam Water Levels */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

                {/* High-Risk Panel — 2 cols */}
                <div className="lg:col-span-2 bg-white border border-gray-200/80 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-800">High-Risk Dams</h2>
                        <span className="text-xs text-gray-400">{highRisk.length} flagged</span>
                    </div>
                    {loading ? (
                        <div className="p-5 space-y-3">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
                        </div>
                    ) : highRisk.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                            <span className="text-3xl mb-2">✅</span>
                            <p className="text-sm font-medium text-gray-700">All dams are within safe limits</p>
                            <p className="text-xs text-gray-400 mt-1">No high-risk status detected</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-50">
                            {highRisk.slice(0, 6).map((dam) => {
                                const { dot } = hazardColor(dam.hazardStatus);
                                return (
                                    <li key={dam.id} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
                                        <div className="flex items-start gap-3">
                                            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dot}`} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-semibold text-gray-800 truncate">{dam.damName}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Water: <span className="font-medium">{Number(dam.waterLevelPercentage ?? 0).toFixed(1)}%</span>
                                                    {dam.rainfallLast24hrMm != null && (
                                                        <> · Rain 24h: <span className="font-medium">{Number(dam.rainfallLast24hrMm).toFixed(1)} mm</span></>
                                                    )}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    Gates open: {dam.gatesOpenCount ?? '—'}/{dam.totalGatesCount ?? '—'}
                                                    {dam.lastUpdated && (
                                                        <> · {new Date(dam.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                                                    )}
                                                </p>
                                            </div>
                                            <Badge status={dam.hazardStatus} />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* All Dam Water Levels — 3 cols */}
                <div className="lg:col-span-3 bg-white border border-gray-200/80 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-800">Dam Water Levels</h2>
                        <span className="text-xs text-gray-400">{damStatuses.length} monitored</span>
                    </div>
                    {loading ? (
                        <div className="p-5 space-y-4">
                            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8" />)}
                        </div>
                    ) : damStatuses.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <p className="text-sm text-gray-400">No dam status data available</p>
                        </div>
                    ) : (
                        <div className="p-5 space-y-4 max-h-80 overflow-y-auto">
                            {damStatuses.map((dam) => (
                                <div key={dam.id ?? dam.damId}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${hazardColor(dam.hazardStatus).dot}`} />
                                            <p className="text-xs font-medium text-gray-800 truncate">{dam.damName}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                            {dam.lastSensorReadingAt && (
                                                <span className="text-[10px] text-gray-400">
                                                    {new Date(dam.lastSensorReadingAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                            <Badge status={dam.hazardStatus} />
                                        </div>
                                    </div>
                                    <WaterBar pct={dam.waterLevelPercentage ?? dam.storagePercentage} status={dam.hazardStatus} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom row: Sensor Health + Dam List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Sensor Health — 1 col */}
                <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-gray-800 mb-4">Sensor Fleet Health</h2>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8" />)}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {[
                                { label: 'Active', count: sensors.active, color: 'bg-emerald-500', textColor: 'text-emerald-700' },
                                { label: 'Inactive', count: sensors.inactive, color: 'bg-gray-300', textColor: 'text-gray-500' },
                                { label: 'Faulty', count: sensors.faulty, color: 'bg-red-400', textColor: 'text-red-600' },
                                { label: 'Maintenance', count: sensors.maintenance, color: 'bg-amber-400', textColor: 'text-amber-600' },
                            ].map(({ label, count, color, textColor }) => {
                                const pct = totalSensors > 0 ? (count / totalSensors) * 100 : 0;
                                return (
                                    <div key={label}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-600 font-medium">{label}</span>
                                            <span className={`font-semibold ${textColor}`}>
                                                {count} <span className="text-gray-400 font-normal">({pct.toFixed(0)}%)</span>
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                        <span>Total sensors</span>
                        <span className="font-semibold text-gray-800">{totalSensors}</span>
                    </div>
                </div>

                {/* Dam Registry — 2 cols */}
                <div className="lg:col-span-2 bg-white border border-gray-200/80 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-800">Dam Registry</h2>
                        <span className="text-xs text-gray-400">{allDams.length} total</span>
                    </div>
                    {loading ? (
                        <div className="p-5 space-y-3">
                            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10" />)}
                        </div>
                    ) : allDams.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <p className="text-sm text-gray-400">No dams registered yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        <th className="px-5 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Dam</th>
                                        <th className="px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Region</th>
                                        <th className="px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Type</th>
                                        <th className="px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Hazard</th>
                                        <th className="px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {allDams.slice(0, 8).map((dam) => (
                                        <tr key={dam.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-5 py-3">
                                                <p className="font-medium text-gray-800 truncate max-w-[150px]">{dam.name}</p>
                                                <p className="text-[10px] text-gray-400">{dam.code}</p>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 truncate max-w-[110px]">{dam.regionName ?? '—'}</td>
                                            <td className="px-4 py-3 text-gray-500 capitalize">{(dam.damType ?? '').toLowerCase().replace('_', ' ')}</td>
                                            <td className="px-4 py-3"><Badge status={dam.overallHazardStatus} /></td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[11px] font-medium ${(dam.status ?? '').toUpperCase() === 'ACTIVE' ? 'text-emerald-600' : 'text-gray-400'
                                                    }`}>
                                                    {dam.status ?? '—'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {allDams.length > 8 && (
                                <div className="px-5 py-3 border-t border-gray-100">
                                    <button className="text-xs text-blue-600 font-medium hover:underline">
                                        View all {allDams.length} dams →
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function RefreshIcon({ className }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
}
function DamIcon({ className }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>;
}
function SensorIcon({ className }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>;
}
function AlertIcon({ className }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
}
function UsersIcon({ className }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>;
}
