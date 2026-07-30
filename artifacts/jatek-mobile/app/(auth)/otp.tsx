import React, { useState, useRef, useEffect } from "react";
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
import { getApiBaseSafe } from "@/lib/apiBase";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useT } from "@/contexts/LanguageContext";

export default function OtpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { phone, demoOtp, channel } = useLocalSearchParams<{ phone: string; demoOtp: string; channel: string }>();
  const isWhatsApp = channel === "whatsapp";
  const { login } = useAuth();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [showNameStep, setShowNameStep] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [countdown, setCountdown] = useState(60);
  const refs = useRef<(TextInput | null)[]>([]);
  const verifyOtp = useVerifyOtp();
  const sendOtp = useSendOtp();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-fill demo OTP for testing (shown in dev mode / when no SMS provider configured)
  useEffect(() => {
    if (demoOtp && demoOtp.length === 6) {
      const filled = demoOtp.split("").slice(0, 6);
      setDigits(filled);
      // Auto-verify after 800ms so the user can see the filled code first
      const t = setTimeout(() => handleVerify(demoOtp), 800);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoOtp]);

  const code = digits.join("");

  const handleDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (clean.length > 1) {
      const newDigits = [...digits];
      for (let i = 0; i < 6 && index + i < 6; i++) newDigits[index + i] = clean[i] || "";
      setDigits(newDigits);
      const nextIdx = Math.min(index + clean.length, 5);
      refs.current[nextIdx]?.focus();
      if (newDigits.join("").length === 6) handleVerify(newDigits.join(""));
      return;
    }
    const newDigits = [...digits];
    newDigits[index] = clean;
    setDigits(newDigits);
    if (clean && index < 5) refs.current[index + 1]?.focus();
    if (newDigits.join("").length === 6) handleVerify(newDigits.join(""));
  };

  const handleKeyDown = (index: number, key: string) => {
    if (key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleVerify = (c = code) => {
    if (c.length < 6) return;
    setError("");
    verifyOtp.mutate({ data: { phone, code: c } }, {
      onSuccess: async (res) => {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if ((res as any).isNewUser) {
          setPendingToken(res.token);
          setPendingUser(res.user);
          setShowNameStep(true);
        } else {
          await login(res.token, res.user as any);
          router.replace("/(tabs)");
        }
      },
      onError: (err: any) => {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(err?.data?.error || t("otp_invalid"));
      },
    });
  };

  const handleSaveName = async () => {
    if (!pendingToken || !pendingUser) return;
    setError("");
    try {
      const baseUrl = getApiBaseSafe();
      const res = await fetch(`${baseUrl}/api/auth/update-name`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${pendingToken}` },
        body: JSON.stringify({ name: name.trim() || pendingUser.name }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setError((errJson as any)?.error || t("otp_invalid"));
        return;
      }
      const json = await res.json();
      await login(pendingToken, json.user ?? pendingUser);
      router.replace("/(tabs)");
    } catch {
      setError(t("otp_invalid"));
    }
  };

  const handleResend = () => {
    sendOtp.mutate({ data: { phone, channel } as any }, {
      onSuccess: () => {
        setCountdown(60);
        setDigits(["", "", "", "", "", ""]);
        setError("");
      },
    });
  };

  if (showNameStep) {
    return (
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.nameContainer, { paddingTop: insets.top + 40 }]}>
          <View style={[styles.successIcon, { backgroundColor: (colors as any).success + "20" || "#22C55E20" }]}>
            <Ionicons name="checkmark-circle" size={40} color={(colors as any).success || "#22C55E"} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>{t("otp_welcome")}</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>{t("otp_name_hint")}</Text>
          <TextInput
            style={[styles.nameInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder={t("otp_name_placeholder")}
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSaveName}
          />
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={handleSaveName}
            activeOpacity={0.8}
          >
            <Text style={styles.btnText}>{t("otp_start")}</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>

        {/* Channel badge */}
        <View style={[styles.channelBadge, { backgroundColor: isWhatsApp ? "#25D36618" : colors.primary + "15" }]}>
          <Ionicons
            name={isWhatsApp ? "logo-whatsapp" : "chatbubble-ellipses-outline"}
            size={16}
            color={isWhatsApp ? "#25D366" : colors.primary}
          />
          <Text style={[styles.channelBadgeText, { color: isWhatsApp ? "#25D366" : colors.primary }]}>
            {isWhatsApp ? t("otp_via_whatsapp") : t("otp_via_sms")}
          </Text>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>{t("otp_enter_code")}</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          {t("otp_sent_to")}{" "}
          <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>{phone}</Text>
        </Text>

        {demoOtp ? (
          <View style={[styles.demoBanner, { backgroundColor: colors.yellowSoft, borderColor: colors.yellow }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.yellowForeground} />
            <Text style={[styles.demoText, { color: colors.yellowForeground }]}>
              {t("otp_demo_code")}{" "}
              <Text style={{ fontFamily: "Inter_700Bold" }}>{demoOtp}</Text>
            </Text>
          </View>
        ) : null}

        <View style={styles.otpRow}>
          {digits.map((digit, i) => (
            <TextInput
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              style={[
                styles.otpBox,
                {
                  backgroundColor: colors.card,
                  borderColor: digit ? colors.primary : colors.border,
                  color: colors.foreground,
                },
              ]}
              value={digit}
              onChangeText={(v) => handleDigit(i, v)}
              onKeyPress={({ nativeEvent }) => handleKeyDown(i, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
            />
          ))}
        </View>

        {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}

        {verifyOtp.isPending && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>{t("otp_verifying")}</Text>
          </View>
        )}

        <View style={styles.resendRow}>
          {countdown > 0 ? (
            <Text style={[styles.countdownText, { color: colors.mutedForeground }]}>
              {t("otp_resend_in")}{" "}
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>{countdown}s</Text>
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
  nameContainer: { flex: 1, paddingHorizontal: 24, alignItems: "center", gap: 16 },
  back: { alignSelf: "flex-start", padding: 4, marginBottom: 16 },
  channelBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, marginBottom: 20,
  },
  channelBadgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8, marginBottom: 32 },
  demoBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
    marginBottom: 24, width: "100%",
  },
  demoText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  otpRow: { flexDirection: "row", gap: 8, marginBottom: 24, alignSelf: "stretch" },
  otpBox: {
    flex: 1, minWidth: 40, height: 56, borderRadius: 12, borderWidth: 2,
    fontSize: 22, fontFamily: "Inter_700Bold",
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 12 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  resendRow: { marginTop: 8 },
  countdownText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  resendBtn: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  nameInput: {
    width: "100%", height: 54, borderRadius: 14, borderWidth: 1.5,
    paddingHorizontal: 16, fontSize: 16, fontFamily: "Inter_400Regular",
  },
  btn: {
    width: "100%", height: 54, borderRadius: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: "#E2006A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  warning: { color: "#F59E0B" },
});
