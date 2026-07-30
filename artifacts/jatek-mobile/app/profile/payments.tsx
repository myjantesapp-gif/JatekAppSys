import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Modal, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProfileScreenLayout from "@/components/ProfileScreenLayout";
import { useColors } from "@/hooks/useColors";
import { listPaymentMethods, createPaymentMethod, deletePaymentMethod, updatePaymentMethod, type PaymentMethod } from "@/lib/api";

const TYPES = [
  { id: "card", label: "Carte bancaire", icon: "card-outline" },
  { id: "cash", label: "Espèces", icon: "cash-outline" },
  { id: "wallet", label: "Wallet (CIH Pay, etc.)", icon: "wallet-outline" },
];

export default function PaymentsScreen() {
  const colors = useColors();
  const [items, setItems] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState("card");
  const [label, setLabel] = useState("");
  const [last4, setLast4] = useState("");
  const [brand, setBrand] = useState("Visa");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await listPaymentMethods()); }
    catch (e: any) { Alert.alert("Erreur", e?.message ?? "Impossible de charger."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const reset = () => { setType("card"); setLabel(""); setLast4(""); setBrand("Visa"); };

  const onAdd = async () => {
    if (!label.trim()) { Alert.alert("Libellé requis"); return; }
    if (type === "card" && (!last4 || last4.length !== 4)) { Alert.alert("Les 4 derniers chiffres sont requis"); return; }
    setSaving(true);
    try {
      const created = await createPaymentMethod({ type, label: label.trim(), last4: type === "card" ? last4 : null, brand: type === "card" ? brand : null, isDefault: items.length === 0 });
      setItems((prev) => [created, ...prev.map((p) => ({ ...p, isDefault: items.length === 0 ? false : p.isDefault }))]);
      setShowAdd(false); reset();
    } catch (e: any) { Alert.alert("Erreur", e?.message ?? "Impossible d'ajouter."); }
    finally { setSaving(false); }
  };

  const onDelete = (id: number) => {
    Alert.alert("Supprimer ce moyen de paiement ?", "", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
        setItems((prev) => prev.filter((p) => p.id !== id));
        try { await deletePaymentMethod(id); } catch { load(); }
      } },
    ]);
  };

  const setDefault = async (id: number) => {
    setItems((prev) => prev.map((p) => ({ ...p, isDefault: p.id === id })));
    try { await updatePaymentMethod(id, { isDefault: true }); } catch { load(); }
  };

  return (
    <ProfileScreenLayout
      title="Modes de paiement"
      headerRight={
        <TouchableOpacity onPress={() => setShowAdd(true)} hitSlop={10}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </TouchableOpacity>
      }
      scroll={false}
    >
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {items.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="card-outline" size={64} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.heading }]}>Aucun moyen de paiement</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Ajoutez une carte, un wallet ou choisissez espèces à la livraison.</Text>
            </View>
          ) : items.map((p) => {
            const t = TYPES.find((x) => x.id === p.type) ?? TYPES[0];
            return (
              <View key={p.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name={t.icon as any} size={24} color={colors.heading} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.heading }]} numberOfLines={1}>{p.label}</Text>
                  <Text style={[styles.sub, { color: colors.mutedForeground }]}>
                    {p.brand && p.last4 ? `${p.brand} •••• ${p.last4}` : t.label}
                    {p.isDefault ? " · Par défaut" : ""}
                  </Text>
                </View>
                {!p.isDefault && (
                  <TouchableOpacity onPress={() => setDefault(p.id)} style={styles.smallBtn}>
                    <Text style={[styles.smallBtnText, { color: colors.primary }]}>Défaut</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => onDelete(p.id)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            );
          })}
          <TouchableOpacity onPress={() => setShowAdd(true)} style={[styles.addBtn, { borderColor: colors.primary }]}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.addBtnText, { color: colors.primary }]}>Ajouter un moyen de paiement</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.heading }]}>Ajouter un moyen</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              {TYPES.map((t) => (
                <TouchableOpacity key={t.id} onPress={() => setType(t.id)} style={[styles.typeChip, { borderColor: type === t.id ? colors.primary : colors.border, backgroundColor: type === t.id ? colors.primary + "15" : "transparent" }]}>
                  <Ionicons name={t.icon as any} size={18} color={type === t.id ? colors.primary : colors.heading} />
                  <Text style={{ color: type === t.id ? colors.primary : colors.heading, fontFamily: "Inter_500Medium", fontSize: 12 }}>{t.label.split(" ")[0]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Libellé</Text>
            <TextInput value={label} onChangeText={setLabel} placeholder="Ex: Carte perso" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.card, color: colors.heading, borderColor: colors.border }]} />
            {type === "card" && (
              <>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Marque</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {["Visa", "Mastercard", "CMI"].map((b) => (
                    <TouchableOpacity key={b} onPress={() => setBrand(b)} style={[styles.typeChip, { borderColor: brand === b ? colors.primary : colors.border, backgroundColor: brand === b ? colors.primary + "15" : "transparent" }]}>
                      <Text style={{ color: brand === b ? colors.primary : colors.heading, fontFamily: "Inter_500Medium", fontSize: 12 }}>{b}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>4 derniers chiffres</Text>
                <TextInput value={last4} onChangeText={(v) => setLast4(v.replace(/[^0-9]/g, "").slice(0, 4))} keyboardType="number-pad" maxLength={4} placeholder="1234" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.card, color: colors.heading, borderColor: colors.border }]} />
              </>
            )}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <TouchableOpacity onPress={() => { setShowAdd(false); reset(); }} style={[styles.btn, { backgroundColor: colors.muted, flex: 1 }]}>
                <Text style={[styles.btnText, { color: colors.heading }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onAdd} disabled={saving} style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }]}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, { color: "#fff" }]}>Ajouter</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ProfileScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 12 },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10, gap: 12 },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  smallBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", marginTop: 8 },
  addBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#ccc", alignSelf: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 14, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15, fontFamily: "Inter_400Regular" },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  btn: { height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
