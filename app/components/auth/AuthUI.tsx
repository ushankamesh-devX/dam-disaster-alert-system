import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export function AuthScaffold({ children }: { children: React.ReactNode }) {
  return <SafeAreaView style={styles.page}><StatusBar style="dark" /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="always"><View style={styles.brand}><MaterialCommunityIcons name="shield-alert-outline" size={34} color="#0F766E" /><Text style={styles.brandName}>FloodWatch</Text></View>{children}</ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
export function FormField({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ marginBottom: 16 }}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#94A3B8" style={styles.input} {...props} /></View>;
}
export function PrimaryButton({ title, onPress, busy, disabled }: { title: string; onPress: () => void; busy?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!(busy || disabled), busy }} disabled={busy || disabled} onPress={onPress} style={[styles.button, (busy || disabled) && { opacity: 0.55 }]}>{busy ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{title}</Text>}</Pressable>;
}
export function FormError({ message }: { message: string }) {
  return message ? <Text accessibilityLiveRegion="polite" style={styles.error}>{message}</Text> : null;
}
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F2F6F7' }, content: { padding: 24, paddingBottom: 44, flexGrow: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 24 }, brandName: { color: '#455A64', fontSize: 26, fontWeight: '800' },
  title: { fontSize: 30, fontWeight: '800', color: '#20343E', marginBottom: 10 }, subtitle: { fontSize: 16, lineHeight: 24, color: '#64748B', marginBottom: 26 },
  card: { backgroundColor: 'white', padding: 22, borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  label: { fontSize: 14, color: '#334155', fontWeight: '600', marginBottom: 8 }, input: { minHeight: 52, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 14, fontSize: 16, color: '#0F172A' },
  button: { backgroundColor: '#0F766E', minHeight: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 8 }, buttonText: { color: 'white', fontWeight: '700', fontSize: 16 },
  error: { color: '#B91C1C', backgroundColor: '#FEF2F2', padding: 12, borderRadius: 10, lineHeight: 21, marginBottom: 12 }, link: { color: '#0F766E', fontWeight: '700', fontSize: 15 },
});

