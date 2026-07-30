import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Dimensions, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

type Props = {
  /** Hide the overlay after this many ms (default 1800). */
  duration?: number;
  /** Called once the fade-out animation finishes. */
  onFinish?: () => void;
};

export default function SplashOverlay({ duration = 1800, onFinish }: Props) {
  const [mounted, setMounted] = useState(true);

  const containerOpacity = useSharedValue(1);
  const bgScale = useSharedValue(1.04);

  useEffect(() => {
    // Subtle, continuous "breathing" zoom on the splash background.
    bgScale.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.04, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );

    // Schedule fade-out
    const t = setTimeout(() => {
      containerOpacity.value = withTiming(
        0,
        { duration: 500, easing: Easing.out(Easing.quad) },
        (finished) => {
          if (finished) {
            runOnJS(setMounted)(false);
            if (onFinish) runOnJS(onFinish)();
          }
        },
      );
    }, duration);

    return () => clearTimeout(t);
  }, [duration, onFinish, containerOpacity, bgScale]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));
  const bgStyle = useAnimatedStyle(() => ({ transform: [{ scale: bgScale.value }] }));

  if (!mounted) return null;

  return (
    <Animated.View style={[styles.root, containerStyle]} pointerEvents="none">
      <Animated.Image
        source={require("../assets/images/jatek-splash.png")}
        style={[styles.bg, bgStyle]}
        resizeMode="cover"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: "#E91E63",
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? { width: "100%" as any, height: "100%" as any }
      : { width: SCREEN_W, height: SCREEN_H }),
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
});
