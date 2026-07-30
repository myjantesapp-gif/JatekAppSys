import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, Cpu, HardDrive, Server, Database, RefreshCw,
  Download, CheckCircle, AlertTriangle, Clock, Boxes,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SystemInfo {
  uptime: number; uptimeHuman: string; nodeVersion: string; environment: string;
  /** Configured via --max-old-space-size in the start script (MB). */
  heapMaxConfigured?: number;
  memory: { heapUsed: number; heapTotal: number; rss: number; external: number; systemTotal: number; systemFree: number; systemUsedPercent: number };
  cpu: { loadAvg1: number; loadAvg5: number; loadAvg15: number; cores: number; model: string };
  platform: string; arch: string; hostname: string;
  database: { orders: number; users: number; products: number; restaurants: number; auditLogs: number };
  timestamp: string;
}

function fmt(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function ProgressBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full bg-muted rounded-full h-2 mt-1">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color = "text-primary" }: { icon: any; label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-primary/10 ${color}`}><Icon className="h-5 w-5" /></div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Monitoring() {
  const { toast } = useToast();
  const [backupLoading, setBackupLoading] = useState(false);

  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery<SystemInfo>({
    queryKey: ["/api/backend/system"],
    queryFn: () => apiFetch("/api/backend/system"),
    refetchInterval: 30_000,
  });

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const token = localStorage.getItem("jatek_backend_token");
      const res = await fetch("/api/backend/db/backup", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Backup échoué");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `backup-${Date.now()}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Sauvegarde téléchargée ✓" });
    } catch (e: any) {
      toast({ title: "Erreur backup", description: e?.message, variant: "destructive" });
    } finally {
      setBackupLoading(false);
    }
  };

  const loadPct = data ? Math.min(100, Math.round((data.cpu.loadAvg1 / data.cpu.cores) * 100)) : 0;
  const memPct = data?.memory.systemUsedPercent ?? 0;
  const HEAP_MAX_BYTES = (data?.heapMaxConfigured ?? 512) * 1024 * 1024;
  const heapPct = data ? Math.min(100, Math.round((data.memory.heapUsed / HEAP_MAX_BYTES) * 100)) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" /> Monitoring système
          </h1>
          {dataUpdatedAt > 0 && (
            <p className="text-muted-foreground text-sm mt-1">
              Mis à jour {new Date(dataUpdatedAt).toLocaleTimeString()} — actualisation auto 30s
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Actualiser
          </Button>
          <Button size="sm" onClick={handleBackup} disabled={backupLoading}>
            <Download className={`h-4 w-4 mr-2 ${backupLoading ? "animate-bounce" : ""}`} />
            {backupLoading ? "Sauvegarde…" : "Sauvegarder la BDD"}
          </Button>
        </div>
      </div>

      {/* Status banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${isLoading ? "bg-muted" : "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"}`}>
        {isLoading ? <Skeleton className="h-4 w-4 rounded-full" /> : <CheckCircle className="h-5 w-5 text-green-600" />}
        <span className="text-sm font-medium">
          {isLoading ? "Chargement…" : `Serveur opérationnel — uptime ${data?.uptimeHuman}`}
        </span>
        {data && (
          <Badge variant="outline" className="ml-auto">
            Node {data.nodeVersion} · {data.platform}/{data.arch}
          </Badge>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Clock} label="Uptime" value={isLoading ? "…" : data!.uptimeHuman} sub={data?.environment} />
        <KpiCard icon={Cpu} label="CPU (1m avg)" value={isLoading ? "…" : `${loadPct}%`} sub={`${data?.cpu.cores ?? "?"} cœurs`} color="text-blue-600" />
        <KpiCard icon={HardDrive} label="RAM système" value={isLoading ? "…" : `${memPct}%`} sub={data ? `${fmt(data.memory.systemFree)} libre` : ""} color="text-orange-600" />
        <KpiCard icon={Server} label="Heap Node.js" value={isLoading ? "…" : `${fmt(data!.memory.heapUsed)}`} sub={data ? `/ ${data.heapMaxConfigured ?? 512} MB max` : ""} color="text-purple-600" />
      </div>

      {/* CPU + Memory charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Cpu className="h-4 w-4" /> CPU Load Average</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? <Skeleton className="h-24 w-full" /> : (
              <>
                {[["1 min", data!.cpu.loadAvg1], ["5 min", data!.cpu.loadAvg5], ["15 min", data!.cpu.loadAvg15]].map(([label, val]) => (
                  <div key={String(label)}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-mono font-medium">{Number(val).toFixed(2)}</span>
                    </div>
                    <ProgressBar
                      value={Number(val)} max={data!.cpu.cores}
                      color={Number(val) / data!.cpu.cores > 0.8 ? "bg-red-500" : Number(val) / data!.cpu.cores > 0.5 ? "bg-orange-500" : "bg-primary"}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">{data!.cpu.model}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><HardDrive className="h-4 w-4" /> Mémoire</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? <Skeleton className="h-24 w-full" /> : (
              <>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">RAM système</span>
                    <span className="font-mono font-medium">{memPct}%</span>
                  </div>
                  <ProgressBar value={memPct} max={100} color={memPct > 85 ? "bg-red-500" : memPct > 65 ? "bg-orange-500" : "bg-primary"} />
                  <p className="text-xs text-muted-foreground mt-1">{fmt(data!.memory.systemTotal - data!.memory.systemFree)} utilisé / {fmt(data!.memory.systemTotal)} total</p>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Heap Node.js</span>
                    <span className="font-mono font-medium">{heapPct}%</span>
                  </div>
                  <ProgressBar value={heapPct} max={100} color={heapPct > 85 ? "bg-red-500" : "bg-blue-500"} />
                  <p className="text-xs text-muted-foreground mt-1">{fmt(data!.memory.heapUsed)} / {data!.heapMaxConfigured ?? 512} MB configuré</p>
                </div>
                <div className="text-xs text-muted-foreground">RSS: {fmt(data!.memory.rss)}</div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Database stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" /> Base de données</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-16 w-full" /> : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: "Commandes", value: data!.database.orders, icon: Boxes },
                { label: "Utilisateurs", value: data!.database.users, icon: Boxes },
                { label: "Produits", value: data!.database.products, icon: Boxes },
                { label: "Restaurants", value: data!.database.restaurants, icon: Boxes },
                { label: "Logs audit", value: data!.database.auditLogs, icon: Boxes },
              ].map(({ label, value }) => (
                <div key={label} className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-primary">{value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup section */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" /> Sauvegarde base de données
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Télécharge un dump SQL complet de la base de données via pg_dump.
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-orange-500" />
                Réservé aux super admins. Le fichier contient toutes les données.
              </p>
            </div>
            <Button onClick={handleBackup} disabled={backupLoading} variant="outline">
              <Download className={`h-4 w-4 mr-2 ${backupLoading ? "animate-bounce" : ""}`} />
              {backupLoading ? "En cours…" : "Télécharger le backup"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
