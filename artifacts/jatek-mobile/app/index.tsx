import React from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function Index() {
  const { token, user, isLoading } = useAuth();
  const colors = useColors();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!token) return <Redirect href="/(auth)/welcome" />;

  // Route by role so drivers and merchants land on their dashboard
  const role = user?.role;
  if (role === "driver") return <Redirect href="/(tabs)/deliver" />;
  if (role === "restaurant_owner" || role === "owner") return <Redirect href="/(tabs)/manage" />;
  return <Redirect href="/(tabs)" />;
}
