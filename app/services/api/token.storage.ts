import * as SecureStore from "expo-secure-store";
import { Platform } from 'react-native';

// Deliberately excludes tokens from the former shared demo login.
const TOKEN_KEY = "user_session_v1";
// Browser previews keep a session only in memory; native apps use the OS store.
let browserToken: string | null = null;

export const tokenStorage = {
  get: () => Platform.OS === 'web' ? Promise.resolve(browserToken) : SecureStore.getItemAsync(TOKEN_KEY),
  set: (token: string) => Platform.OS === 'web' ? Promise.resolve(void (browserToken = token)) : SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: () => Platform.OS === 'web' ? Promise.resolve(void (browserToken = null)) : SecureStore.deleteItemAsync(TOKEN_KEY),
};
