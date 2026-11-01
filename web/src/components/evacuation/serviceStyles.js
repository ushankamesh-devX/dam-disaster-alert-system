/** Map marker style per emergency_service_providers.service_type. */
export const SERVICE_STYLE = {
    police: { color: '#1E40AF', letter: 'P', label: 'Police' },
    hospital: { color: '#DC2626', letter: 'H', label: 'Hospital' },
    fire_brigade: { color: '#EA580C', letter: 'F', label: 'Fire' },
    ambulance: { color: '#DB2777', letter: 'A', label: 'Ambulance' },
    disaster_management: { color: '#7C3AED', letter: 'D', label: 'DMC' },
};

export const serviceStyle = (type) => SERVICE_STYLE[type] || { color: '#475569', letter: '•', label: type || 'Service' };

/** Straight-line distance in km between two { lat, lng } points. */
export function distanceKm(a, b) {
    const r = (d) => (d * Math.PI) / 180;
    const h = Math.sin(r(b.lat - a.lat) / 2) ** 2
        + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
}
