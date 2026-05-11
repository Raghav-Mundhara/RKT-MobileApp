import axios from "axios";
import * as SecureStore from "expo-secure-store";

// Change this to your backend URL
const BASE_URL = "https://api.smoothride.store/api";

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
