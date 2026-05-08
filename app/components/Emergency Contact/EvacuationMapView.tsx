import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, Text } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { safeLocationService } from '@/services/safe-locations/safe-location.service';
import { ensureAuth } from '@/services/api/auto-auth';

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

interface Props {
  onLocationSelect?: (location: Record<string, unknown>) => void;
  height?: number;
}

const EVAC_ICONS: Record<string, string> = {
  evacuation_center: '🏠', evacuation: '🏠', shelter: '🏠',
  police_station: '🛡', police: '🛡',
  hospital: '🏥', clinic: '⚕',
  fire_station: '🔥', fire: '🔥',
  school: '🏫', temple: '🕌', mosque: '🕌',
  community_hall: '🏛', safe_zone: '✅',
};

function buildHtml(locations: SafeLocation[]): string {
  const locJson = JSON.stringify(locations);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{width:100%;height:100%;background:#e8e0d8}
    #map{width:100%;height:100%}
    .pw{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-width:150px}
    .pn{font-weight:700;font-size:14px;color:#111827;margin-bottom:2px;line-height:1.3}
    .pc{font-size:11px;color:#6b7280;margin-bottom:5px}
    .pp{font-size:12px;color:#2563eb;font-weight:600;margin-bottom:4px}
    .ps{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
    .s-active{background:#dcfce7;color:#16a34a}
    .s-full{background:#fef9c3;color:#ca8a04}
    .s-closed,.s-inactive{background:#fee2e2;color:#dc2626}
    .s-maintenance{background:#dbeafe;color:#2563eb}
    .custom-leaflet-marker{background:none!important;border:none!important}
    .leaflet-popup-content-wrapper{border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.15)}
    .leaflet-popup-content{margin:12px 14px}
  </style>
</head>
<body>
<div id="map"></div>
<script>
var LOCATIONS = ${locJson};

/* SVG paths matching Lucide icons used by the web dashboard */
var ICON_SVGS = {
  police_station:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  hospital:'<path d="M12 6v4"/><path d="M14 14h-4"/><path d="M14 18h-4"/><path d="M14 8h-4"/><path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"/><path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18"/>',
  clinic:'<path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>',
  fire_station:'<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  school:'<path d="M14 22v-4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M18 5v17"/><path d="m4 6 8-4 8 4"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/>',
  temple:'<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
  community_hall:'<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
  safe_zone:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  evacuation_center:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'
};
var ICON_KEY_MAP = {
  police_station:'police_station',police:'police_station',
  hospital:'hospital',clinic:'clinic',
  fire_station:'fire_station',fire:'fire_station',
  school:'school',temple:'temple',mosque:'temple',
  community_hall:'community_hall',safe_zone:'safe_zone',
  evacuation_center:'evacuation_center',evacuation:'evacuation_center',shelter:'evacuation_center'
};

function safeColor(c){return c&&/^#[0-9a-fA-F]{3,6}$/.test((c||'').trim())?c.trim():'#2563eb';}

/* Matches web dashboard: white circle + colored border + SVG icon + triangle pointer */
function makeIcon(color,iconName){
  var c=safeColor(color);
  var key=ICON_KEY_MAP[(iconName||'').toLowerCase().trim()]||'evacuation_center';
  var svg='<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="'+c+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'+ICON_SVGS[key]+'</svg>';
  return L.divIcon({
    html:'<div style="width:32px;height:32px;border-radius:50%;background:white;border:2px solid '+c+';display:flex;align-items:center;justify-content:center;box-shadow:0 4px 6px -1px rgba(0,0,0,0.2);">'+svg+'</div>'+
         '<div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid '+c+';margin:-2px auto 0;"></div>',
    className:'custom-leaflet-marker',iconSize:[32,40],iconAnchor:[16,40],popupAnchor:[0,-42]
  });
}

function statusClass(s){
  if(!s||s==='active')return 's-active';
  if(s==='full')return 's-full';
  if(s==='closed')return 's-closed';
  if(s==='inactive')return 's-inactive';
  if(s==='under_maintenance')return 's-maintenance';
  return 's-active';
}

function statusLabel(s){return s?(s.replace(/_/g,' ').toUpperCase()):'ACTIVE';}

function buildPopup(loc){
  var phone=loc.emergencyPhone||loc.contactPhone||'';
  var cap=loc.capacityPersons?(' · '+loc.capacityPersons+' people'):'';
  var html='<div class="pw">';
  html+='<div class="pn">'+(loc.name||'')+'</div>';
  if(loc.code)html+='<div class="pc">'+loc.code+cap+'</div>';
  if(phone)html+='<div class="pp">📞 '+phone+'</div>';
  html+='<span class="ps '+statusClass(loc.status)+'">'+statusLabel(loc.status)+'</span>';
  html+='</div>';
  return html;
}

var map=L.map('map',{zoomControl:true,attributionControl:false}).setView([7.8731,80.7718],8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

var bounds=[];
LOCATIONS.forEach(function(loc){
  var lat=parseFloat(loc.latitude),lng=parseFloat(loc.longitude);
  if(!lat||!lng)return;
  bounds.push([lat,lng]);
  var m=L.marker([lat,lng],{icon:makeIcon(loc.markerColor,loc.markerIcon)});
  m.bindPopup(buildPopup(loc),{maxWidth:220,minWidth:160});
  m.on('click',function(){
    if(window.ReactNativeWebView){
      window.ReactNativeWebView.postMessage(JSON.stringify(loc));
    }
  });
  m.addTo(map);
});

setTimeout(function(){
  if(bounds.length===1){map.setView(bounds[0],13);}
  else if(bounds.length>1){map.fitBounds(bounds,{padding:[40,40],maxZoom:13});}
},300);
</script>
</body>
</html>`;
}

export function EvacuationMapView({ onLocationSelect, height = 240 }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureAuth().then(() => safeLocationService.getList())
      .then((res) => {
        const locations: SafeLocation[] = Array.isArray(res.data) ? res.data : [];
        setHtml(buildHtml(locations));
      })
      .catch(() => setHtml(buildHtml([])))
      .finally(() => setLoading(false));
  }, []);

  const handleMessage = (e: WebViewMessageEvent) => {
    try {
      const loc = JSON.parse(e.nativeEvent.data) as Record<string, unknown>;
      onLocationSelect?.(loc);
    } catch {
      // ignore malformed messages
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { height, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="small" color="#2563eb" />
        <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 6 }}>Loading map…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        source={{ html: html ?? buildHtml([]) }}
        onMessage={handleMessage}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        originWhitelist={['*']}
        mixedContentMode="always"
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        androidLayerType="hardware"
        nestedScrollEnabled={true}
        overScrollMode="never"
        setBuiltInZoomControls={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  webview: {
    height: '100%',
    width: '100%',
    backgroundColor: 'transparent',
  },
});
