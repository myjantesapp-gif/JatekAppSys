import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type ApiTarget = "local" | "prod";

export const TARGET_KEY = "jatek_driver_api_target";

const PROD_BASE = "https://ma.jatek.app/api";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
const LOCAL_BASE = DOMAIN ? `https://${DOMAIN}/api` : "/api";

const webStore = {
  getItemAsync: async (k: string): Promise<string | null> => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(k);
  },
  setItemAsync: async (k: string, v: string): Promise<void> => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(k, v);
  },
};

const store = Platform.OS === "web" ? webStore : SecureStore;

let cached: ApiTarget | null = null;

export async function getApiTarget(): Promise<ApiTarget> {
  if (cached) return cached;
  try {
    const stored = await store.getItemAsync(TARGET_KEY);
    cached = stored === "prod" ? "prod" : "local";
  } catch {
    cached = "local";
  }
  return cached;
}

export function getApiTargetSync(): ApiTarget {
  return cached ?? "local";
}

export async function setApiTarget(target: ApiTarget): Promise<void> {
  cached = target;
  await store.setItemAsync(TARGET_KEY, target);
}

export function getBaseUrl(target: ApiTarget): string {
  return target === "prod" ? PROD_BASE : LOCAL_BASE;
}

export const API_BASES = { local: LOCAL_BASE, prod: PROD_BASE };
