import { useCallback, useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Polyline, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { Route } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import EvacuationService from '../../services/evacuation.service';
import { MAP_OPTIONS, TILE_PROPS, SRI_LANKA_CENTER } from '../../components/map/mapDefaults';
import { MapBehavior, DamJumpControl } from '../../components/map/MapControls';

function parseGeo(text) {
    try {
        return typeof text === 'string' ? JSON.parse(text) : text;
    } catch {
        return null;
    }
}

function shelterColor(s) {
    if (s.inDangerZone || s.status === 'closed' || s.status === 'inactive') return '#6b7280';
    if (s.status === 'full' || (s.capacity && s.occupancy >= s.capacity)) return '#dc2626';
    if (s.capacity && s.occupancy / s.capacity >= 0.8) return '#f59e0b';
    return '#16a34a';
}

/** Geoman polygon tool for drawing blocked roads. */
function BlockedRoadDrawer({ onDrawn }) {
    const map = useMap();
    useEffect(() => {
        map.pm.addControls({
            position: 'topleft',
            drawPolygon: true,
            drawRectangle: true,
            drawMarker: false, drawCircleMarker: false, drawPolyline: false, drawCircle: false, drawText: false,
            editMode: false, dragMode: false, cutPolygon: false, removalMode: false, rotateMode: false,
        });
        map.pm.setPathOptions({ color: '#111827', dashArray: '6 4', fillOpacity: 0.25 });
        const handler = (e) => {
            const geometry = e.layer.toGeoJSON().geometry;
            map.removeLayer(e.layer);   // shown again from server data once saved
            onDrawn(geometry);
        };
        map.on('pm:create', handler);
        return () => {
            map.off('pm:create', handler);
            map.pm.removeControls();
        };
    }, [map, onDrawn]);
    return null;
}

function RouteTester({ enabled, onPick }) {
    useMapEvents({
        click(e) {
            if (enabled) onPick(e.latlng);
        },
    });
    return null;
}

function Stat({ label, value, alert }) {
    return (
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className={`text-lg font-semibold tabular-nums ${alert ? 'text-destructive' : 'text-foreground'}`}>{value}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
        </div>
    );
}

function Panel({ title, children, className = '' }) {
    return (
        <Card className={`gap-2 py-3 ${className}`}>
            <CardHeader className="px-4"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
            <CardContent className="px-4 space-y-2 text-sm">{children}</CardContent>
        </Card>
    );
}

export default function EvacuationPage() {
    const [status, setStatus] = useState(null);
    const [live, setLive] = useState(false);
    const [error, setError] = useState('');
    const [draft, setDraft] = useState(null);   // { geometry, name, reason, expiresAt }
    const [testMode, setTestMode] = useState(false);
    const [travelMode, setTravelMode] = useState('walk');
    const [testResult, setTestResult] = useState(null);
    const [packsMsg, setPacksMsg] = useState('');

    useEffect(() => {
        EvacuationService.status().then(setStatus).catch((e) => setError(e.message));
        return EvacuationService.subscribe(setStatus, setLive);
    }, []);

    const onDrawn = useCallback((geometry) => setDraft({ geometry, name: '', reason: '', expiresAt: '' }), []);

    const saveDraft = async () => {
        try {
            await EvacuationService.createBlockedRoad(draft);
            setDraft(null);
            setStatus(await EvacuationService.status());
        } catch (e) {
            setError(e.response?.data?.message || e.message);
        }
    };

    const removeBlocked = async (id) => {
        try {
            await EvacuationService.deleteBlockedRoad(id);
            setStatus(await EvacuationService.status());
        } catch (e) {
            setError(e.response?.data?.message || e.message);
        }
    };

    const testRoute = async ({ lat, lng }) => {
        setTestResult({ loading: true, from: [lat, lng] });
        try {
            const r = await EvacuationService.route(lat, lng, travelMode);
            setTestResult({ ...r, from: [lat, lng] });
        } catch (e) {
            setTestResult({ error: e.message, from: [lat, lng] });
        }
    };

    const rebuildPacks = async () => {
        setPacksMsg('Rebuilding…');
        try {
            const r = await EvacuationService.rebuildPacks();
            setPacksMsg(`Built ${r.built} offline route packs`);
        } catch (e) {
            setPacksMsg(e.response?.data?.message || e.message);
        }
    };

    const zones = status?.dangerZones || [];
    const shelters = status?.shelters || [];
    const blocked = status?.blockedRoads || [];
    const openShelters = shelters.filter((s) => shelterColor(s) !== '#6b7280').length;
    const routeLine = testResult?.route?.coordinates?.map(([lng, lat]) => [lat, lng]);

    return (
        <div className="flex h-full flex-col gap-3">
            {/* One compact row: title, live state, key numbers */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border bg-card px-4 py-2">
                <div className="flex items-center gap-2">
                    <h1 className="text-base font-semibold">Evacuation</h1>
                    <Badge variant={live ? 'default' : 'secondary'} className={live ? 'bg-success text-white' : ''}>
                        <span className={`size-1.5 rounded-full ${live ? 'bg-white' : 'bg-muted-foreground'}`} />
                        {live ? 'Live' : 'Reconnecting…'}
                    </Badge>
                </div>
                <Stat label="danger zones" value={zones.length} alert={zones.length > 0} />
                <Stat label="phones in danger" value={status?.devicesInDanger ?? '–'} alert={status?.devicesInDanger > 0} />
                <Stat label="active phones" value={status?.activeDevices ?? '–'} />
                <Stat label="open shelters" value={`${openShelters}/${shelters.length}`} />
                <Stat label="blocked roads" value={blocked.length} />
            </div>

            {error && (
                <div role="alert" className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {error}
                    <Button variant="ghost" size="sm" onClick={() => setError('')}>Dismiss</Button>
                </div>
            )}

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                <Card className="flex min-h-[480px] flex-col gap-0 overflow-hidden py-0">
                    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
                        <Button size="sm" variant={testMode ? 'default' : 'outline'} onClick={() => setTestMode((v) => !v)}>
                            <Route /> {testMode ? 'Click the map…' : 'Test a route'}
                        </Button>
                        <div className="inline-flex rounded-lg border p-0.5" role="group" aria-label="Travel mode">
                            {['walk', 'drive'].map((m) => (
                                <Button key={m} size="sm" variant={travelMode === m ? 'secondary' : 'ghost'} className="h-7 capitalize"
                                    aria-pressed={travelMode === m} onClick={() => setTravelMode(m)}>{m}</Button>
                            ))}
                        </div>
                        <span className="text-xs text-muted-foreground">Draw a shape with the tools on the map to block a road</span>
                    </div>
                    <MapContainer {...MAP_OPTIONS} center={SRI_LANKA_CENTER} zoom={8} className="min-h-0 flex-1" style={{ borderRadius: 0 }}>
                        <TileLayer {...TILE_PROPS} />
                        <MapBehavior fitDams />
                        <DamJumpControl />
                        <BlockedRoadDrawer onDrawn={onDrawn} />
                        <RouteTester enabled={testMode} onPick={testRoute} />

                        {zones.map((z) => {
                            const geo = parseGeo(z.boundaryGeojson);
                            return geo && (
                                <GeoJSON
                                    key={`zone-${z.id}-${z.devicesInside}`}
                                    data={geo}
                                    style={{ color: z.color || '#dc2626', weight: 2, fillOpacity: 0.3 }}
                                >
                                    <Tooltip sticky>
                                        {z.damName} · {z.name} (level {z.hazardLevel})<br />
                                        Flood in ~{z.floodEtaMin ?? '?'} min · {z.devicesInside} phones inside
                                    </Tooltip>
                                </GeoJSON>
                            );
                        })}

                        {blocked.map((b) => {
                            const geo = parseGeo(b.boundaryGeojson);
                            return geo && (
                                <GeoJSON key={`blocked-${b.id}`} data={geo} style={{ color: '#111827', dashArray: '6 4', weight: 2, fillOpacity: 0.25 }}>
                                    <Tooltip sticky>Blocked: {b.name}{b.reason ? ` — ${b.reason}` : ''}</Tooltip>
                                </GeoJSON>
                            );
                        })}

                        {shelters.map((s) => (
                            <CircleMarker
                                key={`shelter-${s.id}`}
                                center={[s.lat, s.lng]}
                                radius={8}
                                pathOptions={{ color: '#fff', weight: 2, fillColor: shelterColor(s), fillOpacity: 1 }}
                            >
                                <Popup>
                                    <strong>{s.name}</strong><br />
                                    {s.capacity ? `${s.occupancy ?? 0} / ${s.capacity} people` : 'Capacity unknown'}<br />
                                    {s.inDangerZone ? 'Inside a danger zone — not used' : `Status: ${s.status}`}
                                </Popup>
                            </CircleMarker>
                        ))}

                        {testResult?.from && (
                            <CircleMarker center={testResult.from} radius={6} pathOptions={{ color: '#2563eb', fillOpacity: 1 }} />
                        )}
                        {routeLine && <Polyline positions={routeLine} pathOptions={{ color: '#2563eb', weight: 5 }} />}
                    </MapContainer>
                    <div className="flex flex-wrap items-center gap-4 border-t px-3 py-1.5 text-xs text-muted-foreground" aria-label="Map legend">
                        <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-red-500/60" /> Danger zone</span>
                        <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-green-600" /> Shelter open</span>
                        <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-amber-500" /> Nearly full</span>
                        <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-red-600" /> Full</span>
                        <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-gray-500" /> Closed / in zone</span>
                        <span className="flex items-center gap-1"><span className="h-0.5 w-3 bg-gray-900" /> Blocked road</span>
                        <span className="flex items-center gap-1"><span className="h-1 w-3 rounded bg-blue-600" /> Route</span>
                    </div>
                </Card>

                <div className="min-h-0 space-y-3 overflow-y-auto">
                    {draft && (
                        <Panel title="New blocked road">
                            <div className="space-y-1"><Label htmlFor="br-name">Name</Label>
                                <Input id="br-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
                            <div className="space-y-1"><Label htmlFor="br-reason">Reason</Label>
                                <Input id="br-reason" value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} /></div>
                            <div className="space-y-1"><Label htmlFor="br-exp">Expires (optional)</Label>
                                <Input id="br-exp" type="datetime-local" value={draft.expiresAt} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} /></div>
                            <div className="flex gap-2 pt-1">
                                <Button size="sm" disabled={!draft.name.trim()} onClick={saveDraft}>Save</Button>
                                <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
                            </div>
                        </Panel>
                    )}

                    {testResult && (
                        <Panel title="Route test">
                            {testResult.loading && <p>Finding route…</p>}
                            {testResult.error && <p className="text-destructive">{testResult.error}</p>}
                            {testResult.shelter && (
                                <>
                                    {testResult.inDangerZone && (
                                        <p className="font-medium text-destructive">In danger zone: {testResult.zone?.name} (flood in ~{testResult.floodEtaMin} min)</p>
                                    )}
                                    <p>Go to <strong>{testResult.shelter.name}</strong></p>
                                    <p className="text-muted-foreground">{testResult.distanceKm} km · ~{testResult.etaMin} min</p>
                                    {!testResult.safe && <p className="text-destructive">Slower than the flood: leave now</p>}
                                    {!testResult.routingAvailable && <p className="text-warning">Routing unavailable: straight-line estimate</p>}
                                    {testResult.alternatives?.length > 0 && (
                                        <p className="text-muted-foreground">Other shelters: {testResult.alternatives.map((a) => `${a.shelter.name} (${a.etaMin} min)`).join(', ')}</p>
                                    )}
                                </>
                            )}
                        </Panel>
                    )}

                    <Panel title={`Blocked roads (${blocked.length})`}>
                        {blocked.length === 0 && <p className="text-muted-foreground">None</p>}
                        <ul className="space-y-2">
                            {blocked.map((b) => (
                                <li key={b.id} className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium">{b.name}</p>
                                        {b.reason && <p className="text-muted-foreground">{b.reason}</p>}
                                        {b.expiresAt && <p className="text-xs text-muted-foreground">Until {new Date(b.expiresAt).toLocaleString()}</p>}
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeBlocked(b.id)}>Remove</Button>
                                </li>
                            ))}
                        </ul>
                    </Panel>

                    <Panel title="Offline route packs">
                        <p className="text-muted-foreground">Rebuilt every 6 hours. Rebuild after changing blocked roads or shelters.</p>
                        <Button variant="outline" size="sm" onClick={rebuildPacks}>Rebuild now</Button>
                        {packsMsg && <p>{packsMsg}</p>}
                    </Panel>
                </div>
            </div>
        </div>
    );
}
