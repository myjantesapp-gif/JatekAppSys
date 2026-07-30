import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ensureAlwaysLocationPermission,
  startActiveOrderTracking,
  stopLocationTracking,
  setActiveOrderForTracking,
} from "@/services/locationService";
import { getDriverLocationClient, type WsStatus } from "@/services/wsClient";

type Ctx = {
  activeOrderId: string | null;
  trackingActive: boolean;
  wsStatus: WsStatus;
  beginTracking: (orderId: string) => Promise<string | null>;
  endTracking: () => Promise<void>;
};

const ActiveOrderCtx = createContext<Ctx | undefined>(undefined);

export function ActiveOrderProvider({ children }: { children: React.ReactNode }) {
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [trackingActive, setTrackingActive] = useState(false);
  const [wsStatus, setWsStatus] = useState<WsStatus>("idle");
  const wsRef = useRef(getDriverLocationClient());

  useEffect(() => {
    const off = wsRef.current.onStatus((s) => setWsStatus(s));
    return off;
  }, []);

  const beginTracking = useCallback(async (orderId: string): Promise<string | null> => {
    const perm = await ensureAlwaysLocationPermission();
    if (!perm.granted) {
      return perm.message ?? "Permission de localisation requise pour démarrer la course.";
    }
    try {
      wsRef.current.connect().catch(() => {});
      await startActiveOrderTracking(orderId);
      setActiveOrderId(orderId);
      setTrackingActive(true);
      return null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur tracking";
      console.warn("[active-order] start failed", e);
      return msg;
    }
  }, []);

  const endTracking = useCallback(async () => {
    setActiveOrderForTracking(null);
    setActiveOrderId(null);
    try { await stopLocationTracking(true); } catch (e) { console.warn("[active-order] stop failed", e); }
    setTrackingActive(false);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ activeOrderId, trackingActive, wsStatus, beginTracking, endTracking }),
    [activeOrderId, trackingActive, wsStatus, beginTracking, endTracking],
  );

  return <ActiveOrderCtx.Provider value={value}>{children}</ActiveOrderCtx.Provider>;
}

export function useActiveOrder(): Ctx {
  const c = useContext(ActiveOrderCtx);
  if (!c) throw new Error("useActiveOrder must be used within ActiveOrderProvider");
  return c;
}
