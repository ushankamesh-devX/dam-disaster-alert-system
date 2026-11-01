import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenLayout } from '@/components/ScreenLayout';
import { useAuth } from '@/contexts/AuthContext';
import { aiService } from '@/services/ai/ai.service';

type Message = { from: 'me' | 'ai'; text: string; error?: boolean };

const SUGGESTIONS = [
  'Is my dam safe right now?',
  'What is the water level and the danger level?',
  'What should I do if an evacuation order comes?',
  'Will the dam overflow in the next 24 hours?',
];

/** "Ask DDAS AI": questions about the user's dam, answered from live readings, forecasts and documents. */
export default function AssistantScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const scroll = useRef<ScrollView>(null);

  const ask = async (q: string) => {
    const query = q.trim();
    if (!query || busy) return;
    setText('');
    setMessages((m) => [...m, { from: 'me', text: query }]);
    setBusy(true);
    try {
      const res = await aiService.chat({ query, dam_id: user?.preferredDamId ?? undefined });
      setMessages((m) => [...m, { from: 'ai', text: res.data?.data?.answer || 'No answer.' }]);
    } catch (e: any) {
      const timeout = e?.code === 'ECONNABORTED';
      setMessages((m) => [...m, {
        from: 'ai', error: true,
        text: timeout ? 'The assistant took too long. Try again.' : 'The assistant is not available right now.',
      }]);
    } finally {
      setBusy(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <ScreenLayout title="Ask DDAS AI" subtitle="Questions about your dam and safety">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView ref={scroll} contentContainerStyle={{ gap: 10, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          {messages.length === 0 && (
            <View style={{ gap: 8 }}>
              <Text style={styles.hint}>Answers use your dam's live readings and forecasts. In danger, follow official alerts and call 117.</Text>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} onPress={() => ask(s)} style={styles.suggestion}>
                  <MaterialCommunityIcons name="chat-question-outline" size={18} color="#0F766E" />
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {messages.map((m, i) => (
            <View key={i} style={[styles.bubble, m.from === 'me' ? styles.me : styles.ai, m.error && styles.err]}>
              <Text style={[styles.bubbleText, m.from === 'me' && { color: '#fff' }]}>{m.text}</Text>
            </View>
          ))}
          {busy && (
            <View style={[styles.bubble, styles.ai, { flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
              <ActivityIndicator size="small" color="#455A64" />
              <Text style={styles.bubbleText}>Thinking…</Text>
            </View>
          )}
        </ScrollView>
        <View style={styles.inputRow}>
          <TextInput value={text} onChangeText={setText} placeholder="Ask about your dam…" style={styles.input}
            multiline maxLength={500} onSubmitEditing={() => ask(text)} />
          <Pressable onPress={() => ask(text)} disabled={busy || !text.trim()} style={[styles.send, (busy || !text.trim()) && { opacity: 0.4 }]}>
            <MaterialCommunityIcons name="send" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  suggestion: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#CCFBF1' },
  suggestionText: { flex: 1, color: '#134E4A', fontWeight: '600' },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 16 },
  me: { alignSelf: 'flex-end', backgroundColor: '#455A64', borderBottomRightRadius: 4 },
  ai: { alignSelf: 'flex-start', backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 },
  err: { backgroundColor: '#FEF2F2' },
  bubbleText: { fontSize: 14, lineHeight: 20, color: '#111827' },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', paddingVertical: 10, marginBottom: 24 },
  input: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 110, backgroundColor: '#fff' },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0F766E', alignItems: 'center', justifyContent: 'center' },
});
