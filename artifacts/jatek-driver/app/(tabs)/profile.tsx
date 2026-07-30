import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { type ApiTarget, getApiTargetSync, setApiTarget } from "@/lib/apiTarget";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [target, setTarget] = useState<ApiTarget>(getApiTargetSync());

  const driver = user?.driver;
  const initials = (driver?.fullName ?? user?.fullName ?? "D").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const onToggleTarget = async (val: boolean) => {
    const next: ApiTarget = val ? "prod" : "local";
    setTarget(next);
    await setApiTarget(next);
    Alert.alert("Serveur changé", `Connecté au serveur ${next === "prod" ? "production (backend.jatek.app)" : "local (démo)"}.`);
  };

  const onSignOut = () => {
    Alert.alert("Se déconnecter", "Êtes-vous sûr de vouloir vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnecter", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 100, paddingHorizontal: 16 }}
    >
      <View style={[styles.avatarSection, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.foreground, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
            {driver?.fullName ?? user?.fullName ?? "Chauffeur"}
          </Text>
          <Text style={[styles.phone, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{user?.phone ?? user?.email ?? ""}</Text>
          {driver?.status && (
            <View style={[styles.statusPill, { backgroundColor: driver.status === "approved" ? colors.success + "20" : colors.warning + "20" }]}>
              <Text style={{ color: driver.status === "approved" ? colors.success : colors.warning, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>
                {driver.status === "approved" ? "✓ Approuvé" : driver.status === "pending" ? "En attente" : "Rejeté"}
              </Text>
            </View>
          )}
        </View>
      </View>

      {driver && (
        <Section title="Informations véhicule" colors={colors}>
          <InfoRow icon="zap" label="Type" value={driver.vehicleType} colors={colors} />
          <InfoRow icon="hash" label="Plaque" value={driver.vehiclePlate} colors={colors} />
          <InfoRow icon="award" label="Permis" value={driver.licenseNumber} colors={colors} />
          {driver.rating && <InfoRow icon="star" label="Note" value={`${driver.rating.toFixed(1)} / 5`} colors={colors} />}
          {driver.totalDeliveries !== undefined && <InfoRow icon="package" label="Livraisons" value={String(driver.totalDeliveries)} colors={colors} />}
        </Section>
      )}

      <Section title="Connexion" colors={colors}>
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <Feather name="server" size={16} color={colors.mutedForeground} />
            <View>
              <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Mode production</Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11 }}>backend.jatek.app</Text>
            </View>
          </View>
          <Switch value={target === "prod"} onValueChange={onToggleTarget} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
        </View>
      </Section>

      <Pressable onPress={onSignOut} style={({ pressed }) => [styles.signOutBtn, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30", borderRadius: colors.radius, opacity: pressed ? 0.85 : 1 }]}>
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text style={[styles.signOutText, { color: colors.destructive, fontFamily: "Inter_600SemiBold" }]}>Se déconnecter</Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>{title.toUpperCase()}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        {children}
      </View>
    </View>
  );
}

function InfoRow({ icon, label, value, colors }: { icon: keyof typeof Feather.glyphMap; label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Feather name={icon} size={16} color={colors.mutedForeground} />
      <Text style={[styles.rowLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarSection: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderWidth: 1, marginBottom: 20 },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 22 },
  name: { fontSize: 18 },
  phone: { fontSize: 13, marginTop: 2 },
  statusPill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 6 },
  sectionTitle: { fontSize: 11, letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  sectionCard: { borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, gap: 10 },
  rowLabel: { flex: 1, fontSize: 14 },
  rowValue: { fontSize: 14 },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1, height: 52 },
  signOutText: { fontSize: 15 },
});
