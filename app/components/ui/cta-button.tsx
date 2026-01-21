import React, { ReactNode } from 'react';
import { Text, TouchableOpacity, ViewStyle, TextStyle, View } from 'react-native';
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

export function CTAButtonGreen({
  title,
  onPress,
  disabled = false,
  style,
  textStyle,
  gradientColors = [Colors.light.buttonGradientStart, Colors.light.buttonGradientEnd],
}: CTAButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
      className="rounded-full overflow-hidden"
      style={[
        {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        className="py-4 items-center rounded-full"
      >
        <Text
          className="text-white text-2xl font-semibold"
          style={textStyle}
        >
          {title}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function CTAButtonOrange({
  title,
  subtitle,
  onPress,
  disabled = false,
  style,
  textStyle,
  gradientColors = [Colors.light.buttonOrangeGradientStart, Colors.light.buttonOrangeGradientEnd],
  icon,
}: CTAButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
      className="rounded-2xl overflow-hidden"
      style={[
        {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
          opacity: disabled ? 0.6 : 1,
          minHeight: 72,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        className="flex-1 px-5 flex-row items-center rounded-2xl"
      >
        {icon && <View className="mr-3">{icon}</View>}
        <View className="flex-1">
          <Text
            className="text-white text-2xl font-semibold"
            style={textStyle}
          >
            {title}
          </Text>
          {subtitle && (
            <Text className="text-white/80 text-xl">{subtitle}</Text>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function CTAButtonYellow({
  title,
  subtitle,
  onPress,
  disabled = false,
  style,
  textStyle,
  gradientColors = [Colors.light.buttonYellowGradientStart, Colors.light.buttonYellowGradientEnd],
  icon,
}: CTAButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
      className="rounded-2xl overflow-hidden"
      style={[
        {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
          opacity: disabled ? 0.6 : 1,
          minHeight: 72,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        className="flex-1 px-5 flex-row items-center rounded-2xl justify-center"
      >
        {icon && <View className="mr-3">{icon}</View>}
        <View className="flex-1">
          <Text
            className="text-white text-2xl font-semibold"
            style={textStyle}
          >
            {title}
          </Text>
          {subtitle && (
            <Text className="text-white/80 text-xl">{subtitle}</Text>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}
