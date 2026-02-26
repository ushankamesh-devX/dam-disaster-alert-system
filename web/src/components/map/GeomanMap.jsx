import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet';
import { renderToString } from 'react-dom/server';
import { Activity, Lock } from 'lucide-react';
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

const GateIcon = createCustomIcon(Lock, '#ef4444', '#fef2f2');    // Red Lock for Gate
const SensorIcon = createCustomIcon(Activity, '#10b981', '#ecfdf5'); // Green Activity for Sensor

// We can inject styles to override the Geoman toolbar icons for our custom tools
const injectCustomToolbarStyles = () => {
    if (document.getElementById('ddas-geoman-styles')) return;

    // Convert React SVG components to URI strings for CSS background-image
    const svgWrapper = (svgStr) => svgStr.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    const gateSvg = encodeURIComponent(svgWrapper(renderToString(<Lock size={16} strokeWidth={2.5} color="#ef4444" />)));
    const sensorSvg = encodeURIComponent(svgWrapper(renderToString(<Activity size={16} strokeWidth={2.5} color="#10b981" />)));

    const style = document.createElement('style');
    style.id = 'ddas-geoman-styles';
    style.innerHTML = `
        /* Point Markers (SVG Backgrounds) */
        .leaflet-pm-toolbar .leaflet-pm-icon-gate {
            background-image: url("data:image/svg+xml;utf8,${gateSvg}") !important;
            background-size: 16px 16px !important;
            background-repeat: no-repeat !important;
            background-position: center !important;
        }
        .leaflet-pm-toolbar .leaflet-pm-icon-sensor {
            background-image: url("data:image/svg+xml;utf8,${sensorSvg}") !important;
            background-size: 16px 16px !important;
            background-repeat: no-repeat !important;
            background-position: center !important;
        }

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

function GeomanEffect({ readOnly, onMapChange, featureGroupRef }) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        // Add Geoman controls
        if (!readOnly) {
            injectCustomToolbarStyles();

            // Remove existing controls just in case of hot-reload dupes
            if (map.pm.Toolbar) {
                map.pm.removeControls();
            }

            map.pm.addControls({
                position: 'topleft',
                drawMarker: false, // Disabled default marker in favor of custom ones
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

            // Add custom Draw Gate Control
            try {
                map.pm.Toolbar.copyDrawControl('drawMarker', {
                    name: 'drawGate',
                    block: 'custom',
                    title: 'Draw Gate',
                    className: 'leaflet-pm-icon-gate',
                    onClick: () => {
                        map.pm.disableDraw();
                    }
                });
            } catch (e) {
                // Ignore "Button already exists" during hotreloads
            }
            try {
                map.pm.Draw.drawGate.setPathOptions({
                    markerStyle: { icon: GateIcon },
                });
            } catch (e) { }

            // Add custom Draw Sensor Control
            try {
                map.pm.Toolbar.copyDrawControl('drawMarker', {
                    name: 'drawSensor',
                    block: 'custom',
                    title: 'Draw Sensor',
                    className: 'leaflet-pm-icon-sensor',
                    onClick: () => {
                        map.pm.disableDraw();
                    }
                });
            } catch (e) {
                // Ignore "Button already exists" during hotreloads
            }
            try {
                map.pm.Draw.drawSensor.setPathOptions({
                    markerStyle: { icon: SensorIcon },
                });
            } catch (e) { }

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

            // Set up event listeners for newly created layers
            map.on('pm:create', (e) => {
                const layer = e.layer;

                // Tag the layer with its type based on the shape drawn
                if (e.shape === 'drawGate') {
                    layer.feature = layer.feature || { type: 'Feature', properties: {} };
                    layer.feature.properties.type = 'gate';
                } else if (e.shape === 'drawSensor') {
                    layer.feature = layer.feature || { type: 'Feature', properties: {} };
                    layer.feature.properties.type = 'sensor';
                } else if (e.shape === 'drawDamCircle') {
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
                } else if (e.shape === 'Polygon' || e.shape === 'Rectangle') {
                    layer.feature = layer.feature || { type: 'Feature', properties: {} };
                    layer.feature.properties.type = 'region';
                }

                if (featureGroupRef.current) {
                    featureGroupRef.current.addLayer(layer);
                }
                onMapChange();

                // Listen to edits/drags on this new layer
                layer.on('pm:edit', onMapChange);
                layer.on('pm:dragend', onMapChange);
            });

            // Listen to edits on existing features
            map.on('pm:remove', onMapChange);
            map.on('layeradd', (e) => {
                if (e.layer && e.layer.pm) {
                    e.layer.on('pm:edit', onMapChange);
                    e.layer.on('pm:dragchange', onMapChange);
                }
            });
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
    }, [map, readOnly, featureGroupRef, onMapChange]);

    return null;
}

export default function GeomanMap({
    center = [7.8731, 80.7718], // Sri Lanka default
    zoom = 7,
    initialGeoJson = null,
    onMapChange = () => { },
    readOnly = false
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
                            if (feature.properties && feature.properties.type === 'gate') {
                                return L.marker(latlng, { icon: GateIcon });
                            } else if (feature.properties && feature.properties.type === 'sensor') {
                                return L.marker(latlng, { icon: SensorIcon });
                            } else if (feature.properties && feature.properties.type === 'circleMarker') {
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
                    if (mapRef.current && featureGroupRef.current.getLayers().length > 0) {
                        try {
                            mapRef.current.fitBounds(featureGroupRef.current.getBounds(), { padding: [20, 20] });
                        } catch (e) { }
                    }
                }
            } catch (err) {
                console.error("Failed to parse initial geojson", err);
            }
        }
    }, [initialGeoJson]);


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
                featureGroupRef={featureGroupRef}
            />
        </MapContainer>
    );
}
