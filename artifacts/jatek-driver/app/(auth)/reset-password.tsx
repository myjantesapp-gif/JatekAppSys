import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
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
import { resetPassword } from "@/lib/api";

const CODE_LENGTH = 6;

export default function ResetPasswordScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { email, demoOtp } = useLocalSearchParams<{ email: string; demoOtp?: string }>();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  const code = digits.join("");
  const passwordsMatch = newPassword === confirmPassword;
  const valid = code.length === CODE_LENGTH && newPassword.length >= 6 && passwordsMatch;

  const onDigitChange = (value: string, index: number) => {
    setError(null);
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    if (cleaned && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const onDigitKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const onPaste = (value: string) => {
    const nums = value.replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (nums.length > 0) {
      const next = Array(CODE_LENGTH).fill("");
      for (let i = 0; i < nums.length; i++) next[i] = nums[i];
      setDigits(next);
      inputRefs.current[Math.min(nums.length, CODE_LENGTH - 1)]?.focus();
    }
  };

  const onSubmit = async () => {
    if (!valid || loading || !email) return;
    setLoading(true);
    setError(null);
    try {
      await resetPassword(email, code, newPassword);
      router.replace("/");
    } catch (e: any) {
      setError(e?.message ?? "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
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
            <Ionicons name="key-outline" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Nouveau mot de passe
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Entrez le code reçu par email{email ? ` à ${email}` : ""}, puis choisissez un nouveau mot de passe.
          </Text>
        </View>

        {/* Demo OTP hint */}
        {demoOtp ? (
          <View style={[styles.demoBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Ionicons name="eye-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.demoText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Code démo : {demoOtp}
            </Text>
          </View>
        ) : null}

        {/* OTP Code boxes */}
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
          Code de vérification
        </Text>
        <View style={styles.codeRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputRefs.current[i] = r; }}
              value={d}
              onChangeText={(v) => {
                if (v.length > 1) { onPaste(v); return; }
                onDigitChange(v, i);
              }}
              onKeyPress={(e) => onDigitKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={6}
              selectTextOnFocus
              style={[
                styles.codeBox,
                {
                  color: colors.foreground,
                  borderColor: d ? colors.primary : colors.border,
                  backgroundColor: d ? colors.primary + "10" : colors.background,
                  fontFamily: "Inter_700Bold",
                },
              ]}
            />
          ))}
        </View>

        {/* New password */}
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 20 }]}>
          Nouveau mot de passe
        </Text>
        <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <TextInput
            value={newPassword}
            onChangeText={(t) => { setNewPassword(t); setError(null); }}
            placeholder="Au moins 6 caractères"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry={!showPassword}
            style={[styles.textInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={12}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Confirm password */}
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 12 }]}>
          Confirmer le mot de passe
        </Text>
        <View style={[styles.inputRow, { borderColor: confirmPassword && !passwordsMatch ? colors.destructive : colors.border, backgroundColor: colors.background }]}>
          <TextInput
            value={confirmPassword}
            onChangeText={(t) => { setConfirmPassword(t); setError(null); }}
            placeholder="Répétez le mot de passe"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry={!showPassword}
            style={[styles.textInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          />
        </View>
        {confirmPassword && !passwordsMatch ? (
          <Text style={[styles.hint, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
            Les mots de passe ne correspondent pas
          </Text>
        ) : null}

        {error ? (
          <Text style={[styles.error, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={onSubmit}
          disabled={!valid || loading}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: valid ? colors.primary : colors.muted, opacity: pressed ? 0.85 : 1, marginTop: 28 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.buttonText, { color: valid ? colors.primaryForeground : colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>
              Réinitialiser le mot de passe
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24 },
  back: { marginBottom: 24, alignSelf: "flex-start" },
  header: { alignItems: "center", marginBottom: 28, gap: 12 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, textAlign: "center" },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 21, paddingHorizontal: 8 },
  demoBox: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 20 },
  demoText: { fontSize: 14 },
  label: { fontSize: 13, marginBottom: 8, marginLeft: 2 },
  codeRow: { flexDirection: "row", gap: 8, marginBottom: 4, justifyContent: "space-between" },
  codeBox: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderRadius: 14,
    textAlign: "center",
    fontSize: 22,
  },
  inputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, height: 56 },
  textInput: { flex: 1, fontSize: 16, height: "100%" },
  hint: { fontSize: 12, marginTop: 4, marginLeft: 2 },
  error: { fontSize: 13, marginTop: 10, textAlign: "center" },
  button: { height: 56, alignItems: "center", justifyContent: "center", borderRadius: 28 },
  buttonText: { fontSize: 17 },
});
