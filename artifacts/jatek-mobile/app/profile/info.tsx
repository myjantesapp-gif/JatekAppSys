import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import ProfileScreenLayout from "@/components/ProfileScreenLayout";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserProfile } from "@/lib/api";

export default function InfoScreen() {
  const colors = useColors();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  const [saving, setSaving] = useState(false);

  const dirty =
    name !== (user?.name ?? "") ||
    email !== (user?.email ?? "") ||
    phone !== (user?.phone ?? "") ||
    address !== (user?.address ?? "");

  const onSave = async () => {
    if (!user) return;
    if (name.trim().length < 2) {
      Alert.alert("Nom invalide", "Le nom doit contenir au moins 2 caractères.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateUserProfile(user.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
      });
      await updateUser({ ...user, ...updated });
      Alert.alert("Enregistré", "Vos informations ont été mises à jour.");
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible d'enregistrer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileScreenLayout title="Informations personnelles">
      <View style={styles.body}>
        <Field label="Nom complet" value={name} onChangeText={setName} placeholder="Votre nom" />
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="vous@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Field label="Téléphone" value={phone} onChangeText={setPhone} placeholder="+212 6 ..." keyboardType="phone-pad" />
        <Field label="Adresse principale" value={address} onChangeText={setAddress} placeholder="Rue, ville" multiline />

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: dirty ? colors.primary : colors.muted }]}
          disabled={!dirty || saving}
          onPress={onSave}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, { color: dirty ? "#fff" : colors.mutedForeground }]}>Enregistrer</Text>}
        </TouchableOpacity>
      </View>
    </ProfileScreenLayout>
  );
}

function Field({ label, multiline, ...rest }: { label: string; multiline?: boolean } & React.ComponentProps<typeof TextInput>) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        {...rest}
        multiline={multiline}
        style={[styles.input, { backgroundColor: colors.card, color: colors.heading, borderColor: colors.border, height: multiline ? 80 : 48, textAlignVertical: multiline ? "top" : "center" }]}
        placeholderTextColor={colors.mutedForeground}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  btn: { marginTop: 12, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
