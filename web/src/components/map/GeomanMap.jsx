import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet';
import { renderToString } from 'react-dom/server';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

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

// Beautiful Custom HTML Icons using Lucide React
const createCustomIcon = (IconComponent, color, bgColor = 'white') => {
    const iconHtml = renderToString(<IconComponent size={18} strokeWidth={2.5} color={color} />);
    return L.divIcon({
        html: `
            <div style="
                background-color: ${bgColor};
                border: 2px solid ${color};
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
                transition: transform 0.2s;
            ">
                ${iconHtml}
            </div>
            {/* Small triangle pointer at bottom */}
            <div style="
                width: 0; 
                height: 0; 
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 8px solid ${color};
                margin: -2px auto 0;
            "></div>
        `,
        className: 'custom-leaflet-marker',
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40]
    });
};



// We can inject styles to override the Geoman toolbar icons for our custom tools
const injectCustomToolbarStyles = () => {
    if (document.getElementById('ddas-geoman-styles')) return;

    const style = document.createElement('style');
    style.id = 'ddas-geoman-styles';
    style.innerHTML = `
        /* Circle Markers (CSS Pseudo-elements) */
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
            width: 14px;
            height: 14px;
            background-color: #3b82f6;
            border: 2px solid #1d4ed8;
            border-radius: 50%;
        }
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
            width: 14px;
            height: 14px;
            background-color: #10b981;
            border: 2px solid #047857;
            border-radius: 50%;
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

            map.on('pm:create', (e) => {
                const layer = e.layer;

                // Tag the layer with its type based on the shape drawn
                if (e.shape === 'drawDamCircle') {
                    layer.feature = layer.feature || { type: 'Feature', properties: {} };
                    layer.feature.properties.type = 'damCircle';
                    layer.feature.properties.radius = layer.options.radius || 8;
                } else if (e.shape === 'drawSensorCircle') {
                    layer.feature = layer.feature || { type: 'Feature', properties: {} };
                    layer.feature.properties.type = 'sensorCircle';
                    layer.feature.properties.radius = layer.options.radius || 6;
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
                        latlng: e.shape.includes('Circle') || e.shape === 'Marker' ? layer.getLatLng() : null,
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
                geoJSON.features.push(layer.toGeoJSON());
            }
        });

        onMapChange(JSON.stringify(geoJSON));
    };

    // Load initial GeoJSON into the feature group
    useEffect(() => {
        if (initialGeoJson && featureGroupRef.current) {
            featureGroupRef.current.clearLayers();

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
                                return L.circleMarker(latlng, {
                                    radius: feature.properties.radius || 8,
                                    color: '#1d4ed8',
                                    fillColor: '#3b82f6',
                                    fillOpacity: 0.8,
                                    weight: 2
                                });
                            } else if (feature.properties && feature.properties.type === 'sensorCircle') {
                                return L.circleMarker(latlng, {
                                    radius: feature.properties.radius || 6,
                                    color: '#047857',
                                    fillColor: '#10b981',
                                    fillOpacity: 0.8,
                                    weight: 2
                                });
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
                            l.on('pm:edit', handleMapChange);
                            l.on('pm:dragend', handleMapChange);
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
        }
    }, [initialGeoJson, fitBoundsOnLoad, center, zoom]);

    // Expose feature group ref out for direct property styling edits
    useEffect(() => {
        if (onFeatureGroupReady && featureGroupRef.current) {
            onFeatureGroupReady(featureGroupRef.current);
        }
    }, [featureGroupRef.current, onFeatureGroupReady]);


    return (
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
            <FeatureGroup ref={featureGroupRef} />
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
    );
}
