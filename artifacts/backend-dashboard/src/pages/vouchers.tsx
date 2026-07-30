import { useState } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useBackendMe, useListBackendShops } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, TicketPercent, Loader2 } from "lucide-react";

type PromoType = "percentage" | "fixed" | "free_delivery";

interface PromoCode {
  id: number;
  code: string;
  description: string | null;
  type: PromoType;
  value: number;
  minOrderAmount: number;
  maxUses: number | null;
  usedCount: number;
  maxUsesPerUser: number;
  firstOrderOnly: boolean;
  restaurantId: number | null;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<PromoType, string> = {
  percentage: "Pourcentage (%)",
  fixed: "Montant fixe (MAD)",
  free_delivery: "Livraison gratuite",
};

const EMPTY: Omit<PromoCode, "id" | "usedCount" | "createdAt"> = {
  code: "",
  description: "",
  type: "percentage",
  value: 0,
  minOrderAmount: 0,
  maxUses: null,
  maxUsesPerUser: 1,
  firstOrderOnly: false,
  restaurantId: null,
  isActive: true,
  expiresAt: null,
};

export default function Vouchers() {
  const { data: me } = useBackendMe();
  const { data: shops } = useListBackendShops({});
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAdmin = me?.user.role === "admin" || me?.user.role === "super_admin";

  const { data: promos, isLoading } = useQuery({
    queryKey: ["/api/promo-codes"],
    queryFn: () => apiFetch<PromoCode[]>("/api/promo-codes"),
    enabled: isAdmin,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [deleting, setDeleting] = useState<PromoCode | null>(null);
  const [saving, setSaving] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/promo-codes"] });

  const set = (k: keyof typeof form, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const createMutation = useMutation({
    mutationFn: (payload: any) => apiFetch("/api/promo-codes", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => { invalidate(); setDialogOpen(false); setForm(EMPTY); toast({ title: "Code promo créé" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; payload: any }) => apiFetch(`/api/promo-codes/${vars.id}`, { method: "PATCH", body: JSON.stringify(vars.payload) }),
    onSuccess: () => { invalidate(); setDialogOpen(false); setEditing(null); toast({ title: "Code promo mis à jour" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/promo-codes/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidate(); setDeleting(null); toast({ title: "Code promo supprimé" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setDialogOpen(true);
  };

  const openEdit = (p: PromoCode) => {
    setEditing(p);
    setForm({
      code: p.code,
      description: p.description ?? "",
      type: p.type,
      value: p.value,
      minOrderAmount: p.minOrderAmount,
      maxUses: p.maxUses,
      maxUsesPerUser: p.maxUsesPerUser,
      firstOrderOnly: p.firstOrderOnly,
      restaurantId: p.restaurantId,
      isActive: p.isActive,
      expiresAt: p.expiresAt ? p.expiresAt.slice(0, 16) : null,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast({ title: "Code requis", variant: "destructive" }); return; }
    setSaving(true);
    const payload = {
      code: form.code.toUpperCase().trim(),
      description: (form.description ?? "").trim() || undefined,
      type: form.type,
      value: Number(form.value) || 0,
      minOrderAmount: Number(form.minOrderAmount) || 0,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      maxUsesPerUser: Number(form.maxUsesPerUser) || 1,
      firstOrderOnly: form.firstOrderOnly,
      restaurantId: form.restaurantId ? Number(form.restaurantId) : null,
      isActive: form.isActive,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id);
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <h1 className="text-3xl font-bold tracking-tight">Codes promo</h1>
        <Card><CardContent className="p-8 text-center text-muted-foreground">Accès réservé aux administrateurs.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TicketPercent className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Codes promo & Vouchers</h1>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nouveau code</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Codes actifs ({promos?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Valeur</TableHead>
                <TableHead>Commande min.</TableHead>
                <TableHead>Utilisations</TableHead>
                <TableHead>Restaurant</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>)}</TableRow>
                ))
              ) : promos?.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">Aucun code promo.</TableCell></TableRow>
              ) : (
                promos?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono font-bold">{p.code}</TableCell>
                    <TableCell><Badge variant="outline">{TYPE_LABELS[p.type]}</Badge></TableCell>
                    <TableCell>{p.type === "free_delivery" ? "—" : `${p.value}${p.type === "percentage" ? "%" : " MAD"}`}</TableCell>
                    <TableCell>{p.minOrderAmount} MAD</TableCell>
                    <TableCell>{p.usedCount}{p.maxUses ? ` / ${p.maxUses}` : " / ∞"} (max {p.maxUsesPerUser}/user)</TableCell>
                    <TableCell>{p.restaurantId ? shops?.find((s) => s.id === p.restaurantId)?.name || `#${p.restaurantId}` : "Plateforme"}</TableCell>
                    <TableCell>{p.expiresAt ? new Date(p.expiresAt).toLocaleDateString("fr-FR") : "—"}</TableCell>
                    <TableCell><Badge variant={p.isActive ? "default" : "secondary"}>{p.isActive ? "Actif" : "Inactif"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleting(p)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le code" : "Nouveau code promo"}</DialogTitle>
            <DialogDescription>Créez un code de réduction valide sur toute la plateforme ou pour un seul restaurant.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Code *</Label><Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="JATEK20" /></div>
              <div className="grid gap-1.5"><Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5"><Label>Description</Label><Input value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Ex: 20% sur la première commande" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>{form.type === "percentage" ? "Valeur (%)" : form.type === "fixed" ? "Valeur (MAD)" : "Valeur"}</Label><Input type="number" value={form.value} onChange={(e) => set("value", e.target.value)} disabled={form.type === "free_delivery"} /></div>
              <div className="grid gap-1.5"><Label>Commande minimum (MAD)</Label><Input type="number" value={form.minOrderAmount} onChange={(e) => set("minOrderAmount", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Utilisations max (vide = illimité)</Label><Input type="number" value={form.maxUses ?? ""} onChange={(e) => set("maxUses", e.target.value ? Number(e.target.value) : null)} /></div>
              <div className="grid gap-1.5"><Label>Max par utilisateur</Label><Input type="number" value={form.maxUsesPerUser} onChange={(e) => set("maxUsesPerUser", Number(e.target.value))} /></div>
            </div>
            <div className="grid gap-1.5"><Label>Restaurant</Label>
              <Select value={form.restaurantId ? String(form.restaurantId) : "platform"} onValueChange={(v) => set("restaurantId", v === "platform" ? null : Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform">Toute la plateforme</SelectItem>
                  {shops?.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>Expiration</Label><Input type="datetime-local" value={form.expiresAt ?? ""} onChange={(e) => set("expiresAt", e.target.value ? e.target.value : null)} /></div>
            <div className="flex items-center gap-3">
              <Switch checked={form.firstOrderOnly} onCheckedChange={(v) => set("firstOrderOnly", v)} />
              <Label>Réservé aux premières commandes</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
              <Label>Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || createMutation.isPending || updateMutation.isPending}>
              {(saving || createMutation.isPending || updateMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer «{deleting?.code}» ?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
