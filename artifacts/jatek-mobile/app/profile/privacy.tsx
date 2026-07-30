import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Switch, ActivityIndicator, Alert, TouchableOpacity, Platform, ScrollView, Share } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ProfileScreenLayout from "@/components/ProfileScreenLayout";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchConsents,
  updateConsents,
  acceptAllConsents,
  rejectAllConsents,
  exportMyDataUrl,
  deleteMyAccount,
  getApiBase,
  type UserConsents,
} from "@/lib/api";

const FIELDS: Array<{ key: keyof UserConsents; label: string; sub: string; section: string }> = [
  { key: "cookiesAnalytics", label: "Cookies analytiques", sub: "Mesure d'audience anonymisée", section: "Cookies & traceurs" },
  { key: "cookiesMarketing", label: "Cookies marketing", sub: "Publicité personnalisée", section: "Cookies & traceurs" },
  { key: "dataProcessing", label: "Traitement des données", sub: "Nécessaire pour la commande et la livraison", section: "Données personnelles" },
  { key: "dataSharing", label: "Partage avec partenaires", sub: "Restaurants & livreurs partenaires", section: "Données personnelles" },
  { key: "personalization", label: "Recommandations personnalisées", sub: "Suggestions basées sur vos goûts", section: "Données personnelles" },
  { key: "marketingEmails", label: "Emails promotionnels", sub: "Offres exclusives par email", section: "Communications marketing" },
  { key: "marketingSms", label: "SMS promotionnels", sub: "Bons plans par SMS", section: "Communications marketing" },
  { key: "marketingPush", label: "Notifications push marketing", sub: "Promos via notifications", section: "Communications marketing" },
];

export default function PrivacyScreen() {
  const colors = useColors();
  const { token, logout } = useAuth();
  const [consents, setConsents] = useState<UserConsents | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchConsents()
      .then(setConsents)
      .catch(() => Alert.alert("Erreur", "Impossible de charger vos préférences"))
      .finally(() => setLoading(false));
  }, [token]);

  const toggle = async (key: keyof UserConsents, value: boolean) => {
    if (!consents) return;
    const optimistic = { ...consents, [key]: value };
    setConsents(optimistic);
    try {
      const next = await updateConsents({ [key]: value } as any);
      setConsents({ ...optimistic, ...next });
    } catch {
      setConsents(consents);
      Alert.alert("Erreur", "La mise à jour a échoué");
    }
  };

  const onAcceptAll = async () => {
    setSaving(true);
    try {
      const next = await acceptAllConsents();
      setConsents((c) => (c ? { ...c, ...next } : next));
    } catch { Alert.alert("Erreur", "Action impossible"); }
    finally { setSaving(false); }
  };

  const onRejectAll = async () => {
    setSaving(true);
    try {
      const next = await rejectAllConsents();
      setConsents((c) => (c ? { ...c, ...next } : next));
    } catch { Alert.alert("Erreur", "Action impossible"); }
    finally { setSaving(false); }
  };

  const onExport = async () => {
    if (!token) return;
    try {
      const res = await fetch(exportMyDataUrl(), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const text = await res.text();
      if (Platform.OS === "web") {
        const blob = new Blob([text], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `jatek-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ message: text, title: "Mes données Jatek" });
      }
    } catch { Alert.alert("Erreur", `Téléchargement impossible (${getApiBase()}/api/me/export)`); }
  };

  const onDelete = () => {
    Alert.alert(
      "Supprimer mon compte",
      "Action irréversible. Toutes vos données seront supprimées sous 30 jours conformément au RGPD.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer", style: "destructive", onPress: async () => {
            setDeleting(true);
            try {
              await deleteMyAccount();
              await logout();
              router.replace("/(auth)/welcome" as any);
            } catch { Alert.alert("Erreur", "Suppression impossible"); }
            finally { setDeleting(false); }
          },
        },
      ],
    );
  };

  if (!token) {
    return (
      <ProfileScreenLayout title="Confidentialité & RGPD">
        <View style={styles.center}><Text style={{ color: colors.mutedForeground }}>Connectez-vous pour gérer vos consentements.</Text></View>
      </ProfileScreenLayout>
    );
  }

  if (loading || !consents) {
    return (
      <ProfileScreenLayout title="Confidentialité & RGPD">
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </ProfileScreenLayout>
    );
  }

  const sections = Array.from(new Set(FIELDS.map((f) => f.section)));

  return (
    <ProfileScreenLayout title="Confidentialité & RGPD">
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ padding: 20, gap: 12 }}>
          <Text style={[styles.intro, { color: colors.mutedForeground }]}>
            Vous contrôlez vos données. Modifiez vos consentements à tout moment, exportez ou supprimez votre compte conformément au RGPD.
          </Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.bigBtn, { backgroundColor: colors.primary }]} onPress={onAcceptAll} disabled={saving}>
              <Text style={styles.bigBtnText}>Tout accepter</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.bigBtn, { backgroundColor: colors.muted }]} onPress={onRejectAll} disabled={saving}>
              <Text style={[styles.bigBtnText, { color: colors.heading }]}>Tout refuser</Text>
            </TouchableOpacity>
          </View>
        </View>

        {sections.map((section) => (
          <View key={section} style={{ marginTop: 8 }}>
            <Text style={[styles.sectionH, { color: colors.heading }]}>{section}</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {section === "Cookies & traceurs" && (
                <View style={[styles.row, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, { color: colors.heading }]}>Cookies essentiels</Text>
                    <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>Requis au fonctionnement, non désactivables</Text>
                  </View>
                  <Switch value={true} disabled trackColor={{ true: colors.primary }} />
                </View>
              )}
              {FIELDS.filter((f) => f.section === section).map((f) => (
                <View key={f.key as string} style={[styles.row, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, { color: colors.heading }]}>{f.label}</Text>
                    <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{f.sub}</Text>
                  </View>
                  <Switch
                    value={Boolean(consents[f.key])}
                    onValueChange={(v) => toggle(f.key, v)}
                    trackColor={{ true: colors.primary, false: colors.muted }}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        <Text style={[styles.sectionH, { color: colors.heading }]}>Vos droits RGPD</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={[styles.actionItem, { borderBottomColor: colors.border }]} onPress={onExport}>
            <Ionicons name="download-outline" size={22} color={colors.heading} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.heading }]}>Télécharger mes données</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>Export JSON complet (droit à la portabilité)</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionItem, { borderBottomColor: colors.border }]} onPress={() => router.push("/profile/legal?type=privacy" as any)}>
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.heading} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.heading }]}>Politique de confidentialité</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>Comment nous traitons vos données</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionItem, { borderBottomColor: colors.border }]} onPress={() => router.push("/profile/legal?type=cookies" as any)}>
            <Ionicons name="server-outline" size={22} color={colors.heading} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.heading }]}>Politique des cookies</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>Détails sur les traceurs utilisés</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={onDelete} disabled={deleting}>
            <Ionicons name="trash-outline" size={22} color={colors.destructive} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.destructive }]}>Supprimer mon compte</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>Droit à l'effacement — irréversible</Text>
            </View>
            {deleting ? <ActivityIndicator color={colors.destructive} /> : <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />}
          </TouchableOpacity>
        </View>

        <View style={{ padding: 20, gap: 4 }}>
          {consents.privacyAcceptedAt && <Text style={[styles.meta, { color: colors.mutedForeground }]}>Politique acceptée le {new Date(consents.privacyAcceptedAt).toLocaleDateString("fr-FR")}</Text>}
          {consents.termsAcceptedAt && <Text style={[styles.meta, { color: colors.mutedForeground }]}>CGU acceptées le {new Date(consents.termsAcceptedAt).toLocaleDateString("fr-FR")}</Text>}
          {consents.cookiesAcceptedAt && <Text style={[styles.meta, { color: colors.mutedForeground }]}>Cookies configurés le {new Date(consents.cookiesAcceptedAt).toLocaleDateString("fr-FR")}</Text>}
          <Text style={[styles.meta, { color: colors.mutedForeground, marginTop: 8 }]}>Contact DPO : privacy@jatek.ma</Text>
        </View>
      </ScrollView>
    </ProfileScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  intro: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  bigBtn: { flex: 1, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  bigBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  sectionH: { fontSize: 16, fontFamily: "Inter_700Bold", paddingHorizontal: 20, marginTop: 18, marginBottom: 8 },
  card: { marginHorizontal: 16, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  rowSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  actionItem: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
