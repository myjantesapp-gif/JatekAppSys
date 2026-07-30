import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (code: string) => void;
}

export function DeliveryCodeModal({ visible, loading, onCancel, onSubmit }: Props) {
  const colors = useColors();
  const [code, setCode] = useState("");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setCode("");
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderRadius: colors.radius * 1.5 }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accent }]}>
            <Feather name="check-circle" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Code de livraison
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Demandez le code à 4 chiffres affiché sur l'application du client.
          </Text>
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="_ _ _ _"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, {
              color: colors.foreground,
              backgroundColor: colors.muted,
              borderColor: code.length === 4 ? colors.primary : colors.border,
              borderRadius: colors.radius,
              fontFamily: "Inter_700Bold",
            }]}
          />
          <View style={styles.row}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.cancel, { borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }}>Annuler</Text>
            </Pressable>
            <Pressable
              onPress={() => onSubmit(code)}
              disabled={loading || code.length !== 4}
              style={({ pressed }) => [styles.confirm, {
                backgroundColor: code.length === 4 ? colors.primary : colors.muted,
                borderRadius: colors.radius,
                opacity: pressed ? 0.85 : 1,
              }]}
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={{ color: code.length === 4 ? colors.primaryForeground : colors.mutedForeground, fontFamily: "Inter_700Bold" }}>
                  Confirmer
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 20 },
  sheet: { width: "100%", maxWidth: 380, padding: 22, alignItems: "center" },
  iconWrap: { width: 56, height: 56, alignItems: "center", justifyContent: "center", borderRadius: 28, marginBottom: 14 },
  title: { fontSize: 18, marginBottom: 6 },
  subtitle: { fontSize: 13, textAlign: "center", marginBottom: 18 },
  input: { width: "100%", height: 64, fontSize: 30, letterSpacing: 12, textAlign: "center", paddingHorizontal: 16, borderWidth: 2, marginBottom: 4 },
  row: { flexDirection: "row", gap: 10, marginTop: 18, alignSelf: "stretch" },
  cancel: { flex: 1, height: 48, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  confirm: { flex: 2, height: 48, alignItems: "center", justifyContent: "center" },
});
