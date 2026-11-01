import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AlertCard } from '@/components/AlertCard';
import { ScreenLayout } from '@/components/ScreenLayout';
import { AlertSheet } from '@/components/alerts/AlertSheet';
import { useAlerts } from '@/components/alerts/AlertsContext';
import { isEvacuation, newestFirst } from '@/components/alerts/alertStyle';
import { alertService, AppAlert } from '@/services/alerts/alert.service';

export default function AlertsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { active, damName, refresh, markAllSeen, isUnseen } = useAlerts();
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [history, setHistory] = useState<AppAlert[] | null>(null);
  const [open, setOpen] = useState<AppAlert | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const newIds = useRef<Set<number>>(new Set());

  // Opening the page counts the current alerts as seen (clears the tab badge); keep "NEW" on them for this visit
  useFocusEffect(useCallback(() => {
    active.filter((a) => isUnseen(a.id)).forEach((a) => newIds.current.add(a.id));
    markAllSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markAllSeen]));
  useFocusEffect(useCallback(() => () => { newIds.current = new Set(); }, []));

  useEffect(() => {
    refresh().finally(() => setLoaded(true));
  }, [refresh]);

  const loadHistory = useCallback(() =>
    alertService.listHistory().then((h) => setHistory([...h].sort(newestFirst).slice(0, 50))).catch(() => setHistory([])), []);
  useEffect(() => {
    if (tab === 'history' && history === null) loadHistory();
  }, [tab, history, loadHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), tab === 'history' ? loadHistory() : null]);
    setRefreshing(false);
  };

  const count = (f: (a: AppAlert) => boolean) => active.filter(f).length;
  const evac = active.find((a) => isEvacuation(a));
  const list = tab === 'active' ? active : history ?? [];

  return (
    <ScreenLayout title={t('alerts_title')} subtitle={t('alerts_subtitle')}>
      <View style={styles.counters}>
        <Counter n={count((a) => a.severity === 'critical' || a.severity === 'emergency')} label="Critical" color="#DC2626" bg="#FEF2F2" />
        <Counter n={count((a) => a.severity === 'warning')} label="Warnings" color="#D97706" bg="#FFFBEB" />
        <Counter n={count((a) => !a.severity || a.severity === 'info')} label="Updates" color="#2563EB" bg="#EFF6FF" />
      </View>

      {evac && (
        <Pressable onPress={() => router.navigate('/emergency')} style={styles.banner}>
          <MaterialCommunityIcons name="alarm-light" size={26} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{evac.title}</Text>
            <Text style={styles.bannerText}>Tap to see your safest route →</Text>
          </View>
        </Pressable>
      )}

      <View style={styles.tabs}>
        {(['active', 'history'] as const).map((k) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && styles.tabOn]}>
            <Text style={[styles.tabText, tab === k && { color: '#fff' }]}>
              {k === 'active' ? `Active (${active.length})` : 'History'}
            </Text>
          </Pressable>
        ))}
      </View>

      {!loaded || (tab === 'history' && history === null) ? (
        <ActivityIndicator size="large" color="#455A64" style={{ marginTop: 30 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {list.length === 0 && (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="shield-check-outline" size={44} color="#16A34A" />
              <Text style={styles.emptyText}>{tab === 'active' ? 'No active alerts. You are safe.' : 'No past alerts.'}</Text>
            </View>
          )}
          {list.map((a) => (
            <AlertCard key={a.id} alert={a} damName={damName(a.damId)} isNew={tab === 'active' && (newIds.current.has(a.id) || isUnseen(a.id))}
              onPress={() => setOpen(a)} />
          ))}
        </ScrollView>
      )}

      <AlertSheet alert={open} onClose={() => setOpen(null)} />
    </ScreenLayout>
  );
}

function Counter({ n, label, color, bg }: { n: number; label: string; color: string; bg: string }) {
  return (
    <View style={[styles.counter, { backgroundColor: bg }]}>
      <Text style={[styles.counterN, { color }]}>{n}</Text>
      <Text style={[styles.counterLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  counters: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  counter: { flex: 1, borderRadius: 16, paddingVertical: 10, alignItems: 'center' },
  counterN: { fontSize: 20, fontWeight: '900' },
  counterLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  banner: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#DC2626', borderRadius: 18, padding: 14, marginBottom: 12 },
  bannerTitle: { color: '#fff', fontWeight: '900', fontSize: 15 },
  bannerText: { color: '#FEE2E2', fontSize: 12, marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 3, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabOn: { backgroundColor: '#455A64' },
  tabText: { fontWeight: '700', fontSize: 13, color: '#374151' },
  empty: { alignItems: 'center', gap: 8, marginTop: 40 },
  emptyText: { color: '#6B7280' },
});
