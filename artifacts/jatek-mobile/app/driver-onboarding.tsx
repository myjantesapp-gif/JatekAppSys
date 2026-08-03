/**
 * Mandatory driver onboarding screen.
 *
 * The user cannot accept any delivery until they fill in the vehicle
 * type / plate and national ID (CIN). Once submitted, the API sets
 * `profileCompletedAt` and the gate is lifted.
 */
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { completeDriverProfile, fetchMyDriver } from "@/lib/api";

const VEHICLE_OPTIONS = [
  { value: "scooter", label: "Scooter", icon: "bicycle" as const },
  { value: "motorcycle", label: "Moto", icon: "speedometer" as const },
  { value: "car", label: "Voiture", icon: "car-sport" as const },
  { value: "bicycle", label: "Vélo", icon: "bicycle-outline" as const },
];

export default function DriverOnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [myDriver, setMyDriver] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [vehicleType, setVehicleType] = useState<string>("scooter");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [saving, setSaving] = useState(false);

  // Load the authenticated driver's record directly from the database-backed
  // /drivers/me endpoint, rather than fetching every driver and filtering on
  // the client.
  useEffect(() => {
    let cancelled = false;
    if (!user || user.role !== "driver") {
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    fetchMyDriver()
      .then((driver) => {
        if (cancelled) return;
        setMyDriver(driver);
        setVehicleType(driver.vehicleType || "scooter");
        setVehiclePlate(driver.vehiclePlate || "");
        setNationalId(driver.nationalId || "");
        setLicenseNumber(driver.licenseNumber || "");
      })
      .catch((error) => {
        if (!cancelled) {
          Alert.alert("Profil introuvable", error?.message ?? "Impossible de charger votre profil livreur.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  const canSubmit = vehiclePlate.trim().length >= 3 && nationalId.trim().length >= 4 && !!vehicleType;

  const onSubmit = async () => {
    if (!myDriver || !canSubmit) return;
    setSaving(true);
    try {
      await completeDriverProfile(myDriver.id, {
        vehicleType,
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        nationalId: nationalId.trim(),
        licenseNumber: licenseNumber.trim() || undefined,
      });
      const savedDriver = await fetchMyDriver();
      setMyDriver(savedDriver);
      Alert.alert("Profile saved", "You can now accept deliveries.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Could not save", e?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== "driver") {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Driver access only.</Text>
      </View>
    );
  }

  if (loadingProfile) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!myDriver) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background, padding: 24 }]}>
        <Text style={{ color: colors.foreground, textAlign: "center" }}>
          Aucun profil livreur n'est associé à ce compte.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, paddingHorizontal: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>

        <Text style={[styles.h1, { color: colors.foreground }]}>Driver profile</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Required by law before you can accept any delivery. Your information is shared only with the customer
          when a delivery is in progress.
        </Text>

        {/* Vehicle type */}
        <Text style={[styles.label, { color: colors.foreground }]}>Vehicle type *</Text>
        <View style={styles.vehicleGrid}>
          {VEHICLE_OPTIONS.map((opt) => {
            const active = vehicleType === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setVehicleType(opt.value)}
                style={[
                  styles.vehicleCard,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                testID={`vehicle-${opt.value}`}
              >
                <Ionicons name={opt.icon} size={22} color={active ? "#fff" : colors.foreground} />
                <Text style={[styles.vehicleLabel, { color: active ? "#fff" : colors.foreground }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Plate */}
        <Text style={[styles.label, { color: colors.foreground }]}>Vehicle plate / matricule *</Text>
        <TextInput
          value={vehiclePlate}
          onChangeText={setVehiclePlate}
          autoCapitalize="characters"
          placeholder="12345-A-1"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          testID="input-vehicle-plate"
        />

        {/* National ID */}
        <Text style={[styles.label, { color: colors.foreground }]}>National ID (CIN) *</Text>
        <TextInput
          value={nationalId}
          onChangeText={setNationalId}
          autoCapitalize="characters"
          placeholder="AB123456"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          testID="input-national-id"
        />

        {/* License */}
        <Text style={[styles.label, { color: colors.foreground }]}>Driver licence number (optional)</Text>
        <TextInput
          value={licenseNumber}
          onChangeText={setLicenseNumber}
          autoCapitalize="characters"
          placeholder="—"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          testID="input-license-number"
        />

        <TouchableOpacity
          onPress={onSubmit}
          disabled={!canSubmit || saving}
          style={[
            styles.submit,
            { backgroundColor: colors.primary, opacity: canSubmit && !saving ? 1 : 0.5 },
          ]}
          testID="button-save-driver-profile"
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save & continue</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  h1: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 6 },
  sub: { fontSize: 13, marginBottom: 20, lineHeight: 18 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_500Medium" },
  vehicleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  vehicleCard: {
    width: "47%", borderWidth: 1, borderRadius: 14, paddingVertical: 14,
    alignItems: "center", justifyContent: "center", gap: 6,
  },
  vehicleLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  submit: {
    marginTop: 28, paddingVertical: 16, borderRadius: 16, alignItems: "center", justifyContent: "center",
  },
  submitText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
