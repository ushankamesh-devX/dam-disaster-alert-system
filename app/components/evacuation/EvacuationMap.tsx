import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { EvacStatus, RouteResult } from '@/services/evacuation/evacuation.service';

type Props = {
  status: EvacStatus | null;
  me: [number, number] | null;          // [lng, lat]
  route: RouteResult | null;
  sos: boolean;
  onPick?: (lat: number, lng: number) => void;   // long-press (demo location)
  height?: number;
};

// Leaflet in a WebView (works in Expo Go). Same colours as the web evacuation map.
const HTML = `<!DOCTYPE html><html><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
html,body,#map{margin:0;width:100%;height:100%;background:#e8e0d8}
.me{width:18px;height:18px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25)}
.me.sos{background:#DC2626;box-shadow:0 0 0 8px rgba(220,38,38,.3);animation:p 1s infinite}
@keyframes p{50%{box-shadow:0 0 0 14px rgba(220,38,38,.1)}}
.pin{background:none!important;border:none!important}
.flow{animation:f 1s linear infinite}@keyframes f{to{stroke-dashoffset:-10}}
.tag{background:#15803D;color:#fff;border:none;font:600 11px sans-serif;padding:1px 5px;border-radius:6px;box-shadow:none}
.tag:before{display:none}
</style></head><body><div id="map"></div><script>
var LEVEL={1:['#DC2626','#991B1B',.42],2:['#F97316','#C2410C',.36],3:['#EAB308','#A16207',.32],4:['#FDE047','#CA8A04',.26],5:['#22C55E','#15803D',.2]};
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([7.25,80.85],10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(map);
var zonesL=L.layerGroup().addTo(map),safeL=L.layerGroup().addTo(map),routeL=L.layerGroup().addTo(map),meL=L.layerGroup().addTo(map);
var centred=false;
function post(o){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(o));}
map.on('contextmenu',function(e){post({type:'pick',lat:e.latlng.lat,lng:e.latlng.lng});});
function geo(t){try{return typeof t==='string'?JSON.parse(t):t;}catch(e){return null;}}
function zone(z,kind){var s=LEVEL[z.hazardLevel]||LEVEL[3],g=geo(z.boundaryGeojson);if(!g)return;
  var op=kind==='danger'?s[2]:kind==='watch'?s[2]*.6:.1;
  L.geoJSON(g,{interactive:false,style:{color:s[1],weight:kind==='planning'?.5:1.2,fillColor:s[0],fillOpacity:op,dashArray:kind==='danger'?null:'4 4'}}).addTo(zonesL);}
var hill='<svg width="26" height="26" viewBox="0 0 34 34"><circle cx="17" cy="17" r="15" fill="#15803D" stroke="#fff" stroke-width="2"/><path d="M7 24 14 13l3.5 5 2.5-3.5L27 24Z" fill="#fff"/><path d="M20 7v8" stroke="#fff" stroke-width="1.6"/><path d="M20 7h5l-1.3 1.8L25 10.6h-5Z" fill="#FDE047"/></svg>';
function house(c){return '<svg width="24" height="24" viewBox="0 0 34 34"><circle cx="17" cy="17" r="14" fill="#fff" stroke="'+c+'" stroke-width="3"/><path d="M17 9.5 25 16h-2.2v7.5h-4.2v-4.6h-3.2v4.6h-4.2V16H9Z" fill="'+c+'"/></svg>';}
function icon(svg){return L.divIcon({html:svg,className:'pin',iconSize:[26,26],iconAnchor:[13,13]});}
window.ddasStatus=function(s){zonesL.clearLayers();safeL.clearLayers();
  (s.planningZones||[]).forEach(function(z){zone(z,'planning');});
  (s.watchZones||[]).forEach(function(z){zone(z,'watch');});
  (s.dangerZones||[]).forEach(function(z){zone(z,'danger');});
  (s.shelters||[]).forEach(function(h){
    var hg=h.kind==='high_ground';
    if(hg&&h.boundaryGeojson){var g=geo(h.boundaryGeojson);g&&L.geoJSON(g,{interactive:false,style:{color:'#15803D',weight:1,fillColor:'#22C55E',fillOpacity:.28}}).addTo(safeL);}
    var bad=h.inDangerZone||h.floodSafety==='unsafe'||h.status==='closed';
    var m=L.marker([h.lat,h.lng],{icon:icon(hg?hill:house(bad?'#64748B':'#16A34A'))}).addTo(safeL);
    m.bindPopup('<b>'+h.name+'</b>'+(h.aboveFloodM!=null?'<br>'+h.aboveFloodM+' m above the flood':'')+(h.capacity?'<br>'+(h.occupancy||0)+' / '+h.capacity+' people':''));
  });};
window.ddasRoute=function(r){routeL.clearLayers();if(!r)return;
  var c=(r.route&&r.route.coordinates||[]).map(function(p){return [p[1],p[0]];});
  if(c.length>1){L.polyline(c,{color:'#15803D',weight:7,opacity:.85,lineCap:'round'}).addTo(routeL);
    L.polyline(c,{color:'#fff',weight:2.5,dashArray:'1 9',lineCap:'round',className:'flow'}).addTo(routeL);}
  if(r.shelter){L.marker([r.shelter.lat,r.shelter.lng],{icon:icon(hill),zIndexOffset:900}).addTo(routeL)
    .bindTooltip(r.shelter.aboveFloodM!=null?'▲ '+r.shelter.aboveFloodM+' m':'Safe place',{permanent:true,direction:'bottom',offset:[0,12],className:'tag'});}
  if(c.length>1)map.fitBounds(L.latLngBounds(c),{padding:[40,40],maxZoom:15});};
window.ddasMe=function(p,sos){meL.clearLayers();if(!p)return;var ll=[p[1],p[0]];
  L.marker(ll,{icon:L.divIcon({html:'<div class="me'+(sos?' sos':'')+'"></div>',className:'pin',iconSize:[18,18],iconAnchor:[9,9]}),zIndexOffset:1000}).addTo(meL);
  if(!centred){map.setView(ll,14);centred=true;}};
window.ddasCentre=function(p){p&&map.setView([p[1],p[0]],15);};
post({type:'ready'});
</script></body></html>`;

/** Live evacuation map: zones, safe high ground, shelters, my position and my route. Long-press to place yourself (demo). */
export function EvacuationMap({ status, me, route, sos, onPick, height = 340 }: Props) {
  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const source = useMemo(() => ({ html: HTML }), []);

  // Zones are big: only resend when they change
  const statusKey = status
    ? [status.dangerZones, status.watchZones, status.planningZones].map((l) => (l || []).map((z) => z.id).join(',')).join('|')
      + '|' + (status.shelters || []).map((s) => `${s.id}:${s.occupancy}`).join(',')
    : '';

  const run = (js: string) => ref.current?.injectJavaScript(`${js};true;`);

  useEffect(() => {
    if (ready && status) run(`window.ddasStatus(${JSON.stringify(status)})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, statusKey]);

  useEffect(() => {
    if (ready) run(`window.ddasRoute(${JSON.stringify(route)})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, route]);

  useEffect(() => {
    if (ready) run(`window.ddasMe(${JSON.stringify(me)}, ${sos})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, me?.[0], me?.[1], sos]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'ready') setReady(true);
      else if (msg.type === 'pick') onPick?.(msg.lat, msg.lng);
    } catch {
      // ignore
    }
  };

  return (
    <View style={[styles.box, { height }]}>
      <WebView ref={ref} source={source} onMessage={onMessage} originWhitelist={['*']} javaScriptEnabled
        domStorageEnabled mixedContentMode="always" style={styles.web} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  web: { flex: 1, backgroundColor: 'transparent' },
});
