import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "jatek_favorites_v1";

export async function getFavoriteIds(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as number[];
  } catch {
    return [];
  }
}

export async function addFavorite(restaurantId: number): Promise<void> {
  const ids = await getFavoriteIds();
  if (!ids.includes(restaurantId)) {
    ids.push(restaurantId);
    await AsyncStorage.setItem(KEY, JSON.stringify(ids));
  }
}

export async function removeFavorite(restaurantId: number): Promise<void> {
  const ids = await getFavoriteIds();
  const next = ids.filter((id) => id !== restaurantId);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function toggleFavorite(restaurantId: number): Promise<boolean> {
  const ids = await getFavoriteIds();
  if (ids.includes(restaurantId)) {
    await AsyncStorage.setItem(KEY, JSON.stringify(ids.filter((id) => id !== restaurantId)));
    return false;
  } else {
    await AsyncStorage.setItem(KEY, JSON.stringify([...ids, restaurantId]));
    return true;
  }
}
