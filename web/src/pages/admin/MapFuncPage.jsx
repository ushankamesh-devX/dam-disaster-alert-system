import React, { useState, useRef } from 'react';
import { Cpu, Map, MapPin, Hexagon, Square, Circle, Database, Code, Edit3 } from 'lucide-react';
import GeomanMap, { AREA_COLORS } from '../../components/map/GeomanMap';

export default function MapFuncPage() {
    const [currentGeoJSON, setCurrentGeoJSON] = useState(null);
    const [activeColor, setActiveColor] = useState(AREA_COLORS[0]);
    // Track active tabs for each item card (idx -> 'data' | 'json' | 'edit')
    const [activeTabs, setActiveTabs] = useState({});

    // We hold a ref to the map component's feature group to trigger updates if needed
    const mapFeatureGroupRef = useRef(null);
    // Callback to let MapFuncPage get the ref to the GeomanMap's feature group
    const handleFeatureGroupRef = (ref) => {
        mapFeatureGroupRef.current = ref;
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
                                damId: 1,
                                hazardLevelId: 1,
                                zoneCode: `ZONE-${index + 1}`,
                                zoneName: "Hazard Zone",
                                zoneNameSi: "",
                                description: "",
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
                            // Update boundaryGeojson in case it was dragged/edited
                            feature.properties.boundaryGeojson = JSON.stringify(feature.geometry);
                            modified = true;
                        }
                    } else if (type === 'sensorCircle' || type === 'circleMarker' || feature.geometry.type === 'Point') {
                        // Inherit or initialize defaults for sensors
                        if (!feature.properties.sensorUid) {
                            modified = true;
                            feature.properties = {
                                ...feature.properties,
                                sensorUid: `SEN-${index + 1}`,
                                damId: 1,
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Map Section */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col min-h-[500px]">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Interactive Map</h2>
                    <div className="flex-1 w-full rounded border border-gray-300 overflow-hidden isolate relative z-0">
                        <GeomanMap
                            onMapChange={handleMapChange}
                            activeAreaColor={activeColor}
                            height="100%"
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
                                const isSensor = type === 'sensorCircle' || type === 'circleMarker' || feature.geometry.type === 'Point';
                                const color = feature.properties?.color;
                                const currentTab = activeTabs[idx] || 'data';

                                let Icon = MapPin;
                                let title = 'Marker';
                                let typeColor = 'text-gray-500';

                                if (type === 'polygon' || feature.geometry.type === 'Polygon') { Icon = Hexagon; title = 'Polygon Area'; typeColor = 'text-blue-500'; }
                                else if (type === 'rectangle') { Icon = Square; title = 'Rectangular Area'; typeColor = 'text-purple-500'; }
                                else if (type === 'damCircle') { Icon = Circle; title = 'Dam Location'; typeColor = 'text-blue-700'; }
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
                                            {(isPolygon || isSensor) && (
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
                                            ) : (
                                                <div className="overflow-x-auto overflow-y-auto max-h-[300px] custom-scrollbar text-[10px] font-mono text-gray-700 p-1">
                                                    {/* In JSON view we actually extract properties from feature payload directly as user requested */}
                                                    <pre className="whitespace-pre-wrap leading-relaxed">
                                                        {JSON.stringify((isPolygon || isSensor) && feature.properties ? feature.properties : feature, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
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
