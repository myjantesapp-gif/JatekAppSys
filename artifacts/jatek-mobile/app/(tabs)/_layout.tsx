import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Platform, StyleSheet, View, Text, Animated, Easing } from "react-native";
import { SvgXml } from "react-native-svg";
import { useListOrders } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import FloatingChatBot from "@/components/FloatingChatBot";

const PINK = "#E91E63";
const INACTIVE = "#B5B5B5";
const TAB_H = Platform.OS === "web" ? 84 : 72;

const ACTIVE_STATUSES = new Set([
  "pending",
  "accepted",
  "confirmed",
  "preparing",
  "ready",
  "picked_up",
  "in_transit",
  "out_for_delivery",
]);

function useActiveOrdersCount(): number {
  const { token, user } = useAuth();
  const { data } = useListOrders(
    {},
    {
      query: {
        enabled: !!token && !!user,
        refetchInterval: 15000,
      },
    } as any,
  );
  if (!data) return 0;
  return (data as any[]).filter((o) => ACTIVE_STATUSES.has(String(o.status))).length;
}

const JATEK_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="8 46 56 26">
  <g transform="translate(60,60) scale(0.78) translate(-64.5,-14)">
    <path fill="#e2186f" d="M2.2,24c1.5,0,2.4-.7,2.6-2.7l1.6-15.2h3.6l-1.6,15.2c-.4,4.5-2.1,6-6.2,6h-1.1l.4-3.3h.8ZM14.7,4H1.4l.3-3.3h13.3l-.3,3.3Z"/>
    <path fill="#e2186f" d="M25.1,8.4l.2-2.2h3.6l-1.6,15.2h-3.4l.2-1.7c-1.6,1.4-3.8,2.2-6,2.2-4.2,0-7.2-3.3-7.2-7.4s3.7-8.8,8.3-8.8,4.6,1.1,6,2.8ZM20,8.7c-3,0-5.3,2.4-5.3,5.3s2.1,4.7,4.7,4.7,5.3-2.3,5.3-5.3-2.1-4.6-4.7-4.6Z"/>
    <path fill="#e2186f" d="M35.6,9.1l-1.3,12.2h-3.6l1.3-12.2h-1.9l.3-3h1.9l.4-3.7,3.6-.8-.5,4.5h1.9l-.3,3h-1.9Z"/>
    <path fill="#fcb2d3" d="M37.7,14.3c-.3-4.8,3-9,8.2-9s6.5,2.3,7.6,5.7l.3,1.1-11.8,4.3c.8,1.6,2.5,2.6,4.9,2.6s3.4-.9,4.5-2.2l2.1,2.5c-1.6,1.7-3.6,2.9-6.9,2.9-4.9,0-8.6-3.4-9-7.8ZM41.5,13.7l8.2-3c-.8-1.5-2.1-2.2-3.7-2.2s-4.5,2-4.5,5.3Z"/>
    <path fill="#e2186f" d="M64.6,21.3l-4-6.6-1.8,1.6-.6,5h-3.6L56.9.7h3.6l-1.2,10.9,6.2-5.4h4.7l-6.8,6.2,5.4,9h-4.1Z"/>
  </g>
</svg>`;

function JatekTabIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[s.jLogo, { opacity: focused ? 1 : 0.38 }]}>
      <SvgXml xml={JATEK_LOGO_SVG} width="100%" height="100%" />
    </View>
  );
}

function OrdersTabIcon({ focused, count }: { focused: boolean; count: number }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (count > 0) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.15,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulse.setValue(1);
    }
  }, [count, pulse]);

  const color = focused ? PINK : INACTIVE;
  return (
    <Animated.View style={[s.iconWrap, { transform: [{ scale: pulse }] }]}>
      <Ionicons name="bag-handle" size={26} color={color} />
      {count > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeTxt}>{count > 9 ? "9+" : count}</Text>
        </View>
      )}
    </Animated.View>
  );
}

export default function TabLayout() {
  const ordersCount = useActiveOrdersCount();

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: PINK,
        tabBarInactiveTintColor: INACTIVE,
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 11,
          marginTop: 2,
        },
        tabBarItemStyle: { paddingTop: 6 },
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: "#EBEBEB",
          height: TAB_H,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <JatekTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Commandes",
          tabBarIcon: ({ focused }) => <OrdersTabIcon focused={focused} count={ordersCount} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => <Ionicons name="person-circle-outline" size={26} color={color} />,
        }}
      />
      {/* Hidden screens — kept for navigation but excluded from the tab bar */}
      <Tabs.Screen name="restaurants" options={{ href: null }} />
      <Tabs.Screen name="favoris" options={{ href: null }} />
      <Tabs.Screen name="deliver" options={{ href: null }} />
      <Tabs.Screen name="manage" options={{ href: null }} />
    </Tabs>
    <FloatingChatBot />
    </View>
  );
}

const s = StyleSheet.create({
  jLogo: {
    width: 72,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 36,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: PINK,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeTxt: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    lineHeight: 12,
  },
});
