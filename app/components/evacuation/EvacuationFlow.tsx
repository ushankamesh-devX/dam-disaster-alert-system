import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { ensureAuth } from '@/services/api/auto-auth';
import {
  evacuationService, EvacStatus, interiorPoint, metres, MySos, RouteResult, Zone, zoneAt,
} from '@/services/evacuation/evacuation.service';
import { EvacuationMap } from './EvacuationMap';
import { SosModal } from './SosModal';

type LngLat = [number, number];
type Dam = { id: number; name: string; latitude: number; longitude: number };
type DamStatus = Awaited<ReturnType<typeof evacuationService.damStatuses>>[number];
type ActiveAlert = Awaited<ReturnType<typeof evacuationService.activeAlerts>>[number];

const DEMO_KEY = 'ddas-demo-position';
const POLL_MS = 15_000;
const SHARE_MS = 10_000;
const DEMO_TICK_MS = 2_000;
const DEMO_SPEED = { walk: 6, drive: 20 };   // m/s: about 4x real life so the demo moves visibly
const LEVEL_COLOR: Record<number, string> = { 1: '#DC2626', 2: '#F97316', 3: '#CA8A04', 4: '#CA8A04', 5: '#16A34A' };
const OPEN_SOS = ['triggered', 'acknowledged', 'responding'];
const SOS_TEXT: Record<string, string> = {
  triggered: 'Sent. Waiting for the evacuation team…',
  acknowledged: 'Seen by the evacuation team',
  responding: 'Help is on the way',
  resolved: 'Resolved',
};

const fmt = (n?: number | null, d = 1) => (n == null ? '—' : Number(n).toFixed(d));

/**
 * The phone as one live person on the admin evacuation map: my situation, safest route to high ground,
 * live location sharing, SOS with status, and "I'm safe". Demo location lets you stand anywhere.
 */
export function EvacuationFlow() {
  const [status, setStatus] = useState<EvacStatus | null>(null);
  const [dams, setDams] = useState<Dam[]>([]);
  const [damStatus, setDamStatus] = useState<DamStatus[]>([]);
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [locMode, setLocMode] = useState<'demo' | 'gps'>('demo');
  const [pos, setPos] = useState<LngLat | null>(null);
  const [mode, setMode] = useState<'walk' | 'drive'>('walk');
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routing, setRouting] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'evacuating' | 'safe'>('idle');
  const [sos, setSos] = useState<MySos[]>([]);
  const [sosOpen, setSosOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const posRef = useRef<LngLat | null>(null);
  const speedRef = useRef(0);
  const path = useRef<{ coords: LngLat[]; step: number }>({ coords: [], step: 0 });

  const place = useCallback((p: LngLat, speed = 0) => {
    posRef.current = p;
    speedRef.current = speed;
    setPos(p);
  }, []);

  // ── Data: zones, shelters, dams, alerts ────────────────────────────────────
  const load = useCallback(async () => {
    try {
      await ensureAuth();
      const [s, st, al] = await Promise.all([
        evacuationService.status(), evacuationService.damStatuses(), evacuationService.activeAlerts().catch(() => []),
      ]);
      setStatus(s);
      setDamStatus(st);
      setAlerts(al);
      setError(null);
    } catch (e: any) {
      setError(e?.message?.includes('Network') ? 'No connection to the DDAS server' : 'Could not load the evacuation data');
    }
  }, []);

  useEffect(() => {
    load();
    evacuationService.dams().then(setDams).catch(() => undefined);
    AsyncStorage.getItem(DEMO_KEY).then((v) => v && place(JSON.parse(v)));
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load, place]);

  // Newest alert for the banner (the alert watcher in the tabs layout pops up and vibrates)
  const latestAlert = useMemo(
    () => [...alerts].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0],
    [alerts]);

  // ── Location: real GPS, or a demo point placed by long-pressing the map ─────
  useEffect(() => {
    if (locMode !== 'gps') return;
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        Alert.alert('Location needed', 'Allow location, or use Demo location.');
        setLocMode('demo');
        return;
      }
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 5000 },
        (l) => place([l.coords.longitude, l.coords.latitude], l.coords.speed ?? 0));
    })();
    return () => sub?.remove();
  }, [locMode, place]);

  const onPick = (lat: number, lng: number) => {
    if (locMode !== 'demo') return;
    if (phase === 'evacuating') return Alert.alert('Evacuating', 'Stop first to move your demo position.');
    place([lng, lat]);
    AsyncStorage.setItem(DEMO_KEY, JSON.stringify([lng, lat]));
    setRoute(null);
    setPhase('idle');
  };

  // Demo: walk / drive along the route
  useEffect(() => {
    if (locMode !== 'demo' || phase !== 'evacuating') return;
    const id = setInterval(() => {
      const p = path.current;
      let here = posRef.current;
      if (!here || p.coords.length < 2) return;
      let left = DEMO_SPEED[mode] * (DEMO_TICK_MS / 1000);
      while (left > 0 && p.step < p.coords.length - 1) {
        const next = p.coords[p.step + 1];
        const d = metres(here, next);
        if (d <= left) {
          here = next;
          p.step += 1;
          left -= d;
        } else {
          const f = left / d;
          here = [here[0] + (next[0] - here[0]) * f, here[1] + (next[1] - here[1]) * f];
          left = 0;
        }
      }
      place(here, DEMO_SPEED[mode]);
    }, DEMO_TICK_MS);
    return () => clearInterval(id);
  }, [locMode, phase, mode, place]);

  // ── Sharing with the command center ────────────────────────────────────────
  const openSos = sos.find((s) => OPEN_SOS.includes(s.status));
  const sharing = phase === 'evacuating' || !!openSos;

  useEffect(() => {
    if (!sharing) return;
    const share = () => {
      const p = posRef.current;
      if (p) evacuationService.shareLocation(p[1], p[0], speedRef.current).catch(() => undefined);
    };
    share();
    const id = setInterval(share, SHARE_MS);
    return () => clearInterval(id);
  }, [sharing]);

  const loadSos = useCallback(() => evacuationService.mySos().then(setSos).catch(() => undefined), []);
  useEffect(() => {
    ensureAuth().then(loadSos).catch(() => undefined);
  }, [loadSos]);
  useEffect(() => {
    if (!openSos) return;
    const id = setInterval(loadSos, SHARE_MS);
    return () => clearInterval(id);
  }, [openSos, loadSos]);

  // ── Route ──────────────────────────────────────────────────────────────────
  const findRoute = useCallback(async (m = mode) => {
    const p = posRef.current;
    if (!p) return Alert.alert('Where are you?', locMode === 'demo' ? 'Long-press the map to place yourself.' : 'Waiting for GPS…');
    setRouting(true);
    try {
      const r = await evacuationService.route(p[1], p[0], m);
      setRoute(r);
      const coords = (r.route?.coordinates || []) as LngLat[];
      path.current = { coords, step: 0 };
      if (locMode === 'demo' && coords.length > 1 && metres(p, coords[0]) < 2500) place(coords[0]);   // start on the road
    } catch (e: any) {
      setRoute(null);
      Alert.alert('No route', e?.response?.status === 404
        ? 'No safe place is reachable. Move to higher ground and call 117.'
        : 'Could not get a route. Check the connection.');
    } finally {
      setRouting(false);
    }
  }, [mode, locMode, place]);

  // While evacuating with real GPS, refresh the route every 2 minutes
  useEffect(() => {
    if (phase !== 'evacuating' || locMode !== 'gps') return;
    const id = setInterval(() => findRoute(), 120_000);
    return () => clearInterval(id);
  }, [phase, locMode, findRoute]);

  // Demo quick buttons: stand inside a dam's L1 / L2 zone and get the route in one tap
  const quickSpots = useMemo(() => {
    const all: Zone[] = [...(status?.dangerZones || []), ...(status?.planningZones || [])].filter((z) => z.hazardLevel <= 2);
    const seen = new Set<string>();
    return all.sort((a, b) => a.hazardLevel - b.hazardLevel || a.damName.localeCompare(b.damName))
      .filter((z) => {
        const key = `${z.damName}-${z.hazardLevel}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((z) => ({ label: `${z.damName.replace(' Dam', '')} L${z.hazardLevel}`, zone: z }));
  }, [status]);

  const goTo = async (z: Zone) => {
    const p = interiorPoint(z.boundaryGeojson);
    if (!p) return;
    setLocMode('demo');
    setPhase('idle');
    place(p);
    AsyncStorage.setItem(DEMO_KEY, JSON.stringify(p));
    await findRoute();
  };

  const start = async () => {
    if (!route) await findRoute();
    setPhase('evacuating');
  };

  // Stop: end the sharing too, so the admin map doesn't keep a stale "on the way"
  const stop = () => {
    setPhase('idle');
    if (!openSos) evacuationService.stopSharing().catch(() => undefined);
  };

  const imSafe = async () => {
    try {
      await evacuationService.imSafe();
    } catch {
      // still mark it locally
    }
    setPhase('safe');
  };

  const sendSos = async (type: string, message: string) => {
    const p = posRef.current;
    if (!p) {
      Alert.alert('Where are you?', 'Place yourself on the map first.');
      return;
    }
    try {
      await evacuationService.sendSos(type, p[1], p[0], message || undefined);
      Vibration.vibrate(300);
      await loadSos();
    } catch {
      Alert.alert('SOS not sent', 'No connection. Call 117.');
    }
  };

  // ── My situation ───────────────────────────────────────────────────────────
  const danger = pos && status ? zoneAt(status.dangerZones, pos[1], pos[0]) : null;
  const watch = pos && status && !danger ? zoneAt(status.watchZones, pos[1], pos[0]) : null;
  const planning = pos && status && !danger && !watch ? zoneAt(status.planningZones, pos[1], pos[0]) : null;
  const zoneHere = danger || watch || planning;

  const dam = useMemo(() => {
    if (zoneHere) return dams.find((d) => zoneHere.damName?.startsWith(d.name.replace(' Dam', ''))) ?? null;
    if (!pos || !dams.length) return null;
    const away = (d: Dam) => metres(pos, [Number(d.longitude), Number(d.latitude)]);
    return [...dams].sort((a, b) => away(a) - away(b))[0];
  }, [zoneHere, dams, pos]);
  const ds = dam ? damStatus.find((s) => s.damId === dam.id) : undefined;
  const damInDanger = !!dam && !!status?.dangerZones.some((z) => z.damName?.startsWith(dam.name.replace(' Dam', '')));
  const arrived = phase === 'evacuating' && route?.shelter && pos && metres(pos, [route.shelter.lng, route.shelter.lat]) < 80;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 140, gap: 12 }} showsVerticalScrollIndicator={false}>
      {error && <Text style={styles.error}>{error}</Text>}

      {latestAlert && (
        <View style={[styles.alert, latestAlert.severity === 'info' && styles.alertInfo]}>
          <MaterialCommunityIcons name="alarm-light" size={22} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>{latestAlert.title}{latestAlert.simulationMode ? '  (drill)' : ''}</Text>
            {!!latestAlert.message && <Text style={styles.alertText}>{latestAlert.message}</Text>}
          </View>
        </View>
      )}

      {/* My situation */}
      <View style={[styles.card, { borderLeftWidth: 6, borderLeftColor: danger ? LEVEL_COLOR[danger.hazardLevel] : '#16A34A' }]}>
        {!pos ? (
          <Text style={styles.big}>Long-press the map to place yourself</Text>
        ) : danger ? (
          <>
            <Text style={[styles.big, { color: LEVEL_COLOR[danger.hazardLevel] }]}>EVACUATE NOW</Text>
            <Text style={styles.line}>You are in {danger.name}</Text>
            {danger.floodEtaMin != null && <Text style={styles.line}>Water arrives ~{danger.floodEtaMin} min after the release</Text>}
          </>
        ) : watch ? (
          <>
            <Text style={[styles.big, { color: '#CA8A04' }]}>Be ready to leave</Text>
            <Text style={styles.line}>You are in {watch.name}</Text>
          </>
        ) : (
          <>
            <Text style={[styles.big, { color: '#16A34A' }]}>No evacuation here now</Text>
            <Text style={styles.line}>{planning ? `${planning.name} · the dam is safe now` : 'Outside the flood zones'}</Text>
          </>
        )}
        {dam && (
          <View style={styles.dam}>
            <Text style={styles.damName}>{dam.name}{damInDanger ? ' · RELEASING WATER' : ''}</Text>
            <View style={styles.row}>
              <Stat label="Water level" value={`${fmt(ds?.waterLevelMeters)} m`} />
              <Stat label="Full" value={`${fmt(ds?.waterLevelPercentage, 0)} %`} />
              <Stat label="Danger level" value={`${fmt(ds?.dangerLevelMeters)} m`} />
              <Stat label="Release" value={ds?.outflowCumecs ? `${fmt(ds.outflowCumecs, 0)} m³/s` : '—'} />
            </View>
          </View>
        )}
      </View>

      {/* Location source and travel mode */}
      <View style={styles.row}>
        <Toggle options={[['demo', 'Demo location'], ['gps', 'Real GPS']]} value={locMode}
          onChange={(v) => phase !== 'evacuating' && setLocMode(v as 'demo' | 'gps')} />
        <Toggle options={[['walk', 'Walk'], ['drive', 'Drive']]} value={mode}
          onChange={(v) => { setMode(v as 'walk' | 'drive'); if (route && phase !== 'evacuating') findRoute(v as 'walk' | 'drive'); }} />
      </View>

      <EvacuationMap status={status} me={pos} route={route} sos={!!openSos} onPick={onPick} />
      {locMode === 'demo' && phase !== 'evacuating' && (
        <>
          <Text style={styles.hint}>Demo: tap a zone below, or long-press the map to stand anywhere.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {quickSpots.map((q) => (
              <Pressable key={q.label} onPress={() => goTo(q.zone)} disabled={routing}
                style={[styles.chip, { borderColor: LEVEL_COLOR[q.zone.hazardLevel] }]}>
                <Text style={[styles.chipText, { color: LEVEL_COLOR[q.zone.hazardLevel] }]}>📍 {q.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      {/* Route */}
      {route && (
        <View style={styles.card}>
          <Text style={styles.label}>Safest place</Text>
          <Text style={styles.big2}>{route.shelter?.name}</Text>
          <Text style={styles.line}>
            {route.distanceKm} km · ~{route.etaMin} min {mode === 'drive' ? 'driving' : 'walking'}
            {route.shelter?.aboveFloodM != null ? ` · ▲ ${route.shelter.aboveFloodM} m above the flood` : ''}
          </Text>
          {route.inDangerZone && (
            <Text style={[styles.line, { color: route.safe ? '#16A34A' : '#DC2626', fontWeight: '700' }]}>
              {route.safe ? 'Faster than the water ✓' : 'The water may arrive first: leave immediately' + (mode === 'walk' ? ' (try Drive)' : '')}
            </Text>
          )}
          {!route.routingAvailable && <Text style={styles.line}>Road routing unavailable: straight-line estimate</Text>}
          {route.instructions?.slice(0, 3).map((s, i) => <Text key={i} style={styles.step}>{i + 1}. {s}</Text>)}
        </View>
      )}

      {/* SOS status */}
      {sos[0] && (
        <View style={[styles.card, { borderLeftWidth: 6, borderLeftColor: openSos ? '#DC2626' : '#64748B' }]}>
          <Text style={styles.label}>Your SOS · {sos[0].type}</Text>
          <Text style={styles.big2}>{SOS_TEXT[sos[0].status] || sos[0].status}</Text>
          {!!sos[0].responseNotes && <Text style={styles.line}>{sos[0].responseNotes}</Text>}
        </View>
      )}

      {arrived && <Text style={styles.arrived}>You reached {route?.shelter?.name}. Tap I'm safe.</Text>}
      {sharing && <Text style={styles.sharing}>● Sharing your location with the evacuation team</Text>}

      {/* Actions */}
      {phase === 'idle' && (
        <View style={styles.row}>
          <Big label={routing ? 'Finding…' : 'Find safest route'} icon="map-marker-path" color="#15803D" onPress={() => findRoute()} disabled={routing} />
          <Big label="Start evacuating" icon="run-fast" color="#1D4ED8" onPress={start} disabled={routing || !pos} />
        </View>
      )}
      {phase === 'evacuating' && (
        <View style={styles.row}>
          <Big label="I'm safe" icon="shield-check" color="#15803D" onPress={imSafe} />
          <Big label="Stop" icon="stop" color="#64748B" onPress={stop} />
        </View>
      )}
      {phase === 'safe' && (
        <View style={styles.card}>
          <Text style={[styles.big, { color: '#16A34A' }]}>You are marked safe</Text>
          <Pressable onPress={() => { setPhase('idle'); setRoute(null); }}><Text style={styles.link}>Start again</Text></Pressable>
        </View>
      )}

      <Pressable onPress={() => setSosOpen(true)} style={styles.sos}>
        <MaterialCommunityIcons name="alarm-light" size={28} color="#fff" />
        <Text style={styles.sosText}>SOS</Text>
      </Pressable>

      {!status && !error && <ActivityIndicator color="#455A64" />}
      <SosModal visible={sosOpen} onClose={() => setSosOpen(false)} onSend={sendSos} />
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Toggle({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.toggle}>
      {options.map(([k, label]) => (
        <Pressable key={k} onPress={() => onChange(k)} style={[styles.toggleItem, value === k && styles.toggleOn]}>
          <Text style={[styles.toggleText, value === k && { color: '#fff' }]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Big({ label, icon, color, onPress, disabled }: { label: string; icon: any; color: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.big3, { backgroundColor: color }, disabled && { opacity: 0.5 }]}>
      <MaterialCommunityIcons name={icon} size={22} color="#fff" />
      <Text style={styles.bigText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  error: { color: '#B91C1C', textAlign: 'center' },
  alert: { flexDirection: 'row', gap: 10, backgroundColor: '#DC2626', padding: 12, borderRadius: 16 },
  alertInfo: { backgroundColor: '#15803D' },
  alertTitle: { color: '#fff', fontWeight: '800', fontSize: 14 },
  alertText: { color: '#FEE2E2', fontSize: 12, marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', gap: 4 },
  big: { fontSize: 20, fontWeight: '900', color: '#111827' },
  big2: { fontSize: 17, fontWeight: '800', color: '#111827' },
  line: { fontSize: 13, color: '#374151' },
  label: { fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  step: { fontSize: 12, color: '#4B5563' },
  dam: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 6 },
  damName: { fontWeight: '700', color: '#455A64' },
  row: { flexDirection: 'row', gap: 8 },
  statValue: { fontSize: 15, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 10, color: '#6B7280' },
  toggle: { flex: 1, flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 3 },
  toggleItem: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  toggleOn: { backgroundColor: '#455A64' },
  toggleText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  hint: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: -4 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, backgroundColor: '#fff' },
  chipText: { fontSize: 12, fontWeight: '700' },
  arrived: { textAlign: 'center', color: '#15803D', fontWeight: '700' },
  sharing: { textAlign: 'center', color: '#1D4ED8', fontSize: 12 },
  big3: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16 },
  bigText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  link: { color: '#1D4ED8', marginTop: 4 },
  sos: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DC2626', borderRadius: 20, paddingVertical: 18, borderWidth: 4, borderColor: '#FECACA' },
  sosText: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 3 },
});
