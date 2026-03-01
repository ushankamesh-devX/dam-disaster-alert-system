import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import SensorHoverPopup from './SensorHoverPopup';
import DamHoverPopup from './DamHoverPopup';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconRetinaUrl: iconRetina,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// SVG icons matching the toolbar icons
const DAM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%231d4ed8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 11.31c1.17.56 1.54 1.69 3.5 1.69 2.5 0 2.5-2 5-2 1.3 0 1.7.5 2.5 1"/><path d="M11.75 18c.35.5 1.45 1 2.75 1 2.5 0 2.5-2 5-2 1.3 0 1.7.5 2.5 1"/><path d="M2 18h1"/><path d="M2 12h2"/><path d="M9 18c0-4.5 4-8 4-10.5a4.5 4.5 0 1 0-9 0C4 10 8 13.5 8 18"/></svg>`;

const SENSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23047857" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h2"/><path d="M6 8v8"/><path d="M10 4v16"/><path d="M14 6v12"/><path d="M18 10v4"/><path d="M22 12h-2"/></svg>`;

const GATE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>`;

// Create map marker icons using SVG
const createSvgIcon = (svgContent, borderColor) => {
    return L.divIcon({
        html: `
            <div style="
                background-color: white;
                border: 2px solid ${borderColor};
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
            ">
                <div style="width: 18px; height: 18px;">${svgContent.replace(/%23/g, '#')}</div>
            </div>
            <div style="
                width: 0; 
                height: 0; 
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 8px solid ${borderColor};
                margin: -2px auto 0;
            "></div>
        `,
        className: 'custom-leaflet-marker',
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40]
    });
};

// Pre-create icons for Dam, Sensor, and Gate markers
const DamIcon = createSvgIcon(DAM_SVG, '#1d4ed8');
const SensorIcon = createSvgIcon(SENSOR_SVG, '#047857');
const GateIcon = createSvgIcon(GATE_SVG, '#d97706');

// We can inject styles to override the Geoman toolbar icons for our custom tools
const injectCustomToolbarStyles = () => {
    if (document.getElementById('ddas-geoman-styles')) return;

    const style = document.createElement('style');
    style.id = 'ddas-geoman-styles';
    style.innerHTML = `
        /* Dam Icon - Water/Dam symbol */
        .leaflet-pm-toolbar .leaflet-pm-icon-dam-circle {
            background-image: none !important;
            position: relative;
        }
        .leaflet-pm-toolbar .leaflet-pm-icon-dam-circle::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 18px;
            height: 18px;
            background-color: #3b82f6;
            border: 2px solid #1d4ed8;
            border-radius: 3px;
            mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2 17 17 2'/%3E%3Cpath d='m2 14 8 8'/%3E%3Cpath d='m5 11 8 8'/%3E%3Cpath d='m8 8 8 8'/%3E%3Cpath d='m11 5 8 8'/%3E%3Cpath d='m14 2 8 8'/%3E%3Cline x1='18' y1='22' x2='22' y2='18'/%3E%3C/svg%3E");
            -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2 17 17 2'/%3E%3Cpath d='m2 14 8 8'/%3E%3Cpath d='m5 11 8 8'/%3E%3Cpath d='m8 8 8 8'/%3E%3Cpath d='m11 5 8 8'/%3E%3Cpath d='m14 2 8 8'/%3E%3Cline x1='18' y1='22' x2='22' y2='18'/%3E%3C/svg%3E");
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231d4ed8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M11 11.31c1.17.56 1.54 1.69 3.5 1.69 2.5 0 2.5-2 5-2 1.3 0 1.7.5 2.5 1'/%3E%3Cpath d='M11.75 18c.35.5 1.45 1 2.75 1 2.5 0 2.5-2 5-2 1.3 0 1.7.5 2.5 1'/%3E%3Cpath d='M2 18h1'/%3E%3Cpath d='M2 12h2'/%3E%3Cpath d='M9 18c0-4.5 4-8 4-10.5a4.5 4.5 0 1 0-9 0C4 10 8 13.5 8 18'/%3E%3C/svg%3E");
            background-size: 14px 14px;
            background-repeat: no-repeat;
            background-position: center;
            background-color: white;
            border-radius: 4px;
        }
        /* Sensor Icon - Activity/Signal symbol */
        .leaflet-pm-toolbar .leaflet-pm-icon-sensor-circle {
            background-image: none !important;
            position: relative;
        }
        .leaflet-pm-toolbar .leaflet-pm-icon-sensor-circle::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 18px;
            height: 18px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23047857' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2 12h2'/%3E%3Cpath d='M6 8v8'/%3E%3Cpath d='M10 4v16'/%3E%3Cpath d='M14 6v12'/%3E%3Cpath d='M18 10v4'/%3E%3Cpath d='M22 12h-2'/%3E%3C/svg%3E");
            background-size: 14px 14px;
            background-repeat: no-repeat;
            background-position: center;
            background-color: white;
            border: 2px solid #047857;
            border-radius: 4px;
        }
        /* Gate Icon - Door/Gate symbol */
        .leaflet-pm-toolbar .leaflet-pm-icon-gate-circle {
            background-image: none !important;
            position: relative;
        }
        .leaflet-pm-toolbar .leaflet-pm-icon-gate-circle::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 18px;
            height: 18px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23d97706' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Cpath d='M3 9h18'/%3E%3Cpath d='M3 15h18'/%3E%3Cpath d='M9 3v18'/%3E%3Cpath d='M15 3v18'/%3E%3C/svg%3E");
            background-size: 14px 14px;
            background-repeat: no-repeat;
            background-position: center;
            background-color: white;
            border: 2px solid #d97706;
            border-radius: 4px;
        }
    `;
    document.head.appendChild(style);
};

function GeomanEffect({ readOnly, onMapChange, featureGroupRef, activeAreaColor, onShapeDrawn, onShapeEdited, onShapeDeleted }) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        // Update drawing path options whenever the selected color changes
        const updateAreaColors = () => {
            if (!map.pm) return;
            try {
                map.pm.Draw.Polygon.setPathOptions({
                    color: activeAreaColor.border,
                    fillColor: activeAreaColor.fill,
                    fillOpacity: 0.4,
                    weight: 2
                });
            } catch (e) { }

            try {
                map.pm.Draw.Rectangle.setPathOptions({
                    color: activeAreaColor.border,
                    fillColor: activeAreaColor.fill,
                    fillOpacity: 0.4,
                    weight: 2
                });
            } catch (e) { }
        };

        // Add Geoman controls
        if (!readOnly) {
            injectCustomToolbarStyles();

            // Remove existing controls just in case of hot-reload dupes
            if (map.pm.Toolbar) {
                map.pm.removeControls();
            }

            map.pm.addControls({
                position: 'topleft',
                drawMarker: true, // Use default marker for general points
                drawCircleMarker: false, // Disabled default circle in favor of custom ones
                drawPolyline: false,
                drawRectangle: true,
                drawPolygon: true,
                drawCircle: false,
                editMode: true,
                dragMode: true,
                cutPolygon: false,
                removalMode: true,
            });

            // Initial color application
            updateAreaColors();

            // Add custom Draw Dam Circle Control
            try {
                map.pm.Toolbar.copyDrawControl('drawCircleMarker', {
                    name: 'drawDamCircle',
                    block: 'custom',
                    title: 'Draw Dam (Circle)',
                    className: 'leaflet-pm-icon-dam-circle',
                    onClick: () => {
                        map.pm.disableDraw();
                    }
                });
            } catch (e) { }
            try {
                map.pm.Draw.drawDamCircle.setPathOptions({
                    color: '#1d4ed8',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.8,
                    radius: 8,
                    weight: 2
                });
            } catch (e) { }

            // Add custom Draw Sensor Circle Control
            try {
                map.pm.Toolbar.copyDrawControl('drawCircleMarker', {
                    name: 'drawSensorCircle',
                    block: 'custom',
                    title: 'Draw Sensor (Circle)',
                    className: 'leaflet-pm-icon-sensor-circle',
                    onClick: () => {
                        map.pm.disableDraw();
                    }
                });
            } catch (e) { }
            try {
                map.pm.Draw.drawSensorCircle.setPathOptions({
                    color: '#047857',
                    fillColor: '#10b981',
                    fillOpacity: 0.8,
                    radius: 6,
                    weight: 2
                });
            } catch (e) { }

            // Add custom Draw Gate Circle Control
            try {
                map.pm.Toolbar.copyDrawControl('drawCircleMarker', {
                    name: 'drawGateCircle',
                    block: 'custom',
                    title: 'Draw Dam Gate (Circle)',
                    className: 'leaflet-pm-icon-gate-circle',
                    onClick: () => {
                        map.pm.disableDraw();
                    }
                });
            } catch (e) { }
            try {
                map.pm.Draw.drawGateCircle.setPathOptions({
                    color: '#d97706',
                    fillColor: '#f59e0b',
                    fillOpacity: 0.8,
                    radius: 7,
                    weight: 2
                });
            } catch (e) { }

            map.on('pm:create', (e) => {
                let layer = e.layer;
                const latlng = layer.getLatLng ? layer.getLatLng() : null;

                // Tag the layer with its type based on the shape drawn
                // For Dam, Gate, Sensor - replace circle marker with icon marker
                if (e.shape === 'drawDamCircle') {
                    // Remove the circle marker and create an icon marker
                    if (latlng) {
                        map.removeLayer(layer);
                        layer = L.marker(latlng, { icon: DamIcon });
                        layer.feature = { type: 'Feature', properties: { type: 'damCircle' }, geometry: { type: 'Point', coordinates: [latlng.lng, latlng.lat] } };
                    }
                } else if (e.shape === 'drawGateCircle') {
                    if (latlng) {
                        map.removeLayer(layer);
                        layer = L.marker(latlng, { icon: GateIcon });
                        layer.feature = { type: 'Feature', properties: { type: 'gateCircle' }, geometry: { type: 'Point', coordinates: [latlng.lng, latlng.lat] } };
                    }
                } else if (e.shape === 'drawSensorCircle') {
                    if (latlng) {
                        map.removeLayer(layer);
                        layer = L.marker(latlng, { icon: SensorIcon });
                        layer.feature = { type: 'Feature', properties: { type: 'sensorCircle' }, geometry: { type: 'Point', coordinates: [latlng.lng, latlng.lat] } };
                    }
                } else if (e.shape === 'CircleMarker') {
                    layer.feature = layer.feature || { type: 'Feature', properties: {} };
                    layer.feature.properties.type = 'circleMarker';
                    layer.feature.properties.radius = layer.options.radius;
                } else if (e.shape === 'Polygon') {
                    layer.feature = layer.feature || { type: 'Feature', properties: {} };
                    layer.feature.properties.type = 'polygon';
                    layer.feature.properties.color = activeAreaColor; // Save selected color mode
                } else if (e.shape === 'Rectangle') {
                    layer.feature = layer.feature || { type: 'Feature', properties: {} };
                    layer.feature.properties.type = 'rectangle';
                    layer.feature.properties.color = activeAreaColor; // Save selected color mode
                }

                if (featureGroupRef.current) {
                    featureGroupRef.current.addLayer(layer);
                }

                // Bubble up specific shape creation events so parent can intercept (e.g., popping up a modal for sensors)
                if (onShapeDrawn) {
                    onShapeDrawn({
                        type: layer.feature.properties.type,
                        layer: layer,
                        latlng: layer.getLatLng ? layer.getLatLng() : null,
                        bounds: layer.getBounds ? layer.getBounds() : null
                    });
                }

                onMapChange();

                // Listen to edits/drags on this new layer
                layer.on('pm:edit', (e) => {
                    onMapChange();
                    if (onShapeEdited) onShapeEdited(e.layer);
                });
                layer.on('pm:dragend', (e) => {
                    onMapChange();
                    if (onShapeEdited) onShapeEdited(e.layer);
                });
            });

            // Listen to edits on existing features
            map.on('pm:remove', (e) => {
                if (featureGroupRef.current && featureGroupRef.current.hasLayer(e.layer)) {
                    featureGroupRef.current.removeLayer(e.layer);
                }
                setTimeout(() => {
                    onMapChange();
                }, 0);
                if (onShapeDeleted) onShapeDeleted(e.layer);
            });
            map.on('layeradd', (e) => {
                if (e.layer && e.layer.pm) {
                    e.layer.on('pm:edit', (layerEvent) => {
                        onMapChange();
                        if (onShapeEdited) onShapeEdited(layerEvent.target);
                    });
                    e.layer.on('pm:dragend', (layerEvent) => {
                        onMapChange();
                        if (onShapeEdited) onShapeEdited(layerEvent.target);
                    });
                }
            });
            // Also run this if color changes while map is already drawn
            updateAreaColors();
        }

        // Cleanup
        return () => {
            if (map.pm) {
                map.pm.removeControls();
            }
            map.off('pm:create');
            map.off('pm:remove');
            map.off('layeradd');
        };
    }, [map, readOnly, featureGroupRef, onMapChange, activeAreaColor]);

    return null;
}

// Preset color options for areas
export const AREA_COLORS = [
    { id: 'red', name: 'High Risk (Red)', border: '#ef4444', fill: '#fca5a5' },
    { id: 'purple', name: 'Medium Risk (Purple)', border: '#8b5cf6', fill: '#c4b5fd' },
    { id: 'yellow', name: 'Low Risk (Yellow)', border: '#eab308', fill: '#fef08a' }
];

export default function GeomanMap({
    center = [7.8731, 80.7718], // Sri Lanka default
    zoom = 7,
    initialGeoJson = null,
    onMapChange = () => { },
    onShapeDrawn = null,
    onShapeEdited = null,
    onShapeDeleted = null,
    readOnly = false,
    activeAreaColor = AREA_COLORS[0], // Default to Red
    fitBoundsOnLoad = true,
    onFeatureGroupReady = null
}) {
    const featureGroupRef = useRef(null);
    const mapRef = useRef(null);
    const hasLoadedInitialData = useRef(false); // Track if initial data has been loaded
    const [featureGroupReady, setFeatureGroupReady] = useState(false); // Track when FeatureGroup is mounted
    
    // Sensor hover popup state
    const [hoveredSensor, setHoveredSensor] = useState(null);
    const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
    const hoverTimeoutRef = useRef(null);
    
    // Dam hover popup state
    const [hoveredDam, setHoveredDam] = useState(null);
    const [damHoverPosition, setDamHoverPosition] = useState({ x: 0, y: 0 });
    const damHoverTimeoutRef = useRef(null);

    // Gather all shapes and export as GeoJSON
    const handleMapChange = () => {
        if (!featureGroupRef.current) return;

        const layers = featureGroupRef.current.getLayers();
        if (layers.length === 0) {
            onMapChange(null);
            return;
        }

        // Create a FeatureCollection
        const geoJSON = {
            type: "FeatureCollection",
            features: []
        };

        layers.forEach(layer => {
            if (layer.toGeoJSON) {
                const feature = layer.toGeoJSON();
                // Preserve existing properties (including dbId) from layer.feature
                if (layer.feature && layer.feature.properties) {
                    feature.properties = {
                        ...layer.feature.properties,
                        ...feature.properties
                    };
                }
                geoJSON.features.push(feature);
            }
        });

        onMapChange(JSON.stringify(geoJSON));
    };

    // Load initial GeoJSON into the feature group
    useEffect(() => {
        console.log('Load useEffect triggered:', {
            featureGroupReady,
            hasRef: !!featureGroupRef.current,
            hasLoadedInitialData: hasLoadedInitialData.current,
            hasInitialGeoJson: !!initialGeoJson
        });
        
        // Skip if FeatureGroup not ready, already loaded, or no data
        if (!featureGroupReady || !featureGroupRef.current || hasLoadedInitialData.current || !initialGeoJson) return;
        
        // Mark as loaded to prevent re-loading on edits
        hasLoadedInitialData.current = true;
        
        console.log('Loading initial GeoJSON into map...');
        
        try {
            let parsedGeoJson = typeof initialGeoJson === 'string'
                ? JSON.parse(initialGeoJson)
                : initialGeoJson;

            if (parsedGeoJson) {
                const layer = L.geoJSON(parsedGeoJson, {
                    pointToLayer: (feature, latlng) => {
                        if (feature.properties && feature.properties.type === 'circleMarker') {
                            return L.circleMarker(latlng, { radius: feature.properties.radius || 10 });
                        } else if (feature.properties && feature.properties.type === 'damCircle') {
                            // Use Dam icon marker with hover events
                            const marker = L.marker(latlng, { icon: DamIcon });
                            marker.feature = feature; // Preserve feature properties
                            
                            // Add hover events for dam popup
                            const damDbId = feature.properties.dbId;
                            if (damDbId) {
                                marker.on('mouseover', (e) => {
                                    if (damHoverTimeoutRef.current) clearTimeout(damHoverTimeoutRef.current);
                                    const { clientX, clientY } = e.originalEvent;
                                    setDamHoverPosition({ x: clientX, y: clientY });
                                    setHoveredDam(damDbId);
                                });
                                marker.on('mouseout', () => {
                                    damHoverTimeoutRef.current = setTimeout(() => {
                                        setHoveredDam(null);
                                    }, 300);
                                });
                                marker.on('mousemove', (e) => {
                                    const { clientX, clientY } = e.originalEvent;
                                    setDamHoverPosition({ x: clientX, y: clientY });
                                });
                            }
                            
                            return marker;
                        } else if (feature.properties && feature.properties.type === 'gateCircle') {
                            // Use Gate icon marker
                            const marker = L.marker(latlng, { icon: GateIcon });
                            marker.feature = feature; // Preserve feature properties
                            return marker;
                        } else if (feature.properties && feature.properties.type === 'sensorCircle') {
                            // Use Sensor icon marker with hover events
                            const marker = L.marker(latlng, { icon: SensorIcon });
                            marker.feature = feature; // Preserve feature properties
                            
                            // Add hover events for sensor popup
                            const sensorDbId = feature.properties.dbId;
                            if (sensorDbId) {
                                marker.on('mouseover', (e) => {
                                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                    const { clientX, clientY } = e.originalEvent;
                                    setHoverPosition({ x: clientX, y: clientY });
                                    setHoveredSensor(sensorDbId);
                                });
                                marker.on('mouseout', () => {
                                    hoverTimeoutRef.current = setTimeout(() => {
                                        setHoveredSensor(null);
                                    }, 300);
                                });
                                marker.on('mousemove', (e) => {
                                    const { clientX, clientY } = e.originalEvent;
                                    setHoverPosition({ x: clientX, y: clientY });
                                });
                            }
                            
                            return marker;
                        }
                        return L.marker(latlng, { icon: DefaultIcon });
                    },
                    style: (feature) => {
                        if ((feature.properties && feature.properties.type === 'polygon') ||
                            (feature.properties && feature.properties.type === 'rectangle')) {
                            // If color was saved, use it, otherwise fallback to default red
                            const savedColor = feature.properties.color || AREA_COLORS[0];
                            return {
                                color: feature.properties.strokeColor || savedColor.border,
                                fillColor: feature.properties.fillColor || savedColor.fill,
                                fillOpacity: feature.properties.fillOpacity || 0.4,
                                weight: feature.properties.strokeWidth || 2
                            };
                        }
                        return {};
                    }
                });

                layer.eachLayer((l) => {
                    featureGroupRef.current.addLayer(l);
                    if (!readOnly && l.pm) {
                        // When layer is edited, update its feature geometry
                        l.on('pm:edit', () => {
                            // Update the feature's geometry to match the edited layer
                            if (l.feature && l.toGeoJSON) {
                                const updatedGeoJSON = l.toGeoJSON();
                                l.feature.geometry = updatedGeoJSON.geometry;
                            }
                            handleMapChange();
                        });
                        l.on('pm:dragend', () => {
                            // Update the feature's geometry to match the dragged layer
                            if (l.feature && l.toGeoJSON) {
                                const updatedGeoJSON = l.toGeoJSON();
                                l.feature.geometry = updatedGeoJSON.geometry;
                            }
                            handleMapChange();
                        });
                    }
                });

                // Auto-fit bounds if we loaded existing data
                if (fitBoundsOnLoad && mapRef.current && featureGroupRef.current.getLayers().length > 0) {
                    try {
                        const bounds = featureGroupRef.current.getBounds();
                        if (bounds.isValid()) {
                            mapRef.current.fitBounds(bounds, { padding: [20, 20], maxZoom: 16 });
                        }
                    } catch (e) { console.error("Error auto-fitting bounds", e); }
                } else if (mapRef.current && center) {
                    mapRef.current.setView(center, zoom);
                }
            }
        } catch (err) {
            console.error("Failed to parse initial geojson", err);
        }
    }, [initialGeoJson, featureGroupReady]); // Run when featureGroupReady or initialGeoJson changes

    // Expose feature group ref out for direct property styling edits
    useEffect(() => {
        if (onFeatureGroupReady && featureGroupRef.current) {
            onFeatureGroupReady(featureGroupRef.current);
        }
    }, [featureGroupRef.current, onFeatureGroupReady]);


    return (<>
        <MapContainer
            center={center}
            zoom={zoom}
            ref={mapRef}
            style={{ width: '100%', height: '100%', minHeight: '400px', borderRadius: '8px', zIndex: 0 }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* We store all drawn features inside this FeatureGroup */}
            <FeatureGroup ref={(ref) => {
                console.log('FeatureGroup ref callback:', ref ? 'ref received' : 'ref is null');
                featureGroupRef.current = ref;
                if (ref && !featureGroupReady) {
                    console.log('Setting featureGroupReady to true');
                    setFeatureGroupReady(true);
                }
            }} />
            <GeomanEffect
                readOnly={readOnly}
                onMapChange={handleMapChange}
                onShapeDrawn={onShapeDrawn}
                onShapeEdited={onShapeEdited}
                onShapeDeleted={onShapeDeleted}
                featureGroupRef={featureGroupRef}
                activeAreaColor={activeAreaColor}
            />
        </MapContainer>
        
        {/* Sensor Hover Popup */}
        {hoveredSensor && (
            <SensorHoverPopup
                sensorId={hoveredSensor}
                position={hoverPosition}
                onClose={() => setHoveredSensor(null)}
            />
        )}
        
        {/* Dam Hover Popup */}
        {hoveredDam && (
            <DamHoverPopup
                damId={hoveredDam}
                position={damHoverPosition}
                onClose={() => setHoveredDam(null)}
            />
        )}
    </>
    );
}
