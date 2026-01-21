/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    // Primary Colors
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    
    // Header & Navigation
    headerBackground: '#455A64',
    headerText: '#fff',
    
    // Tab Bar
    tabBarBackground: '#fff',
    tabBarBorder: '#E5E7EB',
    tabIconActive: '#374151',
    tabIconInactive: '#6B7280',
    
    // Text Variants
    textLight: '#D1D5DB',
    textMedium: '#6B7280',
    textDark: '#374151',
    textGrayLight: '#D1D5DB',
    textGrayMedium: '#4B5563',
    
    // Danger/Alert Backgrounds
    dangerBackground: '#5D2E2E',
    dangerBorder: '#7D3E3E',
    dangerDivider: '#8B4513',
    
    // Status & Indicators
    neutral: '#A0522D',
    success: '#9ACD32',
    warning: '#E67E22',
    
    // Button Gradients
    buttonGradientStart: '#9BA854',
    buttonGradientEnd: '#6B7A3D',
    
    // Orange Button Gradient
    buttonOrangeGradientStart: '#C97B4B',
    buttonOrangeGradientEnd: '#A85D35',
    
    // Yellow-Green Button Gradient
    buttonYellowGradientStart: '#C4C948',
    buttonYellowGradientEnd: '#8BA834',
  },
  dark: {
    // Primary Colors
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    
    // Header & Navigation
    headerBackground: '#1F2937',
    headerText: '#F3F4F6',
    
    // Tab Bar
    tabBarBackground: '#111827',
    tabBarBorder: '#374151',
    tabIconActive: '#D1D5DB',
    tabIconInactive: '#9CA3AF',
    
    // Text Variants
    textLight: '#374151',
    textMedium: '#9CA3AF',
    textDark: '#D1D5DB',
    textGrayLight: '#374151',
    textGrayMedium: '#9CA3AF',
    
    // Danger/Alert Backgrounds
    dangerBackground: '#7D3E3E',
    dangerBorder: '#9D5E5E',
    dangerDivider: '#AB6B3E',
    
    // Status & Indicators
    neutral: '#C0723D',
    success: '#B8D632',
    warning: '#F59E0B',
    
    // Button Gradients
    buttonGradientStart: '#A8B85A',
    buttonGradientEnd: '#7A8A47',
    
    // Orange Button Gradient
    buttonOrangeGradientStart: '#D98B5B',
    buttonOrangeGradientEnd: '#B86D45',
    
    // Yellow-Green Button Gradient
    buttonYellowGradientStart: '#D4D958',
    buttonYellowGradientEnd: '#9BB844',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
