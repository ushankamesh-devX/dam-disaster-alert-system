import { axiosInstance, ENDPOINTS, tokenStorage } from "../api";
import type { UserProfile } from '@/models/user';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthResult { success: boolean; data: { token: string; user: UserProfile } }

async function authenticate(path: string, data: LoginPayload | RegisterPayload) {
  const response = await axiosInstance.post<AuthResult>(path, data);
  const token = response.data.data?.token;
  if (!token || !response.data.data.user) throw new Error('The server returned an incomplete sign-in response.');
  await tokenStorage.set(token);
  try {
    await AsyncStorage.setItem('token', token);
  } catch (err) {
    console.log('[AUTH] Token storage sync warning:', err);
  }
  return response;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  languagePreference?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  register: (data: RegisterPayload) =>
    authenticate(ENDPOINTS.AUTH.REGISTER, data),

  login: (data: LoginPayload) => authenticate(ENDPOINTS.AUTH.LOGIN, data),

  logout: async () => {
    await tokenStorage.clear();
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('userRole');
    } catch (err) {
      console.log('[AUTH] Storage clear warning:', err);
    }
  },

  test: () => axiosInstance.get(ENDPOINTS.AUTH.TEST),
};
