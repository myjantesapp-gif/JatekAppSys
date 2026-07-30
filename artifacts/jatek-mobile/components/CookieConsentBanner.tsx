import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { acceptAllConsents, rejectAllConsents } from "@/lib/api";

const KEY = "jatek_cookie_consent_v1";

async function getStored(): Promise<string | null> {
  if (Platform.OS === "web") { try { return localStorage.getItem(KEY); } catch { return null; } }
  return SecureStore.getItemAsync(KEY);
}
async function setStored(value: string): Promise<void> {
  if (Platform.OS === "web") { try { localStorage.setItem(KEY, value); } catch {} return; }
  await SecureStore.setItemAsync(KEY, value);
}

export default function CookieConsentBanner() {
  const colors = useColors();
  const { token } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    getStored().then((v) => setVisible(!v));
  }, []);

  // Reconcile local choice with backend once the user becomes authenticated.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const choice = await getStored();
      if (cancelled || !choice) return;
      try {
        if (choice === "all") await acceptAllConsents();
        else if (choice === "essential") await rejectAllConsents();
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [token]);

  const close = async (choice: "all" | "essential") => {
    await setStored(choice);
    setVisible(false);
    if (token) {
      try {
        if (choice === "all") await acceptAllConsents();
        else await rejectAllConsents();
      } catch {}
    }
  };

  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.heading }]}>🍪 Vos préférences cookies</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          Nous utilisons des cookies essentiels pour faire fonctionner l'application, et avec votre accord, des cookies de mesure d'audience et de personnalisation.{" "}
          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }} onPress={() => { setVisible(false); router.push("/profile/legal?type=cookies" as any); }}>
            En savoir plus
          </Text>
        </Text>
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.muted }]} onPress={() => close("essential")}>
            <Text style={[styles.btnText, { color: colors.heading }]}>Refuser</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => close("all")}>
            <Text style={[styles.btnText, { color: "#fff" }]}>Tout accepter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 12, zIndex: 9999 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 10, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  title: { fontSize: 15, fontFamily: "Inter_700Bold" },
  body: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  btn: { flex: 1, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
