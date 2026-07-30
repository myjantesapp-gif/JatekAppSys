import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useColors } from "@/hooks/useColors";
import type { Order, OrderStatus } from "@/lib/api";

type Coord = { latitude: number; longitude: number };

const HEADING_TO_PICKUP: OrderStatus[] = ["accepted", "arrived_pickup"];

interface Props {
  order: Pick<Order, "restaurantName" | "pickupAddress" | "dropoffAddress" | "pickupLat" | "pickupLng" | "dropoffLat" | "dropoffLng" | "customerName" | "status">;
  style?: object;
}

export function DeliveryMap({ order, style }: Props) {
  const colors = useColors();
  const mapRef = useRef<MapView>(null);
  const [driverPos, setDriverPos] = useState<Coord | null>(null);

  const pickup: Coord = { latitude: order.pickupLat, longitude: order.pickupLng };
  const dropoff: Coord = { latitude: order.dropoffLat, longitude: order.dropoffLng };
  const toPickup = HEADING_TO_PICKUP.includes(order.status as OrderStatus);
  const activeTarget = toPickup ? pickup : dropoff;

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const pos = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setDriverPos(pos);
      fitMap(mapRef, pos, activeTarget);
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 8 },
        (loc) => {
          const next = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setDriverPos(next);
          fitMap(mapRef, next, activeTarget);
        },
      );
    })();
    return () => { sub?.remove(); };
  }, []);

  useEffect(() => {
    if (driverPos) fitMap(mapRef, driverPos, activeTarget);
  }, [order.status]);

  const midLat = (pickup.latitude + dropoff.latitude) / 2;
  const midLng = (pickup.longitude + dropoff.longitude) / 2;
  const deltaLat = Math.abs(pickup.latitude - dropoff.latitude) * 2.5 + 0.015;
  const deltaLng = Math.abs(pickup.longitude - dropoff.longitude) * 2.5 + 0.015;

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{ latitude: midLat || 33.5731, longitude: midLng || -7.5898, latitudeDelta: deltaLat, longitudeDelta: deltaLng }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsTraffic={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        <Marker coordinate={pickup} title={order.restaurantName} description={order.pickupAddress} pinColor={colors.info} />
        <Marker coordinate={dropoff} title={order.customerName} description={order.dropoffAddress} pinColor={colors.primary} />
        {driverPos && <Marker coordinate={driverPos} title="Vous êtes ici" pinColor="#1A73E8" />}
        <Polyline coordinates={[pickup, dropoff]} strokeColor={colors.border} strokeWidth={2} lineDashPattern={[6, 4]} />
        {driverPos && <Polyline coordinates={[driverPos, activeTarget]} strokeColor={toPickup ? colors.info : colors.primary} strokeWidth={4} lineDashPattern={[10, 5]} />}
      </MapView>
      <View style={[styles.legend, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <LegendDot color={colors.info} label="Commerçant" colors={colors} />
        <LegendDot color={colors.primary} label="Client" colors={colors} />
        <LegendDot color="#1A73E8" label="Vous" colors={colors} />
      </View>
    </View>
  );
}

function LegendDot({ color, label, colors }: { color: string; label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function fitMap(ref: React.RefObject<MapView | null>, driver: Coord, target: Coord) {
  try { ref.current?.fitToCoordinates([driver, target], { edgePadding: { top: 60, right: 40, bottom: 60, left: 40 }, animated: true }); } catch (_) {}
}

const styles = StyleSheet.create({
  container: { height: 240, borderRadius: 16, overflow: "hidden" },
  map: { flex: 1 },
  legend: { position: "absolute", bottom: 8, left: 8, flexDirection: "row", gap: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontFamily: "Inter_500Medium" },
});
