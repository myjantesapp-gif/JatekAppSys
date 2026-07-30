import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthTokenGetter, useBackendMe } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import { AuthGate } from "@/components/AuthGate";
import { Layout } from "@/components/Layout";
import { ADMIN_ONLY_PATHS } from "@/components/RoleGuard";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/orders";
import Products from "@/pages/products";
import Categories from "@/pages/categories";
import Shops from "@/pages/shops";
import Reviews from "@/pages/reviews";
import Customers from "@/pages/customers";
import Staff from "@/pages/staff";
import Deliverymen from "@/pages/deliverymen";
import Roles from "@/pages/roles";
import Promotions from "@/pages/promotions";
import Vouchers from "@/pages/vouchers";
import Wallets from "@/pages/wallets";
import Notifications from "@/pages/notifications";
import Reports from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import Banners from "@/pages/banners";
import AuditPage from "@/pages/audit";
import Monitoring from "@/pages/monitoring";
import LiveTracking from "@/pages/live-tracking";
import AppConfig from "@/pages/app-config";
import Support from "@/pages/support";

const queryClient = new QueryClient();

setAuthTokenGetter(() => localStorage.getItem("jatek_backend_token"));

/**
 * Wraps a route component so that restaurant_owner users are redirected to "/"
 * if they try to access an admin-only path.
 */
function AdminRoute({ path, component: Component }: { path: string; component: React.ComponentType }) {
  const { data: me } = useBackendMe();
  const role = me?.user?.role;

  if (role === "restaurant_owner" && ADMIN_ONLY_PATHS.has(path)) {
    return <Route path={path}><Redirect to="/" /></Route>;
  }
  return <Route path={path} component={Component} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route>
        <AuthGate>
          <Layout>
            <Switch>
              {/* Routes accessible to all authenticated staff */}
              <Route path="/" component={Dashboard} />
              <Route path="/orders" component={Orders} />
              <Route path="/products" component={Products} />
              <Route path="/categories" component={Categories} />
              <Route path="/shops" component={Shops} />
              <Route path="/reviews" component={Reviews} />
              <Route path="/promotions" component={Promotions} />
              <Route path="/vouchers" component={Vouchers} />
              <Route path="/reports" component={Reports} />

              {/* Admin-only routes — restaurant_owner is redirected to "/" */}
              <AdminRoute path="/customers" component={Customers} />
              <AdminRoute path="/staff" component={Staff} />
              <AdminRoute path="/deliverymen" component={Deliverymen} />
              <AdminRoute path="/roles" component={Roles} />
              <AdminRoute path="/wallets" component={Wallets} />
              <AdminRoute path="/notifications" component={Notifications} />
              <AdminRoute path="/banners" component={Banners} />
              <AdminRoute path="/audit" component={AuditPage} />
              <AdminRoute path="/monitoring" component={Monitoring} />
              <AdminRoute path="/live-tracking" component={LiveTracking} />
              <AdminRoute path="/settings" component={SettingsPage} />
              <AdminRoute path="/app-config" component={AppConfig} />
              <AdminRoute path="/support" component={Support} />

              <Route component={NotFound} />
            </Switch>
          </Layout>
        </AuthGate>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
