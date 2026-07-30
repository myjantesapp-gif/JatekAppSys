import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { sendOtp, verifyOtp } from "@/lib/api";

const LEN = 6;

export default function OtpScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { signIn } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const onVerify = async (value: string) => {
    if (value.length !== LEN || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { token } = await verifyOtp(phone ?? "", value);
      const me = await signIn(token);
      if (!me) { setError("Ce numéro n'est pas associé à un compte chauffeur."); return; }
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Code invalide";
      setError(msg);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!phone) return;
    try { await sendOtp(phone); } catch {}
  };

  const cells = Array.from({ length: LEN }, (_, i) => code[i] ?? "");

  return (
    <KeyboardAwareScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]} bottomOffset={24} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.back()} hitSlop={16} style={styles.back}>
        <Feather name="arrow-left" size={24} color={colors.foreground} />
      </Pressable>
      <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Vérification</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Code à 6 chiffres envoyé au +212 {phone}</Text>

      <Pressable onPress={() => inputRef.current?.focus()} style={styles.cellsRow}>
        {cells.map((c, i) => (
          <View key={i} style={[styles.cell, { borderColor: c ? colors.primary : colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}>
            <Text style={[styles.cellText, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{c}</Text>
          </View>
        ))}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={(t) => {
          const next = t.replace(/\D/g, "").slice(0, LEN);
          setCode(next);
          if (next.length === LEN) onVerify(next);
        }}
        keyboardType="number-pad"
        autoFocus
        maxLength={LEN}
        style={styles.hiddenInput}
        caretHidden
      />

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} /> : null}

      <Pressable onPress={onResend} hitSlop={12} style={styles.resend}>
        <Text style={[styles.resendText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>Renvoyer le code</Text>
      </Pressable>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },
  back: { marginBottom: 24 },
  title: { fontSize: 26, marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 32 },
  cellsRow: { flexDirection: "row", gap: 10, justifyContent: "space-between" },
  cell: { flex: 1, height: 60, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  cellText: { fontSize: 24 },
  hiddenInput: { position: "absolute", width: 1, height: 1, opacity: 0 },
  error: { fontSize: 13, marginTop: 16, textAlign: "center" },
  resend: { marginTop: 32, alignSelf: "center" },
  resendText: { fontSize: 14 },
});
