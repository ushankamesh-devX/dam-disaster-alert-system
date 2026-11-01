import { Fragment, useEffect, useState } from 'react';
import { Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { frontKm } from './zoneStyles';

// Released water moving down each active dam's river: a blue band behind the flood front,
// ripples showing the direction, and a front marker with distance and time.

function lineCoords(geojson) {
    try {
        const g = typeof geojson === 'string' ? JSON.parse(geojson) : geojson;
        const geom = g?.geometry || g;
        if (geom?.type === 'LineString') return geom.coordinates;
        if (geom?.type === 'MultiLineString') return geom.coordinates.flat();
    } catch { /* unreadable river line: skip */ }
    return null;
}

function metres(a, b) {
    const lat = ((a[1] + b[1]) / 2) * Math.PI / 180;
    return Math.hypot((b[0] - a[0]) * 111320 * Math.cos(lat), (b[1] - a[1]) * 110540);
}

/** River from the dam downstream, cut at `km`; returns [lat, lng] points and the front point. */
function wetPart(coords, damLat, damLng, km) {
    let line = coords;
    const dam = [damLng, damLat];
    if (damLat != null && metres(line[line.length - 1], dam) < metres(line[0], dam)) line = [...line].reverse();
    const out = [[line[0][1], line[0][0]]];
    let left = km * 1000;
    for (let i = 1; i < line.length && left > 0; i++) {
        const seg = metres(line[i - 1], line[i]);
        if (seg >= left) {
            const f = left / seg;
            const p = [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * f, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * f];
            out.push([p[1], p[0]]);
            return { points: out, front: [p[1], p[0]], reachedEnd: false };
        }
        out.push([line[i][1], line[i][0]]);
        left -= seg;
    }
    return { points: out, front: out[out.length - 1], reachedEnd: true };
}

const frontIcon = (text) => L.divIcon({
    className: '',
    html: `<div class="ddas-water-front"><span></span><b>${text}</b></div>`,
    iconSize: [0, 0],
});

export default function WaterFlowLayer({ rivers, dams }) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    return rivers.filter((r) => r.active && r.activeSince).map((r) => {
        const coords = lineCoords(r.geojson);
        if (!coords || coords.length < 2) return null;
        const dam = dams.find((d) => d.id === r.damId);
        const minutes = (now - new Date(r.activeSince).getTime()) / 60000;
        const km = frontKm(minutes);
        if (km <= 0.05) return null;
        const { points, front, reachedEnd } = wetPart(coords, Number(dam?.latitude), Number(dam?.longitude), km);
        const label = reachedEnd ? 'Water along the whole river' : `Water front · ${km.toFixed(1)} km · ${Math.round(minutes)} min`;
        return (
            <Fragment key={`water-${r.damId}`}>
                <Polyline positions={points} interactive={false} pathOptions={{ color: '#3B82F6', weight: 14, opacity: 0.35, lineCap: 'round' }} />
                <Polyline positions={points} interactive={false} pathOptions={{ color: '#1D4ED8', weight: 4, opacity: 0.85, className: 'ddas-water-flow' }} />
                <Marker position={front} icon={frontIcon(label)} interactive={false} keyboard={false} zIndexOffset={2500} />
            </Fragment>
        );
    });
}
