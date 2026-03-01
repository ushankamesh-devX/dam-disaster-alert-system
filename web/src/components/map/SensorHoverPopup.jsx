import React, { useEffect, useState } from 'react';
import { Activity, Thermometer, Droplets, Gauge, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { getSensorById, getSensorReadings, getLatestReading } from '../../services/sensor.service';

const STATUS_CONFIG = {
    active: { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle, label: 'Active' },
    inactive: { color: 'text-gray-500', bg: 'bg-gray-100', icon: XCircle, label: 'Inactive' },
    faulty: { color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle, label: 'Faulty' },
    maintenance: { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertTriangle, label: 'Maintenance' },
    calibrating: { color: 'text-blue-600', bg: 'bg-blue-100', icon: Gauge, label: 'Calibrating' },
};

const SENSOR_ICONS = {
    water_level: Droplets,
    temperature: Thermometer,
    pressure: Gauge,
    flow_rate: Activity,
    default: Activity
};

export default function SensorHoverPopup({ sensorId, position, onClose }) {
    const [sensor, setSensor] = useState(null);
    const [latestReading, setLatestReading] = useState(null);
    const [readings, setReadings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!sensorId) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [sensorData, latest, readingsData] = await Promise.all([
                    getSensorById(sensorId),
                    getLatestReading(sensorId).catch(() => null),
                    getSensorReadings(sensorId, 0, 20).catch(() => ({ content: [] }))
                ]);

                setSensor(sensorData);
                setLatestReading(latest);
                
                // Transform readings for chart (reverse to show oldest first)
                const chartData = (readingsData.content || [])
                    .slice()
                    .reverse()
                    .map((r, idx) => ({
                        idx,
                        value: parseFloat(r.readingValue),
                        time: new Date(r.recordedAt).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        })
                    }));
                setReadings(chartData);
            } catch (err) {
                console.error('Failed to fetch sensor data:', err);
                setError('Failed to load sensor data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [sensorId]);

    if (!sensorId) return null;

    const statusConfig = STATUS_CONFIG[sensor?.status?.toLowerCase()] || STATUS_CONFIG.inactive;
    const StatusIcon = statusConfig.icon;
    const sensorTypeKey = sensor?.sensorType?.typeName?.toLowerCase()?.replace(/\s+/g, '_') || 'default';
    const SensorIcon = SENSOR_ICONS[sensorTypeKey] || SENSOR_ICONS.default;

    // Determine if value is in warning/critical range
    const isWarning = latestReading && sensor?.warningThreshold && 
        parseFloat(latestReading.readingValue) >= parseFloat(sensor.warningThreshold);
    const isCritical = latestReading && sensor?.criticalThreshold && 
        parseFloat(latestReading.readingValue) >= parseFloat(sensor.criticalThreshold);

    return (
        <div 
            className="fixed z-[9999] pointer-events-none"
            style={{ 
                left: position.x + 15, 
                top: position.y - 10,
            }}
        >
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-72 pointer-events-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-100 rounded-lg">
                            <SensorIcon className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 text-sm truncate max-w-[160px]">
                                {loading ? 'Loading...' : sensor?.name || 'Unknown Sensor'}
                            </h3>
                            <p className="text-xs text-gray-500">
                                {sensor?.sensorType?.typeName || 'Sensor'}
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
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                    </div>
                ) : error ? (
                    <div className="text-center py-4 text-red-500 text-sm">{error}</div>
                ) : (
                    <>
                        {/* Latest Reading */}
                        <div className={`rounded-lg p-2 mb-2 ${isCritical ? 'bg-red-50 border border-red-200' : isWarning ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">Latest Reading</span>
                                {latestReading && (
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(latestReading.recordedAt).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className={`text-2xl font-bold ${isCritical ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-gray-900'}`}>
                                    {latestReading ? parseFloat(latestReading.readingValue).toFixed(2) : '--'}
                                </span>
                                <span className="text-sm text-gray-500">
                                    {latestReading?.unit || sensor?.sensorType?.unit || ''}
                                </span>
                                {isCritical && <AlertTriangle className="w-4 h-4 text-red-500 ml-1" />}
                                {isWarning && !isCritical && <AlertTriangle className="w-4 h-4 text-yellow-500 ml-1" />}
                            </div>
                        </div>

                        {/* Thresholds */}
                        {(sensor?.warningThreshold || sensor?.criticalThreshold) && (
                            <div className="flex gap-2 mb-2 text-xs">
                                {sensor.warningThreshold && (
                                    <div className="flex items-center gap-1 text-yellow-600">
                                        <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                                        Warning: {parseFloat(sensor.warningThreshold).toFixed(1)}
                                    </div>
                                )}
                                {sensor.criticalThreshold && (
                                    <div className="flex items-center gap-1 text-red-600">
                                        <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                                        Critical: {parseFloat(sensor.criticalThreshold).toFixed(1)}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Mini Chart */}
                        {readings.length > 1 && (
                            <div className="mt-2">
                                <p className="text-xs text-gray-500 mb-1">Recent Readings</p>
                                <div className="h-24 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={readings} margin={{ top: 5, right: 5, bottom: 20, left: 35 }}>
                                            <XAxis 
                                                dataKey="time" 
                                                tick={{ fontSize: 9, fill: '#6b7280' }}
                                                tickLine={{ stroke: '#d1d5db' }}
                                                axisLine={{ stroke: '#d1d5db' }}
                                                interval="preserveStartEnd"
                                                angle={-45}
                                                textAnchor="end"
                                                height={20}
                                            />
                                            <YAxis 
                                                domain={['dataMin - 1', 'dataMax + 1']}
                                                tick={{ fontSize: 9, fill: '#6b7280' }}
                                                tickLine={{ stroke: '#d1d5db' }}
                                                axisLine={{ stroke: '#d1d5db' }}
                                                width={30}
                                                tickFormatter={(value) => value.toFixed(1)}
                                            />
                                            <Tooltip 
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow">
                                                                {payload[0].payload.time}: {payload[0].value.toFixed(2)}
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="value" 
                                                stroke="#10b981" 
                                                strokeWidth={2}
                                                dot={false}
                                                activeDot={{ r: 3, fill: '#10b981' }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Location & Details */}
                        <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                            {sensor?.locationOnDam && (
                                <div>
                                    <span className="text-gray-500">Location:</span>
                                    <span className="ml-1 text-gray-700">{sensor.locationOnDam}</span>
                                </div>
                            )}
                            {sensor?.damName && (
                                <div>
                                    <span className="text-gray-500">Dam:</span>
                                    <span className="ml-1 text-gray-700 truncate">{sensor.damName}</span>
                                </div>
                            )}
                            {sensor?.manufacturer && (
                                <div className="col-span-2">
                                    <span className="text-gray-500">Device:</span>
                                    <span className="ml-1 text-gray-700">{sensor.manufacturer} {sensor.model}</span>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
