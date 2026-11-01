import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { evacuationService, SosType } from '@/services/evacuation/evacuation.service';

const FALLBACK: SosType[] = [
  { code: 'flood_trapped', name: 'Trapped by flood water' },
  { code: 'injured', name: 'Injured' },
  { code: 'medical', name: 'Medical emergency' },
  { code: 'stranded_vehicle', name: 'Vehicle stranded' },
];
const ICONS: Record<string, any> = { flood_trapped: 'home-flood', injured: 'bandage', medical: 'medical-bag', stranded_vehicle: 'car-emergency' };

type Props = { visible: boolean; onClose: () => void; onSend: (type: string, message: string) => Promise<void> };

/** Pick what happened, add a note, send. The location goes with it. */
export function SosModal({ visible, onClose, onSend }: Props) {
  const [types, setTypes] = useState<SosType[]>(FALLBACK);
  const [type, setType] = useState('flood_trapped');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) evacuationService.sosTypes().then((t) => t.length && setTypes(t)).catch(() => undefined);
  }, [visible]);

  const send = async () => {
    setBusy(true);
    try {
      await onSend(type, message.trim());
      setMessage('');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>Send SOS</Text>
        <Text style={styles.sub}>Your location is sent to the evacuation team.</Text>
        <View style={styles.grid}>
          {types.map((t) => (
            <Pressable key={t.code} onPress={() => setType(t.code)}
              style={[styles.type, type === t.code && styles.typeOn]}>
              <MaterialCommunityIcons name={ICONS[t.code] || 'alert'} size={22} color={type === t.code ? '#fff' : '#B91C1C'} />
              <Text style={[styles.typeText, type === t.code && { color: '#fff' }]}>{t.name}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput value={message} onChangeText={setMessage} placeholder="Message (optional): e.g. 3 people, one elderly"
          style={styles.input} multiline maxLength={200} />
        <Pressable onPress={send} disabled={busy} style={[styles.send, busy && { opacity: 0.6 }]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>SEND SOS</Text>}
        </Pressable>
        <Text style={styles.note}>Demo system: no real police or hospital is contacted.</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.35)' },
  sheet: { backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#991B1B' },
  sub: { color: '#6B7280', marginTop: -6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  type: { width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  typeOn: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  typeText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#7F1D1D' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, minHeight: 60, textAlignVertical: 'top' },
  send: { backgroundColor: '#DC2626', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  sendText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  note: { textAlign: 'center', fontSize: 11, color: '#9CA3AF' },
});
