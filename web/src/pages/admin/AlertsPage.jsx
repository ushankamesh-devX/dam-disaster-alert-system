import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Search, MapPin, BellRing, BellOff, Loader2, AlertTriangle,
    Clock, ShieldAlert, Radio, Volume2, Trash2, CheckCircle,
    ChevronRight, Map as MapIcon, Send, Plus, Filter,
    ChevronLeft, TrendingUp, Activity, Shield, RefreshCw,
    X, ArrowUp, Eye, SlidersHorizontal, BarChart3
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    getAlertById,
    getAllAlertsPaginated,
    getAllAlerts,
    createAlert,
    updateAlertStatus,
    resolveAlert,
    escalateAlert,
    deleteAlert,
    broadcastEmergency,
    getAlertTypes,
    getActiveAlertTypes,
    getAlertAnalytics,
} from '../../services/alertService';
import toast from 'react-hot-toast';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function ChangeView({ center }) {
    const map = useMap();
    if (center) map.setView(center, map.getZoom());
    return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_STYLES = {
    emergency: { badge: 'bg-red-100 text-red-700 border border-red-300', bar: 'bg-red-500', dot: 'bg-red-500' },
    critical:  { badge: 'bg-orange-100 text-orange-700 border border-orange-300', bar: 'bg-orange-500', dot: 'bg-orange-500' },
    warning:   { badge: 'bg-yellow-100 text-yellow-700 border border-yellow-300', bar: 'bg-yellow-400', dot: 'bg-yellow-400' },
    info:      { badge: 'bg-blue-100 text-blue-700 border border-blue-200', bar: 'bg-blue-400', dot: 'bg-blue-400' },
};

const STATUS_STYLES = {
    active:    'bg-emerald-100 text-emerald-700 border border-emerald-300',
    escalated: 'bg-red-100 text-red-700 border border-red-300',
    draft:     'bg-gray-100 text-gray-600 border border-gray-300',
    resolved:  'bg-slate-100 text-slate-600 border border-slate-300',
    expired:   'bg-purple-100 text-purple-700 border border-purple-300',
    cancelled: 'bg-gray-100 text-gray-400 border border-gray-200',
};

const getSeverityStyle = (sev) => SEVERITY_STYLES[(sev || '').toLowerCase()] || SEVERITY_STYLES.info;
const getStatusStyle   = (st)  => STATUS_STYLES[(st || '').toLowerCase()] || STATUS_STYLES.draft;

const fmtDate = (d) => d ? new Date(d).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—';

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, subLabel }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-2xl font-black text-gray-900">{value ?? '—'}</p>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
                {subLabel && <p className="text-[10px] text-gray-400 mt-0.5">{subLabel}</p>}
            </div>
        </div>
    );
}

function SeverityBadge({ severity }) {
    const s = getSeverityStyle(severity);
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.badge}`}>
            {severity}
        </span>
    );
}

function StatusBadge({ status }) {
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(status)}`}>
            {status}
        </span>
    );
}

// ─── Create Alert Modal ───────────────────────────────────────────────────────

function CreateAlertModal({ isOpen, onClose, onSuccess, alertTypes }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        alertTypeId: '',
        title: '', titleSi: '', titleTa: '',
        message: '', messageSi: '', messageTa: '',
        severity: 'warning',
        status: 'active',
        scope: 'regional',
        regionId: '',
        damId: '',
        simulationMode: false,
    });

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createAlert({
                ...formData,
                alertTypeId: Number(formData.alertTypeId),
                regionId: formData.regionId ? Number(formData.regionId) : null,
                damId: formData.damId ? Number(formData.damId) : null,
            });
            toast.success('Alert created and dispatched');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error('Failed to create alert');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Broadcast New Alert</h2>
                        <p className="text-sm text-gray-500">Target population with critical safety information.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-8">
                    {/* Basic Info Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Alert Type</label>
                            <select
                                required
                                value={formData.alertTypeId}
                                onChange={e => setFormData({...formData, alertTypeId: e.target.value})}
                                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            >
                                <option value="">Select Type...</option>
                                {alertTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Severity Override</label>
                            <select
                                value={formData.severity}
                                onChange={e => setFormData({...formData, severity: e.target.value})}
                                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            >
                                <option value="info">Info</option>
                                <option value="warning">Warning</option>
                                <option value="critical">Critical</option>
                                <option value="emergency">Emergency</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">System Protocol</label>
                            <div className="flex items-center gap-4 h-11">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.simulationMode} onChange={e => setFormData({...formData, simulationMode: e.target.checked})} className="w-4 h-4 rounded text-blue-600" />
                                    <span className="text-sm font-semibold text-gray-700">Drill / Simulation</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Multilingual Titles */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Title (EN)</label>
                            <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="Immediate Warning..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Title (SI)</label>
                            <input value={formData.titleSi} onChange={e => setFormData({...formData, titleSi: e.target.value})} className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="හදිසි අනතුරු ඇඟවීම..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Title (TA)</label>
                            <input value={formData.titleTa} onChange={e => setFormData({...formData, titleTa: e.target.value})} className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="உடனடி எச்சரிக்கை..." />
                        </div>
                    </div>

                    {/* Multilingual Messages */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Message (EN)</label>
                            <textarea required rows={3} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="Details of the disaster..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Message (SI)</label>
                            <textarea rows={3} value={formData.messageSi} onChange={e => setFormData({...formData, messageSi: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="විස්තරය..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Message (TA)</label>
                            <textarea rows={3} value={formData.messageTa} onChange={e => setFormData({...formData, messageTa: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="விளக்கம்..." />
                        </div>
                    </div>

                    {/* Scope Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-blue-600 uppercase tracking-widest">Target Scope</label>
                            <select
                                value={formData.scope}
                                onChange={e => setFormData({...formData, scope: e.target.value})}
                                className="w-full h-11 px-4 bg-white border border-blue-200 rounded-xl text-sm outline-none"
                            >
                                <option value="nationwide">Nationwide</option>
                                <option value="regional">Regional</option>
                                <option value="dam_specific">Dam Specific</option>
                                <option value="zone_specific">Zone Specific</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-blue-600 uppercase tracking-widest">Region ID (Optional)</label>
                            <input type="number" value={formData.regionId} onChange={e => setFormData({...formData, regionId: e.target.value})} className="w-full h-11 px-4 bg-white border border-blue-200 rounded-xl text-sm" placeholder="e.g. 1" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-blue-600 uppercase tracking-widest">Dam ID (Optional)</label>
                            <input type="number" value={formData.damId} onChange={e => setFormData({...formData, damId: e.target.value})} className="w-full h-11 px-4 bg-white border border-blue-200 rounded-xl text-sm" placeholder="e.g. 1" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all">Cancel</button>
                        <button type="submit" disabled={loading} className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all disabled:opacity-70 shadow-lg shadow-blue-100">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Dispatch Alert
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Alert Detail Modal ───────────────────────────────────────────────────────

function AlertDetailModal({ alert, onClose, onAction }) {
    const [actionLoading, setActionLoading] = useState(false);
    if (!alert) return null;

    const handleResolve = async () => {
        setActionLoading('resolve');
        try {
            await resolveAlert(alert.id, 'Resolved via Admin Dashboard');
            toast.success('Alert resolved');
            onAction();
            onClose();
        } catch { toast.error('Action failed'); }
        finally { setActionLoading(false); }
    };

    const handleEscalate = async () => {
        setActionLoading('escalate');
        try {
            await escalateAlert(alert.id, 'Escalated via Admin Dashboard');
            toast.success('Alert escalated');
            onAction();
            onClose();
        } catch { toast.error('Action failed'); }
        finally { setActionLoading(false); }
    };

    const DetailRow = ({ label, value }) => (
        <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
            <span className="text-sm font-bold text-gray-800 break-all">{value || 'N/A'}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
                <div className={`h-2 ${getSeverityStyle(alert.severity).bar}`} />
                <div className="p-8">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <SeverityBadge severity={alert.severity} />
                                <StatusBadge status={alert.status} />
                                {alert.simulationMode && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold">DRILL</span>}
                            </div>
                            <h2 className="text-3xl font-black text-gray-900 leading-tight">{alert.title}</h2>
                            <p className="text-xs text-gray-500 mt-1 font-mono">{alert.uuid}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="p-5 bg-gray-50 border border-gray-100 rounded-2xl mb-8">
                        <p className="text-sm text-gray-700 leading-relaxed font-medium">{alert.message}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                        <DetailRow label="Scope" value={alert.scope} />
                        <DetailRow label="Region ID" value={alert.regionId} />
                        <DetailRow label="Dam ID" value={alert.damId} />
                        <DetailRow label="Action Required" value={alert.actionRequired} />
                        <DetailRow label="Issued At" value={fmtDate(alert.issuedAt)} />
                        <DetailRow label="Expires At" value={fmtDate(alert.expiresAt)} />
                        <DetailRow label="Recipients" value={alert.recipientCount} />
                        <DetailRow label="Read" value={alert.readCount} />
                        <DetailRow label="Acknowledged" value={alert.acknowledgedCount} />
                    </div>

                    {/* Actions */}
                    {(alert.status === 'active' || alert.status === 'escalated' || alert.status === 'draft') && (
                        <div className="flex gap-3 border-t border-gray-100 pt-6">
                            <button onClick={handleResolve} disabled={!!actionLoading} 
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-50">
                                {actionLoading === 'resolve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                Resolve Alert
                            </button>
                            {alert.severity !== 'emergency' && (
                                <button onClick={handleEscalate} disabled={!!actionLoading}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-md shadow-orange-50">
                                    {actionLoading === 'escalate' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                                    Escalate Criticality
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Dashboard Page ───────────────────────────────────────────────────────

export default function AlertsPage() {
    // Geolocation / Siren state
    const [lat, setLat] = useState(null);
    const [lng, setLng] = useState(null);
    const [locationName, setLocationName] = useState('Detecting location...');
    const [isAlerting, setIsAlerting] = useState(false);
    const audioContextRef = useRef(null);
    const oscillatorRef = useRef(null);

    // Data state
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [alerts, setAlerts] = useState([]);
    const [tableLoading, setTableLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 0, size: 10, totalPages: 0, totalElements: 0 });
    const [filters, setFilters] = useState({ status: '', severity: '', regionId: '', damId: '' });
    const [alertTypes, setAlertTypes] = useState([]);

    // UI state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false); // For Emergency Broadcast
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [broadcastLoading, setBroadcastLoading] = useState(false);
    const [searchId, setSearchId] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);

    // ── Audio Engine ────────────────────────────────────────────────────────
    const startSiren = () => {
        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.0);
        gain.gain.setValueAtTime(0.8, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 1.0);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); oscillatorRef.current = osc;
        const interval = setInterval(() => {
            if (!oscillatorRef.current) { clearInterval(interval); return; }
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.0);
        }, 1000);
    };

    const stopSiren = () => { if (oscillatorRef.current) { oscillatorRef.current.stop(); oscillatorRef.current = null; } };
    const testSound = () => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.5);
        osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.5);
        toast.success('System audio verified');
    };

    // ── Data Fetching ───────────────────────────────────────────────────────
    const loadAnalytics = useCallback(async () => {
        setAnalyticsLoading(true);
        try { const data = await getAlertAnalytics(); setAnalytics(data); }
        catch (e) { console.error('Analytics error', e); }
        finally { setAnalyticsLoading(false); }
    }, []);

    const loadAlerts = useCallback(async (page = 0) => {
        setTableLoading(true);
        try {
            const params = { page, size: pagination.size, ...filters };
            const data = await getAllAlertsPaginated(params);
            setAlerts(data.content || []);
            setPagination(p => ({ ...p, page: data.page, totalPages: data.totalPages, totalElements: data.totalElements }));
        } catch (e) { console.error('Alerts load error', e); }
        finally { setTableLoading(false); }
    }, [filters, pagination.size]);

    const loadAlertTypes = useCallback(async () => {
        try { const types = await getActiveAlertTypes(); setAlertTypes(types); } catch {}
    }, []);

    useEffect(() => { loadAnalytics(); loadAlertTypes(); }, []);
    useEffect(() => { loadAlerts(0); }, [filters]);
    useEffect(() => {
        if (isAlerting) { startSiren(); toast('CRITICAL: EMERGENCY PROTOCOL ACTIVE', { icon: '🚨', style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } }); }
        else stopSiren();
        return () => stopSiren();
    }, [isAlerting]);

    const refresh = () => { loadAnalytics(); loadAlerts(pagination.page); };

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleBroadcast = async () => {
        setBroadcastLoading(true);
        try {
            await broadcastEmergency({
                alertTypeId: alertTypes[0]?.id || 1,
                title: 'SYSTEM EMERGENCY BROADCAST',
                message: 'This is an automated high-priority emergency broadcast. Please follow evacuation protocols immediately.',
                severity: 'emergency'
            });
            toast.success('Emergency broadcast dispatched successfully');
            setShowConfirmModal(false);
            refresh();
        } catch { toast.error('Broadcast failed'); }
        finally { setBroadcastLoading(false); }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchId.trim()) return;
        setSearchLoading(true);
        try {
            const res = searchId.length > 20 ? await getAlertByUuid(searchId) : await getAlertById(searchId);
            setSelectedAlert(res);
        } catch { toast.error('Alert not found'); }
        finally { setSearchLoading(false); }
    };

    // ── Location ───────────────────────────────────────────────────────────
    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(async ({ coords }) => {
                setLat(coords.latitude); setLng(coords.longitude);
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`);
                    const data = await res.json();
                    setLocationName(data.address.city || data.address.town || data.address.village || 'Active Zone');
                } catch { setLocationName('Coordinates Acquired'); }
            });
        }
    }, []);

    return (
        <div className={`relative min-h-screen transition-all duration-700 p-6 ${isAlerting ? 'bg-red-500/10' : 'bg-gray-50/30'}`}>
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Disaster Command Center</span>
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Alerts & Notifications</h1>
                        <p className="text-gray-500 text-sm mt-1 max-w-xl">Configure system-wide triggers, manage manual broadcasts, and track population response.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={testSound} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"><Volume2 className="w-4 h-4" /> TEST AUDIO</button>
                        <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-2xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"><Plus className="w-4 h-4" /> NEW ALERT</button>
                        <button onClick={() => setShowConfirmModal(true)} className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-2xl text-xs font-black hover:bg-red-700 transition-all shadow-xl shadow-red-200"><ShieldAlert className="w-4 h-4" /> BROADCAST</button>
                    </div>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {analyticsLoading ? Array.from({length: 4}).map((_,i) => <div key={i} className="h-24 bg-white rounded-3xl animate-pulse" />) : (
                        <>
                            <StatCard label="Total Issues" value={analytics?.totalAlerts} icon={BarChart3} color="bg-blue-50 text-blue-600" />
                            <StatCard label="Live Active" value={analytics?.totalActive} icon={Activity} color="bg-emerald-50 text-emerald-600" subLabel="Currently impacting" />
                            <StatCard label="Escalated" value={analytics?.totalEscalated} icon={TrendingUp} color="bg-orange-50 text-orange-600" subLabel="Require attention" />
                            <StatCard label="Resolved" value={analytics?.totalResolved} icon={Shield} color="bg-slate-50 text-slate-600" />
                        </>
                    )}
                </div>

                {/* Top Row: Map + Filter Controls */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-[350px] bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden relative border-4 border-white">
                        <MapContainer center={lat ? [lat, lng] : [6.9271, 79.8612]} zoom={13} style={{ height: '100%', width: '100%', filter: 'grayscale(0.3) contrast(1.1)' }} scrollWheelZoom={false}>
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                            <ChangeView center={lat ? [lat, lng] : null} />
                            {lat && <Marker position={[lat, lng]}><Popup><div className="text-center font-black text-[10px] uppercase">Command Station<br/><span className="text-gray-500 font-bold">{locationName}</span></div></Popup></Marker>}
                            {alerts.filter(a => a.latitude && a.longitude).map(a => (
                                <Marker key={a.id} position={[a.latitude, a.longitude]} icon={L.divIcon({ className: 'custom-div-icon', html: `<div style="background-color: ${getSeverityStyle(a.severity).dot}" class="w-4 h-4 rounded-full border-2 border-white shadow-lg animate-pulse"></div>` })}>
                                    <Popup><div className="p-2"><h4 className="font-black text-xs">{a.title}</h4><p className="text-[10px] text-gray-500">{a.severity}</p></div></Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>

                    <div className="space-y-4">
                        {/* Protocol Toggle */}
                        <div className={`p-6 rounded-[32px] border-2 transition-all duration-500 ${isAlerting ? 'bg-red-600 border-red-700 text-white shadow-2xl' : 'bg-white border-gray-100'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isAlerting ? 'text-red-100' : 'text-gray-400'}`}>Protocol Status</span>
                                <div className={`w-3 h-3 rounded-full ${isAlerting ? 'bg-white animate-ping' : 'bg-gray-200'}`} />
                            </div>
                            <h3 className="text-xl font-black mb-1">Alert Siren</h3>
                            <p className={`text-xs mb-6 ${isAlerting ? 'text-red-100' : 'text-gray-500'}`}>Trigger physical sirens at command centers.</p>
                            <button onClick={() => setIsAlerting(!isAlerting)} className={`relative inline-flex h-8 w-16 items-center rounded-full transition-all focus:outline-none ${isAlerting ? 'bg-white' : 'bg-gray-100 border border-gray-200'}`}>
                                <span className={`inline-block h-6 w-6 transform rounded-full transition-transform ${isAlerting ? 'translate-x-9 bg-red-600' : 'translate-x-1 bg-white shadow-sm'}`} />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="p-6 bg-white rounded-[32px] border border-gray-100 shadow-sm">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Registry Search</h3>
                            <form onSubmit={handleSearch} className="relative group">
                                <input type="text" placeholder="UUID or Numeric ID..." value={searchId} onChange={e => setSearchId(e.target.value)} className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none transition-all focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500" />
                                <button type="submit" disabled={searchLoading} className="absolute right-2 top-2 p-1.5 bg-gray-900 text-white rounded-xl hover:bg-black transition-all">
                                    {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Filters & Table Section */}
                <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-50 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Alert Ledger</h3>
                            <div className="flex gap-2">
                                <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="px-4 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500/20">
                                    <option value="">Status: All</option>
                                    <option value="active">Active</option>
                                    <option value="escalated">Escalated</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                                <select value={filters.severity} onChange={e => setFilters({...filters, severity: e.target.value})} className="px-4 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500/20">
                                    <option value="">Severity: All</option>
                                    <option value="info">Info</option>
                                    <option value="warning">Warning</option>
                                    <option value="critical">Critical</option>
                                    <option value="emergency">Emergency</option>
                                </select>
                            </div>
                        </div>
                        <button onClick={refresh} className="p-2 text-gray-400 hover:text-blue-600 transition-all"><RefreshCw className={`w-4 h-4 ${tableLoading ? 'animate-spin' : ''}`} /></button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                                <tr>
                                    <th className="px-8 py-4">Status & Title</th>
                                    <th className="px-4 py-4">Severity</th>
                                    <th className="px-4 py-4">Scope</th>
                                    <th className="px-4 py-4">Reach</th>
                                    <th className="px-4 py-4">Issued</th>
                                    <th className="px-8 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {tableLoading ? Array.from({length: 5}).map((_,i) => <tr key={i} className="animate-pulse"><td colSpan={6} className="h-16 bg-gray-50/10" /></tr>) : 
                                  alerts.length === 0 ? <tr><td colSpan={6} className="py-20 text-center text-gray-400 font-bold text-sm">No alerts found matching criteria.</td></tr> :
                                  alerts.map(alert => (
                                    <tr key={alert.id} className="hover:bg-gray-50/50 transition-all group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-2 h-2 rounded-full ${getSeverityStyle(alert.severity).dot} ${alert.status === 'active' || alert.status === 'escalated' ? 'animate-pulse' : ''}`} />
                                                <div>
                                                    <p className="text-sm font-black text-gray-900 group-hover:text-blue-600 transition-all cursor-pointer" onClick={() => setSelectedAlert(alert)}>{alert.title}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <StatusBadge status={alert.status} />
                                                        <span className="text-[10px] font-bold text-gray-400">{alert.alertTypeName}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-5"><SeverityBadge severity={alert.severity} /></td>
                                        <td className="px-4 py-5 text-xs font-bold text-gray-600 uppercase tracking-tighter">{alert.scope}</td>
                                        <td className="px-4 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-gray-800">{alert.recipientCount}</span>
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Reached</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-5 text-xs font-semibold text-gray-500">{fmtDate(alert.issuedAt)}</td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setSelectedAlert(alert)} className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-900 hover:text-white transition-all"><Eye className="w-3.5 h-3.5" /></button>
                                                {(alert.status === 'active' || alert.status === 'escalated') && (
                                                    <button onClick={() => resolveAlert(alert.id, 'Resolved via dashboard').then(refresh)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"><CheckCircle className="w-3.5 h-3.5" /></button>
                                                )}
                                                <button onClick={() => deleteAlert(alert.id).then(refresh)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-8 py-4 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between font-bold text-[10px] text-gray-400 uppercase tracking-widest">
                        <span>Page {pagination.page + 1} of {pagination.totalPages || 1} • {pagination.totalElements} records</span>
                        <div className="flex gap-2">
                            <button disabled={pagination.page === 0} onClick={() => loadAlerts(pagination.page - 1)} className="px-3 py-1.5 bg-white border border-gray-100 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                            <button disabled={pagination.page >= (pagination.totalPages - 1)} onClick={() => loadAlerts(pagination.page + 1)} className="px-3 py-1.5 bg-white border border-gray-100 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <CreateAlertModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSuccess={refresh} alertTypes={alertTypes} />
            <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} onAction={refresh} />

            {/* Emergency Broadcast Confirmation */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-red-900/60 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)} />
                    <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-md p-10 text-center animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-[32px] flex items-center justify-center mx-auto mb-6"><ShieldAlert className="w-10 h-10" /></div>
                        <h2 className="text-3xl font-black text-gray-900 mb-2">Initialize Override?</h2>
                        <p className="text-sm text-gray-500 mb-8 leading-relaxed">This will bypass all safety queues and broadcast a <span className="text-red-600 font-black">Level-4 Emergency Protocol</span> to the entire nationwide network.</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={handleBroadcast} disabled={broadcastLoading} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black tracking-widest text-xs hover:bg-red-700 transition-all shadow-xl shadow-red-100">
                                {broadcastLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'CONFIRM NATIONAL BROADCAST'}
                            </button>
                            <button onClick={() => setShowConfirmModal(false)} className="w-full py-4 text-xs font-black text-gray-400 hover:text-gray-900 transition-all">ABORT OPERATION</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
