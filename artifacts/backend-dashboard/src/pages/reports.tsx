import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { ShoppingCart, TrendingUp, CheckCircle, Store, BarChart3 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface ReportData {
  totalRevenue: number;
  totalOrders: number;
  deliveredOrders: number;
  byDay: { day: string; orders: number; revenue: number }[];
  topRestaurants: { restaurantId: number; restaurantName: string; orders: number; revenue: number }[];
}

function KpiCard({ title, value, icon: Icon, sub }: { title: string; value: string; icon: React.ElementType; sub?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

const PERIOD_OPTS = [
  { label: "7 jours", value: "7" },
  { label: "30 jours", value: "30" },
  { label: "90 jours", value: "90" },
  { label: "1 an", value: "365" },
];

export default function Reports() {
  const [days, setDays] = useState("30");

  const { data, isLoading } = useQuery<ReportData>({
    queryKey: ["backend/reports", days],
    queryFn: () => customFetch<ReportData>(`/api/backend/reports?days=${days}`),
    staleTime: 60_000,
  });

  const deliveryRate = data && data.totalOrders > 0
    ? ((data.deliveredOrders / data.totalOrders) * 100).toFixed(1)
    : "—";

  const chartData = (data?.byDay ?? []).map((d) => ({
    ...d,
    label: (() => {
      try { return format(parseISO(d.day), "dd/MM", { locale: fr }); } catch { return d.day; }
    })(),
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Rapports</h1>
        </div>
        <Tabs value={days} onValueChange={setDays}>
          <TabsList>
            {PERIOD_OPTS.map((o) => (
              <TabsTrigger key={o.value} value={o.value}>{o.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-28" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-20" /></CardContent>
            </Card>
          ))
        ) : (
          <>
            <KpiCard title="Chiffre d'affaires" value={`${(data?.totalRevenue ?? 0).toLocaleString("fr-MA")} MAD`} icon={TrendingUp} sub={`Sur ${days} jours`} />
            <KpiCard title="Commandes" value={String(data?.totalOrders ?? 0)} icon={ShoppingCart} sub={`Sur ${days} jours`} />
            <KpiCard title="Livrées" value={String(data?.deliveredOrders ?? 0)} icon={CheckCircle} sub={`Taux : ${deliveryRate}%`} />
            <KpiCard title="Restaurants actifs" value={String(data?.topRestaurants?.length ?? 0)} icon={Store} sub="Dans la période" />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Commandes par jour</CardTitle>
            <CardDescription>Nombre de commandes sur les {days} derniers jours</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : chartData.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [v, "Commandes"]} />
                  <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chiffre d'affaires par jour</CardTitle>
            <CardDescription>Revenus en MAD sur les {days} derniers jours</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : chartData.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString("fr-MA")} MAD`, "CA"]} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top restaurants</CardTitle>
          <CardDescription>Par nombre de commandes sur les {days} derniers jours</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Restaurant</TableHead>
                <TableHead className="text-right">Commandes</TableHead>
                <TableHead className="text-right">Chiffre d'affaires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.topRestaurants?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Aucune donnée.</TableCell></TableRow>
              ) : (
                data?.topRestaurants?.map((r, i) => (
                  <TableRow key={r.restaurantId}>
                    <TableCell>
                      {i < 3
                        ? <Badge variant={i === 0 ? "default" : "secondary"}>#{i + 1}</Badge>
                        : <span className="text-muted-foreground text-sm">#{i + 1}</span>
                      }
                    </TableCell>
                    <TableCell className="font-medium">{r.restaurantName}</TableCell>
                    <TableCell className="text-right">{r.orders.toLocaleString("fr-MA")}</TableCell>
                    <TableCell className="text-right font-medium">{r.revenue.toLocaleString("fr-MA")} MAD</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
