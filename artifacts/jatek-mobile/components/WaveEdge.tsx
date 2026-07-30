import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

type GradStop = { offset: number; color: string };

type Props = {
  color: string;
  gradientStops?: GradStop[];
  height?: number;
};

/**
 * Organic irregular wave at the bottom of a coloured section.
 * Uses cubic Bézier curves to create a smooth, non-uniform wave.
 * The fill colour matches the parent header so it looks like an extension of it.
 */
export function WaveEdge({ color, gradientStops, height = 28 }: Props) {
  const H = height;
  const gradId = "waveEdgeGrad";

  // Normalised SVG path (viewBox 0 0 100 H)
  // 3 Bézier humps — different depths and x-positions for an organic feel.
  // The fill covers from top (y=0) down to the irregular wave, then closes.
  const d = [
    `M0,0 L100,0 L100,${(H * 0.36).toFixed(1)}`,
    `C85,${(H * 0.86).toFixed(1)} 70,${(H * 0.07).toFixed(1)} 55,${(H * 0.57).toFixed(1)}`,
    `C40,${(H * 1.0).toFixed(1)} 22,${(H * 0.14).toFixed(1)} 0,${(H * 0.5).toFixed(1)}`,
    "Z",
  ].join(" ");

  const fill = gradientStops ? `url(#${gradId})` : color;

  return (
    <View
      style={[
        styles.wrap,
        { bottom: -(H - 1), height: H, pointerEvents: "none" },
      ]}
    >
      <Svg
        width="100%"
        height={H}
        viewBox={`0 0 100 ${H}`}
        preserveAspectRatio="none"
      >
        {gradientStops ? (
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
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
