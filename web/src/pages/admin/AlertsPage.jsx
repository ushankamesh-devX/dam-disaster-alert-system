import React, { useState, useEffect, useRef } from 'react';
import {
    Search, MapPin, BellRing, BellOff, Loader2, AlertTriangle,
    Clock, ShieldAlert, Radio, Volume2, Trash2, CheckCircle,
    ChevronRight, Map as MapIcon, Info, Send
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    getAlertById,
    getAllAlerts,
    updateAlertStatus,
    broadcastEmergency,
    deleteAlert
} from '../../services/alertService';
import toast from 'react-hot-toast';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map center updates
function ChangeView({ center }) {
    const map = useMap();
    if (center) map.setView(center, map.getZoom());
    return null;
}

export default function AlertsPage() {
    // --- State Variables ---
    const [alertId, setAlertId] = useState('');
    const [lat, setLat] = useState(null);
    const [lng, setLng] = useState(null);
    const [locationName, setLocationName] = useState('Detecting location...');
    const [isAlerting, setIsAlerting] = useState(false);

    const [recentAlerts, setRecentAlerts] = useState([]);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [loading, setLoading] = useState(false);
    const [recentLoading, setRecentLoading] = useState(true);
    const [error, setError] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const audioContextRef = useRef(null);
    const oscillatorRef = useRef(null);

    // --- Audio Logic (Web Audio API) ---
    const startSiren = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }

        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);

        // Siren effect: oscillate frequency
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.0);
        osc.loop = true;

        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 1.0);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        oscillatorRef.current = osc;

        // Repeat the ramp
        const interval = setInterval(() => {
            if (!oscillatorRef.current) {
                clearInterval(interval);
                return;
            }
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.0);
        }, 1000);
    };

    const stopSiren = () => {
        if (oscillatorRef.current) {
            oscillatorRef.current.stop();
            oscillatorRef.current = null;
        }
    };

    const testSound = () => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
        toast.success('Audio system verified');
    };

    // --- Geolocation & Reverse Geocoding ---
    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setLat(latitude);
                    setLng(longitude);

                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        const data = await res.json();
                        const city = data.address.city || data.address.town || data.address.village || data.address.suburb || 'Unknown Area';
                        setLocationName(city);
                    } catch (e) {
                        setLocationName('Coordinates acquired');
                    }
                },
                (err) => {
                    setLocationName('Location Access Denied');
                }
            );
        }
    }, []);

    // --- Siren Side Effect ---
    useEffect(() => {
        if (isAlerting) {
            startSiren();
            toast('EMERGENCY MODE ACTIVE', { icon: '🚨', style: { borderRadius: '10px', background: '#ef4444', color: '#fff' } });
        } else {
            stopSiren();
        }
        return () => stopSiren();
    }, [isAlerting]);

    // --- Initial Data Load ---
    useEffect(() => {
        fetchRecentAlerts();
    }, []);

    const fetchRecentAlerts = async () => {
        setRecentLoading(true);
        try {
            const data = await getAllAlerts();
            // Sort by date descending and take top 5
            const sorted = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
            setRecentAlerts(sorted);
        } catch (e) {
            console.error('Failed to load recent alerts', e);
        } finally {
            setRecentLoading(false);
        }
    };

    // --- API Interactions ---
    const handleFetchById = async (e) => {
        e?.preventDefault();
        if (!alertId.trim()) return;
        setLoading(true);
        setError('');
        try {
            const res = await getAlertById(alertId);
            setSelectedAlert(res);
        } catch (err) {
            setError(err.response?.status === 404 ? 'Alert not found' : 'Connection error');
        } finally {
            setLoading(false);
        }
    };

    const handleBroadcast = async () => {
        setLoading(true);
        try {
            await broadcastEmergency({
                title: 'EMERGENCY BROADCAST',
                message: 'This is a system-wide emergency priority broadcast. Immediate action required.',
                alertTypeId: 1, // Default emergency type
                severity: 'emergency'
            });
            toast.success('Emergency broadcast dispatched');
            setShowConfirmModal(false);
            fetchRecentAlerts();
        } catch (e) {
            toast.error('Broadcast failed');
        } finally {
            setLoading(false);
        }
    };

    const getSeverityStyles = (severity) => {
        const s = (severity || '').toLowerCase();
        if (s === 'emergency' || s === 'critical') return 'border-red-500 bg-red-50 text-red-700';
        if (s === 'warning' || s === 'high') return 'border-orange-400 bg-orange-50 text-orange-700';
        return 'border-blue-400 bg-blue-50 text-blue-700';
    };

    return (
        <div className={`relative min-h-screen transition-all duration-700 p-6 ${isAlerting ? 'bg-red-950/20' : 'bg-gray-50/50'}`}>
            {/* Pulse Overlay */}
            {isAlerting && (
                <div className="fixed inset-0 pointer-events-none z-0 animate-pulse bg-red-500/5" />
            )}

            <div className="relative z-10 max-w-7xl mx-auto space-y-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2 text-blue-600 font-bold uppercase tracking-widest text-xs">
                            <Radio className="w-4 h-4 animate-ping" />
                            Live Alert Command Center
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Alerts Dashboard</h1>
                        <p className="text-gray-500 mt-2 max-w-xl">
                            High-fidelity disaster monitoring. Manage, broadcast, and track active statuses in real-time.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={testSound}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                        >
                            <Volume2 className="w-4 h-4" />
                            Test Sound
                        </button>
                        <button
                            onClick={() => setShowConfirmModal(true)}
                            className="group flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg hover:shadow-red-200"
                        >
                            <ShieldAlert className="w-4 h-4 group-hover:scale-125 transition-transform" />
                            BROADCAST EMERGENCY
                        </button>
                    </div>
                </div>

                {/* Top Grid: Location + Controls + Search */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Location Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                <MapPin className="w-6 h-6" />
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Operator Zone</p>
                                <p className="text-sm font-bold text-gray-800">{locationName}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-1">GPS Coordinates</p>
                            <p className="text-sm font-mono text-gray-600">
                                {lat ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Scanning...'}
                            </p>
                        </div>
                    </div>

                    {/* Alert Control Card */}
                    <div className={`rounded-2xl shadow-sm border p-6 transition-all duration-500 ${isAlerting ? 'bg-red-500 border-red-600 text-white shadow-red-200' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className={`text-sm font-bold uppercase tracking-widest ${isAlerting ? 'text-white' : 'text-gray-400'}`}>System Protocol</h3>
                            <div className={`w-3 h-3 rounded-full ${isAlerting ? 'bg-white animate-ping' : 'bg-gray-300'}`} />
                        </div>
                        <h2 className="text-xl font-black mb-4">Alert Notification</h2>
                        <div className="flex items-center justify-between pointer-events-auto">
                            <p className={`text-xs ${isAlerting ? 'text-red-100' : 'text-gray-500'}`}>
                                {isAlerting ? 'Siren Active • Logic High' : 'Ready • Monitoring Background'}
                            </p>
                            <button
                                onClick={() => setIsAlerting(!isAlerting)}
                                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all focus:outline-none ${isAlerting ? 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]' : 'bg-gray-200'
                                    }`}
                            >
                                <span className={`inline-block h-5 w-5 transform rounded-full transition-transform ${isAlerting ? 'translate-x-8 bg-red-500' : 'translate-x-1 bg-white'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Search Panel */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Registry Lookup</h3>
                        <form onSubmit={handleFetchById} className="relative">
                            <input
                                type="text"
                                placeholder="Enter Alert UUID / ID"
                                value={alertId}
                                onChange={(e) => setAlertId(e.target.value)}
                                className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                            />
                            <button
                                type="submit"
                                className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                        </form>
                        <p className="mt-3 text-[10px] text-gray-400">Search by unique identifier for full details.</p>
                    </div>
                </div>

                {/* Main Content: Map + Recent/Selected */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* Left: Map Preview (3 Cols) */}
                    <div className="lg:col-span-3 h-[450px] bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden relative group">
                        <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-2">
                            <MapIcon className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Alert Origin Map</span>
                        </div>

                        <MapContainer
                            center={lat ? [lat, lng] : [6.9271, 79.8612]}
                            zoom={13}
                            style={{ height: '100%', width: '100%', filter: 'grayscale(0.2)' }}
                            scrollWheelZoom={false}
                        >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <ChangeView center={lat ? [lat, lng] : null} />
                            {lat && (
                                <Marker position={[lat, lng]}>
                                    <Popup>
                                        <div className="text-center p-1">
                                            <p className="font-bold text-xs">Operator Station</p>
                                            <p className="text-[10px] text-gray-500">{locationName}</p>
                                        </div>
                                    </Popup>
                                </Marker>
                            )}
                        </MapContainer>
                    </div>

                    {/* Right: Results / Recent (2 Cols) */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Selected Alert Area */}
                        {selectedAlert || error ? (
                            <div className={`rounded-3xl border shadow-xl p-6 transition-all animate-in slide-in-from-right duration-500 ${error ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
                                {error ? (
                                    <div className="text-center py-10">
                                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                        <h3 className="text-lg font-bold text-gray-900">{error}</h3>
                                        <p className="text-sm text-gray-500 mt-1">Try searching with a different ID.</p>
                                        <button onClick={() => setError('')} className="mt-4 text-xs font-bold text-blue-600">Dismiss</button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getSeverityStyles(selectedAlert.severity)}`}>
                                                {selectedAlert.severity}
                                            </div>
                                            <button onClick={() => setSelectedAlert(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-gray-900 leading-tight">{selectedAlert.title}</h2>
                                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(selectedAlert.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-2xl text-sm text-gray-700 leading-relaxed border border-gray-100">
                                            {selectedAlert.message}
                                        </div>
                                        <div className="pt-2 flex items-center gap-4">
                                            <div className="flex-1">
                                                <p className="text-[10px] text-gray-400 uppercase font-medium mb-1 tracking-wider">Status</p>
                                                <div className="flex items-center gap-2 text-emerald-600 font-bold">
                                                    <CheckCircle className="w-4 h-4" />
                                                    {selectedAlert.status}
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[10px] text-gray-400 uppercase font-medium mb-1 tracking-wider">Region ID</p>
                                                <p className="font-bold text-gray-800">{selectedAlert.regionId || 'GLOBAL'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Recent Alerts Panel */
                            <div className="bg-white rounded-3xl shadow-md border border-gray-100 h-full flex flex-col">
                                <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Recent Activity</h3>
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                </div>
                                <div className="p-4 flex-1 overflow-y-auto max-h-[350px]">
                                    {recentLoading ? (
                                        <div className="flex items-center justify-center h-48">
                                            <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
                                        </div>
                                    ) : recentAlerts.length === 0 ? (
                                        <div className="text-center py-10">
                                            <BellOff className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                                            <p className="text-xs text-gray-500">Zero active alerts reported.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {recentAlerts.map(alert => (
                                                <div
                                                    key={alert.id}
                                                    onClick={() => {
                                                        setSelectedAlert(alert);
                                                        setAlertId(String(alert.id));
                                                    }}
                                                    className="group flex items-center gap-4 p-3 hover:bg-gray-50 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-gray-100"
                                                >
                                                    <div className={`w-1 h-8 rounded-full ${getSeverityStyles(alert.severity).split(' ')[0].replace('border-', 'bg-')}`} />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-gray-800 truncate">{alert.title}</p>
                                                        <p className="text-[10px] text-gray-500">{new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 bg-gray-50/50 rounded-b-3xl border-t border-gray-50 text-center">
                                    <button className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-widest">View History Logs</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <ShieldAlert className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-black text-center text-gray-900 mb-2">Emergency Override</h2>
                        <p className="text-sm text-gray-500 text-center mb-8">
                            You are about to trigger a system-wide emergency broadcast. This will bypass all normal queues and alert all connected devices immediately.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 px-6 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={handleBroadcast}
                                disabled={loading}
                                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                BROADCAST
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Styles for Leaflet Attribution & Pulse */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .leaflet-control-attribution { display: none !important; }
                .leaflet-container { border-radius: 20px; }
                @keyframes pulse-red {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
            `}} />
        </div>
    );
}
