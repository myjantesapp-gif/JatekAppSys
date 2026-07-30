import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFriendlyAlert } from "@/components/FriendlyAlert";

const TURQUOISE = "#06B6D4";
const TURQUOISE_DEEP = "#0E7490";
const TURQUOISE_SOFT = "#CFFAFE";
const NAVY = "#0A1B3D";
const LIME = "#D7F542";
const PINK = "#E91E63";
const TEXT_MUTED = "#6B7280";

type OfferKey = "pro" | "vip" | "premium" | "fast";

interface OfferDetail {
  key: OfferKey;
  tag: string;
  title: string;
  tagline: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  price: string;
  period: string;
  highlight: string;
  benefits: string[];
}

const OFFERS: Record<OfferKey, OfferDetail> = {
  pro: {
    key: "pro",
    tag: "PRO",
    title: "Jatek Pro",
    tagline: "Pour les utilisateurs réguliers qui veulent économiser sur chaque commande.",
    icon: "rocket",
    price: "49",
    period: "MAD / mois",
    highlight: "1ère offre — la plus populaire",
    benefits: [
      "Livraison gratuite dès 80 MAD",
      "-10% sur toutes les commandes restaurants",
      "Accès prioritaire aux promotions partenaires",
      "Support client dédié 7j/7",
    ],
  },
  vip: {
    key: "vip",
    tag: "VIP",
    title: "Jatek VIP",
    tagline: "L'expérience premium réservée à nos clients fidèles.",
    icon: "star",
    price: "99",
    period: "MAD / mois",
    highlight: "2ème offre — avantages exclusifs",
    benefits: [
      "Livraison gratuite illimitée, sans minimum",
      "-15% sur toutes les commandes",
      "Accès anticipé aux nouveaux restaurants",
      "Cadeau d'anniversaire offert",
      "Service VIP avec coursier prioritaire",
    ],
  },
  premium: {
    key: "premium",
    tag: "PREMIUM",
    title: "Jatek Premium",
    tagline: "Tous les avantages VIP, plus une suite de services premium.",
    icon: "sparkles",
    price: "149",
    period: "MAD / mois",
    highlight: "3ème offre — le meilleur rapport qualité-prix",
    benefits: [
      "Tout ce qui est inclus dans VIP",
      "-20% sur toutes les commandes",
      "Cashback 5% reversé en points fidélité",
      "Réservations partenaires sans frais",
      "Conciergerie Jatek 24/7",
    ],
  },
  fast: {
    key: "fast",
    tag: "FAST",
    title: "Jatek Fast",
    tagline: "Pour ceux qui veulent leur commande livrée le plus vite possible.",
    icon: "flash",
    price: "29",
    period: "MAD / mois",
    highlight: "4ème offre — livraison express",
    benefits: [
      "Livraison express en moins de 25 minutes garantie",
      "Coursier dédié sur les heures de pointe",
      "Suivi en temps réel renforcé",
      "Remboursement automatique en cas de retard",
    ],
  },
};

export default function OfferDetailScreen() {
  const insets = useSafeAreaInsets();
  const friendly = useFriendlyAlert();
  const { key } = useLocalSearchParams<{ key: string }>();

  const offer = OFFERS[(key as OfferKey)] ?? OFFERS.pro;

  const handleSubscribe = () => {
    friendly.show({
      title: `Abonnement ${offer.title}`,
      message: `Vous êtes sur le point de souscrire à ${offer.title} pour ${offer.price} ${offer.period}. La souscription sera activée dès la confirmation du paiement.`,
      tone: "info",
      primary: {
        label: "Confirmer",
        onPress: () => {
          friendly.show({
            title: "Bientôt disponible",
            message:
              "La souscription en ligne sera ouverte prochainement. Vous recevrez une notification dès l'ouverture.",
            tone: "success",
            primary: { label: "Compris" },
            hideSecondary: true,
          });
        },
      },
      secondary: { label: "Plus tard" },
    });
  };

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={st.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [st.backBtn, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={24} color={NAVY} />
        </Pressable>
        <Text style={st.topTitle}>Offres Jatek</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.hero}>
          <View style={st.heroIconWrap}>
            <Ionicons name={offer.icon} size={42} color="#fff" />
          </View>
          <View style={st.heroBadge}>
            <Text style={st.heroBadgeTxt}>{offer.tag}</Text>
          </View>
          <Text style={st.heroTitle}>{offer.title}</Text>
          <Text style={st.heroTagline}>{offer.tagline}</Text>
          <View style={st.heroHighlight}>
            <Ionicons name="pricetag" size={12} color={NAVY} />
            <Text style={st.heroHighlightTxt}>{offer.highlight}</Text>
          </View>
        </View>

        <View style={st.priceCard}>
          <Text style={st.priceLabel}>À partir de</Text>
          <View style={st.priceRow}>
            <Text style={st.priceValue}>{offer.price}</Text>
            <Text style={st.pricePeriod}> {offer.period}</Text>
          </View>
          <Text style={st.priceFootnote}>Sans engagement, résiliable à tout moment.</Text>
        </View>

        <View style={st.section}>
          <Text style={st.sectionTitle}>Ce qui est inclus</Text>
          {offer.benefits.map((b, i) => (
            <View key={i} style={st.benefitRow}>
              <View style={st.benefitCheck}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
              <Text style={st.benefitTxt}>{b}</Text>
            </View>
          ))}
        </View>

        <View style={st.compareWrap}>
          <Text style={st.compareTitle}>Comparer toutes les offres</Text>
          <View style={st.compareRow}>
            {Object.values(OFFERS).map((o) => {
              const isCurrent = o.key === offer.key;
              return (
                <Pressable
                  key={o.key}
                  onPress={() =>
                    router.replace({ pathname: "/offer/[key]", params: { key: o.key } })
                  }
                  style={({ pressed }) => [
                    st.compareChip,
                    isCurrent && st.compareChipActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Ionicons
                    name={o.icon}
                    size={16}
                    color={isCurrent ? "#fff" : TURQUOISE_DEEP}
                  />
                  <Text style={[st.compareChipTxt, isCurrent && st.compareChipTxtActive]}>
                    {o.tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[st.ctaBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity activeOpacity={0.9} style={st.cta} onPress={handleSubscribe}>
          <Text style={st.ctaTxt}>S'abonner — {offer.price} {offer.period}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  topBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: NAVY,
  },
  hero: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  heroIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: TURQUOISE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: TURQUOISE,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    marginBottom: 14,
  },
  heroBadge: {
    backgroundColor: LIME,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 10,
  },
  heroBadgeTxt: {
    fontSize: 12,
    fontFamily: "Inter_900Black",
    color: NAVY,
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: "Inter_900Black",
    color: NAVY,
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  heroTagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 20,
  },
  heroHighlight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    backgroundColor: TURQUOISE_SOFT,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  heroHighlightTxt: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: NAVY,
    letterSpacing: 0.3,
  },
  priceCard: {
    marginHorizontal: 20,
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: TEXT_MUTED,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  priceValue: {
    fontSize: 36,
    fontFamily: "Inter_900Black",
    color: NAVY,
    letterSpacing: -1,
  },
  pricePeriod: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: TEXT_MUTED,
  },
  priceFootnote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
    marginTop: 6,
  },
  section: {
    marginTop: 22,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: NAVY,
    marginBottom: 12,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  benefitCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: TURQUOISE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 1,
  },
  benefitTxt: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: NAVY,
    lineHeight: 20,
  },
  compareWrap: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  compareTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: NAVY,
    marginBottom: 10,
  },
  compareRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  compareChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: TURQUOISE_SOFT,
    backgroundColor: "#fff",
  },
  compareChipActive: {
    backgroundColor: TURQUOISE,
    borderColor: TURQUOISE,
  },
  compareChipTxt: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: TURQUOISE_DEEP,
    letterSpacing: 0.4,
  },
  compareChipTxtActive: {
    color: "#fff",
  },
  ctaBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  cta: {
    backgroundColor: TURQUOISE,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: TURQUOISE,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  ctaTxt: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
});
