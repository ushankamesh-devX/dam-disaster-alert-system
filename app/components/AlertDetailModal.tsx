/**
 * AlertDetailModal.tsx — full detail sheet (uses all DB fields)
 */
import React, { useCallback, useEffect } from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert as RNAlert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Alert } from '@/types/alert';
import {
  formatRelativeTime,
  resolveAlertIcon,
  resolveAlertColor,
  categoryLabel,
} from '@/types/alert';
import { playAlertSound } from '@/services/alertSound';

type ResponseType = 'safe' | 'need_help' | 'evacuating';

const RESPONSE_ACTIONS: { type: ResponseType; label: string; icon: string; color: string; bg: string }[] = [
  { type: 'safe',       label: "I'm Safe",  icon: 'check-circle',   color: '#166534', bg: '#DCFCE7' },
  { type: 'need_help',  label: 'Need Help', icon: 'hand-back-left', color: '#991B1B', bg: '#FEE2E2' },
  { type: 'evacuating', label: 'Evacuating',icon: 'run-fast',       color: '#92400E', bg: '#FFFBEB' },
];

interface AlertDetailModalProps {
  alert: Alert | null;
  visible: boolean;
  damName?: string | null;
  regionName?: string | null;
  onClose: () => void;
  onAcknowledge?: (alertId: number, response: ResponseType) => void;
}

export function AlertDetailModal({
  alert, visible, damName, regionName, onClose, onAcknowledge,
}: AlertDetailModalProps) {

  // Sound on open for high severity
  useEffect(() => {
    if (visible && alert && !alert.simulationMode) {
      if (alert.severity === 'emergency' || alert.severity === 'critical') {
        playAlertSound(alert.severity);
      }
    }
  }, [visible, alert?.id]);

  if (!alert) return null;

  const iconName  = resolveAlertIcon(alert);
  const iconColor = resolveAlertColor(alert);
  const issuedAt  = formatRelativeTime(alert.issuedAt ?? alert.createdAt);
  const expiresAt = alert.expiresAt
    ? new Date(alert.expiresAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  const handleResponse = useCallback((type: ResponseType) => {
    onAcknowledge?.(alert.id, type);
    RNAlert.alert(
      'Response Recorded',
      `Your status "${type.replace('_', ' ')}" has been submitted.`,
      [{ text: 'OK', onPress: onClose }],
    );
  }, [alert.id, onAcknowledge, onClose]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.dragHandle} />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: iconColor }]}>
          <MaterialCommunityIcons name={iconName as any} size={30} color="white" />
          <View style={styles.headerText}>
            <Text style={styles.severityLabel}>
              {categoryLabel(alert.alertTypeCategory)} · {alert.severity.toUpperCase()}
            </Text>
            <Text style={styles.alertTypeName} numberOfLines={1}>{alert.alertTypeName}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={22} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Simulation banner */}
          {alert.simulationMode && (
            <View style={styles.simBanner}>
              <MaterialCommunityIcons name="shield-alert-outline" size={15} color="#6B7280" />
              <Text style={styles.simText}>DRILL / SIMULATION — This is NOT a real emergency</Text>
            </View>
          )}

          {/* Title */}
          <Text style={[styles.title, { color: iconColor }]}>{alert.title}</Text>
          {alert.titleSi && <Text style={styles.titleSi}>{alert.titleSi}</Text>}

          {/* Meta chips */}
          <View style={styles.chips}>
            <Chip icon="clock-outline" label={issuedAt} />
            {(damName || alert.damId) && <Chip icon="water" label={damName ?? `Dam #${alert.damId}`} />}
            {(regionName || alert.regionId) && <Chip icon="map-marker" label={regionName ?? `Region #${alert.regionId}`} />}
            {alert.scope && <Chip icon="earth" label={alert.scope.replace('_', ' ')} />}
            {expiresAt && <Chip icon="timer-off" label={`Expires: ${expiresAt}`} color="#EF4444" />}
            <View style={[styles.chip, { backgroundColor: iconColor + '22', borderColor: iconColor, borderWidth: 1 }]}>
              <Text style={[styles.chipText, { color: iconColor, fontWeight: '700' }]}>
                {alert.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Action required */}
          {alert.actionRequired && (
            <>
              <Text style={styles.sectionLabel}>Required Action</Text>
              <View style={[styles.actionBanner, { backgroundColor: iconColor + '18', borderColor: iconColor }]}>
                <MaterialCommunityIcons name="alert-circle" size={18} color={iconColor} />
                <Text style={[styles.actionText, { color: iconColor }]}>{alert.actionRequired}</Text>
              </View>
              {alert.actionRequiredSi && (
                <Text style={styles.actionTextSi}>{alert.actionRequiredSi}</Text>
              )}
              <View style={styles.divider} />
            </>
          )}

          {/* Message */}
          <Text style={styles.sectionLabel}>Alert Details</Text>
          <Text style={styles.message}>{alert.message}</Text>
          {alert.messageSi && <Text style={styles.messageSi}>{alert.messageSi}</Text>}

          {/* Instructions */}
          {alert.instructions && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Instructions</Text>
              <Text style={styles.message}>{alert.instructions}</Text>
            </>
          )}

          {/* Stats */}
          {alert.recipientCount > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Response Summary</Text>
              <View style={styles.statsRow}>
                <StatBox icon="account-multiple" label="Notified" value={alert.recipientCount} color="#6B7280" />
                <StatBox icon="eye" label="Read" value={alert.readCount} color="#3B82F6" />
                <StatBox icon="check-circle" label="Ack'd" value={alert.acknowledgedCount} color="#10B981" />
              </View>
            </>
          )}

          {/* UUID */}
          <View style={styles.divider} />
          <Text style={styles.uuidLabel}>Reference ID</Text>
          <Text style={styles.uuid} selectable>{alert.uuid}</Text>

          {/* Response actions */}
          {['active', 'escalated'].includes(alert.status) && !alert.simulationMode && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>My Status</Text>
              <Text style={styles.sectionSub}>Let authorities know your situation.</Text>
              <View style={styles.actionRow}>
                {RESPONSE_ACTIONS.map((act) => (
                  <TouchableOpacity
                    key={act.type}
                    onPress={() => handleResponse(act.type)}
                    style={[styles.actionBtn, { backgroundColor: act.bg }]}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name={act.icon as any} size={22} color={act.color} />
                    <Text style={[styles.actionLabel, { color: act.color }]}>{act.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Chip({ icon, label, color = '#6B7280' }: { icon: string; label: string; color?: string }) {
  return (
    <View style={styles.chip}>
      <MaterialCommunityIcons name={icon as any} size={12} color={color} />
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

function StatBox({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <View style={styles.statBox}>
      <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#FFFFFF' },
  dragHandle:  { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  headerText:  { flex: 1 },
  severityLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  alertTypeName: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginTop: 2 },
  closeBtn:    { padding: 6 },
  scroll:      { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  simBanner:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 10, padding: 10, marginBottom: 16, gap: 6 },
  simText:     { color: '#6B7280', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, flex: 1 },
  title:       { fontSize: 20, fontWeight: '800', lineHeight: 28, marginBottom: 4 },
  titleSi:     { fontSize: 15, color: '#6B7280', marginBottom: 14, lineHeight: 22 },
  chips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4, marginTop: 10 },
  chip:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, gap: 4 },
  chipText:    { color: '#6B7280', fontSize: 11, fontWeight: '600' },
  divider:     { height: 1, backgroundColor: '#F3F4F6', marginVertical: 18 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  sectionSub:  { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 14 },
  actionBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, borderWidth: 1, gap: 10, marginBottom: 4 },
  actionText:  { fontSize: 14, fontWeight: '700', flex: 1 },
  actionTextSi: { fontSize: 13, color: '#6B7280', marginTop: 4, marginBottom: 4 },
  message:     { fontSize: 15, color: '#374151', lineHeight: 24 },
  messageSi:   { fontSize: 14, color: '#9CA3AF', lineHeight: 22, marginTop: 8, fontStyle: 'italic' },
  statsRow:    { flexDirection: 'row', gap: 12, marginTop: 4 },
  statBox:     { flex: 1, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, gap: 4 },
  statValue:   { fontSize: 18, fontWeight: '800' },
  statLabel:   { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' },
  uuidLabel:   { fontSize: 10, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  uuid:        { fontSize: 11, color: '#6B7280', fontFamily: 'monospace' },
  actionRow:   { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn:   { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 14, gap: 6 },
  actionLabel: { fontSize: 11, fontWeight: '700' },
});
