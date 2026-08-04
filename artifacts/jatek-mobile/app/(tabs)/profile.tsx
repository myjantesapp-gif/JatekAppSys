import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, Modal, ActivityIndicator, TextInput } from "react-native";
import { useFriendlyAlert } from "@/components/FriendlyAlert";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { deleteMyAccount } from "@/lib/api";
import { WaveEdge } from "@/components/WaveEdge";
import { useCart } from "@/contexts/CartContext";
import { AddressQuickPicker } from "@/components/AddressQuickPicker";

const PINK = "#E91E63";
const PINK_LIGHT = "#FF5FAD";
const PINK_DEEP = "#C81877";

interface RowProps { icon: string; label: string; onPress: () => void; danger?: boolean; subtitle?: string; }

function Row({ icon, label, onPress, danger, subtitle }: RowProps) {
  const colors = useColors();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={[styles.row, { borderBottomColor: colors.border }]}>
      <Ionicons name={icon as any} size={22} color={danger ? colors.destructive : colors.heading} />
      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowLabel, { color: danger ? colors.destructive : colors.heading }]} numberOfLines={1}>{label}</Text>
        {subtitle ? <Text style={[styles.rowSub, { color: colors.mutedForeground }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {!danger && <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );
}

function QuickCard({ icon, label, accent, yellow, onPress }: { icon: string; label: string; accent?: boolean; yellow?: boolean; onPress: () => void }) {
  const colors = useColors();
  const tint = yellow ? colors.yellowForeground : accent ? colors.primary : colors.heading;
  const bg = yellow ? colors.yellowSoft : colors.card;
  const border = yellow ? colors.yellow : colors.border;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.quickCard, { backgroundColor: bg, borderColor: border }]}
    >
      <Ionicons name={icon as any} size={28} color={tint} />
      <Text style={[styles.quickLabel, { color: tint }]} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, token } = useAuth();
  const { selectedAddress } = useCart();
  const webTopPad = Platform.OS === "web" ? 67 : 0;
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);

  const friendly = useFriendlyAlert();

  const handleLogout = () => {
    friendly.show({
      tone: "info",
      icon: "log-out-outline",
      title: "Déconnexion",
      message: "Êtes-vous sûr de vouloir vous déconnecter de votre compte ?",
      primary: {
        label: "Se déconnecter",
        onPress: async () => { await logout(); router.replace("/(auth)/welcome"); },
      },
      secondary: { label: "Annuler" },
    });
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    setDeleting(true);
    try {
      await deleteMyAccount();
      setDeleteModal(false);
      await logout();
      router.replace("/(auth)/welcome");
    } catch {
      friendly.show({
        tone: "error",
        icon: "cloud-offline-outline",
        title: "Suppression impossible",
        message: "La suppression a échoué. Vérifiez votre connexion Internet et réessayez.",
        primary: { label: "OK" },
        hideSecondary: true,
      });
    } finally {
      setDeleting(false);
    }
  };

  // GUEST / LOGGED-OUT VIEW
  if (!token) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: "#F8F8F8" }}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90) }}
      >
        <View style={styles.guestHeaderWrap}>
          <View style={[styles.guestHomeHeader, { paddingTop: insets.top + 12 + webTopPad }]}>
            <View style={styles.guestTopRow}>
              <TouchableOpacity activeOpacity={0.8} style={styles.guestLocRow} onPress={() => setAddressPickerOpen(true)}>
                <Ionicons name="location-sharp" size={18} color="#fff" />
                <Text style={styles.guestLocText} numberOfLines={1}>
                  Livraison en <Text style={styles.guestLocBold}>{selectedAddress || "5R22+CVC2"}</Text>
                </Text>
                <Ionicons name="chevron-down" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} style={styles.guestAvatar} onPress={() => router.push("/(auth)/login")}>
                <Ionicons name="person" size={18} color={PINK} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity activeOpacity={0.85} style={styles.guestSearchBox} onPress={() => router.push("/(auth)/login")}>
              <Ionicons name="search" size={18} color="#9CA3AF" />
              <TextInput
                style={styles.guestSearchInput}
                editable={false}
                placeholder="Connectez-vous pour personnaliser Jatek"
                placeholderTextColor="#9CA3AF"
              />
            </TouchableOpacity>
            <View style={styles.guestMessage}>
              <Ionicons name="bag-handle" size={36} color="#fff" />
            </View>
            <Text style={styles.guestTitle}>
              Inscris-toi maintenant et fais-toi livrer tes favoris.
            </Text>
          </View>
          <WaveEdge color={PINK} height={28} />
        </View>
        <AddressQuickPicker visible={addressPickerOpen} onClose={() => setAddressPickerOpen(false)} />

        <View style={styles.guestCtaWrap}>
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>Créer un compte</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnSoft, { backgroundColor: colors.primarySoft }]}
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnSoftText, { color: colors.primary }]}>Se connecter</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionHeader, { color: colors.heading }]}>Aide & Support</Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Row icon="chatbubbles-outline" label="Centre d'aide" onPress={() => router.push("/profile/help" as any)} />
          <Row icon="create-outline" label="Donner mon avis" onPress={() => router.push("/profile/feedback" as any)} />
        </View>

        <Text style={[styles.sectionHeader, { color: colors.heading }]}>Légal & Confidentialité</Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Row icon="shield-checkmark-outline" label="Politique de confidentialité" onPress={() => router.push("/profile/legal?type=privacy" as any)} />
          <Row icon="server-outline" label="Politique des cookies" onPress={() => router.push("/profile/legal?type=cookies" as any)} />
          <Row icon="document-text-outline" label="Conditions d'utilisation" onPress={() => router.push("/profile/legal?type=terms" as any)} />
          <Row icon="business-outline" label="Mentions légales" onPress={() => router.push("/profile/legal?type=mentions" as any)} />
        </View>
      </ScrollView>
    );
  }

  // LOGGED-IN VIEW
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F8F8F8" }}
      contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90) }}
      showsVerticalScrollIndicator={false}
    >
      {/* Simple flat header — same style as sub-screens */}
      <View style={[styles.flatHeader, { paddingTop: insets.top + 12 + webTopPad }]}>
        <Text style={styles.flatHeaderTitle}>Mon profil</Text>
      </View>

      {/* Clean user card */}
      <Animated.View entering={FadeInDown.duration(320)} style={styles.userCard}>
        <View style={styles.userCardAvatar}>
          <Text style={styles.avatarText}>{(user?.name ?? "J").charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.userCardInfo}>
          <Text style={styles.userCardName}>{user?.name ?? "Vous"}</Text>
          {user?.email ? <Text style={styles.userCardEmail}>{user.email}</Text> : null}
        </View>
        <TouchableOpacity
          style={styles.userCardEdit}
          onPress={() => router.push("/profile/info" as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={20} color={PINK} />
        </TouchableOpacity>
      </Animated.View>

      {/* Quick-action cards row */}
      <Animated.View entering={FadeInDown.duration(380)} style={styles.quickRow}>
        <QuickCard icon="heart-outline" label="Favoris" onPress={() => router.push("/profile/favorites" as any)} />
        <QuickCard icon="bag-handle-outline" label="Commandes" onPress={() => router.push("/(tabs)/orders")} />
        <QuickCard icon="gift" label="Récompenses" accent yellow onPress={() => router.push("/profile/coupons" as any)} />
      </Animated.View>

      {/* Jatek+ premium upsell */}
      <Animated.View entering={FadeInDown.delay(80).duration(380)}>
        <TouchableOpacity activeOpacity={0.85} style={[styles.premiumCard, { backgroundColor: "#0A1B3D" }]}>
          <View style={styles.premiumIcon}>
            <Ionicons name="sparkles" size={22} color="#FFD700" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.premiumTitle}>Jatek+ <Text style={{ color: "#FFD700" }}>Essai gratuit</Text></Text>
            <Text style={styles.premiumSub}>Livraison gratuite illimitée et offres exclusives</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(380)}>
        <Text style={[styles.sectionHeader, { color: colors.heading }]}>Mon activité</Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Row icon="bag-handle-outline" label="Mes commandes" subtitle="Voir l'historique et le suivi en direct" onPress={() => router.push("/(tabs)/orders")} />
          <Row icon="heart-outline" label="Mes favoris" subtitle="Restos et produits sauvegardés" onPress={() => router.push("/profile/favorites" as any)} />
          <Row icon="repeat-outline" label="Recommander" subtitle="Refaire une commande passée" onPress={() => router.push("/profile/reorder" as any)} />
          <Row icon="star-outline" label="Mes avis" onPress={() => router.push("/profile/reviews" as any)} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).duration(380)}>
        <Text style={[styles.sectionHeader, { color: colors.heading }]}>Gérer le compte</Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Row icon="person-circle-outline" label="Informations personnelles" subtitle={user?.email ?? "Compte & préférences"} onPress={() => router.push("/profile/info" as any)} />
          <Row icon="card-outline" label="Modes de paiement" subtitle="Cartes, wallets, espèces" onPress={() => router.push("/profile/payments" as any)} />
          <Row icon="location-outline" label="Adresses enregistrées" subtitle="Domicile, travail…" onPress={() => router.push("/profile/addresses" as any)} />
          <Row icon="pricetag-outline" label="Bons de réduction" subtitle="JATEK10 actif" onPress={() => router.push("/profile/coupons" as any)} />
          <Row icon="notifications-outline" label="Notifications" onPress={() => router.push("/profile/notifications" as any)} />
          <Row icon="language-outline" label="Langue & région" subtitle="Français · Maroc" onPress={() => router.push("/profile/language" as any)} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(380)}>
        <Text style={[styles.sectionHeader, { color: colors.heading }]}>Aide & Support</Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Row icon="chatbubbles-outline" label="Centre d'aide" onPress={() => router.push("/profile/help" as any)} />
          <Row icon="headset-outline" label="Contacter le support" onPress={() => router.push("/profile/support" as any)} />
          <Row icon="create-outline" label="Donner mon avis" onPress={() => router.push("/profile/feedback" as any)} />
          <Row icon="bug-outline" label="Signaler un problème" onPress={() => router.push("/profile/report" as any)} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240).duration(380)}>
        <Text style={[styles.sectionHeader, { color: colors.heading }]}>Légal & Confidentialité</Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Row icon="lock-closed-outline" label="Confidentialité & RGPD" subtitle="Consentements, export, suppression" onPress={() => router.push("/profile/privacy" as any)} />
          <Row icon="shield-checkmark-outline" label="Politique de confidentialité" onPress={() => router.push("/profile/legal?type=privacy" as any)} />
          <Row icon="server-outline" label="Politique des cookies" onPress={() => router.push("/profile/legal?type=cookies" as any)} />
          <Row icon="document-text-outline" label="Conditions d'utilisation" onPress={() => router.push("/profile/legal?type=terms" as any)} />
          <Row icon="business-outline" label="Mentions légales" onPress={() => router.push("/profile/legal?type=mentions" as any)} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(280).duration(380)}>
        <View style={[styles.section, { backgroundColor: colors.card, marginTop: 16 }]}>
          <Row icon="log-out-outline" label="Se déconnecter" onPress={handleLogout} danger />
          <Row icon="trash-outline" label="Supprimer mon compte" subtitle="Action irréversible" onPress={() => setDeleteModal(true)} danger />
        </View>
      </Animated.View>

      <Text style={[styles.versionText, { color: colors.mutedForeground }]}>2026.04.0</Text>

      {/* Delete confirmation modal */}
      <Modal visible={deleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalIcon, { backgroundColor: colors.destructive + "15" }]}>
              <Ionicons name="warning-outline" size={28} color={colors.destructive} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.heading }]}>Supprimer le compte</Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              Cette action est définitive et irréversible. Toutes vos données seront effacées dans un délai de 30 jours conformément au RGPD.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.muted }]} onPress={() => setDeleteModal(false)} disabled={deleting}>
                <Text style={[styles.modalBtnText, { color: colors.heading }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.destructive }]} onPress={handleDeleteAccount} disabled={deleting}>
                {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[styles.modalBtnText, { color: "#fff" }]}>Supprimer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Flat header (matches ProfileScreenLayout)
  flatHeader: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0F0F0",
    alignItems: "center",
  },
  flatHeaderTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#0A1B3D" },

  // Clean user card
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  userCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PINK,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 19, fontFamily: "Inter_700Bold" },
  userCardInfo: { flex: 1, gap: 2 },
  userCardName: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0A1B3D" },
  userCardEmail: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B7280" },
  userCardEdit: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFF0F5",
    alignItems: "center",
    justifyContent: "center",
  },

  guestHero: { paddingHorizontal: 24, paddingBottom: 28, alignItems: "center" },
  guestHeaderWrap: { backgroundColor: PINK, position: "relative", marginBottom: 28 },
  guestHomeHeader: { paddingHorizontal: 16, paddingBottom: 30, backgroundColor: PINK },
  guestTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  guestLocRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, paddingRight: 10 },
  guestLocText: { flex: 1, color: "#fff", fontSize: 14, fontFamily: "Inter_500Medium" },
  guestLocBold: { color: "#fff", fontFamily: "Inter_700Bold" },
  guestAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#FFB6CC", alignItems: "center", justifyContent: "center" },
  guestSearchBox: { height: 48, borderRadius: 26, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 10, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  guestSearchInput: { flex: 1, fontSize: 14, color: "#0A1B3D", fontFamily: "Inter_400Regular", height: 44, padding: 0 },
  guestMessage: { alignSelf: "center", marginTop: 20, marginBottom: 10 },
  guestEmoji: { fontSize: 64, marginBottom: 12 },
  guestTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 26, color: "#fff", paddingHorizontal: 8 },
  guestCtaWrap: { paddingHorizontal: 16, marginTop: 16, gap: 10 },

  // Quick action cards
  quickRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 12 },
  quickCard: { flex: 1, minHeight: 80, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, paddingHorizontal: 4, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  quickLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center", paddingHorizontal: 2 },

  // Premium upsell card
  premiumCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginTop: 16, padding: 14, borderRadius: 16,
    shadowColor: "#0A1B3D", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5,
  },
  premiumIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,215,0,0.15)", alignItems: "center", justifyContent: "center" },
  premiumTitle: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  premiumSub: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },

  // Section
  sectionHeader: { fontSize: 14, fontFamily: "Inter_700Bold", paddingHorizontal: 20, marginTop: 22, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4, color: "#6B7280" },
  section: { marginHorizontal: 16, borderRadius: 16, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  rowTextWrap: { flex: 1 },
  rowLabel: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
  rowSub: { fontSize: 11.5, fontFamily: "Inter_400Regular", marginTop: 1 },

  // Buttons
  btnPrimary: { height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", shadowColor: PINK, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  btnSoft: { height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  btnSoftText: { fontSize: 16, fontFamily: "Inter_700Bold" },

  versionText: { textAlign: "center", marginTop: 24, fontSize: 12, fontFamily: "Inter_400Regular" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalBox: { borderRadius: 20, borderWidth: 1, padding: 24, width: "100%", maxWidth: 360, alignItems: "center", gap: 12 },
  modalIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  modalBody: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  modalBtns: { flexDirection: "row", gap: 12, width: "100%", marginTop: 4 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
