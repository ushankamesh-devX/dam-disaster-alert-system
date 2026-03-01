import React, { useEffect, useState } from 'react';
import { Droplets, MapPin, Building2, Ruler, Gauge, AlertTriangle, CheckCircle, XCircle, Phone, Mail, Calendar } from 'lucide-react';
import { getDamById, getDamStatus } from '../../services/dam.service';

const STATUS_CONFIG = {
    operational: { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle, label: 'Operational' },
    under_maintenance: { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertTriangle, label: 'Maintenance' },
    under_construction: { color: 'text-blue-600', bg: 'bg-blue-100', icon: Building2, label: 'Construction' },
    decommissioned: { color: 'text-gray-500', bg: 'bg-gray-100', icon: XCircle, label: 'Decommissioned' },
    emergency: { color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle, label: 'Emergency' },
};

const HAZARD_STATUS_CONFIG = {
    normal: { color: 'text-green-600', bg: 'bg-green-100', label: 'Normal' },
    elevated: { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Elevated' },
    high: { color: 'text-orange-600', bg: 'bg-orange-100', label: 'High' },
    critical: { color: 'text-red-600', bg: 'bg-red-100', label: 'Critical' },
    emergency: { color: 'text-red-700', bg: 'bg-red-200', label: 'Emergency' },
};

const RISK_CONFIG = {
    low: { color: 'text-green-600', label: 'Low Risk' },
    medium: { color: 'text-yellow-600', label: 'Medium Risk' },
    high: { color: 'text-orange-600', label: 'High Risk' },
    extreme: { color: 'text-red-600', label: 'Extreme Risk' },
};

export default function DamHoverPopup({ damId, position, onClose }) {
    const [dam, setDam] = useState(null);
    const [damStatus, setDamStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!damId) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [damData, statusData] = await Promise.all([
                    getDamById(damId),
                    getDamStatus(damId).catch(() => null)
                ]);

                setDam(damData);
                setDamStatus(statusData);
            } catch (err) {
                console.error('Failed to fetch dam data:', err);
                setError('Failed to load dam data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [damId]);

    if (!damId) return null;

    const statusConfig = STATUS_CONFIG[dam?.status?.toLowerCase()] || STATUS_CONFIG.operational;
    const StatusIcon = statusConfig.icon;
    const hazardConfig = HAZARD_STATUS_CONFIG[dam?.overallHazardStatus?.toLowerCase()] || HAZARD_STATUS_CONFIG.normal;
    const riskConfig = RISK_CONFIG[dam?.riskClassification?.toLowerCase()] || RISK_CONFIG.low;

    return (
        <div 
            className="fixed z-[9999] pointer-events-none"
            style={{ 
                left: position.x + 15, 
                top: position.y - 10,
            }}
        >
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-80 pointer-events-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 rounded-lg">
                            <Droplets className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 text-sm truncate max-w-[180px]">
                                {loading ? 'Loading...' : dam?.name || 'Unknown Dam'}
                            </h3>
                            <p className="text-xs text-gray-500">
                                {dam?.code} • {dam?.damType?.replace('_', ' ')}
                            </p>
                        </div>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusConfig.bg} ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        <span>{statusConfig.label}</span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-6">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                ) : error ? (
                    <div className="text-center py-4 text-red-500 text-sm">{error}</div>
                ) : (
                    <>
                        {/* Hazard Status & Risk */}
                        <div className="flex gap-2 mb-2">
                            <div className={`flex-1 rounded-lg p-2 ${hazardConfig.bg}`}>
                                <span className="text-xs text-gray-500">Hazard Status</span>
                                <p className={`font-semibold text-sm ${hazardConfig.color}`}>{hazardConfig.label}</p>
                            </div>
                            <div className="flex-1 rounded-lg p-2 bg-gray-50">
                                <span className="text-xs text-gray-500">Risk Level</span>
                                <p className={`font-semibold text-sm ${riskConfig.color}`}>{riskConfig.label}</p>
                            </div>
                        </div>

                        {/* Current Status (if available) */}
                        {damStatus && (
                            <div className="bg-gray-50 rounded-lg p-2 mb-2">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {damStatus.currentWaterLevelM != null && (
                                        <div>
                                            <span className="text-gray-500">Water Level:</span>
                                            <span className="ml-1 font-medium">{parseFloat(damStatus.currentWaterLevelM).toFixed(1)}m</span>
                                        </div>
                                    )}
                                    {damStatus.currentStorageMcm != null && (
                                        <div>
                                            <span className="text-gray-500">Storage:</span>
                                            <span className="ml-1 font-medium">{parseFloat(damStatus.currentStorageMcm).toFixed(1)} MCM</span>
                                        </div>
                                    )}
                                    {damStatus.currentInflowCumecs != null && (
                                        <div>
                                            <span className="text-gray-500">Inflow:</span>
                                            <span className="ml-1 font-medium">{parseFloat(damStatus.currentInflowCumecs).toFixed(1)} m³/s</span>
                                        </div>
                                    )}
                                    {damStatus.currentOutflowCumecs != null && (
                                        <div>
                                            <span className="text-gray-500">Outflow:</span>
                                            <span className="ml-1 font-medium">{parseFloat(damStatus.currentOutflowCumecs).toFixed(1)} m³/s</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Dam Specifications */}
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                            {dam?.heightMeters && (
                                <div className="flex items-center gap-1">
                                    <Ruler className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-500">Height:</span>
                                    <span className="font-medium">{parseFloat(dam.heightMeters).toFixed(0)}m</span>
                                </div>
                            )}
                            {dam?.lengthMeters && (
                                <div className="flex items-center gap-1">
                                    <Ruler className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-500">Length:</span>
                                    <span className="font-medium">{parseFloat(dam.lengthMeters).toFixed(0)}m</span>
                                </div>
                            )}
                            {dam?.reservoirCapacityMcm && (
                                <div className="flex items-center gap-1 col-span-2">
                                    <Gauge className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-500">Capacity:</span>
                                    <span className="font-medium">{parseFloat(dam.reservoirCapacityMcm).toFixed(0)} MCM</span>
                                </div>
                            )}
                        </div>

                        {/* Location & Details */}
                        <div className="pt-2 border-t border-gray-100 space-y-1 text-xs">
                            {dam?.riverName && (
                                <div className="flex items-center gap-1">
                                    <Droplets className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-500">River:</span>
                                    <span className="text-gray-700">{dam.riverName}</span>
                                </div>
                            )}
                            {dam?.region?.name && (
                                <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-500">Region:</span>
                                    <span className="text-gray-700">{dam.region.name}</span>
                                </div>
                            )}
                            {dam?.yearCompleted && (
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-500">Completed:</span>
                                    <span className="text-gray-700">{dam.yearCompleted}</span>
                                </div>
                            )}
                            {dam?.operatorOrganization && (
                                <div className="flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-500">Operator:</span>
                                    <span className="text-gray-700 truncate max-w-[200px]">{dam.operatorOrganization}</span>
                                </div>
                            )}
                        </div>

                        {/* Emergency Contact */}
                        {dam?.emergencyPhone && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                                <div className="flex items-center gap-2 text-xs text-red-600">
                                    <Phone className="w-3 h-3" />
                                    <span className="font-medium">Emergency: {dam.emergencyPhone}</span>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
