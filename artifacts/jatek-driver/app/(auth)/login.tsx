import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { loginWithCredentials, sendOtp } from "@/lib/api";
import { type ApiTarget, getApiTarget, setApiTarget } from "@/lib/apiTarget";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [target, setTarget] = useState<ApiTarget>("local");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getApiTarget().then(setTarget); }, []);

  const cleanPhone = phone.replace(/\s+/g, "");
  const localValid = cleanPhone.length >= 9;
  const prodValid = email.includes("@") && password.length >= 4;
  const valid = target === "prod" ? prodValid : localValid;

  const onChangeTarget = async (next: ApiTarget) => {
    setError(null);
    setTarget(next);
    await setApiTarget(next);
  };

  const onContinue = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (target === "prod") {
        await loginWithCredentials(email.trim(), password);
        router.replace("/");
      } else {
        await sendOtp(cleanPhone);
        router.push({ pathname: "/(auth)/otp", params: { phone: cleanPhone } });
      }
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Erreur réseau";
      if (target === "local") {
        router.push({ pathname: "/(auth)/otp", params: { phone: cleanPhone } });
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 40 }]}
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.logoArea}>
        <View style={[styles.logoPill, { backgroundColor: colors.primary }]}>
          <Text style={[styles.logoText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>JATEK</Text>
        </View>
        <Text style={[styles.logoSub, { color: colors.info, fontFamily: "Inter_700Bold" }]}>DRIVER</Text>
      </View>

      <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Bienvenue sur Jatek Driver</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {target === "prod" ? "Connectez-vous avec votre email et mot de passe" : "Connectez-vous pour commencer vos livraisons"}
      </Text>

      <View style={[styles.toggleRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        {(["local", "prod"] as const).map((t) => {
          const active = target === t;
          return (
            <Pressable key={t} onPress={() => onChangeTarget(t)} style={[styles.toggleBtn, { backgroundColor: active ? colors.primary : "transparent" }]}>
              <Text style={{ color: active ? colors.primaryForeground : colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                {t === "local" ? "Démo (OTP)" : "Production"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.form}>
        {target === "prod" ? (
          <>
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Email</Text>
            <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput value={email} onChangeText={setEmail} placeholder="vous@jatek.app" placeholderTextColor={colors.mutedForeground} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={[styles.textInput, { color: colors.foreground, fontFamily: "Inter_500Medium" }]} />
            </View>
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 12 }]}>Mot de passe</Text>
            <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor={colors.mutedForeground} secureTextEntry style={[styles.textInput, { color: colors.foreground, fontFamily: "Inter_500Medium" }]} />
            </View>
          </>
        ) : (
          <View style={[styles.phoneRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <View style={[styles.dialBox, { borderRightColor: colors.border, backgroundColor: colors.muted }]}>
              <Text style={styles.flag}>🇲🇦</Text>
              <Text style={[styles.dial, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>+212</Text>
              <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
            </View>
            <TextInput value={phone} onChangeText={setPhone} placeholder="6 12 34 56 78" placeholderTextColor={colors.mutedForeground} keyboardType="phone-pad" autoFocus style={[styles.textInput, { color: colors.foreground, fontFamily: "Inter_500Medium", flex: 1 }]} />
          </View>
        )}
        {error ? <Text style={[styles.error, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>{error}</Text> : null}
      </View>

      <View style={styles.bottom}>
        {target === "prod" && (
          <Pressable
            onPress={() => router.push("/(auth)/forgot-password")}
            style={{ alignSelf: "center" }}
            hitSlop={12}
          >
            <Text style={[styles.forgotLink, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
              Mot de passe oublié ?
            </Text>
          </Pressable>
        )}
        <Text style={[styles.legal, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {target === "prod" ? "Connecté à ma.jatek.app" : "En continuant, vous acceptez les conditions d'utilisation de Jatek."}
        </Text>
        <Pressable onPress={onContinue} disabled={!valid || loading} style={({ pressed }) => [styles.button, { backgroundColor: valid ? colors.primary : colors.muted, opacity: pressed ? 0.85 : 1 }]}>
          {loading ? <ActivityIndicator color={colors.primaryForeground} /> : (
            <Text style={[styles.buttonText, { color: valid ? colors.primaryForeground : colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>
              {target === "prod" ? "Se connecter" : "Continuer"}
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },
  logoArea: { alignItems: "center", marginBottom: 32, gap: 8 },
  logoPill: { paddingHorizontal: 32, paddingVertical: 10, borderRadius: 50 },
  logoText: { fontSize: 40, letterSpacing: -1 },
  logoSub: { fontSize: 18, letterSpacing: 6 },
  title: { fontSize: 24, marginBottom: 8 },
  subtitle: { fontSize: 15, marginBottom: 24, lineHeight: 22 },
  toggleRow: { flexDirection: "row", borderRadius: 50, borderWidth: 1, padding: 4, marginBottom: 24, gap: 4 },
  toggleBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 50 },
  form: { gap: 8 },
  label: { fontSize: 13, marginBottom: 4, marginLeft: 2 },
  inputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, height: 56 },
  phoneRow: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 16, height: 56, overflow: "hidden" },
  dialBox: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, height: "100%", borderRightWidth: 1, gap: 6 },
  flag: { fontSize: 20 },
  dial: { fontSize: 15 },
  textInput: { flex: 1, fontSize: 16, paddingHorizontal: 16, height: "100%" },
  error: { fontSize: 13, marginTop: 4 },
  bottom: { marginTop: "auto", paddingTop: 32, gap: 12 },
  forgotLink: { fontSize: 14, textAlign: "center", paddingVertical: 4 },
  legal: { fontSize: 12, textAlign: "center", lineHeight: 18, paddingHorizontal: 8 },
  button: { height: 56, alignItems: "center", justifyContent: "center", borderRadius: 28 },
  buttonText: { fontSize: 17 },
});
