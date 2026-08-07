import React, { useState } from "react";
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { getApiBaseSafe } from "@/lib/apiBase";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");

  const handleRegister = async () => {
    const trimName = name.trim();
    const trimEmail = email.trim().toLowerCase();
    if (trimName.length < 2) { setError("Saisissez votre prénom (2 caractères minimum)."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) { setError("Adresse email invalide."); return; }
    if (password.length < 8) { setError("Le mot de passe doit comporter au moins 8 caractères."); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    setError("");
    setLoading("loading");
    try {
      const base = getApiBaseSafe();
      const res = await fetch(`${base}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimName, email: trimEmail, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de l'inscription");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await login(data.token, data.user);
      router.replace("/(tabs)");
    } catch (e: any) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e?.message ?? "Erreur lors de l'inscription");
    } finally {
      setLoading("");
    }
  };

  const pending = loading === "loading";

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.muted }]}
            hitSlop={10}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>

          <View style={[styles.logoWrap, { backgroundColor: colors.card }]}>
            <Image source={require("../../assets/images/jatek-logo.png")} style={{ width: 56, height: 56 }} resizeMode="contain" />
          </View>
          <Text style={[styles.brand, { color: colors.heading }]}>Jatek.</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Créez votre compte</Text>

          <View style={styles.form}>
            <View style={[styles.channelBadge, { backgroundColor: colors.primary + "15" }]}>
              <Ionicons name="person-add-outline" size={16} color={colors.primary} />
              <Text style={[styles.channelBadgeText, { color: colors.primary }]}>Inscription par email</Text>
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>Prénom</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="person-outline" size={18} color={colors.mutedForeground} style={{ paddingLeft: 14 }} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Votre prénom"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={(v) => { setName(v); setError(""); }}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>Adresse email</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} style={{ paddingLeft: 14 }} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="vous@exemple.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>Mot de passe</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="key-outline" size={18} color={colors.mutedForeground} style={{ paddingLeft: 14 }} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="8 caractères minimum"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(""); }}
                secureTextEntry
                returnKeyType="next"
              />
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>Confirmer le mot de passe</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.mutedForeground} style={{ paddingLeft: 14 }} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Répétez le mot de passe"
                placeholderTextColor={colors.mutedForeground}
                value={confirm}
                onChangeText={(v) => { setConfirm(v); setError(""); }}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
            </View>

            {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary, opacity: pending ? 0.7 : 1 }]}
              onPress={handleRegister}
              disabled={pending}
              activeOpacity={0.8}
            >
              {pending ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="person-add-outline" size={20} color="#fff" />
                  <Text style={styles.btnText}>Créer mon compte</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={styles.switchRow} activeOpacity={0.7}>
              <Ionicons name="log-in-outline" size={16} color={colors.primary} />
              <Text style={[styles.switchText, { color: colors.mutedForeground }]}>J'ai déjà un compte</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, alignItems: "center" },
  backBtn: { position: "absolute", top: 12, left: 16, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", zIndex: 10 },
  logoWrap: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", shadowColor: "#E2006A", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  brand: { fontSize: 32, fontFamily: "Inter_700Bold", marginTop: 16, fontStyle: "italic" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4, marginBottom: 36 },
  form: { width: "100%", gap: 10 },
  label: { fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 2 },
  channelBadge: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginBottom: 4 },
  channelBadgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1.5, height: 54, overflow: "hidden" },
  input: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", paddingHorizontal: 14 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  btn: { height: 54, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, marginTop: 4 },
  switchText: { fontSize: 13, fontFamily: "Inter_500Medium", textDecorationLine: "underline" },
});
