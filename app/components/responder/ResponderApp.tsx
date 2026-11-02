import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, Vibration, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { ScreenLayout } from '@/components/ScreenLayout';
import { EvacuationMap } from '@/components/evacuation/EvacuationMap';
import { useAuth } from '@/contexts/AuthContext';
import { evacuationService, EvacStatus, metres } from '@/services/evacuation/evacuation.service';
import { Mission, responderService, Station, TeamRoute } from '@/services/responder/responder.service';
import { timeLabel } from '@/components/alerts/alertStyle';

type LngLat = [number, number];
const POLL_MS = 8_000;
const SHARE_MS = 5_000;
const DEMO_TICK_MS = 1_000;
const DEMO_SPEED = 20;   // m/s while driving in demo mode (about 3x real life)
const OPEN = ['triggered', 'acknowledged', 'responding'];
const ICON: Record<string, any> = { flood_trapped: 'home-flood', injured: 'bandage', medical: 'medical-bag', stranded_vehicle: 'car-emergency' };
const STEP_TEXT: Record<string, string> = { assigned: 'New mission', on_the_way: 'On the way', arrived: 'Arrived', rescued: 'Rescued' };

/**
 * The app for a demo response team (role RESPONDER): SOS calls assigned to its station, a road route to
 * the person, and Accept / Arrived / Rescued. The team's position is shared with the person and the
 * command center. Simulated teams only: no real police, hospital or fire service is involved.
 */
export function ResponderApp() {
  const { user, logout } = useAuth();
  const [station, setStation] = useState<Station | null>(null);
  const [missions, setMissions] = useState<Mission[] | null>(null);
  const [status, setStatus] = useState<EvacStatus | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [incoming, setIncoming] = useState<Mission | null>(null);
  const [locMode, setLocMode] = useState<'demo' | 'gps'>('demo');
  const [pos, setPos] = useState<LngLat | null>(null);
  const posRef = useRef<LngLat | null>(null);
  const known = useRef<Set<number> | null>(null);

  const place = useCallback((p: LngLat) => { posRef.current = p; setPos(p); }, []);

  const load = useCallback(async () => {
    try {
      const [list, st] = await Promise.all([responderService.missions(), evacuationService.status().catch(() => null)]);
      setMissions(list);
      if (st) setStatus(st);
      // A mission we have not seen yet: pop it up and vibrate
      const fresh = list.find((m) => OPEN.includes(m.status) && m.teamStatus === 'assigned' && !known.current?.has(m.id));
      if (known.current && fresh) {
        setIncoming(fresh);
        Vibration.vibrate([0, 900, 300, 900, 300, 900]);
      }
      known.current = new Set(list.map((m) => m.id));
    } catch {
      // offline: keep the last list
    }
  }, []);

  useEffect(() => {
    responderService.me().then((r) => {
      setStation(r.station);
      if (r.station && !posRef.current) place([Number(r.station.lng), Number(r.station.lat)]);   // demo: start at the station
    }).catch(() => undefined);
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load, place]);

  // Real GPS
  useEffect(() => {
    if (locMode !== 'gps') return;
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') { setLocMode('demo'); return; }
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 3000 },
        (l) => place([l.coords.longitude, l.coords.latitude]));
    })();
    return () => sub?.remove();
  }, [locMode, place]);

  // Share the team's position while it has an open mission
  const hasOpen = !!missions?.some((m) => OPEN.includes(m.status));
  useEffect(() => {
    if (!hasOpen) return;
    const share = () => { const p = posRef.current; if (p) responderService.location(p[1], p[0]).catch(() => undefined); };
    share();
    const id = setInterval(share, SHARE_MS);
    return () => clearInterval(id);
  }, [hasOpen]);

  const mission = missions?.find((m) => m.id === selected) ?? null;

  return (
    <ScreenLayout title="Response team" subtitle={station ? `${station.name} · demo team` : user?.fullName}>
      {mission ? (
        <MissionView mission={mission} status={status} pos={pos} posRef={posRef} place={place} locMode={locMode}
          onBack={() => setSelected(null)} onChanged={load} />
      ) : (
        <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <View style={styles.row}>
            {(['demo', 'gps'] as const).map((k) => (
              <Pressable key={k} onPress={() => setLocMode(k)} style={[styles.toggle, locMode === k && styles.toggleOn]}>
                <Text style={[styles.toggleText, locMode === k && { color: '#fff' }]}>{k === 'demo' ? 'Demo position' : 'Real GPS'}</Text>
              </Pressable>
            ))}
          </View>
          {missions === null && <ActivityIndicator color="#455A64" style={{ marginTop: 30 }} />}
          {missions?.length === 0 && (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="shield-check-outline" size={46} color="#16A34A" />
              <Text style={styles.emptyText}>No missions. New SOS calls assigned to your station appear here.</Text>
            </View>
          )}
          {missions?.map((m) => <MissionCard key={m.id} m={m} pos={pos} onPress={() => setSelected(m.id)} />)}
          <Pressable onPress={() => void logout()} style={styles.logout}><Text style={styles.logoutText}>Sign out</Text></Pressable>
          <Text style={styles.note}>Demo response team: SOS calls are simulated, no real service is contacted.</Text>
        </ScrollView>
      )}

      <Modal visible={!!incoming} transparent animationType="fade" onRequestClose={() => setIncoming(null)}>
        <View style={styles.popWrap}>
          <View style={styles.pop}>
            <MaterialCommunityIcons name="alarm-light" size={48} color="#DC2626" />
            <Text style={styles.popTitle}>NEW SOS MISSION</Text>
            {incoming && <>
              <Text style={styles.popType}>{incoming.type}</Text>
              <Text style={styles.popLine}>{incoming.person}{incoming.damName ? ` · ${incoming.damName}` : ''}</Text>
              {!!incoming.message && <Text style={styles.popMsg}>“{incoming.message}”</Text>}
              {pos && <Text style={styles.popLine}>{(metres(pos, [incoming.lng, incoming.lat]) / 1000).toFixed(1)} km away</Text>}
            </>}
            <Pressable style={styles.popBtn} onPress={() => { setSelected(incoming?.id ?? null); setIncoming(null); }}>
              <Text style={styles.popBtnText}>Open mission</Text>
            </Pressable>
            <Pressable onPress={() => setIncoming(null)}><Text style={styles.later}>Later</Text></Pressable>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

function MissionCard({ m, pos, onPress }: { m: Mission; pos: LngLat | null; onPress: () => void }) {
  const open = OPEN.includes(m.status);
  const km = pos ? metres(pos, [m.lng, m.lat]) / 1000 : null;
  return (
    <Pressable onPress={onPress} style={[styles.card, { borderLeftColor: !open ? '#94A3B8' : m.teamStatus === 'assigned' ? '#DC2626' : '#1D4ED8' }]}>
      <MaterialCommunityIcons name={ICON[m.typeCode] || 'alert'} size={28} color={open ? '#DC2626' : '#94A3B8'} />
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{m.type}</Text>
        <Text style={styles.cardLine}>{m.person}{m.damName ? ` · ${m.damName}` : ''}</Text>
        {!!m.message && <Text style={styles.cardLine} numberOfLines={2}>“{m.message}”</Text>}
        <Text style={styles.cardMeta}>
          {open ? STEP_TEXT[m.teamStatus] : 'Closed'}{km != null && open ? ` · ${km.toFixed(1)} km` : ''} · {timeLabel(m.triggeredAt)}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#9CA3AF" />
    </Pressable>
  );
}

function MissionView({ mission: m, status, pos, posRef, place, locMode, onBack, onChanged }: {
  mission: Mission; status: EvacStatus | null; pos: LngLat | null; posRef: React.MutableRefObject<LngLat | null>;
  place: (p: LngLat) => void; locMode: 'demo' | 'gps'; onBack: () => void; onChanged: () => Promise<void>;
}) {
  const [route, setRoute] = useState<TeamRoute | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const path = useRef<{ coords: LngLat[]; step: number }>({ coords: [], step: 0 });
  const person: LngLat = [Number(m.lng), Number(m.lat)];
  const open = OPEN.includes(m.status);
  const routedTo = useRef<LngLat | null>(null);

  const findRoute = useCallback(async () => {
    const p = posRef.current;
    if (!p) return;
    try {
      const r = await responderService.route(p, person);
      setRoute(r);
      path.current = { coords: r.route.coordinates as LngLat[], step: 0 };
      routedTo.current = person;
    } catch {
      setRoute(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.lat, m.lng]);

  // Route now, again every minute, and when the person moves more than 150 m
  useEffect(() => {
    if (!open) return;
    if (!routedTo.current || metres(routedTo.current, person) > 150) findRoute();
    const id = setInterval(findRoute, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, findRoute]);

  // Demo: drive along the route while on the way
  useEffect(() => {
    if (locMode !== 'demo' || m.teamStatus !== 'on_the_way') return;
    const id = setInterval(() => {
      const p = path.current;
      let here = posRef.current;
      if (!here || p.coords.length < 2) return;
      let left = DEMO_SPEED * (DEMO_TICK_MS / 1000);
      while (left > 0 && p.step < p.coords.length - 1) {
        const next = p.coords[p.step + 1];
        const d = metres(here, next);
        if (d <= left) { here = next; p.step += 1; left -= d; }
        else { const f = left / d; here = [here[0] + (next[0] - here[0]) * f, here[1] + (next[1] - here[1]) * f]; left = 0; }
      }
      place(here);
    }, DEMO_TICK_MS);
    return () => clearInterval(id);
  }, [locMode, m.teamStatus, place, posRef]);

  const act = async (action: 'accept' | 'arrived' | 'resolve') => {
    setBusy(true);
    try {
      await responderService.act(m.id, action, action === 'resolve' ? note.trim() || undefined : undefined);
      if (action === 'accept' && !route) await findRoute();
      await onChanged();
    } catch (e: any) {
      Alert.alert('Not saved', e?.response?.data?.message || 'Check the connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const away = pos ? metres(pos, person) : null;
  const near = away != null && away < 120;

  return (
    <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <Pressable onPress={onBack} style={styles.back}>
        <MaterialCommunityIcons name="arrow-left" size={20} color="#374151" /><Text style={styles.backText}>Missions</Text>
      </Pressable>

      <View style={[styles.card, { borderLeftColor: open ? '#DC2626' : '#94A3B8' }]}>
        <MaterialCommunityIcons name={ICON[m.typeCode] || 'alert'} size={30} color="#DC2626" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.cardTitle}>{m.type}</Text>
          <Text style={styles.cardLine}>{m.person}{m.damName ? ` · ${m.damName}` : ''}</Text>
          {!!m.message && <Text style={styles.cardLine}>“{m.message}”</Text>}
          <Text style={styles.cardMeta}>
            {m.battery != null ? `🔋 ${m.battery}% · ` : ''}SOS {timeLabel(m.triggeredAt)}
            {m.positionAgeSeconds != null ? ` · position ${m.positionAgeSeconds < 60 ? 'live' : `${Math.round(m.positionAgeSeconds / 60)} min old`}` : ''}
          </Text>
        </View>
      </View>

      <EvacuationMap status={status} me={pos} route={route} sos={false} height={360}
        target={person} targetLabel={m.person} />

      {route && open && (
        <View style={styles.info}>
          <Text style={styles.infoBig}>{route.distanceKm} km · ~{route.etaMin} min</Text>
          <Text style={styles.cardMeta}>{route.routingAvailable ? 'Road route, avoiding blocked roads' : 'Straight line: road routing unavailable'}</Text>
          {route.instructions.slice(0, 2).map((s, i) => <Text key={i} style={styles.cardLine}>{i + 1}. {s}</Text>)}
        </View>
      )}

      {open && m.teamStatus === 'assigned' && <Big label="Accept · on the way" icon="car-emergency" color="#1D4ED8" busy={busy} onPress={() => act('accept')} />}
      {open && m.teamStatus === 'on_the_way' && (
        <Big label={near ? 'Arrived at the person' : `Arrived${away != null ? ` (${(away / 1000).toFixed(1)} km left)` : ''}`}
          icon="map-marker-check" color={near ? '#15803D' : '#64748B'} busy={busy} onPress={() => act('arrived')} />
      )}
      {open && m.teamStatus === 'arrived' && (
        <View style={{ gap: 8 }}>
          <TextInput value={note} onChangeText={setNote} placeholder="Note (optional): e.g. 3 people taken to high ground"
            style={styles.input} multiline maxLength={200} />
          <Big label="Rescued · close mission" icon="shield-check" color="#15803D" busy={busy} onPress={() => act('resolve')} />
        </View>
      )}
      {!open && <Text style={styles.closed}>Mission closed{m.resolutionNotes ? `: ${m.resolutionNotes}` : ''}</Text>}
    </ScrollView>
  );
}

function Big({ label, icon, color, busy, onPress }: { label: string; icon: any; color: string; busy: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={busy} style={[styles.big, { backgroundColor: color }, busy && { opacity: 0.6 }]}>
      {busy ? <ActivityIndicator color="#fff" /> : <MaterialCommunityIcons name={icon} size={22} color="#fff" />}
      <Text style={styles.bigText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  toggle: { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center', backgroundColor: '#F3F4F6' },
  toggleOn: { backgroundColor: '#455A64' },
  toggleText: { fontWeight: '700', fontSize: 13, color: '#374151' },
  empty: { alignItems: 'center', gap: 8, marginTop: 40, paddingHorizontal: 20 },
  emptyText: { color: '#6B7280', textAlign: 'center' },
  card: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: '#F1F5F9', borderLeftWidth: 5 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  cardLine: { fontSize: 13, color: '#374151' },
  cardMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  info: { backgroundColor: '#EFF6FF', borderRadius: 14, padding: 12, gap: 2 },
  infoBig: { fontSize: 18, fontWeight: '900', color: '#1E3A8A' },
  big: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16 },
  bigText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, minHeight: 56, textAlignVertical: 'top' },
  closed: { textAlign: 'center', color: '#15803D', fontWeight: '700' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontWeight: '700', color: '#374151' },
  logout: { alignSelf: 'center', padding: 10, marginTop: 10 },
  logoutText: { color: '#B91C1C', fontWeight: '700' },
  note: { textAlign: 'center', fontSize: 11, color: '#9CA3AF' },
  popWrap: { flex: 1, backgroundColor: 'rgba(127,29,29,.85)', justifyContent: 'center', padding: 20 },
  pop: { backgroundColor: '#fff', borderRadius: 26, padding: 22, alignItems: 'center', gap: 6 },
  popTitle: { fontSize: 20, fontWeight: '900', color: '#B91C1C', letterSpacing: 1 },
  popType: { fontSize: 17, fontWeight: '800', color: '#111827' },
  popLine: { color: '#374151' },
  popMsg: { color: '#4B5563', fontStyle: 'italic', textAlign: 'center' },
  popBtn: { marginTop: 10, alignSelf: 'stretch', backgroundColor: '#DC2626', borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  popBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  later: { marginTop: 8, color: '#6B7280', fontWeight: '600' },
});
