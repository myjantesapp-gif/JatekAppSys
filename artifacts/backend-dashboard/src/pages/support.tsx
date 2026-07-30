import { useListSupportTickets, getListSupportTicketsQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  closed: "Fermé",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  open: "default",
  in_progress: "secondary",
  closed: "outline",
};

export default function Support() {
  const { data: tickets, isLoading } = useListSupportTickets();
  const qc = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListSupportTicketsQueryKey() });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiFetch(`/api/support-tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => { invalidate(); toast({ title: "Statut mis à jour" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/support-tickets/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidate(); toast({ title: "Ticket supprimé" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const rows = (tickets ?? []) as any[];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Support</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Tickets de support</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Sujet</TableHead>
                <TableHead className="w-[30%]">Message</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              )) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Aucun ticket.</TableCell></TableRow>
              ) : rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm whitespace-nowrap">{t.createdAt ? format(new Date(t.createdAt), "dd MMM yyyy HH:mm") : "—"}</TableCell>
                  <TableCell>
                    <div className="font-medium">{t.userName ?? `#${t.userId}`}</div>
                    {t.userEmail && <div className="text-xs text-muted-foreground">{t.userEmail}</div>}
                  </TableCell>
                  <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                  <TableCell className="font-medium">{t.subject}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.message}</TableCell>
                  <TableCell>
                    <Select
                      value={t.status}
                      onValueChange={(v) => statusMutation.mutate({ id: t.id, status: v })}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue>
                          <Badge variant={STATUS_VARIANTS[t.status] ?? "outline"}>{STATUS_LABELS[t.status] ?? t.status}</Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
                        <SelectItem value="open">Ouvert</SelectItem>
                        <SelectItem value="in_progress">En cours</SelectItem>
                        <SelectItem value="closed">Fermé</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => { if (confirm("Supprimer ce ticket ?")) deleteMutation.mutate(t.id); }}
                      disabled={deleteMutation.isPending}
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
