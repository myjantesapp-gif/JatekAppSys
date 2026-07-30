import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";

export default function OnboardingLayout() {
  const colors = useColors();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
  );
}
