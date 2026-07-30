import React, { useState } from "react";
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/contexts/LanguageContext";
import { getApiBase } from "@/lib/api";

export default function NewQuoteScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { token } = useAuth();
  const { restaurantId, restaurantName } = useLocalSearchParams<{ restaurantId: string; restaurantName?: string }>();
  const rid = parseInt(restaurantId, 10);

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!token) {
      Alert.alert(t("cart_signin_required"), t("cart_signin_required_text"), [
        { text: t("cancel"), style: "cancel" },
        { text: t("cart_signin"), onPress: () => router.push("/(auth)/login") },
      ]);
      return;
    }
    if (subject.trim().length < 2 || description.trim().length < 2) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${getApiBase()}/api/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ restaurantId: rid, subject: subject.trim(), description: description.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t("quote_sent"), t("quote_sent_text"), [
        { text: t("ok"), onPress: () => router.back() },
      ]);
    } catch {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t("error"), "Could not send the request");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = subject.trim().length >= 2 && description.trim().length >= 2 && !submitting;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.foreground} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t("quote_request")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {restaurantName && (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{restaurantName}</Text>
        )}

        <Text style={[styles.label, { color: colors.foreground }]}>{t("quote_subject")}</Text>
        <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder={t("quote_subject_ph")}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground }]}
            maxLength={200}
          />
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>{t("quote_description")}</Text>
        <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border, minHeight: 160 }]}>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={t("quote_description_ph")}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, minHeight: 140, textAlignVertical: "top" }]}
            multiline
            maxLength={4000}
          />
        </View>
      </KeyboardAwareScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16), borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: canSubmit ? colors.primary : colors.muted }]}
          disabled={!canSubmit}
          onPress={submit}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="paper-plane" size={18} color={canSubmit ? "#fff" : colors.mutedForeground} />
              <Text style={[styles.submitText, { color: canSubmit ? "#fff" : colors.mutedForeground }]}>{t("quote_send")}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 16 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 8, marginTop: 4 },
  inputWrap: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  input: { fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 36 },
  footer: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 50, borderRadius: 14 },
  submitText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
