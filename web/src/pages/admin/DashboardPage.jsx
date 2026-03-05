import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend,
} from 'recharts';
import { getDamStatistics, getAllDamStatuses, getHighRiskDamStatuses, getAllDamsList } from '../../services/dam.service';
import { getSensorsByStatus } from '../../services/sensor.service';
import { getCurrentUser, getUserStats } from '../../services/user.service';
import { getAlertAnalytics, getAllActiveAlerts, getAllAlerts } from '../../services/alertService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hazardColor = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'CRITICAL' || s === 'EXTREME' || s === 'EXTREME_DANGER') return { dot: 'bg-red-500', bar: 'bg-red-500', badge: 'bg-red-50 text-red-600 border-red-200', hex: '#ef4444' };
    if (s === 'HIGH' || s === 'DANGER') return { dot: 'bg-orange-500', bar: 'bg-orange-400', badge: 'bg-orange-50 text-orange-600 border-orange-200', hex: '#f97316' };
    if (s === 'MEDIUM' || s === 'WARNING' || s === 'WATCH') return { dot: 'bg-amber-400', bar: 'bg-amber-400', badge: 'bg-amber-50 text-amber-600 border-amber-200', hex: '#f59e0b' };
    return { dot: 'bg-emerald-500', bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', hex: '#10b981' };
};

const sevColor = (sev) => {
    const s = (sev || '').toLowerCase();
    if (s === 'emergency') return { bg: 'bg-red-50 border-red-200', text: 'text-red-700', dot: 'bg-red-500' };
    if (s === 'critical') return { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' };
    if (s === 'warning') return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' };
    return { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-600', dot: 'bg-blue-500' };
};

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

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
                <div className={`h-full rounded-full ${bar} transition-all duration-500`} style={{ width: `${safe}%` }} />
            </div>
            <span className="text-xs font-medium text-gray-600 w-8 text-right">{safe.toFixed(0)}%</span>
        </div>
    );
}

function Skeleton({ className }) {
    return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

const PIE_COLORS = ['#10b981', '#94a3b8', '#ef4444', '#f59e0b'];
const ALERT_PIE_COLORS = ['#3b82f6', '#10b981', '#f97316', '#ef4444', '#94a3b8', '#8b5cf6'];

// Custom recharts tooltip
function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
            {label && <p className="font-semibold text-gray-700 mb-1">{label}</p>}
            {payload.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
                    <span className="text-gray-500">{p.name}:</span>
                    <span className="font-semibold text-gray-800">{p.value}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const navigate = useNavigate();

    const [damStats, setDamStats] = useState(null);
    const [damStatuses, setDamStatuses] = useState([]);
    const [highRisk, setHighRisk] = useState([]);
    const [allDams, setAllDams] = useState([]);
    const [sensors, setSensors] = useState({ active: 0, inactive: 0, faulty: 0, maintenance: 0 });
    const [user, setUser] = useState(null);
    const [userStats, setUserStats] = useState(null);
    const [alertAnalytics, setAlertAnalytics] = useState(null);
    const [recentAlerts, setRecentAlerts] = useState([]);
    const [allAlertsList, setAllAlertsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const results = await Promise.allSettled([
                    getDamStatistics(),
                    getAllDamStatuses(),
                    getHighRiskDamStatuses(),
                    getAllDamsList(),
                    getCurrentUser(),
                    getUserStats(),
                    getAlertAnalytics(),
                    getAllActiveAlerts(),
                    getAllAlerts(),
                    getSensorsByStatus('active'),
                    getSensorsByStatus('inactive'),
                    getSensorsByStatus('faulty'),
                    getSensorsByStatus('maintenance'),
                ]);
                if (cancelled) return;

                const [damStatsR, damStatusesR, highRiskR, allDamsR, userR, userStatsR, alertAnalR, activeAlertsR, allAlertsR, activeS, inactiveS, faultyS, maintS] = results;

                if (damStatsR.status === 'fulfilled') setDamStats(damStatsR.value);
                if (damStatusesR.status === 'fulfilled') setDamStatuses(damStatusesR.value || []);
                if (highRiskR.status === 'fulfilled') setHighRisk(highRiskR.value || []);
                if (allDamsR.status === 'fulfilled') setAllDams(allDamsR.value || []);
                if (userR.status === 'fulfilled') setUser(userR.value);
                if (userStatsR.status === 'fulfilled') setUserStats(userStatsR.value);
                if (alertAnalR.status === 'fulfilled') setAlertAnalytics(alertAnalR.value);
                if (activeAlertsR.status === 'fulfilled') setRecentAlerts(activeAlertsR.value || []);
                if (allAlertsR.status === 'fulfilled') setAllAlertsList(allAlertsR.value || []);

                setSensors({
                    active: activeS.status === 'fulfilled' ? (activeS.value?.length ?? 0) : 0,
                    inactive: inactiveS.status === 'fulfilled' ? (inactiveS.value?.length ?? 0) : 0,
                    faulty: faultyS.status === 'fulfilled' ? (faultyS.value?.length ?? 0) : 0,
                    maintenance: maintS.status === 'fulfilled' ? (maintS.value?.length ?? 0) : 0,
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
    const greeting = getGreeting();

    // ── Derived chart data ──────────────────────────────────────────────────────

    // Sensor donut
    const sensorPieData = [
        { name: 'Active', value: sensors.active },
        { name: 'Inactive', value: sensors.inactive },
        { name: 'Faulty', value: sensors.faulty },
        { name: 'Maintenance', value: sensors.maintenance },
    ].filter(d => d.value > 0);

    // Water level bar chart — top 10 dams by water %
    const waterLevelData = [...damStatuses]
        .sort((a, b) => (b.waterLevelPercentage ?? 0) - (a.waterLevelPercentage ?? 0))
        .slice(0, 10)
        .map(d => ({
            name: (d.damName || '').length > 12 ? (d.damName || '').slice(0, 12) + '…' : d.damName,
            water: Number((d.waterLevelPercentage ?? 0).toFixed(1)),
            fill: hazardColor(d.hazardStatus).hex,
        }));

    // Alert severity distribution
    const alertSevCounts = allAlertsList.reduce((acc, a) => {
        const sev = (a.severity || 'info').toLowerCase();
        acc[sev] = (acc[sev] || 0) + 1;
        return acc;
    }, {});
    const alertSevData = Object.entries(alertSevCounts).map(([name, value]) => ({ name, value }));

    // Alert status distribution
    const alertStatusCounts = allAlertsList.reduce((acc, a) => {
        const st = (a.status || 'draft').toLowerCase();
        acc[st] = (acc[st] || 0) + 1;
        return acc;
    }, {});
    const alertStatusData = Object.entries(alertStatusCounts).map(([name, value]) => ({ name, value }));

    // Alerts over time (group by date, last 14 days)
    const alertTimeData = (() => {
        const map = {};
        const now = new Date();
        for (let i = 13; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            map[key] = { date: key, alerts: 0 };
        }
        allAlertsList.forEach(a => {
            if (!a.createdAt) return;
            const key = new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (map[key]) map[key].alerts++;
        });
        return Object.values(map);
    })();

    // Hazard distribution across dams
    const hazardDistribution = allDams.reduce((acc, d) => {
        const h = (d.overallHazardStatus || 'SAFE').toUpperCase();
        acc[h] = (acc[h] || 0) + 1;
        return acc;
    }, {});
    const hazardPieData = Object.entries(hazardDistribution).map(([name, value]) => ({
        name: name.replace('_', ' '),
        value,
        fill: hazardColor(name).hex,
    }));

    // ── Stat Cards ──────────────────────────────────────────────────────────────

    const STATS = [
        {
            label: 'Total Dams', value: loading ? '—' : (damStats?.totalDams ?? allDams.length ?? 0),
            sub: loading ? '' : `${damStats?.activeDams ?? 0} operational`,
            icon: '🏗️', color: 'bg-blue-50 text-blue-600', ring: 'ring-blue-100',
            onClick: () => navigate('/admin/dams'),
        },
        {
            label: 'Active Alerts', value: loading ? '—' : (alertAnalytics?.totalActive ?? recentAlerts.length),
            sub: loading ? '' : `${alertAnalytics?.totalResolved ?? 0} resolved`,
            icon: '🚨', color: 'bg-red-50 text-red-600', ring: 'ring-red-100',
            onClick: () => navigate('/admin/alerts'),
        },
        {
            label: 'Total Sensors', value: loading ? '—' : totalSensors,
            sub: loading ? '' : `${sensors.active} online`,
            icon: '📡', color: 'bg-violet-50 text-violet-600', ring: 'ring-violet-100',
            onClick: () => navigate('/admin/sensors'),
        },
        {
            label: 'High-Risk Dams', value: loading ? '—' : highRisk.length,
            sub: loading ? '' : (highRisk.length === 0 ? 'All clear' : `${highRisk.length} need attention`),
            icon: '⚠️',
            color: highRisk.length > 0 ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600',
            ring: highRisk.length > 0 ? 'ring-orange-100' : 'ring-emerald-100',
        },
        {
            label: 'Total Users', value: loading ? '—' : (
                userStats ? (userStats.totalActive + (userStats.totalInactive || 0) + (userStats.totalSuspended || 0) + (userStats.totalPending || 0)) : '—'
            ),
            sub: loading ? '' : `${userStats?.totalActive ?? 0} active`,
            icon: '👥', color: 'bg-cyan-50 text-cyan-600', ring: 'ring-cyan-100',
            onClick: () => navigate('/admin/users'),
        },
        {
            label: 'Faulty Sensors', value: loading ? '—' : (sensors.faulty + sensors.maintenance),
            sub: loading ? '' : `${sensors.faulty} faulty · ${sensors.maintenance} maint.`,
            icon: '🔧',
            color: (sensors.faulty > 0) ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600',
            ring: (sensors.faulty > 0) ? 'ring-red-100' : 'ring-emerald-100',
            onClick: () => navigate('/admin/sensors'),
        },
    ];

    return (
        <div className="space-y-6">
            {/* ── Header ────────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">
                        {greeting}{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''} 👋
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5">{today} · Dam Disaster Alert System</p>
                </div>
                <div className="flex items-center gap-2">
                    {error && (
                        <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">⚠ {error}</span>
                    )}
                    <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        System live
                    </span>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-1.5 text-sm text-gray-600 bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium"
                    >
                        ↻ Refresh
                    </button>
                </div>
            </div>

            {/* ── Stat Cards (6 cards, 3×2 on lg) ──────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {STATS.map(({ label, value, sub, icon, color, ring, onClick }) => (
                    <button key={label} onClick={onClick}
                        className={`bg-white border border-gray-200/80 rounded-xl p-4 shadow-sm hover:shadow-md hover:ring-2 ${ring} transition-all text-left w-full group`}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center text-base group-hover:scale-110 transition-transform`}>{icon}</span>
                        </div>
                        {loading
                            ? <Skeleton className="w-14 h-7 mb-1" />
                            : <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
                        }
                        <p className="text-[11px] font-medium text-gray-500 mt-0.5">{label}</p>
                        {!loading && sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
                    </button>
                ))}
            </div>

            {/* ── Row 1: Alerts Over Time + Alert Severity + Alert Status ──────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Alert trend - area chart */}
                <div className="lg:col-span-2 bg-white border border-gray-200/80 rounded-xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-800">Alert Activity</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Alerts created in the last 14 days</p>
                        </div>
                        <span className="text-xs text-gray-400">{allAlertsList.length} total</span>
                    </div>
                    {loading ? (
                        <Skeleton className="h-52 w-full" />
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={alertTimeData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip content={<ChartTooltip />} />
                                <Area type="monotone" dataKey="alerts" stroke="#3b82f6" strokeWidth={2} fill="url(#alertGrad)" name="Alerts" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Alert severity breakdown - pie */}
                <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-gray-800 mb-1">Alert Severity</h2>
                    <p className="text-xs text-gray-400 mb-3">Distribution across all alerts</p>
                    {loading ? (
                        <Skeleton className="h-48 w-full" />
                    ) : alertSevData.length === 0 ? (
                        <div className="flex items-center justify-center h-48 text-sm text-gray-400">No alerts yet</div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <ResponsiveContainer width="55%" height={180}>
                                <PieChart>
                                    <Pie data={alertSevData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}
                                        dataKey="value" stroke="none">
                                        {alertSevData.map((_, i) => (
                                            <Cell key={i} fill={['#3b82f6', '#f59e0b', '#f97316', '#ef4444'][i % 4]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<ChartTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 space-y-2">
                                {alertSevData.map((d, i) => (
                                    <div key={d.name} className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: ['#3b82f6', '#f59e0b', '#f97316', '#ef4444'][i % 4] }} />
                                        <span className="text-xs text-gray-600 capitalize flex-1">{d.name}</span>
                                        <span className="text-xs font-semibold text-gray-800">{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Row 2: Water Levels Bar Chart + Hazard Distribution ──────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Water levels bar chart — 3 cols */}
                <div className="lg:col-span-3 bg-white border border-gray-200/80 rounded-xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-800">Water Levels</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Top 10 dams by current water level %</p>
                        </div>
                        <button onClick={() => navigate('/admin/dams')} className="text-xs text-blue-600 font-medium hover:underline">
                            All dams →
                        </button>
                    </div>
                    {loading ? (
                        <Skeleton className="h-56 w-full" />
                    ) : waterLevelData.length === 0 ? (
                        <div className="flex items-center justify-center h-56 text-sm text-gray-400">No water level data</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={waterLevelData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="water" name="Water %" radius={[4, 4, 0, 0]} maxBarSize={32}>
                                    {waterLevelData.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Dam Hazard Distribution — 2 cols */}
                <div className="lg:col-span-2 bg-white border border-gray-200/80 rounded-xl shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-gray-800 mb-1">Dam Hazard Status</h2>
                    <p className="text-xs text-gray-400 mb-3">Overall hazard distribution across {allDams.length} dams</p>
                    {loading ? (
                        <Skeleton className="h-48 w-full" />
                    ) : hazardPieData.length === 0 ? (
                        <div className="flex items-center justify-center h-48 text-sm text-gray-400">No dams registered</div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <ResponsiveContainer width="55%" height={180}>
                                <PieChart>
                                    <Pie data={hazardPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                                        paddingAngle={3} dataKey="value" stroke="none">
                                        {hazardPieData.map((entry, i) => (
                                            <Cell key={i} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<ChartTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 space-y-2">
                                {hazardPieData.map((d) => (
                                    <div key={d.name} className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                                        <span className="text-xs text-gray-600 capitalize flex-1">{d.name.toLowerCase()}</span>
                                        <span className="text-xs font-semibold text-gray-800">{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Row 3: High-Risk Dams + Sensor Health Donut + Active Alerts ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* High-Risk Dams */}
                <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-800">High-Risk Dams</h2>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${highRisk.length > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {highRisk.length} flagged
                        </span>
                    </div>
                    {loading ? (
                        <div className="p-5 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>
                    ) : highRisk.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                            <span className="text-3xl mb-2">✅</span>
                            <p className="text-sm font-medium text-gray-700">All dams within safe limits</p>
                            <p className="text-xs text-gray-400 mt-1">No high-risk status detected</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                            {highRisk.slice(0, 8).map((dam) => {
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
                                                        <> · Rain: <span className="font-medium">{Number(dam.rainfallLast24hrMm).toFixed(1)}mm</span></>
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

                {/* Sensor Fleet Health — donut */}
                <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-gray-800 mb-1">Sensor Fleet</h2>
                    <p className="text-xs text-gray-400 mb-3">{totalSensors} sensors monitored</p>
                    {loading ? (
                        <Skeleton className="h-48 w-full" />
                    ) : totalSensors === 0 ? (
                        <div className="flex items-center justify-center h-48 text-sm text-gray-400">No sensors</div>
                    ) : (
                        <>
                            <div className="flex items-center gap-4">
                                <ResponsiveContainer width="55%" height={160}>
                                    <PieChart>
                                        <Pie data={sensorPieData} cx="50%" cy="50%" innerRadius={38} outerRadius={62}
                                            paddingAngle={4} dataKey="value" stroke="none">
                                            {sensorPieData.map((_, i) => (
                                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex-1 space-y-2">
                                    {[
                                        { label: 'Active', count: sensors.active, color: PIE_COLORS[0] },
                                        { label: 'Inactive', count: sensors.inactive, color: PIE_COLORS[1] },
                                        { label: 'Faulty', count: sensors.faulty, color: PIE_COLORS[2] },
                                        { label: 'Maintenance', count: sensors.maintenance, color: PIE_COLORS[3] },
                                    ].map(({ label, count, color }) => (
                                        <div key={label} className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                                            <span className="text-xs text-gray-600 flex-1">{label}</span>
                                            <span className="text-xs font-semibold text-gray-800">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Online rate */}
                            <div className="mt-4 pt-3 border-t border-gray-100">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500">Online rate</span>
                                    <span className={`font-bold ${sensors.active / totalSensors >= 0.8 ? 'text-emerald-600' : 'text-orange-600'}`}>
                                        {((sensors.active / totalSensors) * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                        style={{ width: `${(sensors.active / totalSensors) * 100}%` }} />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Active Alerts Feed */}
                <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-800">Active Alerts</h2>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${recentAlerts.length > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {recentAlerts.length} live
                        </span>
                    </div>
                    {loading ? (
                        <div className="p-5 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}</div>
                    ) : recentAlerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                            <span className="text-3xl mb-2">🔔</span>
                            <p className="text-sm font-medium text-gray-700">No active alerts</p>
                            <p className="text-xs text-gray-400 mt-1">All systems operating normally</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                            {recentAlerts.slice(0, 8).map(alert => {
                                const { bg, text, dot } = sevColor(alert.severity);
                                return (
                                    <li key={alert.id} className="px-5 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer"
                                        onClick={() => navigate('/admin/alerts')}>
                                        <div className="flex items-start gap-3">
                                            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dot}`} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-semibold text-gray-800 truncate">{alert.title}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    {alert.severity} · {timeAgo(alert.createdAt)}
                                                    {alert.damId && <> · Dam #{alert.damId}</>}
                                                </p>
                                            </div>
                                            <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold capitalize ${bg} ${text}`}>
                                                {alert.severity}
                                            </span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {recentAlerts.length > 0 && (
                        <div className="px-5 py-3 border-t border-gray-100">
                            <button onClick={() => navigate('/admin/alerts')} className="text-xs text-blue-600 font-medium hover:underline">
                                Manage all alerts →
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Row 4: All Dam Water Levels + Dam Registry ───────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Dam Water Levels — 2 cols */}
                <div className="lg:col-span-2 bg-white border border-gray-200/80 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-800">Live Water Levels</h2>
                        <span className="text-xs text-gray-400">{damStatuses.length} monitored</span>
                    </div>
                    {loading ? (
                        <div className="p-5 space-y-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8" />)}</div>
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

                {/* Dam Registry — 3 cols */}
                <div className="lg:col-span-3 bg-white border border-gray-200/80 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-800">Dam Registry</h2>
                        <button onClick={() => navigate('/admin/dams')} className="text-xs text-blue-600 font-medium hover:underline">
                            View all →
                        </button>
                    </div>
                    {loading ? (
                        <div className="p-5 space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10" />)}</div>
                    ) : allDams.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <p className="text-sm text-gray-400">No dams registered yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        {['Dam', 'Region', 'Type', 'Hazard', 'Status'].map(h => (
                                            <th key={h} className="px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {allDams.slice(0, 8).map((dam) => (
                                        <tr key={dam.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                                            onClick={() => navigate(`/admin/dams/${dam.id}`)}>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-gray-800 truncate max-w-[150px]">{dam.name}</p>
                                                <p className="text-[10px] text-gray-400">{dam.code}</p>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 truncate max-w-[110px]">{dam.regionName ?? '—'}</td>
                                            <td className="px-4 py-3 text-gray-500 capitalize">{(dam.damType ?? '').toLowerCase().replace('_', ' ')}</td>
                                            <td className="px-4 py-3"><Badge status={dam.overallHazardStatus} /></td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[11px] font-medium ${(dam.status ?? '').toUpperCase() === 'OPERATIONAL' ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                    {(dam.status ?? '—').replace('_', ' ')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Quick Actions ─────────────────────────────────────────────────── */}
            <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm p-5">
                <h2 className="text-sm font-semibold text-gray-800 mb-3">Quick Actions</h2>
                <div className="flex flex-wrap gap-2">
                    {[
                        { label: 'Manage Dams', icon: '🏗️', path: '/admin/dams' },
                        { label: 'View Sensors', icon: '📡', path: '/admin/sensors' },
                        { label: 'Alert Center', icon: '🚨', path: '/admin/alerts' },
                        { label: 'Manage Users', icon: '👥', path: '/admin/users' },
                        { label: 'News & Updates', icon: '📰', path: '/admin/news' },
                        { label: 'Regions', icon: '🗺️', path: '/admin/regions' },
                        { label: 'Roles & Permissions', icon: '🔐', path: '/admin/roles' },
                        { label: 'Map View', icon: '🌍', path: '/admin/map' },
                    ].map(({ label, icon, path }) => (
                        <button key={path} onClick={() => navigate(path)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all">
                            <span>{icon}</span> {label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
