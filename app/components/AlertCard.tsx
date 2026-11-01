import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AppAlert } from '@/services/alerts/alert.service';
import { alertLook, timeLabel } from '@/components/alerts/alertStyle';

/** One alert in the list: colour by severity, type and drill badges, dam, message and time. */
export function AlertCard({ alert, damName, isNew, onPress }: { alert: AppAlert; damName?: string; isNew?: boolean; onPress?: () => void }) {
  const look = alertLook(alert);
  const over = alert.status === 'resolved';
  return (
    <Pressable onPress={onPress} style={[styles.card, { borderLeftColor: over ? '#CBD5E1' : look.color }]}>
      <View style={[styles.icon, { backgroundColor: over ? '#F1F5F9' : look.soft }]}>
        <MaterialCommunityIcons name={look.icon as any} size={24} color={over ? '#94A3B8' : look.color} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.badges}>
          <Text style={[styles.badge, { color: look.color, backgroundColor: look.soft }]}>{(alert.alertTypeName || look.label).toUpperCase()}</Text>
          {alert.simulationMode && <Text style={[styles.badge, styles.drill]}>DRILL</Text>}
          {isNew && <Text style={[styles.badge, styles.new]}>NEW</Text>}
        </View>
        <Text style={[styles.title, over && { color: '#64748B' }]} numberOfLines={2}>{alert.title}</Text>
        {!!alert.message && <Text style={styles.message} numberOfLines={3}>{alert.message}</Text>}
        <View style={styles.foot}>
          {!!damName && (
            <View style={styles.row}>
              <MaterialCommunityIcons name="map-marker" size={13} color="#6B7280" />
              <Text style={styles.footText}>{damName}</Text>
            </View>
          )}
          <View style={styles.row}>
            <MaterialCommunityIcons name="clock-outline" size={12} color="#9CA3AF" />
            <Text style={styles.footText}>{timeLabel(alert.createdAt)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#F1F5F9', borderLeftWidth: 5, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { fontSize: 10, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', letterSpacing: 0.4 },
  drill: { color: '#7C3AED', backgroundColor: '#EDE9FE' },
  new: { color: '#fff', backgroundColor: '#DC2626' },
  title: { fontSize: 15, fontWeight: '800', color: '#111827' },
  message: { fontSize: 13, lineHeight: 18, color: '#4B5563' },
  foot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  footText: { fontSize: 11, color: '#6B7280' },
});
