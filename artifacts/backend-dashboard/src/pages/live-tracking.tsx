import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Radio, Truck, ShoppingCart, Clock, MapPin, RefreshCw } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";

interface LiveOrder {
  id: number;
  reference: string | null;
  status: string;
  total: number;
  createdAt: string;
  restaurantName: string;
  userName: string;
  deliveryAddress: string;
  driverId: number | null;
  driverName: string | null;
  driverPhone: string | null;
  driverLat: number | null;
  driverLng: number | null;
  driverLastSeen: number | null;
  driverIsOnline: boolean;
  eta: number | null;
}

interface LiveTrackingData {
  activeOrders: LiveOrder[];
  onlineDriversCount: number;
  totalActiveCount: number;
  pendingCount: number;
  enRouteCount: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  accepted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  preparing: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  ready: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  picked_up: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  en_route: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  accepted: "Accepté",
  preparing: "En préparation",
  ready: "Prêt",
  picked_up: "Récupéré",
  en_route: "En route",
};

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string | number; sub?: string;
  icon: React.ElementType; color?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color ?? "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function LiveTracking() {
  const { data, isLoading, dataUpdatedAt } = useQuery<LiveTrackingData>({
    queryKey: ["backend/live-tracking"],
    queryFn: () => apiFetch("/api/backend/live-tracking"),
    refetchInterval: 10_000,
    staleTime: 8_000,
  });

  const lastUpdate = dataUpdatedAt ? format(new Date(dataUpdatedAt), "HH:mm:ss") : "—";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Radio className="h-7 w-7 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Suivi en direct</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Commandes actives et positions des livreurs</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5" />
          Actualisation auto · Dernière mise à jour : {lastUpdate}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-28" /></CardHeader><CardContent><Skeleton className="h-8 w-16" /></CardContent></Card>
        )) : (
          <>
            <StatCard title="Commandes actives" value={data?.totalActiveCount ?? 0} sub="Toutes étapes" icon={ShoppingCart} color="text-primary" />
            <StatCard title="En attente" value={data?.pendingCount ?? 0} sub="Non encore acceptées" icon={Clock} color="text-yellow-500" />
            <StatCard title="En livraison" value={data?.enRouteCount ?? 0} sub="picked_up + en_route" icon={Truck} color="text-violet-500" />
            <StatCard title="Livreurs en ligne" value={data?.onlineDriversCount ?? 0} sub="GPS actif < 30 s" icon={Radio} color="text-green-500" />
          </>
        )}
      </div>

      {/* Orders table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Commandes en cours ({data?.activeOrders.length ?? "…"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Réf.</TableHead>
                <TableHead>Depuis</TableHead>
                <TableHead className="hidden sm:table-cell">Restaurant</TableHead>
                <TableHead className="hidden md:table-cell">Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden lg:table-cell">Livreur</TableHead>
                <TableHead className="hidden lg:table-cell">GPS / ETA</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {[48, 64, 128, 120, 80, 100, 80, 60].map((w, j) => (
                    <TableCell key={j} className={j === 2 ? "hidden sm:table-cell" : j === 3 ? "hidden md:table-cell" : j >= 5 ? "hidden lg:table-cell" : ""}>
                      <Skeleton className="h-4" style={{ width: w }} />
                    </TableCell>
                  ))}
                </TableRow>
              )) : data?.activeOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <ShoppingCart className="h-8 w-8 opacity-30" />
                      <span>Aucune commande active en ce moment</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data?.activeOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono font-semibold text-sm">
                    #{order.reference ?? order.id}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(order.createdAt), { locale: fr, addSuffix: false })}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell font-medium text-sm">{order.restaurantName}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{order.userName}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-800"}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {order.driverName ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{order.driverName}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${order.driverIsOnline ? "bg-green-500" : "bg-gray-400"}`} />
                          <span className="text-xs text-muted-foreground">{order.driverIsOnline ? "En ligne" : "Hors ligne"}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Non assigné</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {order.driverLat && order.driverLng ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{order.driverLat.toFixed(4)}, {order.driverLng.toFixed(4)}</span>
                        </div>
                        {order.eta !== null && (
                          <span className="text-xs font-medium text-primary">ETA {order.eta} min</span>
                        )}
                        {order.driverLastSeen && (
                          <span className="text-xs text-muted-foreground/70">
                            {formatDistanceToNow(new Date(order.driverLastSeen), { locale: fr, addSuffix: true })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm">{order.total} DH</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
