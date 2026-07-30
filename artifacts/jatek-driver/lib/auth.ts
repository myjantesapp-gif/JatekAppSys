import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const TOKEN_KEY = "jatek_driver_token";

const webStore = {
  getItemAsync: async (k: string): Promise<string | null> => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(k);
  },
  setItemAsync: async (k: string, v: string): Promise<void> => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(k, v);
  },
  deleteItemAsync: async (k: string): Promise<void> => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(k);
  },
};

const store = Platform.OS === "web" ? webStore : SecureStore;

export async function getToken(): Promise<string | null> {
  try {
    return await store.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await store.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await store.deleteItemAsync(TOKEN_KEY);
}
