import React, { ReactNode } from 'react';
import { Text, TouchableOpacity, ViewStyle, TextStyle, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/theme';

interface CTAButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradientColors?: [string, string];
  icon?: ReactNode;
  subtitle?: string;
}
function CTAButton({ title, onPress, disabled = false, style, textStyle,
  gradientColors, icon, subtitle, compact = false,
}: CTAButtonProps & { gradientColors: [string, string]; compact?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} disabled={disabled}
      accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }}
      style={[styles.button, compact && styles.compact, { opacity: disabled ? 0.6 : 1 }, style]}>
      <LinearGradient colors={gradientColors} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        style={[styles.content, compact && styles.compactContent]}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <View style={styles.copy}>
          <Text style={[styles.title, compact && styles.compactTitle, textStyle]}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}
export function CTAButtonGreen(props: CTAButtonProps) {
  return <CTAButton {...props} compact gradientColors={props.gradientColors ?? [Colors.light.buttonGradientStart, Colors.light.buttonGradientEnd]} />;
}
export function CTAButtonOrange(props: CTAButtonProps) {
  return <CTAButton {...props} gradientColors={props.gradientColors ?? [Colors.light.buttonOrangeGradientStart, Colors.light.buttonOrangeGradientEnd]} />;
}
export function CTAButtonYellow(props: CTAButtonProps) {
  return <CTAButton {...props} gradientColors={props.gradientColors ?? [Colors.light.buttonYellowGradientStart, Colors.light.buttonYellowGradientEnd]} />;
}
const styles = StyleSheet.create({
  button: { borderRadius: 16, overflow: 'hidden', elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 },
  compact: { borderRadius: 28 },
  content: { minHeight: 72, paddingHorizontal: 18, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12 },
  compactContent: { minHeight: 52, paddingVertical: 12 },
  icon: { width: 28, alignItems: 'center', flexShrink: 0 },
  copy: { flex: 1, minWidth: 0 },
  title: { color: '#fff', fontSize: 17, lineHeight: 27, fontWeight: '600', flexShrink: 1 },
  compactTitle: { fontSize: 16, lineHeight: 26, textAlign: 'center' },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 22, marginTop: 4 },
});
