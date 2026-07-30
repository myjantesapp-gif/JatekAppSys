import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProfileScreenLayout from "@/components/ProfileScreenLayout";
import { useColors } from "@/hooks/useColors";
import { listSupportTickets, createSupportTicket, type SupportTicket } from "@/lib/api";

const CATS = [
  { id: "order", label: "Commande" },
  { id: "payment", label: "Paiement" },
  { id: "delivery", label: "Livraison" },
  { id: "account", label: "Compte" },
  { id: "other", label: "Autre" },
];

export default function SupportScreen() {
  const colors = useColors();
  const [items, setItems] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("order");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await listSupportTickets()); }
    catch (err) { console.warn("[Support] failed to load tickets:", err); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!subject.trim() || !message.trim()) { Alert.alert("Champs requis", "Sujet et message requis."); return; }
    setSending(true);
    try {
      const created = await createSupportTicket({ category, subject: subject.trim(), message: message.trim() });
      setItems((prev) => [created, ...prev]);
      setSubject(""); setMessage("");
      Alert.alert("Envoyé ✓", "Notre équipe vous répondra sous 24h.");
    } catch (e: any) { Alert.alert("Erreur", e?.message ?? "Envoi impossible."); }
    finally { setSending(false); }
  };

  return (
    <ProfileScreenLayout title="Contacter le support">
      <View style={{ padding: 16 }}>
        <Text style={[styles.section, { color: colors.heading }]}>Nouveau message</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {CATS.map((c) => (
            <TouchableOpacity key={c.id} onPress={() => setCategory(c.id)} style={[styles.chip, { borderColor: category === c.id ? colors.primary : colors.border, backgroundColor: category === c.id ? colors.primary + "15" : "transparent" }]}>
              <Text style={{ color: category === c.id ? colors.primary : colors.heading, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput value={subject} onChangeText={setSubject} placeholder="Sujet" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.card, color: colors.heading, borderColor: colors.border }]} />
        <TextInput value={message} onChangeText={setMessage} placeholder="Décrivez votre problème en détail..." placeholderTextColor={colors.mutedForeground} multiline style={[styles.input, { backgroundColor: colors.card, color: colors.heading, borderColor: colors.border, height: 120, textAlignVertical: "top", marginTop: 10 }]} />
        <TouchableOpacity onPress={send} disabled={sending} style={[styles.btn, { backgroundColor: colors.primary }]}>
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Envoyer le message</Text>}
        </TouchableOpacity>

        <Text style={[styles.section, { color: colors.heading, marginTop: 24 }]}>Mes demandes</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : items.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, textAlign: "center", marginTop: 20, fontFamily: "Inter_400Regular", fontSize: 13 }}>Aucun ticket pour le moment.</Text>
        ) : (
          <ScrollView style={{ maxHeight: 320 }}>
            {items.map((t) => (
              <View key={t.id} style={[styles.ticket, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={[styles.tSubject, { color: colors.heading }]} numberOfLines={1}>{t.subject}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: t.status === "open" ? colors.primary + "20" : colors.muted }]}>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: t.status === "open" ? colors.primary : colors.mutedForeground }}>{t.status === "open" ? "Ouvert" : "Fermé"}</Text>
                  </View>
                </View>
                <Text style={[styles.tMeta, { color: colors.mutedForeground }]}>
                  {CATS.find((c) => c.id === t.category)?.label ?? t.category} · {new Date(t.createdAt).toLocaleDateString("fr-FR")}
                </Text>
                <Text style={[styles.tBody, { color: colors.heading }]} numberOfLines={3}>{t.message}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </ProfileScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 48 },
  btn: { marginTop: 14, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  ticket: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  tSubject: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  tBody: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 6, lineHeight: 18 },
});
