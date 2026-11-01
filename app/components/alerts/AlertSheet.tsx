import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { AppAlert } from '@/services/alerts/alert.service';
import { alertLook, isEvacuation, timeLabel } from './alertStyle';
import { useAlerts } from './AlertsContext';

const fmt = (n?: number | null, d = 1) => (n == null ? '—' : Number(n).toFixed(d));

/** Full-screen alert: pops up when a new alert arrives, and opens from the Alerts page as the detail view. */
export function AlertSheet({ alert, incoming, onClose }: { alert: AppAlert | null; incoming?: boolean; onClose: () => void }) {
  const router = useRouter();
  const { damName, damStatus } = useAlerts();
  if (!alert) return null;
  const look = alertLook(alert);
  const dam = damName(alert.damId);
  const s = damStatus(alert.damId);
  const evac = isEvacuation(alert);

  const goEvacuate = () => {
    onClose();
    router.navigate('/emergency');
  };

  return (
    <Modal visible transparent={!incoming} animationType={incoming ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={[styles.wrap, { backgroundColor: incoming ? look.color : 'rgba(0,0,0,.4)' }]}>
        <View style={[styles.card, incoming && styles.cardIncoming]}>
          <ScrollView contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
            <View style={[styles.head, { backgroundColor: look.soft }]}>
              <MaterialCommunityIcons name={look.icon as any} size={incoming ? 46 : 34} color={look.color} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.type, { color: look.color }]}>
                  {(alert.alertTypeName || look.label).toUpperCase()}{alert.simulationMode ? '  ·  DRILL' : ''}
                </Text>
                <Text style={styles.meta}>{[dam, timeLabel(alert.createdAt)].filter(Boolean).join(' · ')}</Text>
              </View>
            </View>

            <Text style={styles.title}>{alert.title}</Text>
            {!!alert.message && <Text style={styles.message}>{alert.message}</Text>}

            {s && (
              <View style={styles.values}>
                <Value label="Water level" value={`${fmt(s.waterLevelMeters)} m`} />
                <Value label="Full" value={`${fmt(s.waterLevelPercentage, 0)} %`} />
                <Value label="Danger level" value={`${fmt(s.dangerLevelMeters)} m`} />
                <Value label="Release" value={s.outflowCumecs ? `${fmt(s.outflowCumecs, 0)} m³/s` : '—'} />
                <Value label="Gates open" value={s.gatesOpenCount != null ? String(s.gatesOpenCount) : '—'} />
              </View>
            )}

            {alert.status === 'resolved' && <Text style={styles.resolved}>This alert is over.</Text>}

            {evac && alert.status !== 'resolved' && (
              <Pressable onPress={goEvacuate} style={[styles.btn, { backgroundColor: look.color }]}>
                <MaterialCommunityIcons name="run-fast" size={22} color="#fff" />
                <Text style={styles.btnText}>Go to evacuation</Text>
              </Pressable>
            )}
            <Pressable onPress={onClose} style={styles.ok}>
              <Text style={styles.okText}>{incoming ? 'OK, I understand' : 'Close'}</Text>
            </Pressable>
            {alert.simulationMode && <Text style={styles.drill}>Drill: practice alert, no real danger.</Text>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Value({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.value}>
      <Text style={styles.valueText}>{value}</Text>
      <Text style={styles.valueLabel}>{label}</Text>
    </View>
  );
}

/** Mounted once in the tabs layout: shows each new alert full-screen. */
export function IncomingAlert() {
  const { incoming, dismiss } = useAlerts();
  return <AlertSheet alert={incoming} incoming onClose={dismiss} />;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  card: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '88%' },
  cardIncoming: { margin: 16, marginBottom: 40, borderRadius: 28 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18 },
  type: { fontSize: 15, fontWeight: '900', letterSpacing: 0.8 },
  meta: { fontSize: 12, color: '#4B5563', marginTop: 2 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  message: { fontSize: 15, lineHeight: 22, color: '#374151' },
  values: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  value: { width: '31%', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  valueText: { fontSize: 15, fontWeight: '800', color: '#111827' },
  valueLabel: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  resolved: { color: '#15803D', fontWeight: '700' },
  btn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 16 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  ok: { paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: '#F3F4F6' },
  okText: { fontSize: 15, fontWeight: '700', color: '#374151' },
  drill: { textAlign: 'center', fontSize: 11, color: '#9CA3AF' },
});
