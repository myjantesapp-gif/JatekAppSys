import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Pressable,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TURQUOISE = "#06B6D4";
const TURQUOISE_DEEP = "#0E7490";
const TURQUOISE_SOFT = "#CFFAFE";
const NAVY = "#0A1B3D";
const LIME = "#D7F542";
const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");

const ADS = [
  { key: "pro",     tag: "PRO",     icon: "rocket"   as const, label: "1ère\noffre" },
  { key: "vip",     tag: "VIP",     icon: "star"     as const, label: "2ème\noffre" },
  { key: "premium", tag: "PREMIUM", icon: "sparkles" as const, label: "3ème\noffre" },
  { key: "fast",    tag: "FAST",    icon: "flash"    as const, label: "4ème\noffre" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

const AUTO_MS = 4000;

// Fan layout — each card sits at a horizontal offset and a slight rotation,
// overlapping with its neighbours like a hand of cards.
const CARD_W = 110;
const CARD_H = 150;
const FAN = [
  { dx: -78, rot: -14 },
  { dx: -26, rot: -5 },
  { dx:  26, rot:  5 },
  { dx:  78, rot: 14 },
];

// Initial "decomposed" positions — far from the centre, scaled down, rotated.
const SCATTER = [
  { dx: -SCREEN_W * 0.7, dy: -160, rot: -55 },
  { dx:  SCREEN_W * 0.7, dy: -120, rot:  45 },
  { dx: -SCREEN_W * 0.6, dy:  180, rot:  60 },
  { dx:  SCREEN_W * 0.6, dy:  160, rot: -50 },
];

// Sparkle / star positions around the fan.
const SPARKLES: Array<{ x: number; y: number; size: number; color: string; icon: "star" | "sparkles" }> = [
  { x:  -130, y:  10, size: 18, color: TURQUOISE,      icon: "star" },
  { x:  -150, y:  90, size: 12, color: NAVY,           icon: "star" },
  { x:   135, y:   0, size: 18, color: TURQUOISE,      icon: "star" },
  { x:   155, y:  85, size: 12, color: NAVY,           icon: "star" },
  { x:  -100, y: -55, size: 14, color: TURQUOISE_DEEP, icon: "sparkles" },
  { x:   105, y: -50, size: 14, color: TURQUOISE_DEEP, icon: "sparkles" },
];

export function JatekAdSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [activeIdx, setActiveIdx] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sheet slide-up
  const slideY = useRef(new Animated.Value(SCREEN_H)).current;
  // Overlay fade
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Header / title / sub / cta staggered fade-in
  const contentAnims = useRef(
    Array.from({ length: 4 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(18),
    }))
  ).current;

  // Per-card decomposition → fan composition
  const cardAnims = useRef(
    ADS.map((_, i) => ({
      opacity: new Animated.Value(0),
      translateX: new Animated.Value(SCATTER[i].dx),
      translateY: new Animated.Value(SCATTER[i].dy),
      rotate: new Animated.Value(SCATTER[i].rot),
      scale: new Animated.Value(0.4),
    }))
  ).current;

  // Sparkles pop after the cards land
  const sparkleAnims = useRef(
    SPARKLES.map(() => ({
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.3),
    }))
  ).current;

  const runOpen = () => {
    contentAnims.forEach(({ opacity, translateY }) => {
      opacity.setValue(0);
      translateY.setValue(18);
    });
    cardAnims.forEach((a, i) => {
      a.opacity.setValue(0);
      a.translateX.setValue(SCATTER[i].dx);
      a.translateY.setValue(SCATTER[i].dy);
      a.rotate.setValue(SCATTER[i].rot);
      a.scale.setValue(0.4);
    });
    sparkleAnims.forEach((s) => {
      s.opacity.setValue(0);
      s.scale.setValue(0.3);
    });
    slideY.setValue(SCREEN_H);
    overlayOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.spring(slideY, {
        toValue: 0,
        friction: 14,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.stagger(
        90,
        contentAnims.map(({ opacity, translateY }) =>
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.spring(translateY, {
              toValue: 0,
              friction: 12,
              tension: 60,
              useNativeDriver: true,
            }),
          ])
        )
      ),
      // Cards converge into the fan, staggered
      Animated.stagger(
        110,
        cardAnims.map((a, i) =>
          Animated.parallel([
            Animated.timing(a.opacity, {
              toValue: 1,
              duration: 340,
              useNativeDriver: true,
            }),
            Animated.spring(a.translateX, {
              toValue: FAN[i].dx,
              friction: 10,
              tension: 50,
              useNativeDriver: true,
            }),
            Animated.spring(a.translateY, {
              toValue: 0,
              friction: 10,
              tension: 50,
              useNativeDriver: true,
            }),
            Animated.spring(a.rotate, {
              toValue: FAN[i].rot,
              friction: 10,
              tension: 50,
              useNativeDriver: true,
            }),
            Animated.spring(a.scale, {
              toValue: 1,
              friction: 10,
              tension: 50,
              useNativeDriver: true,
            }),
          ])
        )
      ),
    ]).start(() => {
      // Pop the sparkles after cards have settled
      Animated.stagger(
        80,
        sparkleAnims.map((s) =>
          Animated.parallel([
            Animated.timing(s.opacity, {
              toValue: 1,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.spring(s.scale, {
              toValue: 1,
              friction: 5,
              tension: 120,
              useNativeDriver: true,
            }),
          ])
        )
      ).start();

      // Start the active-card highlight rotation
      setActiveIdx(0);
      scheduleNext(0);
    });
  };

  const runClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(slideY, {
        toValue: SCREEN_H,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const clearAuto = () => {
    if (autoTimer.current) {
      clearTimeout(autoTimer.current);
      autoTimer.current = null;
    }
    progress.stopAnimation();
  };

  const scheduleNext = (fromIdx: number) => {
    clearAuto();
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: AUTO_MS,
      useNativeDriver: false,
    }).start();
    autoTimer.current = setTimeout(() => {
      const next = (fromIdx + 1) % ADS.length;
      setActiveIdx(next);
      scheduleNext(next);
    }, AUTO_MS);
  };

  useEffect(() => {
    if (visible) {
      const t = setTimeout(runOpen, 20);
      return () => {
        clearTimeout(t);
        clearAuto();
      };
    } else {
      clearAuto();
      runClose();
    }
  }, [visible]);

  const animStyle = (i: number) => ({
    opacity: contentAnims[i].opacity,
    transform: [{ translateY: contentAnims[i].translateY }],
  });

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Dimmed overlay */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + 16, transform: [{ translateY: slideY }] },
        ]}
      >
        {/* Handle */}
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        {/* Close button (top-left) — anim[0] */}
        <Animated.View style={[styles.closeRow, animStyle(0)]}>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={NAVY} />
          </TouchableOpacity>
        </Animated.View>

        {/* Title — anim[1] */}
        <Animated.View style={[styles.titleRow, animStyle(1)]}>
          <View style={styles.titleHighlight}>
            <Text style={styles.titleHighlightTxt}>OFFRES</Text>
          </View>
          <Text style={styles.titleTxt}> Jatek</Text>
        </Animated.View>

        {/* Subtitle — anim[2] */}
        <Animated.Text style={[styles.subTxt, animStyle(2)]}>
          Profitez de nos formules exclusives
        </Animated.Text>

        {/* Fan of cards with sparkles */}
        <View style={styles.fanArea}>
          {/* Sparkles behind cards */}
          {SPARKLES.map((sp, i) => (
            <Animated.View
              key={`sp-${i}`}
              pointerEvents="none"
              style={[
                styles.sparkle,
                {
                  left: SCREEN_W / 2 + sp.x - sp.size / 2,
                  top: 30 + sp.y,
                  opacity: sparkleAnims[i].opacity,
                  transform: [{ scale: sparkleAnims[i].scale }],
                },
              ]}
            >
              <Ionicons name={sp.icon} size={sp.size} color={sp.color} />
            </Animated.View>
          ))}

          {/* Cards */}
          {ADS.map((ad, i) => {
            const a = cardAnims[i];
            const rotateInterpolated = a.rotate.interpolate({
              inputRange: [-90, 90],
              outputRange: ["-90deg", "90deg"],
            });
            const isActive = i === activeIdx;
            return (
              <Animated.View
                key={ad.key}
                style={[
                  styles.cardWrap,
                  {
                    left: SCREEN_W / 2 - CARD_W / 2,
                    zIndex: isActive ? 10 : i,
                    opacity: a.opacity,
                    transform: [
                      { translateX: a.translateX },
                      { translateY: a.translateY },
                      { rotate: rotateInterpolated },
                      { scale: a.scale },
                    ],
                  },
                ]}
              >
                <View style={[styles.card, isActive && styles.cardActive]}>
                  <Text style={styles.cardTitleTop}>JATEK</Text>
                  <Text style={styles.cardTitleBottom}>{ad.tag}</Text>
                  <View style={[styles.cardIcon, isActive && styles.cardIconActive]}>
                    <Ionicons
                      name={ad.icon}
                      size={26}
                      color={isActive ? "#fff" : TURQUOISE}
                    />
                  </View>
                  <View style={[styles.cardFoot, isActive && styles.cardFootActive]}>
                    <Text style={styles.cardFootTxt}>{ad.label.replace("\n", " ")}</Text>
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>

        {/* CTA — anim[3] */}
        <Animated.View style={animStyle(3)}>
          <TouchableOpacity activeOpacity={0.9} style={styles.cta} onPress={onClose}>
            <Text style={styles.ctaTxt}>Découvrir les offres</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -8 },
    elevation: 24,
  },
  handleWrap: { alignItems: "center", paddingTop: 10, paddingBottom: 4 },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB" },

  closeRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 14,
  },
  titleHighlight: {
    backgroundColor: LIME,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  titleHighlightTxt: {
    fontSize: 28,
    fontFamily: "Inter_900Black",
    color: NAVY,
    letterSpacing: -0.5,
  },
  titleTxt: {
    fontSize: 28,
    fontFamily: "Inter_900Black",
    color: NAVY,
    letterSpacing: -0.5,
  },
  subTxt: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
  },

  fanArea: {
    height: CARD_H + 80,
    marginTop: 8,
    position: "relative",
  },
  sparkle: {
    position: "absolute",
  },

  cardWrap: {
    position: "absolute",
    top: 30,
    width: CARD_W,
    height: CARD_H,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    overflow: "hidden",
  },
  cardActive: {
    borderColor: TURQUOISE,
    borderWidth: 2,
  },
  cardTitleTop: {
    fontSize: 14,
    fontFamily: "Inter_900Black",
    color: NAVY,
    letterSpacing: -0.2,
  },
  cardTitleBottom: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: TURQUOISE_DEEP,
    letterSpacing: 0.6,
    marginTop: 2,
  },
  cardIcon: {
    marginTop: 12,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: TURQUOISE_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconActive: {
    backgroundColor: TURQUOISE,
  },
  cardFoot: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: TURQUOISE_DEEP,
    paddingVertical: 6,
    alignItems: "center",
  },
  cardFootActive: {
    backgroundColor: TURQUOISE,
  },
  cardFootTxt: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.4,
  },

  cta: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: TURQUOISE,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: TURQUOISE,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  ctaTxt: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
});
