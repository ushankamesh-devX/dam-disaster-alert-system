import { TEST_TOKEN, VIEWER_EMAIL, VIEWER_PASSWORD } from "@env";
import { tokenStorage } from "./token.storage";
import { axiosInstance } from "./axios.instance";
import { ENDPOINTS } from "./api.constants";

let authPromise: Promise<void> | null = null;

export async function ensureAuth(): Promise<void> {
  // Deduplicate concurrent calls
  if (authPromise) return authPromise;

  authPromise = (async () => {
    try {
      const existing = await tokenStorage.get();
      if (existing) return;

      if (TEST_TOKEN) {
        await tokenStorage.set(TEST_TOKEN);
        return;
      }

      const response = await axiosInstance.post(ENDPOINTS.AUTH.LOGIN, {
        email: VIEWER_EMAIL,
        password: VIEWER_PASSWORD,
      });

      const token: string =
        response.data?.token ??
        response.data?.data?.token ??
        response.data?.accessToken;

      if (token) {
        await tokenStorage.set(token);
      }
    } catch {
      // Silent — map will just show empty if auth fails
    } finally {
      authPromise = null;
    }
  })();

  return authPromise;
}
