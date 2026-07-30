import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ProfileScreenLayout from "@/components/ProfileScreenLayout";
import { useColors } from "@/hooks/useColors";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ = [
  { q: "Comment passer une commande ?", a: "Choisissez un restaurant, ajoutez vos plats au panier, vérifiez votre adresse de livraison puis validez. Le paiement se fait à la livraison ou via vos moyens enregistrés." },
  { q: "Quels sont les délais de livraison ?", a: "La plupart des commandes sont livrées en 25 à 45 minutes selon la distance et l'affluence du restaurant." },
  { q: "Puis-je annuler une commande ?", a: "Oui, tant que le restaurant ne l'a pas confirmée. Allez dans Mes commandes pour annuler." },
  { q: "Comment utiliser un code promo ?", a: "Saisissez le code dans Bons de réduction ou directement à l'étape paiement du panier." },
  { q: "Quels modes de paiement sont acceptés ?", a: "Cartes bancaires (Visa, Mastercard, CMI), wallets marocains et espèces à la livraison." },
  { q: "Comment contacter un livreur ?", a: "Sur la page de suivi de commande, vous pouvez l'appeler ou lui envoyer un message dès qu'il est en route." },
];

export default function HelpScreen() {
  const colors = useColors();
  const [open, setOpen] = useState<number | null>(null);

  const toggle = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(open === i ? null : i);
  };

  return (
    <ProfileScreenLayout title="Centre d'aide">
      <View style={{ padding: 16 }}>
        <Text style={[styles.section, { color: colors.heading }]}>Questions fréquentes</Text>
        <View style={[styles.list, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {FAQ.map((item, i) => (
            <View key={i} style={[i < FAQ.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => toggle(i)} style={styles.row} activeOpacity={0.7}>
                <Text style={[styles.q, { color: colors.heading }]}>{item.q}</Text>
                <Ionicons name={open === i ? "chevron-up" : "chevron-down"} size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
              {open === i && <Text style={[styles.a, { color: colors.mutedForeground }]}>{item.a}</Text>}
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={() => router.push("/profile/support" as any)} style={[styles.contactCard, { backgroundColor: colors.primary }]}>
          <Ionicons name="headset" size={22} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.contactTitle}>Vous n'avez pas trouvé ?</Text>
            <Text style={styles.contactSub}>Contactez notre équipe support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </ProfileScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  list: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  q: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  a: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, paddingHorizontal: 16, paddingBottom: 16 },
  contactCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, marginTop: 16 },
  contactTitle: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  contactSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
