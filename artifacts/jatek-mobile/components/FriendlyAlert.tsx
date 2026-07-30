import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Modal, View, Text, StyleSheet, Pressable, Animated, Easing, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const PINK = "#E91E63";

export type FriendlyTone = "info" | "warning" | "error" | "success";

export interface FriendlyAlertAction {
  label: string;
  onPress?: () => void;
  /** Optional href — if set, navigates with router.push when pressed. */
  href?: string;
  variant?: "primary" | "ghost";
}

export interface FriendlyAlertOptions {
  title: string;
  message: string;
  /** Ionicons name; if absent, derived from `tone`. */
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  tone?: FriendlyTone;
  /** Primary call-to-action button (e.g. "Se connecter", "Choisir une adresse"). */
  primary?: FriendlyAlertAction;
  /** Secondary "ghost" button (defaults to "Plus tard" if omitted). */
  secondary?: FriendlyAlertAction;
  /** Hide the secondary button entirely. */
  hideSecondary?: boolean;
  /** Auto-dismiss after N ms (used for success toasts). */
  autoDismissMs?: number;
}

interface Ctx {
  show: (opts: FriendlyAlertOptions) => void;
  hide: () => void;
}

const FriendlyAlertContext = createContext<Ctx | null>(null);

const TONE_META: Record<FriendlyTone, { color: string; bg: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = {
  info:    { color: "#0EA5E9", bg: "#E0F2FE", icon: "information-circle" },
  warning: { color: "#F59E0B", bg: "#FEF3C7", icon: "alert-circle" },
  error:   { color: "#DC2626", bg: "#FEE2E2", icon: "close-circle" },
  success: { color: "#16A34A", bg: "#DCFCE7", icon: "checkmark-circle" },
};

export function FriendlyAlertProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<FriendlyAlertOptions | null>(null);
  const [visible, setVisible] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (dismissTimer.current) { clearTimeout(dismissTimer.current); dismissTimer.current = null; }
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
      Animated.timing(scale, { toValue: 0.94, duration: 180, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
    ]).start(() => {
      setVisible(false);
      setOpts(null);
    });
  }, [fade, scale]);

  const show = useCallback((next: FriendlyAlertOptions) => {
    if (dismissTimer.current) { clearTimeout(dismissTimer.current); dismissTimer.current = null; }
    setOpts(next);
    setVisible(true);
    fade.setValue(0);
    scale.setValue(0.92);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 90 }),
    ]).start();

    if (Platform.OS !== "web") {
      const tone = next.tone ?? "info";
      const map: Record<FriendlyTone, Haptics.NotificationFeedbackType | null> = {
        info: null,
        warning: Haptics.NotificationFeedbackType.Warning,
        error: Haptics.NotificationFeedbackType.Error,
        success: Haptics.NotificationFeedbackType.Success,
      };
      const t = map[tone];
      if (t) Haptics.notificationAsync(t).catch(() => {});
      else Haptics.selectionAsync().catch(() => {});
    }

    if (next.autoDismissMs && next.autoDismissMs > 0) {
      dismissTimer.current = setTimeout(() => hide(), next.autoDismissMs);
    }
  }, [fade, scale, hide]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); }, []);

  const tone = opts?.tone ?? "info";
  const meta = TONE_META[tone];
  const iconName = opts?.icon ?? meta.icon;

  const handlePress = (action?: FriendlyAlertAction) => {
    if (!action) { hide(); return; }
    hide();
    // Defer so the modal close animation can start cleanly before navigation
    setTimeout(async () => {
      try { action.onPress?.(); } catch { /* noop */ }
      if (action.href) {
        try {
          const { router } = await import("expo-router");
          router.push(action.href as any);
        } catch { /* noop */ }
      }
    }, 60);
  };

  return (
    <FriendlyAlertContext.Provider value={{ show, hide }}>
      {children}
      <Modal transparent visible={visible} animationType="none" onRequestClose={hide} statusBarTranslucent>
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={hide} />
        </Animated.View>
        <View style={styles.center} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.card,
              { opacity: fade, transform: [{ scale }] },
            ]}
          >
            {opts && (
              <>
                <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                  <Ionicons name={iconName} size={36} color={meta.color} />
                </View>
                <Text style={styles.title}>{opts.title}</Text>
                <Text style={styles.message}>{opts.message}</Text>
                <View style={styles.actions}>
                  {!opts.hideSecondary && (
                    <Pressable
                      onPress={() => handlePress(opts.secondary)}
                      style={({ pressed }) => [styles.btnGhost, pressed && { opacity: 0.7 }]}
                    >
                      <Text style={styles.btnGhostTxt}>{opts.secondary?.label ?? "Plus tard"}</Text>
                    </Pressable>
                  )}
                  {opts.primary && (
                    <Pressable
                      onPress={() => handlePress(opts.primary)}
                      style={({ pressed }) => [
                        styles.btnPrimary,
                        { backgroundColor: meta.color },
                        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                      ]}
                    >
                      <Text style={styles.btnPrimaryTxt}>{opts.primary.label}</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>
    </FriendlyAlertContext.Provider>
  );
}

export function useFriendlyAlert(): Ctx {
  const ctx = useContext(FriendlyAlertContext);
  if (!ctx) {
    // Soft fallback to avoid crashes in screens that haven't mounted the provider.
    return { show: () => { /* noop */ }, hide: () => { /* noop */ } };
  }
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.55)",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  btnGhost: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  btnGhostTxt: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#475569",
  },
  btnPrimary: {
    flex: 1.4,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  btnPrimaryTxt: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
