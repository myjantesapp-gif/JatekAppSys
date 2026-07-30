import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { forgotPassword } from "@/lib/api";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  const valid = email.includes("@") && email.includes(".");

  const onSend = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await forgotPassword(email.trim().toLowerCase());
      if (res.demoOtp) setDemoOtp(res.demoOtp);
      setSent(true);
    } catch (e: any) {
      setError(e?.message ?? "Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const goToReset = () => {
    router.push({
      pathname: "/(auth)/reset-password",
      params: { email: email.trim().toLowerCase(), ...(demoOtp ? { demoOtp } : {}) },
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={16}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + "18" }]}>
            <Ionicons name="lock-open-outline" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Mot de passe oublié
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Entrez votre adresse email. Nous vous enverrons un code de réinitialisation.
          </Text>
        </View>

        {!sent ? (
          <>
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              Email
            </Text>
            <View style={[styles.inputRow, { borderColor: error ? colors.destructive : colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} style={{ marginRight: 10 }} />
              <TextInput
                value={email}
                onChangeText={(t) => { setEmail(t); setError(null); }}
                placeholder="vous@exemple.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                style={[styles.textInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
              />
            </View>
            {error ? (
              <Text style={[styles.error, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                {error}
              </Text>
            ) : null}

            <Pressable
              onPress={onSend}
              disabled={!valid || loading}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: valid ? colors.primary : colors.muted, opacity: pressed ? 0.85 : 1, marginTop: 24 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.buttonText, { color: valid ? colors.primaryForeground : colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>
                  Envoyer le code
                </Text>
              )}
            </Pressable>
          </>
        ) : (
          <View style={styles.sentBox}>
            <View style={[styles.sentIcon, { backgroundColor: "#16A34A18" }]}>
              <Ionicons name="checkmark-circle" size={40} color="#16A34A" />
            </View>
            <Text style={[styles.sentTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Code envoyé !
            </Text>
            <Text style={[styles.sentText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Si un compte existe pour {email}, vous recevrez un code par email ou SMS.
            </Text>
            {demoOtp ? (
              <View style={[styles.demoBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Ionicons name="eye-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.demoText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  Code démo : {demoOtp}
                </Text>
              </View>
            ) : null}
            <Pressable
              onPress={goToReset}
              style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, marginTop: 8 }]}
            >
              <Text style={[styles.buttonText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>
                Saisir le code
              </Text>
            </Pressable>
            <Pressable onPress={() => { setSent(false); setDemoOtp(null); }} style={styles.resend}>
              <Text style={[styles.resendText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                Renvoyer un code
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24 },
  back: { marginBottom: 24, alignSelf: "flex-start" },
  header: { alignItems: "center", marginBottom: 32, gap: 12 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, textAlign: "center" },
  subtitle: { fontSize: 15, textAlign: "center", lineHeight: 22, paddingHorizontal: 8 },
  label: { fontSize: 13, marginBottom: 8, marginLeft: 2 },
  inputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, height: 56 },
  textInput: { flex: 1, fontSize: 16, height: "100%" },
  error: { fontSize: 13, marginTop: 6 },
  button: { height: 56, alignItems: "center", justifyContent: "center", borderRadius: 28 },
  buttonText: { fontSize: 17 },
  sentBox: { alignItems: "center", gap: 12, paddingTop: 8 },
  sentIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  sentTitle: { fontSize: 22 },
  sentText: { fontSize: 15, textAlign: "center", lineHeight: 22, paddingHorizontal: 8 },
  demoBox: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignSelf: "stretch" },
  demoText: { fontSize: 14 },
  resend: { paddingVertical: 12 },
  resendText: { fontSize: 14 },
});
