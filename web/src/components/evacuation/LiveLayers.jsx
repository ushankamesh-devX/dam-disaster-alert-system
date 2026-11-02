import { Fragment, useEffect, useRef } from 'react';
import { Circle, GeoJSON, Marker, Polyline, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Switch } from '@/components/ui/switch';
import { serviceStyle } from './serviceStyles';
import { assemblyIcon, serviceIcon, shelterIcon, sosIcon } from './mapIcons';

// Map layers for the evacuation command center (people are in MovingPeopleLayer).

export function SosLayer({ sos, onSelect }) {
    return sos.map((s) => (
        <Marker key={`s-${s.id}-${s.status}`} position={[Number(s.lat), Number(s.lng)]} icon={sosIcon(s.status)}
            eventHandlers={{ click: () => onSelect?.(s) }} zIndexOffset={3000}>
            <Tooltip>SOS #{s.id} · {s.type} · {s.status}</Tooltip>
        </Marker>
    ));
}

export function ServicesLayer({ services }) {
    return services.map((s) => {
        const style = serviceStyle(s.type);
        return (
            <Marker key={`e-${s.id}`} position={[Number(s.lat), Number(s.lng)]} icon={serviceIcon(s.type)}>
                <Popup>
                    <strong>{s.name}</strong><br />
                    {style.label}{s.address ? ` · ${s.address}` : ''}<br />
                    <span style={{ color: '#64748b' }}>Location from OpenStreetMap</span>
                </Popup>
            </Marker>
        );
    });
}

const SAFETY_TEXT = { safe: 'Safe high ground', marginal: 'Marginal: used only if nothing higher is reachable', unsafe: 'Below the flood water: not used' };

export function ShelterLayer({ shelters, forecast }) {
    const byId = new Map((forecast || []).map((f) => [f.id, f]));
    return shelters.map((s) => {
        const f = byId.get(s.id);
        const highGround = s.kind === 'high_ground';
        const unusable = s.inDangerZone || s.status === 'closed' || s.status === 'inactive' || s.floodSafety === 'unsafe';
        return (
            <Marker key={`h-${s.id}`} position={[s.lat, s.lng]} zIndexOffset={highGround ? 1200 : 1000}
                icon={highGround ? assemblyIcon() : shelterIcon(s.occupancy, s.capacity, unusable)}>
                <Popup>
                    <strong>{s.name}</strong><br />
                    {s.aboveFloodM != null && <>{s.aboveFloodM >= 0 ? '▲' : '▼'} {Math.abs(s.aboveFloodM)} m {s.aboveFloodM >= 0 ? 'above' : 'below'} the expected flood<br /></>}
                    {s.floodSafety && <>{SAFETY_TEXT[s.floodSafety]}<br /></>}
                    {s.capacity ? `${s.occupancy ?? 0} / ${s.capacity} people` : 'Capacity unknown'}<br />
                    {s.inDangerZone ? 'Inside a danger zone — not used'
                        : f?.incoming ? `+${f.incoming} on the way${f.willFill ? ' · will fill' : ''}` : 'Nobody on the way'}
                </Popup>
                {s.aboveFloodM != null && !unusable && (
                    <Tooltip direction="bottom" offset={[0, 14]} permanent className="ddas-height-tag">▲ {s.aboveFloodM} m</Tooltip>
                )}
            </Marker>
        );
    });
}

function parseGeo(text) {
    try { return typeof text === 'string' ? JSON.parse(text) : text; } catch { return null; }
}

/** Green "safe high ground" areas around the assembly points. */
export function SafeAreasLayer({ shelters }) {
    return shelters.filter((s) => s.kind === 'high_ground' && s.boundaryGeojson).map((s) => {
        const geo = parseGeo(s.boundaryGeojson);
        return geo && (
            <GeoJSON key={`safe-${s.id}`} data={geo}
                style={{ color: '#15803D', weight: 1.5, fillColor: '#22C55E', fillOpacity: 0.28 }}>
                <Tooltip sticky>Safe high ground · {s.name}{s.aboveFloodM != null ? ` · +${s.aboveFloodM} m above flood` : ''}</Tooltip>
            </GeoJSON>
        );
    });
}

/** Marked evacuation routes (offline route packs): green road lines with moving arrows towards safety. */
export function EvacuationRoutesLayer({ packs, mode = 'walk' }) {
    return packs.filter((p) => p.mode === mode && p.route?.route?.coordinates?.length > 1).map((p) => {
        const pts = p.route.route.coordinates.map(([lng, lat]) => [lat, lng]);
        return (
            <Fragment key={`route-${p.zoneId}-${p.mode}`}>
                <Polyline positions={pts} interactive={false} pathOptions={{ color: '#15803D', weight: 6, opacity: 0.8, lineCap: 'round' }} />
                <Polyline positions={pts} pathOptions={{ color: '#fff', weight: 2, opacity: 0.95, dashArray: '1 9', lineCap: 'round', className: 'ddas-flow' }}>
                    <Tooltip sticky>Evacuation route ({p.mode === 'drive' ? 'driving' : 'walking'}) to {p.route.shelter?.name} · {p.route.distanceKm} km</Tooltip>
                </Polyline>
            </Fragment>
        );
    });
}

export function BottleneckLayer({ bottlenecks }) {
    return bottlenecks.map((b, i) => (
        <Circle key={`b-${i}`} center={[b.lat, b.lng]} radius={140}
            pathOptions={{ color: '#B91C1C', weight: 2, fillColor: '#EF4444', fillOpacity: 0.25, dashArray: '4 3', className: 'ddas-bottleneck' }}>
            <Tooltip>Crowded road: {b.count} people here</Tooltip>
        </Circle>
    ));
}

const LAYERS = [
    ['zones', 'Danger zones'], ['water', 'Water flow'], ['safe', 'Safe high ground'], ['routes', 'Evacuation routes'],
    ['river', 'River timing labels'], ['people', 'People'], ['trails', 'Movement trails'], ['sos', 'SOS'], ['shelters', 'Shelters'], ['services', 'Stations'], ['teams', 'Response teams'],
    ['bottlenecks', 'Crowded roads'], ['blocked', 'Blocked roads'],
];

/** Layer on/off switches in the map's bottom-left corner. */
export function LayerToggles({ layers, onChange }) {
    const ref = useRef(null);
    useEffect(() => {
        if (!ref.current) return;
        L.DomEvent.disableClickPropagation(ref.current);
        L.DomEvent.disableScrollPropagation(ref.current);
    }, []);
    return (
        <div className="leaflet-bottom leaflet-left">
            <div ref={ref} className="leaflet-control m-2.5 space-y-1 rounded-lg border bg-card/95 p-2.5 text-xs shadow-sm" aria-label="Map layers">
                {LAYERS.map(([key, label]) => (
                    <label key={key} className="flex cursor-pointer items-center justify-between gap-3">
                        <span>{label}</span>
                        <Switch size="sm" checked={!!layers[key]} onCheckedChange={(v) => onChange({ ...layers, [key]: v })} aria-label={label} />
                    </label>
                ))}
            </div>
        </div>
    );
}
