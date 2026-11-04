import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { EvacStatus, RouteResult } from '@/services/evacuation/evacuation.service';

type Props = {
  status: EvacStatus | null;
  me: [number, number] | null;          // [lng, lat]
  route: Partial<RouteResult> | null;   // a team's route has no shelter
  sos: boolean;
  onPick?: (lat: number, lng: number) => void;   // long-press (demo location)
  height?: number;
  target?: LngLat | null;     // the SOS person (response team view)
  targetLabel?: string;
  teams?: { pos: LngLat; label: string; emoji?: string }[];   // response teams coming to help
  teamRoute?: LngLat[] | null;                                // road route of the team on the way
  follow?: boolean;                                           // navigation: keep the map on my position
};
type LngLat = [number, number];

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
.front{width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.3);animation:w 1.4s infinite}
@keyframes w{50%{box-shadow:0 0 0 12px rgba(37,99,235,.08)}}
.wtag{background:#1E40AF;color:#fff;border:none;font:700 11px sans-serif;padding:2px 6px;border-radius:6px;box-shadow:none}
.wtag:before{display:none}
</style></head><body><div id="map"></div><script>
var LEVEL={1:['#DC2626','#991B1B',.42],2:['#F97316','#C2410C',.36],3:['#EAB308','#A16207',.32],4:['#FDE047','#CA8A04',.26],5:['#22C55E','#15803D',.2]};
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([7.25,80.85],10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(map);
/* areas below lines and markers: zones are redrawn on every update and must not cover the route */
map.createPane('areas').style.zIndex=350;map.createPane('water').style.zIndex=380;
var zonesL=L.layerGroup().addTo(map),safeL=L.layerGroup().addTo(map),routeL=L.layerGroup().addTo(map),meL=L.layerGroup().addTo(map);
var centred=false;
function post(o){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(o));}
map.on('contextmenu',function(e){post({type:'pick',lat:e.latlng.lat,lng:e.latlng.lng});});
function geo(t){try{return typeof t==='string'?JSON.parse(t):t;}catch(e){return null;}}
function zone(z,kind){var s=LEVEL[z.hazardLevel]||LEVEL[3],g=geo(z.boundaryGeojson);if(!g)return;
  var op=kind==='danger'?s[2]:kind==='watch'?s[2]*.6:.1;
  return L.geoJSON(g,{pane:'areas',interactive:false,style:{color:s[1],weight:kind==='planning'?.5:1.2,fillColor:s[0],fillOpacity:op,dashArray:kind==='danger'?null:'4 4'}}).addTo(zonesL);}
/* ── Released water: blue band down the river to the flood front, zones it reached turn blue ── */
var FRONT=[[0,0],[15,3],[40,8],[80,15],[140,25],[210,35]];
function frontKm(m){if(m<=0)return 0;for(var i=1;i<FRONT.length;i++){var a=FRONT[i-1],b=FRONT[i];if(m<=b[0])return a[1]+(b[1]-a[1])*(m-a[0])/(b[0]-a[0]);}return 35;}
function dist(a,b){var la=(a[1]+b[1])/2*Math.PI/180;return Math.hypot((b[0]-a[0])*111320*Math.cos(la),(b[1]-a[1])*110540);}
var waterL=L.layerGroup().addTo(map),RIVERS={},WATER={};
window.ddasRivers=function(list){RIVERS={};(list||[]).forEach(function(r){var g=geo(r.geojson);if(!g)return;g=g.geometry||g;
  var c=g.type==='LineString'?g.coordinates:g.type==='MultiLineString'?[].concat.apply([],g.coordinates):null;
  if(!c||c.length<2)return;
  if(r.damLat!=null&&dist(c[c.length-1],[r.damLng,r.damLat])<dist(c[0],[r.damLng,r.damLat]))c=c.slice().reverse();
  RIVERS[r.damName]=c;});};
window.ddasWater=function(list){WATER={};waterL.clearLayers();
  (list||[]).forEach(function(r){if(!r.active||r.minutes==null)return;WATER[r.damName]=r.minutes;
    var c=RIVERS[r.damName];if(!c)return;var km=frontKm(r.minutes),left=km*1000,pts=[[c[0][1],c[0][0]]],front=null;
    for(var i=1;i<c.length&&left>0;i++){var d=dist(c[i-1],c[i]);
      if(d>=left){var f=left/d,p=[c[i-1][0]+(c[i][0]-c[i-1][0])*f,c[i-1][1]+(c[i][1]-c[i-1][1])*f];pts.push([p[1],p[0]]);front=[p[1],p[0]];left=0;}
      else{pts.push([c[i][1],c[i][0]]);left-=d;}}
    if(!front)front=pts[pts.length-1];
    if(pts.length>1){L.polyline(pts,{pane:'water',interactive:false,color:'#2563EB',weight:9,opacity:.55,lineCap:'round'}).addTo(waterL);
      L.polyline(pts,{pane:'water',interactive:false,color:'#BFDBFE',weight:3,dashArray:'2 12',lineCap:'round',className:'flow'}).addTo(waterL);}
    L.marker(front,{icon:L.divIcon({html:'<div class="front"></div>',className:'pin',iconSize:[16,16],iconAnchor:[8,8]}),zIndexOffset:800}).addTo(waterL)
      .bindTooltip('Water here · '+km.toFixed(1)+' km · '+Math.round(r.minutes)+' min',{permanent:true,direction:'right',offset:[10,0],className:'wtag'});
  });
  paintFlooded();};
function paintFlooded(){dangerLayers.forEach(function(d){var m=WATER[d.z.damName],s=LEVEL[d.z.hazardLevel]||LEVEL[3];
  var wet=m!=null&&d.z.floodEtaMin!=null&&m>=d.z.floodEtaMin;
  d.l.setStyle(wet?{color:'#1E40AF',fillColor:'#2563EB',fillOpacity:.55}:{color:s[1],fillColor:s[0],fillOpacity:s[2]});});}
var hill='<svg width="26" height="26" viewBox="0 0 34 34"><circle cx="17" cy="17" r="15" fill="#15803D" stroke="#fff" stroke-width="2"/><path d="M7 24 14 13l3.5 5 2.5-3.5L27 24Z" fill="#fff"/><path d="M20 7v8" stroke="#fff" stroke-width="1.6"/><path d="M20 7h5l-1.3 1.8L25 10.6h-5Z" fill="#FDE047"/></svg>';
function house(c){return '<svg width="24" height="24" viewBox="0 0 34 34"><circle cx="17" cy="17" r="14" fill="#fff" stroke="'+c+'" stroke-width="3"/><path d="M17 9.5 25 16h-2.2v7.5h-4.2v-4.6h-3.2v4.6h-4.2V16H9Z" fill="'+c+'"/></svg>';}
function icon(svg){return L.divIcon({html:svg,className:'pin',iconSize:[26,26],iconAnchor:[13,13]});}
var dangerLayers=[];
window.ddasStatus=function(s){zonesL.clearLayers();safeL.clearLayers();dangerLayers=[];
  (s.planningZones||[]).forEach(function(z){zone(z,'planning');});
  (s.watchZones||[]).forEach(function(z){zone(z,'watch');});
  (s.dangerZones||[]).forEach(function(z){var l=zone(z,'danger');l&&dangerLayers.push({z:z,l:l});});
  paintFlooded();
  (s.shelters||[]).forEach(function(h){
    var hg=h.kind==='high_ground';
    if(hg&&h.boundaryGeojson){var g=geo(h.boundaryGeojson);g&&L.geoJSON(g,{pane:'areas',interactive:false,style:{color:'#15803D',weight:1,fillColor:'#22C55E',fillOpacity:.28}}).addTo(safeL);}
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
  if(c.length>1&&!window.ddasFollowing)map.fitBounds(L.latLngBounds(c),{padding:[40,40],maxZoom:15});};
window.ddasMe=function(p,sos){meL.clearLayers();if(!p)return;var ll=[p[1],p[0]];
  L.marker(ll,{icon:L.divIcon({html:'<div class="me'+(sos?' sos':'')+'"></div>',className:'pin',iconSize:[18,18],iconAnchor:[9,9]}),zIndexOffset:1000}).addTo(meL);
  if(!centred){map.setView(ll,14);centred=true;}};
window.ddasCentre=function(p){p&&map.setView([p[1],p[0]],15);};
window.ddasFollow=function(p){window.ddasFollowing=true;p&&map.setView([p[1],p[0]],Math.max(map.getZoom(),16),{animate:true});};
/* the SOS person (seen by a response team) and the response team (seen by the person) */
var marksL=L.layerGroup().addTo(map);
var sosSvg='<svg width="30" height="30" viewBox="0 0 24 24"><path d="M12 1.5 22 12 12 22.5 2 12Z" fill="#DC2626" stroke="#fff" stroke-width="1.6"/><rect x="11" y="6.5" width="2" height="7" rx="1" fill="#fff"/><circle cx="12" cy="16.5" r="1.3" fill="#fff"/></svg>';
var teamSvg='<svg width="28" height="28" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="#1D4ED8" stroke="#fff" stroke-width="1.6"/><path d="M7.2 9.3 8.4 6.6c.3-.6.9-1 1.6-1h4c.7 0 1.3.4 1.6 1l1.2 2.7c.8.2 1.4.9 1.4 1.8v3.6h-1.4v1.4a1 1 0 0 1-2 0v-1.4H9.2v1.4a1 1 0 0 1-2 0v-1.4H5.8v-3.6c0-.9.6-1.6 1.4-1.8Zm1.6-.2h6.4l-.8-1.9H9.6l-.8 1.9Z" fill="#fff"/></svg>';
window.ddasMarks=function(m){marksL.clearLayers();
  if(m.target)L.marker([m.target[1],m.target[0]],{icon:L.divIcon({html:sosSvg,className:'pin',iconSize:[30,30],iconAnchor:[15,15]}),zIndexOffset:1100}).addTo(marksL).bindTooltip(m.targetLabel||'SOS',{permanent:true,direction:'top',offset:[0,-14],className:'wtag'});
  if(m.teamRoute&&m.teamRoute.length>1)L.polyline(m.teamRoute.map(function(c){return [c[1],c[0]];}),{interactive:false,color:'#1D4ED8',weight:4,opacity:.7,dashArray:'6 6'}).addTo(marksL);
  (m.teams||[]).forEach(function(t){var html=t.emoji?'<div style="width:30px;height:30px;border-radius:50%;background:#fff;border:3px solid #1D4ED8;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 4px rgba(0,0,0,.35)">'+t.emoji+'</div>':teamSvg;
    L.marker([t.pos[1],t.pos[0]],{icon:L.divIcon({html:html,className:'pin',iconSize:[30,30],iconAnchor:[15,15]}),zIndexOffset:1050}).addTo(marksL).bindTooltip(t.label||'Response team',{permanent:true,direction:'top',offset:[0,-15],className:'wtag'});});};
post({type:'ready'});
</script></body></html>`;

/** Live evacuation map: zones, safe high ground, shelters, my position and my route. Long-press to place yourself (demo). */
export function EvacuationMap({ status, me, route, sos, onPick, height = 340, target, targetLabel, teams, teamRoute, follow }: Props) {
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

  // River lines once; the water front (minutes since release) on every update
  const riversKey = (status?.rivers || []).map((r) => r.damId).join(',');
  useEffect(() => {
    if (ready && status?.rivers) run(`window.ddasRivers(${JSON.stringify(status.rivers)})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, riversKey]);

  const water = (status?.rivers || []).map((r) => ({ damName: r.damName, active: r.active, minutes: r.minutesSinceRelease }));
  const waterKey = JSON.stringify(water);
  useEffect(() => {
    if (ready) run(`window.ddasWater(${waterKey})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, waterKey, statusKey, riversKey]);

  useEffect(() => {
    if (ready) run(`window.ddasRoute(${JSON.stringify(route)})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, route]);

  useEffect(() => {
    if (ready && follow && me) run(`window.ddasFollow(${JSON.stringify(me)})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, follow, me?.[0], me?.[1]]);

  useEffect(() => {
    if (ready) run(`window.ddasMe(${JSON.stringify(me)}, ${sos})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, me?.[0], me?.[1], sos]);

  const marks = JSON.stringify({ target: target ?? null, targetLabel, teams: teams ?? [], teamRoute: teamRoute ?? null });
  useEffect(() => {
    if (ready) run(`window.ddasMarks(${marks})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, marks]);

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
