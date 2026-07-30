import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ProfileScreenLayout from "@/components/ProfileScreenLayout";
import { useColors } from "@/hooks/useColors";
import { createSupportTicket } from "@/lib/api";

const TYPES = [
  { id: "bug", label: "Bug technique", icon: "bug-outline" },
  { id: "order", label: "Problème de commande", icon: "bag-handle-outline" },
  { id: "delivery", label: "Problème de livraison", icon: "bicycle-outline" },
  { id: "payment", label: "Problème de paiement", icon: "card-outline" },
  { id: "abuse", label: "Abus / Comportement", icon: "warning-outline" },
];

export default function ReportScreen() {
  const colors = useColors();
  const [type, setType] = useState("bug");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (message.trim().length < 10) { Alert.alert("Description trop courte", "Décrivez le problème en quelques mots (10+ caractères)."); return; }
    setSending(true);
    try {
      const t = TYPES.find((x) => x.id === type)!;
      await createSupportTicket({ category: type, subject: `Signalement: ${t.label}`, message: message.trim() });
      Alert.alert("Signalement envoyé ✓", "Merci, notre équipe va l'examiner.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e: any) { Alert.alert("Erreur", e?.message ?? "Envoi impossible."); }
    finally { setSending(false); }
  };

  return (
    <ProfileScreenLayout title="Signaler un problème">
      <View style={{ padding: 16 }}>
        <Text style={[styles.section, { color: colors.heading }]}>Type de problème</Text>
        <View style={[styles.list, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {TYPES.map((t, i) => (
            <TouchableOpacity key={t.id} onPress={() => setType(t.id)} style={[styles.row, i < TYPES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
              <Ionicons name={t.icon as any} size={22} color={type === t.id ? colors.primary : colors.heading} />
              <Text style={[styles.rowLabel, { color: type === t.id ? colors.primary : colors.heading, fontFamily: type === t.id ? "Inter_700Bold" : "Inter_500Medium" }]}>{t.label}</Text>
              {type === t.id && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.section, { color: colors.heading, marginTop: 18 }]}>Description</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Décrivez ce qui s'est passé, quand et où..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={[styles.input, { backgroundColor: colors.card, color: colors.heading, borderColor: colors.border }]}
        />
        <TouchableOpacity onPress={send} disabled={sending} style={[styles.btn, { backgroundColor: colors.destructive }]}>
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Envoyer le signalement</Text>}
        </TouchableOpacity>
      </View>
    </ProfileScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  list: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  rowLabel: { flex: 1, fontSize: 14 },
  input: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular", height: 140, textAlignVertical: "top" },
  btn: { marginTop: 16, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
