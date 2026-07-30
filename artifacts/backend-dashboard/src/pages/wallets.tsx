import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Store, Truck, TrendingUp } from "lucide-react";

interface WalletData {
  restaurants: {
    restaurantId: number;
    restaurantName: string;
    totalOrders: number;
    grossRevenue: number;
    deliveryFees: number;
    totalRevenue: number;
  }[];
  drivers: {
    driverId: number | null;
    driverName: string;
    driverPhone: string | null;
    totalDeliveries: number;
    totalEarnings: number;
  }[];
}

function SummaryCard({ title, value, icon: Icon, sub }: { title: string; value: string; icon: React.ElementType; sub?: string }) {
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

export default function Wallets() {
  const [tab, setTab] = useState("restaurants");

  const { data, isLoading } = useQuery<WalletData>({
    queryKey: ["backend/wallets"],
    queryFn: () => customFetch<WalletData>("/api/backend/wallets"),
    staleTime: 60_000,
  });

  const totalRestaurantRevenue = data?.restaurants.reduce((s, r) => s + r.totalRevenue, 0) ?? 0;
  const totalDriverEarnings = data?.drivers.reduce((s, d) => s + d.totalEarnings, 0) ?? 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Wallet className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Portefeuilles</h1>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-28" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-24" /></CardContent>
            </Card>
          ))
        ) : (
          <>
            <SummaryCard title="CA restaurants" value={`${totalRestaurantRevenue.toLocaleString("fr-MA")} MAD`} icon={TrendingUp} sub="Commandes livrées" />
            <SummaryCard title="Restaurants" value={String(data?.restaurants.length ?? 0)} icon={Store} sub="Avec des livraisons" />
            <SummaryCard title="Gains livreurs" value={`${totalDriverEarnings.toLocaleString("fr-MA")} MAD`} icon={TrendingUp} sub="Frais de livraison cumulés" />
            <SummaryCard title="Livreurs actifs" value={String(data?.drivers.length ?? 0)} icon={Truck} sub="Avec des livraisons" />
          </>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="restaurants"><Store className="h-4 w-4 mr-2" />Restaurants</TabsTrigger>
          <TabsTrigger value="drivers"><Truck className="h-4 w-4 mr-2" />Livreurs</TabsTrigger>
        </TabsList>

        <TabsContent value="restaurants" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenus par restaurant</CardTitle>
              <CardDescription>Basé sur les commandes avec statut "livré"</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Restaurant</TableHead>
                    <TableHead className="text-right">Commandes</TableHead>
                    <TableHead className="text-right">Sous-total</TableHead>
                    <TableHead className="text-right">Frais livraison</TableHead>
                    <TableHead className="text-right">Total TTC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : data?.restaurants.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Aucune donnée.</TableCell></TableRow>
                  ) : (
                    data?.restaurants.map((r) => (
                      <TableRow key={r.restaurantId}>
                        <TableCell className="font-medium">{r.restaurantName}</TableCell>
                        <TableCell className="text-right">{r.totalOrders.toLocaleString("fr-MA")}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{r.grossRevenue.toLocaleString("fr-MA")} MAD</TableCell>
                        <TableCell className="text-right text-muted-foreground">{r.deliveryFees.toLocaleString("fr-MA")} MAD</TableCell>
                        <TableCell className="text-right font-semibold">{r.totalRevenue.toLocaleString("fr-MA")} MAD</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drivers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Gains par livreur</CardTitle>
              <CardDescription>Frais de livraison cumulés sur les commandes livrées</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Livreur</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead className="text-right">Livraisons</TableHead>
                    <TableHead className="text-right">Gains totaux</TableHead>
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
                  ) : data?.drivers.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Aucune donnée.</TableCell></TableRow>
                  ) : (
                    data?.drivers.map((d) => (
                      <TableRow key={d.driverId}>
                        <TableCell className="font-medium">{d.driverName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{d.driverPhone ?? "—"}</TableCell>
                        <TableCell className="text-right">{d.totalDeliveries.toLocaleString("fr-MA")}</TableCell>
                        <TableCell className="text-right font-semibold">{d.totalEarnings.toLocaleString("fr-MA")} MAD</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
