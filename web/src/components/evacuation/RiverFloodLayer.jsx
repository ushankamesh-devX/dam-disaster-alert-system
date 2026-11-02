import { Fragment } from 'react';
import { Marker, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';

// Flood path along each dam's downstream river: a wide corridor coloured by when the released
// water arrives, with distance / arrival labels. Wave speed is an illustrative estimate.
const WAVE_MPS = 2.5;          // ~9 km/h flood wave
const SEGMENT_M = 500;
const LABEL_EVERY_M = 3000;

const BANDS = [   // minutes after release -> colour
    [15, '#B91C1C'], [30, '#DC2626'], [60, '#EA580C'], [120, '#F59E0B'], [Infinity, '#EAB308'],
];
const colourFor = (min) => BANDS.find(([max]) => min <= max)[1];

function metres(a, b) {
    const lat = ((a[1] + b[1]) / 2) * Math.PI / 180;
    return Math.hypot((b[0] - a[0]) * 111320 * Math.cos(lat), (b[1] - a[1]) * 110540);
}

/** Split a LineString ([lng, lat] points) into ~500 m pieces with their distance from the dam. */
function segments(coords) {
    const out = [];
    let current = [coords[0]], start = 0, dist = 0;
    for (let i = 1; i < coords.length; i++) {
        dist += metres(coords[i - 1], coords[i]);
        current.push(coords[i]);
        if (dist - start >= SEGMENT_M || i === coords.length - 1) {
            out.push({ points: current, fromM: start, toM: dist });
            current = [coords[i]];
            start = dist;
        }
    }
    return out;
}

function lineCoords(geojson) {
    try {
        const g = typeof geojson === 'string' ? JSON.parse(geojson) : geojson;
        const geom = g?.geometry || g;
        if (geom?.type === 'LineString') return geom.coordinates;
        if (geom?.type === 'MultiLineString') return geom.coordinates.flat();
        if (geom?.type === 'FeatureCollection') return geom.features.flatMap((f) => lineCoords(f) || []);
    } catch { /* unreadable river line: skip it */ }
    return null;
}

const labelIcon = (text, colour) => L.divIcon({
    className: '',
    html: `<div style="white-space:nowrap;transform:translate(-50%,-50%);background:#fff;border:1.5px solid ${colour};color:#0f172a;border-radius:6px;padding:1px 6px;font:600 11px/16px system-ui;box-shadow:0 1px 3px rgba(0,0,0,.25)">${text}</div>`,
    iconSize: [0, 0],
});

export default function RiverFloodLayer({ rivers, showAll }) {
    return rivers.filter((r) => r.active || showAll).map((r) => {
        const coords = lineCoords(r.geojson);
        if (!coords || coords.length < 2) return null;
        const since = r.activeSince ? new Date(r.activeSince) : null;
        const segs = segments(coords);
        const labels = [];
        let next = LABEL_EVERY_M;
        for (const s of segs) {
            if (s.toM >= next) {
                const min = Math.round(next / WAVE_MPS / 60);
                const at = since && r.active ? ` · ${new Date(since.getTime() + min * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';
                const p = s.points[s.points.length - 1];
                labels.push({ key: next, pos: [p[1], p[0]], text: `${next / 1000} km · water in ~${min} min${at}`, colour: colourFor(min) });
                next += LABEL_EVERY_M;
            }
        }
        return (
            <Fragment key={`river-${r.damId}`}>
                {segs.map((s, i) => {
                    const min = (s.fromM + s.toM) / 2 / WAVE_MPS / 60;
                    const positions = s.points.map(([lng, lat]) => [lat, lng]);
                    return (
                        <Fragment key={i}>
                            {/* Thin river line, coloured by water arrival time */}
                            <Polyline positions={positions}
                                pathOptions={{ color: colourFor(min), weight: 3, opacity: r.active ? 0.75 : 0.35 }}>
                                <Tooltip sticky>
                                    {r.damName} downstream · {(s.fromM / 1000).toFixed(1)}–{(s.toM / 1000).toFixed(1)} km · water in ~{Math.round(min)} min
                                </Tooltip>
                            </Polyline>
                        </Fragment>
                    );
                })}
                {r.active && labels.map((l) => <Marker key={l.key} position={l.pos} icon={labelIcon(l.text, l.colour)} interactive={false} />)}
            </Fragment>
        );
    });
}
