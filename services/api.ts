import axios from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";

// ─── Resolve Base URL ────────────────────────────────────

function getBaseUrl(): string {
  // 1. Always prefer an explicit env var (set this in eas.json for each profile)
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }

  // 2. Dev only: dynamically resolve LAN IP from Expo Go runtime
  if (__DEV__) {
    if (Platform.OS === "android") {
      const debuggerHost =
        (Constants.manifest2 as any)?.extra?.expoGo?.debuggerHost?.split(":")[0] ||
        (Constants.expoConfig as any)?.hostUri?.split(":")[0];

      if (debuggerHost) return `http://${debuggerHost}:5000/api`;
      return "http://10.0.2.2:5000/api"; // emulator fallback
    }
    return "http://localhost:5000/api"; // iOS simulator
  }

  // 3. Prod build with no env var — fail loudly at startup
  throw new Error(
    "EXPO_PUBLIC_BACKEND_URL is not set. Add it to your eas.json env config."
  );
}

const BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

let currentToken: string | null = null;
let logoutCallback: (() => void) | null = null;

export const setApiConfig = (token: string | null, onLogout?: () => void) => {
  currentToken = token;
  if (onLogout) logoutCallback = onLogout;
};

// ─── Request Interceptor: Attach JWT ────────────────────

api.interceptors.request.use(
  (config) => {
    if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Handle 401 ───────────────────

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (logoutCallback) logoutCallback();
    }
    return Promise.reject(error);
  }
);

export default api;
