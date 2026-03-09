import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock, Wrench, Lock, Unlock, ZapOff } from 'lucide-react';
import { getGateById } from '../../services/dam.service';

// Status configuration: color classes, icons, labels
const STATUS_CONFIG = {
    closed: {
        label: 'Closed',
        color: 'text-gray-700',
        bg: 'bg-gray-100',
        border: 'border-gray-300',
        barColor: 'bg-gray-400',
        icon: Lock,
        dot: 'bg-gray-500',
    },
    partial: {
        label: 'Partial',
        color: 'text-blue-700',
        bg: 'bg-blue-100',
        border: 'border-blue-300',
        barColor: 'bg-blue-500',
        icon: Unlock,
        dot: 'bg-blue-500',
    },
    fully_open: {
        label: 'Fully Open',
        color: 'text-green-700',
        bg: 'bg-green-100',
        border: 'border-green-300',
        barColor: 'bg-green-500',
        icon: CheckCircle,
        dot: 'bg-green-500',
    },
    maintenance: {
        label: 'Maintenance',
        color: 'text-amber-700',
        bg: 'bg-amber-100',
        border: 'border-amber-300',
        barColor: 'bg-amber-500',
        icon: Wrench,
        dot: 'bg-amber-500',
    },
    jammed: {
        label: 'Jammed',
        color: 'text-red-700',
        bg: 'bg-red-100',
        border: 'border-red-300',
        barColor: 'bg-red-500',
        icon: ZapOff,
        dot: 'bg-red-500',
    },
};

const GATE_TYPE_LABELS = {
    radial: 'Radial Gate',
    vertical: 'Vertical Gate',
    drum: 'Drum Gate',
    flap: 'Flap Gate',
    sluice: 'Sluice Gate',
};

export default function GateHoverPopup({ gateId, position, onClose }) {
    const [gate, setGate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!gateId) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const gateData = await getGateById(gateId);
                setGate(gateData);
            } catch (err) {
                console.error('Failed to fetch gate data:', err);
                setError('Failed to load gate data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [gateId]);

    if (!gateId) return null;

    const statusKey = (gate?.status || 'closed').toLowerCase();
    const statusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG.closed;
    const StatusIcon = statusConfig.icon;

    // Calculate opening percentage
    const maxOpening = parseFloat(gate?.maxOpeningMeters) || 0;
    const currentOpening = parseFloat(gate?.currentOpeningMeters) || 0;
    const openingPct = maxOpening > 0 ? Math.min(100, (currentOpening / maxOpening) * 100) : 0;

    // Determine popup position — keep it on screen
    const popupStyle = {
        left: position.x + 15,
        top: position.y - 10,
    };

    return (
        <div
            className="fixed z-[9999] pointer-events-none"
            style={popupStyle}
        >
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-68 pointer-events-auto"
                style={{ width: '280px' }}>

                {/* Header */}
                <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 ${statusConfig.bg} rounded-lg`}>
                            <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 text-sm">
                                {loading ? 'Loading...' : `Dam Gate ${gate?.gateNumber || '#'}`}
                            </h3>
                            <p className="text-xs text-gray-500">
                                {GATE_TYPE_LABELS[gate?.gateType?.toLowerCase()] || gate?.gateType || 'Gate'}
                            </p>
                        </div>
                    </div>
                    {/* Status badge */}
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}></span>
                        <span>{statusConfig.label}</span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-6">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
                    </div>
                ) : error ? (
                    <div className="text-center py-4 text-red-500 text-sm">{error}</div>
                ) : (
                    <>
                        {/* Opening Progress */}
                        <div className={`rounded-lg p-2.5 mb-2 border ${statusKey === 'jammed'
                                ? 'bg-red-50 border-red-200'
                                : statusKey === 'maintenance'
                                    ? 'bg-amber-50 border-amber-200'
                                    : 'bg-gray-50 border-gray-200'
                            }`}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-500">Gate Opening</span>
                                <span className={`text-xs font-semibold ${statusConfig.color}`}>
                                    {openingPct.toFixed(1)}%
                                </span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                    className={`h-2 rounded-full transition-all ${statusConfig.barColor}`}
                                    style={{ width: `${openingPct}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                                <span>0m</span>
                                <span className="font-medium text-gray-600">
                                    {currentOpening.toFixed(1)}m / {maxOpening.toFixed(1)}m
                                </span>
                                <span>{maxOpening.toFixed(1)}m</span>
                            </div>
                        </div>

                        {/* Gate Details Grid */}
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                            <div className="bg-gray-50 rounded-md p-2 border border-gray-100">
                                <span className="text-gray-500 block text-[10px] uppercase font-semibold">Gate No.</span>
                                <span className="text-gray-800 font-medium">{gate?.gateNumber || '—'}</span>
                            </div>
                            <div className="bg-gray-50 rounded-md p-2 border border-gray-100">
                                <span className="text-gray-500 block text-[10px] uppercase font-semibold">Type</span>
                                <span className="text-gray-800 font-medium capitalize">{gate?.gateType || '—'}</span>
                            </div>
                            <div className="bg-gray-50 rounded-md p-2 border border-gray-100">
                                <span className="text-gray-500 block text-[10px] uppercase font-semibold">Max Opening</span>
                                <span className="text-gray-800 font-medium">{maxOpening.toFixed(2)} m</span>
                            </div>
                            <div className="bg-gray-50 rounded-md p-2 border border-gray-100">
                                <span className="text-gray-500 block text-[10px] uppercase font-semibold">Current</span>
                                <span className={`font-medium ${statusConfig.color}`}>{currentOpening.toFixed(2)} m</span>
                            </div>
                        </div>

                        {/* Alert for warning statuses */}
                        {(statusKey === 'jammed' || statusKey === 'maintenance') && (
                            <div className={`mt-2 flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-md ${statusConfig.bg} ${statusConfig.color}`}>
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>
                                    {statusKey === 'jammed'
                                        ? 'Gate is jammed — requires immediate attention!'
                                        : 'Gate is under scheduled maintenance.'}
                                </span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
