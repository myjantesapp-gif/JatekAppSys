import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  TextInput,
  Pressable,
  FlatList,
  Keyboard,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GoogleMapPicker } from "@/components/GoogleMapPicker";
import { useFriendlyAlert } from "@/components/FriendlyAlert";
import { useCart } from "@/contexts/CartContext";
import {
  OUJDA_CENTER,
  checkDeliveryZone,
  reverseGeocode,
  searchPlaces,
  OUT_OF_ZONE_MESSAGE,
  type PlaceSuggestion,
} from "@/utils/deliveryZone";

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setSelectedAddress } = useCart();
  const friendly = useFriendlyAlert();

  const [coords, setCoords] = useState({
    latitude: OUJDA_CENTER.latitude,
    longitude: OUJDA_CENTER.longitude,
  });
  const [address, setAddress] = useState<string>("Centre-ville d'Oujda");
  const [zoneOk, setZoneOk] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);

  // Search bar state
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateForCoords = async (latitude: number, longitude: number) => {
    setCoords({ latitude, longitude });
    const zone = checkDeliveryZone(latitude, longitude);
    setZoneOk(zone.inZone);
    setResolving(true);
    try {
      const { address: addr } = await reverseGeocode(latitude, longitude);
      setAddress(addr);
    } catch {
      setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    } finally {
      setResolving(false);
    }
  };

  const handleUseGps = async () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setLocating(true);
    try {
      const existing = await Location.getForegroundPermissionsAsync();
      let status = existing.status;
      if (status !== "granted") {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      if (status !== "granted") {
        friendly.show({
          tone: "warning",
          icon: "navigate-outline",
          title: "Localisation refusée",
          message: "Pas de souci, choisissez votre point de livraison directement sur la carte.",
          primary: { label: "Compris" },
          hideSecondary: true,
        });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await updateForCoords(loc.coords.latitude, loc.coords.longitude);
    } catch {
      friendly.show({
        tone: "error",
        icon: "alert-circle-outline",
        title: "Position introuvable",
        message: "Impossible d'obtenir votre position. Vérifiez que le GPS est activé.",
        primary: { label: "OK" },
        hideSecondary: true,
      });
    } finally {
      setLocating(false);
    }
  };

  // Debounced place search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await searchPlaces(query);
        setSuggestions(r);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const pickSuggestion = async (s: PlaceSuggestion) => {
    Keyboard.dismiss();
    setSearchOpen(false);
    setQuery("");
    setSuggestions([]);
    await updateForCoords(s.latitude, s.longitude);
  };

  const goConfirm = () => {
    if (!zoneOk) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (address) setSelectedAddress(address, true);
    // Show the auth choice instead of forcing login — keeps guest path possible
    router.push("/(auth)/login");
  };

  const goGuest = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    if (zoneOk && address) setSelectedAddress(address, true);
    router.replace("/(tabs)");
  };

  const TURQUOISE = colors.turquoise;
  const PRIMARY = colors.primary;
  const OLIVE_YELLOW = "#E8E29A"; // jaune olive clair

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Map fills the whole screen */}
      <View style={StyleSheet.absoluteFill}>
        <GoogleMapPicker
          latitude={coords.latitude}
          longitude={coords.longitude}
          onChange={(c) => updateForCoords(c.latitude, c.longitude)}
          height="100%"
          pinColor={PRIMARY}
          zoneColor={TURQUOISE}
        />
      </View>

      {/* Top floating search pill — Talabat-style */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={[styles.searchPill, { backgroundColor: "#fff" }]}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : null} hitSlop={10} style={styles.searchIconBtn}>
            <Ionicons name="close" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setSearchOpen(true)}
          >
            {searchOpen ? (
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder="Rechercher une adresse à Oujda…"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.searchInput, { color: colors.foreground }]}
                returnKeyType="search"
                onBlur={() => { if (!query) setSearchOpen(false); }}
              />
            ) : (
              <Text style={[styles.searchTitle, { color: colors.foreground }]} numberOfLines={1}>
                Adresse de livraison
              </Text>
            )}
          </Pressable>
          <TouchableOpacity onPress={() => setSearchOpen(true)} hitSlop={10} style={styles.searchIconBtn}>
            <Ionicons name="search" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Search suggestions */}
        {searchOpen && (suggestions.length > 0 || searching) && (
          <View style={[styles.suggestPanel, { backgroundColor: "#fff" }]}>
            {searching && (
              <View style={styles.suggestRow}>
                <ActivityIndicator size="small" color={PRIMARY} />
                <Text style={[styles.suggestPrimary, { color: colors.mutedForeground, marginLeft: 10 }]}>
                  Recherche…
                </Text>
              </View>
            )}
            <FlatList
              data={suggestions}
              keyExtractor={(item) => String(item.placeId)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.suggestRow} onPress={() => pickSuggestion(item)} activeOpacity={0.7}>
                  <View style={[styles.suggestIcon, { backgroundColor: OLIVE_YELLOW }]}>
                    <Ionicons name="location-sharp" size={16} color="#6A6A1B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.suggestPrimary, { color: colors.foreground }]} numberOfLines={1}>
                      {item.shortName}
                    </Text>
                    <Text style={[styles.suggestSecondary, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.secondaryText}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: colors.border }]} />}
              style={{ maxHeight: 280 }}
            />
          </View>
        )}
      </View>

      {/* Right-side floating buttons (locate + map type) */}
      <View style={[styles.fabStack, { bottom: insets.bottom + 220 }]}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: "#fff" }]}
          onPress={handleUseGps}
          activeOpacity={0.85}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator size="small" color={PRIMARY} />
          ) : (
            <Ionicons name="navigate" size={20} color={PRIMARY} />
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom card — address summary + confirm button */}
      <View style={[styles.bottomCard, { backgroundColor: colors.background, paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.brandRow}>
          <Text style={[styles.brand, { color: colors.heading }]}>
            Jatek<Text style={{ color: PRIMARY }}>.</Text>
          </Text>
          <Text style={[styles.brandSub, { color: colors.mutedForeground }]}>Oujda · Livraison rapide</Text>
        </View>

        <View style={[styles.addrCard, {
          backgroundColor: zoneOk ? OLIVE_YELLOW + "55" : "#FEE2E2",
          borderColor: zoneOk ? OLIVE_YELLOW : "#FECACA",
        }]}>
          <View style={[styles.addrIconWrap, { backgroundColor: zoneOk ? TURQUOISE : "#DC2626" }]}>
            <Ionicons name={zoneOk ? "location" : "alert-circle"} size={16} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.addrLabel, { color: colors.heading }]} numberOfLines={2}>
              {resolving ? "Localisation…" : address}
            </Text>
            {!zoneOk && (
              <Text style={[styles.addrHint, { color: "#B91C1C" }]} numberOfLines={3}>
                {OUT_OF_ZONE_MESSAGE}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: PRIMARY, opacity: zoneOk ? 1 : 0.5 }]}
          onPress={goConfirm}
          activeOpacity={0.85}
          disabled={!zoneOk}
        >
          <Text style={styles.confirmText}>Confirmer la position du repère</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goGuest} style={styles.guestBtn} activeOpacity={0.7}>
          <Text style={[styles.guestText, { color: colors.mutedForeground }]}>
            Continuer comme invité ·{" "}
            <Text style={{ color: PRIMARY, fontFamily: "Inter_700Bold" }}>Découvrir Jatek</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, position: "relative" },

  topBar: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 12 },
  searchPill: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 30,
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  searchIconBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  searchTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", paddingHorizontal: 4 },
  searchInput: { fontSize: 14, fontFamily: "Inter_500Medium", paddingHorizontal: 4, paddingVertical: 0, height: 36 },

  suggestPanel: {
    marginTop: 8, borderRadius: 14, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  suggestRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  suggestIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  suggestPrimary: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  suggestSecondary: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  sep: { height: 1, marginHorizontal: 12 },

  fabStack: { position: "absolute", right: 16, gap: 12, zIndex: 6 },
  fab: {
    width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },

  bottomCard: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 14, gap: 12,
    shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 12,
  },
  brandRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  brand: { fontSize: 22, fontFamily: "Inter_900Black", letterSpacing: -1, fontStyle: "italic" },
  brandSub: { fontSize: 11, fontFamily: "Inter_500Medium" },

  addrCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 12, borderRadius: 14, borderWidth: 1,
  },
  addrIconWrap: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  addrLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  addrHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 16 },

  confirmBtn: {
    height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center",
    shadowColor: "#E91E8C", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  confirmText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
  guestBtn: { alignItems: "center", paddingVertical: 4 },
  guestText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
