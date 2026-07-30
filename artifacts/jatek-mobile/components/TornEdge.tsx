import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

type Props = {
  /** Solid fallback color (used when no gradient is provided). */
  color: string;
  /** Optional gradient stops — when provided, the zigzag fill matches the header gradient. */
  gradientStops?: Array<{ offset: number; color: string }>;
  height?: number;
  position?: "top" | "bottom";
};

/**
 * Subtle zigzag edge meant to read as a continuation of the header.
 * Pass the same gradient stops as the header so colors line up perfectly.
 * Teeth are short and irregular but homogeneous (no jagged spikes).
 */
export function TornEdge({ color, gradientStops, height = 12, position = "bottom" }: Props) {
  // Gentle, fairly regular zigzag — small amplitude, slight variation in pitch.
  const teeth: Array<[number, number]> = [
    [0.0, 0.0],
    [0.05, 1.0],
    [0.1, 0.0],
    [0.16, 1.0],
    [0.22, 0.0],
    [0.28, 1.0],
    [0.34, 0.0],
    [0.4, 1.0],
    [0.46, 0.0],
    [0.52, 1.0],
    [0.58, 0.0],
    [0.64, 1.0],
    [0.7, 0.0],
    [0.76, 1.0],
    [0.82, 0.0],
    [0.88, 1.0],
    [0.94, 0.0],
    [1.0, 1.0],
  ];

  const W = 100;
  const pts = teeth.map(([x, y]) => [x * W, y * height] as [number, number]);
  const gradId = "tornEdgeGrad";

  let d: string;
  if (position === "bottom") {
    const zig = pts
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
      .join(" ");
    d = `${zig} L${W},0 L0,0 Z`;
  } else {
    const zig = pts
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${(height - y).toFixed(2)}`)
      .join(" ");
    d = `${zig} L${W},${height} L0,${height} Z`;
  }

  const fill = gradientStops ? `url(#${gradId})` : color;

  return (
    <View
      style={[
        styles.wrap,
        position === "bottom" ? { bottom: -height + 1 } : { top: -height + 1 },
        { height, pointerEvents: "none" },
      ]}
    >
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="none"
      >
        {gradientStops ? (
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              {gradientStops.map((s, i) => (
                <Stop key={i} offset={s.offset} stopColor={s.color} stopOpacity="1" />
              ))}
            </LinearGradient>
          </Defs>
        ) : null}
        <Path d={d} fill={fill} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0 },
});
