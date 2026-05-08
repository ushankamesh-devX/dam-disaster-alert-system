/**
 * AlertCard.tsx — uses DB-driven icon + color from AlertType
 */
import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Alert } from '@/types/alert';
import {
  formatRelativeTime,
  resolveAlertIcon,
  resolveAlertColor,
  categoryLabel,
} from '@/types/alert';

// ── Severity → light background tint ─────────────────────────────────────────
const SEV_BG: Record<string, string> = {
  emergency: '#FEE2E2',
  critical:  '#FEF2F2',
  warning:   '#FFFBEB',
  info:      '#EFF6FF',
};
const SEV_BORDER: Record<string, string> = {
  emergency: '#EF4444',
  critical:  '#F87171',
  warning:   '#FCD34D',
  info:      '#93C5FD',
};

interface AlertCardProps {
  alert: Alert;
  damName?: string | null;
  regionName?: string | null;
  onPress?: (alert: Alert) => void;
}

export function AlertCard({ alert, damName, regionName, onPress }: AlertCardProps) {
  // Resolve icon and color — prefer DB values from alert_types table
  const iconName  = resolveAlertIcon(alert);
  const iconColor = resolveAlertColor(alert);
  const bgTint    = SEV_BG[alert.severity]    ?? '#F9FAFB';
  const border    = SEV_BORDER[alert.severity] ?? '#E5E7EB';

  const timestamp = formatRelativeTime(alert.issuedAt ?? alert.createdAt);

  // Build location label
  const location = damName
    ? `${damName}${regionName ? ` · ${regionName}` : ''}`
    : regionName ?? (alert.scope === 'nationwide' ? 'Nationwide' : alert.alertTypeName);

  return (
    <TouchableOpacity
      onPress={() => onPress?.(alert)}
      activeOpacity={0.85}
      style={{ borderLeftColor: iconColor, borderLeftWidth: 4 }}
      className="bg-white rounded-3xl mb-4 shadow-sm border border-gray-100 overflow-hidden"
    >
      {/* Simulation banner */}
      {alert.simulationMode && (
        <View className="bg-gray-100 px-4 py-1 flex-row items-center gap-1">
          <MaterialCommunityIcons name="shield-alert-outline" size={11} color="#6B7280" />
          <Text className="text-gray-500 text-[9px] font-bold uppercase tracking-wider">
            DRILL / SIMULATION — Not a real emergency
          </Text>
        </View>
      )}

      <View className="flex-row items-start p-4">
        {/* Icon bubble — color from DB */}
        <View
          style={{ backgroundColor: iconColor }}
          className="rounded-2xl w-12 h-12 items-center justify-center mr-3 shadow-sm"
        >
          <MaterialCommunityIcons name={iconName as any} size={24} color="white" />
        </View>

        {/* Content */}
        <View className="flex-1">
          {/* Title row */}
          <View className="flex-row justify-between items-start mb-1">
            <Text
              style={{ color: iconColor }}
              className="font-bold text-sm uppercase tracking-wide flex-1 mr-2"
              numberOfLines={2}
            >
              {alert.title}
            </Text>

            {/* Category + severity badge */}
            <View style={{ backgroundColor: bgTint, borderColor: border, borderWidth: 1 }}
              className="rounded-full px-2 py-0.5 shrink-0">
              <Text style={{ color: iconColor }} className="text-[9px] font-bold uppercase tracking-wider">
                {alert.severity}
              </Text>
            </View>
          </View>

          {/* Message preview */}
          <Text className="text-gray-600 text-sm leading-5" numberOfLines={3}>
            {alert.message}
          </Text>

          {/* Action required pill (from DB) */}
          {alert.actionRequired && (
            <View style={{ backgroundColor: bgTint }} className="rounded-lg px-2 py-1 mt-2 self-start">
              <Text style={{ color: iconColor }} className="text-[10px] font-bold uppercase tracking-wide">
                ⚠ {alert.actionRequired}
              </Text>
            </View>
          )}

          {/* Meta row */}
          <View className="flex-row items-center justify-between mt-3">
            <View className="flex-row items-center bg-gray-50 px-2 py-1 rounded-lg flex-1 mr-2 gap-1">
              <MaterialCommunityIcons name="map-marker" size={12} color="#6B7280" />
              <Text className="text-gray-500 text-xs font-semibold" numberOfLines={1}>
                {location}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <MaterialCommunityIcons name="clock-outline" size={11} color="#9CA3AF" />
              <Text className="text-gray-400 text-xs italic">{timestamp}</Text>
            </View>
          </View>

          {/* Stats row (only if recipients > 0) */}
          {alert.recipientCount > 0 && (
            <View className="flex-row items-center mt-2 gap-3">
              <View className="flex-row items-center gap-0.5">
                <MaterialCommunityIcons name="account-multiple" size={11} color="#9CA3AF" />
                <Text className="text-gray-400 text-[10px]">{alert.recipientCount} notified</Text>
              </View>
              {alert.acknowledgedCount > 0 && (
                <View className="flex-row items-center gap-0.5">
                  <MaterialCommunityIcons name="check-circle" size={11} color="#10B981" />
                  <Text className="text-emerald-500 text-[10px]">{alert.acknowledgedCount} ack'd</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Optional image */}
      {alert.imageUrl && (
        <View className="mx-4 mb-4 rounded-2xl overflow-hidden">
          <Image source={{ uri: alert.imageUrl }} className="w-full h-44" resizeMode="cover" />
        </View>
      )}
    </TouchableOpacity>
  );
}
