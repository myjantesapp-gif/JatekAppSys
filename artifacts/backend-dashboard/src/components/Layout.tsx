import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Store,
  Star,
  Users,
  UserCog,
  Truck,
  Tags,
  TicketPercent,
  Wallet,
  Bell,
  BarChart3,
  Shield,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  ChevronRight,
  Image,
  Activity,
  Server,
  Radio,
  AppWindow,
  LifeBuoy,
} from "lucide-react";
import { useBackendMe } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState } from "react";

type NavGroup = {
  label: string;
  items: NavItem[];
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Roles allowed to see this item. If omitted, all authenticated roles can see it. */
  roles?: string[];
  hidden?: boolean;
  /** Badge key — "pending" shows the pending orders count */
  badge?: "pending";
};

const ADMIN_ROLES = ["super_admin", "admin", "manager"];

const navGroups: NavGroup[] = [
  {
    label: "Vue d'ensemble",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Opérations",
    items: [
      { href: "/orders", label: "Commandes", icon: ShoppingCart, badge: "pending" },
      { href: "/products", label: "Produits", icon: Package },
      { href: "/categories", label: "Catégories", icon: Tags, roles: ADMIN_ROLES },
      { href: "/shops", label: "Boutiques", icon: Store },
      { href: "/reviews", label: "Avis", icon: Star },
    ],
  },
  {
    label: "Personnes",
    items: [
      { href: "/customers", label: "Clients", icon: Users, roles: ADMIN_ROLES },
      { href: "/staff", label: "Staff", icon: UserCog, roles: ADMIN_ROLES },
      { href: "/deliverymen", label: "Livreurs", icon: Truck, roles: ADMIN_ROLES },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/promotions", label: "Promotions", icon: Tags },
      { href: "/banners", label: "Bannières", icon: Image, roles: ADMIN_ROLES },
      { href: "/vouchers", label: "Codes promo", icon: TicketPercent },
      { href: "/notifications", label: "Notifications", icon: Bell, roles: ADMIN_ROLES },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/wallets", label: "Portefeuilles", icon: Wallet, roles: ADMIN_ROLES },
      { href: "/support", label: "Support", icon: LifeBuoy, roles: ADMIN_ROLES },
      { href: "/reports", label: "Rapports", icon: BarChart3 },
    ],
  },
  {
    label: "Système",
    items: [
      { href: "/live-tracking", label: "Suivi Live", icon: Radio, roles: ADMIN_ROLES },
      { href: "/app-config", label: "App Config", icon: AppWindow, roles: ADMIN_ROLES },
      { href: "/roles", label: "Rôles", icon: Shield, roles: ["super_admin"] },
      { href: "/audit", label: "Audit", icon: Activity, roles: ADMIN_ROLES },
      { href: "/monitoring", label: "Monitoring", icon: Server, roles: ADMIN_ROLES },
      { href: "/settings", label: "Paramètres", icon: Settings, roles: ADMIN_ROLES },
    ],
  },
];

function NavList({
  groups,
  location,
  showLabels = true,
  onNavigate,
  pendingCount,
  openGroups,
  onToggleGroup,
}: {
  groups: NavGroup[];
  location: string;
  showLabels?: boolean;
  onNavigate?: () => void;
  pendingCount: number;
  openGroups: Record<string, boolean>;
  onToggleGroup: (label: string) => void;
}) {
  return (
    <div className="space-y-1">
      {groups.map((group, idx) => {
        const isOpen = openGroups[group.label] !== false;
        return (
          <div key={idx}>
            {showLabels && (
              <button
                className="w-full flex items-center justify-between px-6 py-1.5 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider hover:text-sidebar-foreground/80 transition-colors"
                onClick={() => onToggleGroup(group.label)}
              >
                {group.label}
                {isOpen
                  ? <ChevronDown className="h-3 w-3" />
                  : <ChevronRight className="h-3 w-3" />}
              </button>
            )}
            {isOpen && (
              <div className="space-y-0.5 px-3 mb-2">
                {group.items.map((item) => {
                  const isActive = location === item.href;
                  const badge = item.badge === "pending" && pendingCount > 0 ? pendingCount : 0;
                  return (
                    <Link key={item.href} href={item.href} className="block" onClick={onNavigate}>
                      <div
                        className={`relative flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                        } ${!showLabels && "justify-center"}`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                        )}
                        <item.icon className={`h-4 w-4 shrink-0 ${showLabels ? "mr-3" : ""}`} />
                        {showLabels && <span className="flex-1">{item.label}</span>}
                        {showLabels && badge > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white px-1">
                            {badge > 99 ? "99+" : badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: me } = useBackendMe();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Collapsible group state — persisted in localStorage
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("jatek_nav_groups") ?? "{}");
    } catch {
      return {};
    }
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [label]: prev[label] === false ? true : false };
      localStorage.setItem("jatek_nav_groups", JSON.stringify(next));
      return next;
    });
  };

  // Pending orders count for badge — poll every 30s
  const { data: pendingOrders } = useQuery<any[]>({
    queryKey: ["/api/backend/orders", "pending-badge"],
    queryFn: () => apiFetch("/api/backend/orders?status=pending&limit=50"),
    refetchInterval: 30_000,
    enabled: !!me,
    staleTime: 25_000,
  });
  const pendingCount = pendingOrders?.length ?? 0;

  if (!me) return null;

  const role = me.user.role;

  const handleLogout = () => {
    localStorage.removeItem("jatek_backend_token");
    setLocation("/login");
  };

  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.hidden && (!item.roles || item.roles.includes(role))
      ),
    }))
    .filter((group) => group.items.length > 0);

  const navListProps = { pendingCount, openGroups, onToggleGroup: toggleGroup };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } transition-all duration-300 border-r border-border bg-sidebar flex-col hidden md:flex`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          {sidebarOpen && (
            <span className="font-black text-xl text-primary tracking-tight">Jatek Admin</span>
          )}
          {!sidebarOpen && (
            <span className="font-black text-xl text-primary tracking-tight mx-auto">J</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-sidebar-foreground shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <NavList
            groups={filteredGroups}
            location={location}
            showLabels={sidebarOpen}
            {...navListProps}
          />
        </div>
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border flex flex-col">
          <SheetHeader className="h-16 shrink-0 flex flex-row items-center justify-start px-6 border-b border-sidebar-border space-y-0">
            <SheetTitle className="font-black text-xl text-primary tracking-tight text-left">
              Jatek Admin
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto min-h-0 py-4">
            <NavList
              groups={filteredGroups}
              location={location}
              showLabels
              onNavigate={() => setMobileOpen(false)}
              {...navListProps}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-border bg-card gap-2">
          <div className="flex items-center md:hidden gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            {(() => {
              const allItems = navGroups.flatMap((g) => g.items);
              const active = allItems.find((item) => item.href === location);
              return active ? (
                <span className="font-semibold text-base truncate">{active.label}</span>
              ) : (
                <span className="font-black text-xl text-primary tracking-tight">Jatek</span>
              );
            })()}
          </div>
          <div className="flex-1" />
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 flex items-center justify-start space-x-3 px-3 hover:bg-accent rounded-full border border-border"
                >
                  <Avatar className="h-7 w-7 border border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                      {me.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-semibold leading-none">{me.user.name}</span>
                    <span className="text-xs text-muted-foreground capitalize leading-none mt-1">
                      {me.user.role.replace("_", " ")}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Déconnexion</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Demo: Switch Role
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => {
                    localStorage.removeItem("jatek_backend_token");
                    setLocation("/login");
                  }}
                >
                  Aller à la connexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-background p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
