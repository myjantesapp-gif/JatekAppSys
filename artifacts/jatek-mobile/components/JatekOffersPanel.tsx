import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const TURQUOISE = "#06B6D4";
const TURQUOISE_DEEP = "#0E7490";
const TURQUOISE_SOFT = "#CFFAFE";
const NAVY = "#0A1B3D";
const LIME = "#D7F542";
const PINK = "#E91E63";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");

export type OfferKey = "pro" | "vip" | "premium" | "fast";

const ADS: ReadonlyArray<{
  key: OfferKey;
  tag: string;
  icon: "rocket" | "star" | "sparkles" | "flash";
  label: string;
}> = [
  { key: "pro",     tag: "PRO",     icon: "rocket",   label: "1ère offre" },
  { key: "vip",     tag: "VIP",     icon: "star",     label: "2ème offre" },
  { key: "premium", tag: "PREMIUM", icon: "sparkles", label: "3ème offre" },
  { key: "fast",    tag: "FAST",    icon: "flash",    label: "4ème offre" },
];

const AUTO_MS = 4000;

const CARD_W = 110;
const CARD_H = 150;

const FAN = [
  { dx: -78, rot: -14 },
  { dx: -26, rot: -5 },
  { dx:  26, rot:  5 },
  { dx:  78, rot: 14 },
];

const SCATTER = [
  { dx: -SCREEN_W * 0.7, dy: -160, rot: -55 },
  { dx:  SCREEN_W * 0.7, dy: -120, rot:  45 },
  { dx: -SCREEN_W * 0.6, dy:  180, rot:  60 },
  { dx:  SCREEN_W * 0.6, dy:  160, rot: -50 },
];

const SPARKLES: Array<{ x: number; y: number; size: number; color: string; icon: "star" | "sparkles" }> = [
  { x:  -130, y:  10, size: 18, color: TURQUOISE,      icon: "star" },
  { x:  -150, y:  90, size: 12, color: NAVY,           icon: "star" },
  { x:   135, y:   0, size: 18, color: TURQUOISE,      icon: "star" },
  { x:   155, y:  85, size: 12, color: NAVY,           icon: "star" },
  { x:  -100, y: -55, size: 14, color: TURQUOISE_DEEP, icon: "sparkles" },
  { x:   105, y: -50, size: 14, color: TURQUOISE_DEEP, icon: "sparkles" },
];

const BAR_H = 36;
const PANEL_H = Math.min(490, Math.floor(SCREEN_H * 0.65));

interface Props {
  tabBarHeight: number;
}

export function JatekOffersPanel({ tabBarHeight }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const openAnim = useRef(new Animated.Value(0)).current;
  const chevronAnim = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOpenRef = useRef(false);

  const contentAnims = useRef(
    Array.from({ length: 3 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(18),
    }))
  ).current;

  const cardAnims = useRef(
    ADS.map((_, i) => ({
      opacity: new Animated.Value(0),
      translateX: new Animated.Value(SCATTER[i].dx),
      translateY: new Animated.Value(SCATTER[i].dy),
      rotate: new Animated.Value(SCATTER[i].rot),
      scale: new Animated.Value(0.4),
    }))
  ).current;

  const sparkleAnims = useRef(
    SPARKLES.map(() => ({
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.3),
    }))
  ).current;

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

  const runCardAnimations = () => {
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

    Animated.parallel([
      Animated.stagger(
        90,
        contentAnims.map(({ opacity, translateY }) =>
          Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, friction: 12, tension: 60, useNativeDriver: true }),
          ])
        )
      ),
      Animated.stagger(
        110,
        cardAnims.map((a, i) =>
          Animated.parallel([
            Animated.timing(a.opacity, { toValue: 1, duration: 340, useNativeDriver: true }),
            Animated.spring(a.translateX, { toValue: FAN[i].dx, friction: 10, tension: 50, useNativeDriver: true }),
            Animated.spring(a.translateY, { toValue: 0, friction: 10, tension: 50, useNativeDriver: true }),
            Animated.spring(a.rotate, { toValue: FAN[i].rot, friction: 10, tension: 50, useNativeDriver: true }),
            Animated.spring(a.scale, { toValue: 1, friction: 10, tension: 50, useNativeDriver: true }),
          ])
        )
      ),
    ]).start(() => {
      Animated.stagger(
        80,
        sparkleAnims.map((s) =>
          Animated.parallel([
            Animated.timing(s.opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
            Animated.spring(s.scale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
          ])
        )
      ).start();
      setActiveIdx(0);
      scheduleNext(0);
    });
  };

  const openOffer = (key: OfferKey) => {
    clearAuto();
    router.push({ pathname: "/offer/[key]", params: { key } });
  };

  const toggle = () => {
    const toOpen = !open;
    isOpenRef.current = toOpen;
    setOpen(toOpen);

    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }

    Animated.parallel([
      Animated.spring(openAnim, {
        toValue: toOpen ? 1 : 0,
        friction: 14,
        tension: 50,
        useNativeDriver: false,
      }),
      Animated.timing(chevronAnim, {
        toValue: toOpen ? 1 : 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();

    if (toOpen) {
      openTimer.current = setTimeout(() => {
        openTimer.current = null;
        if (isOpenRef.current) {
          runCardAnimations();
        }
      }, 80);
    } else {
      clearAuto();
    }
  };

  useEffect(() => {
    return () => {
      clearAuto();
      if (openTimer.current) {
        clearTimeout(openTimer.current);
        openTimer.current = null;
      }
    };
  }, []);

  const panelHeight = openAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PANEL_H],
  });

  const contentTranslateY = openAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [PANEL_H, 0],
  });

  const chevronRotate = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const animStyle = (i: number) => ({
    opacity: contentAnims[i].opacity,
    transform: [{ translateY: contentAnims[i].translateY }],
  });

  return (
    <View style={[st.wrapper, { bottom: tabBarHeight }]} pointerEvents="box-none">
      {/* Collapsible panel */}
      <Animated.View style={[st.panelClip, { height: panelHeight }]} pointerEvents={open ? "auto" : "none"}>
        <Animated.View style={[st.panelContent, { transform: [{ translateY: contentTranslateY }] }]}>
          {/* Title */}
          <Animated.View style={[st.titleRow, animStyle(0)]}>
            <View style={st.titleHighlight}>
              <Text style={st.titleHighlightTxt}>OFFRES</Text>
            </View>
            <Text style={st.titleTxt}> Jatek</Text>
          </Animated.View>

          {/* Subtitle */}
          <Animated.Text style={[st.subTxt, animStyle(1)]}>
            Profitez de nos formules exclusives
          </Animated.Text>

          {/* Fan of cards with sparkles */}
          <View style={st.fanArea}>
            {SPARKLES.map((sp, i) => (
              <Animated.View
                key={`sp-${i}`}
                pointerEvents="none"
                style={[
                  st.sparkle,
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
                    st.cardWrap,
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
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => openOffer(ad.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`Voir l'offre ${ad.tag}`}
                    style={[st.card, isActive && st.cardActive]}
                  >
                    <Text style={st.cardTitleTop} numberOfLines={1}>JATEK</Text>
                    <Text style={st.cardTitleBottom} numberOfLines={1}>{ad.tag}</Text>
                    <View style={[st.cardIcon, isActive && st.cardIconActive]}>
                      <Ionicons name={ad.icon} size={26} color={isActive ? "#fff" : TURQUOISE} />
                    </View>
                    <View style={[st.cardFoot, isActive && st.cardFootActive]}>
                      <Text style={st.cardFootTxt} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{ad.label}</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          {/* CTA */}
          <Animated.View style={animStyle(2)}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={st.cta}
              onPress={() => openOffer(ADS[activeIdx].key)}
            >
              <Text style={st.ctaTxt}>Découvrir les offres</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Animated.View>

      {/* Always-visible bar */}
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.85}
        style={st.bar}
      >
        <View style={st.barLeft}>
          <Ionicons name="pricetag" size={13} color={PINK} style={{ marginRight: 6 }} />
          <Text style={st.barLabel} numberOfLines={1}>Offres Jatek</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <Ionicons name="chevron-up" size={16} color={PINK} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const st = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  panelClip: {
    overflow: "hidden",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  panelContent: {
    height: PANEL_H,
    backgroundColor: "#fff",
    paddingBottom: 16,
  },
  bar: {
    height: BAR_H,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    backgroundColor: "#FFF5F8",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(233, 30, 99, 0.22)",
  },
  barLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  barLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: PINK,
    letterSpacing: 0.2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 18,
  },
  titleHighlight: {
    backgroundColor: LIME,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  titleHighlightTxt: {
    fontSize: 26,
    fontFamily: "Inter_900Black",
    color: NAVY,
    letterSpacing: -0.5,
  },
  titleTxt: {
    fontSize: 26,
    fontFamily: "Inter_900Black",
    color: NAVY,
    letterSpacing: -0.5,
  },
  subTxt: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    paddingHorizontal: 20,
    marginTop: 6,
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
    paddingHorizontal: 4,
    alignItems: "center",
    overflow: "hidden",
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
    marginTop: 10,
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
