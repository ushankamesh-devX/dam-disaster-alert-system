import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import '../global.css';
import 'react-native-reanimated';
import '../i18n/i18n'; // Initialize i18n

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { user, booting, restoreError, restore, logout } = useAuth();
  const ready = !!user?.preferredDamId && !!user?.onboardingCompletedAt;
  if (booting) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F7F8' }}><ActivityIndicator color="#455A64" /><Text style={{ marginTop: 16 }}>Opening FloodWatch…</Text></View>;
  if (restoreError) return <View style={{ flex: 1, justifyContent: 'center', padding: 32, gap: 20 }}><Text style={{ fontSize: 22, fontWeight: '700' }}>We couldn’t load your account</Text><Text>Check your connection and try again.</Text><Pressable onPress={() => void restore()}><Text style={{ color: '#0F766E', fontWeight: '700' }}>Try again</Text></Pressable><Pressable onPress={() => void logout()}><Text>Return to login</Text></Pressable></View>;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack key={user?.id ?? 'signed-out'} screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="auth" />
        </Stack.Protected>
        <Stack.Protected guard={!!user}>
          <Stack.Protected guard={ready}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack.Protected>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return <AuthProvider><RootNavigator /></AuthProvider>;
}
