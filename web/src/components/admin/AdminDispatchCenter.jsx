import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { createAlert } from '../../services/alertService';
import SymbolIcon from '../ui/SymbolIcon';

export default function AdminDispatchCenter({ dams = [], regions = [], alerts = [], onAlertDispatched }) {
    const [severity, setSeverity] = useState('critical');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [selectedTarget, setSelectedTarget] = useState('dam-1'); // 'dam-<id>' | 'region-<id>' | 'all'
    const [sending, setSending] = useState(false);

    // Format preview alerts from current alerts list or fallbacks
    const previewAlerts = alerts.slice(0, 3);

    const handleSubmit = async (e) => {
        e?.preventDefault();

        if (!title.trim()) {
            toast.error('Please enter an alert title');
            return;
        }
        if (!message.trim()) {
            toast.error('Please enter an alert message');
            return;
        }

        let damId = undefined;
        let regionId = undefined;

        if (selectedTarget.startsWith('dam-')) {
            damId = Number(selectedTarget.replace('dam-', ''));
        } else if (selectedTarget.startsWith('region-')) {
            regionId = Number(selectedTarget.replace('region-', ''));
        }

        // Map severity to valid system enum:
        // 'danger' -> 'emergency', 'critical' -> 'critical', 'warning' -> 'warning', 'info' -> 'info'
        let apiSeverity = severity.toLowerCase();
        if (apiSeverity === 'danger') {
            apiSeverity = 'emergency';
        }

        const payload = {
            alertTypeId: 1,
            title: title.trim(),
            message: message.trim(),
            severity: apiSeverity,
            status: 'active',
            damId: damId || undefined,
            regionId: regionId || undefined,
        };

        setSending(true);
        try {
            const result = await createAlert(payload);
            toast.success(`Emergency alert "${result.title}" dispatched successfully!`);
            setTitle('');
            setMessage('');
            if (onAlertDispatched) {
                onAlertDispatched(result);
            }
        } catch (err) {
            console.error('Failed to dispatch alert:', err);
            toast.error(err?.response?.data?.message || err?.message || 'Failed to dispatch alert');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-[#f0f4f8] p-4 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm mb-8 transition-all">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                {/* ── Left Column: Mobile App Preview ── */}
                <div className="lg:col-span-5 flex justify-center">
                    <div className="w-[310px] sm:w-[340px] bg-[#1a2332] rounded-[44px] p-3.5 shadow-2xl border-4 border-slate-700/60 relative">
                        {/* Speaker Notch */}
                        <div className="w-28 h-4 bg-[#0d131d] rounded-full mx-auto mb-3 flex items-center justify-center">
                            <div className="w-10 h-1 bg-slate-600/70 rounded-full"></div>
                        </div>

                        {/* Phone Screen */}
                        <div className="bg-[#f8fafc] rounded-[34px] min-h-[500px] p-4 flex flex-col justify-between overflow-hidden shadow-inner">
                            {/* App Header */}
                            <div>
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-800 text-lg">📱</span>
                                        <span className="font-bold text-slate-800 text-sm tracking-wide">DDAS Alerts</span>
                                    </div>
                                    <div className="relative">
                                        <span className="text-slate-600 text-lg">🔔</span>
                                        <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                                            {alerts.length || 1}
                                        </span>
                                    </div>
                                </div>

                                {/* Live Alert Cards in Mobile Screen */}
                                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-0.5">
                                    {previewAlerts.length > 0 ? (
                                        previewAlerts.map((al, idx) => {
                                            const isCrit = (al.severity || '').toLowerCase() === 'critical' || (al.severity || '').toLowerCase() === 'emergency';
                                            const isWarn = (al.severity || '').toLowerCase() === 'warning';
                                            
                                            const cardBg = isCrit ? 'bg-[#fff5f5] border-l-4 border-l-red-500' : isWarn ? 'bg-[#fffdf0] border-l-4 border-l-amber-500' : 'bg-[#f0f9ff] border-l-4 border-l-blue-500';
                                            const badgeBg = isCrit ? 'bg-red-100 text-red-700' : isWarn ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700';
                                            const iconColor = isCrit ? 'text-red-500' : isWarn ? 'text-amber-500' : 'text-blue-500';

                                            return (
                                                <div key={al.id || idx} className={`${cardBg} rounded-2xl p-3 border border-slate-100/80 shadow-sm transition-all`}>
                                                    <div className="flex items-start justify-between gap-1 mb-1">
                                                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                            <span className={`${iconColor} font-bold text-sm`}>⚠️</span>
                                                            <span className="font-bold text-xs text-slate-800 truncate">{al.title}</span>
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${badgeBg}`}>
                                                            {al.severity}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed mb-2 font-normal">
                                                        {al.message}
                                                    </p>
                                                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                                                        <span className="flex items-center gap-1 font-medium">
                                                            🕒 {al.createdAt ? new Date(al.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                                        </span>
                                                        <span className="bg-white/80 px-1.5 py-0.5 rounded text-[9px] border border-slate-100">
                                                            {al.damId ? `Dam #${al.damId}` : al.regionId ? `Region #${al.regionId}` : 'Island-wide'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <>
                                            {/* Default Sample Card 1 */}
                                            <div className="bg-[#fff5f5] rounded-2xl p-3 border-l-4 border-l-red-500 border border-slate-100 shadow-sm">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-red-500 text-sm">⚠️</span>
                                                        <span className="font-bold text-xs text-slate-800">Evacuation Warning</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">Critical</span>
                                                </div>
                                                <p className="text-[11px] text-slate-600 leading-relaxed mb-1.5">
                                                    Water levels critically high at Victoria Dam. Evacuate low-lying areas immediately.
                                                </p>
                                                <span className="text-[10px] text-slate-400 font-medium">🕒 08:28</span>
                                            </div>

                                            {/* Default Sample Card 2 */}
                                            <div className="bg-[#fffdf0] rounded-2xl p-3 border-l-4 border-l-amber-500 border border-slate-100 shadow-sm">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-amber-500 text-sm">ℹ️</span>
                                                        <span className="font-bold text-xs text-slate-800">Heavy Rainfall Advisory</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Medium</span>
                                                </div>
                                                <p className="text-[11px] text-slate-600 leading-relaxed mb-1.5">
                                                    Heavy rainfall expected in the catchment area. Operations team monitoring levels.
                                                </p>
                                                <span className="text-[10px] text-slate-400 font-medium">🕒 07:28</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Phone bottom indicator bar */}
                            <div className="w-24 h-1 bg-slate-300 rounded-full mx-auto mt-3"></div>
                        </div>
                    </div>
                </div>

                {/* ── Right Column: Admin Dispatch Form ── */}
                <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100">
                    <div className="flex items-start gap-3.5 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                            <span className="text-2xl">🛡️</span>
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Admin Dispatch Center</h2>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Broadcast emergency notifications to all connected mobile devices & SMS.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Target Selection: Dam / Region */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                                Dam / Region (Target Area) *
                            </label>
                            <select
                                value={selectedTarget}
                                onChange={(e) => setSelectedTarget(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-medium"
                            >
                                <optgroup label="Dams">
                                    {dams.length > 0 ? (
                                        dams.map((d) => (
                                            <option key={`dam-${d.id}`} value={`dam-${d.id}`}>
                                                💧 {d.name} Dam
                                            </option>
                                        ))
                                    ) : (
                                        <option value="dam-1">💧 Victoria Dam</option>
                                    )}
                                </optgroup>
                                <optgroup label="Regions">
                                    {regions.length > 0 ? (
                                        regions.map((r) => (
                                            <option key={`region-${r.id}`} value={`region-${r.id}`}>
                                                📍 {r.name} Region
                                            </option>
                                        ))
                                    ) : (
                                        <option value="region-1">📍 Central Province</option>
                                    )}
                                </optgroup>
                                <optgroup label="National Broadcast">
                                    <option value="all">🌐 Island-wide (All Regions & Dams)</option>
                                </optgroup>
                            </select>
                        </div>

                        {/* Severity Level Dropdown */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                                Severity Level *
                            </label>
                            <select
                                value={severity}
                                onChange={(e) => setSeverity(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-medium"
                            >
                                <option value="critical">🔴 CRITICAL - Immediate Evacuation & Action Required</option>
                                <option value="danger">🚨 DANGER - High Threat / Emergency Level</option>
                                <option value="warning">🟡 WARNING - Take Precautions / Rising Water Level</option>
                                <option value="info">🔵 INFO - Situational Advisory / Monitor Conditions</option>
                            </select>
                        </div>

                        {/* Alert Title */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                                Alert Title *
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Spillway Gates Opening — Victoria Dam"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-sm rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                            />
                        </div>

                        {/* Alert Message */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                                Alert Message *
                            </label>
                            <textarea
                                rows={3}
                                placeholder="Provide detailed instructions or situational updates (e.g., කරුණාකර වහාම ආරක්ෂිත ස්ථානයකට යන්න)..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-sm rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none font-medium"
                            ></textarea>
                        </div>

                        {/* Broadcast Emergency Alert Button */}
                        <button
                            type="submit"
                            disabled={sending}
                            className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-red-500/25 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.99] disabled:opacity-60 cursor-pointer text-base"
                        >
                            {sending ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    <span>Broadcasting Alert to Mobile App...</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-lg">🚨</span>
                                    <span>Broadcast Emergency Alert</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* System Status Indicators Box */}
                    <div className="mt-5 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between flex-wrap gap-3">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            SYSTEM STATUS
                        </div>
                        <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                FCM Connected
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Notify.lk Active
                            </span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
