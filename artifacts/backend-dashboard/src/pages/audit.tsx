import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, RefreshCw, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: number; userId?: number; userEmail?: string; userName?: string;
  action: string; entity?: string; entityId?: number;
  details?: Record<string, unknown>; ip?: string; createdAt: string;
}

interface AuditResponse { rows: AuditLog[]; total: number; page: number; limit: number; }

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  login: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  refund: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  cancel: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  gesture: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  export: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  import: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  reset_password: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  wallet_credit: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  db_backup: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
};

const ACTIONS = [
  "create","update","delete","login","logout","refund","cancel","gesture",
  "export","import","reset_password","assign_shop","wallet_credit","db_backup",
];
const ENTITIES = ["order","user","shop","product","category","ad","promo_code","staff","driver","system"];

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const LIMIT = 50;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(LIMIT),
    ...(actionFilter !== "all" && { action: actionFilter }),
    ...(entityFilter !== "all" && { entity: entityFilter }),
    ...(userFilter && { userId: userFilter }),
  });

  const { data, isLoading, refetch, isFetching } = useQuery<AuditResponse>({
    queryKey: ["/api/backend/audit", page, actionFilter, entityFilter, userFilter],
    queryFn: () => apiFetch(`/api/backend/audit?${params}`),
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  const handleExport = async () => {
    const a = document.createElement("a");
    a.href = `/api/backend/export/audit?format=csv`;
    a.download = `audit-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" /> Journal d'audit
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Toutes les actions effectuées sur la plateforme — {data?.total ?? "…"} entrées
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes actions</SelectItem>
                {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Entité" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes entités</SelectItem>
                {ENTITIES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              placeholder="ID utilisateur…"
              className="w-40"
              value={userFilter}
              onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Date</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden sm:table-cell">Entité</TableHead>
                <TableHead className="hidden md:table-cell">Détails</TableHead>
                <TableHead className="hidden lg:table-cell">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j} className={j > 3 ? "hidden lg:table-cell" : j > 2 ? "hidden md:table-cell" : j > 1 ? "hidden sm:table-cell" : ""}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              )) : data?.rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Aucune activité enregistrée.</TableCell></TableRow>
              ) : data?.rows.map((log) => (
                <TableRow key={log.id} className="text-sm">
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.createdAt), "dd/MM HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{log.userName ?? "Système"}</p>
                      {log.userEmail && <p className="text-xs text-muted-foreground">{log.userEmail}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-800"}`}>
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {log.entity && (
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">{log.entity}</Badge>
                        {log.entityId && <span className="text-xs text-muted-foreground">#{log.entityId}</span>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-[200px]">
                    {log.details && (
                      <code className="text-xs text-muted-foreground truncate block max-w-[200px]">
                        {JSON.stringify(log.details)}
                      </code>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground font-mono">
                    {log.ip}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {data && data.total > LIMIT && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} / {totalPages} — {data.total} entrées
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
