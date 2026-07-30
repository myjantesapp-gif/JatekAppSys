import React, { ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView, KeyboardAvoidingView } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface Props {
  title: string;
  children: ReactNode;
  /** When true, content is wrapped in a ScrollView (default true). */
  scroll?: boolean;
  /** Right-side action button rendered in the header. */
  headerRight?: ReactNode;
  /** Disable keyboard avoidance (used for screens with their own form handling). */
  noKeyboardAvoid?: boolean;
}

export default function ProfileScreenLayout({ title, children, scroll = true, headerRight, noKeyboardAvoid }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const webTopPad = Platform.OS === "web" ? 67 : 0;

  const Body = (
    <>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 12 + webTopPad, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            try {
              if (router.canGoBack()) { router.back(); }
              else { router.replace("/(tabs)/profile" as any); }
            } catch {
              router.replace("/(tabs)/profile" as any);
            }
          }}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={26} color={colors.heading} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.heading }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerRight}>{headerRight}</View>
      </View>
      {scroll ? (
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.background }}>{children}</View>
      )}
    </>
  );

  if (noKeyboardAvoid || Platform.OS === "web") {
    return <View style={{ flex: 1, backgroundColor: colors.background }}>{Body}</View>;
  }
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {Body}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center", marginRight: 36 },
  headerRight: { position: "absolute", right: 12, top: undefined, height: 36, alignItems: "center", justifyContent: "center", flexDirection: "row" },
});
