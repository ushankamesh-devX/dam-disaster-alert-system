import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme'; // Assuming this exists, otherwise I'll fallback to hardcoded colors

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const isEmergency = route.name === 'emergency';
        const color = isFocused ? '#374151' : '#6B7280'; // Dark gray for active, lighter gray for inactive

        if (isEmergency) {
          return (
            <View key={route.key} style={styles.emergencyContainer}>
               <View style={styles.emergencyButtonWrapper}>
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityState={isFocused ? { selected: true } : {}}
                    accessibilityLabel={options.tabBarAccessibilityLabel}
                    testID={options.tabBarTestID}
                    onPress={onPress}
                    onLongPress={onLongPress}
                    style={styles.emergencyButton}
                >
                    <MaterialCommunityIcons name="alarm-light-outline" size={32} color="#374151" />
                    <Text style={styles.emergencyText}>Emergency{'\n'}Contact</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }

        let iconName: any = 'circle';
        if (route.name === 'index') iconName = 'view-dashboard-outline';
        else if (route.name === 'news') iconName = 'rss';
        else if (route.name === 'alerts') iconName = 'bell-outline';
        else if (route.name === 'report') iconName = 'message-alert-outline';

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
          >
            <MaterialCommunityIcons name={iconName} size={28} color={color} />
            <Text style={{ color: color, fontSize: 12, marginTop: 4 }}>
              {label as string}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    height: 80, // Increased height to accommodate the curve
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  emergencyContainer: {
    width: 100, // Width of the cutout area
    height: 100, // Height to allow button to float up
    alignItems: 'center',
    justifyContent: 'flex-end', // Align to bottom so it sits on the bar
    marginBottom: 30, // Push it up
    zIndex: 10,
  },
  emergencyButtonWrapper: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: 'white',
      alignItems: 'center',
      justifyContent: 'center',
      // Shadow for the floating effect
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: -2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 5,
      borderWidth: 1,
      borderColor: '#E5E7EB',
  },
  emergencyButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  emergencyText: {
      fontSize: 10,
      color: '#374151',
      textAlign: 'center',
      marginTop: 2,
      lineHeight: 12
  }
});
