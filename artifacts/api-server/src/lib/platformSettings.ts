import { db, platformSettingsTable } from "@workspace/db";

export const DEFAULT_PLATFORM_SETTINGS = {
  appName: "Jatek",
  supportEmail: "support@jatek.ma",
  supportPhone: "+212600000000",
  defaultDeliveryFee: "15",
  freeDeliveryThreshold: "150",
  maxDeliveryRadiusKm: "10",
  minOrderAmount: "30",
  taxRate: "0.20",
  driverCommissionRate: "0.15",
  defaultLatitude: "34.6814",
  defaultLongitude: "-1.9078",
  orderNotificationsEnabled: true,
  maintenanceMode: false,
  city: "Oujda",
  currency: "MAD",
} as const;

export type PlatformSettings = Record<string, unknown>;

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const [row] = await db.select().from(platformSettingsTable).limit(1);
  return {
    ...DEFAULT_PLATFORM_SETTINGS,
    ...((row?.data as PlatformSettings | undefined) ?? {}),
  };
}

export async function getPlatformSettingNumber(key: string, fallback: number): Promise<number> {
  try {
    const settings = await getPlatformSettings();
    const value = Number(settings[key]);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export async function getDefaultCoordinates(): Promise<{ latitude: number; longitude: number }> {
  const settings = await getPlatformSettings();
  const latitude = Number(settings.defaultLatitude);
  const longitude = Number(settings.defaultLongitude);
  return {
    latitude: Number.isFinite(latitude) ? latitude : Number(DEFAULT_PLATFORM_SETTINGS.defaultLatitude),
    longitude: Number.isFinite(longitude) ? longitude : Number(DEFAULT_PLATFORM_SETTINGS.defaultLongitude),
  };
}