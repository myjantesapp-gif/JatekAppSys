import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useVerifyOtp, useSendOtp } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useT } from "@/contexts/LanguageContext";

export default function OtpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const params = useLocalSearchParams<{
    phone?: string;
    email?: string;
    demoOtp?: string;
    channel?: string;
    intent?: string;
  }>();
  const identifier = params.email || params.phone || "";
  const isEmailMode = !!params.email && !params.phone;
  const isWhatsApp = !isEmailMode;
  const { login } = useAuth();

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);
  const refs = useRef<(TextInput | null)[]>([]);
  const verifyOtp = useVerifyOtp();
  const sendOtp = useSendOtp();

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (params.demoOtp && params.demoOtp.length === 6) {
      setDigits(params.demoOtp.split("").slice(0, 6));
    }
  }, [params.demoOtp]);

  const code = digits.join("");

  const handleVerify = (c = code) => {
    if (c.length < 6) return;
    setError("");

    const payload: any = isEmailMode
      ? { email: identifier, code: c }
      : { phone: identifier, code: c, intent: params.intent ?? "login" };

    verifyOtp.mutate({ data: payload }, {
      onSuccess: async (res: any) => {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await login(res.token, res.user);
        router.replace("/(tabs)");
      },
      onError: (err: any) => {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const msg = err?.data?.error || t("otp_invalid");
        // If no account found, guide to register
        const isNotFound = err?.status === 404 || msg?.toLowerCase().includes("introuvable") || msg?.toLowerCase().includes("aucun compte");
        setError(isNotFound
          ? "Aucun compte trouvé pour ce numéro. Inscrivez-vous d'abord."
          : msg
        );
      },
    });
  };

  const handleDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    const next = [...digits];
    if (clean.length > 1) {
      clean.slice(0, 6 - index).split("").forEach((d, i) => { next[index + i] = d; });
      refs.current[Math.min(index + clean.length, 5)]?.focus();
    } else {
      next[index] = clean;
      if (clean && index < 5) refs.current[index + 1]?.focus();
    }
    setDigits(next);
    // Auto-verify on last digit for WhatsApp (no extra fields needed)
    if (next.join("").length === 6) handleVerify(next.join(""));
  };

  const handleResend = () => {
    if (!identifier) return;
    sendOtp.mutate({ data: (isEmailMode ? { email: identifier } : { phone: identifier }) as any }, {
      onSuccess: (res: any) => {
        setCountdown(60);
        setDigits(res?.demoOtp?.length === 6 ? res.demoOtp.split("") : ["", "", "", "", "", ""]);
        setError("");
      },
      onError: (err: any) => setError(err?.data?.error || t("login_send_fail")),
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>

        <View style={[styles.channelBadge, { backgroundColor: isWhatsApp ? "#25D36618" : colors.primary + "15" }]}>
          <Ionicons
            name={isWhatsApp ? "logo-whatsapp" : "mail-outline"}
            size={16}
            color={isWhatsApp ? "#25D366" : colors.primary}
          />
          <Text style={[styles.channelBadgeText, { color: isWhatsApp ? "#25D366" : colors.primary }]}>
            {isWhatsApp ? "Connexion via WhatsApp" : t("otp_via_whatsapp")}
          </Text>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>{t("otp_enter_code")}</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          {t("otp_sent_to")}{" "}
          <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>{identifier}</Text>
        </Text>

        {params.demoOtp ? (
          <View style={[styles.demoBanner, { backgroundColor: colors.yellowSoft, borderColor: colors.yellow }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.yellowForeground} />
            <Text style={[styles.demoText, { color: colors.yellowForeground }]}>
              {t("otp_demo_code")} <Text style={{ fontFamily: "Inter_700Bold" }}>{params.demoOtp}</Text>
            </Text>
          </View>
        ) : null}

        <View style={styles.otpRow}>
          {digits.map((digit, i) => (
            <TextInput
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              style={[styles.otpBox, {
                backgroundColor: colors.card,
                borderColor: digit ? colors.primary : colors.border,
                color: colors.foreground,
              }]}
              value={digit}
              onChangeText={(v) => handleDigit(i, v)}
              onKeyPress={({ nativeEvent }) =>
                nativeEvent.key === "Backspace" && !digits[i] && i > 0 && refs.current[i - 1]?.focus()
              }
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
            />
          ))}
        </View>

        {error ? (
          <View style={{ width: "100%", gap: 8 }}>
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            {(error.includes("Inscrivez") || error.includes("inscrivez")) && (
              <TouchableOpacity
                onPress={() => router.replace("/(auth)/register")}
                style={[styles.registerBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <Ionicons name="person-add-outline" size={18} color="#fff" />
                <Text style={styles.registerBtnText}>Créer un compte</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {verifyOtp.isPending && <ActivityIndicator color={colors.primary} style={{ marginBottom: 14 }} />}

        <View style={styles.resendRow}>
          {countdown > 0 ? (
            <Text style={[styles.countdownText, { color: colors.mutedForeground }]}>
              {t("otp_resend_in")} <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>{countdown}s</Text>
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={sendOtp.isPending}>
              <Text style={[styles.resendBtn, { color: colors.primary }]}>
                {sendOtp.isPending ? t("otp_sending") : t("otp_resend")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24, alignItems: "center" },
  back: { alignSelf: "flex-start", padding: 4, marginBottom: 16 },
  channelBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, marginBottom: 20 },
  channelBadgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8, marginBottom: 24 },
  demoBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginBottom: 20, width: "100%" },
  demoText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  otpRow: { flexDirection: "row", gap: 8, marginBottom: 20, alignSelf: "stretch" },
  otpBox: { flex: 1, minWidth: 40, height: 56, borderRadius: 12, borderWidth: 2, fontSize: 22, fontFamily: "Inter_700Bold" },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 12 },
  registerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 14, marginTop: 8 },
  registerBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  resendRow: { marginTop: 20 },
  countdownText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  resendBtn: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
