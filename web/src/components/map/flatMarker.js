import L from 'leaflet';
import { tokens } from '../../theme/tokens';

// Flat fallback for Leaflet markers: no shaded PNG or drop shadow.
export const defaultMapMarker = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 24 32" aria-hidden="true"><path fill="${tokens.primary}" fill-rule="evenodd" d="M12 1a10 10 0 0 0-10 10c0 8 10 20 10 20s10-12 10-20A10 10 0 0 0 12 1Zm0 6a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"/></svg>`,
  className: 'md-flat-map-marker', iconSize: [28, 36], iconAnchor: [14, 36], popupAnchor: [0, -32],
});
