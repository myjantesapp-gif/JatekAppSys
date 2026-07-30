/**
 * Modal asking the driver to enter the 4-digit code displayed on the
 * customer's phone — the only way to mark an order as delivered.
 *
 * Uses 4 individual digit boxes for a "verification-code" feel, with
 * auto-advance and paste support. RTL/iOS/Android safe.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface PickupCodeModalProps {
  visible: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (code: string) => void | Promise<void>;
}

export function PickupCodeModal({ visible, loading, onCancel, onSubmit }: PickupCodeModalProps) {
  const colors = useColors();
  const [code, setCode] = useState("");
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (visible) {
      setCode("");
      // Slight delay to give the modal time to mount before focusing.
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const handleChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, 4);
    setCode(digits);
    if (digits.length === 4 && !loading) {
      onSubmit(digits);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.iconWrap}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accent }]}>
              <Ionicons name="lock-closed" size={28} color={colors.primary} />
            </View>
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>Confirm hand-off</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Ask the customer for their 4-digit code and enter it below.
          </Text>

          {/* The hidden input is the source of truth; the boxes mirror it. */}
          <Pressable style={styles.boxes} onPress={() => inputRef.current?.focus()}>
            {[0, 1, 2, 3].map((i) => {
              const ch = code[i] ?? "";
              const isActive = code.length === i;
              return (
                <View
                  key={i}
                  style={[
                    styles.box,
                    {
                      backgroundColor: colors.background,
                      borderColor: isActive ? colors.primary : colors.border,
                      borderWidth: isActive ? 2 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.boxText, { color: colors.foreground }]}>{ch}</Text>
                </View>
              );
            })}
          </Pressable>

          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={handleChange}
            keyboardType="number-pad"
            maxLength={4}
            autoFocus
            style={styles.hiddenInput}
            editable={!loading}
            testID="input-pickup-code"
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.muted }]}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={[styles.btnText, { color: colors.foreground }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary, opacity: code.length === 4 ? 1 : 0.5 }]}
              onPress={() => code.length === 4 && onSubmit(code)}
              disabled={loading || code.length !== 4}
              testID="button-confirm-pickup-code"
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, { color: "#fff" }]}>Confirm</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 380, borderRadius: 24, borderWidth: 1, padding: 24, alignItems: "stretch" },
  iconWrap: { alignItems: "center", marginBottom: 12 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 18 },
  boxes: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginBottom: 18 },
  box: { flex: 1, height: 60, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  boxText: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  hiddenInput: { position: "absolute", opacity: 0, width: 1, height: 1 },
  actions: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  btnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
