import { useState } from "react";
import { useListBackendDeliverymen, getListBackendDeliverymenQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Truck, Star, Pencil, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

type Driver = {
  id: number;
  userId: number;
  name: string;
  phone?: string | null;
  vehicleType?: string | null;
  vehiclePlate?: string | null;
  nationalId?: string | null;
  licenseNumber?: string | null;
  isAvailable: boolean;
  totalDeliveries: number;
  rating?: number | null;
};

const emptyNew = { name: "", phone: "", email: "", vehicleType: "", vehiclePlate: "", nationalId: "", licenseNumber: "" };
const emptyEdit = { name: "", phone: "", vehicleType: "", vehiclePlate: "", nationalId: "", licenseNumber: "", isAvailable: true };

export default function Deliverymen() {
  const { data: drivers, isLoading } = useListBackendDeliverymen();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [editing, setEditing] = useState<Driver | null>(null);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState(emptyNew);
  const [deleting, setDeleting] = useState<Driver | null>(null);
  const [createdCreds, setCreatedCreds] = useState<{ name: string; phone: string; tempPassword: string } | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: getListBackendDeliverymenQueryKey() });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; data: typeof emptyEdit }) =>
      apiFetch(`/api/backend/drivers/${vars.id}`, { method: "PATCH", body: JSON.stringify(vars.data) }),
    onSuccess: () => { invalidate(); setEditing(null); toast({ title: "Livreur mis à jour" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyNew) =>
      apiFetch("/api/backend/drivers", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (result: any) => {
      invalidate();
      setCreating(false);
      setNewForm(emptyNew);
      if (result?.tempPassword) {
        setCreatedCreds({ name: result.name ?? newForm.name, phone: result.phone ?? newForm.phone, tempPassword: result.tempPassword });
      } else {
        toast({ title: "Livreur créé" });
      }
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/backend/drivers/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidate(); setDeleting(null); toast({ title: "Livreur supprimé" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const openEdit = (d: Driver) => {
    setEditing(d);
    setEditForm({
      name: d.name ?? "",
      phone: d.phone ?? "",
      vehicleType: d.vehicleType ?? "",
      vehiclePlate: d.vehiclePlate ?? "",
      nationalId: d.nationalId ?? "",
      licenseNumber: d.licenseNumber ?? "",
      isAvailable: d.isAvailable,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Livreurs</h1>
        <Button onClick={() => { setCreating(true); setNewForm(emptyNew); }} className="gap-2">
          <Plus className="h-4 w-4" /> Nouveau livreur
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6">Livreur</TableHead>
                <TableHead>Véhicule</TableHead>
                <TableHead>Plaque</TableHead>
                <TableHead>Livraisons</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right px-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="px-6"><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell className="px-6"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              )) : (drivers as Driver[] | undefined)?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Aucun livreur.</TableCell></TableRow>
              ) : (drivers as Driver[] | undefined)?.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="px-6 font-medium">
                    <div className="flex flex-col">
                      <span>{d.name}</span>
                      <span className="text-xs text-muted-foreground">{d.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2 text-sm">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{d.vehicleType || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.vehiclePlate || "—"}</TableCell>
                  <TableCell className="font-bold">{d.totalDeliveries}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="font-medium">{d.rating?.toFixed(1) || "Nouveau"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={d.isAvailable ? "default" : "secondary"}>
                      {d.isAvailable ? "Disponible" : "Hors ligne"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleting(d)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier {editing?.name}</DialogTitle>
            <DialogDescription>Mettez à jour les informations du livreur</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (editing) updateMutation.mutate({ id: editing.id, data: editForm }); }} className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Nom</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nom complet" /></div>
              <div className="space-y-1"><Label className="text-xs">Téléphone</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+212..." /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Type de véhicule</Label><Input value={editForm.vehicleType} onChange={(e) => setEditForm({ ...editForm, vehicleType: e.target.value })} placeholder="moto, vélo, voiture..." /></div>
              <div className="space-y-1"><Label className="text-xs">Plaque</Label><Input value={editForm.vehiclePlate} onChange={(e) => setEditForm({ ...editForm, vehiclePlate: e.target.value })} placeholder="Ex: A-12345-B" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">CIN / National ID</Label><Input value={editForm.nationalId} onChange={(e) => setEditForm({ ...editForm, nationalId: e.target.value })} placeholder="CIN" /></div>
              <div className="space-y-1"><Label className="text-xs">N° Permis (optionnel)</Label><Input value={editForm.licenseNumber} onChange={(e) => setEditForm({ ...editForm, licenseNumber: e.target.value })} placeholder="Numéro de permis" /></div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Switch checked={editForm.isAvailable} onCheckedChange={(v) => setEditForm({ ...editForm, isAvailable: v })} />
              <Label>Disponible</Label>
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau livreur</DialogTitle>
            <DialogDescription>Créez un compte livreur. Un mot de passe temporaire sera généré et vous sera affiché après la création.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(newForm); }} className="space-y-3 pt-2">
            <div className="space-y-1"><Label className="text-xs">Nom complet *</Label><Input required value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} placeholder="Nom du livreur" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Téléphone *</Label><Input required value={newForm.phone} onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })} placeholder="+212..." /></div>
              <div className="space-y-1"><Label className="text-xs">Email (optionnel)</Label><Input type="email" value={newForm.email} onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} placeholder="email@..." /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Type de véhicule</Label><Input value={newForm.vehicleType} onChange={(e) => setNewForm({ ...newForm, vehicleType: e.target.value })} placeholder="moto, vélo, voiture..." /></div>
              <div className="space-y-1"><Label className="text-xs">Plaque</Label><Input value={newForm.vehiclePlate} onChange={(e) => setNewForm({ ...newForm, vehiclePlate: e.target.value })} placeholder="Ex: A-12345-B" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">CIN / National ID</Label><Input value={newForm.nationalId} onChange={(e) => setNewForm({ ...newForm, nationalId: e.target.value })} placeholder="CIN" /></div>
              <div className="space-y-1"><Label className="text-xs">N° Permis (optionnel)</Label><Input value={newForm.licenseNumber} onChange={(e) => setNewForm({ ...newForm, licenseNumber: e.target.value })} placeholder="Numéro de permis" /></div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setCreating(false)}>Annuler</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Créer le livreur
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Credentials after creation */}
      <Dialog open={!!createdCreds} onOpenChange={(o) => !o && setCreatedCreds(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Livreur créé ✓</DialogTitle>
            <DialogDescription>
              Partagez ces identifiants avec le livreur. Le mot de passe ne sera plus affiché.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-muted p-4 space-y-2 font-mono text-sm">
              <div><span className="text-muted-foreground">Nom&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: </span><span className="font-semibold">{createdCreds?.name}</span></div>
              <div><span className="text-muted-foreground">Téléphone: </span><span className="font-semibold">{createdCreds?.phone}</span></div>
              <div><span className="text-muted-foreground">Mot de passe temporaire: </span><span className="font-semibold text-primary">{createdCreds?.tempPassword}</span></div>
            </div>
            <p className="text-xs text-muted-foreground">Le livreur devra changer ce mot de passe à sa première connexion.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedCreds(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {deleting?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le compte utilisateur et le profil livreur seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
