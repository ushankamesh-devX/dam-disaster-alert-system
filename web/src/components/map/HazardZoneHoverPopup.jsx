import React from 'react';
import { AlertTriangle, MapPin, Ruler, Clock, Droplets, Tag, Activity } from 'lucide-react';

// Hazard level → color/label mapping (fallback by ID or name)
const HAZARD_LEVEL_COLORS = {
    1: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700', label: 'Low Risk', dot: 'bg-green-500' },
    2: { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-700', label: 'Medium Risk', dot: 'bg-yellow-500' },
    3: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700', label: 'High Risk', dot: 'bg-orange-500' },
    4: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700', label: 'Extreme Risk', dot: 'bg-red-500' },
};

const DEFAULT_LEVEL = { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700', label: 'Unknown Risk', dot: 'bg-gray-400' };

function StatRow({ icon: Icon, label, value, unit, colorClass = 'text-gray-800' }) {
    if (value == null || value === '' || value === 0) return null;
    return (
        <div className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                <Icon className="w-3 h-3" />
                <span>{label}</span>
            </div>
            <span className={`text-[11px] font-semibold ${colorClass}`}>
                {value}{unit ? <span className="font-normal text-gray-400 ml-0.5">{unit}</span> : null}
            </span>
        </div>
    );
}

export default function HazardZoneHoverPopup({ zoneData, position }) {
    if (!zoneData) return null;

    const levelId = parseInt(zoneData.hazardLevelId) || 0;
    const level = HAZARD_LEVEL_COLORS[levelId] || DEFAULT_LEVEL;

    // Use the zone's own fill color as accent if available
    const accentColor = zoneData.fillColor || '#ef4444';
    const strokeColor = zoneData.strokeColor || '#ef4444';

    return (
        <div
            className="fixed z-[9999] pointer-events-none"
            style={{ left: position.x + 15, top: position.y - 10 }}
        >
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 pointer-events-auto overflow-hidden"
                style={{ width: '290px' }}>

                {/* Colored top bar matching zone color */}
                <div
                    className="h-1.5 w-full"
                    style={{ background: `linear-gradient(90deg, ${strokeColor}, ${accentColor})` }}
                />

                {/* Header */}
                <div className="px-3 pt-2.5 pb-2 border-b border-gray-100">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            {/* Color swatch */}
                            <div
                                className="w-7 h-7 rounded-md flex-shrink-0 border shadow-sm"
                                style={{ backgroundColor: accentColor, borderColor: strokeColor }}
                            />
                            <div className="min-w-0">
                                <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
                                    {zoneData.zoneName || 'Hazard Zone'}
                                </h3>
                                {zoneData.zoneNameSi && (
                                    <p className="text-xs text-gray-400 truncate">{zoneData.zoneNameSi}</p>
                                )}
                            </div>
                        </div>
                        {/* Risk level badge */}
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border flex-shrink-0 ${level.bg} ${level.text} ${level.border}`}>
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span className="whitespace-nowrap">{level.label}</span>
                        </div>
                    </div>

                    {/* Zone code + description */}
                    <div className="flex items-center gap-2 mt-1.5">
                        {zoneData.zoneCode && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-gray-100 border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                                <Tag className="w-2.5 h-2.5" />
                                {zoneData.zoneCode}
                            </span>
                        )}
                        {zoneData.isActive === false && (
                            <span className="text-[10px] text-gray-400 italic">Inactive</span>
                        )}
                    </div>
                    {zoneData.description && (
                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-snug">{zoneData.description}</p>
                    )}
                </div>

                {/* Stats */}
                <div className="px-3 py-2 space-y-0.5">
                    <StatRow
                        icon={Ruler}
                        label="Distance from Dam"
                        value={zoneData.distanceFromDamKm ? parseFloat(zoneData.distanceFromDamKm).toFixed(2) : null}
                        unit=" km"
                        colorClass="text-gray-800"
                    />
                    <StatRow
                        icon={Activity}
                        label="Area"
                        value={zoneData.areaSqKm ? parseFloat(zoneData.areaSqKm).toFixed(3) : null}
                        unit=" km²"
                        colorClass="text-gray-800"
                    />
                    <StatRow
                        icon={Clock}
                        label="Flood Arrival Est."
                        value={zoneData.estimatedFloodArrivalMinutes || null}
                        unit=" min"
                        colorClass="text-orange-600"
                    />
                    <StatRow
                        icon={Droplets}
                        label="Est. Water Depth"
                        value={zoneData.estimatedWaterDepthMeters ? parseFloat(zoneData.estimatedWaterDepthMeters).toFixed(1) : null}
                        unit=" m"
                        colorClass="text-blue-600"
                    />
                    <StatRow
                        icon={MapPin}
                        label="Center"
                        value={
                            zoneData.centerLatitude && zoneData.centerLongitude
                                ? `${parseFloat(zoneData.centerLatitude).toFixed(4)}, ${parseFloat(zoneData.centerLongitude).toFixed(4)}`
                                : null
                        }
                        colorClass="text-gray-600"
                    />
                </div>
            </div>
        </div>
    );
}
