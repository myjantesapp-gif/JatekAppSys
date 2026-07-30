/**
 * Notifications screen — two tabs:
 *  1. "Centre" — ordered list of push/order notifications, mark as read, tap to open order
 *  2. "Préférences" — the existing push/email/SMS toggle switches
 */
import React, { useEffect, useState, useCallback, type ComponentProps } from "react";
import {
  View, Text, StyleSheet, Switch, ActivityIndicator, Alert,
  FlatList, TouchableOpacity, RefreshControl, Pressable,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ProfileScreenLayout from "@/components/ProfileScreenLayout";
import { useColors } from "@/hooks/useColors";
import { useT } from "@/contexts/LanguageContext";
import type { TKey } from "@/lib/translations";
import {
  fetchNotifPrefs, updateNotifPrefs, type NotifPrefs,
  listNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification,
  type AppNotification,
} from "@/lib/api";

const PREFS_ROWS: Array<{ key: keyof NotifPrefs; labelKey: TKey; descKey: TKey }> = [
  { key: "pushOrders",       labelKey: "notif_pref_orders",    descKey: "notif_pref_orders_desc" },
  { key: "pushPromos",       labelKey: "notif_pref_promos",    descKey: "notif_pref_promos_desc" },
  { key: "emailReceipts",    labelKey: "notif_pref_receipts",  descKey: "notif_pref_receipts_desc" },
  { key: "emailNewsletter",  labelKey: "notif_pref_newsletter",descKey: "notif_pref_newsletter_desc" },
  { key: "smsAlerts",        labelKey: "notif_pref_sms",       descKey: "notif_pref_sms_desc" },
];


function timeAgo(iso: string, t: ReturnType<typeof useT>): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return t("time_just_now");
  if (diff < 3600) return t("time_minutes_ago", { n: Math.floor(diff / 60) });
  if (diff < 86400) return t("time_hours_ago", { n: Math.floor(diff / 3600) });
  return t("time_days_ago", { n: Math.floor(diff / 86400) });
}

type IoniconName = ComponentProps<typeof Ionicons>["name"];

function NotifIcon({ type }: { type: string }) {
  const colors = useColors();
  const iconMap: Record<string, { name: IoniconName; color: string }> = {
    order_status: { name: "bicycle",        color: colors.primary },
    promo:        { name: "pricetag",       color: colors.turquoise },
    referral:     { name: "gift",           color: "#8B5CF6" },
    chat:         { name: "chatbubble",     color: "#3B82F6" },
    system:       { name: "notifications",  color: colors.mutedForeground },
  };
  const { name, color } = iconMap[type] ?? iconMap.system;
  return (
    <View style={[styles.notifIcon, { backgroundColor: color + "18" }]}>
      <Ionicons name={name} size={18} color={color} />
    </View>
  );
}

function NotificationItem({
  item,
  onRead,
  onDelete,
}: {
  item: AppNotification;
  onRead: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const colors = useColors();
  const t = useT();
  const isUnread = !item.readAt;

  const handlePress = () => {
    if (isUnread) onRead(item.id);
    const orderId = (item.data as Record<string, unknown> | null)?.orderId as number | undefined;
    if (orderId) {
      router.push({ pathname: "/order/[id]", params: { id: String(orderId) } });
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Supprimer",
      "Supprimer cette notification ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => onDelete(item.id) },
      ],
    );
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleDelete}
      style={({ pressed }) => [
        styles.notifRow,
        {
          backgroundColor: isUnread
            ? colors.primary + "08"
            : colors.card,
          borderBottomColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <NotifIcon type={item.type} />
      <View style={styles.notifBody}>
        <View style={styles.notifTitleRow}>
          <Text style={[styles.notifTitle, { color: colors.foreground }, isUnread && styles.notifTitleBold]} numberOfLines={1}>
            {item.title}
          </Text>
          {isUnread && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
        </View>
        <Text style={[styles.notifText, { color: colors.mutedForeground }]} numberOfLines={2}>{item.body}</Text>
        <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>{timeAgo(item.createdAt, t)}</Text>
      </View>
      <TouchableOpacity onPress={handleDelete} hitSlop={12} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
    </Pressable>
  );
}

function CenterTab() {
  const colors = useColors();
  const t = useT();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await listNotifications();
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de charger les notifications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRead = useCallback(async (id: number) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
    try { await markNotificationRead(id); } catch {}
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try { await deleteNotification(id); } catch {}
  }, []);

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    try { await markAllNotificationsRead(); } catch {}
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {unreadCount > 0 && (
        <TouchableOpacity
          style={[styles.markAllBtn, { borderBottomColor: colors.border }]}
          onPress={handleMarkAllRead}
        >
          <Ionicons name="checkmark-done" size={14} color={colors.primary} />
          <Text style={[styles.markAllText, { color: colors.primary }]}>
            {t("notif_mark_all_read")} ({unreadCount})
          </Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <NotificationItem item={item} onRead={handleRead} onDelete={handleDelete} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t("notif_empty")}</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>{t("notif_empty_sub")}</Text>
          </View>
        }
        contentContainerStyle={notifications.length === 0 ? { flex: 1 } : undefined}
      />
    </View>
  );
}

function PrefsTab() {
  const colors = useColors();
  const t = useT();
  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifPrefs().then(setPrefs).catch((e) => Alert.alert("Erreur", e?.message ?? "Impossible de charger.")).finally(() => setLoading(false));
  }, []);

  const toggle = async (key: keyof NotifPrefs) => {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] } as NotifPrefs;
    setPrefs(next);
    try {
      const patch: Partial<NotifPrefs> = {};
      patch[key] = next[key] as never;
      await updateNotifPrefs(patch);
    } catch (e: unknown) {
      setPrefs(prefs);
      const msg = e instanceof Error ? e.message : "Échec de la mise à jour.";
      Alert.alert("Erreur", msg);
    }
  };

  if (loading || !prefs) {
    return (
      <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
    );
  }

  return (
    <View style={{ padding: 16 }}>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {PREFS_ROWS.map((r, i) => {
          return (
            <View key={r.key as string} style={[
              styles.prefRow,
              i < PREFS_ROWS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }
            ]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.prefLabel, { color: colors.heading }]}>{t(r.labelKey)}</Text>
                <Text style={[styles.prefDesc, { color: colors.mutedForeground }]}>{t(r.descKey)}</Text>
              </View>
              <Switch
                value={!!prefs[r.key]}
                onValueChange={() => toggle(r.key)}
                trackColor={{ false: "#ccc", true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const colors = useColors();
  const t = useT();
  const [tab, setTab] = useState<"center" | "prefs">("center");

  return (
    <ProfileScreenLayout title={t("notif_center_title")}>
      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {(["center", "prefs"] as const).map((key) => {
          const label = key === "center" ? t("notif_notifs_tab") : t("notif_prefs_tab");
          const active = tab === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.tab, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setTab(key)}
            >
              <Text style={[styles.tabText, { color: active ? colors.primary : colors.mutedForeground }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flex: 1 }}>
        {tab === "center" ? <CenterTab /> : <PrefsTab />}
      </View>
    </ProfileScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: -StyleSheet.hairlineWidth,
  },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  notifRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  notifIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  notifBody: { flex: 1 },
  notifTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  notifTitle: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  notifTitleBold: { fontFamily: "Inter_700Bold" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  notifText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginBottom: 4 },
  notifTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  deleteBtn: { padding: 4 },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  markAllText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  section: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  prefRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  prefLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  prefDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
