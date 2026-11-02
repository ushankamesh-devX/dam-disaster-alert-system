import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AuthScaffold, FormError, PrimaryButton, styles } from '@/components/auth/AuthUI';
import { useAuth } from '@/contexts/AuthContext';
import { damService } from '@/services/dams/dam.service';
import { authErrorMessage } from '@/services/auth/error-message';

interface Choice { id: number; name: string; regionName: string; code: string }
export default function OnboardingScreen() {
  const { user, completeOnboarding, logout } = useAuth();
  const router = useRouter();
  const [language, setLanguage] = useState(user?.languagePreference ?? 'en');
  const [selected, setSelected] = useState<number | null>(user?.preferredDamId ?? null);
  const [dams, setDams] = useState<Choice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    damService.getActive().then(response => {
      const rows: Choice[] = Array.isArray(response.data) ? response.data : response.data?.data ?? [];
      if (!cancelled) { setDams(rows); setError(rows.length ? '' : 'No operational dams are available yet. Please try again later.'); }
    }).catch(failure => { if (!cancelled) setError(authErrorMessage(failure)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);

  const save = async () => {
    if (busy || !selected) return;
    setBusy(true);
    setError('');
    try {
      await completeOnboarding(selected, language);
      router.replace('/(tabs)');
    } catch (failure) {
      setError(authErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return <AuthScaffold>
    <Text style={styles.title}>{user?.onboardingCompletedAt ? 'Your preferences' : 'Make it yours'}</Text>
    <Text style={styles.subtitle}>Choose your language and the dam you want to follow. You can change these in Settings.</Text>
    <Text style={styles.label}>App language</Text>
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 26 }}>
      {[['en', 'English'], ['si', 'සිංහල']].map(([code, title]) => <Pressable key={code} accessibilityRole="radio" accessibilityState={{ selected: language === code }} disabled={busy} onPress={() => setLanguage(code)} style={{ flex: 1, padding: 16, borderRadius: 14, borderWidth: 2, borderColor: language === code ? '#0F766E' : '#E2E8F0', backgroundColor: 'white' }}><Text style={{ color: '#20343E', fontWeight: '700' }}>{title}</Text></Pressable>)}
    </View>
    <Text style={styles.label}>Dam to follow</Text>
    <Text style={{ color: '#64748B', lineHeight: 21, marginBottom: 16 }}>Select a dam manually. This choice does not determine whether your area is at risk.</Text>
    {loading ? <ActivityIndicator color="#0F766E" style={{ margin: 24 }} /> : dams.map(dam => <Pressable key={dam.id} accessibilityRole="radio" accessibilityState={{ selected: selected === dam.id }} disabled={busy} onPress={() => setSelected(dam.id)} style={{ padding: 18, backgroundColor: 'white', borderRadius: 16, borderWidth: 2, borderColor: selected === dam.id ? '#0F766E' : '#E2E8F0', marginBottom: 12, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <MaterialCommunityIcons name={selected === dam.id ? 'radiobox-marked' : 'radiobox-blank'} color="#0F766E" size={24} />
      <View style={{ flex: 1 }}><Text style={{ fontSize: 17, fontWeight: '700', color: '#20343E' }}>{dam.name}</Text><Text style={{ color: '#64748B', marginTop: 5 }}>{dam.regionName || dam.code}</Text>{dam.code.startsWith('DEMO-') && <Text style={{ color: '#B45309', marginTop: 5 }}>Demo data</Text>}</View>
    </Pressable>)}
    <FormError message={error} />
    {!loading && !dams.length && <Pressable onPress={() => { setLoading(true); setError(''); setAttempt(value => value + 1); }}><Text style={[styles.link, { marginBottom: 20 }]}>Try loading dams again</Text></Pressable>}
    <PrimaryButton title="Save and continue" onPress={() => void save()} busy={busy} disabled={loading || !dams.some(dam => dam.id === selected)} />
    <Pressable disabled={busy} onPress={() => void logout()} style={{ alignSelf: 'center', marginTop: 24, padding: 10 }}><Text style={{ color: '#64748B' }}>Sign out</Text></Pressable>
  </AuthScaffold>;
}
