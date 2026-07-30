import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  Pressable,
  Animated,
  Easing,
  Platform,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import type { Restaurant } from "@workspace/api-client-react";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const PINK = "#FF4593";
const TURQUOISE = "#00BFA6";

interface Props {
  visible: boolean;
  shorts: Restaurant[];
  initialIndex: number;
  onClose: () => void;
}

export function ShortPlayerModal({ visible, shorts, initialIndex, onClose }: Props) {
  const listRef = useRef<FlatList<Restaurant>>(null);
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex]);

  useEffect(() => {
    if (visible && listRef.current) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      });
    }
  }, [visible, initialIndex]);

  const onScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const i = Math.round(y / SCREEN_H);
    if (i !== index) setIndex(i);
  };

  const goToRestaurant = (id: number) => {
    onClose();
    setTimeout(() => router.push({ pathname: "/restaurant/[id]", params: { id: String(id) } }), 200);
  };

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="overFullScreen" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <FlatList
          ref={listRef}
          data={shorts}
          keyExtractor={(r) => String(r.id)}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={SCREEN_H}
          decelerationRate="fast"
          onScroll={onScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, i) => ({ length: SCREEN_H, offset: SCREEN_H * i, index: i })}
          initialScrollIndex={initialIndex}
          renderItem={({ item, index: i }) => (
            <ShortFrame restaurant={item} active={i === index} onOpen={() => goToRestaurant(item.id)} />
          )}
        />

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Shorts gourmands</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Hint */}
        {index === 0 && (
          <View style={styles.hint} pointerEvents="none">
            <Ionicons name="chevron-up" size={18} color="rgba(255,255,255,0.85)" />
            <Text style={styles.hintText}>Glisse vers le haut</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

function ShortFrame({
  restaurant,
  active,
  onOpen,
}: {
  restaurant: Restaurant;
  active: boolean;
  onOpen: () => void;
}) {
  const heart = useRef(new Animated.Value(1)).current;
  const heartBurst = useRef(new Animated.Value(0)).current;
  const [liked, setLiked] = useState(false);
  const playPulse = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (active) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(playPulse, { toValue: 1.12, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(playPulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
      loopRef.current = loop;
      loop.start();
      return () => {
        loop.stop();
        loopRef.current = null;
        playPulse.setValue(1);
      };
    } else {
      loopRef.current?.stop();
      loopRef.current = null;
      playPulse.setValue(1);
    }
  }, [active, playPulse]);

  const onLike = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLiked((v) => !v);
    Animated.sequence([
      Animated.spring(heart, { toValue: 1.4, useNativeDriver: true, friction: 3 }),
      Animated.spring(heart, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
    heartBurst.setValue(0);
    Animated.timing(heartBurst, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `Découvre ${restaurant.name} sur Jatek`,
      });
    } catch {
      onOpen();
    }
  };

  const burstOpacity = heartBurst.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
  const burstScale = heartBurst.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] });

  return (
    <View style={styles.frame}>
      {restaurant.imageUrl ? (
        <Image source={{ uri: restaurant.imageUrl }} style={styles.bg} resizeMode="cover" />
      ) : (
        <View style={[styles.bg, { backgroundColor: "#111" }]} />
      )}
      <LinearGradient
        colors={["rgba(0,0,0,0.45)", "transparent", "rgba(0,0,0,0.85)"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Center play pulse */}
      <Animated.View style={[styles.playWrap, { transform: [{ scale: playPulse }] }]}>
        <View style={styles.playDot}>
          <Ionicons name="play" size={36} color="#fff" />
        </View>
      </Animated.View>

      {/* Like burst */}
      <Animated.View
        pointerEvents="none"
        style={[styles.burst, { opacity: burstOpacity, transform: [{ scale: burstScale }] }]}
      >
        <Ionicons name="heart" size={120} color={PINK} />
      </Animated.View>

      {/* Right side actions */}
      <View style={styles.sideActions}>
        <Pressable onPress={onLike} style={styles.sideBtn}>
          <Animated.View style={{ transform: [{ scale: heart }] }}>
            <Ionicons name={liked ? "heart" : "heart-outline"} size={32} color={liked ? PINK : "#fff"} />
          </Animated.View>
          <Text style={styles.sideBtnText}>{Math.floor(((restaurant.rating ?? 4) - 3) * 280 + (liked ? 121 : 120))}</Text>
        </Pressable>
        <Pressable onPress={onOpen} style={styles.sideBtn}>
          <Ionicons name="chatbubble-ellipses-outline" size={30} color="#fff" />
          <Text style={styles.sideBtnText}>{Math.floor(((restaurant.id * 13) % 90) + 12)}</Text>
        </Pressable>
        <Pressable onPress={onShare} style={styles.sideBtn}>
          <Ionicons name="share-social-outline" size={30} color="#fff" />
          <Text style={styles.sideBtnText}>Partage</Text>
        </Pressable>
      </View>

      {/* Bottom info */}
      <View style={styles.bottomInfo}>
        <View style={styles.handleRow}>
          <View style={styles.handleAvatar}>
            <Text style={styles.handleAvatarText}>{(restaurant.name ?? "J").charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.handleText}>@{(restaurant.name ?? "jatek").toLowerCase().replace(/\s+/g, "")}</Text>
          <View style={styles.followPill}>
            <Text style={styles.followText}>Suivre</Text>
          </View>
        </View>
        <Text style={styles.caption} numberOfLines={2}>
          {restaurant.description ?? `Découvre ${restaurant.name} 🍽️ — saveurs uniques, livraison rapide !`}
        </Text>

        <Pressable onPress={onOpen} style={styles.openCta}>
          <Ionicons name="restaurant" size={16} color="#fff" />
          <Text style={styles.openCtaText}>Voir le menu</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  frame: { width: SCREEN_W, height: SCREEN_H, position: "relative" },
  bg: { width: "100%", height: "100%" },
  topBar: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  hint: {
    position: "absolute",
    alignSelf: "center",
    bottom: SCREEN_H * 0.4,
    alignItems: "center",
    gap: 4,
  },
  hintText: { color: "rgba(255,255,255,0.85)", fontFamily: "Inter_600SemiBold", fontSize: 12 },

  playWrap: { position: "absolute", top: "42%", alignSelf: "center" },
  playDot: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "rgba(255,69,147,0.35)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.7)",
  },
  burst: { position: "absolute", top: "35%", alignSelf: "center" },

  sideActions: {
    position: "absolute",
    right: 12,
    bottom: 160,
    alignItems: "center",
    gap: 22,
  },
  sideBtn: { alignItems: "center", gap: 4 },
  sideBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 12 },

  bottomInfo: { position: "absolute", left: 16, right: 90, bottom: 50, gap: 10 },
  handleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  handleAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TURQUOISE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  handleAvatarText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
  handleText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
  followPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: PINK,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  followText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 11 },
  caption: { color: "#fff", fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  openCta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PINK,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#fff",
  },
  openCtaText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 0.3 },
});
