import colors from "@/constants/colors";

/**
 * Returns the design tokens. Jatek is light-only by design (Flink-style)
 * so we always return the light palette regardless of system theme.
 */
export function useColors() {
  return { ...colors.light, radius: colors.radius };
}
