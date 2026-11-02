import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { askAssistant, getAssistantErrorMessage, type AiChatResponse } from '@/services/ai/ai.service';
import { damService } from '@/services/dams/dam.service';
import { AnswerMarkdown } from './AnswerMarkdown';
import { AnswerData } from './AnswerData';

interface Exchange { id: number; question: string; answer?: AiChatResponse; failed?: string; }
const suggestions = ['Explain my dam’s latest status', 'What does the water level mean?', 'Explain the forecast in simple words'];

function Answer({ result }: { result: AiChatResponse }) {
  const [showSources, setShowSources] = useState(false);
  const sources = Array.isArray(result.sources) ? result.sources : [];
  return <View style={styles.answer}>
    <Text style={styles.answerLabel}>AI assistant</Text>
    <AnswerMarkdown content={result.answer} />
    <AnswerData result={result} />
    {sources.length > 0 && <>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showSources }} onPress={() => setShowSources(value => !value)} style={styles.sourceButton}>
        <MaterialCommunityIcons name="book-open-page-variant-outline" size={16} color="#0F766E" />
        <Text style={styles.link}>{showSources ? 'Hide sources' : `Sources (${sources.length})`}</Text>
      </Pressable>
      {showSources && sources.map((source, index) => <View key={index} style={styles.source}>
        <Text style={styles.sourceTitle}>{typeof source.title === 'string' ? source.title : `Source ${index + 1}`}</Text>
        {typeof source.excerpt === 'string' && <AnswerMarkdown content={source.excerpt} />}
      </View>)}
    </>}
  </View>;
}

// Mounted once above navigation; account/dam keys isolate each local chat.
export function FloatingAssistant() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const onTabs = segments[0] === '(tabs)';
  const damId = user?.preferredDamId;
  const [open, setOpen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [question, setQuestion] = useState('');
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);
  const [damName, setDamName] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const nextId = useRef(0);
  const list = useRef<ScrollView>(null);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); request.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!open || !damId) return;
    let cancelled = false;
    damService.getById(String(damId)).then(response => {
      if (!cancelled && response.data.id === damId) setDamName(response.data.name);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [open, damId]);
  const send = async (text: string, retryId?: number) => {
    const trimmed = text.trim();
    if (!user || request.current || !trimmed || trimmed.length > 2000) return;
    const controller = new AbortController();
    request.current = controller;
    const id = retryId ?? ++nextId.current;
    setBusy(true);
    if (retryId != null) setExchanges(items => items.map(item => item.id === id ? { id, question: trimmed } : item));
    else { setExchanges(items => [...items, { id, question: trimmed }]); setQuestion(''); }
    try {
      const result = await askAssistant(trimmed, damId, controller.signal);
      if (!controller.signal.aborted) setExchanges(items => items.map(item => item.id === id ? { ...item, answer: result } : item));
    } catch (error) {
      if (!controller.signal.aborted) setExchanges(items => items.map(item => item.id === id ? { ...item, failed: getAssistantErrorMessage(error) } : item));
    } finally {
      if (!controller.signal.aborted) { request.current = null; setBusy(false); }
    }
  };
  return <>
    {!open && !keyboardVisible && <Pressable accessibilityRole="button" accessibilityLabel="Open AI assistant" onPress={() => setOpen(true)}
      style={[styles.fab, { bottom: insets.bottom + (onTabs ? 96 : 18), right: Math.max(insets.right, 16) }]}>
      <MaterialCommunityIcons name="chat-processing-outline" size={26} color="white" />
      <Text style={styles.fabLabel}>AI</Text>
    </Pressable>}
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}><Text style={styles.title}>Ask FloodWatch</Text><Text style={styles.context}>{damName ?? (damId ? 'Your selected dam' : 'General questions')}</Text></View>
            {exchanges.length > 0 && <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel="Clear chat" onPress={() => setExchanges([])} style={[styles.iconButton, busy && styles.disabled]}><MaterialCommunityIcons name="delete-outline" size={23} color="#475569" /></Pressable>}
            <Pressable accessibilityRole="button" accessibilityLabel="Close AI assistant" onPress={() => setOpen(false)} style={styles.iconButton}><MaterialCommunityIcons name="close" size={25} color="#334155" /></Pressable>
          </View>
          <ScrollView ref={list} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.messages} onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}>
            {!user ? <View style={styles.welcome}><MaterialCommunityIcons name="chat-processing-outline" size={42} color="#0F766E" /><Text style={styles.welcomeTitle}>A little help, whenever you need it</Text><Text style={styles.welcomeText}>Sign in to ask about your dam, water levels and forecasts.</Text><Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.suggestion}><Text style={styles.link}>Back to sign in</Text></Pressable></View> : <>
              {exchanges.length === 0 && <View style={styles.welcome}>
                <MaterialCommunityIcons name="chat-processing-outline" size={42} color="#0F766E" />
                <Text style={styles.welcomeTitle}>How can I help?</Text><Text style={styles.welcomeText}>Ask about your dam in your own words.</Text>
                {suggestions.map(text => <Pressable key={text} accessibilityRole="button" onPress={() => void send(text)} style={styles.suggestion}><Text style={styles.link}>{text}</Text><MaterialCommunityIcons name="arrow-top-right" size={18} color="#0F766E" /></Pressable>)}
              </View>}
              {exchanges.map(item => <View key={item.id} style={{ gap: 10 }}>
                <View style={styles.question}><Text selectable style={styles.questionText}>{item.question}</Text></View>
                {item.answer ? <Answer result={item.answer} /> : item.failed ? <View style={styles.answer}>
                  <Text accessibilityRole="alert" style={styles.answerText}>{item.failed}</Text>
                  <Pressable disabled={busy} accessibilityRole="button" onPress={() => void send(item.question, item.id)} style={[styles.sourceButton, busy && styles.disabled]}><MaterialCommunityIcons name="refresh" size={18} color="#0F766E" /><Text style={styles.link}>Try again</Text></Pressable>
                </View> : <View accessibilityLiveRegion="polite" style={styles.thinking}><ActivityIndicator size="small" color="#0F766E" /><Text style={styles.context}>Looking into your question…</Text></View>}
              </View>)}
            </>}
          </ScrollView>
          {user && <View style={styles.composerWrap}>
            <Text style={styles.note}>AI can make mistakes. Follow official alerts.</Text>
            <View style={styles.composer}>
              <TextInput accessibilityLabel="Question for AI assistant" placeholder="Ask a question…" placeholderTextColor="#64748B" value={question} onChangeText={setQuestion} multiline maxLength={2000} style={styles.input} />
              <Pressable accessibilityRole="button" accessibilityLabel="Send question" disabled={busy || !question.trim()} onPress={() => void send(question)} style={[styles.send, (busy || !question.trim()) && styles.disabled]}><MaterialCommunityIcons name="arrow-up" size={24} color="white" /></Pressable>
            </View>
          </View>}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7F8' },
  fab: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: '#0F766E', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  fabLabel: { color: 'white', fontSize: 10, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  context: { fontSize: 12, color: '#64748B', marginTop: 3 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  messages: { padding: 16, gap: 18, flexGrow: 1 },
  welcome: { paddingVertical: 22, gap: 12 },
  welcomeTitle: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  welcomeText: { fontSize: 15, lineHeight: 22, color: '#64748B' },
  suggestion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, gap: 8, borderWidth: 1, borderColor: '#CFE3DF', borderRadius: 16, backgroundColor: 'white' },
  link: { color: '#0F766E', fontSize: 14, fontWeight: '600', flexShrink: 1 },
  question: { alignSelf: 'flex-end', maxWidth: '90%', backgroundColor: '#0F766E', borderRadius: 18, padding: 14 },
  questionText: { fontSize: 15, lineHeight: 22, color: 'white' },
  answer: { backgroundColor: 'white', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  answerLabel: { fontSize: 11, fontWeight: '700', color: '#0F766E', marginBottom: 8 },
  answerText: { fontSize: 15, lineHeight: 24, color: '#1E293B' },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  sourceButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 14, paddingBottom: 6 },
  source: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  sourceTitle: { fontSize: 13, fontWeight: '600', color: '#334155' },
  sourceText: { fontSize: 12, lineHeight: 18, color: '#64748B', marginTop: 5 },
  composerWrap: { paddingHorizontal: 14, paddingBottom: 10, backgroundColor: '#F4F7F8' },
  note: { color: '#64748B', fontSize: 11, textAlign: 'center', paddingVertical: 8 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', padding: 7, backgroundColor: 'white', borderRadius: 24, borderWidth: 1, borderColor: '#CBD5E1' },
  input: { flex: 1, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10, fontSize: 15, color: '#0F172A', maxHeight: 120 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F766E' },
  disabled: { opacity: 0.4 },
});
