import React, { useState } from "react";
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSendOtp } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CountryPickerModal } from "@/components/CountryPickerModal";
import { DEFAULT_COUNTRY, type Country } from "@/lib/countries";
import { useT } from "@/contexts/LanguageContext";

type Mode = "email" | "whatsapp";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const [mode, setMode] = useState<Mode>("email");

  // Email mode state
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  // WhatsApp mode state
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [showPicker, setShowPicker] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const sendOtp = useSendOtp();

  const switchMode = (next: Mode) => {
    setMode(next);
    setEmailError("");
    setPhoneError("");
    if (Platform.OS !== "web") Haptics.selectionAsync();
  };

  // ── Email OTP ──────────────────────────────────────────────────────────────
  const handleEmailContinue = () => {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError(t("login_email_error"));
      return;
    }
    setEmailError("");
    sendOtp.mutate({ data: { email: trimmed } as any }, {
      onSuccess: (res: any) => {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push({
          pathname: "/(auth)/otp",
          params: {
            email: trimmed,
            demoOtp: res?.demoOtp ?? "",
            channel: res?.channel ?? "resend-email",
          },
        });
      },
      onError: (err: any) => {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setEmailError(err?.data?.error || t("login_send_fail"));
      },
    });
  };

  // ── WhatsApp OTP ───────────────────────────────────────────────────────────
  const fullPhone = `${country.dialCode}${phone.replace(/^0+/, "").replace(/\s/g, "")}`;

  const handleWhatsAppContinue = () => {
    const local = phone.trim().replace(/\s/g, "");
    if (local.length < 5) {
      setPhoneError(t("login_phone_error"));
      return;
    }
    setPhoneError("");
    sendOtp.mutate({ data: { phone: fullPhone } as any }, {
      onSuccess: (res: any) => {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push({
          pathname: "/(auth)/otp",
          params: {
            phone: fullPhone,
            demoOtp: res?.demoOtp ?? "",
            channel: res?.channel ?? "twilio-whatsapp",
          },
        });
      },
      onError: (err: any) => {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setPhoneError(err?.data?.error || t("login_send_fail"));
      },
    });
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync();
              if (router.canGoBack()) router.back();
              else router.replace("/(auth)/welcome");
            }}
            style={[styles.backBtn, { backgroundColor: colors.muted }]}
            hitSlop={10}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>

          {/* Logo */}
          <View style={[styles.logoWrap, { backgroundColor: colors.card }]}>
            <Image
              source={require("../../assets/images/jatek-logo.png")}
              style={{ width: 56, height: 56 }}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.brand, { color: colors.heading, fontStyle: "italic", letterSpacing: -1 }]}>
            Jatek.
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {t("login_subtitle")}
          </Text>

          <View style={styles.form}>
            {mode === "email" ? (
              /* ── EMAIL MODE ─────────────────────────────────────────────── */
              <>
                {/* Email badge */}
                <View style={[styles.channelBadge, { backgroundColor: colors.primary + "15" }]}>
                  <Ionicons name="mail-outline" size={16} color={colors.primary} />
                  <Text style={[styles.channelBadgeText, { color: colors.primary }]}>
                    {t("login_hint_email")}
                  </Text>
                </View>

                <Text style={[styles.label, { color: colors.foreground }]}>
                  {t("login_email_label")}
                </Text>
                <View style={[
                  styles.inputRow,
                  { backgroundColor: colors.card, borderColor: emailError ? colors.destructive : colors.border },
                ]}>
                  <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} style={{ paddingLeft: 14 }} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="vous@exemple.com"
                    placeholderTextColor={colors.mutedForeground}
                    value={email}
                    onChangeText={(v) => { setEmail(v); setEmailError(""); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleEmailContinue}
                  />
                </View>

                {emailError ? (
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{emailError}</Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.primary, opacity: sendOtp.isPending ? 0.7 : 1 }]}
                  onPress={handleEmailContinue}
                  disabled={sendOtp.isPending}
                  activeOpacity={0.8}
                >
                  {sendOtp.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="mail-outline" size={20} color="#fff" />
                      <Text style={styles.btnText}>{t("login_send_email_otp")}</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>

                {/* Switch to WhatsApp */}
                <TouchableOpacity
                  onPress={() => switchMode("whatsapp")}
                  style={styles.switchRow}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-whatsapp" size={16} color={"#25D366"} />
                  <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
                    {t("login_switch_to_whatsapp")}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              /* ── WHATSAPP MODE ──────────────────────────────────────────── */
              <>
                {/* WhatsApp badge */}
                <View style={[styles.channelBadge, { backgroundColor: "#25D36618" }]}>
                  <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                  <Text style={[styles.channelBadgeText, { color: "#25D366" }]}>
                    {t("login_hint_whatsapp")}
                  </Text>
                </View>

                <Text style={[styles.label, { color: colors.foreground }]}>
                  {t("login_phone_label")}
                </Text>
                <View style={[
                  styles.inputRow,
                  { backgroundColor: colors.card, borderColor: phoneError ? colors.destructive : colors.border },
                ]}>
                  <TouchableOpacity
                    style={[styles.dialCodeBtn, { borderRightColor: colors.border }]}
                    onPress={() => setShowPicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dialCodeText, { color: colors.foreground }]}>{country.dialCode}</Text>
                    <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="6 12 34 56 78"
                    placeholderTextColor={colors.mutedForeground}
                    value={phone}
                    onChangeText={(v) => { setPhone(v); setPhoneError(""); }}
                    keyboardType="phone-pad"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleWhatsAppContinue}
                  />
                </View>

                {phoneError ? (
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{phoneError}</Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: "#25D366", opacity: sendOtp.isPending ? 0.7 : 1 }]}
                  onPress={handleWhatsAppContinue}
                  disabled={sendOtp.isPending}
                  activeOpacity={0.8}
                >
                  {sendOtp.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                      <Text style={styles.btnText}>{t("login_send_whatsapp")}</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>

                {/* Switch back to email */}
                <TouchableOpacity
                  onPress={() => switchMode("email")}
                  style={styles.switchRow}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mail-outline" size={16} color={colors.primary} />
                  <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
                    {t("login_switch_to_email")}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>

        <CountryPickerModal
          visible={showPicker}
          selected={country}
          onSelect={setCountry}
          onClose={() => setShowPicker(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: "center",
  },
  backBtn: {
    position: "absolute",
    top: 12,
    left: 16,
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    zIndex: 10,
  },
  logoWrap: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#E2006A", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  brand: {
    fontSize: 32, fontFamily: "Inter_700Bold", marginTop: 16, letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4, marginBottom: 36,
  },
  form: { width: "100%", gap: 10 },
  label: { fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 2 },
  channelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  channelBadgeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    flexShrink: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    height: 54,
    overflow: "hidden",
  },
  dialCodeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    height: "100%",
    borderRightWidth: 1,
  },
  dialCodeText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 14,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  btn: {
    height: 54, borderRadius: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  switchText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textDecorationLine: "underline",
  },
});
