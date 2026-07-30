import {
  useListBackendStaff,
  useBackendMe,
  useCreateBackendStaff,
  useUpdateBackendStaff,
  useDeleteBackendStaff,
  getListBackendStaffQueryKey,
  getBackendMeQueryKey,
} from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Shield, Loader2, Pencil } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

type StaffUser = {
  id: number; name: string; email: string; role: string;
  phone?: string | null; isActive: boolean; assignedShopId?: number | null;
  permissions?: { inheritedRoles?: string[]; grants?: string[] } | null;
};

type PermissionDef = { key: string; label: string; group: string };

const INHERITABLE_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "restaurant_owner", label: "Propriétaire" },
  { value: "employee", label: "Employé" },
];

export default function Staff() {
  const { data: me } = useBackendMe();
  const { data: staff, isLoading } = useListBackendStaff();
  const createStaff = useCreateBackendStaff();
  const updateStaff = useUpdateBackendStaff();
  const deleteStaff = useDeleteBackendStaff();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isSuperAdmin = me?.user.role === "super_admin";
  const canManage = isSuperAdmin || me?.user.role === "admin" || me?.user.role === "restaurant_owner";

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "employee", phone: "", assignedShopId: "" });
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "", phone: "", isActive: true, role: "employee" });
  const [permsTarget, setPermsTarget] = useState<StaffUser | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListBackendStaffQueryKey() });
    queryClient.invalidateQueries({ queryKey: getBackendMeQueryKey() });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createStaff.mutate(
      { data: { ...createForm, assignedShopId: createForm.assignedShopId ? parseInt(createForm.assignedShopId) : undefined } as any },
      {
        onSuccess: () => {
          invalidate();
          setCreateOpen(false);
          setCreateForm({ name: "", email: "", password: "", role: "employee", phone: "", assignedShopId: "" });
          toast({ title: "Personnel créé" });
        },
        onError: (e: any) => toast({ title: "Erreur", description: e?.message ?? "Impossible de créer", variant: "destructive" }),
      },
    );
  };

  const openEdit = (u: StaffUser) => {
    setEditing(u);
    setEditForm({ name: u.name, email: u.email, password: "", phone: u.phone ?? "", isActive: u.isActive, role: u.role });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const payload: any = { name: editForm.name, email: editForm.email, phone: editForm.phone, isActive: editForm.isActive };
    if (editForm.password) payload.password = editForm.password;
    if (isSuperAdmin && editing.role !== "other") payload.role = editForm.role;
    updateStaff.mutate(
      { id: editing.id, data: payload },
      {
        onSuccess: () => {
          invalidate();
          setEditing(null);
          toast({ title: "Modifié" });
        },
        onError: (e: any) => toast({ title: "Erreur", description: e?.message ?? "Échec de la mise à jour", variant: "destructive" }),
      },
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Supprimer ce membre ?")) return;
    deleteStaff.mutate({ id }, { onSuccess: () => { invalidate(); toast({ title: "Supprimé" }); } });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Personnel</h1>
        {canManage && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Ajouter</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Créer un membre</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-4">
                <Field label="Nom"><Input required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} /></Field>
                <Field label="Email"><Input type="email" required value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} /></Field>
                <Field label="Mot de passe"><Input type="password" required value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} /></Field>
                <Field label="Téléphone"><Input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} /></Field>
                <Field label="Rôle">
                  <Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {isSuperAdmin && <SelectItem value="admin">Admin</SelectItem>}
                      {(isSuperAdmin || me?.user.role === "admin") && <SelectItem value="manager">Manager</SelectItem>}
                      {(isSuperAdmin || me?.user.role === "admin") && <SelectItem value="restaurant_owner">Propriétaire</SelectItem>}
                      <SelectItem value="employee">Employé</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createStaff.isPending}>
                    {createStaff.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Créer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6">Nom</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="hidden sm:table-cell">Contact</TableHead>
                <TableHead>Statut</TableHead>
                {canManage && <TableHead className="text-right px-6">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="px-6"><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  {canManage && <TableCell className="text-right px-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>}
                </TableRow>
              )) : (staff as StaffUser[] | undefined)?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="px-6 font-medium">
                    <div className="flex items-center space-x-2">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">{u.name.charAt(0).toUpperCase()}</div>
                      <span>{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === "super_admin" ? "destructive" : u.role === "other" ? "outline" : u.role === "admin" ? "default" : "secondary"} className="capitalize">
                      {u.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center space-x-1">
                      <span className={`h-2 w-2 rounded-full ${u.isActive ? "bg-green-500" : "bg-red-500"}`}></span>
                      <span className="text-sm">{u.isActive ? "Actif" : "Inactif"}</span>
                    </span>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right px-6 space-x-1">
                      {isSuperAdmin && u.role !== "super_admin" && (
                        <Button variant="ghost" size="icon" className="h-10 w-10" title="Personnaliser les accès" onClick={() => setPermsTarget(u)}>
                          <Shield className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-10 w-10" title="Modifier" onClick={() => openEdit(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {u.id !== me?.user.id && (
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(u.id)} disabled={deleteStaff.isPending}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier {editing?.name}</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={handleUpdate} className="space-y-4 pt-4">
              <Field label="Nom"><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></Field>
              <Field label="Email"><Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></Field>
              <Field label="Téléphone"><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></Field>
              <Field label="Nouveau mot de passe (optionnel)"><Input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} /></Field>
              {isSuperAdmin && editing.role !== "other" && (
                <Field label="Rôle">
                  <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="restaurant_owner">Propriétaire</SelectItem>
                      <SelectItem value="employee">Employé</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <div className="flex items-center gap-2">
                <Switch checked={editForm.isActive} onCheckedChange={(v) => setEditForm({ ...editForm, isActive: v })} />
                <Label>Actif</Label>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={updateStaff.isPending}>
                  {updateStaff.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Enregistrer
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Permissions dialog (super admin only) */}
      <PermissionsDialog
        target={permsTarget}
        onClose={() => setPermsTarget(null)}
        onSaved={() => { invalidate(); setPermsTarget(null); toast({ title: "Permissions mises à jour" }); }}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function PermissionsDialog({ target, onClose, onSaved }: { target: StaffUser | null; onClose: () => void; onSaved: () => void }) {
  const [perms, setPerms] = useState<PermissionDef[]>([]);
  const [inherited, setInherited] = useState<string[]>([]);
  const [grants, setGrants] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setInherited(target.permissions?.inheritedRoles ?? []);
    setGrants(target.permissions?.grants ?? []);
    apiFetch<PermissionDef[]>("/backend/permissions").then(setPerms).catch(() => setPerms([]));
  }, [target?.id]);

  if (!target) return null;

  const grouped = perms.reduce<Record<string, PermissionDef[]>>((acc, p) => {
    (acc[p.group] ??= []).push(p);
    return acc;
  }, {});

  const toggleInherit = (role: string) => setInherited((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]);
  const toggleGrant = (key: string) => setGrants((prev) => prev.includes(key) ? prev.filter((g) => g !== key) : [...prev, key]);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch(`/backend/staff/${target.id}/permissions`, { method: "PATCH", body: JSON.stringify({ inheritedRoles: inherited, grants }) });
      onSaved();
    } catch (e: any) {
      alert(e?.message ?? "Erreur");
    } finally { setSaving(false); }
  };

  const reset = async () => {
    if (!confirm("Réinitialiser et restaurer le rôle de base 'employee' ?")) return;
    setSaving(true);
    try {
      await apiFetch(`/backend/staff/${target.id}/permissions`, { method: "PATCH", body: JSON.stringify({ permissions: null, baseRole: "employee" }) });
      onSaved();
    } catch (e: any) { alert(e?.message ?? "Erreur"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl sm:max-h-[85vh] sm:overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personnaliser les accès — {target.name}</DialogTitle>
          <DialogDescription>
            L'utilisateur prendra le rôle <strong>Personnalisé</strong>. Choisissez les rôles hérités et/ou les permissions individuelles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <section>
            <h3 className="font-semibold mb-2">Rôles hérités</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {INHERITABLE_ROLES.map((r) => (
                <label key={r.value} className="flex items-center gap-2 border rounded-md p-3 cursor-pointer hover:bg-muted/50 min-h-[44px]">
                  <Checkbox checked={inherited.includes(r.value)} onCheckedChange={() => toggleInherit(r.value)} />
                  <span className="text-sm">{r.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-semibold mb-2">Permissions supplémentaires</h3>
            <div className="space-y-4">
              {Object.entries(grouped).map(([group, list]) => (
                <div key={group}>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{group}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {list.map((p) => (
                      <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer min-h-[40px]">
                        <Checkbox checked={grants.includes(p.key)} onCheckedChange={() => toggleGrant(p.key)} />
                        <span>{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={reset} disabled={saving}>Réinitialiser</Button>
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
