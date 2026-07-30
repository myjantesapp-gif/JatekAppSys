import React, { useState } from "react";
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Image,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSendOtp, useLogin, useRegister } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CountryPickerModal } from "@/components/CountryPickerModal";
import { DEFAULT_COUNTRY, type Country } from "@/lib/countries";
import { useT } from "@/contexts/LanguageContext";
import { useAuth, type AuthUser } from "@/contexts/AuthContext";

type Mode = "phone" | "email";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { login: persistLogin } = useAuth();
  const [mode, setMode] = useState<Mode>("phone");
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [showPicker, setShowPicker] = useState(false);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const sendOtp = useSendOtp();

  // Email mode state
  const [emailIsRegister, setEmailIsRegister] = useState(false);
  const [emailName, setEmailName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const loginMut = useLogin();
  const registerMut = useRegister();
  const emailBusy = loginMut.isPending || registerMut.isPending;

  const handleEmailSubmit = () => {
    setError("");
    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Adresse email invalide.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (emailIsRegister && emailName.trim().length < 2) {
      setError("Indiquez votre prénom.");
      return;
    }
    const onAuthSuccess = async (res: any) => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const user = res?.user as AuthUser | undefined;
      const token = res?.token as string | undefined;
      if (token && user) {
        await persistLogin(token, user);
        router.replace("/(tabs)");
      } else {
        setError("Réponse inattendue du serveur.");
      }
    };
    const onAuthError = (err: any) => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err?.data?.error || err?.message || "Échec de l'authentification.";
      setError(msg);
    };
    if (emailIsRegister) {
      registerMut.mutate(
        { data: { name: emailName.trim(), email: trimmedEmail, password, role: "customer" } as any },
        { onSuccess: onAuthSuccess, onError: onAuthError },
      );
    } else {
      loginMut.mutate(
        { data: { email: trimmedEmail, password } as any },
        { onSuccess: onAuthSuccess, onError: onAuthError },
      );
    }
  };

  const fullPhone = `${country.dialCode}${phone.replace(/^0+/, "").replace(/\s/g, "")}`;

  const handleContinue = () => {
    const local = phone.trim().replace(/\s/g, "");
    if (local.length < 5) {
      setError(t("login_phone_error"));
      return;
    }
    setError("");
    sendOtp.mutate({ data: { phone: fullPhone, channel: "sms" } as any }, {
      onSuccess: (res) => {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push({
          pathname: "/(auth)/otp",
          params: { phone: fullPhone, demoOtp: (res as any).demoOtp ?? "", channel: "sms" },
        });
      },
      onError: (err: any) => {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(err?.data?.error || t("login_send_fail"));
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button (top-left) */}
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

        {/* Logo on a neutral card background */}
        <View style={[styles.logoWrap, { backgroundColor: colors.card }]}>
          <Image source={require("../../assets/images/jatek-logo.png")} style={{ width: 56, height: 56 }} resizeMode="contain" />
        </View>
        <Text style={[styles.brand, { color: colors.heading, fontStyle: "italic", letterSpacing: -1 }]}>Jatek.</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {t("login_subtitle")}
        </Text>

        <View style={styles.form}>
          {/* Mode selector — phone vs email */}
          <View style={[styles.modeRow, { backgroundColor: colors.muted, borderRadius: 14 }]}>
            <TouchableOpacity
              style={[
                styles.modeBtn,
                mode === "phone" && { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
              ]}
              onPress={() => { setMode("phone"); setError(""); }}
              activeOpacity={0.8}
            >
              <Ionicons name="call-outline" size={18} color={mode === "phone" ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.modeLabel, { color: mode === "phone" ? colors.foreground : colors.mutedForeground }]}>Téléphone</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeBtn,
                mode === "email" && { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
              ]}
              onPress={() => { setMode("email"); setError(""); }}
              activeOpacity={0.8}
            >
              <Ionicons name="mail-outline" size={18} color={mode === "email" ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.modeLabel, { color: mode === "email" ? colors.foreground : colors.mutedForeground }]}>Email</Text>
            </TouchableOpacity>
          </View>

          {mode === "email" ? (
            <View style={{ gap: 10 }}>
              {emailIsRegister && (
                <>
                  <Text style={[styles.label, { color: colors.foreground }]}>Prénom</Text>
                  <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="person-outline" size={18} color={colors.mutedForeground} style={{ paddingLeft: 14 }} />
                    <TextInput
                      style={[styles.input, { color: colors.foreground }]}
                      placeholder="Salah"
                      placeholderTextColor={colors.mutedForeground}
                      value={emailName}
                      onChangeText={(v) => { setEmailName(v); setError(""); }}
                      autoCapitalize="words"
                    />
                  </View>
                </>
              )}
              <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: error ? colors.destructive : colors.border }]}>
                <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} style={{ paddingLeft: 14 }} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="vous@exemple.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={(v) => { setEmail(v); setError(""); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <Text style={[styles.label, { color: colors.foreground }]}>Mot de passe</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: error ? colors.destructive : colors.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} style={{ paddingLeft: 14 }} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(""); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleEmailSubmit}
                />
                <TouchableOpacity onPress={() => setShowPassword((s) => !s)} hitSlop={12} style={{ paddingHorizontal: 14 }}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary, opacity: emailBusy ? 0.7 : 1 }]}
                onPress={handleEmailSubmit}
                disabled={emailBusy}
                activeOpacity={0.8}
              >
                {emailBusy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="mail-outline" size={20} color="#fff" />
                    <Text style={styles.btnText}>{emailIsRegister ? "Créer mon compte" : "Se connecter"}</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setEmailIsRegister((v) => !v); setError(""); }} style={{ alignSelf: "center", paddingVertical: 8 }}>
                <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                  {emailIsRegister ? "Déjà un compte ? Se connecter" : "Nouveau ? Créer un compte"}
                </Text>
              </TouchableOpacity>
              {!emailIsRegister && (
                <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")} style={{ alignSelf: "center", paddingVertical: 4 }}>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, textDecorationLine: "underline" }}>
                    Mot de passe oublié ?
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
          <>
          {/* SMS badge */}
          <View style={[styles.whatsappBadge, { backgroundColor: colors.primary + "18" }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
            <Text style={[styles.whatsappBadgeText, { color: colors.primary }]}>
              {t("login_hint_sms")}
            </Text>
          </View>

          {/* Phone number */}
          <Text style={[styles.label, { color: colors.foreground }]}>{t("login_phone_label")}</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: error ? colors.destructive : colors.border }]}>
            {/* Country code picker */}
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
              onChangeText={(t) => { setPhone(t); setError(""); }}
              keyboardType="phone-pad"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>
          {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary, opacity: sendOtp.isPending ? 0.7 : 1 }]}
            onPress={handleContinue}
            disabled={sendOtp.isPending}
            activeOpacity={0.8}
          >
            {sendOtp.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
                <Text style={styles.btnText}>{t("login_send_sms")}</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
          </>
          )}
        </View>

        {mode === "phone" && (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            {t("login_hint_sms")}
          </Text>
        )}
      </ScrollView>

      <CountryPickerModal
        visible={showPicker}
        selected={country}
        onSelect={setCountry}
        onClose={() => setShowPicker(false)}
      />
    </KeyboardAvoidingView>
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
  modeRow: { flexDirection: "row", padding: 4, gap: 4, marginBottom: 6 },
  modeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 11, borderRadius: 11 },
  modeLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  whatsappBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  whatsappBadgeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
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
  hint: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    textAlign: "center", marginTop: 28, paddingHorizontal: 16, lineHeight: 20,
  },
});
