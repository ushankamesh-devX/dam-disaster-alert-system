import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userService } from '../users/user.service';

const SAVED_PUSH_TOKEN_KEY = 'ddas_fcm_push_token';

// Safely configure notification handler
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  console.log('[PUSH] setNotificationHandler not supported in current environment');
}

/**
 * Register for push notifications with full error suppression for Expo Go development mode.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;
  try {
    // 1. Android notification channel (catch specifically in Expo Go)
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#DC2626',
        });
      } catch (channelErr) {
        console.log('[PUSH] Notification channels not supported in Expo Go development mode');
      }
    }

    // 2. Request user permissions safely
    try {
      const existing = (await Notifications.getPermissionsAsync()) as any;
      let isGranted = Boolean(existing?.granted || existing?.status === 'granted');
      if (!isGranted) {
        const requested = (await Notifications.requestPermissionsAsync()) as any;
        isGranted = Boolean(requested?.granted || requested?.status === 'granted');
      }

      if (!isGranted) {
        console.log('[PUSH] Notification permissions were not granted by the user.');
        return null;
      }
    } catch (permErr) {
      console.log('[PUSH] Permissions check skipped in Expo Go');
    }

    // 3. Obtain FCM device push token or Expo push token
    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      token = String(tokenData.data);
      console.log('[PUSH] Retrieved native device FCM token:', token);
    } catch (deviceTokenErr) {
      try {
        const expoTokenData = await Notifications.getExpoPushTokenAsync();
        token = expoTokenData.data;
        console.log('[PUSH] Retrieved Expo push token:', token);
      } catch (expoErr) {
        console.log('Push notifications not supported in Expo Go development mode.');
        const storedToken = await AsyncStorage.getItem(SAVED_PUSH_TOKEN_KEY);
        token = storedToken || `fcm_dev_${Platform.OS}_${Date.now()}`;
      }
    }

    // 4. Save and sync token with Spring Boot API
    if (token) {
      await AsyncStorage.setItem(SAVED_PUSH_TOKEN_KEY, token);
      try {
        await userService.updatePushToken(token);
        console.log('[PUSH] Push token synced with backend database.');
      } catch (apiErr) {
        console.log('[PUSH] Backend token update deferred (user not yet authenticated).');
      }
    }

    return token;
  } catch (error) {
    console.log('Push notifications not supported in Expo Go development mode.');
    return null; // Error එක යෙදුම කඩාවැටීමට නොදී නවතයි
  }
}

export const pushNotificationService = {
  registerForPushNotifications: registerForPushNotificationsAsync,
  registerForPushNotificationsAsync,

  /**
   * Listen for incoming notifications when app is foreground or background
   */
  addNotificationListeners: (onNotificationReceived?: (notification: Notifications.Notification) => void) => {
    try {
      const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
        console.log('[PUSH] Notification received in app:', notification.request.content);
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      });

      const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('[PUSH] User tapped notification:', response.notification.request.content);
      });

      return () => {
        receivedSubscription.remove();
        responseSubscription.remove();
      };
    } catch (listenerErr) {
      console.log('[PUSH] Notification listeners not supported in Expo Go mode');
      return () => {};
    }
  },
};
