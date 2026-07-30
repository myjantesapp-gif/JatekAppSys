import { useRouter, useSegments } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearToken, getToken, setToken as persistToken } from "@/lib/auth";
import { getMe, updatePushToken, type Me } from "@/lib/api";
import { getExpoPushToken } from "@/services/notificationService";

type AuthState = {
  ready: boolean;
  token: string | null;
  user: Me | null;
  loading: boolean;
  error: string | null;
  signIn: (token: string) => Promise<Me | null>;
  refresh: () => Promise<Me | null>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMe = useCallback(async (): Promise<Me | null> => {
    try {
      const me = await getMe();
      if (me.role !== "driver" && me.role !== "admin") {
        setError("Ce compte n'est pas un compte chauffeur.");
        await clearToken();
        setTokenState(null);
        setUser(null);
        return null;
      }
      setUser(me);
      setError(null);
      return me;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur de connexion";
      setError(msg);
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const t = await getToken();
      if (t) {
        setTokenState(t);
        setLoading(true);
        await fetchMe();
        setLoading(false);
      }
      setReady(true);
    })();
  }, [fetchMe]);

  const signIn = useCallback(async (newToken: string) => {
    setLoading(true);
    await persistToken(newToken);
    setTokenState(newToken);
    const me = await fetchMe();
    setLoading(false);
    // Register push token best-effort after login (don't await)
    getExpoPushToken()
      .then((pt) => { if (pt) updatePushToken(pt).catch(() => {}); })
      .catch(() => {});
    return me;
  }, [fetchMe]);

  const refresh = useCallback(async () => {
    if (!token) return null;
    return fetchMe();
  }, [token, fetchMe]);

  const signOut = useCallback(async () => {
    await clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ ready, token, user, loading, error, signIn, refresh, signOut }),
    [ready, token, user, loading, error, signIn, refresh, signOut],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useAuthRouting() {
  const { ready, token, user } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "(onboarding)";

    if (!token) {
      if (!inAuth) router.replace("/(auth)/login");
      return;
    }
    if (!user) return;

    const needsOnboarding =
      !user.driver ||
      user.driver.status === "pending" ||
      user.driver.status === "rejected";

    if (needsOnboarding) {
      if (!inOnboarding) router.replace("/(onboarding)/driver-onboarding");
      return;
    }

    if (inAuth || inOnboarding) router.replace("/(tabs)");
  }, [ready, token, user, segments, router]);
}
