import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ProfileScreenLayout from "@/components/ProfileScreenLayout";
import { useColors } from "@/hooks/useColors";
import { createSupportTicket } from "@/lib/api";

export default function FeedbackScreen() {
  const colors = useColors();
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (rating === 0) { Alert.alert("Note requise", "Donnez une note de 1 à 5 étoiles."); return; }
    setSending(true);
    try {
      await createSupportTicket({
        category: "feedback",
        subject: `Avis utilisateur — ${rating}/5 étoiles`,
        message: `Note: ${rating}/5\n\n${message.trim() || "(aucun commentaire)"}`,
      });
      Alert.alert("Merci ! 🎉", "Votre avis nous aide à améliorer Jatek.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e: any) { Alert.alert("Erreur", e?.message ?? "Envoi impossible."); }
    finally { setSending(false); }
  };

  return (
    <ProfileScreenLayout title="Donner mon avis">
      <View style={{ padding: 24 }}>
        <Text style={[styles.title, { color: colors.heading }]}>Comment évaluez-vous Jatek ?</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>Votre note nous aide à grandir et améliorer l'app.</Text>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <TouchableOpacity key={i} onPress={() => setRating(i)} hitSlop={8}>
              <Ionicons name={i <= rating ? "star" : "star-outline"} size={48} color={colors.primary} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Votre message (optionnel)</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Ce que vous aimez, ce qu'on peut améliorer..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={[styles.input, { backgroundColor: colors.card, color: colors.heading, borderColor: colors.border }]}
        />

        <TouchableOpacity onPress={send} disabled={sending || rating === 0} style={[styles.btn, { backgroundColor: rating > 0 ? colors.primary : colors.muted }]}>
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, { color: rating > 0 ? "#fff" : colors.mutedForeground }]}>Envoyer mon avis</Text>}
        </TouchableOpacity>
      </View>
    </ProfileScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8, lineHeight: 20 },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 28, marginBottom: 12 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 24, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular", height: 120, textAlignVertical: "top" },
  btn: { marginTop: 20, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
