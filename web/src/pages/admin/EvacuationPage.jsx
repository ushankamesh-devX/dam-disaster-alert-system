import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { FileText, Route } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import EvacuationService from '../../services/evacuation.service';
import CommandCenterService from '../../services/commandCenter.service';
import { MAP_OPTIONS, TILE_PROPS, SRI_LANKA_CENTER, loadMapDams } from '../../components/map/mapDefaults';
import { MapBehavior, DamJumpControl } from '../../components/map/MapControls';
import { BottleneckLayer, EvacuationRoutesLayer, LayerToggles, SafeAreasLayer, ServicesLayer, ShelterLayer, SosLayer } from '../../components/evacuation/LiveLayers';
import { BroadcastDialog, SosQueue, Timeline } from '../../components/evacuation/LivePanels';
import { PeoplePanel, PersonCard, ReplayBar, ShelterForecast, ZonesPanel } from '../../components/evacuation/AnalyticsPanels';
import { EMPTY_FILTER, filterPeople } from '../../components/evacuation/peopleFilter';
import MovingPeopleLayer from '../../components/evacuation/MovingPeopleLayer';
import RiverFloodLayer from '../../components/evacuation/RiverFloodLayer';
import ZonesLayer from '../../components/evacuation/ZonesLayer';
import WaterFlowLayer from '../../components/evacuation/WaterFlowLayer';
import { FLOODED_STYLE, LEVEL_STYLE } from '../../components/evacuation/zoneStyles';

function parseGeo(text) {
    try {
        return typeof text === 'string' ? JSON.parse(text) : text;
    } catch {
        return null;
    }
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

/** Pan to a selected SOS or person. */
function FlyTo({ target }) {
    const map = useMap();
    const lat = target?.[0];
    const lng = target?.[1];
    useEffect(() => {
        if (lat != null && lng != null) map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
    }, [map, lat, lng]);
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

function Panel({ title, children }) {
    return (
        <Card className="gap-2 py-3">
            <CardHeader className="px-4"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
            <CardContent className="space-y-2 px-4 text-sm">{children}</CardContent>
        </Card>
    );
}

const Legend = ({ colour, round = true, label }) => (
    <span className="flex items-center gap-1">
        <span className={`size-2.5 ${round ? 'rounded-full' : 'rounded-sm'}`} style={{ background: colour }} /> {label}
    </span>
);

export default function EvacuationPage() {
    const [status, setStatus] = useState(null);       // zones, shelters, blocked roads
    const [cc, setCc] = useState(null);               // summary, sos, services, timeline, rivers
    const [people, setPeople] = useState([]);
    const [analytics, setAnalytics] = useState(null); // zones, shelters, bottlenecks, stragglers, progress, incident
    const [live, setLive] = useState(false);
    const [error, setError] = useState('');
    const [layers, setLayers] = useState({
        zones: true, water: true, safe: true, routes: true, river: false, people: true, trails: false, sos: true, shelters: true,
        services: true, bottlenecks: true, blocked: true,
    });
    const [tab, setTab] = useState('sos');
    const [filter, setFilter] = useState(EMPTY_FILTER);
    const [selectedSos, setSelectedSos] = useState(null);
    const [selectedPersonId, setSelectedPersonId] = useState(null);
    const [personRoute, setPersonRoute] = useState(null);
    const [followRoute, setFollowRoute] = useState(false);
    const [replayFrames, setReplayFrames] = useState([]);
    const [replayFrame, setReplayFrame] = useState(null);
    const [dams, setDams] = useState([]);
    const [draft, setDraft] = useState(null);         // blocked road being drawn
    const [testMode, setTestMode] = useState(false);
    const [travelMode, setTravelMode] = useState('walk');
    const [testResult, setTestResult] = useState(null);
    const [packsMsg, setPacksMsg] = useState('');
    const [packs, setPacks] = useState([]);           // marked evacuation routes

    // People every 5 s (smooth movement); everything else every 10 s
    const refreshPeople = useCallback(async () => {
        try { setPeople(await CommandCenterService.people()); setLive(true); } catch { setLive(false); }
    }, []);
    const refreshAll = useCallback(async () => {
        const [snap, st, an] = await Promise.allSettled([
            CommandCenterService.snapshot(), EvacuationService.status(), CommandCenterService.analytics()]);
        if (snap.status === 'fulfilled') setCc(snap.value);
        if (st.status === 'fulfilled') setStatus(st.value);
        if (an.status === 'fulfilled') setAnalytics(an.value);
        if (snap.status === 'rejected' && st.status === 'rejected') setError('Cannot reach the API');
    }, []);
    useEffect(() => {
        const first = setTimeout(() => { refreshPeople(); refreshAll(); }, 0);
        const p = setInterval(refreshPeople, 5000);
        const a = setInterval(refreshAll, 10000);
        loadMapDams().then(setDams);
        const loadPacks = () => EvacuationService.packs().then(setPacks).catch(() => {});
        loadPacks();
        const r = setInterval(loadPacks, 60000);
        return () => { clearTimeout(first); clearInterval(p); clearInterval(a); clearInterval(r); };
    }, [refreshPeople, refreshAll]);

    const zones = status?.dangerZones || [];
    const shelters = status?.shelters || [];
    const blocked = status?.blockedRoads || [];
    const sos = cc?.sos || [];
    const services = cc?.services || [];
    const sm = cc?.summary || {};
    const zoneTiming = useMemo(() => new Map((analytics?.zones || []).map((z) => [z.id, z])), [analytics]);
    const stragglers = useMemo(() => analytics?.stragglers || [], [analytics]);
    const stragglerIds = useMemo(() => new Set(stragglers.map((s) => s.id)), [stragglers]);
    const shown = useMemo(() => filterPeople(people, filter, stragglerIds), [people, filter, stragglerIds]);
    const selectedPerson = people.find((p) => p.id === selectedPersonId) || null;

    // Replay: positions from the recorded frame instead of live people
    const mapPeople = useMemo(() => {
        if (!replayFrame) return layers.people ? shown : [];
        const names = new Map(people.map((p) => [p.id, p.name]));
        return replayFrame.p.map(([id, lat, lng, safe]) => ({
            id, lat, lng, name: names.get(id) || `Person ${id}`, state: safe ? 'safe' : 'moving', mode: 'walk', headingDeg: 0, trail: [],
        }));
    }, [replayFrame, shown, people, layers.people]);

    // Live route for the selected person (re-fetched every 15 s while "following")
    const loadRoute = useCallback(async (p) => {
        if (!p) return;
        try { setPersonRoute(await EvacuationService.route(p.lat, p.lng, p.mode)); } catch { setPersonRoute(null); }
    }, []);
    useEffect(() => {
        if (!followRoute || !selectedPerson) return undefined;
        const timer = setInterval(() => loadRoute(selectedPerson), 15000);
        return () => clearInterval(timer);
    }, [followRoute, selectedPerson, loadRoute]);

    const selectPerson = useCallback((id) => {
        setSelectedPersonId(id);
        setPersonRoute(null);
        setFollowRoute(false);
        setTab('people');
    }, []);

    const onDrawn = useCallback((geometry) => { setDraft({ geometry, name: '', reason: '', expiresAt: '' }); setTab('tools'); }, []);
    const saveDraft = async () => {
        try { await EvacuationService.createBlockedRoad(draft); setDraft(null); refreshAll(); } catch (e) { setError(e.response?.data?.message || e.message); }
    };
    const removeBlocked = async (id) => {
        try { await EvacuationService.deleteBlockedRoad(id); refreshAll(); } catch (e) { setError(e.response?.data?.message || e.message); }
    };
    const testRoute = async ({ lat, lng }) => {
        setTestResult({ loading: true, from: [lat, lng] });
        setTab('tools');
        try { setTestResult({ ...(await EvacuationService.route(lat, lng, travelMode)), from: [lat, lng] }); } catch (e) { setTestResult({ error: e.message, from: [lat, lng] }); }
    };
    const rebuildPacks = async () => {
        setPacksMsg('Rebuilding…');
        try { setPacksMsg(`Built ${(await EvacuationService.rebuildPacks()).built} offline route packs`); } catch (e) { setPacksMsg(e.response?.data?.message || e.message); }
    };
    const loadReplay = useCallback(async () => { setReplayFrames(await CommandCenterService.replay(60)); }, []);

    const testLine = testResult?.route?.coordinates?.map(([lng, lat]) => [lat, lng]);
    const personLine = personRoute?.route?.coordinates?.map(([lng, lat]) => [lat, lng]);
    const spaceLeft = Math.max(0, Number(sm.capacity || 0) - Number(sm.occupancy || 0));
    const flyTarget = selectedSos ? [Number(selectedSos.lat), Number(selectedSos.lng)]
        : selectedPerson ? [selectedPerson.lat, selectedPerson.lng] : null;

    return (
        <div className="flex h-full flex-col gap-3">
            {/* Title, live state, key numbers, actions */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border bg-card px-4 py-2">
                <div className="flex items-center gap-2">
                    <h1 className="text-base font-semibold">Evacuation</h1>
                    <Badge className={live ? 'bg-[#15803D] text-white' : ''} variant={live ? 'default' : 'secondary'}>
                        <span className={`size-1.5 rounded-full ${live ? 'bg-white' : 'bg-muted-foreground'}`} />
                        {replayFrame ? 'Replay' : live ? 'Live' : 'Connecting…'}
                    </Badge>
                </div>
                <Stat label="zones active" value={zones.length} alert={zones.length > 0} />
                <Stat label="in danger" value={sm.peopleInDanger ?? '–'} alert={sm.peopleInDanger > 0} />
                <Stat label="on the way" value={people.filter((p) => p.state === 'moving').length} />
                <Stat label="safe" value={sm.arrivedAtShelters ?? '–'} />
                <Stat label="SOS open" value={sm.sosOpen ?? '–'} alert={sm.sosOpen > 0} />
                <Stat label="shelter places left" value={sm.capacity != null ? spaceLeft : '–'} />
                <div className="ml-auto flex items-center gap-2">
                    <Button asChild size="sm" variant="outline"><Link to="/admin/evacuation/report"><FileText /> Incident report</Link></Button>
                    <BroadcastDialog dams={dams} />
                </div>
            </div>

            {error && (
                <div role="alert" className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {error}<Button variant="ghost" size="sm" onClick={() => setError('')}>Dismiss</Button>
                </div>
            )}

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
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
                        <span className="text-xs text-muted-foreground">Click a person or SOS for details · draw a shape to block a road</span>
                    </div>
                    <MapContainer {...MAP_OPTIONS} center={SRI_LANKA_CENTER} zoom={8} className="min-h-0 flex-1" style={{ borderRadius: 0 }}>
                        <TileLayer {...TILE_PROPS} />
                        <MapBehavior fitDams />
                        <DamJumpControl />
                        <BlockedRoadDrawer onDrawn={onDrawn} />
                        <RouteTester enabled={testMode} onPick={testRoute} />
                        <LayerToggles layers={layers} onChange={setLayers} />
                        <FlyTo target={flyTarget} />

                        {layers.safe && <SafeAreasLayer shelters={shelters} />}
                        {layers.routes && <EvacuationRoutesLayer packs={packs} mode={travelMode} />}
                        {layers.water && <WaterFlowLayer rivers={cc?.rivers || []} dams={dams} />}
                        {layers.river && <RiverFloodLayer rivers={cc?.rivers || []} />}
                        {layers.zones && <ZonesLayer zones={zones} watchZones={status?.watchZones} planningZones={status?.planningZones} timing={zoneTiming} />}
                        {layers.blocked && blocked.map((b) => {
                            const geo = parseGeo(b.boundaryGeojson);
                            return geo && (
                                <GeoJSON key={`blocked-${b.id}`} data={geo} style={{ color: '#111827', dashArray: '6 4', weight: 2, fillOpacity: 0.25 }}>
                                    <Tooltip sticky>Blocked: {b.name}{b.reason ? ` — ${b.reason}` : ''}</Tooltip>
                                </GeoJSON>
                            );
                        })}
                        {layers.bottlenecks && <BottleneckLayer bottlenecks={analytics?.bottlenecks || []} />}
                        {layers.services && <ServicesLayer services={services} />}
                        {layers.shelters && <ShelterLayer shelters={shelters} forecast={analytics?.shelters} />}
                        <MovingPeopleLayer people={mapPeople} selectedId={selectedPersonId}
                            onSelect={selectPerson} showTrails={layers.trails && !replayFrame} />
                        {layers.sos && !replayFrame && <SosLayer sos={sos} onSelect={(x) => { setSelectedSos(x); setTab('sos'); }} />}

                        {personLine && <Polyline positions={personLine} pathOptions={{ color: '#7C3AED', weight: 5, opacity: 0.85, className: 'ddas-flow' }} />}
                        {testResult?.from && <CircleMarker center={testResult.from} radius={6} pathOptions={{ color: '#1D4ED8', fillOpacity: 1 }} />}
                        {testLine && <Polyline positions={testLine} pathOptions={{ color: '#1D4ED8', weight: 5 }} />}
                    </MapContainer>
                    <ReplayBar frames={replayFrames} onLoad={loadReplay} onFrame={setReplayFrame} />
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-3 py-1.5 text-xs text-muted-foreground" aria-label="Map legend">
                        <Legend colour="#1D4ED8" label="On the way" />
                        <Legend colour="#B91C1C" label="In danger zone" />
                        <Legend colour="#15803D" label="Safe" />
                        <Legend colour="#C2410C" label="SOS" />
                        {Object.values(LEVEL_STYLE).map((lv) => <Legend key={lv.label} colour={lv.fill} round={false} label={lv.label} />)}
                        <Legend colour={FLOODED_STYLE.fill} round={false} label="Water arrived" />
                        <Legend colour="#1D4ED8" label="Water front" />
                        <Legend colour="#16A34A" label="Shelter (ring = how full, ▲ m above flood)" />
                        <Legend colour="#22C55E" round={false} label="Safe high ground" />
                        <Legend colour="#15803D" label="Assembly point / evacuation route" />
                        <Legend colour="#EF4444" label="Crowded road" />
                        <span>Shield / cross = police / hospital (map only)</span>
                    </div>
                </Card>

                <div className="flex min-h-0 flex-col gap-2">
                    {selectedPerson && (
                        <PersonCard person={selectedPerson} straggler={stragglers.find((s) => s.id === selectedPerson.id)} route={personRoute}
                            onRoute={() => { setFollowRoute(true); loadRoute(selectedPerson); }}
                            onClose={() => { setSelectedPersonId(null); setPersonRoute(null); setFollowRoute(false); }} />
                    )}
                    <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-2">
                        <TabsList className="grid w-full grid-cols-6">
                            <TabsTrigger value="sos" className="px-1 text-xs">SOS{sm.sosOpen ? ` ${sm.sosOpen}` : ''}</TabsTrigger>
                            <TabsTrigger value="people" className="px-1 text-xs">People</TabsTrigger>
                            <TabsTrigger value="zones" className="px-1 text-xs">Zones</TabsTrigger>
                            <TabsTrigger value="shelters" className="px-1 text-xs">Shelters</TabsTrigger>
                            <TabsTrigger value="log" className="px-1 text-xs">Log</TabsTrigger>
                            <TabsTrigger value="tools" className="px-1 text-xs">Tools</TabsTrigger>
                        </TabsList>
                        <TabsContent value="sos" className="min-h-0 overflow-y-auto text-sm">
                            <SosQueue sos={sos} services={services} selectedId={selectedSos?.id}
                                onSelect={(x) => { setSelectedSos(x); setSelectedPersonId(null); }} onChanged={refreshAll} />
                        </TabsContent>
                        <TabsContent value="people" className="min-h-0 overflow-y-auto">
                            <PeoplePanel people={people} shown={shown} filter={filter} onFilter={setFilter} zones={zones}
                                stragglers={stragglers} selectedId={selectedPersonId}
                                onSelect={(id) => { selectPerson(id); setSelectedSos(null); }} />
                        </TabsContent>
                        <TabsContent value="zones" className="min-h-0 overflow-y-auto">
                            <ZonesPanel zones={analytics?.zones || []} progress={analytics?.progress} />
                        </TabsContent>
                        <TabsContent value="shelters" className="min-h-0 overflow-y-auto">
                            <ShelterForecast shelters={analytics?.shelters || []} />
                        </TabsContent>
                        <TabsContent value="log" className="min-h-0 overflow-y-auto text-sm">
                            <Timeline items={cc?.timeline || []} />
                        </TabsContent>
                        <TabsContent value="tools" className="min-h-0 space-y-3 overflow-y-auto">
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
                                            {testResult.inDangerZone && <p className="font-medium text-destructive">In danger zone: {testResult.zone?.name} (water in ~{testResult.floodEtaMin} min)</p>}
                                            <p>Go to <strong>{testResult.shelter.name}</strong></p>
                                            <p className="text-muted-foreground">{testResult.distanceKm} km · ~{testResult.etaMin} min</p>
                                            {!testResult.safe && <p className="text-destructive">Slower than the flood: leave now</p>}
                                            {!testResult.routingAvailable && <p className="text-warning">Routing unavailable: straight-line estimate</p>}
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
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
