import { useEffect, useRef } from 'react';
import { CircleMarker, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Switch } from '@/components/ui/switch';
import { serviceStyle } from './serviceStyles';

// Map layers for the evacuation command center. People are drawn as counts per area (privacy);
// only an SOS shows a person's exact position.

const letterIcon = (letter, color) => L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;border-radius:6px;background:${color};color:#fff;font:600 12px/22px system-ui;text-align:center;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)">${letter}</div>`,
    iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -12],
});

const sosIcon = (status) => L.divIcon({
    className: '',
    html: `<div class="ddas-sos ${status === 'triggered' ? 'ddas-sos-new' : ''}" style="background:${status === 'resolved' ? '#16A34A' : status === 'responding' ? '#D97706' : '#DC2626'}">!</div>`,
    iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -14],
});

export function PeopleLayer({ cells }) {
    return cells.map((c, i) => {
        const danger = c.inDanger > c.count / 2;
        return (
            <CircleMarker key={`p-${i}-${c.count}`} center={[c.lat, c.lng]} radius={5 + Math.sqrt(c.count) * 3}
                pathOptions={{ color: '#fff', weight: 1.5, fillColor: danger ? '#DC2626' : '#2563EB', fillOpacity: 0.75 }}>
                <Tooltip>{c.count} {c.count === 1 ? 'person' : 'people'}{c.inDanger ? ` · ${c.inDanger} in danger zone` : ''}</Tooltip>
            </CircleMarker>
        );
    });
}

export function SosLayer({ sos, onSelect }) {
    return sos.map((s) => (
        <Marker key={`s-${s.id}-${s.status}`} position={[Number(s.lat), Number(s.lng)]} icon={sosIcon(s.status)}
            eventHandlers={{ click: () => onSelect?.(s) }} zIndexOffset={1000}>
            <Tooltip>SOS · {s.type} · {s.status}</Tooltip>
        </Marker>
    ));
}

export function ServicesLayer({ services }) {
    return services.map((s) => {
        const style = serviceStyle(s.type);
        return (
            <Marker key={`e-${s.id}`} position={[Number(s.lat), Number(s.lng)]} icon={letterIcon(style.letter, style.color)}>
                <Popup>
                    <strong>{s.name}</strong><br />
                    {style.label}{s.address ? ` · ${s.address}` : ''}<br />
                    <span style={{ color: '#64748b' }}>Location from OpenStreetMap · not connected to DDAS</span>
                </Popup>
            </Marker>
        );
    });
}

/** Layer on/off switches in the map's bottom-left corner. */
export function LayerToggles({ layers, onChange }) {
    const ref = useRef(null);
    useEffect(() => {
        if (!ref.current) return;
        L.DomEvent.disableClickPropagation(ref.current);
        L.DomEvent.disableScrollPropagation(ref.current);
    }, []);
    const items = [
        ['zones', 'Danger zones'], ['people', 'People'], ['sos', 'SOS'], ['shelters', 'Shelters'],
        ['services', 'Police & hospitals'], ['blocked', 'Blocked roads'],
    ];
    return (
        <div className="leaflet-bottom leaflet-left">
            <div ref={ref} className="leaflet-control m-2.5 space-y-1.5 rounded-lg border bg-card/95 p-2.5 text-xs shadow-sm" aria-label="Map layers">
                {items.map(([key, label]) => (
                    <label key={key} className="flex cursor-pointer items-center justify-between gap-3">
                        <span>{label}</span>
                        <Switch size="sm" checked={layers[key]} onCheckedChange={(v) => onChange({ ...layers, [key]: v })} aria-label={label} />
                    </label>
                ))}
            </div>
        </div>
    );
}
