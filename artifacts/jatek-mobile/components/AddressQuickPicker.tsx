import React, { useEffect, useState } from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useT } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { listAddresses, type SavedAddress } from "@/lib/api";
import { reverseGeocode, checkDeliveryZone } from "@/utils/deliveryZone";
// checkDeliveryZone used for GPS pick

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AddressQuickPicker({ visible, onClose }: Props) {
  const colors = useColors();
  const t = useT();
  const { user } = useAuth();
  const { setSelectedAddress } = useCart();
  const [items, setItems] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!visible || !user) return;
    setLoading(true);
    listAddresses()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [visible, user]);

  const pick = (a: SavedAddress) => {
    // Saved addresses passed zone validation at save time, so trust it.
    setSelectedAddress(a.fullAddress, true);
    onClose();
  };

  const useGps = async () => {
    setShowGpsModal(false);
    setLocating(true);
    try {
      const existing = await Location.getForegroundPermissionsAsync();
      let status = existing.status;
      if (status !== "granted") {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { address } = await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
      const zone = checkDeliveryZone(loc.coords.latitude, loc.coords.longitude);
      setSelectedAddress(address, zone.inZone);
      onClose();
    } catch (err) {
      console.warn("[AddressQuickPicker] geolocation lookup failed:", err);
    }
    finally { setLocating(false); }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={sheetStyles.overlay}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[sheetStyles.sheet, { backgroundColor: colors.background }]}>
            <View style={sheetStyles.handle} />
            <Text style={[sheetStyles.title, { color: colors.heading }]}>{t("addr_sheet_title")}</Text>

            <TouchableOpacity onPress={() => setShowGpsModal(true)} style={[sheetStyles.row, { backgroundColor: colors.primary + "10" }]} activeOpacity={0.85} disabled={locating}>
              <View style={[sheetStyles.icon, { backgroundColor: colors.primary }]}>
                {locating ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="navigate" size={18} color="#fff" />}
              </View>
              <Text style={[sheetStyles.rowText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{t("home_use_gps")}</Text>
            </TouchableOpacity>

            <Text style={[sheetStyles.section, { color: colors.mutedForeground }]}>{t("addr_sheet_pick")}</Text>

            {/* ── Not logged in: invite to connect ── */}
            {!user ? (
              <View style={[sheetStyles.loginPrompt, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={22} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[sheetStyles.loginTitle, { color: colors.heading }]}>
                    Connectez-vous pour voir vos adresses
                  </Text>
                  <Text style={[sheetStyles.loginSub, { color: colors.mutedForeground }]}>
                    Enregistrez vos lieux de livraison favoris.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => { onClose(); router.push("/(auth)/login"); }}
                  style={[sheetStyles.loginBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.85}
                >
                  <Text style={sheetStyles.loginBtnText}>Se connecter</Text>
                </TouchableOpacity>
              </View>
            ) : loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            ) : items.length === 0 ? (
              <Text style={[sheetStyles.emptyText, { color: colors.mutedForeground }]}>{t("addr_sheet_no_saved")}</Text>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(a) => String(a.id)}
                style={{ maxHeight: 260 }}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => pick(item)} style={[sheetStyles.row, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.7}>
                    <View style={[sheetStyles.icon, { backgroundColor: colors.muted }]}>
                      <Ionicons name="location" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[sheetStyles.label, { color: colors.heading }]}>{item.label}</Text>
                      <Text style={[sheetStyles.addr, { color: colors.mutedForeground }]} numberOfLines={3}>{item.fullAddress}</Text>
                    </View>
                    {item.isDefault ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity
              onPress={() => {
                onClose();
                if (user) {
                  router.push("/profile/addresses?select=1");
                } else {
                  router.push("/(auth)/login");
                }
              }}
              style={[sheetStyles.manageBtn, { borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Ionicons name={user ? "settings-outline" : "person-outline"} size={18} color={colors.heading} />
              <Text style={[sheetStyles.manageText, { color: colors.heading }]}>
                {user ? t("home_manage_addresses") : "Se connecter"}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* GPS permission modal — branded */}
      <Modal visible={showGpsModal} transparent animationType="fade" onRequestClose={() => setShowGpsModal(false)}>
        <View style={gpsStyles.overlay}>
          <View style={[gpsStyles.card, { backgroundColor: colors.background }]}>
            <View style={[gpsStyles.iconWrap, { backgroundColor: colors.primary + "18" }]}>
              <Ionicons name="navigate" size={28} color={colors.primary} />
            </View>
            <Text style={[gpsStyles.title, { color: colors.heading }]}>{t("gps_title")}</Text>
            <Text style={[gpsStyles.text, { color: colors.mutedForeground }]}>{t("gps_text")}</Text>
            <View style={gpsStyles.row}>
              <TouchableOpacity onPress={() => setShowGpsModal(false)} style={[gpsStyles.btn, { backgroundColor: colors.muted, flex: 1 }]} activeOpacity={0.85}>
                <Text style={[gpsStyles.btnText, { color: colors.heading }]}>{t("gps_deny")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={useGps} style={[gpsStyles.btn, { backgroundColor: colors.primary, flex: 1.4 }]} activeOpacity={0.85}>
                <Ionicons name="navigate" size={16} color="#fff" />
                <Text style={[gpsStyles.btnText, { color: "#fff", marginLeft: 6 }]}>{t("gps_allow")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(10,27,61,0.45)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: Platform.OS === "ios" ? 32 : 20, gap: 10 },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#0A1B3D33", marginBottom: 8 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: "transparent", marginBottom: 8 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  rowText: { fontSize: 14, flex: 1 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  addr: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 16 },
  section: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 6, marginBottom: 6 },
  emptyText: { fontSize: 13, textAlign: "center", paddingVertical: 16 },
  manageBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 6 },
  manageText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  loginPrompt: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 6 },
  loginTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  loginSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  loginBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  loginBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
});

const gpsStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(10,27,61,0.45)", justifyContent: "center", alignItems: "center", padding: 28 },
  card: { width: "100%", maxWidth: 380, borderRadius: 22, padding: 24, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { fontSize: 19, fontFamily: "Inter_700Bold", marginBottom: 8, textAlign: "center" },
  text: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginBottom: 20 },
  row: { flexDirection: "row", gap: 10, width: "100%" },
  btn: { height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  btnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
