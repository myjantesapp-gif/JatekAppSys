import { useState } from "react";
import {
  useListBackendCustomers, useListBackendShops,
  getListBackendCustomersQueryKey,
} from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Phone, MapPin, Pencil, Trash2, Loader2, KeyRound, Wallet, Store, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ActionType = "edit" | "reset_password" | "wallet" | "assign_shop" | null;

export default function Customers() {
  const [search, setSearch] = useState("");
  const { data: customers, isLoading } = useListBackendCustomers({ search: search || undefined });
  const { data: shops } = useListBackendShops({});
  const qc = useQueryClient();
  const { toast } = useToast();

  const [selected, setSelected] = useState<any | null>(null);
  const [action, setAction] = useState<ActionType>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", isActive: true });
  const [pwdForm, setPwdForm] = useState({ newPassword: "", confirm: "" });
  const [walletForm, setWalletForm] = useState({ amount: "", reason: "" });
  const [shopForm, setShopForm] = useState({ restaurantId: "" });
  const [loading, setLoading] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: getListBackendCustomersQueryKey() });

  const openAction = (c: any, a: ActionType) => {
    setSelected(c);
    setAction(a);
    if (a === "edit") setForm({ name: c.name, phone: c.phone ?? "", address: c.address ?? "", isActive: c.isActive });
    if (a === "wallet") setWalletForm({ amount: "", reason: "" });
    if (a === "assign_shop") setShopForm({ restaurantId: c.assignedShopId ? String(c.assignedShopId) : "" });
  };

  const handleSave = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await apiFetch(`/api/backend/users/${selected.id}`, { method: "PATCH", body: JSON.stringify(form) });
      invalidate(); setAction(null);
      toast({ title: "Client modifié ✓" });
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce client ? Cette action est irréversible.")) return;
    try {
      await apiFetch(`/api/backend/users/${id}`, { method: "DELETE" });
      invalidate(); toast({ title: "Supprimé" });
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
  };

  const handleResetPassword = async () => {
    if (!selected) return;
    if (pwdForm.newPassword !== pwdForm.confirm) { toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" }); return; }
    if (pwdForm.newPassword.length < 8) { toast({ title: "Min. 8 caractères", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const res = await apiFetch(`/api/backend/users/${selected.id}/reset-password`, { method: "PATCH", body: JSON.stringify({ newPassword: pwdForm.newPassword }) });
      toast({ title: res.message ?? "Mot de passe réinitialisé ✓" });
      setAction(null); setPwdForm({ newPassword: "", confirm: "" });
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const handleWalletCredit = async () => {
    if (!selected || !walletForm.amount) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/backend/users/${selected.id}/wallet-credit`, { method: "PATCH", body: JSON.stringify({ amount: Number(walletForm.amount), reason: walletForm.reason }) });
      toast({ title: res.message ?? "Wallet crédité ✓" });
      setAction(null); invalidate();
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const handleAssignShop = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/backend/users/${selected.id}/assign-restaurant`, { method: "PATCH", body: JSON.stringify({ restaurantId: shopForm.restaurantId ? Number(shopForm.restaurantId) : null }) });
      toast({ title: res.message ?? "Assigné ✓" });
      setAction(null); invalidate();
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const handleExport = () => {
    const a = document.createElement("a");
    a.href = `/api/backend/export/customers?format=csv`;
    a.download = `customers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="hidden sm:table-cell">Points / Wallet</TableHead>
                <TableHead className="hidden md:table-cell">Inscrit</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-8 w-32" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              )) : customers?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Aucun client.</TableCell></TableRow>
              ) : customers?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{c.name.charAt(0).toUpperCase()}</div>
                      <div><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.email}</div></div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="space-y-0.5">
                      {c.phone && <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</div>}
                      {c.address && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> <span className="truncate max-w-[150px]">{c.address}</span></div>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="text-xs space-y-0.5">
                      <div className="font-medium text-primary">{c.loyaltyPoints} pts</div>
                      <div className="text-muted-foreground">{c.walletBalance?.toFixed(2) ?? "0.00"} DH</div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{format(new Date(c.createdAt), "dd MMM yyyy")}</TableCell>
                  <TableCell><Badge variant={c.isActive ? "default" : "secondary"}>{c.isActive ? "Actif" : "Inactif"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Modifier" onClick={() => openAction(c, "edit")}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Réinitialiser MDP" onClick={() => openAction(c, "reset_password")}><KeyRound className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Créditer wallet" onClick={() => openAction(c, "wallet")}><Wallet className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Assigner restaurant" onClick={() => openAction(c, "assign_shop")}><Store className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="Supprimer" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={action === "edit"} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier {selected?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1"><Label className="text-xs">Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} /> Compte actif</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>Annuler</Button>
            <Button onClick={handleSave} disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={action === "reset_password"} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Réinitialiser le MDP — {selected?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1"><Label className="text-xs">Nouveau mot de passe *</Label><Input type="password" value={pwdForm.newPassword} onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })} placeholder="Min. 8 caractères" /></div>
            <div className="space-y-1"><Label className="text-xs">Confirmer *</Label><Input type="password" value={pwdForm.confirm} onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>Annuler</Button>
            <Button onClick={handleResetPassword} disabled={loading || !pwdForm.newPassword}>{loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Réinitialiser</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wallet credit dialog */}
      <Dialog open={action === "wallet"} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Créditer le wallet — {selected?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">Solde actuel: <strong>{selected?.walletBalance?.toFixed(2) ?? "0.00"} DH</strong></p>
            <div className="space-y-1"><Label className="text-xs">Montant (DH) — négatif pour débiter</Label><Input type="number" step="0.01" value={walletForm.amount} onChange={(e) => setWalletForm({ ...walletForm, amount: e.target.value })} placeholder="Ex: 50 ou -10" /></div>
            <div className="space-y-1"><Label className="text-xs">Raison</Label><Input value={walletForm.reason} onChange={(e) => setWalletForm({ ...walletForm, reason: e.target.value })} placeholder="Ex: Geste commercial, correction…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>Annuler</Button>
            <Button onClick={handleWalletCredit} disabled={loading || !walletForm.amount}>{loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Appliquer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign shop dialog */}
      <Dialog open={action === "assign_shop"} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assigner un restaurant — {selected?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">Assigner cet utilisateur comme propriétaire d'un restaurant le change en role <strong>restaurant_owner</strong>.</p>
            <div className="space-y-1">
              <Label className="text-xs">Restaurant</Label>
              <Select value={shopForm.restaurantId} onValueChange={(v) => setShopForm({ restaurantId: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir un restaurant (ou aucun)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Aucun (désassigner) —</SelectItem>
                  {shops?.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>Annuler</Button>
            <Button onClick={handleAssignShop} disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
