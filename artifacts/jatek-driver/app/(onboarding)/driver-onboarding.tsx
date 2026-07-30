import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { submitDriverOnboarding, type VehicleType } from "@/lib/api";

const VEHICLES: { id: VehicleType; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: "scooter", label: "Scooter", icon: "zap" },
  { id: "moto", label: "Moto", icon: "wind" },
  { id: "voiture", label: "Voiture", icon: "truck" },
  { id: "velo", label: "Vélo", icon: "navigation" },
];

export default function DriverOnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, refresh, signOut } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [vehicleType, setVehicleType] = useState<VehicleType>("scooter");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [cin, setCin] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const valid = fullName.trim().length > 2 && vehiclePlate.trim().length > 2 && cin.trim().length > 3 && licenseNumber.trim().length > 2;

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== "granted") {
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (lib.status !== "granted") { Alert.alert("Permission requise", "Autorisez l'accès aux photos."); return; }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
      if (!r.canceled && r.assets[0]) setPhotoUri(r.assets[0].uri);
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!r.canceled && r.assets[0]) setPhotoUri(r.assets[0].uri);
  };

  const onSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await submitDriverOnboarding({
        fullName: fullName.trim(),
        vehicleType,
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        cin: cin.trim().toUpperCase(),
        licenseNumber: licenseNumber.trim(),
        photoUrl: photoUri,
      });
      await refresh();
      Alert.alert("Demande envoyée", "Votre dossier a été soumis. Vous recevrez une notification dès validation.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      Alert.alert("Erreur", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}
      bottomOffset={32}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Bienvenue chauffeur</Text>
        <Pressable onPress={signOut} hitSlop={12}><Feather name="log-out" size={20} color={colors.mutedForeground} /></Pressable>
      </View>
      <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        Complétez votre profil pour commencer à recevoir des courses.
      </Text>

      <Pressable onPress={pickPhoto} style={[styles.photoBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius * 2 }]}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Feather name="camera" size={28} color={colors.mutedForeground} />
            <Text style={[styles.photoLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Photo de profil</Text>
          </View>
        )}
      </Pressable>

      <Field label="Nom complet" value={fullName} onChangeText={setFullName} placeholder="Mohammed Alaoui" colors={colors} />

      <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Type de véhicule</Text>
      <View style={styles.vehicleGrid}>
        {VEHICLES.map((v) => {
          const active = vehicleType === v.id;
          return (
            <Pressable key={v.id} onPress={() => setVehicleType(v.id)} style={[styles.vehicleCard, { backgroundColor: active ? colors.accent : colors.card, borderColor: active ? colors.primary : colors.border, borderRadius: colors.radius }]}>
              <Feather name={v.icon} size={20} color={active ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.vehicleLabel, { color: active ? colors.accentForeground : colors.foreground, fontFamily: "Inter_500Medium" }]}>{v.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Field label="Plaque d'immatriculation" value={vehiclePlate} onChangeText={setVehiclePlate} placeholder="12345-A-6" colors={colors} autoCapitalize="characters" />
      <Field label="CIN" value={cin} onChangeText={setCin} placeholder="AB123456" colors={colors} autoCapitalize="characters" />
      <Field label="Numéro de permis" value={licenseNumber} onChangeText={setLicenseNumber} placeholder="1234567" colors={colors} />

      <Pressable onPress={onSubmit} disabled={!valid || submitting} style={({ pressed }) => [styles.submit, { backgroundColor: valid ? colors.primary : colors.muted, borderRadius: colors.radius, opacity: pressed ? 0.85 : 1 }]}>
        {submitting ? <ActivityIndicator color={colors.primaryForeground} /> : (
          <Text style={[styles.submitText, { color: valid ? colors.primaryForeground : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>Soumettre mon dossier</Text>
        )}
      </Pressable>
    </KeyboardAwareScrollView>
  );
}

function Field({ label, value, onChangeText, placeholder, colors, autoCapitalize }: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; colors: ReturnType<typeof useColors>; autoCapitalize?: "none" | "sentences" | "words" | "characters" }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} autoCapitalize={autoCapitalize} style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, fontFamily: "Inter_500Medium" }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  title: { fontSize: 24 },
  subtitle: { fontSize: 14, marginBottom: 24, lineHeight: 21 },
  photoBox: { alignSelf: "center", width: 100, height: 100, borderWidth: 2, overflow: "hidden", marginBottom: 24 },
  photo: { width: "100%", height: "100%" },
  photoPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  photoLabel: { fontSize: 11 },
  label: { fontSize: 13, marginBottom: 6 },
  input: { height: 52, borderWidth: 1.5, paddingHorizontal: 14, fontSize: 15 },
  vehicleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8, marginTop: 6 },
  vehicleCard: { flex: 1, minWidth: "40%", alignItems: "center", paddingVertical: 14, gap: 6, borderWidth: 1.5 },
  vehicleLabel: { fontSize: 13 },
  submit: { marginTop: 32, height: 54, alignItems: "center", justifyContent: "center" },
  submitText: { fontSize: 16 },
});
