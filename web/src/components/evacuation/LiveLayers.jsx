import { useEffect, useRef } from 'react';
import { Circle, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Switch } from '@/components/ui/switch';
import { serviceStyle } from './serviceStyles';
import { serviceIcon, shelterIcon, sosIcon } from './mapIcons';

// Map layers for the evacuation command center (people are in MovingPeopleLayer).

export function SosLayer({ sos, onSelect }) {
    return sos.map((s) => (
        <Marker key={`s-${s.id}-${s.status}`} position={[Number(s.lat), Number(s.lng)]} icon={sosIcon(s.status)}
            eventHandlers={{ click: () => onSelect?.(s) }} zIndexOffset={3000}>
            <Tooltip>SOS · {s.type} · {s.status}</Tooltip>
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
                    <span style={{ color: '#64748b' }}>Location from OpenStreetMap · not connected to DDAS</span>
                </Popup>
            </Marker>
        );
    });
}

export function ShelterLayer({ shelters, forecast }) {
    const byId = new Map((forecast || []).map((f) => [f.id, f]));
    return shelters.map((s) => {
        const f = byId.get(s.id);
        const unusable = s.inDangerZone || s.status === 'closed' || s.status === 'inactive';
        return (
            <Marker key={`h-${s.id}`} position={[s.lat, s.lng]} icon={shelterIcon(s.occupancy, s.capacity, unusable)} zIndexOffset={1000}>
                <Popup>
                    <strong>{s.name}</strong><br />
                    {s.capacity ? `${s.occupancy ?? 0} / ${s.capacity} people` : 'Capacity unknown'}<br />
                    {unusable ? 'Inside a danger zone — not used'
                        : f?.incoming ? `+${f.incoming} on the way${f.willFill ? ' · will fill' : ''}` : 'Nobody on the way'}
                </Popup>
            </Marker>
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
    ['zones', 'Danger zones'], ['water', 'Water flow'], ['river', 'River timing labels'], ['people', 'People'],
    ['trails', 'Movement trails'], ['sos', 'SOS'], ['shelters', 'Shelters'], ['services', 'Police & hospitals'],
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
