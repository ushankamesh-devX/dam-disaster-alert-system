import { Fragment } from 'react';
import { GeoJSON, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { FLOODED_STYLE as FLOODED, LEVEL_STYLE } from './zoneStyles';

function parse(text) {
    try { return typeof text === 'string' ? JSON.parse(text) : text; } catch { return null; }
}

function centre(geo) {
    const g = geo?.geometry || geo;
    const ring = g?.type === 'Polygon' ? g.coordinates[0] : g?.type === 'MultiPolygon' ? g.coordinates[0][0] : null;
    if (!ring?.length) return null;
    const lng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    return [lat, lng];
}

const labelIcon = (text, colour) => L.divIcon({
    className: '',
    html: `<div style="white-space:nowrap;transform:translate(-50%,-50%);background:${colour};color:#fff;border-radius:999px;padding:1px 8px;font:600 11px/17px system-ui;box-shadow:0 1px 3px rgba(0,0,0,.3);border:1.5px solid #fff">${text}</div>`,
    iconSize: [0, 0],
});

/** Danger zones (L1–L3, evacuate) and watch zones (L4–L5), each level in its own colour, with labels. */
export default function ZonesLayer({ zones, watchZones, timing, showLabels = true }) {
    const all = [...(watchZones || []).map((z) => ({ ...z, watch: true })), ...(zones || [])]
        .sort((a, b) => b.hazardLevel - a.hazardLevel);   // L5 first, so L1 is drawn on top
    return all.map((z) => {
        const geo = parse(z.boundaryGeojson);
        if (!geo) return null;
        const t = timing?.get(z.id);
        const lv = LEVEL_STYLE[z.hazardLevel] || LEVEL_STYLE[3];
        const flooded = t?.flooded;
        const soon = !flooded && t?.floodInMin != null && t.floodInMin <= 10;
        const style = flooded
            ? { color: FLOODED.stroke, weight: 2, fillColor: FLOODED.fill, fillOpacity: FLOODED.opacity, dashArray: '8 4' }
            : { color: lv.stroke, weight: soon ? 3 : 1.5, fillColor: lv.fill, fillOpacity: lv.opacity, dashArray: lv.dash, className: soon ? 'ddas-zone-warn' : '' };
        const when = flooded ? 'flooded' : t?.floodInMin != null ? `water in ${t.floodInMin} min` : `water ~${z.floodEtaMin ?? '?'} min`;
        const pos = centre(geo);
        return (
            <Fragment key={`z-${z.id}-${flooded}-${soon}`}>
                <GeoJSON data={geo} style={style}>
                    <Tooltip sticky>
                        <strong>{lv.label}</strong> · {z.damName}<br />
                        {z.name}<br />
                        {flooded ? 'Flooded' : z.watch ? `Watch area · ${when}` : `Evacuate · ${when}`}
                        {t ? ` · ${t.clearedPct}% evacuated, ${t.peopleInside} inside` : ''}
                    </Tooltip>
                </GeoJSON>
                {showLabels && pos && !z.watch && (
                    <Marker position={pos} interactive={false} keyboard={false}
                        icon={labelIcon(`L${z.hazardLevel} · ${when}`, flooded ? FLOODED.fill : lv.stroke)} />
                )}
            </Fragment>
        );
    });
}
