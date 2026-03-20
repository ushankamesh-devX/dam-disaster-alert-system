import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Cpu, Map, MapPin, Hexagon, Square, Circle, Database, Code, Edit3, Save, Trash2, RefreshCw, Loader2, Download, Droplets } from 'lucide-react';
import GeomanMap, { AREA_COLORS } from '../../components/map/GeomanMap';
import { createHazardZone, updateHazardZone, deleteHazardZone, createGate, updateGate, deleteGate, getDamHazardZones, getDamGates, updateDam, deleteDam, getDamById } from '../../services/dam.service';
import { createSensor, updateSensor, deleteSensor, getSensorsByDam } from '../../services/sensor.service';
import toast from 'react-hot-toast';

export default function MapDetailedPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const damId = Number(id);

    const [dam, setDam] = useState(null);
    const [currentGeoJSON, setCurrentGeoJSON] = useState(null);
    const [initialGeoJSON, setInitialGeoJSON] = useState(null);
    const [mapKey, setMapKey] = useState(0);
    const [activeColor, setActiveColor] = useState(AREA_COLORS[0]);
    const [activeTabs, setActiveTabs] = useState({});
    const [loadingStates, setLoadingStates] = useState({});
    const [isLoadingData, setIsLoadingData] = useState(true);

    const mapFeatureGroupRef = useRef(null);

    const handleFeatureGroupRef = (ref) => {
        mapFeatureGroupRef.current = ref;
    };

    // Load dam info + all geo data on mount
    useEffect(() => {
        if (!damId) return;
        loadSavedData(damId);
    }, [damId]);

    const loadSavedData = async (dId) => {
        setIsLoadingData(true);
        try {
            const [hazardZones, gates, sensors, currentDam] = await Promise.all([
                getDamHazardZones(dId).catch(() => []),
                getDamGates(dId).catch(() => []),
                getSensorsByDam(dId).catch(() => []),
                getDamById(dId).catch(() => null),
            ]);

            if (currentDam) setDam(currentDam);

            const features = [];

            hazardZones.forEach(zone => {
                if (zone.boundaryGeojson) {
                    try {
                        const geometry = typeof zone.boundaryGeojson === 'string'
                            ? JSON.parse(zone.boundaryGeojson)
                            : zone.boundaryGeojson;
                        features.push({
                            type: 'Feature',
                            geometry,
                            properties: {
                                type: geometry.type === 'Polygon' ? 'polygon' : 'rectangle',
                                dbId: zone.id, damId: zone.damId,
                                hazardLevelId: zone.hazardLevelId,
                                zoneCode: zone.zoneCode, zoneName: zone.zoneName,
                                zoneNameSi: zone.zoneNameSi, description: zone.description,
                                boundaryGeojson: typeof zone.boundaryGeojson === 'string' ? zone.boundaryGeojson : JSON.stringify(zone.boundaryGeojson),
                                centerLatitude: zone.centerLatitude, centerLongitude: zone.centerLongitude,
                                areaSqKm: zone.areaSqKm, distanceFromDamKm: zone.distanceFromDamKm,
                                estimatedFloodArrivalMinutes: zone.estimatedFloodArrivalMinutes,
                                estimatedWaterDepthMeters: zone.estimatedWaterDepthMeters,
                                fillColor: zone.fillColor || '#fca5a5', fillOpacity: zone.fillOpacity || 0.4,
                                strokeColor: zone.strokeColor || '#ef4444', strokeWidth: zone.strokeWidth || 2,
                                displayOrder: zone.displayOrder, showLabel: zone.showLabel, isActive: zone.isActive,
                            },
                        });
                    } catch (e) { console.error('Failed to parse hazard zone geometry:', e); }
                }
            });

            gates.forEach(gate => {
                if (gate.latitude && gate.longitude) {
                    features.push({
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [parseFloat(gate.longitude), parseFloat(gate.latitude)] },
                        properties: {
                            type: 'gateCircle', dbId: gate.id, damId: gate.damId,
                            gateNumber: gate.gateNumber, gateType: gate.gateType?.toLowerCase() || 'radial',
                            latitude: parseFloat(gate.latitude), longitude: parseFloat(gate.longitude),
                            maxOpeningMeters: parseFloat(gate.maxOpeningMeters) || 12.5,
                            currentOpeningMeters: parseFloat(gate.currentOpeningMeters) || 0.0,
                            status: gate.status?.toLowerCase() || 'closed',
                        },
                    });
                }
            });

            sensors.forEach(sensor => {
                if (sensor.latitude && sensor.longitude) {
                    features.push({
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [sensor.longitude, sensor.latitude] },
                        properties: {
                            type: 'sensorCircle', dbId: sensor.id,
                            sensorUid: sensor.sensorUid, damId: sensor.damId,
                            sensorTypeId: sensor.sensorTypeId, name: sensor.name,
                            description: sensor.description, locationOnDam: sensor.locationOnDam,
                            latitude: sensor.latitude, longitude: sensor.longitude,
                            elevationMeters: sensor.elevationMeters, manufacturer: sensor.manufacturer,
                            model: sensor.model, serialNumber: sensor.serialNumber,
                            installationDate: sensor.installationDate, calibrationDate: sensor.calibrationDate,
                            nextCalibrationDate: sensor.nextCalibrationDate,
                            minReading: sensor.minReading, maxReading: sensor.maxReading,
                            warningThreshold: sensor.warningThreshold, criticalThreshold: sensor.criticalThreshold,
                            readingIntervalSeconds: sensor.readingIntervalSeconds, status: sensor.status,
                        },
                    });
                }
            });

            if (currentDam && currentDam.latitude && currentDam.longitude) {
                features.push({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [parseFloat(currentDam.longitude), parseFloat(currentDam.latitude)] },
                    properties: {
                        type: 'damCircle', dbId: currentDam.id, damId: currentDam.id,
                        latitude: parseFloat(currentDam.latitude), longitude: parseFloat(currentDam.longitude)
                    }
                });
            }

            if (features.length > 0) {
                const geoJSON = { type: 'FeatureCollection', features };
                setInitialGeoJSON(JSON.stringify(geoJSON));
                setCurrentGeoJSON(JSON.stringify(geoJSON));
                setMapKey(prev => prev + 1);
                toast.success(`Loaded ${features.length} entities from database`);
            } else {
                setInitialGeoJSON(null);
                setCurrentGeoJSON(null);
                setMapKey(prev => prev + 1);
            }
        } catch (error) {
            console.error('Failed to load saved data:', error);
            toast.error('Failed to load saved data from database');
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleMapChange = (geojson) => {
        if (geojson) {
            try {
                const parsed = JSON.parse(geojson);
                let modified = false;
                parsed.features = parsed.features.map((feature, index) => {
                    const type = feature.properties?.type || feature.geometry.type;
                    if (type === 'polygon' || type === 'rectangle' || feature.geometry.type === 'Polygon') {
                        if (!feature.properties.zoneCode) {
                            modified = true;
                            const defaultColor = feature.properties.color || AREA_COLORS[0];
                            feature.properties = {
                                ...feature.properties,
                                damId,
                                hazardLevelId: 1,
                                zoneCode: `Z${Date.now().toString(36).toUpperCase()}`,
                                zoneName: 'Hazard Zone',
                                zoneNameSi: null, description: null,
                                boundaryGeojson: JSON.stringify(feature.geometry),
                                centerLatitude: feature.geometry.coordinates[0][0][1],
                                centerLongitude: feature.geometry.coordinates[0][0][0],
                                areaSqKm: 0, distanceFromDamKm: 0,
                                estimatedFloodArrivalMinutes: 5, estimatedWaterDepthMeters: 5.0,
                                fillColor: defaultColor.fill, fillOpacity: 0.4,
                                strokeColor: defaultColor.border, strokeWidth: 2,
                                displayOrder: index + 1, showLabel: true, isActive: true,
                            };
                        } else {
                            feature.properties.boundaryGeojson = JSON.stringify(feature.geometry);
                            if (feature.geometry.coordinates && feature.geometry.coordinates[0]) {
                                const coords = feature.geometry.coordinates[0];
                                feature.properties.centerLatitude = coords.reduce((s, c) => s + c[1], 0) / coords.length;
                                feature.properties.centerLongitude = coords.reduce((s, c) => s + c[0], 0) / coords.length;
                            }
                            modified = true;
                        }
                    } else if (type === 'damCircle') {
                        if (!feature.properties.dbId) {
                            modified = true;
                            feature.properties = {
                                ...feature.properties,
                                dbId: damId, damId: damId,
                                latitude: feature.geometry.coordinates[1],
                                longitude: feature.geometry.coordinates[0]
                            };
                        } else {
                            feature.properties.latitude = feature.geometry.coordinates[1];
                            feature.properties.longitude = feature.geometry.coordinates[0];
                            modified = true;
                        }
                    } else if (type === 'gateCircle') {
                        if (!feature.properties.gateNumber) {
                            modified = true;
                            const initials = (dam?.name || '').split(' ').filter(Boolean).map(w => w[0].toUpperCase()).join('');
                            const uniqueSuffix = Math.floor(100 + Math.random() * 900);
                            feature.properties = {
                                ...feature.properties,
                                damId,
                                gateNumber: `${initials}-G${uniqueSuffix}`,
                                gateType: 'radial', maxOpeningMeters: 12.5,
                                currentOpeningMeters: 0.0, status: 'closed',
                                latitude: feature.geometry.coordinates[1],
                                longitude: feature.geometry.coordinates[0],
                            };
                        } else {
                            feature.properties.latitude = feature.geometry.coordinates[1];
                            feature.properties.longitude = feature.geometry.coordinates[0];
                            modified = true;
                        }
                    } else if (type === 'sensorCircle') {
                        if (!feature.properties.sensorUid) {
                            modified = true;
                            const initials = (dam?.name || '').split(' ').filter(Boolean).map(w => w[0].toUpperCase()).join('');
                            const uniqueSuffix = Math.floor(100 + Math.random() * 900);
                            feature.properties = {
                                ...feature.properties,
                                sensorUid: `${initials}-S${uniqueSuffix}`,
                                damId,
                                sensorTypeId: 1,
                                name: `Sensor ${index + 1}`,
                                description: 'Description', locationOnDam: 'Location',
                                latitude: feature.geometry.coordinates[1],
                                longitude: feature.geometry.coordinates[0],
                                elevationMeters: 0.0, manufacturer: '', model: '', serialNumber: '',
                                installationDate: new Date().toISOString().split('T')[0],
                                calibrationDate: new Date().toISOString().split('T')[0],
                                nextCalibrationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                                minReading: 0.0, maxReading: 100.0,
                                warningThreshold: 80.0, criticalThreshold: 90.0,
                                readingIntervalSeconds: 60, status: 'active',
                            };
                        } else {
                            feature.properties.latitude = feature.geometry.coordinates[1];
                            feature.properties.longitude = feature.geometry.coordinates[0];
                            modified = true;
                        }
                    }
                    return feature;
                });
                if (modified) { setCurrentGeoJSON(JSON.stringify(parsed)); return; }
            } catch (e) { console.error('Error patching GeoJSON properties', e); }
        }
        setCurrentGeoJSON(geojson);
    };

    const formatCoordinates = (geometry) => {
        if (!geometry) return '';
        if (geometry.type === 'Point') return `${geometry.coordinates[1].toFixed(4)}, ${geometry.coordinates[0].toFixed(4)}`;
        if (geometry.type === 'Polygon') return `${geometry.coordinates[0].length} points`;
        return 'Multiple points';
    };

    const toggleTab = (idx, tab) => setActiveTabs(prev => ({ ...prev, [idx]: tab }));

    const handlePropertyChange = (idx, field, value) => {
        if (!currentGeoJSON) return;
        try {
            const parsed = JSON.parse(currentGeoJSON);
            const feature = parsed.features[idx];
            if (feature) {
                feature.properties[field] = value;
                if (field === 'fillColor' || field === 'strokeColor' || field === 'fillOpacity') {
                    if (mapFeatureGroupRef.current) {
                        const layers = Object.values(mapFeatureGroupRef.current._layers || {});
                        if (layers[idx]) {
                            layers[idx].setStyle({
                                fillColor: feature.properties.fillColor,
                                color: feature.properties.strokeColor,
                                fillOpacity: feature.properties.fillOpacity || 0.4,
                            });
                        }
                    }
                }
                setCurrentGeoJSON(JSON.stringify(parsed));
            }
        } catch (e) { console.error(e); }
    };

    const setLoading = (idx, action, isLoading) => {
        setLoadingStates(prev => ({ ...prev, [idx]: { ...prev[idx], [action]: isLoading } }));
    };

    const isSaved = (feature) => feature.properties?.dbId != null;

    const updateFeatureDbId = (idx, newDbId) => {
        if (!currentGeoJSON) return;
        try {
            const parsed = JSON.parse(currentGeoJSON);
            if (parsed.features[idx]) { parsed.features[idx].properties.dbId = newDbId; setCurrentGeoJSON(JSON.stringify(parsed)); }
        } catch (e) { console.error(e); }
    };

    const removeFeatureFromMap = (idx) => {
        if (!currentGeoJSON) return;
        try {
            const parsed = JSON.parse(currentGeoJSON);
            parsed.features.splice(idx, 1);
            setCurrentGeoJSON(parsed.features.length > 0 ? JSON.stringify(parsed) : null);
            if (mapFeatureGroupRef.current) {
                const layers = Object.values(mapFeatureGroupRef.current._layers || {});
                if (layers[idx]) mapFeatureGroupRef.current.removeLayer(layers[idx]);
            }
        } catch (e) { console.error(e); }
    };

    const handleSave = async (idx, feature) => {
        const type = feature.properties?.type || feature.geometry.type;
        setLoading(idx, 'save', true);
        try {
            if (type === 'polygon' || type === 'rectangle' || feature.geometry.type === 'Polygon') {
                const payload = {
                    damId: feature.properties.damId,
                    hazardLevelId: feature.properties.hazardLevelId,
                    zoneCode: feature.properties.zoneCode,
                    zoneName: feature.properties.zoneName,
                    zoneNameSi: feature.properties.zoneNameSi || null,
                    description: feature.properties.description || null,
                    boundaryGeojson: feature.properties.boundaryGeojson || JSON.stringify(feature.geometry),
                    centerLatitude: feature.properties.centerLatitude,
                    centerLongitude: feature.properties.centerLongitude,
                    areaSqKm: feature.properties.areaSqKm || null,
                    distanceFromDamKm: feature.properties.distanceFromDamKm || null,
                    estimatedFloodArrivalMinutes: feature.properties.estimatedFloodArrivalMinutes || null,
                    estimatedWaterDepthMeters: feature.properties.estimatedWaterDepthMeters || null,
                    fillColor: feature.properties.fillColor || null,
                    fillOpacity: feature.properties.fillOpacity || null,
                    strokeColor: feature.properties.strokeColor || null,
                    strokeWidth: feature.properties.strokeWidth || null,
                    displayOrder: feature.properties.displayOrder || null,
                    showLabel: feature.properties.showLabel !== false,
                    isActive: feature.properties.isActive !== false,
                };
                const result = await createHazardZone(payload);
                updateFeatureDbId(idx, result.id);
                toast.success(`Hazard Zone "${payload.zoneName}" saved successfully!`);
            } else if (type === 'gateCircle') {
                const payload = {
                    damId: feature.properties.damId,
                    gateNumber: feature.properties.gateNumber,
                    gateType: feature.properties.gateType,
                    latitude: feature.properties.latitude,
                    longitude: feature.properties.longitude,
                    maxOpeningMeters: feature.properties.maxOpeningMeters || 12.5,
                    currentOpeningMeters: feature.properties.currentOpeningMeters || 0,
                    status: feature.properties.status || 'closed',
                };
                const result = await createGate(payload);
                updateFeatureDbId(idx, result.id);
                toast.success(`Gate "${payload.gateNumber}" saved successfully!`);
            } else if (type === 'sensorCircle' || type === 'circleMarker') {
                const payload = {
                    sensorUid: feature.properties.sensorUid,
                    damId: feature.properties.damId,
                    sensorTypeId: feature.properties.sensorTypeId,
                    name: feature.properties.name,
                    description: feature.properties.description || null,
                    locationOnDam: feature.properties.locationOnDam || null,
                    latitude: feature.properties.latitude,
                    longitude: feature.properties.longitude,
                    elevationMeters: feature.properties.elevationMeters || 0,
                    manufacturer: feature.properties.manufacturer || null,
                    model: feature.properties.model || null,
                    serialNumber: feature.properties.serialNumber || null,
                    installationDate: feature.properties.installationDate || null,
                    calibrationDate: feature.properties.calibrationDate || null,
                    nextCalibrationDate: feature.properties.nextCalibrationDate || null,
                    minReading: feature.properties.minReading || 0,
                    maxReading: feature.properties.maxReading || 100,
                    warningThreshold: feature.properties.warningThreshold || 80,
                    criticalThreshold: feature.properties.criticalThreshold || 90,
                    readingIntervalSeconds: feature.properties.readingIntervalSeconds || 60,
                    status: feature.properties.status || 'active',
                };
                const result = await createSensor(payload);
                updateFeatureDbId(idx, result.id);
                toast.success(`Sensor "${payload.name}" saved successfully!`);
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to save entity';
            toast.error(errorMsg);
        } finally { setLoading(idx, 'save', false); }
    };

    const handleUpdate = async (idx, feature) => {
        const type = feature.properties?.type || feature.geometry.type;
        const dbId = feature.properties?.dbId;
        if (!dbId) { toast.error('Entity not saved yet. Please save first.'); return; }
        setLoading(idx, 'update', true);
        try {
            if (type === 'polygon' || type === 'rectangle' || feature.geometry.type === 'Polygon') {
                const updatedBoundaryGeojson = JSON.stringify(feature.geometry);
                let centerLat = feature.properties.centerLatitude;
                let centerLng = feature.properties.centerLongitude;
                if (feature.geometry.coordinates && feature.geometry.coordinates[0]) {
                    const coords = feature.geometry.coordinates[0];
                    centerLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
                    centerLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
                }
                const payload = {
                    hazardLevelId: feature.properties.hazardLevelId,
                    zoneName: feature.properties.zoneName,
                    zoneNameSi: feature.properties.zoneNameSi || null,
                    description: feature.properties.description || null,
                    boundaryGeojson: updatedBoundaryGeojson,
                    centerLatitude: centerLat, centerLongitude: centerLng,
                    areaSqKm: feature.properties.areaSqKm || 0,
                    distanceFromDamKm: feature.properties.distanceFromDamKm || 0,
                    estimatedFloodArrivalMinutes: feature.properties.estimatedFloodArrivalMinutes,
                    estimatedWaterDepthMeters: feature.properties.estimatedWaterDepthMeters,
                    fillColor: feature.properties.fillColor, fillOpacity: feature.properties.fillOpacity,
                    strokeColor: feature.properties.strokeColor, strokeWidth: feature.properties.strokeWidth,
                    displayOrder: feature.properties.displayOrder,
                    showLabel: feature.properties.showLabel, isActive: feature.properties.isActive,
                };
                feature.properties.boundaryGeojson = updatedBoundaryGeojson;
                feature.properties.centerLatitude = centerLat;
                feature.properties.centerLongitude = centerLng;
                await updateHazardZone(dbId, payload);
                toast.success(`Hazard Zone "${feature.properties.zoneName}" updated!`);
                loadSavedData(damId);
            } else if (type === 'damCircle') {
                await updateDam(dbId, {
                    latitude: feature.properties.latitude,
                    longitude: feature.properties.longitude
                });
                toast.success(`Dam Location updated!`);
                loadSavedData(damId);
            } else if (type === 'gateCircle') {
                await updateGate(dbId, {
                    gateType: feature.properties.gateType,
                    latitude: feature.properties.latitude, longitude: feature.properties.longitude,
                    maxOpeningMeters: feature.properties.maxOpeningMeters,
                    currentOpeningMeters: feature.properties.currentOpeningMeters,
                    status: feature.properties.status,
                });
                toast.success(`Gate "${feature.properties.gateNumber}" updated!`);
                loadSavedData(damId);
            } else if (type === 'sensorCircle' || type === 'circleMarker') {
                await updateSensor(dbId, {
                    name: feature.properties.name, description: feature.properties.description,
                    locationOnDam: feature.properties.locationOnDam,
                    latitude: feature.properties.latitude, longitude: feature.properties.longitude,
                    elevationMeters: feature.properties.elevationMeters,
                    manufacturer: feature.properties.manufacturer, model: feature.properties.model,
                    serialNumber: feature.properties.serialNumber,
                    calibrationDate: feature.properties.calibrationDate,
                    nextCalibrationDate: feature.properties.nextCalibrationDate,
                    minReading: feature.properties.minReading, maxReading: feature.properties.maxReading,
                    warningThreshold: feature.properties.warningThreshold,
                    criticalThreshold: feature.properties.criticalThreshold,
                    readingIntervalSeconds: feature.properties.readingIntervalSeconds,
                    status: feature.properties.status,
                });
                toast.success(`Sensor "${feature.properties.name}" updated!`);
                loadSavedData(damId);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update entity');
        } finally { setLoading(idx, 'update', false); }
    };

    const handleDelete = async (idx, feature) => {
        const type = feature.properties?.type || feature.geometry.type;
        const dbId = feature.properties?.dbId;
        const entityName = type === 'polygon' || type === 'rectangle' ? 'Hazard Zone' : type === 'gateCircle' ? 'Gate' : type === 'damCircle' ? 'Dam Location' : 'Sensor';
        if (!confirm(`Are you sure you want to delete this ${entityName}?`)) return;
        setLoading(idx, 'delete', true);
        try {
            if (dbId) {
                if (type === 'damCircle') {
                    toast.error('Cannot delete Dam Location. You can only move it.');
                    setLoading(idx, 'delete', false);
                    return;
                }
                else if (type === 'polygon' || type === 'rectangle' || feature.geometry.type === 'Polygon') { await deleteHazardZone(dbId); toast.success('Hazard Zone deleted!'); }
                else if (type === 'gateCircle') { await deleteGate(dbId); toast.success('Gate deleted!'); }
                else if (type === 'sensorCircle') { await deleteSensor(dbId); toast.success('Sensor deleted!'); }
            }
            removeFeatureFromMap(idx);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete entity');
        } finally { setLoading(idx, 'delete', false); }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] gap-4">
            {/* Header */}
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <button
                        onClick={() => navigate(`/admin/dams/${id}`)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 mb-1.5 transition"
                    >
                        ← Back to Dam
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3">
                        {dam ? `${dam.name} — Map & Layout` : 'Map & Layout'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5 pl-4 flex items-center gap-2">
                        <Cpu className="w-4 h-4" />
                        Draw, edit and manage hazard zones, gates and sensors on the map
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => loadSavedData(damId)}
                        disabled={isLoadingData}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isLoadingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Reload
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
                {/* Map Section */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col min-h-[500px]">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">Interactive Map</h2>
                        {isLoadingData && (
                            <span className="text-sm text-blue-600 flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading saved data...
                            </span>
                        )}
                    </div>
                    <div className="flex-1 w-full rounded border border-gray-300 overflow-hidden isolate relative z-0">
                        <GeomanMap
                            key={mapKey}
                            onMapChange={handleMapChange}
                            activeAreaColor={activeColor}
                            height="100%"
                            initialGeoJson={initialGeoJSON}
                            onFeatureGroupReady={handleFeatureGroupRef}
                        />
                    </div>
                </div>

                {/* Entities Panel */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">Map Entities</h2>
                            <p className="text-xs text-gray-500 mt-1">Manage drawn elements</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Draw Color</span>
                            <div className="flex gap-1.5">
                                {AREA_COLORS.map(color => (
                                    <button
                                        key={color.id}
                                        onClick={() => setActiveColor(color)}
                                        title={color.name}
                                        className={`w-5 h-5 rounded-full border-2 transition-transform ${activeColor.id === color.id ? 'scale-125 ring-2 ring-blue-500 ring-offset-1' : 'hover:scale-110'}`}
                                        style={{ backgroundColor: color.fill, borderColor: color.border }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 p-4 bg-white overflow-y-auto space-y-3">
                        {(() => {
                            let features = [];
                            if (currentGeoJSON) {
                                try { features = JSON.parse(currentGeoJSON).features || []; } catch (e) { }
                            }
                            if (features.length === 0) {
                                return (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 italic text-center gap-3 p-8">
                                        <Map className="w-10 h-10 opacity-20" />
                                        <p className="text-sm border-t border-gray-100 pt-4">Draw shapes on the map to see them listed here.</p>
                                    </div>
                                );
                            }
                            return features.map((feature, idx) => {
                                const type = feature.properties?.type || feature.geometry.type;
                                const isPolygon = type === 'polygon' || type === 'rectangle' || feature.geometry.type === 'Polygon';
                                const isSensor = type === 'sensorCircle';
                                const isGate = type === 'gateCircle';
                                const isDam = type === 'damCircle';
                                const currentTab = activeTabs[idx] || 'data';

                                let Icon = MapPin;
                                let title = 'Marker';
                                let typeColor = 'text-gray-500';
                                if (type === 'polygon' || feature.geometry.type === 'Polygon') { Icon = Hexagon; title = 'Polygon Area'; typeColor = 'text-blue-500'; }
                                else if (type === 'rectangle') { Icon = Square; title = 'Rectangular Area'; typeColor = 'text-purple-500'; }
                                else if (type === 'damCircle') { Icon = Droplets; title = 'Dam Location'; typeColor = 'text-blue-700'; }
                                else if (type === 'gateCircle') { Icon = Circle; title = 'Dam Gate'; typeColor = 'text-amber-600'; }
                                else if (type === 'sensorCircle') { Icon = MapPin; title = 'Sensor Location'; typeColor = 'text-green-600'; }

                                return (
                                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2">
                                        <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                                            <div className="flex items-center gap-2 font-medium text-gray-800">
                                                <div className="p-1.5 bg-white rounded-md shadow-sm border border-gray-100">
                                                    <Icon className={`w-4 h-4 ${typeColor}`} />
                                                </div>
                                                <span className="text-sm">{title} <span className="text-xs text-gray-400 font-normal ml-1">#{idx + 1}</span></span>
                                            </div>
                                            {isPolygon && feature.properties ? (
                                                <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: feature.properties.fillColor, borderColor: feature.properties.strokeColor }} title={feature.properties.zoneName} />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full bg-gray-200 border border-gray-300 shadow-sm" />
                                            )}
                                        </div>

                                        {/* Tabs */}
                                        <div className="flex gap-1 border-b border-gray-200 mt-1 overflow-x-auto">
                                            <button onClick={() => toggleTab(idx, 'data')} className={`flex items-center whitespace-nowrap gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors border-b-2 ${currentTab === 'data' ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'} rounded-t-md`}>
                                                <Database className="w-3.5 h-3.5" /> Data
                                            </button>
                                            {(isPolygon || isSensor || isGate) && (
                                                <button onClick={() => toggleTab(idx, 'edit')} className={`flex items-center whitespace-nowrap gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors border-b-2 ${currentTab === 'edit' ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'} rounded-t-md`}>
                                                    <Edit3 className="w-3.5 h-3.5" /> Edit Props
                                                </button>
                                            )}
                                            <button onClick={() => toggleTab(idx, 'json')} className={`flex items-center whitespace-nowrap gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors border-b-2 ${currentTab === 'json' ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'} rounded-t-md`}>
                                                <Code className="w-3.5 h-3.5" /> JSON
                                            </button>
                                        </div>

                                        {/* Tab Content */}
                                        <div className="bg-white border flex flex-col justify-center border-gray-100 rounded-lg p-2 min-h-[64px]">
                                            {currentTab === 'data' ? (
                                                <div className="flex flex-col gap-1.5 text-xs text-gray-600">
                                                    <div className="flex justify-between items-center px-1">
                                                        <span className="font-semibold text-gray-500">Geometry:</span>
                                                        <span className="px-2 py-0.5 bg-gray-50 border border-gray-200 rounded-md text-[10px] font-mono">{feature.geometry.type}</span>
                                                    </div>
                                                    {isPolygon && feature.properties?.zoneName && (
                                                        <div className="flex justify-between items-center px-1 mt-1">
                                                            <span className="font-semibold text-gray-500">Zone Name:</span>
                                                            <span className="text-gray-800 font-medium">{feature.properties.zoneName}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-center mt-1 px-1">
                                                        <span className="font-semibold text-gray-500">Coordinates:</span>
                                                        <span className="truncate ml-4 font-mono bg-gray-50 px-2 py-0.5 border border-gray-200 rounded-md text-[10px]">{formatCoordinates(feature.geometry)}</span>
                                                    </div>
                                                </div>
                                            ) : currentTab === 'edit' && isPolygon ? (
                                                <div className="flex flex-col gap-3 text-xs overflow-y-auto max-h-[300px] pr-1">
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded border border-gray-100">
                                                        {[
                                                            { label: 'Level ID', field: 'hazardLevelId', type: 'number' },
                                                            { label: 'Zone Code', field: 'zoneCode', type: 'text' },
                                                            { label: 'Zone Name', field: 'zoneName', type: 'text' },
                                                            { label: 'Name (Sinhala)', field: 'zoneNameSi', type: 'text', placeholder: 'සිංහල...' },
                                                        ].map(({ label, field, type: t, placeholder }) => (
                                                            <div key={field} className="flex flex-col gap-1">
                                                                <label className="text-[10px] font-semibold text-gray-500 uppercase">{label}</label>
                                                                <input type={t} value={feature.properties[field] || ''} onChange={e => handlePropertyChange(idx, field, t === 'number' ? parseInt(e.target.value) : e.target.value)} placeholder={placeholder} className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
                                                            </div>
                                                        ))}
                                                        <div className="flex flex-col gap-1 col-span-2">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Description</label>
                                                            <input type="text" value={feature.properties.description || ''} onChange={e => handlePropertyChange(idx, 'description', e.target.value)} className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded border border-gray-100">
                                                        {[
                                                            { label: 'Area (SqKm)', field: 'areaSqKm', step: '0.1' },
                                                            { label: 'Dist from Dam (Km)', field: 'distanceFromDamKm', step: '0.1' },
                                                            { label: 'Flood Arrival (Min)', field: 'estimatedFloodArrivalMinutes', step: '1' },
                                                            { label: 'Depth (Meters)', field: 'estimatedWaterDepthMeters', step: '0.1' },
                                                        ].map(({ label, field, step }) => (
                                                            <div key={field} className="flex flex-col gap-1">
                                                                <label className="text-[10px] font-semibold text-gray-500 uppercase">{label}</label>
                                                                <input type="number" step={step} value={feature.properties[field] || 0} onChange={e => handlePropertyChange(idx, field, parseFloat(e.target.value))} className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded border border-gray-100">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Fill Color</label>
                                                            <input type="color" value={feature.properties.fillColor || '#fca5a5'} onChange={e => handlePropertyChange(idx, 'fillColor', e.target.value)} className="w-full h-8 px-1 rounded border border-gray-200 cursor-pointer bg-white" />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Stroke Color</label>
                                                            <input type="color" value={feature.properties.strokeColor || '#ef4444'} onChange={e => handlePropertyChange(idx, 'strokeColor', e.target.value)} className="w-full h-8 px-1 rounded border border-gray-200 cursor-pointer bg-white" />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Fill Opacity</label>
                                                            <input type="number" step="0.1" min="0" max="1" value={feature.properties.fillOpacity || 0.4} onChange={e => handlePropertyChange(idx, 'fillOpacity', parseFloat(e.target.value))} className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400" />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Stroke Width</label>
                                                            <input type="number" min="0" value={feature.properties.strokeWidth || 2} onChange={e => handlePropertyChange(idx, 'strokeWidth', parseInt(e.target.value))} className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400" />
                                                        </div>
                                                        <div className="flex flex-col gap-2 col-span-2">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="checkbox" checked={feature.properties.showLabel !== false} onChange={e => handlePropertyChange(idx, 'showLabel', e.target.checked)} className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300" />
                                                                <span className="text-[11px] font-medium text-gray-700">Show Label</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="checkbox" checked={feature.properties.isActive !== false} onChange={e => handlePropertyChange(idx, 'isActive', e.target.checked)} className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300" />
                                                                <span className="text-[11px] font-medium text-gray-700">Is Active</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : currentTab === 'edit' && isSensor ? (
                                                <div className="flex flex-col gap-3 text-xs overflow-y-auto max-h-[300px] pr-1">
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded border border-gray-100">
                                                        {[
                                                            { label: 'Sensor UID', field: 'sensorUid', type: 'text' },
                                                            { label: 'Type ID', field: 'sensorTypeId', type: 'number' },
                                                            { label: 'Name', field: 'name', type: 'text' },
                                                        ].map(({ label, field, type: t }) => (
                                                            <div key={field} className="flex flex-col gap-1">
                                                                <label className="text-[10px] font-semibold text-gray-500 uppercase">{label}</label>
                                                                <input type={t} value={feature.properties[field] || ''} onChange={e => handlePropertyChange(idx, field, t === 'number' ? parseInt(e.target.value) : e.target.value)} className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400" />
                                                            </div>
                                                        ))}
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Status</label>
                                                            <select value={feature.properties.status || 'active'} onChange={e => handlePropertyChange(idx, 'status', e.target.value)} className="px-2 py-1.5 rounded border border-gray-200 bg-white focus:outline-none focus:border-blue-400">
                                                                <option value="active">Active</option>
                                                                <option value="inactive">Inactive</option>
                                                                <option value="maintenance">Maintenance</option>
                                                                <option value="offline">Offline</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Location on Dam</label>
                                                            <input type="text" value={feature.properties.locationOnDam || ''} onChange={e => handlePropertyChange(idx, 'locationOnDam', e.target.value)} className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400" />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Description</label>
                                                            <input type="text" value={feature.properties.description || ''} onChange={e => handlePropertyChange(idx, 'description', e.target.value)} className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400" />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded border border-gray-100">
                                                        {[
                                                            { label: 'Manufacturer', field: 'manufacturer' },
                                                            { label: 'Model', field: 'model' },
                                                            { label: 'Serial Number', field: 'serialNumber' },
                                                        ].map(({ label, field }) => (
                                                            <div key={field} className="flex flex-col gap-1">
                                                                <label className="text-[10px] font-semibold text-gray-500 uppercase">{label}</label>
                                                                <input type="text" value={feature.properties[field] || ''} onChange={e => handlePropertyChange(idx, field, e.target.value)} className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400" />
                                                            </div>
                                                        ))}
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Elevation (m)</label>
                                                            <input type="number" step="0.1" value={feature.properties.elevationMeters || 0} onChange={e => handlePropertyChange(idx, 'elevationMeters', parseFloat(e.target.value))} className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400" />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded border border-gray-100">
                                                        {[
                                                            { label: 'Min Reading', field: 'minReading' },
                                                            { label: 'Max Reading', field: 'maxReading' },
                                                            { label: 'Warning Thr.', field: 'warningThreshold' },
                                                            { label: 'Critical Thr.', field: 'criticalThreshold' },
                                                            { label: 'Interval (sec)', field: 'readingIntervalSeconds', isInt: true },
                                                        ].map(({ label, field, isInt }) => (
                                                            <div key={field} className="flex flex-col gap-1">
                                                                <label className="text-[10px] font-semibold text-gray-500 uppercase">{label}</label>
                                                                <input type="number" step={isInt ? '1' : '0.1'} value={feature.properties[field] || 0} onChange={e => handlePropertyChange(idx, field, isInt ? parseInt(e.target.value) : parseFloat(e.target.value))} className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded border border-gray-100">
                                                        {[
                                                            { label: 'Installation Date', field: 'installationDate' },
                                                            { label: 'Calibration Date', field: 'calibrationDate' },
                                                            { label: 'Next Calibration', field: 'nextCalibrationDate' },
                                                        ].map(({ label, field }) => (
                                                            <div key={field} className="flex flex-col gap-1">
                                                                <label className="text-[10px] font-semibold text-gray-500 uppercase">{label}</label>
                                                                <input type="date" value={feature.properties[field] || ''} onChange={e => handlePropertyChange(idx, field, e.target.value)} className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 text-xs" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : currentTab === 'edit' && isGate ? (
                                                <div className="flex flex-col gap-3 text-xs overflow-y-auto max-h-[300px] pr-1">
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-amber-50 rounded border border-amber-100">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Gate Number</label>
                                                            <input type="text" value={feature.properties.gateNumber || ''} onChange={e => handlePropertyChange(idx, 'gateNumber', e.target.value)} placeholder="G01" className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-amber-400" />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Gate Type</label>
                                                            <select value={feature.properties.gateType || 'radial'} onChange={e => handlePropertyChange(idx, 'gateType', e.target.value)} className="px-2 py-1.5 rounded border border-gray-200 bg-white focus:outline-none focus:border-amber-400">
                                                                <option value="radial">Radial</option>
                                                                <option value="vertical">Vertical</option>
                                                                <option value="drum">Drum</option>
                                                                <option value="flap">Flap</option>
                                                                <option value="sluice">Sluice</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Max Opening (m)</label>
                                                            <input type="number" step="0.1" value={feature.properties.maxOpeningMeters || 0} onChange={e => handlePropertyChange(idx, 'maxOpeningMeters', parseFloat(e.target.value))} className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-amber-400" />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Current Opening (m)</label>
                                                            <input type="number" step="0.1" value={feature.properties.currentOpeningMeters || 0} onChange={e => handlePropertyChange(idx, 'currentOpeningMeters', parseFloat(e.target.value))} className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-amber-400" />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Status</label>
                                                            <select value={feature.properties.status || 'closed'} onChange={e => handlePropertyChange(idx, 'status', e.target.value)} className="px-2 py-1.5 rounded border border-gray-200 bg-white focus:outline-none focus:border-amber-400">
                                                                <option value="closed">Closed</option>
                                                                <option value="partial">Partial</option>
                                                                <option value="fully_open">Fully Open</option>
                                                                <option value="maintenance">Maintenance</option>
                                                                <option value="jammed">Jammed</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Latitude</label>
                                                            <input type="number" step="0.0001" value={feature.properties.latitude || 0} readOnly className="px-2 py-1.5 rounded border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed" />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Longitude</label>
                                                            <input type="number" step="0.0001" value={feature.properties.longitude || 0} readOnly className="px-2 py-1.5 rounded border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto overflow-y-auto max-h-[300px] text-[10px] font-mono text-gray-700 p-1">
                                                    <pre className="whitespace-pre-wrap leading-relaxed">
                                                        {JSON.stringify((isPolygon || isSensor || isGate || isDam) && feature.properties ? feature.properties : feature, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        {(isPolygon || isSensor || isGate || isDam) && (
                                            <div className="flex gap-2 pt-2 border-t border-gray-200 mt-1">
                                                {!isSaved(feature) ? (
                                                    <button onClick={() => handleSave(idx, feature)} disabled={loadingStates[idx]?.save} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50">
                                                        {loadingStates[idx]?.save ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                        Save to DB
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleUpdate(idx, feature)} disabled={loadingStates[idx]?.update} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50">
                                                        {loadingStates[idx]?.update ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                                        Update
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(idx, feature)} disabled={loadingStates[idx]?.delete} className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50">
                                                    {loadingStates[idx]?.delete ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                        {isSaved(feature) && (
                                            <div className="text-[10px] text-green-600 font-medium flex items-center gap-1 justify-end">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                                Saved (ID: {feature.properties.dbId})
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
}
