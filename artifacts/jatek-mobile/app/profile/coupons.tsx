import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import ProfileScreenLayout from "@/components/ProfileScreenLayout";
import { useColors } from "@/hooks/useColors";
import { fetchMe } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useFriendlyAlert } from "@/components/FriendlyAlert";

const PINK = "#E91E63";

const AVAILABLE = [
  { code: "WELCOME10", label: "10% sur votre prochaine commande", desc: "Code de bienvenue Jatek." },
  { code: "JATEK10", label: "10% sur la première commande", desc: "Valide jusqu'au 31 déc." },
  { code: "FREESHIP", label: "Livraison gratuite", desc: "À partir de 80 MAD d'achat" },
  { code: "WEEKEND15", label: "-15% le week-end", desc: "Sam. & dim. uniquement" },
];

interface Milestone {
  pts: number;
  reward: string;
  code: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}

const MILESTONES: Milestone[] = [
  { pts: 50,  reward: "Boisson offerte sur votre prochaine commande", code: "JATEK_BOISSON", icon: "cafe-outline" },
  { pts: 100, reward: "Livraison gratuite illimitée pendant 7 jours",  code: "JATEK_LIVRAISON", icon: "bicycle-outline" },
  { pts: 250, reward: "-25% sur une commande au choix",                code: "JATEK_VIP25",      icon: "star-outline" },
  { pts: 500, reward: "Statut Jatek Or — réductions exclusives",       code: "JATEK_OR",         icon: "trophy-outline" },
];

export default function CouponsScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const friendly = useFriendlyAlert();
  const { code: initialCode } = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState("");
  const [loyalty, setLoyalty] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe()
      .then((u) => setLoyalty(u?.loyaltyPoints ?? user?.loyaltyPoints ?? 0))
      .catch(() => setLoyalty(user?.loyaltyPoints ?? 0))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (initialCode) setCode(String(initialCode).toUpperCase());
  }, [initialCode]);

  const pts = loyalty ?? 0;
  const next = useMemo(() => MILESTONES.find((m) => pts < m.pts), [pts]);
  const previousPts = useMemo(() => {
    const passed = MILESTONES.filter((m) => pts >= m.pts);
    return passed.length ? passed[passed.length - 1].pts : 0;
  }, [pts]);
  const progress = next
    ? Math.min(1, Math.max(0, (pts - previousPts) / (next.pts - previousPts)))
    : 1;
  const ptsToNext = next ? Math.max(0, next.pts - pts) : 0;

  // Animated progress bar
  const progressAnim = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  const apply = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      friendly.show({
        tone: "info",
        icon: "pricetag-outline",
        title: "Saisissez un code",
        message: "Entrez votre code promo Jatek pour bénéficier de la réduction.",
        primary: { label: "OK" },
        hideSecondary: true,
      });
      return;
    }
    const found = AVAILABLE.find((c) => c.code === trimmed) ||
                  MILESTONES.find((m) => m.code === trimmed && pts >= m.pts);
    if (found) {
      const label = "label" in found ? (found as any).label : (found as any).reward;
      friendly.show({
        tone: "success",
        icon: "checkmark-circle",
        title: "Code valide !",
        message: `${label} sera appliqué à votre prochaine commande.`,
        primary: { label: "Commander", href: "/(tabs)" },
        secondary: { label: "Plus tard" },
      });
    } else {
      const lockedMilestone = MILESTONES.find((m) => m.code === trimmed && pts < m.pts);
      if (lockedMilestone) {
        friendly.show({
          tone: "warning",
          icon: "lock-closed-outline",
          title: "Récompense pas encore débloquée",
          message: `Encore ${lockedMilestone.pts - pts} pts pour activer « ${lockedMilestone.reward} ».`,
          primary: { label: "Compris" },
          hideSecondary: true,
        });
      } else {
        friendly.show({
          tone: "error",
          icon: "alert-circle-outline",
          title: "Code invalide",
          message: "Vérifiez votre code et réessayez. Astuce : les codes sont sensibles aux espaces.",
          primary: { label: "OK" },
          hideSecondary: true,
        });
      }
    }
  };

  return (
    <ProfileScreenLayout title="Récompenses & bons">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Loyalty hero */}
        <View style={[styles.loyalty, { backgroundColor: colors.primary }]}>
          <View style={styles.loyaltyTop}>
            <View style={styles.loyaltyIconWrap}>
              <Ionicons name="gift" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.loyaltyLabel}>Vos points de fidélité</Text>
              <Text style={styles.loyaltyValue}>{loading ? "…" : `${pts} pts`}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(tabs)")} style={styles.earnBtn} activeOpacity={0.85}>
              <Ionicons name="add" size={14} color={PINK} />
              <Text style={styles.earnBtnTxt}>Gagner</Text>
            </TouchableOpacity>
          </View>

          {next ? (
            <View style={styles.progressBlock}>
              <Text style={styles.progressTxt}>
                Plus que <Text style={{ fontFamily: "Inter_700Bold" }}>{ptsToNext} pts</Text> pour débloquer « {next.reward} »
              </Text>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
              <Text style={styles.progressHint}>1 pt = 10 MAD dépensés • commandez pour cumuler</Text>
            </View>
          ) : (
            <View style={styles.progressBlock}>
              <Text style={styles.progressTxt}>Bravo, vous avez débloqué toutes les récompenses !</Text>
            </View>
          )}
        </View>

        {/* Milestones */}
        <Text style={[styles.section, { color: colors.heading }]}>Paliers de récompenses</Text>
        <View style={{ gap: 10 }}>
          {MILESTONES.map((m) => {
            const unlocked = pts >= m.pts;
            return (
              <View
                key={m.code}
                style={[
                  styles.milestone,
                  { backgroundColor: colors.card, borderColor: unlocked ? colors.primary : colors.border },
                  unlocked && { borderWidth: 2 },
                ]}
              >
                <View style={[styles.milestoneIcon, { backgroundColor: unlocked ? colors.primary : colors.muted }]}>
                  <Ionicons name={m.icon} size={22} color={unlocked ? "#fff" : colors.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={[styles.milestonePts, { color: unlocked ? colors.primary : colors.heading }]}>
                      {m.pts} pts
                    </Text>
                    {unlocked && (
                      <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark" size={10} color="#fff" />
                        <Text style={styles.badgeTxt}>Débloqué</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.milestoneReward, { color: colors.foreground }]} numberOfLines={2}>{m.reward}</Text>
                </View>
                <TouchableOpacity
                  disabled={!unlocked}
                  onPress={() => { setCode(m.code); apply(); }}
                  style={[
                    styles.milestoneBtn,
                    { backgroundColor: unlocked ? colors.primary : colors.muted },
                  ]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.milestoneBtnTxt, { color: unlocked ? "#fff" : colors.mutedForeground }]}>
                    {unlocked ? "Utiliser" : "Verrouillé"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Promo code input */}
        <Text style={[styles.section, { color: colors.heading }]}>Saisir un code promo</Text>
        <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="pricetag-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            placeholder="JATEK10"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="characters"
            style={{ flex: 1, fontSize: 16, fontFamily: "Inter_500Medium", color: colors.heading }}
          />
          <TouchableOpacity onPress={apply} style={[styles.applyBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.applyText}>Appliquer</Text>
          </TouchableOpacity>
        </View>

        {/* Public coupons */}
        <Text style={[styles.section, { color: colors.heading }]}>Codes disponibles</Text>
        <View style={{ gap: 10 }}>
          {AVAILABLE.map((c) => (
            <View key={c.code} style={[styles.coupon, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.couponLeft, { backgroundColor: colors.primary }]}>
                <Text style={styles.couponCode}>{c.code}</Text>
              </View>
              <View style={{ flex: 1, padding: 12 }}>
                <Text style={[styles.couponLabel, { color: colors.heading }]}>{c.label}</Text>
                <Text style={[styles.couponDesc, { color: colors.mutedForeground }]}>{c.desc}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setCode(c.code);
                  friendly.show({
                    tone: "success",
                    icon: "copy-outline",
                    title: "Code prêt",
                    message: `${c.code} est dans le champ. Appuyez sur Appliquer ou utilisez-le au panier.`,
                    primary: { label: "Voir le menu", href: "/(tabs)" },
                    secondary: { label: "OK" },
                    autoDismissMs: 4000,
                  });
                }}
                hitSlop={10}
                style={{ paddingRight: 12 }}
              >
                <Ionicons name="copy-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* How to earn */}
        <Text style={[styles.section, { color: colors.heading }]}>Comment gagner plus de points ?</Text>
        <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { icon: "fast-food-outline", t: "Commandez vos plats préférés", s: "Vous gagnez 1 pt par tranche de 10 MAD." },
            { icon: "people-outline",    t: "Parrainez vos amis",            s: "+20 pts à chaque ami qui commande pour la 1ʳᵉ fois." },
            { icon: "star-outline",       t: "Notez vos commandes",           s: "+2 pts pour chaque avis laissé sur Jatek." },
            { icon: "calendar-outline",   t: "Commandez le week-end",         s: "Points doublés le samedi & dimanche soir." },
          ].map((row) => (
            <View key={row.t} style={styles.tipRow}>
              <View style={[styles.tipIcon, { backgroundColor: colors.muted }]}>
                <Ionicons name={row.icon as any} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tipTitle, { color: colors.heading }]}>{row.t}</Text>
                <Text style={[styles.tipSub, { color: colors.mutedForeground }]}>{row.s}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </ProfileScreenLayout>
  );
}

const styles = StyleSheet.create({
  loyalty: { padding: 18, borderRadius: 22 },
  loyaltyTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  loyaltyIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  loyaltyLabel: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: "Inter_500Medium" },
  loyaltyValue: { color: "#fff", fontSize: 26, fontFamily: "Inter_700Bold", marginTop: 2 },
  earnBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fff", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18 },
  earnBtnTxt: { color: PINK, fontSize: 12, fontFamily: "Inter_700Bold" },
  progressBlock: { marginTop: 14 },
  progressTxt: { color: "#fff", fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#fff", borderRadius: 4 },
  progressHint: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 6 },
  section: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 24, marginBottom: 10 },
  milestone: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, borderWidth: 1 },
  milestoneIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  milestonePts: { fontSize: 14, fontFamily: "Inter_700Bold" },
  badge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  badgeTxt: { color: "#fff", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  milestoneReward: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2, lineHeight: 16 },
  milestoneBtn: { paddingHorizontal: 12, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", minWidth: 80, maxWidth: 96 },
  milestoneBtnTxt: { fontSize: 11, fontFamily: "Inter_700Bold" },
  inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, paddingLeft: 14, paddingRight: 6, height: 56, gap: 8 },
  applyBtn: { paddingHorizontal: 16, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", minWidth: 88 },
  applyText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  coupon: { flexDirection: "row", alignItems: "stretch", borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  couponLeft: { width: 84, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  couponCode: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  couponLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  couponDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  tipsCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  tipIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  tipTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  tipSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
});
