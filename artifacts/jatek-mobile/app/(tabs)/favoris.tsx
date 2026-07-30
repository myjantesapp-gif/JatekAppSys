import { Redirect } from "expo-router";

// Reuses the existing favorites screen — design refresh will follow.
export default function FavorisTab() {
  return <Redirect href="/profile/favorites" />;
}
