import { useFonts } from "expo-font";
import { Ionicons, MaterialCommunityIcons, MaterialIcons, FontAwesome, FontAwesome5 } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useNotificationSetup } from "@/hooks/usePushNotifications";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import SplashOverlay from "@/components/SplashOverlay";
import { FriendlyAlertProvider } from "@/components/FriendlyAlert";
import { OrderStatusToast } from "@/components/OrderStatusToast";
import { getApiBaseSafe } from "@/lib/apiBase";

// Configure the API base URL — robustly resolves from EXPO_PUBLIC_DOMAIN, then
// expo-constants extra, then Metro hostUri (LAN dev). Never throws at boot.
const apiBase = getApiBaseSafe();
console.log(`[Boot] API base = ${apiBase}`);
setBaseUrl(apiBase);

// Prevent the splash screen from auto-hiding before asset loading is complete.
// Wrap in try/catch — on web (and some Expo Go reloads) preventAutoHideAsync
// can reject with "Splash screen module is not available", which would crash
// the JS bundle before any UI ever renders → infinite blue splash.
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="restaurant/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="category/[slug]" options={{ headerShown: false }} />
      <Stack.Screen name="cart" options={{ headerShown: false }} />
      <Stack.Screen name="order/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="offer/[key]" options={{ headerShown: false }} />
    </Stack>
  );
}

/**
 * Inner component rendered inside AuthProvider so it can access the live
 * auth token and pass it to useNotificationSetup for re-registration on login.
 */
function AppSetup() {
  const { token } = useAuth();
  useNotificationSetup(token);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular: require("../assets/fonts/Inter_400Regular.ttf"),
    Inter_500Medium: require("../assets/fonts/Inter_500Medium.ttf"),
    Inter_600SemiBold: require("../assets/fonts/Inter_600SemiBold.ttf"),
    Inter_700Bold: require("../assets/fonts/Inter_700Bold.ttf"),
    Inter_900Black: require("../assets/fonts/Inter_900Black.ttf"),
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
    ...MaterialIcons.font,
    ...FontAwesome.font,
    ...FontAwesome5.font,
  });
  // Hide the splash as soon as fonts are ready OR a 1.5 s safety timeout
  // elapses — whichever comes first. Without this fallback, a slow bundle
  // would leave the splash visible forever ("écran bleu" in production).
  useEffect(() => {
    let cancelled = false;
    const hide = () => {
      if (cancelled) return;
      cancelled = true;
      SplashScreen.hideAsync().catch(() => {});
    };
    if (fontsLoaded || fontError) {
      hide();
      return;
    }
    const timer = setTimeout(hide, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fontsLoaded, fontError]);

  // Render the tree immediately — system fonts are used as a fallback until
  // Inter finishes loading. Never return null here as that caused the splash
  // to hang indefinitely ("écran bleu") in production.

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppSetup />
            <LanguageProvider>
              <CartProvider>
                <GestureHandlerRootView>
                  <KeyboardProvider>
                    <FriendlyAlertProvider>
                      <RootLayoutNav />
                      <OrderStatusToast />
                      <CookieConsentBanner />
                    </FriendlyAlertProvider>
                    <SplashOverlay duration={1800} />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </CartProvider>
            </LanguageProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
