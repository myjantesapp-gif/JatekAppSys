import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProfileScreenLayout from "@/components/ProfileScreenLayout";
import { useColors } from "@/hooks/useColors";
import { useLang, useT } from "@/contexts/LanguageContext";
import type { Lang } from "@/lib/translations";

const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "ar", label: "العربية", flag: "🇲🇦" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

export default function LanguageScreen() {
  const colors = useColors();
  const { lang, setLang } = useLang();
  const t = useT();
  const [saving, setSaving] = useState<string | null>(null);

  const choose = async (code: Lang) => {
    if (code === lang) return;
    setSaving(code);
    try { await setLang(code); }
    catch (e: any) { Alert.alert(t("error"), e?.message ?? "Échec"); }
    finally { setSaving(null); }
  };

  return (
    <ProfileScreenLayout title={"Langue & région"}>
      <View style={{ padding: 16 }}>
        <Text style={[styles.section, { color: colors.heading }]}>Langue de l'application</Text>
        <View style={[styles.list, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {LANGS.map((l, i) => (
            <TouchableOpacity key={l.code} onPress={() => choose(l.code)} style={[styles.row, i < LANGS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]} activeOpacity={0.7}>
              <Text style={{ fontSize: 24 }}>{l.flag}</Text>
              <Text style={[styles.label, { color: colors.heading }]}>{l.label}</Text>
              {saving === l.code ? (
                <ActivityIndicator color={colors.primary} />
              ) : lang === l.code ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.section, { color: colors.heading }]}>Région</Text>
        <View style={[styles.list, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={{ fontSize: 24 }}>🇲🇦</Text>
            <Text style={[styles.label, { color: colors.heading }]}>Maroc · MAD</Text>
          </View>
        </View>
      </View>
    </ProfileScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 8, marginTop: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  list: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  label: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
});
