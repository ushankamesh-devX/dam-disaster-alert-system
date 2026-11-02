import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, Vibration, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { ScreenLayout } from '@/components/ScreenLayout';
import { EvacuationMap } from '@/components/evacuation/EvacuationMap';
import { useAuth } from '@/contexts/AuthContext';
import { evacuationService, EvacStatus, metres } from '@/services/evacuation/evacuation.service';
import {
  ChatMessage, InboxItem, Mission, responderService, Station, TeamRoute,
} from '@/services/responder/responder.service';
import { timeLabel } from '@/components/alerts/alertStyle';

type LngLat = [number, number];
const POLL_MS = 6_000;
const SHARE_MS = 5_000;
const DRIVE_TICK_MS = 1_000;
const MAP_DRIVE_MPS = 20;   // "Map position" mode: the team drives along the route at about 3x real speed
const OPEN = ['triggered', 'acknowledged', 'responding'];
const ICON: Record<string, any> = { flood_trapped: 'home-flood', injured: 'bandage', medical: 'medical-bag', stranded_vehicle: 'car-emergency' };
const STEP_TEXT: Record<string, string> = { assigned: 'New mission', on_the_way: 'On the way', arrived: 'On scene', rescued: 'Rescued', done: 'Done' };
const EMOJI: Record<string, string> = { police: '🚓', hospital: '🚑', fire_brigade: '🚒' };
const TO_CONTROL = ['On my way', 'Road blocked, taking another route', 'Need a boat', 'Patient stable', 'Person not found at the location'];
const TO_PERSON = ['We are on the way. Stay where you are.', 'We are 2 minutes away.', 'Go to the highest floor or roof.', 'Keep your phone on.'];

/**
 * The response team app (role RESPONDER): on duty with a live position, missions dispatched to the station,
 * a road route to the person, Accept / Arrived / Rescued, backup request, mission chat and broadcasts.
 */
export function ResponderApp() {
  const { user, logout } = useAuth();
  const [station, setStation] = useState<Station | null>(null);
  const [onDuty, setOnDuty] = useState(false);
  const [missions, setMissions] = useState<Mission[] | null>(null);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [status, setStatus] = useState<EvacStatus | null>(null);
  const [view, setView] = useState<'missions' | 'messages'>('missions');
  const [selected, setSelected] = useState<number | null>(null);
  const [incoming, setIncoming] = useState<Mission | null>(null);
  const [incomingKind, setIncomingKind] = useState<'new' | 'queued' | 'next'>('new');
  const currentId = useRef<number | null | undefined>(undefined);
  const [newMessage, setNewMessage] = useState<InboxItem | null>(null);
  const [locMode, setLocMode] = useState<'map' | 'gps'>('map');
  const [pos, setPos] = useState<LngLat | null>(null);
  const posRef = useRef<LngLat | null>(null);
  const knownMissions = useRef<Set<number> | null>(null);
  const knownInbox = useRef<Set<string> | null>(null);

  const place = useCallback((p: LngLat) => { posRef.current = p; setPos(p); }, []);

  const load = useCallback(async () => {
    try {
      const [list, box, st] = await Promise.all([
        responderService.missions(), responderService.inbox().catch(() => null), evacuationService.status().catch(() => null)]);
      setMissions(list);
      if (st) setStatus(st);
      const fresh = list.find((m) => m.queuePosition >= 0 && m.teamStatus === 'assigned' && !knownMissions.current?.has(m.id));
      const current = list.find((m) => m.queuePosition === 0);
      if (knownMissions.current && fresh) {
        // A new job: it starts now, or it waits in the queue
        setIncomingKind(fresh.queuePosition === 0 ? 'new' : 'queued');
        setIncoming(fresh);
        Vibration.vibrate([0, 900, 300, 900, 300, 900]);
      } else if (currentId.current !== undefined && current && current.id !== currentId.current && current.teamStatus === 'assigned') {
        // The last job was closed: the next one in the queue is up
        setIncomingKind('next');
        setIncoming(current);
        Vibration.vibrate([0, 600, 300, 600]);
      }
      knownMissions.current = new Set(list.map((m) => m.id));
      currentId.current = current?.id ?? null;
      if (box) {
        setInbox(box);
        const msg = box.find((m) => !knownInbox.current?.has(m.key));
        if (knownInbox.current && msg) {
          setNewMessage(msg);
          Vibration.vibrate([0, 400, 200, 400]);
        }
        knownInbox.current = new Set(box.map((m) => m.key));
      }
    } catch {
      // offline: keep the last lists
    }
  }, []);

  useEffect(() => {
    responderService.me().then((r) => {
      setStation(r.station);
      setOnDuty(r.onDuty);
      if (!posRef.current) place([Number(r.station.lng), Number(r.station.lat)]);   // start at the station
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
      if (perm !== 'granted') { setLocMode('map'); return; }
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 3000 },
        (l) => place([l.coords.longitude, l.coords.latitude]));
    })();
    return () => sub?.remove();
  }, [locMode, place]);

  // Share the position while on duty or on a mission
  const hasOpen = !!missions?.some((m) => OPEN.includes(m.status) && m.teamStatus !== 'done');
  const sharing = onDuty || hasOpen;
  useEffect(() => {
    if (!sharing) return;
    const share = () => { const p = posRef.current; if (p) responderService.location(p[1], p[0]).catch(() => undefined); };
    share();
    const id = setInterval(share, SHARE_MS);
    return () => clearInterval(id);
  }, [sharing]);

  const toggleDuty = async (v: boolean) => {
    setOnDuty(v);
    try { await responderService.duty(v); } catch { setOnDuty(!v); }
  };

  const mission = missions?.find((m) => m.id === selected) ?? null;
  const openCount = missions?.filter((m) => OPEN.includes(m.status)).length ?? 0;

  return (
    <ScreenLayout title={station ? `${EMOJI[station.type] || '🚨'} ${station.label}` : 'Response unit'} subtitle={user?.fullName ?? station?.name}>
      {mission ? (
        <MissionView mission={mission} status={status} pos={pos} posRef={posRef} place={place} locMode={locMode}
          onBack={() => setSelected(null)} onChanged={load} />
      ) : (
        <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <View style={styles.duty}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dutyTitle}>{onDuty ? 'On duty' : 'Off duty'}</Text>
              <Text style={styles.cardMeta}>{sharing ? '● Position shared with the control room' : 'Position not shared'}</Text>
            </View>
            <Switch value={onDuty} onValueChange={toggleDuty} />
          </View>
          <View style={styles.row}>
            {(['map', 'gps'] as const).map((k) => (
              <Pressable key={k} onPress={() => setLocMode(k)} style={[styles.toggle, locMode === k && styles.toggleOn]}>
                <Text style={[styles.toggleText, locMode === k && { color: '#fff' }]}>{k === 'map' ? 'Map position' : 'Real GPS'}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.row}>
            {(['missions', 'messages'] as const).map((k) => (
              <Pressable key={k} onPress={() => setView(k)} style={[styles.tab, view === k && styles.tabOn]}>
                <Text style={[styles.tabText, view === k && { color: '#111827' }]}>
                  {k === 'missions' ? `Missions${openCount ? ` (${openCount})` : ''}` : `Messages${inbox.length ? ` (${inbox.length})` : ''}`}
                </Text>
              </Pressable>
            ))}
          </View>

          {view === 'missions' ? (
            <>
              {missions === null && <ActivityIndicator color="#455A64" style={{ marginTop: 30 }} />}
              {missions?.length === 0 && (
                <View style={styles.empty}>
                  <MaterialCommunityIcons name="shield-check-outline" size={46} color="#16A34A" />
                  <Text style={styles.emptyText}>No missions. SOS calls dispatched to your station appear here.</Text>
                </View>
              )}
              {missions?.some((m) => m.queuePosition === 0) && <Text style={styles.section}>Current job</Text>}
              {missions?.filter((m) => m.queuePosition === 0).map((m) => <MissionCard key={m.id} m={m} pos={pos} onPress={() => setSelected(m.id)} />)}
              {missions?.some((m) => m.queuePosition > 0) && <Text style={styles.section}>Queue ({missions.filter((m) => m.queuePosition > 0).length})</Text>}
              {missions?.filter((m) => m.queuePosition > 0).map((m) => <MissionCard key={m.id} m={m} pos={pos} onPress={() => setSelected(m.id)} />)}
              {missions?.some((m) => m.queuePosition < 0) && <Text style={styles.section}>Closed</Text>}
              {missions?.filter((m) => m.queuePosition < 0).map((m) => <MissionCard key={m.id} m={m} pos={pos} onPress={() => setSelected(m.id)} />)}
            </>
          ) : (
            <>
              {inbox.length === 0 && <Text style={styles.emptyText}>No messages from the control room yet.</Text>}
              {inbox.map((m) => (
                <Pressable key={m.key} onPress={() => m.sosId && setSelected(m.sosId)} style={styles.msgCard}>
                  <Text style={styles.msgHead}>
                    {m.kind === 'broadcast' ? `📢 ${m.to || 'All teams'}` : `🚨 SOS #${m.sosId}`} · {m.fromName}
                  </Text>
                  <Text style={styles.cardLine}>{m.text}</Text>
                  <Text style={styles.cardMeta}>{timeLabel(new Date(m.atMs).toISOString())}</Text>
                </Pressable>
              ))}
            </>
          )}
          <Pressable onPress={() => void logout()} style={styles.logout}><Text style={styles.logoutText}>Sign out</Text></Pressable>
        </ScrollView>
      )}

      <Modal visible={!!incoming} transparent animationType="fade" onRequestClose={() => setIncoming(null)}>
        <View style={styles.popWrap}>
          <View style={styles.pop}>
            <MaterialCommunityIcons name="alarm-light" size={48} color="#DC2626" />
            <Text style={styles.popTitle}>{incomingKind === 'next' ? 'NEXT JOB' : incomingKind === 'queued' ? 'NEW JOB IN YOUR QUEUE' : 'NEW SOS JOB'}</Text>
            {incoming && <>
              <Text style={styles.popType}>{incoming.type}</Text>
              <Text style={styles.popLine}>{incoming.person}{incoming.damName ? ` · ${incoming.damName}` : ''}</Text>
              {!!incoming.message && <Text style={styles.popMsg}>“{incoming.message}”</Text>}
              {pos && <Text style={styles.popLine}>{(metres(pos, [incoming.lng, incoming.lat]) / 1000).toFixed(1)} km away</Text>}
            </>}
            <Pressable style={styles.popBtn} onPress={() => { setSelected(incoming?.id ?? null); setIncoming(null); }}>
              <Text style={styles.popBtnText}>Open job</Text>
            </Pressable>
            <Pressable onPress={() => setIncoming(null)}><Text style={styles.later}>Later</Text></Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!newMessage && !incoming} transparent animationType="fade" onRequestClose={() => setNewMessage(null)}>
        <View style={[styles.popWrap, { backgroundColor: 'rgba(30,58,138,.8)' }]}>
          <View style={styles.pop}>
            <MaterialCommunityIcons name="message-alert" size={42} color="#1D4ED8" />
            <Text style={[styles.popTitle, { color: '#1D4ED8' }]}>{newMessage?.kind === 'broadcast' ? 'CONTROL ROOM BROADCAST' : 'CONTROL ROOM'}</Text>
            <Text style={[styles.popMsg, { fontStyle: 'normal', fontSize: 16, color: '#111827' }]}>{newMessage?.text}</Text>
            <Pressable style={[styles.popBtn, { backgroundColor: '#1D4ED8' }]} onPress={() => setNewMessage(null)}>
              <Text style={styles.popBtnText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

function MissionCard({ m, pos, onPress }: { m: Mission; pos: LngLat | null; onPress: () => void }) {
  const open = OPEN.includes(m.status) && m.teamStatus !== 'done';
  const km = pos ? metres(pos, [m.lng, m.lat]) / 1000 : null;
  return (
    <Pressable onPress={onPress} style={[styles.card, { borderLeftColor: !open ? '#94A3B8' : m.teamStatus === 'assigned' ? '#DC2626' : '#1D4ED8' }]}>
      <MaterialCommunityIcons name={ICON[m.typeCode] || 'alert'} size={28} color={open ? '#DC2626' : '#94A3B8'} />
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>#{m.id} · {m.type}</Text>
        <Text style={styles.cardLine}>{m.person}{m.damName ? ` · ${m.damName}` : ''}</Text>
        {!!m.message && <Text style={styles.cardLine} numberOfLines={2}>“{m.message}”</Text>}
        <Text style={styles.cardMeta}>
          {!open ? 'Closed' : m.queuePosition > 0 ? `In queue · job ${m.queuePosition + 1}` : STEP_TEXT[m.teamStatus]}
          {km != null && open ? ` · ${km.toFixed(1)} km` : ''} · {timeLabel(m.triggeredAt)}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#9CA3AF" />
    </Pressable>
  );
}

function MissionView({ mission: m, status, pos, posRef, place, locMode, onBack, onChanged }: {
  mission: Mission; status: EvacStatus | null; pos: LngLat | null; posRef: React.MutableRefObject<LngLat | null>;
  place: (p: LngLat) => void; locMode: 'map' | 'gps'; onBack: () => void; onChanged: () => Promise<void>;
}) {
  const [route, setRoute] = useState<TeamRoute | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const path = useRef<{ coords: LngLat[]; step: number }>({ coords: [], step: 0 });
  const person: LngLat = [Number(m.lng), Number(m.lat)];
  const open = OPEN.includes(m.status) && m.teamStatus !== 'done';
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

  // Route now, every minute, and when the person moves more than 150 m
  useEffect(() => {
    if (!open) return;
    if (!routedTo.current || metres(routedTo.current, person) > 150) findRoute();
    const id = setInterval(findRoute, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, findRoute]);

  // Map position mode: drive along the route while on the way
  useEffect(() => {
    if (locMode !== 'map' || m.teamStatus !== 'on_the_way') return;
    const id = setInterval(() => {
      const p = path.current;
      let here = posRef.current;
      if (!here || p.coords.length < 2) return;
      let left = MAP_DRIVE_MPS * (DRIVE_TICK_MS / 1000);
      while (left > 0 && p.step < p.coords.length - 1) {
        const next = p.coords[p.step + 1];
        const d = metres(here, next);
        if (d <= left) { here = next; p.step += 1; left -= d; }
        else { const f = left / d; here = [here[0] + (next[0] - here[0]) * f, here[1] + (next[1] - here[1]) * f]; left = 0; }
      }
      place(here);
    }, DRIVE_TICK_MS);
    return () => clearInterval(id);
  }, [locMode, m.teamStatus, place, posRef]);

  const act = async (action: 'accept' | 'arrived' | 'resolve' | 'backup' | 'handback', reason?: string) => {
    setBusy(true);
    try {
      await responderService.act(m.id, action, action === 'resolve' ? note.trim() || undefined : reason);
      if (action === 'accept') setNavigating(true);
      if (action === 'handback') onBack();
      if (action === 'accept' && !route) await findRoute();
      if (action === 'backup') Alert.alert('Backup requested', 'The control room has been told.');
      await onChanged();
    } catch (e: any) {
      Alert.alert('Not saved', e?.response?.data?.message || 'Check the connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const away = pos ? metres(pos, person) : null;
  const near = away != null && away < 100;
  const current = m.queuePosition === 0;

  // Navigation: follow the unit, next turn, re-route when off the road
  const [navigating, setNavigating] = useState(false);
  const nearestIndex = (() => {
    const c = route?.route.coordinates;
    if (!pos || !c?.length) return -1;
    let best = 0, bestD = Infinity;
    for (let i = 0; i < c.length; i++) {
      const d = metres(pos, c[i] as LngLat);
      if (d < bestD) { bestD = d; best = i; }
    }
    return bestD < 150 ? best : -2;   // -2 = off the route
  })();
  const nextTurn = route?.turns?.find((tn) => tn.index > nearestIndex) ?? null;
  const toTurn = nextTurn && pos ? metres(pos, nextTurn.at as LngLat) : null;
  const lastReroute = useRef(0);
  useEffect(() => {
    if (!navigating || nearestIndex !== -2 || Date.now() - lastReroute.current < 20_000) return;
    lastReroute.current = Date.now();
    findRoute();
  }, [navigating, nearestIndex, findRoute]);
  const told = useRef(false);
  useEffect(() => {
    if (near && m.teamStatus === 'on_the_way' && !told.current) { told.current = true; Vibration.vibrate([0, 300, 150, 300]); }
  }, [near, m.teamStatus]);
  const openMaps = () => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${person[1]},${person[0]}&travelmode=driving`)
    .catch(() => Alert.alert('Maps not available', 'Use the route in the app.'));
  const handBack = () => Alert.alert('Hand this job back?', 'The control room will give it to another unit.', [
    { text: 'Cannot reach the person', onPress: () => act('handback', 'Cannot reach the person') },
    { text: 'Need another kind of unit', onPress: () => act('handback', 'Need another kind of unit') },
    { text: 'Cancel', style: 'cancel' },
  ]);

  return (
    <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <Pressable onPress={onBack} style={styles.back}>
        <MaterialCommunityIcons name="arrow-left" size={20} color="#374151" /><Text style={styles.backText}>Missions</Text>
      </Pressable>

      <View style={[styles.card, { borderLeftColor: open ? '#DC2626' : '#94A3B8' }]}>
        <MaterialCommunityIcons name={ICON[m.typeCode] || 'alert'} size={30} color="#DC2626" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.cardTitle}>#{m.id} · {m.type}</Text>
          <Text style={styles.cardLine}>{m.person}{m.damName ? ` · ${m.damName}` : ''}</Text>
          {!!m.message && <Text style={styles.cardLine}>“{m.message}”</Text>}
          <Text style={styles.cardMeta}>
            {m.battery != null ? `🔋 ${m.battery}% · ` : ''}SOS {timeLabel(m.triggeredAt)}
            {m.positionAgeSeconds != null ? ` · position ${m.positionAgeSeconds < 60 ? 'live' : `${Math.round(m.positionAgeSeconds / 60)} min old`}` : ''}
          </Text>
          {m.otherTeams.length > 0 && (
            <Text style={styles.cardMeta}>Also on this SOS: {m.otherTeams.map((t) => `${EMOJI[t.type] || ''} ${t.station} (${STEP_TEXT[t.status] || t.status})`).join(', ')}</Text>
          )}
        </View>
      </View>

      {navigating && open && m.teamStatus === 'on_the_way' && (
        <View style={styles.turn}>
          <MaterialCommunityIcons name="navigation-variant" size={26} color="#fff" />
          <View style={{ flex: 1 }}>
            {near ? <Text style={styles.turnText}>You have arrived. Tap Arrived.</Text>
              : nearestIndex === -2 ? <Text style={styles.turnText}>Off the route: finding a new one…</Text>
                : nextTurn ? <Text style={styles.turnText}>{toTurn != null ? `In ${toTurn < 1000 ? `${Math.round(toTurn / 10) * 10} m` : `${(toTurn / 1000).toFixed(1)} km`}: ` : ''}{nextTurn.text}</Text>
                  : <Text style={styles.turnText}>Follow the route</Text>}
            {away != null && <Text style={styles.turnSub}>{(away / 1000).toFixed(1)} km to the person{route ? ` · ~${Math.max(1, Math.round(route.etaMin * (away / 1000) / Math.max(route.distanceKm, 0.1)))} min` : ''}</Text>}
          </View>
        </View>
      )}

      <EvacuationMap status={status} me={pos} route={route} sos={false} height={navigating ? 420 : 340} target={person} targetLabel={m.person}
        follow={navigating && m.teamStatus === 'on_the_way'} />

      {open && current && m.teamStatus !== 'arrived' && (
        <View style={styles.row}>
          <Pressable onPress={() => setNavigating((v) => !v)} style={[styles.navBtn, navigating && styles.navBtnOn]}>
            <MaterialCommunityIcons name="navigation-variant" size={18} color={navigating ? '#fff' : '#1D4ED8'} />
            <Text style={[styles.navText, navigating && { color: '#fff' }]}>{navigating ? 'Navigating' : 'Navigate'}</Text>
          </Pressable>
          <Pressable onPress={openMaps} style={styles.navBtn}>
            <MaterialCommunityIcons name="google-maps" size={18} color="#1D4ED8" />
            <Text style={styles.navText}>Google Maps</Text>
          </Pressable>
        </View>
      )}

      {route && open && (
        <View style={styles.info}>
          <Text style={styles.infoBig}>{route.distanceKm} km · ~{route.etaMin} min</Text>
          <Text style={styles.cardMeta}>{route.routingAvailable ? 'Road route, avoiding blocked roads' : 'Straight line: road routing unavailable'}</Text>
          {route.instructions.slice(0, 2).map((s, i) => <Text key={i} style={styles.cardLine}>{i + 1}. {s}</Text>)}
        </View>
      )}

      {open && m.teamStatus === 'assigned' && current && <Big label="Accept · on the way" icon="car-emergency" color="#1D4ED8" busy={busy} onPress={() => act('accept')} />}
      {open && m.queuePosition > 0 && <Text style={styles.queued}>In your queue as job {m.queuePosition + 1}. It starts when your current job is done.</Text>}
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
      {open && !m.backupRequested && m.teamStatus !== 'assigned' && (
        <Pressable onPress={() => act('backup')} disabled={busy} style={styles.backup}>
          <MaterialCommunityIcons name="account-multiple-plus" size={20} color="#B91C1C" />
          <Text style={styles.backupText}>Request backup</Text>
        </Pressable>
      )}
      {open && m.backupRequested && <Text style={styles.backupDone}>⚠ Backup requested</Text>}
      {open && m.teamStatus !== 'arrived' && (
        <Pressable onPress={handBack} disabled={busy}><Text style={styles.handBack}>Hand this job back</Text></Pressable>
      )}
      {!open && <Text style={styles.closed}>Mission closed{m.resolutionNotes ? `: ${m.resolutionNotes}` : ''}</Text>}

      <MissionChat sosId={m.id} open={open} />
    </ScrollView>
  );
}

function MissionChat({ sosId, open }: { sosId: number; open: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [toPerson, setToPerson] = useState(false);
  const load = useCallback(() => responderService.messages(sosId).then(setMessages).catch(() => undefined), [sosId]);
  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const send = async (t: string, person = toPerson) => {
    if (!t.trim()) return;
    try { await responderService.send(sosId, t.trim(), person); setText(''); load(); } catch { Alert.alert('Not sent', 'Check the connection.'); }
  };

  return (
    <View style={styles.chat}>
      <Text style={styles.chatTitle}>Team channel</Text>
      {messages.length === 0 && <Text style={styles.cardMeta}>No messages yet.</Text>}
      {messages.slice(-12).map((msg) => (
        <View key={msg.id} style={[styles.bubble, msg.from === 'control' ? styles.fromControl : styles.fromTeam]}>
          <Text style={styles.bubbleName}>{msg.fromName}{msg.toPerson ? ' → person' : ''}</Text>
          <Text style={styles.cardLine}>{msg.text}</Text>
        </View>
      ))}
      {open && (
        <>
          <Text style={styles.cardMeta}>Quick message to the control room:</Text>
          <View style={styles.quick}>
            {TO_CONTROL.map((q) => <Pressable key={q} onPress={() => send(q, false)} style={styles.chip}><Text style={styles.chipText}>{q}</Text></Pressable>)}
          </View>
          <Text style={styles.cardMeta}>Quick message to the person:</Text>
          <View style={styles.quick}>
            {TO_PERSON.map((q) => <Pressable key={q} onPress={() => send(q, true)} style={[styles.chip, styles.chipPerson]}><Text style={styles.chipText}>{q}</Text></Pressable>)}
          </View>
          <View style={styles.row}>
            <TextInput value={text} onChangeText={setText} placeholder={toPerson ? 'Message to the person…' : 'Message to the control room…'}
              style={[styles.input, { flex: 1, minHeight: 44 }]} />
            <Pressable onPress={() => send(text)} style={styles.send}><MaterialCommunityIcons name="send" size={20} color="#fff" /></Pressable>
          </View>
          <View style={[styles.row, { alignItems: 'center' }]}>
            <Switch value={toPerson} onValueChange={setToPerson} />
            <Text style={styles.cardMeta}>Also show it on the person's phone</Text>
          </View>
        </>
      )}
    </View>
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
  duty: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  dutyTitle: { fontSize: 17, fontWeight: '900', color: '#14532D' },
  toggle: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center', backgroundColor: '#F3F4F6' },
  toggleOn: { backgroundColor: '#455A64' },
  toggleText: { fontWeight: '700', fontSize: 12, color: '#374151' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: '#455A64' },
  tabText: { fontWeight: '800', color: '#9CA3AF' },
  empty: { alignItems: 'center', gap: 8, marginTop: 30, paddingHorizontal: 20 },
  emptyText: { color: '#6B7280', textAlign: 'center' },
  card: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: '#F1F5F9', borderLeftWidth: 5 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  cardLine: { fontSize: 13, color: '#374151' },
  cardMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  msgCard: { backgroundColor: '#EFF6FF', borderRadius: 14, padding: 12, gap: 2 },
  msgHead: { fontSize: 12, fontWeight: '800', color: '#1E3A8A' },
  info: { backgroundColor: '#EFF6FF', borderRadius: 14, padding: 12, gap: 2 },
  infoBig: { fontSize: 18, fontWeight: '900', color: '#1E3A8A' },
  big: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16 },
  bigText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  backup: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  backupText: { color: '#B91C1C', fontWeight: '800' },
  backupDone: { textAlign: 'center', color: '#B91C1C', fontWeight: '700' },
  handBack: { textAlign: 'center', color: '#6B7280', textDecorationLine: 'underline', paddingVertical: 4 },
  queued: { textAlign: 'center', color: '#92400E', backgroundColor: '#FEF3C7', borderRadius: 12, padding: 10, fontWeight: '600' },
  section: { fontSize: 12, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase', marginTop: 4 },
  turn: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#1E3A8A', borderRadius: 16, padding: 12 },
  turnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  turnSub: { color: '#BFDBFE', fontSize: 12, marginTop: 2 },
  navBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 14, borderWidth: 1.5, borderColor: '#93C5FD', backgroundColor: '#EFF6FF' },
  navBtnOn: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  navText: { color: '#1D4ED8', fontWeight: '800' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, minHeight: 56, textAlignVertical: 'top', backgroundColor: '#fff' },
  closed: { textAlign: 'center', color: '#15803D', fontWeight: '700' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontWeight: '700', color: '#374151' },
  chat: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 12, gap: 6, borderWidth: 1, borderColor: '#F1F5F9' },
  chatTitle: { fontWeight: '800', color: '#374151' },
  bubble: { padding: 8, borderRadius: 12, maxWidth: '90%' },
  fromControl: { alignSelf: 'flex-start', backgroundColor: '#DBEAFE' },
  fromTeam: { alignSelf: 'flex-end', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  bubbleName: { fontSize: 10, fontWeight: '800', color: '#6B7280' },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#CBD5E1' },
  chipPerson: { borderColor: '#93C5FD', backgroundColor: '#EFF6FF' },
  chipText: { fontSize: 12, color: '#1F2937' },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center' },
  logout: { alignSelf: 'center', padding: 10, marginTop: 10 },
  logoutText: { color: '#B91C1C', fontWeight: '700' },
  popWrap: { flex: 1, backgroundColor: 'rgba(127,29,29,.85)', justifyContent: 'center', padding: 20 },
  pop: { backgroundColor: '#fff', borderRadius: 26, padding: 22, alignItems: 'center', gap: 6 },
  popTitle: { fontSize: 20, fontWeight: '900', color: '#B91C1C', letterSpacing: 1, textAlign: 'center' },
  popType: { fontSize: 17, fontWeight: '800', color: '#111827' },
  popLine: { color: '#374151' },
  popMsg: { color: '#4B5563', fontStyle: 'italic', textAlign: 'center' },
  popBtn: { marginTop: 10, alignSelf: 'stretch', backgroundColor: '#DC2626', borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  popBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  later: { marginTop: 8, color: '#6B7280', fontWeight: '600' },
});
