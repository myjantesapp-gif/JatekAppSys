/**
 * Mandatory restaurant owner onboarding screen.
 *
 * Collects legal name + ICE (tax ID) and optionally printer e-mail.
 * Once saved, `profileCompletedAt` is set by the API and the
 * accept-order gate is lifted.
 */
import React, { useEffect, useState } from "react";
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useListRestaurants, getListRestaurantsQueryKey } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { completeRestaurantProfile } from "@/lib/api";

export default function RestaurantOnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const restaurantsParams = user ? { ownerId: user.id } : undefined;
  const { data: restaurants, refetch } = useListRestaurants(
    restaurantsParams,
    {
      query: {
        queryKey: getListRestaurantsQueryKey(restaurantsParams),
        enabled: !!user,
      },
    }
  );
  const myRestaurant = restaurants?.[0];

  const [legalName, setLegalName] = useState("");
  const [ice, setIce] = useState("");
  const [printerEmail, setPrinterEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!myRestaurant) return;
    const r = myRestaurant as any;
    setLegalName(r.legalName || "");
    setIce(r.ice || "");
    setPrinterEmail(r.printerEmail || "");
  }, [myRestaurant?.id]);

  const canSubmit = legalName.trim().length >= 2 && ice.trim().length >= 8;

  const onSubmit = async () => {
    if (!myRestaurant || !canSubmit) return;
    setSaving(true);
    try {
      await completeRestaurantProfile(myRestaurant.id, {
        legalName: legalName.trim(),
        ice: ice.trim(),
        printerEmail: printerEmail.trim() || undefined,
      });
      await refetch();
      Alert.alert("Profil enregistré", "Vous pouvez maintenant accepter des commandes.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  };

  if (!user || (user.role !== "owner" && user.role !== "restaurant_owner")) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Accès propriétaire uniquement.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 20,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>

        <Text style={[styles.h1, { color: colors.foreground }]}>Profil professionnel</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Ces informations apparaissent sur chaque ticket de cuisine et facture générés pour vos commandes.
          Elles sont requises avant toute acceptation.
        </Text>

        {myRestaurant && (
          <View style={[styles.infoBox, { backgroundColor: colors.accent, borderColor: colors.border }]}>
            <Ionicons name="storefront-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }} numberOfLines={1}>
              {myRestaurant.name}
            </Text>
          </View>
        )}

        <Text style={[styles.label, { color: colors.foreground }]}>Raison sociale (nom légal) *</Text>
        <TextInput
          value={legalName}
          onChangeText={setLegalName}
          placeholder="SARL Jatek Oujda"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          testID="input-legal-name"
        />

        <Text style={[styles.label, { color: colors.foreground }]}>Numéro ICE *</Text>
        <TextInput
          value={ice}
          onChangeText={setIce}
          placeholder="000000000000000"
          keyboardType="number-pad"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          testID="input-ice"
        />
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Identifiant Commun de l'Entreprise (15 chiffres), figurant sur votre RC.
        </Text>

        <Text style={[styles.label, { color: colors.foreground }]}>Email imprimante ticket (optionnel)</Text>
        <TextInput
          value={printerEmail}
          onChangeText={setPrinterEmail}
          placeholder="cuisine@monrestaurant.ma"
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          testID="input-printer-email"
        />
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Le ticket de cuisine sera envoyé automatiquement à cette adresse lors de l'acceptation.
        </Text>

        <TouchableOpacity
          onPress={onSubmit}
          disabled={!canSubmit || saving}
          style={[
            styles.submit,
            { backgroundColor: colors.primary, opacity: canSubmit && !saving ? 1 : 0.5 },
          ]}
          testID="button-save-restaurant-profile"
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Enregistrer et continuer</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  h1: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 6 },
  sub: { fontSize: 13, marginBottom: 18, lineHeight: 18 },
  infoBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16,
  },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 16, marginBottom: 8 },
  input: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, fontFamily: "Inter_500Medium",
  },
  hint: { fontSize: 11, marginTop: 4, lineHeight: 16 },
  submit: {
    marginTop: 28, paddingVertical: 16, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  submitText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
