import geography from '../../data/victoria-geography.json';

export const isVictoriaDemo = dam => dam?.code === 'DEMO-002' && dam?.name === 'Victoria Dam';
export const victoriaReference = dam => isVictoriaDemo(dam) ? geography : null;

// Equipment and zone records are deliberately placed demo points for Victoria.
export function referenceMapFeatures(dam, features) {
    if (!isVictoriaDemo(dam)) return features;
    const placed = features.filter(feature => feature.properties?.zoneCode?.startsWith('VICTORIA-DEMO-L')
        || ['sensorCircle', 'gateCircle'].includes(feature.properties?.type));
    return [...placed, {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(dam.longitude), Number(dam.latitude)] },
        properties: { type: 'damCircle', dbId: dam.id, damId: dam.id, latitude: Number(dam.latitude), longitude: Number(dam.longitude) },
    }];
}
