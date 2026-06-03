import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import api, { setApiConfig } from "../services/api";
import { User, LoginResponse } from "../types";

const isWeb = Platform.OS === "web" || (typeof window !== "undefined" && typeof window.localStorage !== "undefined");

const safeDeleteSecret = async (key: string) => {
  if (isWeb) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn("localStorage deletion failed:", e);
    }
  } else {
    try {
      if (SecureStore && typeof SecureStore.deleteItemAsync === "function") {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (e) {
      console.warn("SecureStore deletion failed:", e);
    }
  }
};

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (phone, password) => {
    const { data } = await api.post<LoginResponse>("/auth/login", {
      phone,
      password,
    });
    // Don't persist token/user to SECURESTORE so that session expires on app close.
    // Memory state maintains session.

    setApiConfig(data.token, () => {
      // Auto logout trigger
      get().logout();
    });

    set({
      user: data.user,
      token: data.token,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    setApiConfig(null);
    await safeDeleteSecret("token");
    await safeDeleteSecret("user");
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  loadFromStorage: async () => {
    // We clear any existing old session to enforce auto-logout on fresh app starts
    await safeDeleteSecret("token");
    await safeDeleteSecret("user");
    setApiConfig(null);
    set({ isLoading: false });
  },
}));
