import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import type { OrderStatus } from "@/lib/api";
import {
  fireStatusNotification,
  requestNotificationPermissions,
} from "@/services/notificationService";

export function useOrderNotifications(status: OrderStatus | undefined) {
  const prevStatus = useRef<OrderStatus | undefined>(undefined);
  const permGranted = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") return;
    requestNotificationPermissions().then((granted) => {
      permGranted.current = granted;
    });
  }, []);

  useEffect(() => {
    if (!status) return;
    if (prevStatus.current === status) return;
    const wasInitialLoad = prevStatus.current === undefined;
    prevStatus.current = status;
    if (wasInitialLoad) return;
    if (permGranted.current) {
      fireStatusNotification(status).catch(console.warn);
    }
  }, [status]);
}
