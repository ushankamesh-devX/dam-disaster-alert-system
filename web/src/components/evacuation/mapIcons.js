import L from 'leaflet';

// "3D-style" SVG map icons (gradients and soft shadows) for the evacuation command center.

export const PERSON_COLORS = {
    danger: ['#F87171', '#B91C1C'],   // in a danger zone
    moving: ['#60A5FA', '#1D4ED8'],   // on the way, outside the zones
    sos: ['#FB923C', '#C2410C'],
    safe: ['#4ADE80', '#15803D'],     // reached a shelter
};

const cache = new Map();
const cached = (key, make) => {
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
};

const WALKER = 'M12 4.2a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4Zm-1.6 4.3h2.6l1.9 3.4-1.2.7-1.2-2.1-.4 2.6 1.9 2.4v4.2h-1.4v-3.6l-1.6-1.9-.8 2.3-2.2 3.2-1.2-.8 2-3 .9-3.9-1 .9v2.2H8.2V11l2.2-2.5Z';
const CAR = 'M7.2 9.3 8.4 6.6c.3-.6.9-1 1.6-1h4c.7 0 1.3.4 1.6 1l1.2 2.7c.8.2 1.4.9 1.4 1.8v3.6h-1.4v1.4a1 1 0 0 1-2 0v-1.4H9.2v1.4a1 1 0 0 1-2 0v-1.4H5.8v-3.6c0-.9.6-1.6 1.4-1.8Zm1.6-.2h6.4l-.8-1.9H9.6l-.8 1.9Zm-.6 3.6a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Zm7.6 0a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z';
const CHECK = 'M9.6 15.6 6 12l1.3-1.3 2.3 2.3 6.1-6.1L17 8.2l-7.4 7.4Z';

/** Person pin: gradient body, white figure (walk / car / check), small heading arrow. */
export function personIcon(state, mode, heading = 0, selected = false) {
    const key = `p:${state}:${mode}:${Math.round(heading / 30)}:${selected}`;
    return cached(key, () => {
        const [light, dark] = PERSON_COLORS[state] || PERSON_COLORS.moving;
        const glyph = state === 'safe' ? CHECK : mode === 'drive' ? CAR : WALKER;
        const ring = selected ? `<circle cx="12" cy="12" r="11.2" fill="none" stroke="#111827" stroke-width="1.6"/>` : '';
        const arrow = state === 'safe' ? '' :
            `<g transform="rotate(${Math.round(heading / 30) * 30} 12 12)"><path d="M12 0.6 14 3.4h-4Z" fill="${dark}"/></g>`;
        return L.divIcon({
            className: 'ddas-person',
            html: `<svg width="${selected ? 26 : 18}" height="${selected ? 26 : 18}" viewBox="0 0 24 24" style="filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))">
                <defs><radialGradient id="g${key.replace(/[^a-z0-9]/gi, '')}" cx="35%" cy="30%" r="75%">
                <stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></radialGradient></defs>
                ${arrow}<circle cx="12" cy="12" r="9" fill="url(#g${key.replace(/[^a-z0-9]/gi, '')})" stroke="#fff" stroke-width="1.6"/>
                <path d="${glyph}" fill="#fff" transform="translate(1.2 1.2) scale(.9)"/>${ring}</svg>`,
            iconSize: selected ? [26, 26] : [18, 18],
            iconAnchor: selected ? [13, 13] : [9, 9],
        });
    });
}

/** SOS beacon: pulses while new; amber while help is on the way; grey check when resolved. */
export function sosIcon(status) {
    return cached(`s:${status}`, () => {
        const color = status === 'resolved' ? '#64748B' : status === 'responding' ? '#D97706' : '#DC2626';
        const glyph = status === 'resolved'
            ? `<path d="${CHECK}" fill="#fff"/>`
            : '<rect x="11" y="6.5" width="2" height="7" rx="1" fill="#fff"/><circle cx="12" cy="16.5" r="1.3" fill="#fff"/>';
        return L.divIcon({
            className: status === 'triggered' ? 'ddas-beacon ddas-beacon-new' : 'ddas-beacon',
            html: `<svg width="30" height="30" viewBox="0 0 24 24" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))">
                <path d="M12 1.5 22 12 12 22.5 2 12Z" fill="${color}" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>${glyph}</svg>`,
            iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14],
        });
    });
}

/** Shelter: house with a ring that fills with occupancy. */
export function shelterIcon(occupancy, capacity, unusable) {
    const pct = capacity ? Math.min(1, (occupancy || 0) / capacity) : 0;
    const step = Math.round(pct * 20);
    return cached(`h:${step}:${unusable}`, () => {
        const color = unusable ? '#64748B' : pct >= 1 ? '#DC2626' : pct >= 0.8 ? '#F59E0B' : '#16A34A';
        const r = 13, c = 2 * Math.PI * r, filled = (step / 20) * c;
        return L.divIcon({
            className: 'ddas-shelter',
            html: `<svg width="34" height="34" viewBox="0 0 34 34" style="filter:drop-shadow(0 2px 2px rgba(0,0,0,.3))">
                <circle cx="17" cy="17" r="${r}" fill="#fff" stroke="#E2E8F0" stroke-width="3.5"/>
                <circle cx="17" cy="17" r="${r}" fill="none" stroke="${color}" stroke-width="3.5" stroke-dasharray="${filled} ${c}" transform="rotate(-90 17 17)" stroke-linecap="round"/>
                <path d="M17 9.5 25 16h-2.2v7.5h-4.2v-4.6h-3.2v4.6h-4.2V16H9Z" fill="${color}"/></svg>`,
            iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -16],
        });
    });
}

/** Demo response team on its way (position from the team's phone). */
export function teamIcon() {
    return cached('t', () => L.divIcon({
        className: 'ddas-service',
        html: `<svg width="26" height="26" viewBox="0 0 24 24" style="filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))">
            <circle cx="12" cy="12" r="10.5" fill="#1D4ED8" stroke="#fff" stroke-width="1.6"/>
            <path d="${CAR}" fill="#fff" transform="translate(1.2 1.2) scale(.9)"/></svg>`,
        iconSize: [26, 26], iconAnchor: [13, 13],
    }));
}

/** High-ground assembly point: green mountain with a flag. */
export function assemblyIcon() {
    return cached('a', () => L.divIcon({
        className: 'ddas-shelter',
        html: `<svg width="34" height="34" viewBox="0 0 34 34" style="filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))">
            <circle cx="17" cy="17" r="15" fill="#15803D" stroke="#fff" stroke-width="2"/>
            <path d="M7 24 14 13l3.5 5 2.5-3.5L27 24Z" fill="#fff"/>
            <path d="M20 7v8" stroke="#fff" stroke-width="1.6"/><path d="M20 7h5l-1.3 1.8L25 10.6h-5Z" fill="#FDE047"/></svg>`,
        iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -16],
    }));
}

const SERVICE_GLYPH = {
    police: { color: '#1E40AF', path: 'M12 3 19 5.6v5.3c0 4.4-3 7.6-7 9.1-4-1.5-7-4.7-7-9.1V5.6Z', inner: 'M12 7.6 13.1 10h2.6l-2.1 1.6.8 2.6L12 12.7l-2.4 1.5.8-2.6L8.3 10h2.6Z' },
    hospital: { color: '#DC2626', path: 'M4 4h16v16H4Z', inner: 'M10.5 7h3v3.5H17v3h-3.5V17h-3v-3.5H7v-3h3.5Z' },
    fire_brigade: { color: '#EA580C', path: 'M4 4h16v16H4Z', inner: 'M12 6.5c2.4 2.2 3.6 4.1 3.6 6a3.6 3.6 0 0 1-7.2 0c0-1 .4-2 1.1-2.9.2 1.1.8 1.8 1.5 2 0-1.9.3-3.4 1-5.1Z' },
};

/** Police (shield), hospital (cross), fire (flame) badges. */
export function serviceIcon(type) {
    return cached(`e:${type}`, () => {
        const g = SERVICE_GLYPH[type] || SERVICE_GLYPH.police;
        return L.divIcon({
            className: 'ddas-service',
            html: `<svg width="22" height="22" viewBox="0 0 24 24" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))">
                <path d="${g.path}" fill="${g.color}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round" rx="4"/><path d="${g.inner}" fill="#fff"/></svg>`,
            iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -12],
        });
    });
}
