import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useAlerts } from '@/components/alerts/AlertsContext';

const icons: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  index: 'view-dashboard-outline',
  news: 'rss',
  emergency: 'alarm-light-outline',
  alerts: 'bell-outline',
  report: 'message-alert-outline',
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { unseen } = useAlerts();

  return (
    <View style={[styles.container, {
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    }]}>
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          if (route.name === 'hazard-map') return null;
          const { options } = descriptors[route.key];
          const label = typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title ?? route.name;
          const isFocused = state.index === index;
          const isEmergency = route.name === 'emergency';
          const color = isFocused ? Colors.light.tabIconActive : Colors.light.tabIconInactive;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? options.title ?? label}
              testID={options.tabBarButtonTestID}
              activeOpacity={0.7}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={styles.tabItem}
            >
              <View style={styles.iconSlot}>
                <View style={[
                  styles.iconBackground,
                  isFocused && styles.selectedIcon,
                  isEmergency && styles.emergencyIcon,
                ]}>
                  <MaterialCommunityIcons name={icons[route.name] ?? 'circle-outline'} size={isEmergency ? 28 : 25} color={isEmergency ? '#DC2626' : color} />
                  {route.name === 'alerts' && unseen > 0 && (
                    <View style={styles.badge}><Text style={styles.badgeText}>{unseen > 9 ? '9+' : unseen}</Text></View>
                  )}
                </View>
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                maxFontSizeMultiplier={1.3}
                style={[styles.label, { color }, isFocused && styles.selectedLabel]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.tabBarBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.tabBarBorder,
  },
  row: { flexDirection: 'row', height: 80, alignItems: 'center' },
  tabItem: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    paddingHorizontal: 2,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlot: { height: 42, width: '100%', alignItems: 'center', justifyContent: 'center' },
  iconBackground: { width: 48, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  selectedIcon: { backgroundColor: Colors.light.tabBarBorder },
  emergencyIcon: {
    position: 'absolute',
    bottom: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.tabBarBackground,
    borderWidth: 1,
    borderColor: Colors.light.tabBarBorder,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  label: { width: '100%', marginTop: 4, fontSize: 11, lineHeight: 15, textAlign: 'center' },
  selectedLabel: { fontWeight: '700' },
  badge: {
    position: 'absolute', top: -2, right: 2, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 2, borderColor: 'white',
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
});
