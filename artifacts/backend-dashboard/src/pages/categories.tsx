import { useState } from "react";
import {
  useListBackendCategories,
  getListBackendCategoriesQueryKey,
} from "@workspace/api-client-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  ChevronRight, Plus, Pencil, Trash2, Loader2, FolderTree,
} from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

type SubCat = {
  id: number; name: string; slug: string; icon: string;
  accentColor: string; isActive: boolean; sortOrder: number; parentId: number | null;
  type?: string;
};
type Cat = SubCat & { subCategories: SubCat[] };

const BUSINESS_TYPES = [
  { value: "restaurant", label: "Restauration" },
  { value: "grocery",    label: "Épicerie" },
  { value: "pharmacy",   label: "Santé / Pharmacie" },
  { value: "supermarket",label: "Supermarché" },
  { value: "shop",       label: "Boutique" },
  { value: "services",   label: "Services / Coursier" },
];

const CATEGORY_TYPES = [
  { value: "category",          label: "Catégorie principale" },
  { value: "service_shortcut",  label: "Raccourci Service (tuile accueil)" },
];

const EMPTY = { name: "", icon: "storefront", accentColor: "#E91E63", sortOrder: "0", isActive: true, businessType: "restaurant", type: "category", bannerImageUrl: "" };

function CategoryForm({
  value, onChange, isSubcat = false,
}: {
  value: typeof EMPTY;
  onChange: (v: typeof EMPTY) => void;
  isSubcat?: boolean;
}) {
  const set = (k: keyof typeof EMPTY) => (e: any) =>
    onChange({ ...value, [k]: e.target?.value ?? e });
  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1">
        <Label className="text-xs">Nom *</Label>
        <Input value={value.name} onChange={set("name")} placeholder="Ex: Pizza, Burger…" required autoFocus />
      </div>
      {/* type + businessType — only relevant for parent categories */}
      {!isSubcat && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Rôle dans l'app</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              value={value.type}
              onChange={(e) => onChange({ ...value, type: e.target.value })}
            >
              {CATEGORY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type de commerce</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              value={value.businessType}
              onChange={(e) => onChange({ ...value, businessType: e.target.value })}
            >
              {BUSINESS_TYPES.map((bt) => (
                <option key={bt.value} value={bt.value}>{bt.label}</option>
              ))}
            </select>
          </div>
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Icône (Material name)</Label>
          <Input value={value.icon} onChange={set("icon")} placeholder="storefront" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ordre d'affichage</Label>
          <Input type="number" value={value.sortOrder} onChange={set("sortOrder")} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Couleur d'accent</Label>
        <div className="flex items-center gap-2">
          <input
            type="color" value={value.accentColor}
            onChange={(e) => onChange({ ...value, accentColor: e.target.value })}
            className="h-9 w-12 rounded border cursor-pointer flex-shrink-0"
          />
          <Input value={value.accentColor} onChange={set("accentColor")} placeholder="#E91E63" className="flex-1" />
        </div>
      </div>
      {!isSubcat && (
        <div className="space-y-1">
          <Label className="text-xs">Image de bannière (URL)</Label>
          <Input
            value={value.bannerImageUrl}
            onChange={set("bannerImageUrl")}
            placeholder="https://… (image affichée en fond de la page catégorie)"
          />
        </div>
      )}
      <div className="flex items-center gap-2">
        <Switch
          checked={value.isActive}
          onCheckedChange={(v) => onChange({ ...value, isActive: v })}
          id="cat-active"
        />
        <Label htmlFor="cat-active" className="text-sm cursor-pointer">Active (visible dans l'app)</Label>
      </div>
    </div>
  );
}

export default function Categories() {
  const { data: categories, isLoading } = useListBackendCategories();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [createParent, setCreateParent] = useState(false);
  const [createSubFor, setCreateSubFor] = useState<Cat | null>(null);
  const [editing, setEditing] = useState<(SubCat & { _form?: typeof EMPTY }) | null>(null);
  const [deleting, setDeleting] = useState<(SubCat & { isParent: boolean; childCount: number }) | null>(null);
  const [createForm, setCreateForm] = useState(EMPTY);
  const [editForm, setEditForm] = useState(EMPTY);

  const cats = (categories ?? []) as Cat[];
  const invalidate = () => qc.invalidateQueries({ queryKey: getListBackendCategoriesQueryKey() });

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });

  const createMutation = useMutation({
    mutationFn: (parentId?: number | null) =>
      apiFetch("/api/backend/categories", {
        method: "POST",
        body: JSON.stringify({
          name: createForm.name.trim(),
          slug: createForm.name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
          icon: createForm.icon.trim() || "storefront",
          accentColor: createForm.accentColor,
          sortOrder: Number(createForm.sortOrder) || 0,
          isActive: createForm.isActive,
          businessType: createForm.businessType || "restaurant",
          type: parentId ? "subcategory" : (createForm.type || "category"),
          bannerImageUrl: createForm.bannerImageUrl?.trim() || null,
          parentId: parentId ?? null,
        }),
      }),
    onSuccess: () => {
      invalidate();
      setCreateParent(false);
      setCreateSubFor(null);
      setCreateForm(EMPTY);
      toast({ title: "Catégorie créée" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/backend/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name.trim(),
          icon: editForm.icon.trim(),
          accentColor: editForm.accentColor,
          sortOrder: Number(editForm.sortOrder) || 0,
          isActive: editForm.isActive,
          businessType: editForm.businessType || "restaurant",
          type: editForm.type || "category",
          bannerImageUrl: editForm.bannerImageUrl?.trim() || null,
        }),
      }),
    onSuccess: () => { invalidate(); setEditing(null); toast({ title: "Catégorie modifiée" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/backend/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidate(); setDeleting(null); toast({ title: "Catégorie supprimée" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const openCreate = (parent?: Cat) => {
    setCreateForm(EMPTY);
    if (parent) { setCreateSubFor(parent); if (!expanded.has(parent.id)) toggle(parent.id); }
    else setCreateParent(true);
  };

  const openEdit = (cat: SubCat) => {
    setEditForm({
      name: cat.name,
      icon: cat.icon,
      accentColor: cat.accentColor,
      sortOrder: String(cat.sortOrder),
      isActive: cat.isActive,
      businessType: (cat as any).businessType ?? "restaurant",
      type: cat.type ?? "category",
      bannerImageUrl: (cat as any).bannerImageUrl ?? "",
    });
    setEditing(cat);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Catégories</h1>
        <Button size="sm" className="gap-2" onClick={() => openCreate()}>
          <Plus className="h-4 w-4" /> Nouvelle catégorie
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderTree className="h-5 w-5 text-primary" />
            Arborescence boutiques
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 pl-4" />
                  <TableHead>Nom</TableHead>
                  <TableHead className="hidden sm:table-cell">Icône / Couleur</TableHead>
                  <TableHead className="hidden md:table-cell">Sous-catégories</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  : cats.length === 0
                    ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                            Aucune catégorie. Créez votre première catégorie parente.
                          </TableCell>
                        </TableRow>
                      )
                    : cats.flatMap((cat) => [
                        // ─── Parent row ──────────────────────────────────
                        <TableRow key={`p-${cat.id}`} className="bg-muted/30 hover:bg-muted/50 font-medium">
                          <TableCell className="pl-4 w-8">
                            <button
                              onClick={() => toggle(cat.id)}
                              className={`transition-transform duration-200 inline-flex ${
                                expanded.has(cat.id) ? "rotate-90" : ""
                              } ${cat.subCategories.length === 0 ? "opacity-20 cursor-default" : "cursor-pointer hover:text-primary"}`}
                              aria-label={expanded.has(cat.id) ? "Réduire" : "Développer"}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div
                                className="h-4 w-4 rounded-full ring-2 ring-white shadow-sm flex-shrink-0"
                                style={{ backgroundColor: cat.accentColor }}
                              />
                              <span className="truncate max-w-[180px] sm:max-w-none">{cat.name}</span>
                              {!cat.isActive && (
                                <Badge variant="secondary" className="text-xs">Inactif</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                            {cat.icon}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline">
                              {cat.subCategories.length} sous-cat.
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <div className="flex items-center justify-end gap-1 flex-wrap">
                              <Button
                                variant="outline" size="sm" className="h-7 gap-1 text-xs hidden sm:flex"
                                onClick={() => openCreate(cat)}
                              >
                                <Plus className="h-3 w-3" />
                                Sous-cat.
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8 sm:hidden"
                                onClick={() => openCreate(cat)} title="Ajouter sous-catégorie"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => openEdit(cat)}
                                title="Modifier"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() =>
                                  setDeleting({ ...cat, isParent: true, childCount: cat.subCategories.length })
                                }
                                disabled={cat.subCategories.length > 0}
                                title={
                                  cat.subCategories.length > 0
                                    ? "Supprimez d'abord les sous-catégories"
                                    : "Supprimer"
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>,

                        // ─── Subcategory rows ─────────────────────────────
                        ...(expanded.has(cat.id)
                          ? cat.subCategories.length === 0
                            ? [
                                <TableRow key={`empty-${cat.id}`}>
                                  <TableCell />
                                  <TableCell
                                    colSpan={4}
                                    className="pl-10 text-sm text-muted-foreground py-3 italic"
                                  >
                                    Aucune sous-catégorie. Cliquez «Sous-cat.» pour en ajouter.
                                  </TableCell>
                                </TableRow>,
                              ]
                            : cat.subCategories.map((sub) => (
                                <TableRow key={`s-${sub.id}`} className="hover:bg-muted/20">
                                  <TableCell />
                                  <TableCell className="pl-10">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="h-3 w-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: sub.accentColor }}
                                      />
                                      <span className="text-sm truncate max-w-[160px] sm:max-w-none">
                                        {sub.name}
                                      </span>
                                      {!sub.isActive && (
                                        <Badge variant="secondary" className="text-xs">Inactif</Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                                    {sub.icon}
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    <Badge variant="secondary" className="text-xs">sous-catégorie</Badge>
                                  </TableCell>
                                  <TableCell className="text-right pr-4">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost" size="icon" className="h-8 w-8"
                                        onClick={() => openEdit(sub)}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost" size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() =>
                                          setDeleting({ ...sub, isParent: false, childCount: 0 })
                                        }
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                          : []),
                      ])}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Create dialog ───────────────────────────────────────── */}
      <Dialog
        open={createParent || !!createSubFor}
        onOpenChange={(o) => {
          if (!o) { setCreateParent(false); setCreateSubFor(null); }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createSubFor
                ? `Nouvelle sous-catégorie de «${createSubFor.name}»`
                : "Nouvelle catégorie parente"}
            </DialogTitle>
            <DialogDescription>
              {createSubFor
                ? "Ex: Pizza, Burger, Sushi… visible lors du choix d'un shop."
                : "Ex: Restaurant, Pharmacie, Épicerie…"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (createForm.name.trim()) createMutation.mutate(createSubFor?.id);
            }}
          >
            <CategoryForm value={createForm} onChange={setCreateForm} isSubcat={!!createSubFor} />
            <DialogFooter className="mt-6">
              <Button
                type="button" variant="outline"
                onClick={() => { setCreateParent(false); setCreateSubFor(null); }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !createForm.name.trim()}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Edit dialog ─────────────────────────────────────────── */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier «{editing?.name}»</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(editing.id); }}
            >
              <CategoryForm value={editForm} onChange={setEditForm} isSubcat={!(editing as any)?.subCategories} />
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={updateMutation.isPending || !editForm.name.trim()}>
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Delete confirm ───────────────────────────────────────── */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer «{deleting?.name}» ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.isParent && (deleting.childCount ?? 0) > 0
                ? `Cette catégorie a ${deleting.childCount} sous-catégorie(s). Supprimez-les d'abord.`
                : "Suppression définitive. Cette action est irréversible."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
              disabled={
                deleteMutation.isPending ||
                (deleting?.isParent && (deleting.childCount ?? 0) > 0)
              }
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
