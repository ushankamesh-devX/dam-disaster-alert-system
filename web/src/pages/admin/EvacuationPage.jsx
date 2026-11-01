import { useCallback, useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Polyline, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { Paper, Typography, Chip, Button, TextField, ToggleButton, ToggleButtonGroup, Alert } from '@mui/material';
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

function Stat({ label, value, tone }) {
    return (
        <Paper variant="outlined" className="px-4 py-3 flex-1 min-w-[140px]">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-semibold ${tone || 'text-gray-900'}`}>{value}</p>
        </Paper>
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
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <Typography variant="h5" component="h1" className="font-semibold">Evacuation</Typography>
                    <p className="text-sm text-gray-500">Live danger zones, shelters and blocked roads</p>
                </div>
                <Chip
                    size="small"
                    color={live ? 'success' : 'default'}
                    label={live ? 'Live' : 'Reconnecting…'}
                />
            </div>

            {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

            <div className="flex flex-wrap gap-3">
                <Stat label="Danger zones" value={zones.length} tone={zones.length ? 'text-red-600' : undefined} />
                <Stat label="Phones in danger" value={status?.devicesInDanger ?? '–'} tone={status?.devicesInDanger ? 'text-red-600' : undefined} />
                <Stat label="Active phones (6 h)" value={status?.activeDevices ?? '–'} />
                <Stat label="Open shelters" value={`${openShelters} / ${shelters.length}`} />
                <Stat label="Blocked roads" value={blocked.length} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
                <Paper variant="outlined" className="overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2 p-2 border-b">
                        <Button size="small" variant={testMode ? 'contained' : 'outlined'} onClick={() => setTestMode((v) => !v)}>
                            {testMode ? 'Click the map to test a route' : 'Test a route'}
                        </Button>
                        <ToggleButtonGroup size="small" exclusive value={travelMode} onChange={(_, v) => v && setTravelMode(v)}>
                            <ToggleButton value="walk">Walk</ToggleButton>
                            <ToggleButton value="drive">Drive</ToggleButton>
                        </ToggleButtonGroup>
                        <span className="text-xs text-gray-500">Draw a polygon (top-left tools) to block a road</span>
                    </div>
                    <MapContainer {...MAP_OPTIONS} center={SRI_LANKA_CENTER} zoom={8} style={{ height: 'min(72vh, 760px)', minHeight: 480 }}>
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
                </Paper>

                <div className="space-y-4">
                    {draft && (
                        <Paper variant="outlined" className="p-4 space-y-3">
                            <Typography variant="subtitle1" className="font-semibold">New blocked road</Typography>
                            <TextField size="small" fullWidth label="Name" value={draft.name}
                                onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                            <TextField size="small" fullWidth label="Reason" value={draft.reason}
                                onChange={(e) => setDraft({ ...draft, reason: e.target.value })} />
                            <TextField size="small" fullWidth type="datetime-local" label="Expires (optional)"
                                slotProps={{ inputLabel: { shrink: true } }} value={draft.expiresAt}
                                onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} />
                            <div className="flex gap-2">
                                <Button variant="contained" disabled={!draft.name.trim()} onClick={saveDraft}>Save</Button>
                                <Button onClick={() => setDraft(null)}>Cancel</Button>
                            </div>
                        </Paper>
                    )}

                    {testResult && (
                        <Paper variant="outlined" className="p-4 space-y-1 text-sm">
                            <Typography variant="subtitle1" className="font-semibold">Route test</Typography>
                            {testResult.loading && <p>Finding route…</p>}
                            {testResult.error && <p className="text-red-600">{testResult.error}</p>}
                            {testResult.shelter && (
                                <>
                                    {testResult.inDangerZone && (
                                        <p className="text-red-600 font-medium">In danger zone: {testResult.zone?.name} (flood ~{testResult.floodEtaMin} min)</p>
                                    )}
                                    <p>Go to <strong>{testResult.shelter.name}</strong></p>
                                    <p>{testResult.distanceKm} km · ~{testResult.etaMin} min</p>
                                    {!testResult.safe && <p className="text-red-600">Route is slower than the flood ETA</p>}
                                    {!testResult.routingAvailable && <p className="text-amber-600">Routing engine unavailable — straight-line estimate</p>}
                                    {testResult.alternatives?.length > 0 && (
                                        <p className="text-gray-500">Alternatives: {testResult.alternatives.map((a) => `${a.shelter.name} (${a.etaMin} min)`).join(', ')}</p>
                                    )}
                                </>
                            )}
                        </Paper>
                    )}

                    <Paper variant="outlined" className="p-4">
                        <Typography variant="subtitle1" className="font-semibold mb-2">Blocked roads</Typography>
                        {blocked.length === 0 && <p className="text-sm text-gray-500">None</p>}
                        <ul className="space-y-2">
                            {blocked.map((b) => (
                                <li key={b.id} className="flex items-start justify-between gap-2 text-sm">
                                    <div>
                                        <p className="font-medium">{b.name}</p>
                                        {b.reason && <p className="text-gray-500">{b.reason}</p>}
                                        {b.expiresAt && <p className="text-xs text-gray-400">Until {new Date(b.expiresAt).toLocaleString()}</p>}
                                    </div>
                                    <Button size="small" color="error" onClick={() => removeBlocked(b.id)}>Remove</Button>
                                </li>
                            ))}
                        </ul>
                    </Paper>

                    <Paper variant="outlined" className="p-4 space-y-2">
                        <Typography variant="subtitle1" className="font-semibold">Offline route packs</Typography>
                        <p className="text-sm text-gray-500">Rebuilt every 6 hours. Rebuild now after changing blocked roads or shelters.</p>
                        <Button variant="outlined" size="small" onClick={rebuildPacks}>Rebuild now</Button>
                        {packsMsg && <p className="text-sm">{packsMsg}</p>}
                    </Paper>
                </div>
            </div>
        </div>
    );
}
