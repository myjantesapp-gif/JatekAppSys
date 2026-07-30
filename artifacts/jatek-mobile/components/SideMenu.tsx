import React, { useEffect, useRef } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Easing,
  Pressable,
  Dimensions,
  Image,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

const PINK = "#FF4593";
const PINK_DEEP = "#E91E63";
const TURQUOISE = "#00BFA6";
const YELLOW = "#FFC107";
const PURPLE = "#7B61FF";
const ORANGE = "#FF7A45";
const INK = "#0A1B3D";

interface MenuEntry {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
  emoji?: string;
}

const ENTRIES: MenuEntry[] = [
  { id: "cart", label: "Mon panier", icon: "cart", color: PINK_DEEP, route: "/cart", emoji: "🛒" },
  { id: "fav", label: "Mes favoris", icon: "heart", color: PINK, route: "/profile/favorites", emoji: "❤️" },
  { id: "promo", label: "Promos & coupons", icon: "pricetag", color: ORANGE, route: "/profile/coupons", emoji: "🔥" },
  { id: "orders", label: "Mes commandes", icon: "bag-handle", color: TURQUOISE, route: "/(tabs)/orders", emoji: "🛍️" },
  { id: "rewards", label: "Récompenses", icon: "gift", color: YELLOW, route: "/profile/coupons", emoji: "🎁" },
  { id: "addresses", label: "Mes adresses", icon: "location", color: PURPLE, route: "/profile/addresses", emoji: "📍" },
  { id: "help", label: "Aide & support", icon: "chatbubbles", color: "#0EA5E9", route: "/profile/help", emoji: "💬" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function SideMenu({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const screenW = Dimensions.get("window").width;
  const drawerW = Math.min(320, screenW * 0.86);
  const slide = useRef(new Animated.Value(-drawerW)).current;
  const overlay = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slide, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(overlay, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slide, {
          toValue: -drawerW,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(overlay, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, drawerW, slide, overlay]);

  const handleNav = (route: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    setTimeout(() => router.push(route as any), 220);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.overlay, { opacity: overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawer,
            {
              width: drawerW,
              paddingTop: insets.top + 18,
              paddingBottom: insets.bottom + 18,
              backgroundColor: colors.background,
              transform: [{ translateX: slide }],
            },
          ]}
        >
          {/* Brand header — lighter, no thick border */}
          <View style={styles.brandHeader}>
            <View style={styles.brandRow}>
              <View style={styles.brandBadge}>
                <Text style={styles.brandBadgeText}>J.</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.brandName, { color: colors.heading }]}>Jatek</Text>
                <Text style={[styles.brandTag, { color: colors.mutedForeground }]}>
                  {user ? `Hey ${user.name?.split(" ")[0] ?? ""}` : "Bienvenue"}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={10} style={[styles.closeBtn, { borderColor: colors.border }]}>
                <Ionicons name="close" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Items */}
          <View style={styles.itemsWrap}>
            {ENTRIES.map((entry, i) => (
              <DrawerItem
                key={entry.id}
                entry={entry}
                index={i}
                visible={visible}
                onPress={() => handleNav(entry.route)}
                textColor={colors.heading}
                subColor={colors.mutedForeground}
              />
            ))}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => handleNav("/profile/info" as any)}
              style={[styles.footerBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="settings-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.footerBtnText, { color: colors.mutedForeground }]}>Paramètres</Text>
            </TouchableOpacity>
            <Text style={[styles.versionText, { color: colors.mutedForeground }]}>Jatek v1.0 · Made with 💛</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function DrawerItem({
  entry,
  index,
  visible,
  onPress,
  textColor,
  subColor,
}: {
  entry: MenuEntry;
  index: number;
  visible: boolean;
  onPress: () => void;
  textColor: string;
  subColor: string;
}) {
  const enter = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;
  const wobble = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(enter, {
        toValue: 1,
        duration: 360,
        delay: 80 + index * 50,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }).start();
    } else {
      enter.setValue(0);
    }
  }, [visible, index, enter]);

  const handlePressIn = () => {
    Animated.spring(press, { toValue: 0.94, useNativeDriver: true, friction: 5 }).start();
    Animated.sequence([
      Animated.timing(wobble, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(wobble, { toValue: -1, duration: 80, useNativeDriver: true }),
      Animated.timing(wobble, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start();
  };
  const handlePressOut = () => {
    Animated.spring(press, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
  };

  const translateX = enter.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] });
  const opacity = enter;
  const rotate = wobble.interpolate({ inputRange: [-1, 1], outputRange: ["-12deg", "12deg"] });

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          styles.itemRow,
          { transform: [{ translateX }, { scale: press }], opacity },
        ]}
      >
        <Animated.View
          style={[
            styles.iconChip,
            { backgroundColor: entry.color + "1F", transform: [{ rotate }] },
          ]}
        >
          <Ionicons name={entry.icon} size={18} color={entry.color} />
        </Animated.View>
        <Text style={[styles.itemLabel, { color: textColor }]}>{entry.label}</Text>
        <Ionicons name="chevron-forward" size={16} color={subColor} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,27,61,0.55)" },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 6, height: 0 },
    elevation: 16,
    overflow: "hidden",
  },
  brandHeader: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 18,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PINK + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  brandBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: PINK_DEEP,
    fontStyle: "italic",
  },
  brandName: { fontFamily: "Inter_700Bold", fontSize: 18, letterSpacing: -0.4 },
  brandTag: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  itemsWrap: { paddingHorizontal: 10, paddingTop: 4, gap: 2 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  itemLabel: { fontFamily: "Inter_500Medium", fontSize: 14, letterSpacing: -0.1, flex: 1 },

  footer: { marginTop: "auto", paddingHorizontal: 18, gap: 10 },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  footerBtnText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  versionText: { fontFamily: "Inter_400Regular", fontSize: 10.5, textAlign: "center", opacity: 0.7 },
});
