import { useLocation, Redirect } from "wouter";
import { useBackendMe } from "@workspace/api-client-react";

/** Routes that are restricted to admin-level roles only (not restaurant_owner). */
export const ADMIN_ONLY_PATHS = new Set([
  "/staff",
  "/roles",
  "/wallets",
  "/audit",
  "/monitoring",
  "/settings",
  "/notifications",
  "/customers",
  "/deliverymen",
  "/banners",
  "/live-tracking",
  "/app-config",
  "/support",
]);

/**
 * Wraps a route's children and redirects restaurant_owner users away from
 * admin-only pages.
 */
export function RoleGuard({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: me } = useBackendMe();

  if (!me) return null;

  const role = me.user.role;

  if (role === "restaurant_owner" && ADMIN_ONLY_PATHS.has(location)) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}
