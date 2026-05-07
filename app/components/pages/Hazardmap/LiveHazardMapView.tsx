import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { safeLocationService } from '@/services/safe-locations/safe-location.service';
import { damService } from '@/services/dams/dam.service';
import { hazardZoneService } from '@/services/hazard/hazard-zone.service';
import { ensureAuth } from '@/services/api/auto-auth';

// ── Types matching exact API response fields ─────────────────────────────────

interface SafeLocation {
  id: number;
  name: string;
  code?: string;
  latitude: number;
  longitude: number;
  markerColor?: string;
  markerIcon?: string;
  status?: string;
  contactPhone?: string;
  emergencyPhone?: string;
  capacityPersons?: number;
}

interface Dam {
  id: number;
  name: string;
  code?: string;
  latitude: number;
  longitude: number;
  overallHazardStatus?: string;
  damType?: string;
  heightMeters?: number;
}

interface HazardZone {
  id: number;
  zoneName?: string;
  zoneCode?: string;
  damName?: string;
  boundaryGeojson?: string;
  fillColor?: string;
  strokeColor?: string;
  fillOpacity?: number;
  strokeWidth?: number;
  distanceFromDamKm?: number;
  estimatedFloodArrivalMinutes?: number;
  estimatedWaterDepthMeters?: number;
  areaSqKm?: number;
}

// ── Fetch all data in React Native (bypasses CORS) ───────────────────────────

async function fetchMapData() {
  await ensureAuth();

  const [locRes, damRes] = await Promise.all([
    safeLocationService.getList().catch(() => ({ data: [] as SafeLocation[] })),
    damService.getList().catch(() => ({ data: [] as Dam[] })),
  ]);

  const locations: SafeLocation[] = Array.isArray(locRes.data) ? locRes.data : [];
  const dams: Dam[] = Array.isArray(damRes.data) ? damRes.data : [];

  const zoneArrays = await Promise.all(
    dams
      .filter((d) => d.id)
      .map((d) =>
        hazardZoneService
          .getActiveByDam(String(d.id))
          .then((r) => (Array.isArray(r.data) ? (r.data as HazardZone[]) : []))
          .catch(() => [] as HazardZone[]),
      ),
  );

  return { locations, dams, zones: zoneArrays.flat() };
}

// ── Build Leaflet HTML with pre-injected JSON ────────────────────────────────
// No API calls happen inside the WebView — data is already embedded.

function buildHtml(
  locations: SafeLocation[],
  dams: Dam[],
  zones: HazardZone[],
): string {
  const locJson = JSON.stringify(locations);
  const damsJson = JSON.stringify(dams);
  const zonesJson = JSON.stringify(zones);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%}
#map{width:100%;height:100%}
.lp{font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;min-width:160px}
.lp-name{font-weight:700;color:#111827;font-size:14px;margin-bottom:3px}
.lp-sub{color:#6b7280;font-size:11px;margin-bottom:4px}
.lp-row{display:flex;justify-content:space-between;gap:8px;margin:2px 0;font-size:12px;color:#374151}
.badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;text-transform:uppercase;margin-top:3px;letter-spacing:.4px}
.b-safe,.b-low,.b-active{background:#dcfce7;color:#16a34a}
.b-moderate{background:#fef9c3;color:#ca8a04}
.b-high,.b-severe{background:#fed7aa;color:#c2410c}
.b-critical,.b-closed,.b-inactive{background:#fee2e2;color:#dc2626}
.b-maintenance{background:#dbeafe;color:#2563eb}
.custom-leaflet-marker{background:none!important;border:none!important}
.leaflet-popup-content-wrapper{border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,.18)}
.leaflet-popup-content{margin:12px 14px}
</style>
</head>
<body>
<div id="map"></div>
<script>
/* ── Pre-injected data from React Native ── */
var LOCATIONS = ${locJson};
var DAMS      = ${damsJson};
var ZONES     = ${zonesJson};

/* ── Map setup ── */
var map = L.map('map', {zoomControl:true, attributionControl:false}).setView([7.8731, 80.7718], 8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19}).addTo(map);

var allBounds = [];

/* ── Helpers ── */
var DAM_COLORS = {
  safe:'#16a34a', low:'#84cc16', moderate:'#d97706',
  high:'#ea580c', severe:'#dc2626', critical:'#7f1d1d'
};

/* SVG paths matching Lucide icons used by the web dashboard */
var ICON_SVGS = {
  police_station: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  hospital: '<path d="M12 6v4"/><path d="M14 14h-4"/><path d="M14 18h-4"/><path d="M14 8h-4"/><path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"/><path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18"/>',
  clinic: '<path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>',
  fire_station: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  school: '<path d="M14 22v-4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M18 5v17"/><path d="m4 6 8-4 8 4"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/>',
  temple: '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
  community_hall: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
  safe_zone: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  evacuation_center: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'
};

var ICON_KEY_MAP = {
  police_station:'police_station', police:'police_station',
  hospital:'hospital',
  clinic:'clinic',
  fire_station:'fire_station', fire:'fire_station',
  school:'school',
  temple:'temple', mosque:'temple',
  community_hall:'community_hall',
  safe_zone:'safe_zone',
  evacuation_center:'evacuation_center', evacuation:'evacuation_center', shelter:'evacuation_center'
};

function safeHex(c,fb){return c&&/^#[0-9a-fA-F]{3,6}$/.test((c||'').trim())?c.trim():fb;}
function badgeCls(s){var m={safe:'b-safe',low:'b-low',active:'b-active',moderate:'b-moderate',high:'b-high',severe:'b-severe',critical:'b-critical',closed:'b-closed',inactive:'b-inactive',under_maintenance:'b-maintenance'};return 'badge '+(m[s]||'b-active');}
function fmtStatus(s){return (s||'active').replace(/_/g,' ').toUpperCase();}

/* Matches web dashboard: white circle + colored border + SVG icon + triangle pointer */
function makeEvacIcon(color, iconName) {
  var c = safeHex(color, '#2563eb');
  var key = ICON_KEY_MAP[(iconName||'').toLowerCase().trim()] || 'evacuation_center';
  var paths = ICON_SVGS[key];
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="'+c+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'+paths+'</svg>';
  return L.divIcon({
    html: '<div style="width:32px;height:32px;border-radius:50%;background:white;border:2px solid '+c+';display:flex;align-items:center;justify-content:center;box-shadow:0 4px 6px -1px rgba(0,0,0,0.2);">'+svg+'</div>'+
          '<div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid '+c+';margin:-2px auto 0;"></div>',
    className:'custom-leaflet-marker', iconSize:[32,40], iconAnchor:[16,40], popupAnchor:[0,-42]
  });
}

function makeDamIcon(hazardStatus) {
  var c = DAM_COLORS[hazardStatus] || '#2563eb';
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="'+c+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12v.01"/><path d="M2 10h20"/><path d="M7 6V4"/><path d="M17 6V4"/></svg>';
  return L.divIcon({
    html: '<div style="width:34px;height:34px;border-radius:7px;background:white;border:2px solid '+c+';display:flex;align-items:center;justify-content:center;box-shadow:0 4px 6px -1px rgba(0,0,0,0.2);">'+svg+'</div>'+
          '<div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid '+c+';margin:-2px auto 0;"></div>',
    className:'custom-leaflet-marker', iconSize:[34,42], iconAnchor:[17,42], popupAnchor:[0,-44]
  });
}

/* ── Plot Safe Locations ── */
LOCATIONS.forEach(function(loc) {
  var lat = parseFloat(loc.latitude), lng = parseFloat(loc.longitude);
  if (!lat || !lng) return;
  allBounds.push([lat, lng]);

  var phone = loc.emergencyPhone || loc.contactPhone || '';
  var cap   = loc.capacityPersons ? ' · '+loc.capacityPersons+' ppl' : '';
  var popup = '<div class="lp">'+
    '<div class="lp-name">'+(loc.name||'')+'</div>'+
    (loc.code ? '<div class="lp-sub">'+loc.code+cap+'</div>' : '')+
    (phone    ? '<div class="lp-row"><span>📞</span><span>'+phone+'</span></div>' : '')+
    '<span class="'+badgeCls(loc.status)+'">'+fmtStatus(loc.status)+'</span>'+
    '</div>';

  var m = L.marker([lat, lng], {icon: makeEvacIcon(loc.markerColor, loc.markerIcon)});
  m.bindPopup(popup, {maxWidth:220});
  m.addTo(map);
});

/* ── Plot Dam Markers ── */
DAMS.forEach(function(dam) {
  var lat = parseFloat(dam.latitude), lng = parseFloat(dam.longitude);
  if (!lat || !lng) return;
  allBounds.push([lat, lng]);

  var popup = '<div class="lp">'+
    '<div class="lp-name">'+(dam.name||dam.code||'Dam')+'</div>'+
    (dam.code    ? '<div class="lp-sub">'+dam.code+'</div>' : '')+
    (dam.damType ? '<div class="lp-row"><span>Type</span><span>'+dam.damType+'</span></div>' : '')+
    (dam.heightMeters ? '<div class="lp-row"><span>Height</span><span>'+dam.heightMeters+' m</span></div>' : '')+
    '<span class="'+badgeCls(dam.overallHazardStatus||'safe')+'">'+fmtStatus(dam.overallHazardStatus||'safe')+'</span>'+
    '</div>';

  var m = L.marker([lat, lng], {icon: makeDamIcon(dam.overallHazardStatus), zIndexOffset:1000});
  m.bindPopup(popup, {maxWidth:220});
  m.addTo(map);
});

/* ── Plot Hazard Zones ── */
ZONES.forEach(function(z) {
  if (!z.boundaryGeojson) return;
  var geo;
  try { geo = JSON.parse(z.boundaryGeojson); } catch(e) { return; }
  if (!geo || !geo.coordinates) return;

  var fill   = safeHex(z.fillColor, '#ef4444');
  var stroke = safeHex(z.strokeColor, '#cc0000');
  var opacity = (typeof z.fillOpacity === 'number') ? z.fillOpacity : parseFloat(z.fillOpacity||'0.35');
  var weight  = parseInt(z.strokeWidth||'2') || 2;

  var popup = '<div class="lp">'+
    '<div class="lp-name">'+(z.zoneName||'Hazard Zone')+'</div>'+
    (z.zoneCode ? '<div class="lp-sub">'+z.zoneCode+'</div>' : '')+
    (z.damName  ? '<div class="lp-row"><span>Dam</span><span>'+z.damName+'</span></div>' : '')+
    (z.distanceFromDamKm          ? '<div class="lp-row"><span>Distance</span><span>'+z.distanceFromDamKm+' km</span></div>' : '')+
    (z.estimatedFloodArrivalMinutes ? '<div class="lp-row"><span>⚠️ Flood ETA</span><span>'+z.estimatedFloodArrivalMinutes+' min</span></div>' : '')+
    (z.estimatedWaterDepthMeters  ? '<div class="lp-row"><span>Depth</span><span>'+z.estimatedWaterDepthMeters+' m</span></div>' : '')+
    (z.areaSqKm ? '<div class="lp-row"><span>Area</span><span>'+z.areaSqKm+' km²</span></div>' : '')+
    '</div>';

  var layer = L.geoJSON(geo, {
    style: {color: stroke, weight: weight, fillColor: fill, fillOpacity: opacity, opacity: 0.9}
  });
  layer.bindPopup(popup, {maxWidth:240});
  layer.addTo(map);

  /* collect polygon bounds */
  try {
    geo.coordinates[0].forEach(function(c){ allBounds.push([c[1], c[0]]); });
  } catch(e) {}
});

/* ── Auto-fit to show all features ── */
setTimeout(function() {
  if (allBounds.length === 1) { map.setView(allBounds[0], 13); }
  else if (allBounds.length > 1) {
    try { map.fitBounds(allBounds, {padding:[40,40], maxZoom:13}); } catch(e) {}
  }
}, 300);
</script>
</body>
</html>`;
}

// ── Component ────────────────────────────────────────────────────────────────

type LoadState = 'loading' | 'ready' | 'error';

export function LiveHazardMapView() {
  const [html, setHtml] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    fetchMapData()
      .then(({ locations, dams, zones }) => {
        setHtml(buildHtml(locations, dams, zones));
        setState('ready');
      })
      .catch(() => setState('error'));
  }, []);

  if (state === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadText}>Loading map data…</Text>
      </View>
    );
  }

  if (state === 'error' || !html) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Could not load map data</Text>
      </View>
    );
  }

  return (
    <WebView
      source={{ html }}
      style={styles.webview}
      scrollEnabled={false}
      bounces={false}
      originWhitelist={['*']}
      mixedContentMode="always"
      javaScriptEnabled
      domStorageEnabled
    />
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8e0d8',
    gap: 8,
  },
  loadText: { color: '#6b7280', fontSize: 13 },
  errorText: { color: '#dc2626', fontSize: 13 },
});
