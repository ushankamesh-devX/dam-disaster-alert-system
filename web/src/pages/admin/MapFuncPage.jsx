import React, { useState, useRef, useEffect } from 'react';
import { Cpu, Map, MapPin, Hexagon, Square, Circle, Database, Code, Edit3, Save, Trash2, RefreshCw, Loader2, Download, Droplets } from 'lucide-react';
import GeomanMap, { AREA_COLORS } from '../../components/map/GeomanMap';
import { createHazardZone, updateHazardZone, deleteHazardZone, createGate, updateGate, deleteGate, getDamHazardZones, getDamGates, getAllDamsList, createDam, updateDam, deleteDam, getDamById } from '../../services/dam.service';
import { createSensor, updateSensor, deleteSensor, getSensorsByDam } from '../../services/sensor.service';
import toast from 'react-hot-toast';

export default function MapFuncPage() {
    const [currentGeoJSON, setCurrentGeoJSON] = useState(null);
    const [initialGeoJSON, setInitialGeoJSON] = useState(null);
    const [mapKey, setMapKey] = useState(0); // Key to force map remount when loading new data
    const [activeColor, setActiveColor] = useState(AREA_COLORS[0]);
    // Track active tabs for each item card (idx -> 'data' | 'json' | 'edit')
    const [activeTabs, setActiveTabs] = useState({});
    // Track loading states for each entity
    const [loadingStates, setLoadingStates] = useState({});
    // Loading state for initial data fetch
    const [isLoadingData, setIsLoadingData] = useState(true);
    // Selected dam for loading data
    const [selectedDamId, setSelectedDamId] = useState(1);
    const [dams, setDams] = useState([]);

    // We hold a ref to the map component's feature group to trigger updates if needed
    const mapFeatureGroupRef = useRef(null);
    // Ref to track selectedDamId for use in callbacks
    const selectedDamIdRef = useRef(selectedDamId);
    
    // Keep ref in sync with state
    useEffect(() => {
        selectedDamIdRef.current = selectedDamId;
    }, [selectedDamId]);
    
    // Callback to let MapFuncPage get the ref to the GeomanMap's feature group
    const handleFeatureGroupRef = (ref) => {
        mapFeatureGroupRef.current = ref;
    };

    // Load dams list on mount
    useEffect(() => {
        const loadDams = async () => {
            try {
                const damsList = await getAllDamsList();
                setDams(damsList);
                if (damsList.length > 0 && !selectedDamId) {
                    setSelectedDamId(damsList[0].id);
                }
            } catch (error) {
                console.error('Failed to load dams:', error);
            }
        };
        loadDams();
    }, []);

    // Load saved data from database when dam changes
    useEffect(() => {
        if (selectedDamId) {
            loadSavedData(selectedDamId);
        }
    }, [selectedDamId]);

    // Function to load all saved data for a dam
    const loadSavedData = async (damId) => {
        setIsLoadingData(true);
        try {
            const [hazardZones, gates, sensors] = await Promise.all([
                getDamHazardZones(damId).catch(() => []),
                getDamGates(damId).catch(() => []),
                getSensorsByDam(damId).catch(() => [])
            ]);

            const features = [];

            // Convert hazard zones to GeoJSON features
            hazardZones.forEach(zone => {
                if (zone.boundaryGeojson) {
                    try {
                        const geometry = typeof zone.boundaryGeojson === 'string' 
                            ? JSON.parse(zone.boundaryGeojson) 
                            : zone.boundaryGeojson;
                        
                        features.push({
                            type: 'Feature',
                            geometry: geometry,
                            properties: {
                                type: geometry.type === 'Polygon' ? 'polygon' : 'rectangle',
                                dbId: zone.id,
                                damId: zone.damId,
                                hazardLevelId: zone.hazardLevelId,
                                zoneCode: zone.zoneCode,
                                zoneName: zone.zoneName,
                                zoneNameSi: zone.zoneNameSi,
                                description: zone.description,
                                boundaryGeojson: typeof zone.boundaryGeojson === 'string' 
                                    ? zone.boundaryGeojson 
                                    : JSON.stringify(zone.boundaryGeojson),
                                centerLatitude: zone.centerLatitude,
                                centerLongitude: zone.centerLongitude,
                                areaSqKm: zone.areaSqKm,
                                distanceFromDamKm: zone.distanceFromDamKm,
                                estimatedFloodArrivalMinutes: zone.estimatedFloodArrivalMinutes,
                                estimatedWaterDepthMeters: zone.estimatedWaterDepthMeters,
                                fillColor: zone.fillColor || '#fca5a5',
                                fillOpacity: zone.fillOpacity || 0.4,
                                strokeColor: zone.strokeColor || '#ef4444',
                                strokeWidth: zone.strokeWidth || 2,
                                displayOrder: zone.displayOrder,
                                showLabel: zone.showLabel,
                                isActive: zone.isActive
                            }
                        });
                    } catch (e) {
                        console.error('Failed to parse hazard zone geometry:', e);
                    }
                }
            });

            // Convert gates to GeoJSON features (as gateCircle markers)
            gates.forEach(gate => {
                if (gate.latitude && gate.longitude) {
                    features.push({
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [parseFloat(gate.longitude), parseFloat(gate.latitude)]
                        },
                        properties: {
                            type: 'gateCircle',
                            dbId: gate.id,
                            damId: gate.damId,
                            gateNumber: gate.gateNumber,
                            gateType: gate.gateType?.toLowerCase() || 'radial',
                            latitude: parseFloat(gate.latitude),
                            longitude: parseFloat(gate.longitude),
                            maxOpeningMeters: parseFloat(gate.maxOpeningMeters) || 12.5,
                            currentOpeningMeters: parseFloat(gate.currentOpeningMeters) || 0.0,
                            status: gate.status?.toLowerCase() || 'closed'
                        }
                    });
                }
            });

            // Convert sensors to GeoJSON features
            sensors.forEach(sensor => {
                if (sensor.latitude && sensor.longitude) {
                    features.push({
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [sensor.longitude, sensor.latitude]
                        },
                        properties: {
                            type: 'sensorCircle',
                            dbId: sensor.id,
                            sensorUid: sensor.sensorUid,
                            damId: sensor.damId,
                            sensorTypeId: sensor.sensorTypeId,
                            name: sensor.name,
                            description: sensor.description,
                            locationOnDam: sensor.locationOnDam,
                            latitude: sensor.latitude,
                            longitude: sensor.longitude,
                            elevationMeters: sensor.elevationMeters,
                            manufacturer: sensor.manufacturer,
                            model: sensor.model,
                            serialNumber: sensor.serialNumber,
                            installationDate: sensor.installationDate,
                            calibrationDate: sensor.calibrationDate,
                            nextCalibrationDate: sensor.nextCalibrationDate,
                            minReading: sensor.minReading,
                            maxReading: sensor.maxReading,
                            warningThreshold: sensor.warningThreshold,
                            criticalThreshold: sensor.criticalThreshold,
                            readingIntervalSeconds: sensor.readingIntervalSeconds,
                            status: sensor.status
                        }
                    });
                }
            });

            if (features.length > 0) {
                const geoJSON = {
                    type: 'FeatureCollection',
                    features: features
                };
                setInitialGeoJSON(JSON.stringify(geoJSON));
                setCurrentGeoJSON(JSON.stringify(geoJSON));
                setMapKey(prev => prev + 1); // Force map to remount with new data
                toast.success(`Loaded ${features.length} entities from database`);
            } else {
                setInitialGeoJSON(null);
                setCurrentGeoJSON(null);
                setMapKey(prev => prev + 1); // Force map to remount
            }
        } catch (error) {
            console.error('Failed to load saved data:', error);
            toast.error('Failed to load saved data from database');
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleMapChange = (geojson) => {
        // When map changes, update our local state JSON
        // Ensure new features have default properties matching the required schema if missing
        if (geojson) {
            try {
                const parsed = JSON.parse(geojson);
                let modified = false;
                parsed.features = parsed.features.map((feature, index) => {
                    const type = feature.properties?.type || feature.geometry.type;
                    if (type === 'polygon' || type === 'rectangle' || feature.geometry.type === 'Polygon') {
                        // Inherit or initialize defaults for polygon/hash zones
                        if (!feature.properties.zoneCode) {
                            modified = true;
                            const defaultColor = feature.properties.color || AREA_COLORS[0];
                            feature.properties = {
                                ...feature.properties,
                                damId: selectedDamIdRef.current,
                                hazardLevelId: 1,
                                zoneCode: `Z${Date.now().toString(36).toUpperCase()}`,
                                zoneName: "Hazard Zone",
                                zoneNameSi: null,
                                description: null,
                                boundaryGeojson: JSON.stringify(feature.geometry),
                                centerLatitude: feature.geometry.coordinates[0][0][1], // rough approx
                                centerLongitude: feature.geometry.coordinates[0][0][0],
                                areaSqKm: 0,
                                distanceFromDamKm: 0,
                                estimatedFloodArrivalMinutes: 5,
                                estimatedWaterDepthMeters: 5.0,
                                fillColor: defaultColor.fill,
                                fillOpacity: 0.4,
                                strokeColor: defaultColor.border,
                                strokeWidth: 2,
                                displayOrder: index + 1,
                                showLabel: true,
                                isActive: true
                            };
                        } else {
                            // Update boundaryGeojson and center coordinates in case it was dragged/edited
                            feature.properties.boundaryGeojson = JSON.stringify(feature.geometry);
                            // Recalculate center from the updated polygon coordinates
                            if (feature.geometry.coordinates && feature.geometry.coordinates[0]) {
                                const coords = feature.geometry.coordinates[0];
                                const sumLat = coords.reduce((sum, c) => sum + c[1], 0);
                                const sumLng = coords.reduce((sum, c) => sum + c[0], 0);
                                feature.properties.centerLatitude = sumLat / coords.length;
                                feature.properties.centerLongitude = sumLng / coords.length;
                            }
                            modified = true;
                        }
                    } else if (type === 'damCircle') {
                        // Inherit or initialize defaults for dam markers
                        if (!feature.properties.code) {
                            modified = true;
                            const uniqueId = Date.now().toString(36).toUpperCase();
                            feature.properties = {
                                ...feature.properties,
                                code: `DAM${uniqueId}`,
                                name: `New Dam ${index + 1}`,
                                nameSi: null,
                                nameTa: null,
                                regionId: 1,
                                locationDescription: '',
                                latitude: feature.geometry.coordinates[1],
                                longitude: feature.geometry.coordinates[0],
                                damType: 'gravity',
                                heightMeters: 0,
                                lengthMeters: 0,
                                reservoirCapacityMcm: 0,
                                grossStorageMcm: 0,
                                liveStorageMcm: 0,
                                deadStorageMcm: 0,
                                catchmentAreaSqkm: 0,
                                spillwayCapacityCumecs: 0,
                                yearCompleted: new Date().getFullYear(),
                                riverName: '',
                                purpose: 'hydropower',
                                operatorOrganization: '',
                                contactPhone: '',
                                contactEmail: '',
                                emergencyPhone: '',
                                status: 'operational',
                                riskClassification: 'medium'
                            };
                        } else {
                            // Update coordinates if the dam marker was dragged
                            feature.properties.latitude = feature.geometry.coordinates[1];
                            feature.properties.longitude = feature.geometry.coordinates[0];
                            modified = true;
                        }
                    } else if (type === 'gateCircle') {
                        // Inherit or initialize defaults for dam gates
                        if (!feature.properties.gateNumber) {
                            modified = true;
                            feature.properties = {
                                ...feature.properties,
                                damId: selectedDamIdRef.current,
                                gateNumber: `G${String(index + 1).padStart(2, '0')}`,
                                gateType: "radial",
                                maxOpeningMeters: 12.5,
                                currentOpeningMeters: 0.0,
                                status: "closed",
                                latitude: feature.geometry.coordinates[1],
                                longitude: feature.geometry.coordinates[0]
                            };
                        } else {
                            // Update coordinates if the gate marker was dragged
                            feature.properties.latitude = feature.geometry.coordinates[1];
                            feature.properties.longitude = feature.geometry.coordinates[0];
                            modified = true;
                        }
                    } else if (type === 'sensorCircle') {
                        // Inherit or initialize defaults for sensors
                        if (!feature.properties.sensorUid) {
                            modified = true;
                            feature.properties = {
                                ...feature.properties,
                                sensorUid: `SEN-${index + 1}`,
                                damId: selectedDamIdRef.current,
                                sensorTypeId: 1,
                                name: `Sensor ${index + 1}`,
                                description: "Description",
                                locationOnDam: "Location",
                                latitude: feature.geometry.coordinates[1],
                                longitude: feature.geometry.coordinates[0],
                                elevationMeters: 0.0,
                                manufacturer: "",
                                model: "",
                                serialNumber: "",
                                // Use today's date generically
                                installationDate: new Date().toISOString().split('T')[0],
                                calibrationDate: new Date().toISOString().split('T')[0],
                                nextCalibrationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                                minReading: 0.0,
                                maxReading: 100.0,
                                warningThreshold: 80.0,
                                criticalThreshold: 90.0,
                                readingIntervalSeconds: 60,
                                status: "active"
                            };
                        } else {
                            // Update coordinates if the sensor marker was dragged
                            feature.properties.latitude = feature.geometry.coordinates[1];
                            feature.properties.longitude = feature.geometry.coordinates[0];
                            modified = true;
                        }
                    }
                    return feature;
                });

                if (modified) {
                    setCurrentGeoJSON(JSON.stringify(parsed));
                    return; // update will flow back up on next cycle
                }
            } catch (e) {
                console.error("Error patching GeoJSON properties", e);
            }
        }
        setCurrentGeoJSON(geojson);
    };

    const formatCoordinates = (geometry) => {
        if (!geometry) return '';
        if (geometry.type === 'Point') {
            return `${geometry.coordinates[1].toFixed(4)}, ${geometry.coordinates[0].toFixed(4)}`;
        } else if (geometry.type === 'Polygon') {
            return `${geometry.coordinates[0].length} points`;
        }
        return 'Multiple points';
    };

    const toggleTab = (idx, tab) => {
        setActiveTabs(prev => ({ ...prev, [idx]: tab }));
    };

    const handlePropertyChange = (idx, field, value) => {
        if (!currentGeoJSON) return;
        try {
            const parsed = JSON.parse(currentGeoJSON);
            const feature = parsed.features[idx];
            if (feature) {
                // Update specific field
                feature.properties[field] = value;

                // If color changes, update map visually
                if (field === 'fillColor' || field === 'strokeColor' || field === 'fillOpacity') {
                    // We must find the actual leaflet layer to update its style
                    if (mapFeatureGroupRef.current) {
                        const layers = Object.values(mapFeatureGroupRef.current._layers || {});
                        // This is a bit of a hack to find the matching layer, ideally we'd track IDs
                        // For this demo, finding by index in array usually matches layer iteration order
                        if (layers[idx]) {
                            layers[idx].setStyle({
                                fillColor: feature.properties.fillColor,
                                color: feature.properties.strokeColor,
                                fillOpacity: feature.properties.fillOpacity || 0.4
                            });
                        }
                    }
                }

                setCurrentGeoJSON(JSON.stringify(parsed));
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Set loading state for a specific entity
    const setLoading = (idx, action, isLoading) => {
        setLoadingStates(prev => ({
            ...prev,
            [idx]: { ...prev[idx], [action]: isLoading }
        }));
    };

    // Check if entity is saved (has database ID)
    const isSaved = (feature) => {
        return feature.properties?.dbId != null;
    };

    // Handle Save (Create new entity in database)
    const handleSave = async (idx, feature) => {
        const type = feature.properties?.type || feature.geometry.type;
        setLoading(idx, 'save', true);

        try {
            if (type === 'polygon' || type === 'rectangle' || feature.geometry.type === 'Polygon') {
                // Save Hazard Zone
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
                    isActive: feature.properties.isActive !== false
                };

                console.log('Saving hazard zone payload:', JSON.stringify(payload, null, 2));

                const result = await createHazardZone(payload);
                // Update the feature with the database ID
                updateFeatureDbId(idx, result.id);
                toast.success(`Hazard Zone "${payload.zoneName}" saved successfully!`);

            } else if (type === 'damCircle') {
                // Save Dam
                const payload = {
                    code: feature.properties.code,
                    name: feature.properties.name,
                    nameSi: feature.properties.nameSi || null,
                    nameTa: feature.properties.nameTa || null,
                    regionId: feature.properties.regionId || 1,
                    locationDescription: feature.properties.locationDescription || null,
                    latitude: feature.properties.latitude,
                    longitude: feature.properties.longitude,
                    damType: feature.properties.damType || 'gravity',
                    heightMeters: feature.properties.heightMeters || null,
                    lengthMeters: feature.properties.lengthMeters || null,
                    reservoirCapacityMcm: feature.properties.reservoirCapacityMcm || null,
                    grossStorageMcm: feature.properties.grossStorageMcm || null,
                    liveStorageMcm: feature.properties.liveStorageMcm || null,
                    deadStorageMcm: feature.properties.deadStorageMcm || null,
                    catchmentAreaSqkm: feature.properties.catchmentAreaSqkm || null,
                    spillwayCapacityCumecs: feature.properties.spillwayCapacityCumecs || null,
                    yearCompleted: feature.properties.yearCompleted || null,
                    riverName: feature.properties.riverName || null,
                    purpose: feature.properties.purpose || null,
                    operatorOrganization: feature.properties.operatorOrganization || null,
                    contactPhone: feature.properties.contactPhone || null,
                    contactEmail: feature.properties.contactEmail || null,
                    emergencyPhone: feature.properties.emergencyPhone || null,
                    status: feature.properties.status || 'operational',
                    riskClassification: feature.properties.riskClassification || 'medium'
                };

                const result = await createDam(payload);
                updateFeatureDbId(idx, result.id);
                toast.success(`Dam "${payload.name}" saved successfully!`);

            } else if (type === 'gateCircle') {
                // Save Dam Gate
                const payload = {
                    damId: feature.properties.damId,
                    gateNumber: feature.properties.gateNumber,
                    gateType: feature.properties.gateType,
                    latitude: feature.properties.latitude,
                    longitude: feature.properties.longitude,
                    maxOpeningMeters: feature.properties.maxOpeningMeters || 12.5,
                    currentOpeningMeters: feature.properties.currentOpeningMeters || 0,
                    status: feature.properties.status || 'closed'
                };

                const result = await createGate(payload);
                updateFeatureDbId(idx, result.id);
                toast.success(`Gate "${payload.gateNumber}" saved successfully!`);

            } else if (type === 'sensorCircle' || type === 'circleMarker') {
                // Save Sensor
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
                    status: feature.properties.status || 'active'
                };

                const result = await createSensor(payload);
                updateFeatureDbId(idx, result.id);
                toast.success(`Sensor "${payload.name}" saved successfully!`);
            }
        } catch (error) {
            console.error('Save error:', error);
            const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to save entity';
            toast.error(errorMsg);
        } finally {
            setLoading(idx, 'save', false);
        }
    };

    // Handle Update (Update existing entity in database)
    const handleUpdate = async (idx, feature) => {
        const type = feature.properties?.type || feature.geometry.type;
        const dbId = feature.properties?.dbId;

        if (!dbId) {
            toast.error('Entity not saved yet. Please save first.');
            return;
        }

        setLoading(idx, 'update', true);

        try {
            if (type === 'polygon' || type === 'rectangle' || feature.geometry.type === 'Polygon') {
                // Update Hazard Zone - always use the current geometry for boundaryGeojson
                const updatedBoundaryGeojson = JSON.stringify(feature.geometry);
                
                // Calculate center from the polygon coordinates
                let centerLat = feature.properties.centerLatitude;
                let centerLng = feature.properties.centerLongitude;
                if (feature.geometry.coordinates && feature.geometry.coordinates[0]) {
                    const coords = feature.geometry.coordinates[0];
                    const sumLat = coords.reduce((sum, c) => sum + c[1], 0);
                    const sumLng = coords.reduce((sum, c) => sum + c[0], 0);
                    centerLat = sumLat / coords.length;
                    centerLng = sumLng / coords.length;
                }
                
                const payload = {
                    hazardLevelId: feature.properties.hazardLevelId,
                    zoneName: feature.properties.zoneName,
                    zoneNameSi: feature.properties.zoneNameSi || null,
                    description: feature.properties.description || null,
                    boundaryGeojson: updatedBoundaryGeojson,
                    centerLatitude: centerLat,
                    centerLongitude: centerLng,
                    areaSqKm: feature.properties.areaSqKm || 0,
                    distanceFromDamKm: feature.properties.distanceFromDamKm || 0,
                    estimatedFloodArrivalMinutes: feature.properties.estimatedFloodArrivalMinutes,
                    estimatedWaterDepthMeters: feature.properties.estimatedWaterDepthMeters,
                    fillColor: feature.properties.fillColor,
                    fillOpacity: feature.properties.fillOpacity,
                    strokeColor: feature.properties.strokeColor,
                    strokeWidth: feature.properties.strokeWidth,
                    displayOrder: feature.properties.displayOrder,
                    showLabel: feature.properties.showLabel,
                    isActive: feature.properties.isActive
                };
                
                // Also update the properties in the current GeoJSON state
                feature.properties.boundaryGeojson = updatedBoundaryGeojson;
                feature.properties.centerLatitude = centerLat;
                feature.properties.centerLongitude = centerLng;

                await updateHazardZone(dbId, payload);
                toast.success(`Hazard Zone "${feature.properties.zoneName}" updated!`);

            } else if (type === 'damCircle') {
                // Update Dam
                const payload = {
                    name: feature.properties.name,
                    nameSi: feature.properties.nameSi || null,
                    nameTa: feature.properties.nameTa || null,
                    regionId: feature.properties.regionId,
                    locationDescription: feature.properties.locationDescription || null,
                    latitude: feature.properties.latitude,
                    longitude: feature.properties.longitude,
                    damType: feature.properties.damType,
                    heightMeters: feature.properties.heightMeters,
                    lengthMeters: feature.properties.lengthMeters,
                    reservoirCapacityMcm: feature.properties.reservoirCapacityMcm,
                    grossStorageMcm: feature.properties.grossStorageMcm,
                    liveStorageMcm: feature.properties.liveStorageMcm,
                    deadStorageMcm: feature.properties.deadStorageMcm,
                    catchmentAreaSqkm: feature.properties.catchmentAreaSqkm,
                    spillwayCapacityCumecs: feature.properties.spillwayCapacityCumecs,
                    yearCompleted: feature.properties.yearCompleted,
                    riverName: feature.properties.riverName,
                    purpose: feature.properties.purpose,
                    operatorOrganization: feature.properties.operatorOrganization,
                    contactPhone: feature.properties.contactPhone,
                    contactEmail: feature.properties.contactEmail,
                    emergencyPhone: feature.properties.emergencyPhone,
                    status: feature.properties.status,
                    riskClassification: feature.properties.riskClassification
                };

                await updateDam(dbId, payload);
                toast.success(`Dam "${feature.properties.name}" updated!`);

            } else if (type === 'gateCircle') {
                // Update Dam Gate
                const payload = {
                    gateType: feature.properties.gateType,
                    latitude: feature.properties.latitude,
                    longitude: feature.properties.longitude,
                    maxOpeningMeters: feature.properties.maxOpeningMeters,
                    currentOpeningMeters: feature.properties.currentOpeningMeters,
                    status: feature.properties.status
                };

                await updateGate(dbId, payload);
                toast.success(`Gate "${feature.properties.gateNumber}" updated!`);

            } else if (type === 'sensorCircle' || type === 'circleMarker') {
                // Update Sensor
                const payload = {
                    name: feature.properties.name,
                    description: feature.properties.description,
                    locationOnDam: feature.properties.locationOnDam,
                    latitude: feature.properties.latitude,
                    longitude: feature.properties.longitude,
                    elevationMeters: feature.properties.elevationMeters,
                    manufacturer: feature.properties.manufacturer,
                    model: feature.properties.model,
                    serialNumber: feature.properties.serialNumber,
                    calibrationDate: feature.properties.calibrationDate,
                    nextCalibrationDate: feature.properties.nextCalibrationDate,
                    minReading: feature.properties.minReading,
                    maxReading: feature.properties.maxReading,
                    warningThreshold: feature.properties.warningThreshold,
                    criticalThreshold: feature.properties.criticalThreshold,
                    readingIntervalSeconds: feature.properties.readingIntervalSeconds,
                    status: feature.properties.status
                };

                await updateSensor(dbId, payload);
                toast.success(`Sensor "${feature.properties.name}" updated!`);
            }
        } catch (error) {
            console.error('Update error:', error);
            toast.error(error.response?.data?.message || 'Failed to update entity');
        } finally {
            setLoading(idx, 'update', false);
        }
    };

    // Handle Delete (Remove entity from database and map)
    const handleDelete = async (idx, feature) => {
        const type = feature.properties?.type || feature.geometry.type;
        const dbId = feature.properties?.dbId;

        // Confirm deletion
        const entityName = type === 'polygon' || type === 'rectangle' ? 'Hazard Zone' : 
                          type === 'damCircle' ? 'Dam' :
                          type === 'gateCircle' ? 'Gate' : 'Sensor';
        if (!confirm(`Are you sure you want to delete this ${entityName}?`)) {
            return;
        }

        setLoading(idx, 'delete', true);

        try {
            // Delete from database if saved
            if (dbId) {
                if (type === 'polygon' || type === 'rectangle' || feature.geometry.type === 'Polygon') {
                    await deleteHazardZone(dbId);
                    toast.success('Hazard Zone deleted from database!');
                } else if (type === 'damCircle') {
                    await deleteDam(dbId);
                    toast.success('Dam deleted from database!');
                } else if (type === 'gateCircle') {
                    await deleteGate(dbId);
                    toast.success('Gate deleted from database!');
                } else if (type === 'sensorCircle') {
                    await deleteSensor(dbId);
                    toast.success('Sensor deleted from database!');
                }
            }

            // Remove from map
            removeFeatureFromMap(idx);

        } catch (error) {
            console.error('Delete error:', error);
            toast.error(error.response?.data?.message || 'Failed to delete entity');
        } finally {
            setLoading(idx, 'delete', false);
        }
    };

    // Update feature with database ID after save
    const updateFeatureDbId = (idx, dbId) => {
        if (!currentGeoJSON) return;
        try {
            const parsed = JSON.parse(currentGeoJSON);
            if (parsed.features[idx]) {
                parsed.features[idx].properties.dbId = dbId;
                setCurrentGeoJSON(JSON.stringify(parsed));
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Remove feature from GeoJSON state and map
    const removeFeatureFromMap = (idx) => {
        if (!currentGeoJSON) return;
        try {
            const parsed = JSON.parse(currentGeoJSON);
            parsed.features.splice(idx, 1);
            setCurrentGeoJSON(parsed.features.length > 0 ? JSON.stringify(parsed) : null);

            // Also remove from Leaflet layer group
            if (mapFeatureGroupRef.current) {
                const layers = Object.values(mapFeatureGroupRef.current._layers || {});
                if (layers[idx]) {
                    mapFeatureGroupRef.current.removeLayer(layers[idx]);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] gap-6">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3">
                        Map Functionality Test
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 pl-4 flex items-center gap-2">
                        <Cpu className="w-4 h-4" />
                        Testing dynamic map editing (Draw, Edit, Drag, Delete GeoJSON)
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Dam Selector */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-600">Dam:</label>
                        <select
                            value={selectedDamId}
                            onChange={(e) => setSelectedDamId(Number(e.target.value))}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            {dams.map(dam => (
                                <option key={dam.id} value={dam.id}>{dam.name}</option>
                            ))}
                        </select>
                    </div>
                    {/* Reload Button */}
                    <button
                        onClick={() => loadSavedData(selectedDamId)}
                        disabled={isLoadingData}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isLoadingData ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        Load from DB
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
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
                            // Expose the internal feature group so we can update styles dynamically from inputs
                            onFeatureGroupReady={handleFeatureGroupRef}
                        />
                    </div>
                </div>

                {/* Data Output Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">Map Entities</h2>
                            <p className="text-xs text-gray-500 mt-1">Manage drawn elements</p>
                        </div>

                        {/* Moved Color Picker */}
                        <div className="flex flex-col items-end gap-1.5">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Draw Color</span>
                            <div className="flex gap-1.5">
                                {AREA_COLORS.map(color => (
                                    <button
                                        key={color.id}
                                        onClick={() => setActiveColor(color)}
                                        title={color.name}
                                        className={`w-5 h-5 rounded-full border-2 transition-transform ${activeColor.id === color.id ? 'scale-125 ring-2 ring-blue-500 ring-offset-1' : 'hover:scale-110'
                                            }`}
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
                                try {
                                    features = JSON.parse(currentGeoJSON).features || [];
                                } catch (e) { }
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
                                const color = feature.properties?.color;
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
                                                <div className={`p-1.5 bg-white rounded-md shadow-sm border border-gray-100`}>
                                                    <Icon className={`w-4 h-4 ${typeColor}`} />
                                                </div>
                                                <span className="text-sm">{title} <span className="text-xs text-gray-400 font-normal ml-1">#{idx + 1}</span></span>
                                            </div>
                                            {isPolygon && feature.properties ? (
                                                <div
                                                    className="w-4 h-4 rounded-full border shadow-sm"
                                                    style={{ backgroundColor: feature.properties.fillColor, borderColor: feature.properties.strokeColor }}
                                                    title={feature.properties.zoneName}
                                                />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full bg-gray-200 border border-gray-300 shadow-sm" title="Default" />
                                            )}
                                        </div>

                                        {/* Tabs Navigator */}
                                        <div className="flex gap-1 border-b border-gray-200 mt-1 overflow-x-auto no-scrollbar">
                                            <button
                                                onClick={() => toggleTab(idx, 'data')}
                                                className={`flex items-center whitespace-nowrap gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors border-b-2 ${currentTab === 'data' ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'} rounded-t-md`}
                                            >
                                                <Database className="w-3.5 h-3.5" />
                                                Data
                                            </button>
                                            {(isPolygon || isSensor || isGate) && (
                                                <button
                                                    onClick={() => toggleTab(idx, 'edit')}
                                                    className={`flex items-center whitespace-nowrap gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors border-b-2 ${currentTab === 'edit' ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'} rounded-t-md`}
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                    Edit Props
                                                </button>
                                            )}
                                            <button
                                                onClick={() => toggleTab(idx, 'json')}
                                                className={`flex items-center whitespace-nowrap gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors border-b-2 ${currentTab === 'json' ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'} rounded-t-md`}
                                            >
                                                <Code className="w-3.5 h-3.5" />
                                                JSON
                                            </button>
                                        </div>

                                        {/* Tab Content Area */}
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
                                                        <span className="truncate ml-4 font-mono bg-gray-50 px-2 py-0.5 border border-gray-200 rounded-md text-[10px]">
                                                            {formatCoordinates(feature.geometry)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : currentTab === 'edit' && isPolygon ? (
                                                <div className="flex flex-col gap-3 text-xs overflow-y-auto max-h-[300px] custom-scrollbar pr-1">

                                                    {/* Identification */}
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded border border-gray-100">
                                                        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Dam ID</label>
                                                            <input
                                                                type="number"
                                                                value={feature.properties.damId || 1}
                                                                onChange={(e) => handlePropertyChange(idx, 'damId', parseInt(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Level ID</label>
                                                            <input
                                                                type="number"
                                                                value={feature.properties.hazardLevelId || 1}
                                                                onChange={(e) => handlePropertyChange(idx, 'hazardLevelId', parseInt(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Zone Code</label>
                                                            <input
                                                                type="text"
                                                                value={feature.properties.zoneCode || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'zoneCode', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Zone Name</label>
                                                            <input
                                                                type="text"
                                                                value={feature.properties.zoneName || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'zoneName', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Name (Sinhala)</label>
                                                            <input
                                                                type="text"
                                                                value={feature.properties.zoneNameSi || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'zoneNameSi', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                                placeholder="සිංහල..."
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Description</label>
                                                            <input
                                                                type="text"
                                                                value={feature.properties.description || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'description', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Measurements */}
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded border border-gray-100">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Area (SqKm)</label>
                                                            <input
                                                                type="number" step="0.1"
                                                                value={feature.properties.areaSqKm || 0}
                                                                onChange={(e) => handlePropertyChange(idx, 'areaSqKm', parseFloat(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Dist from Dam (Km)</label>
                                                            <input
                                                                type="number" step="0.1"
                                                                value={feature.properties.distanceFromDamKm || 0}
                                                                onChange={(e) => handlePropertyChange(idx, 'distanceFromDamKm', parseFloat(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Flood Arrival (Min)</label>
                                                            <input
                                                                type="number"
                                                                value={feature.properties.estimatedFloodArrivalMinutes || 0}
                                                                onChange={(e) => handlePropertyChange(idx, 'estimatedFloodArrivalMinutes', parseInt(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Depth (Meters)</label>
                                                            <input
                                                                type="number" step="0.1"
                                                                value={feature.properties.estimatedWaterDepthMeters || 0}
                                                                onChange={(e) => handlePropertyChange(idx, 'estimatedWaterDepthMeters', parseFloat(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Styling & Display */}
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded border border-gray-100">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Fill Color</label>
                                                            <input
                                                                type="color"
                                                                value={feature.properties.fillColor || '#fca5a5'}
                                                                onChange={(e) => handlePropertyChange(idx, 'fillColor', e.target.value)}
                                                                className="w-full h-8 px-1 rounded border border-gray-200 cursor-pointer bg-white"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Stroke Color</label>
                                                            <input
                                                                type="color"
                                                                value={feature.properties.strokeColor || '#ef4444'}
                                                                onChange={(e) => handlePropertyChange(idx, 'strokeColor', e.target.value)}
                                                                className="w-full h-8 px-1 rounded border border-gray-200 cursor-pointer bg-white"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Fill Opacity (0-1)</label>
                                                            <input
                                                                type="number" step="0.1" min="0" max="1"
                                                                value={feature.properties.fillOpacity || 0.4}
                                                                onChange={(e) => handlePropertyChange(idx, 'fillOpacity', parseFloat(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Stroke Width</label>
                                                            <input
                                                                type="number" min="0"
                                                                value={feature.properties.strokeWidth || 2}
                                                                onChange={(e) => handlePropertyChange(idx, 'strokeWidth', parseInt(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Display Order</label>
                                                            <input
                                                                type="number"
                                                                value={feature.properties.displayOrder || 1}
                                                                onChange={(e) => handlePropertyChange(idx, 'displayOrder', parseInt(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>

                                                        {/* Booleans */}
                                                        <div className="flex flex-col gap-2 justify-end pb-1.5">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={feature.properties.showLabel !== false}
                                                                    onChange={(e) => handlePropertyChange(idx, 'showLabel', e.target.checked)}
                                                                    className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                                />
                                                                <span className="text-[11px] font-medium text-gray-700">Show Label</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={feature.properties.isActive !== false}
                                                                    onChange={(e) => handlePropertyChange(idx, 'isActive', e.target.checked)}
                                                                    className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                                />
                                                                <span className="text-[11px] font-medium text-gray-700">Is Active</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : currentTab === 'edit' && isSensor ? (
                                                <div className="flex flex-col gap-3 text-xs overflow-y-auto max-h-[300px] custom-scrollbar pr-1">

                                                    {/* Sensor Identity */}
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded border border-gray-100">
                                                        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Sensor UID</label>
                                                            <input
                                                                type="text"
                                                                value={feature.properties.sensorUid || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'sensorUid', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Dam ID</label>
                                                            <input
                                                                type="number"
                                                                value={feature.properties.damId || 1}
                                                                onChange={(e) => handlePropertyChange(idx, 'damId', parseInt(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Type ID</label>
                                                            <input
                                                                type="number"
                                                                value={feature.properties.sensorTypeId || 1}
                                                                onChange={(e) => handlePropertyChange(idx, 'sensorTypeId', parseInt(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Name</label>
                                                            <input
                                                                type="text"
                                                                value={feature.properties.name || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'name', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Description</label>
                                                            <input
                                                                type="text"
                                                                value={feature.properties.description || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'description', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Location Details */}
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded border border-gray-100">
                                                        <div className="flex flex-col gap-1 col-span-2">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Location on Dam</label>
                                                            <input
                                                                type="text"
                                                                value={feature.properties.locationOnDam || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'locationOnDam', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Latitude</label>
                                                            <input
                                                                type="number" step="0.0001"
                                                                value={feature.properties.latitude || 0}
                                                                readOnly
                                                                className="px-2 py-1.5 rounded border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                                                                title="Move the marker on the map to change"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Longitude</label>
                                                            <input
                                                                type="number" step="0.0001"
                                                                value={feature.properties.longitude || 0}
                                                                readOnly
                                                                className="px-2 py-1.5 rounded border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                                                                title="Move the marker on the map to change"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Elevation (Meters)</label>
                                                            <input
                                                                type="number" step="0.1"
                                                                value={feature.properties.elevationMeters || 0}
                                                                onChange={(e) => handlePropertyChange(idx, 'elevationMeters', parseFloat(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Hardware Information */}
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded border border-gray-100">
                                                        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Manufacturer</label>
                                                            <input
                                                                type="text"
                                                                value={feature.properties.manufacturer || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'manufacturer', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Model</label>
                                                            <input
                                                                type="text"
                                                                value={feature.properties.model || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'model', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Serial Number</label>
                                                            <input
                                                                type="text"
                                                                value={feature.properties.serialNumber || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'serialNumber', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Status</label>
                                                            <select
                                                                value={feature.properties.status || 'active'}
                                                                onChange={(e) => handlePropertyChange(idx, 'status', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            >
                                                                <option value="active">Active</option>
                                                                <option value="inactive">Inactive</option>
                                                                <option value="maintenance">Maintenance</option>
                                                                <option value="offline">Offline</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Thresholds and Timings */}
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded border border-gray-100">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Min Reading</label>
                                                            <input
                                                                type="number" step="0.1"
                                                                value={feature.properties.minReading || 0}
                                                                onChange={(e) => handlePropertyChange(idx, 'minReading', parseFloat(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Max Reading</label>
                                                            <input
                                                                type="number" step="0.1"
                                                                value={feature.properties.maxReading || 0}
                                                                onChange={(e) => handlePropertyChange(idx, 'maxReading', parseFloat(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Warning Threshold</label>
                                                            <input
                                                                type="number" step="0.1"
                                                                value={feature.properties.warningThreshold || 0}
                                                                onChange={(e) => handlePropertyChange(idx, 'warningThreshold', parseFloat(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Critical Threshold</label>
                                                            <input
                                                                type="number" step="0.1"
                                                                value={feature.properties.criticalThreshold || 0}
                                                                onChange={(e) => handlePropertyChange(idx, 'criticalThreshold', parseFloat(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Reading Intr. (sec)</label>
                                                            <input
                                                                type="number"
                                                                value={feature.properties.readingIntervalSeconds || 60}
                                                                onChange={(e) => handlePropertyChange(idx, 'readingIntervalSeconds', parseInt(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Installation Date</label>
                                                            <input
                                                                type="date"
                                                                value={feature.properties.installationDate || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'installationDate', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-xs"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Calibration Date</label>
                                                            <input
                                                                type="date"
                                                                value={feature.properties.calibrationDate || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'calibrationDate', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-xs"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Next Calibration</label>
                                                            <input
                                                                type="date"
                                                                value={feature.properties.nextCalibrationDate || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'nextCalibrationDate', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-xs"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : currentTab === 'edit' && isGate ? (
                                                <div className="flex flex-col gap-3 text-xs overflow-y-auto max-h-[300px] custom-scrollbar pr-1">

                                                    {/* Gate Identity */}
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-amber-50 rounded border border-amber-100">
                                                        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Dam ID</label>
                                                            <input
                                                                type="number"
                                                                value={feature.properties.damId || 1}
                                                                onChange={(e) => handlePropertyChange(idx, 'damId', parseInt(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Gate Number</label>
                                                            <input
                                                                type="text"
                                                                value={feature.properties.gateNumber || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'gateNumber', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                                                                placeholder="G01"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Gate Type</label>
                                                            <select
                                                                value={feature.properties.gateType || 'radial'}
                                                                onChange={(e) => handlePropertyChange(idx, 'gateType', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 bg-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                                                            >
                                                                <option value="radial">Radial</option>
                                                                <option value="vertical">Vertical</option>
                                                                <option value="drum">Drum</option>
                                                                <option value="flap">Flap</option>
                                                                <option value="sluice">Sluice</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Gate Measurements */}
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-amber-50 rounded border border-amber-100">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Max Opening (m)</label>
                                                            <input
                                                                type="number" step="0.1"
                                                                value={feature.properties.maxOpeningMeters || 0}
                                                                onChange={(e) => handlePropertyChange(idx, 'maxOpeningMeters', parseFloat(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Current Opening (m)</label>
                                                            <input
                                                                type="number" step="0.1"
                                                                value={feature.properties.currentOpeningMeters || 0}
                                                                onChange={(e) => handlePropertyChange(idx, 'currentOpeningMeters', parseFloat(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Status</label>
                                                            <select
                                                                value={feature.properties.status || 'closed'}
                                                                onChange={(e) => handlePropertyChange(idx, 'status', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 bg-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                                                            >
                                                                <option value="closed">Closed</option>
                                                                <option value="partial">Partial</option>
                                                                <option value="fully_open">Fully Open</option>
                                                                <option value="maintenance">Maintenance</option>
                                                                <option value="jammed">Jammed</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Gate Location */}
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-amber-50 rounded border border-amber-100">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Latitude</label>
                                                            <input
                                                                type="number" step="0.0001"
                                                                value={feature.properties.latitude || 0}
                                                                readOnly
                                                                className="px-2 py-1.5 rounded border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                                                                title="Move the marker on the map to change"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Longitude</label>
                                                            <input
                                                                type="number" step="0.0001"
                                                                value={feature.properties.longitude || 0}
                                                                readOnly
                                                                className="px-2 py-1.5 rounded border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                                                                title="Move the marker on the map to change"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : currentTab === 'edit' && isDam ? (
                                                <div className="flex flex-col gap-3 text-xs overflow-y-auto max-h-[300px] custom-scrollbar pr-1">

                                                    {/* Dam Identity */}
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-blue-50 rounded border border-blue-100">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Dam Code</label>
                                                            <input
                                                                type="text"
                                                                value={feature.properties.code || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'code', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                                placeholder="VIC001"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Region ID</label>
                                                            <input
                                                                type="number"
                                                                value={feature.properties.regionId || 1}
                                                                onChange={(e) => handlePropertyChange(idx, 'regionId', parseInt(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Dam Name</label>
                                                            <input
                                                                type="text"
                                                                value={feature.properties.name || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'name', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                                placeholder="Victoria Dam"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Dam Type</label>
                                                            <select
                                                                value={feature.properties.damType || 'gravity'}
                                                                onChange={(e) => handlePropertyChange(idx, 'damType', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            >
                                                                <option value="gravity">Gravity</option>
                                                                <option value="arch">Arch</option>
                                                                <option value="buttress">Buttress</option>
                                                                <option value="embankment">Embankment</option>
                                                                <option value="rock_fill">Rock Fill</option>
                                                                <option value="earth_fill">Earth Fill</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Dam Specifications */}
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-blue-50 rounded border border-blue-100">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Height (m)</label>
                                                            <input
                                                                type="number" step="0.1"
                                                                value={feature.properties.heightMeters || 0}
                                                                onChange={(e) => handlePropertyChange(idx, 'heightMeters', parseFloat(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Length (m)</label>
                                                            <input
                                                                type="number" step="0.1"
                                                                value={feature.properties.lengthMeters || 0}
                                                                onChange={(e) => handlePropertyChange(idx, 'lengthMeters', parseFloat(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Capacity (MCM)</label>
                                                            <input
                                                                type="number" step="0.1"
                                                                value={feature.properties.reservoirCapacityMcm || 0}
                                                                onChange={(e) => handlePropertyChange(idx, 'reservoirCapacityMcm', parseFloat(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Year Completed</label>
                                                            <input
                                                                type="number"
                                                                value={feature.properties.yearCompleted || new Date().getFullYear()}
                                                                onChange={(e) => handlePropertyChange(idx, 'yearCompleted', parseInt(e.target.value))}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Dam River & Location */}
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-blue-50 rounded border border-blue-100">
                                                        <div className="flex flex-col gap-1 col-span-2">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">River Name</label>
                                                            <input
                                                                type="text"
                                                                value={feature.properties.riverName || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'riverName', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                                placeholder="Mahaweli River"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Location Description</label>
                                                            <input
                                                                type="text"
                                                                value={feature.properties.locationDescription || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'locationDescription', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                                placeholder="Located on..."
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Dam Status & Risk */}
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-blue-50 rounded border border-blue-100">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Status</label>
                                                            <select
                                                                value={feature.properties.status || 'operational'}
                                                                onChange={(e) => handlePropertyChange(idx, 'status', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            >
                                                                <option value="operational">Operational</option>
                                                                <option value="under_maintenance">Under Maintenance</option>
                                                                <option value="under_construction">Under Construction</option>
                                                                <option value="decommissioned">Decommissioned</option>
                                                                <option value="emergency">Emergency</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Risk Classification</label>
                                                            <select
                                                                value={feature.properties.riskClassification || 'medium'}
                                                                onChange={(e) => handlePropertyChange(idx, 'riskClassification', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            >
                                                                <option value="low">Low</option>
                                                                <option value="medium">Medium</option>
                                                                <option value="high">High</option>
                                                                <option value="extreme">Extreme</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Dam Contact */}
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-blue-50 rounded border border-blue-100">
                                                        <div className="flex flex-col gap-1 col-span-2">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Operator Organization</label>
                                                            <input
                                                                type="text"
                                                                value={feature.properties.operatorOrganization || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'operatorOrganization', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Contact Phone</label>
                                                            <input
                                                                type="text"
                                                                value={feature.properties.contactPhone || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'contactPhone', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Emergency Phone</label>
                                                            <input
                                                                type="text"
                                                                value={feature.properties.emergencyPhone || ''}
                                                                onChange={(e) => handlePropertyChange(idx, 'emergencyPhone', e.target.value)}
                                                                className="px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Dam Coordinates (read-only) */}
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-blue-50 rounded border border-blue-100">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Latitude</label>
                                                            <input
                                                                type="number" step="0.0001"
                                                                value={feature.properties.latitude || 0}
                                                                readOnly
                                                                className="px-2 py-1.5 rounded border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                                                                title="Move the marker on the map to change"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Longitude</label>
                                                            <input
                                                                type="number" step="0.0001"
                                                                value={feature.properties.longitude || 0}
                                                                readOnly
                                                                className="px-2 py-1.5 rounded border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                                                                title="Move the marker on the map to change"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto overflow-y-auto max-h-[300px] custom-scrollbar text-[10px] font-mono text-gray-700 p-1">
                                                    {/* In JSON view we actually extract properties from feature payload directly as user requested */}
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
                                                    // Show Save button for new entities
                                                    <button
                                                        onClick={() => handleSave(idx, feature)}
                                                        disabled={loadingStates[idx]?.save}
                                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {loadingStates[idx]?.save ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Save className="w-3.5 h-3.5" />
                                                        )}
                                                        Save to DB
                                                    </button>
                                                ) : (
                                                    // Show Update button for saved entities
                                                    <button
                                                        onClick={() => handleUpdate(idx, feature)}
                                                        disabled={loadingStates[idx]?.update}
                                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {loadingStates[idx]?.update ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <RefreshCw className="w-3.5 h-3.5" />
                                                        )}
                                                        Update
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(idx, feature)}
                                                    disabled={loadingStates[idx]?.delete}
                                                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {loadingStates[idx]?.delete ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    )}
                                                    Delete
                                                </button>
                                            </div>
                                        )}

                                        {/* Saved indicator */}
                                        {isSaved(feature) && (
                                            <div className="text-[10px] text-green-600 font-medium flex items-center gap-1 justify-end">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
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
