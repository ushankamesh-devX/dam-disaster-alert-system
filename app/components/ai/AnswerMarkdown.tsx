import React, { useMemo } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { parseAnswerMarkdown, safeAnswerLink, type MarkdownNode } from '@/services/ai/markdown';

function attribute(node: MarkdownNode, name: string) { return node.attrs?.find(item => item[0] === name)?.[1]; }
function inline(nodes: MarkdownNode[]): React.ReactNode[] {
  return nodes.map((node, index) => {
    const children = node.children.length ? inline(node.children) : node.content;
    switch (node.type) {
      case 'strong': return <Text key={index} style={styles.bold}>{children}</Text>;
      case 'em': return <Text key={index} style={styles.italic}>{children}</Text>;
      case 's': return <Text key={index} style={styles.strike}>{children}</Text>;
      case 'code_inline': return <Text key={index} style={styles.inlineCode}>{node.content}</Text>;
      case 'softbreak': case 'hardbreak': return '\n';
      case 'image': return <Text key={index} style={styles.muted}>[Image: {node.content || 'illustration'}]</Text>;
      case 'link': {
        const url = safeAnswerLink(attribute(node, 'href') ?? '');
        return <Text key={index} accessibilityRole={url ? 'link' : undefined} style={url ? styles.link : undefined}
          onPress={url ? () => { void Linking.openURL(url).catch(() => Alert.alert('Couldn’t open link', 'Please try again later.')); } : undefined}>{children}</Text>;
      }
      default: return <Text key={index}>{children}</Text>;
    }
  });
}
function rows(node: MarkdownNode): MarkdownNode[] {
  return node.type === 'tr' ? [node] : node.children.flatMap(rows);
}
function Block({ node }: { node: MarkdownNode }) {
  const children = node.children.map((child, index) => <Block key={index} node={child} />);
  switch (node.type) {
    case 'inline': return <Text selectable style={styles.text}>{inline(node.children)}</Text>;
    case 'heading': return <Text selectable accessibilityRole="header" style={[styles.heading, node.tag === 'h1' ? styles.h1 : node.tag === 'h2' ? styles.h2 : styles.h3]}>{node.children.flatMap(child => child.type === 'inline' ? inline(child.children) : inline([child]))}</Text>;
    case 'paragraph': return <View style={styles.paragraph}>{children}</View>;
    case 'blockquote': return <View style={styles.quote}>{children}</View>;
    case 'bullet_list': case 'ordered_list': {
      const start = Number(attribute(node, 'start') ?? 1);
      return <View style={styles.list}>{node.children.map((item, index) => <View key={index} style={styles.listRow}>
        <Text style={styles.marker}>{node.type === 'ordered_list' ? `${start + index}.` : '•'}</Text>
        <View style={styles.listBody}>{item.children.map((child, i) => <Block key={i} node={child} />)}</View>
      </View>)}</View>;
    }
    case 'fence': case 'code_block': return <ScrollView horizontal nestedScrollEnabled style={styles.codeBlock}><Text selectable style={styles.codeText}>{node.content.replace(/\n$/, '')}</Text></ScrollView>;
    case 'hr': return <View style={styles.divider} />;
    case 'table': return <ScrollView horizontal nestedScrollEnabled style={styles.tableScroll}>
      <View style={styles.table}>{rows(node).map((row, index) => <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.striped]}>
        {row.children.map((cell, cellIndex) => <View key={cellIndex} style={[styles.cell, cell.type === 'th' && styles.headerCell]}>
          <Text selectable style={[styles.text, cell.type === 'th' && styles.bold]}>{cell.children.flatMap(child => child.type === 'inline' ? inline(child.children) : inline([child]))}</Text>
        </View>)}
      </View>)}</View>
    </ScrollView>;
    default: return children.length ? <View>{children}</View> : node.content ? <Text selectable style={styles.text}>{node.content}</Text> : null;
  }
}
export function AnswerMarkdown({ content }: { content: string }) {
  const nodes = useMemo(() => parseAnswerMarkdown(content), [content]);
  return <View style={{ minWidth: 0 }}>{nodes.map((node, index) => <Block key={index} node={node} />)}</View>;
}
const styles = StyleSheet.create({
  text: { fontSize: 15, lineHeight: 24, color: '#1E293B', flexShrink: 1 },
  paragraph: { marginBottom: 10 },
  heading: { fontWeight: '700', color: '#0F172A', marginTop: 12, marginBottom: 8 },
  h1: { fontSize: 21, lineHeight: 28, color: '#0F766E' }, h2: { fontSize: 18, lineHeight: 25 }, h3: { fontSize: 16, lineHeight: 23 },
  bold: { fontWeight: '700' }, italic: { fontStyle: 'italic' }, strike: { textDecorationLine: 'line-through' },
  muted: { color: '#64748B' }, link: { color: '#0F766E', textDecorationLine: 'underline' },
  inlineCode: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', backgroundColor: '#E8F2F0', color: '#115E59', fontSize: 13 },
  quote: { borderLeftWidth: 3, borderLeftColor: '#0F766E', backgroundColor: '#EDF7F4', padding: 12, paddingBottom: 2, marginVertical: 8, borderRadius: 6 },
  list: { marginVertical: 4 }, listRow: { flexDirection: 'row', gap: 8 }, listBody: { flex: 1, minWidth: 0 }, marker: { color: '#0F766E', fontWeight: '600', fontSize: 15, lineHeight: 24, minWidth: 18 },
  codeBlock: { borderRadius: 10, backgroundColor: '#1E293B', marginVertical: 8 },
  codeText: { color: '#F8FAFC', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, lineHeight: 20, padding: 12 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 },
  tableScroll: { marginVertical: 10 }, table: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, overflow: 'hidden' },
  tableRow: { flexDirection: 'row' }, striped: { backgroundColor: '#F8FAFC' },
  cell: { width: 155, padding: 10, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0' }, headerCell: { backgroundColor: '#E8F2F0' },
});
