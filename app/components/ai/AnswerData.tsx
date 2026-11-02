import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AiChatResponse } from '@/services/ai/ai.service';
import { formatMeasurement as value, formatRecordedTime as time } from '@/services/dams/dashboard.service';

function numeric(raw: unknown): number | null {
  if (raw == null || raw === '' || typeof raw === 'boolean') return null;
  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}
function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <ScrollView horizontal nestedScrollEnabled style={{ marginTop: 8 }}>
    <View>{[headers, ...rows].map((row, index) => <View key={index} style={[styles.row, index === 0 && styles.tableHeader]}>
      {row.map((cell, i) => <Text key={i} selectable style={[styles.cell, index === 0 && styles.bold]}>{cell}</Text>)}
    </View>)}</View>
  </ScrollView>;
}
function Trend({ chart }: { chart: Record<string, unknown> }) {
  const [width, setWidth] = useState(240);
  const raw = Array.isArray(chart.timeSeries) ? chart.timeSeries : [];
  const points = raw.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map(row => ({ level: numeric(row.water_level_meters), timestamp: typeof row.timestamp === 'string' ? row.timestamp : '' }))
    .filter((row): row is { level: number; timestamp: string } => row.level != null && Number.isFinite(Date.parse(row.timestamp)))
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)).slice(-60);
  if (chart.type !== 'water_level_trend' || points.length < 2) return null;
  const min = Math.min(...points.map(point => point.level));
  const max = Math.max(...points.map(point => point.level));
  const first = Date.parse(points[0].timestamp), last = Date.parse(points[points.length - 1].timestamp);
  const coordinates = points.map(point => ({
    x: 5 + (Date.parse(point.timestamp) - first) / (last - first || 1) * (width - 10),
    y: 110 - (point.level - min) / (max - min || 1) * 95,
  }));
  return <View style={styles.section}>
    <Text style={styles.title}>Water-level history</Text>
    <Text style={styles.caption}>Latest {points.length} readings · {value(min, 'm')} to {value(max, 'm')}</Text>
    <View onLayout={event => setWidth(Math.max(40, event.nativeEvent.layout.width))} accessible accessibilityLabel={`Water levels between ${min} and ${max} metres over ${points.length} readings`} style={styles.plot}>
      {coordinates.slice(1).map((point, index) => {
        const previous = coordinates[index];
        const dx = point.x - previous.x, dy = point.y - previous.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        return <View key={index} style={{ position: 'absolute', left: (point.x + previous.x) / 2 - length / 2, top: (point.y + previous.y) / 2 - 1, width: length, height: 2, backgroundColor: '#0F766E', transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }] }} />;
      })}
    </View>
    <Text style={styles.caption}>From {time(points[0].timestamp)}</Text>
    <Text style={styles.caption}>To {time(points[points.length - 1].timestamp)}</Text>
  </View>;
}
export function AnswerData({ result }: { result: AiChatResponse }) {
  const [open, setOpen] = useState(false);
  const telemetry = result.telemetry;
  const overflow = result.overflow_config;
  const forecasts = Array.isArray(result.forecasts) ? result.forecasts : [];
  const sensors = Array.isArray(result.sensors) ? result.sensors : [];
  if (!telemetry && !overflow && !forecasts.length && !sensors.length && !result.chart_data) return null;
  return <View style={styles.wrap}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(current => !current)} style={styles.toggle}>
      <MaterialCommunityIcons name="chart-line" size={19} color="#0F766E" />
      <Text style={styles.link}>Dam data</Text><MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={20} color="#0F766E" />
    </Pressable>
    {open && <>
      {telemetry && <View style={styles.section}><Text style={styles.title}>Latest recorded readings</Text>
        {[
          ['Water height', value(telemetry.waterLevelMeters, 'm')],
          ['Water flowing in', value(telemetry.inflowCumecs, 'm³/s')],
          ['Water flowing out', value(telemetry.outflowCumecs, 'm³/s')],
          ['Storage', value(telemetry.storagePercentage, '%')],
        ].map(([label, text]) => <View key={label} style={styles.metric}><Text style={styles.caption}>{label}</Text><Text style={styles.metricValue}>{text}</Text></View>)}
        <Text style={styles.caption}>Reading: {time(typeof telemetry.lastSensorReadingAt === 'string' ? telemetry.lastSensorReadingAt : null)}</Text>
      </View>}
      {overflow && <View style={styles.section}><Text style={styles.title}>Reservoir limits</Text><Text style={styles.caption}>Full level: {value(overflow.fullReservoirLevelMeters, 'm')}</Text><Text style={styles.caption}>Overflow level: {value(overflow.overflowThresholdMeters, 'm')}</Text></View>}
      {forecasts.length > 0 && <View style={styles.section}><Text style={styles.title}>Forecast</Text><DataTable headers={['Ahead', 'Water height', 'Overflow chance']} rows={forecasts.map(row => {
        const probability = numeric(row.overflowProbability);
        return [value(row.horizonHours, 'hours'), value(row.levelP50 ?? row.predictedLevelP50 ?? row.predictedWaterLevel, 'm'), probability != null && probability >= 0 && probability <= 1 ? value(probability * 100, '%') : 'Unavailable'];
      })} /></View>}
      {sensors.length > 0 && <View style={styles.section}><Text style={styles.title}>Sensors</Text><DataTable headers={['Sensor', 'Warning level', 'Critical level']} rows={sensors.map(row => [typeof row.name === 'string' ? row.name : 'Sensor', value(row.warningThreshold ?? row.warning_threshold, typeof row.unit === 'string' ? row.unit : ''), value(row.criticalThreshold ?? row.critical_threshold, typeof row.unit === 'string' ? row.unit : '')])} /></View>}
      {result.chart_data && <Trend chart={result.chart_data} />}
    </>}
  </View>;
}
const styles = StyleSheet.create({
  wrap: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 12 }, link: { color: '#0F766E', fontSize: 14, fontWeight: '600', flex: 1 },
  section: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' }, title: { color: '#334155', fontWeight: '700', fontSize: 14, marginBottom: 6 },
  caption: { color: '#64748B', fontSize: 12, lineHeight: 19 }, metric: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 5 }, metricValue: { color: '#1E293B', fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row' }, tableHeader: { backgroundColor: '#E8F2F0' }, cell: { width: 125, borderWidth: 0.5, borderColor: '#CBD5E1', padding: 8, color: '#334155', fontSize: 12, lineHeight: 18 }, bold: { fontWeight: '700' },
  plot: { height: 125, backgroundColor: '#F0F9F7', borderRadius: 8, marginVertical: 8, overflow: 'hidden' },
});
