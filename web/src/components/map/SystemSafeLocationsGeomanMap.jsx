import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet';
import { renderToString } from 'react-dom/server';
import { Building2, Flame, Hospital, Landmark, MapPin, School, Shield, ShieldCheck, Stethoscope } from 'lucide-react';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

const DefaultIcon = L.icon({
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
            ">
                ${iconHtml}
            </div>
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

const ICON_CACHE = new Map();

function safeColor(value, fallback) {
    if (!value || typeof value !== 'string') return fallback;
    const v = value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v) || /^#[0-9a-fA-F]{3}$/.test(v)) return v;
    return fallback;
}

function resolveMarkerIconName(markerIcon) {
    const icon = (markerIcon || '').toString().trim().toLowerCase();
    if (!icon) return 'evacuation_center';
    if (icon === 'none' || icon === 'default') return 'none';
    if (icon === 'map-pin' || icon === 'mappin') return 'evacuation_center';
    return icon;
}

function iconComponentFor(name) {
    switch (name) {
        case 'police_station':
        case 'police':
            return Shield;
        case 'hospital':
            return Hospital;
        case 'clinic':
            return Stethoscope;
        case 'fire_station':
        case 'fire':
            return Flame;
        case 'school':
            return School;
        case 'temple':
        case 'mosque':
            return Landmark;
        case 'community_hall':
            return Building2;
        case 'safe_zone':
            return ShieldCheck;
        case 'evacuation_center':
        case 'evacuation':
        case 'shelter':
        default:
            return MapPin;
    }
}

function markerDivIconFor(properties) {
    const iconName = resolveMarkerIconName(properties?.marker_icon);
    const color = safeColor(properties?.marker_color, '#2563eb');
    if (iconName === 'none') return DefaultIcon;
    const cacheKey = `${iconName}|${color}`;
    const cached = ICON_CACHE.get(cacheKey);
    if (cached) return cached;

    const IconComponent = iconComponentFor(iconName);
    const divIcon = createCustomIcon(IconComponent, color, 'white');
    ICON_CACHE.set(cacheKey, divIcon);
    return divIcon;
}

function safeRandomUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

function normalizeStatus(status) {
    const allowed = new Set(['active', 'inactive', 'under_maintenance', 'full', 'closed']);
    return allowed.has(status) ? status : 'active';
}

function defaultLabelForIcon(iconName) {
    switch (resolveMarkerIconName(iconName)) {
        case 'police_station':
            return 'Police Station';
        case 'hospital':
            return 'Hospital';
        case 'clinic':
            return 'Clinic';
        case 'fire_station':
            return 'Fire Station';
        case 'school':
            return 'School';
        case 'community_hall':
            return 'Community Hall';
        case 'temple':
            return 'Temple';
        case 'mosque':
            return 'Mosque';
        case 'safe_zone':
            return 'Safe Zone';
        case 'none':
            return 'Location';
        case 'other':
            return 'Location';
        case 'evacuation_center':
        default:
            return 'Evacuation Center';
    }
}

function defaultCodePrefixForIcon(iconName) {
    switch (resolveMarkerIconName(iconName)) {
        case 'police_station':
            return 'POL';
        case 'hospital':
            return 'HOS';
        case 'clinic':
            return 'CLI';
        case 'fire_station':
            return 'FIR';
        case 'school':
            return 'SCH';
        case 'community_hall':
            return 'COM';
        case 'temple':
            return 'TEM';
        case 'mosque':
            return 'MOS';
        case 'safe_zone':
            return 'SAF';
        case 'none':
            return 'LOC';
        case 'other':
            return 'LOC';
        case 'evacuation_center':
        default:
            return 'EVA';
    }
}

function renderHoverHtml(props) {
    const name = props?.name || 'Evacuation Center';
    const code = props?.code ? `(${props.code})` : '';
    const status = props?.status || 'active';
    const capacity = props?.capacity_persons ?? null;
    const phone = props?.emergency_phone || props?.contact_phone || '';

    return `
      <div style="font-family: ui-sans-serif, system-ui; min-width: 220px;">
        <div style="font-weight: 700; font-size: 13px; color: #111827;">${name} <span style="font-weight: 600; color: #6b7280;">${code}</span></div>
        <div style="margin-top: 6px; font-size: 12px; color: #374151;">
          <div><span style="color:#6b7280;">Status:</span> <span style="font-weight:600;">${status}</span></div>
          ${capacity !== null ? `<div><span style="color:#6b7280;">Capacity:</span> <span style="font-weight:600;">${capacity}</span></div>` : ''}
          ${phone ? `<div><span style="color:#6b7280;">Phone:</span> <span style="font-weight:600;">${phone}</span></div>` : ''}
        </div>
        <div style="margin-top: 8px; font-size: 11px; color:#6b7280;">Hover to preview • Click to edit details</div>
      </div>
    `;
}

function makeDefaultSafeLocation(latlng, markerIcon = 'evacuation_center', template = null) {
    const now = Date.now();
    const templateLabel = template?.__templateLabel ? String(template.__templateLabel) : null;
    const templatePrefix = template?.__templateCodePrefix ? String(template.__templateCodePrefix) : null;
    const prefix = templatePrefix || defaultCodePrefixForIcon(markerIcon);
    const label = templateLabel || defaultLabelForIcon(markerIcon);
    return {
        uuid: safeRandomUUID(),
        code: `${prefix}_${now}`,
        name: `New ${label}`,
        name_si: null,
        name_ta: null,
        description: null,
        description_si: null,
        location_type_id: null,
        region_id: null,
        address_text: null,
        address_si: null,
        latitude: Number(latlng.lat.toFixed(8)),
        longitude: Number(latlng.lng.toFixed(8)),
        elevation_meters: null,
        boundary_geojson: null,
        capacity_persons: null,
        current_occupancy: 0,
        has_medical_facility: false,
        has_food_supply: false,
        has_water_supply: false,
        has_power_backup: false,
        has_communication: false,
        has_restrooms: false,
        has_pet_area: false,
        has_accessibility: false,
        amenities: null,
        contact_name: null,
        contact_phone: null,
        contact_email: null,
        emergency_phone: null,
        operating_hours: null,
        is_24_hours: false,
        primary_dam_id: null,
        serves_hazard_zones: null,
        distance_from_dam_km: null,
        estimated_travel_time_minutes: null,
        status: 'active',
        is_verified: false,
        verified_by: null,
        verified_at: null,
        last_inspection_date: null,
        next_inspection_date: null,
        show_on_map: true,
        marker_icon: resolveMarkerIconName(markerIcon),
        marker_color: '#2563eb',
        image_url: null,
        gallery_urls: null,
        created_by: null,
        updated_by: null,
        deleted_at: null,
    };
}

function stripInternalProperties(props) {
    if (!props || typeof props !== 'object') return props;
    const rest = {};
    Object.entries(props).forEach(([k, v]) => {
        if (k === '__entity') return;
        if (k.startsWith('__')) return;
        rest[k] = v;
    });
    return rest;
}

function collectSafeLocations(featureGroup) {
    const layers = featureGroup.getLayers();
    const locations = [];

    layers.forEach((layer) => {
        if (!(layer instanceof L.Marker)) return;
        const latlng = layer.getLatLng?.();
        if (!latlng) return;

        const p = layer?.feature?.properties || {};
        if (p.__entity !== 'system_safe_location') return;

        const rest = stripInternalProperties(p);

        locations.push({
            ...rest,
            latitude: Number(latlng.lat.toFixed(8)),
            longitude: Number(latlng.lng.toFixed(8)),
            status: normalizeStatus(p.status),
        });
    });

    return locations;
}

function SystemSafeLocationsGeomanEffect({ featureGroupRef, readOnly, onDataChange, onSelectLayer, newLocationTemplate }) {
    const map = useMap();

    const emit = useCallback(() => {
        if (!featureGroupRef.current) return;
        const locations = collectSafeLocations(featureGroupRef.current);
        onDataChange(locations);
    }, [featureGroupRef, onDataChange]);

    useEffect(() => {
        if (!map) return;
        if (readOnly) return;

        if (map.pm?.Toolbar) {
            map.pm.removeControls();
        }

        map.pm.addControls({
            position: 'topleft',
            drawMarker: true,
            drawCircleMarker: false,
            drawPolyline: false,
            drawRectangle: false,
            drawPolygon: false,
            drawCircle: false,
            editMode: true,
            dragMode: true,
            cutPolygon: false,
            removalMode: true,
        });

        // Make the toolbar marker match the currently selected template (best-effort)
        try {
            const previewProps = {
                marker_icon: newLocationTemplate?.marker_icon,
                marker_color: newLocationTemplate?.marker_color,
            };
            map.pm.Draw.Marker.setPathOptions({
                markerStyle: { icon: markerDivIconFor(previewProps) },
            });
        } catch {
            // ignore
        }

        const onCreate = (e) => {
            const layer = e.layer;

            if (layer instanceof L.Marker) {
                const latlng = layer.getLatLng();
                const defaults = makeDefaultSafeLocation(latlng, newLocationTemplate?.marker_icon, newLocationTemplate);

                const merged = {
                    ...defaults,
                    ...(newLocationTemplate || {}),
                    latitude: defaults.latitude,
                    longitude: defaults.longitude,
                };

                layer.feature = layer.feature || { type: 'Feature', properties: {} };
                layer.feature.properties = {
                    ...merged,
                    __entity: 'system_safe_location',
                };

                layer.setIcon(markerDivIconFor(layer.feature.properties));

                layer.bindTooltip(renderHoverHtml(layer.feature.properties), {
                    direction: 'top',
                    offset: [0, -18],
                    opacity: 1,
                    sticky: true,
                });

                layer.on('mouseover', () => layer.openTooltip());
                layer.on('mouseout', () => layer.closeTooltip());
                layer.on('click', () => onSelectLayer(layer));

                if (featureGroupRef.current) {
                    featureGroupRef.current.addLayer(layer);
                }

                emit();
            }

            layer.on('pm:edit', emit);
            layer.on('pm:dragend', emit);
        };

        const onRemove = () => emit();

        map.on('pm:create', onCreate);
        map.on('pm:remove', onRemove);

        return () => {
            map.pm?.removeControls?.();
            map.off('pm:create', onCreate);
            map.off('pm:remove', onRemove);
        };
    }, [map, readOnly, featureGroupRef, emit, onSelectLayer, newLocationTemplate]);

    return null;
}

export default function SystemSafeLocationsGeomanMap({
    center = [7.8731, 80.7718],
    zoom = 7,
    readOnly = false,
    height = '100%',
    newLocationTemplate = null,
    onLocationsChange = () => { },
    onSelectedLocationChange = () => { },
}) {
    const featureGroupRef = useRef(null);
    const mapRef = useRef(null);
    const [selectedLayerId, setSelectedLayerId] = useState(null);

    const handleSelectLayer = useCallback((layer) => {
        setSelectedLayerId(layer?._leaflet_id ?? null);
        const props = layer?.feature?.properties || null;
        onSelectedLocationChange(props);
    }, [onSelectedLocationChange]);

    const handleLocationsChange = useCallback((locations) => {
        onLocationsChange(locations);
        if (selectedLayerId !== null && featureGroupRef.current) {
            const layer = featureGroupRef.current.getLayers().find((l) => l?._leaflet_id === selectedLayerId);
            onSelectedLocationChange(layer?.feature?.properties || null);
        }
    }, [onLocationsChange, onSelectedLocationChange, selectedLayerId]);

    const updateSelectedLocation = useCallback((patch) => {
        if (selectedLayerId === null || !featureGroupRef.current) return;
        const layer = featureGroupRef.current.getLayers().find((l) => l?._leaflet_id === selectedLayerId);
        if (!layer) return;

        layer.feature = layer.feature || { type: 'Feature', properties: {} };
        layer.feature.properties = {
            ...(layer.feature.properties || {}),
            ...patch,
        };

        const tooltip = layer.getTooltip?.();
        if (tooltip) {
            tooltip.setContent(renderHoverHtml(layer.feature.properties));
        }

        // Update marker icon/color if those properties changed
        try {
            if (layer instanceof L.Marker) {
                layer.setIcon(markerDivIconFor(layer.feature.properties));
            }
        } catch {
            // ignore
        }

        const locations = collectSafeLocations(featureGroupRef.current);
        onLocationsChange(locations);
        onSelectedLocationChange(layer.feature.properties);
    }, [onLocationsChange, onSelectedLocationChange, selectedLayerId]);

    useEffect(() => {
        window.__DDAS_SAFE_LOCATIONS__ = {
            updateSelectedLocation,
        };
        return () => {
            if (window.__DDAS_SAFE_LOCATIONS__?.updateSelectedLocation === updateSelectedLocation) {
                delete window.__DDAS_SAFE_LOCATIONS__;
            }
        };
    }, [updateSelectedLocation]);

    return (
        <div style={{ width: '100%', height, minHeight: '400px' }}>
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
                <FeatureGroup ref={featureGroupRef} />
                <SystemSafeLocationsGeomanEffect
                    readOnly={readOnly}
                    featureGroupRef={featureGroupRef}
                    onDataChange={handleLocationsChange}
                    onSelectLayer={handleSelectLayer}
                    newLocationTemplate={newLocationTemplate}
                />
            </MapContainer>
        </div>
    );
}
