import geography from '../../data/victoria-geography.json';

// VIC-01 after cleanup_demo_data.py; DEMO-002 before it
export const isVictoriaDemo = dam => ['VIC-01', 'DEMO-002'].includes(dam?.code) && dam?.name === 'Victoria Dam';
export const victoriaReference = dam => isVictoriaDemo(dam) ? geography : null;

// Equipment and zone records are deliberately placed demo points for Victoria.
export function referenceMapFeatures(dam, features) {
    if (!isVictoriaDemo(dam)) return features;
    const placed = features.filter(feature => (feature.properties?.zoneCode?.startsWith('VICTORIA-DEMO-L') || feature.properties?.zoneCode?.includes('-RIVER-L'))
        || ['sensorCircle', 'gateCircle'].includes(feature.properties?.type));
    return [...placed, {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(dam.longitude), Number(dam.latitude)] },
        properties: { type: 'damCircle', dbId: dam.id, damId: dam.id, latitude: Number(dam.latitude), longitude: Number(dam.longitude) },
    }];
}
