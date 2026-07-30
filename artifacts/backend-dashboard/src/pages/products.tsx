import { useState, useRef } from "react";
import {
  useListBackendProducts,
  useListBackendShops,
  useBackendMe,
  getListBackendProductsQueryKey,
  useListBackendCategories,
  getListBackendCategoriesQueryKey,
} from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Pencil, Trash2, Loader2, Settings2, Tags, Package, FileUp, Download, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const EMPTY = { name: "", description: "", price: "", category: "", imageUrl: "", isAvailable: true, isPopular: false, allergens: "", tags: "", prepTimeMinutes: "", calories: "" };

type ProductCat = { id: number; restaurantId: number | null; name: string };
function useProductCategories(restaurantId: string | number | undefined) {
  return useQuery<ProductCat[]>({
    queryKey: ["/api/backend/menu-categories", String(restaurantId ?? "")],
    queryFn: () => apiFetch(`/api/backend/menu-categories${restaurantId ? `?restaurantId=${restaurantId}` : ""}`),
    enabled: restaurantId !== undefined,
  });
}

export default function Products() {
  const [search, setSearch] = useState("");
  const { data: me } = useBackendMe();
  const { data: products, isLoading } = useListBackendProducts({ search: search || undefined });
  const { data: shops } = useListBackendShops({});
  const qc = useQueryClient();
  const { toast } = useToast();
  const isOwner = me?.user.role === "restaurant_owner";
  const scopedShopIds = me?.scopedShopIds ?? [];
  const visibleShops = isOwner ? (shops || []).filter((s) => scopedShopIds.includes(s.id)) : (shops || []);

  const [createOpen, setCreateOpen] = useState(false);
  const [shopId, setShopId] = useState<string>(isOwner && scopedShopIds.length === 1 ? String(scopedShopIds[0]) : "");
  const [form, setForm] = useState(EMPTY);

  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [optionsProduct, setOptionsProduct] = useState<any | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importShopId, setImportShopId] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: getListBackendProductsQueryKey() });

  const createMutation = useMutation({
    mutationFn: (payload: any) => apiFetch("/api/backend/products", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => { invalidate(); setCreateOpen(false); setForm(EMPTY); setShopId(""); toast({ title: "Produit créé" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiFetch(`/api/backend/products/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { invalidate(); setEditing(null); toast({ title: "Modifié" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/backend/products/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidate(); toast({ title: "Supprimé" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const buildProductPayload = (f: typeof EMPTY) => ({
    name: f.name,
    description: f.description || undefined,
    price: Number(f.price),
    category: f.category,
    imageUrl: f.imageUrl || undefined,
    isAvailable: f.isAvailable,
    isPopular: f.isPopular,
    allergens: f.allergens || undefined,
    tags: f.tags || undefined,
    prepTimeMinutes: f.prepTimeMinutes ? Number(f.prepTimeMinutes) : undefined,
    calories: f.calories ? Number(f.calories) : undefined,
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) { toast({ title: "Choisissez une boutique", variant: "destructive" }); return; }
    createMutation.mutate({ restaurantId: Number(shopId), ...buildProductPayload(form) });
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setEditForm({
      name: p.name, description: p.description ?? "", price: String(p.price),
      category: p.category, imageUrl: p.imageUrl ?? "",
      isAvailable: p.isAvailable, isPopular: p.isPopular,
      allergens: p.allergens ?? "",
      tags: Array.isArray(p.tags) ? p.tags.join(",") : (p.tags ?? ""),
      prepTimeMinutes: p.prepTimeMinutes ? String(p.prepTimeMinutes) : "",
      calories: p.calories ? String(p.calories) : "",
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    updateMutation.mutate({ id: editing.id, data: buildProductPayload(editForm) });
  };

  const handleToggle = (p: any, isAvailable: boolean) => {
    updateMutation.mutate({ id: p.id, data: { isAvailable } });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Supprimer ce produit ?")) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Produits</h1>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}>
          <FileUp className="h-4 w-4" /> Importer CSV/JSON
        </Button>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Nouveau produit</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[85dvh] overflow-y-auto">
            <DialogHeader><DialogTitle>Créer un produit</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3 pt-4">
              <Field label="Boutique">
                <Select value={shopId} onValueChange={setShopId} disabled={isOwner && scopedShopIds.length === 1}>
                  <SelectTrigger><SelectValue placeholder={isOwner ? "Votre boutique" : "Choisir une boutique"} /></SelectTrigger>
                  <SelectContent>{visibleShops.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <ProductFields form={form} setForm={setForm} restaurantId={shopId || undefined} />
              <DialogFooter className="pt-4"><Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Créer</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="produits">
        <TabsList className="w-full overflow-x-auto flex-nowrap justify-start">
          <TabsTrigger value="produits" className="gap-1.5 shrink-0"><Package className="h-4 w-4" />Produits</TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5 shrink-0"><Tags className="h-4 w-4" />Catégories menu</TabsTrigger>
        </TabsList>
        <TabsContent value="produits" className="pt-4">
      <Card>
        <CardHeader className="pb-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead className="hidden sm:table-cell">Catégorie</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Disponible</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              )) : products?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Aucun produit.</TableCell></TableRow>
              ) : products?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-3">
                      {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-10 w-10 rounded-md object-cover" /> : <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center"><span className="text-xs text-muted-foreground">—</span></div>}
                      <span>{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell"><Badge variant="secondary">{p.category}</Badge></TableCell>
                  <TableCell className="font-semibold">{p.price} DH</TableCell>
                  <TableCell><Switch checked={p.isAvailable} onCheckedChange={(v) => handleToggle(p, v)} /></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" className="h-10 w-10" title="Options" onClick={() => setOptionsProduct(p)}><Settings2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

        </TabsContent>
        <TabsContent value="categories" className="pt-4">
          <ProductMenuCategories />
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifier {editing?.name}</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={handleUpdate} className="space-y-3 pt-4">
              <ProductFields form={editForm} setForm={setEditForm} restaurantId={editing?.restaurantId} />
              <DialogFooter className="pt-4"><Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Enregistrer</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <OptionsDialogWrapper product={optionsProduct} onClose={() => setOptionsProduct(null)} />
      <ImportProductsDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        shops={visibleShops}
        isOwner={isOwner}
        scopedShopIds={scopedShopIds}
      />
    </div>
  );
}

// ─── Product Menu Categories ────────────────────────────────────────────────

type MenuCat = { id: number; restaurantId: number | null; name: string; sortOrder: number; isActive: boolean };

function ProductMenuCategories() {
  const { data: me } = useBackendMe();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isAdmin = !!me && ["super_admin", "admin", "manager"].includes(me.user.role);
  const { data: shops } = useListBackendShops({});

  const { data: productCats, isLoading: pcLoading } = useQuery<MenuCat[]>({
    queryKey: ["/api/backend/menu-categories"],
    queryFn: () => apiFetch("/api/backend/menu-categories"),
  });

  const [newCat, setNewCat] = useState({ name: "", restaurantId: "", sortOrder: "0" });
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null);
  const [newName, setNewName] = useState("");
  const [deleting, setDeleting] = useState<MenuCat | null>(null);

  const invalidatePC = () => qc.invalidateQueries({ queryKey: ["/api/backend/menu-categories"] });

  const createMutation = useMutation({
    mutationFn: () => apiFetch("/api/backend/menu-categories", {
      method: "POST",
      body: JSON.stringify({ name: newCat.name.trim(), restaurantId: newCat.restaurantId ? Number(newCat.restaurantId) : null, sortOrder: Number(newCat.sortOrder) || 0 }),
    }),
    onSuccess: () => { invalidatePC(); setCreating(false); setNewCat({ name: "", restaurantId: "", sortOrder: "0" }); toast({ title: "Catégorie créée" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiFetch(`/api/backend/menu-categories/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
    onSuccess: () => { invalidatePC(); setRenaming(null); toast({ title: "Renommée" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/backend/menu-categories/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidatePC(); setDeleting(null); toast({ title: "Supprimée" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  return (
    <Card className="max-w-3xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <h2 className="text-base font-semibold">Catégories de produits</h2>
        {isAdmin && <Button size="sm" onClick={() => setCreating(true)} className="gap-2"><Plus className="h-4 w-4" />Nouvelle</Button>}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead className="hidden sm:table-cell">Restaurant</TableHead>
              <TableHead className="hidden sm:table-cell">Ordre</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pcLoading ? Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}><TableCell><Skeleton className="h-4 w-32" /></TableCell><TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell><TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-8" /></TableCell>{isAdmin && <TableCell />}</TableRow>
            )) : productCats?.length === 0 ? (
              <TableRow><TableCell colSpan={isAdmin ? 4 : 3} className="h-24 text-center text-muted-foreground">Aucune catégorie produit.</TableCell></TableRow>
            ) : productCats?.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                  {cat.restaurantId
                    ? (shops as any[] | undefined)?.find((s: any) => s.id === cat.restaurantId)?.name ?? `#${cat.restaurantId}`
                    : <Badge variant="secondary">Global</Badge>}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{cat.sortOrder}</TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setRenaming({ id: cat.id, name: cat.name }); setNewName(cat.name); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleting(cat)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouvelle catégorie produit</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (newCat.name.trim()) createMutation.mutate(); }} className="space-y-4 pt-2">
            <div className="space-y-1"><Label className="text-xs">Nom *</Label><Input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} required autoFocus /></div>
            <div className="space-y-1">
              <Label className="text-xs">Restaurant (vide = global)</Label>
              <Select value={newCat.restaurantId || "global"} onValueChange={(v) => setNewCat({ ...newCat, restaurantId: v === "global" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Global" /></SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="global">— Global —</SelectItem>
                  {(shops as any[] | undefined)?.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Ordre</Label><Input type="number" value={newCat.sortOrder} onChange={(e) => setNewCat({ ...newCat, sortOrder: e.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreating(false)}>Annuler</Button>
              <Button type="submit" disabled={createMutation.isPending || !newCat.name.trim()}>{createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Créer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Renommer «{renaming?.name}»</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (renaming && newName.trim()) renameMutation.mutate({ id: renaming.id, name: newName.trim() }); }} className="space-y-4 pt-2">
            <div className="space-y-1"><Label className="text-xs">Nouveau nom</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} required /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenaming(null)}>Annuler</Button>
              <Button type="submit" disabled={renameMutation.isPending || !newName.trim() || newName.trim() === renaming?.name}>{renameMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Renommer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer «{deleting?.name}» ?</AlertDialogTitle>
            <AlertDialogDescription>Action irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleting && deleteMutation.mutate(deleting.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

const DIET_TAGS = [
  { value: "halal", label: "Halal" },
  { value: "vegetarian", label: "Végétarien" },
  { value: "vegan", label: "Vegan" },
  { value: "spicy", label: "Épicé" },
  { value: "gluten_free", label: "Sans gluten" },
];

function ProductFields({ form, setForm, restaurantId }: { form: any; setForm: any; restaurantId?: string | number }) {
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  const { data: productCats } = useProductCategories(restaurantId);
  const selectedTags: string[] = form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
  const toggleTag = (tag: string) => {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    set("tags", next.join(","));
  };
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Nom *"><Input required value={form.name} onChange={(e: any) => set("name", e.target.value)} /></Field>
        <Field label="Catégorie *">
          {productCats && productCats.length > 0 ? (
            <Select value={form.category} onValueChange={(v) => set("category", v)} required>
              <SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
              <SelectContent className="z-[200]">
                {productCats.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}{c.restaurantId !== null ? " ★" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input required value={form.category} onChange={(e: any) => set("category", e.target.value)} placeholder="Catégorie" />
          )}
        </Field>
        <Field label="Prix (DH) *"><Input required type="number" step="0.01" value={form.price} onChange={(e: any) => set("price", e.target.value)} /></Field>
        <Field label="Image (URL)"><Input value={form.imageUrl} onChange={(e: any) => set("imageUrl", e.target.value)} /></Field>
      </div>
      <Field label="Description"><Textarea rows={2} value={form.description} onChange={(e: any) => set("description", e.target.value)} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Allergènes">
          <Input value={form.allergens} onChange={(e: any) => set("allergens", e.target.value)} placeholder="gluten, lactose, noix…" />
        </Field>
        <Field label="Préparation (min)">
          <Input type="number" min="0" value={form.prepTimeMinutes} onChange={(e: any) => set("prepTimeMinutes", e.target.value)} placeholder="15" />
        </Field>
        <Field label="Calories (kcal)">
          <Input type="number" min="0" value={form.calories} onChange={(e: any) => set("calories", e.target.value)} placeholder="850" />
        </Field>
      </div>
      <div>
        <Label className="text-xs">Tags diététiques</Label>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {DIET_TAGS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleTag(value)}
              className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                selectedTags.includes(value)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-6 pt-1">
        <label className="flex items-center gap-2 text-sm cursor-pointer"><Switch checked={form.isAvailable} onCheckedChange={(v: any) => set("isAvailable", v)} /> Disponible</label>
        <label className="flex items-center gap-2 text-sm cursor-pointer"><Switch checked={form.isPopular} onCheckedChange={(v: any) => set("isPopular", v)} /> Populaire</label>
      </div>
    </>
  );
}

function Field({ label, children }: any) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

interface MenuItemSize { id: number; menuItemId: number; name: string; priceAdjustment: number; sortOrder: number; isAvailable: boolean; }
interface MenuItemExtra { id: number; menuItemId: number; name: string; price: number; sortOrder: number; isAvailable: boolean; }

function OptionsDialog({ product, onClose }: { product: any | null; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState("sizes");
  const [sizeForm, setSizeForm] = useState({ name: "", priceAdjustment: "0", sortOrder: "0", isAvailable: true });
  const [extraForm, setExtraForm] = useState({ name: "", price: "0", sortOrder: "0", isAvailable: true });
  const [editingSize, setEditingSize] = useState<MenuItemSize | null>(null);
  const [editingExtra, setEditingExtra] = useState<MenuItemExtra | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [`/api/menu/${product?.id}/sizes`] });
    qc.invalidateQueries({ queryKey: [`/api/menu/${product?.id}/extras`] });
  };

  const { data: sizes, isLoading: sizesLoading } = useQuery<MenuItemSize[]>({
    queryKey: [`/api/menu/${product?.id}/sizes`],
    queryFn: () => apiFetch(`/api/menu/${product.id}/sizes`),
    enabled: !!product,
  });
  const { data: extras, isLoading: extrasLoading } = useQuery<MenuItemExtra[]>({
    queryKey: [`/api/menu/${product?.id}/extras`],
    queryFn: () => apiFetch(`/api/menu/${product.id}/extras`),
    enabled: !!product,
  });

  const createSize = async () => {
    if (!product) return;
    try {
      await apiFetch(`/api/menu/${product.id}/sizes`, {
        method: "POST",
        body: JSON.stringify({
          name: sizeForm.name,
          priceAdjustment: Number(sizeForm.priceAdjustment),
          sortOrder: Number(sizeForm.sortOrder),
          isAvailable: sizeForm.isAvailable,
        }),
      });
      setSizeForm({ name: "", priceAdjustment: "0", sortOrder: "0", isAvailable: true });
      invalidate();
      toast({ title: "Taille créée" });
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
  };

  const updateSize = async () => {
    if (!editingSize) return;
    try {
      await apiFetch(`/api/menu/sizes/${editingSize.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editingSize.name,
          priceAdjustment: editingSize.priceAdjustment,
          sortOrder: editingSize.sortOrder,
          isAvailable: editingSize.isAvailable,
        }),
      });
      setEditingSize(null);
      invalidate();
      toast({ title: "Taille mise à jour" });
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
  };

  const deleteSize = async (id: number) => {
    if (!confirm("Supprimer cette taille ?")) return;
    try {
      await apiFetch(`/api/menu/sizes/${id}`, { method: "DELETE" });
      invalidate();
      toast({ title: "Taille supprimée" });
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
  };

  const createExtra = async () => {
    if (!product) return;
    try {
      await apiFetch(`/api/menu/${product.id}/extras`, {
        method: "POST",
        body: JSON.stringify({
          name: extraForm.name,
          price: Number(extraForm.price),
          sortOrder: Number(extraForm.sortOrder),
          isAvailable: extraForm.isAvailable,
        }),
      });
      setExtraForm({ name: "", price: "0", sortOrder: "0", isAvailable: true });
      invalidate();
      toast({ title: "Supplément créé" });
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
  };

  const updateExtra = async () => {
    if (!editingExtra) return;
    try {
      await apiFetch(`/api/menu/extras/${editingExtra.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editingExtra.name,
          price: editingExtra.price,
          sortOrder: editingExtra.sortOrder,
          isAvailable: editingExtra.isAvailable,
        }),
      });
      setEditingExtra(null);
      invalidate();
      toast({ title: "Supplément mis à jour" });
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
  };

  const deleteExtra = async (id: number) => {
    if (!confirm("Supprimer ce supplément ?")) return;
    try {
      await apiFetch(`/api/menu/extras/${id}`, { method: "DELETE" });
      invalidate();
      toast({ title: "Supplément supprimé" });
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
  };

  if (!product) return null;

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Options — {product.name}</DialogTitle>
          <DialogDescription>Gérez les tailles et suppléments affichés dans l'app mobile.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab} className="pt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sizes">Tailles</TabsTrigger>
            <TabsTrigger value="extras">Suppléments</TabsTrigger>
          </TabsList>
          <TabsContent value="sizes" className="space-y-4 pt-2">
            {/* Add size form — responsive flex */}
            <div className="flex flex-col sm:flex-row gap-2 items-end border-b pb-4">
              <div className="flex-1 min-w-0 space-y-1">
                <Label className="text-xs">Nom</Label>
                <Input value={sizeForm.name} onChange={(e) => setSizeForm({ ...sizeForm, name: e.target.value })} placeholder="Large, XL…" />
              </div>
              <div className="w-full sm:w-28 space-y-1">
                <Label className="text-xs">Ajust. prix</Label>
                <Input type="number" value={sizeForm.priceAdjustment} onChange={(e) => setSizeForm({ ...sizeForm, priceAdjustment: e.target.value })} />
              </div>
              <div className="w-full sm:w-20 space-y-1">
                <Label className="text-xs">Ordre</Label>
                <Input type="number" value={sizeForm.sortOrder} onChange={(e) => setSizeForm({ ...sizeForm, sortOrder: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 sm:pb-0.5">
                <Switch checked={sizeForm.isAvailable} onCheckedChange={(v) => setSizeForm({ ...sizeForm, isAvailable: v })} />
                <span className="text-xs">Actif</span>
              </div>
              <Button size="icon" onClick={createSize} disabled={!sizeForm.name} className="shrink-0 sm:self-end">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {sizesLoading ? <Skeleton className="h-20 w-full" /> : sizes?.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune taille. Ajoutez-en une ci-dessus.</p>
            ) : (
              <div className="space-y-2">
                {sizes?.map((s) => editingSize?.id === s.id ? (
                  <div key={s.id} className="flex flex-col sm:flex-row gap-2 items-end bg-muted/40 p-2 rounded-md">
                    <Input className="flex-1" value={editingSize.name} onChange={(e) => setEditingSize({ ...editingSize, name: e.target.value })} />
                    <Input className="w-full sm:w-28" type="number" value={editingSize.priceAdjustment} onChange={(e) => setEditingSize({ ...editingSize, priceAdjustment: Number(e.target.value) })} />
                    <Input className="w-full sm:w-20" type="number" value={editingSize.sortOrder} onChange={(e) => setEditingSize({ ...editingSize, sortOrder: Number(e.target.value) })} />
                    <Switch checked={editingSize.isAvailable} onCheckedChange={(v) => setEditingSize({ ...editingSize, isAvailable: v })} />
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={updateSize}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteSize(s.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ) : (
                  <div key={s.id} className="flex items-center justify-between p-2.5 border rounded-md gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{s.name}</span>
                      <span className="text-sm text-muted-foreground shrink-0">{s.priceAdjustment > 0 ? `+${s.priceAdjustment}` : s.priceAdjustment} MAD</span>
                      <Badge variant={s.isAvailable ? "default" : "secondary"} className="shrink-0">{s.isAvailable ? "Actif" : "Inactif"}</Badge>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingSize(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteSize(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="extras" className="space-y-4 pt-2">
            {/* Add extra form — responsive flex */}
            <div className="flex flex-col sm:flex-row gap-2 items-end border-b pb-4">
              <div className="flex-1 min-w-0 space-y-1">
                <Label className="text-xs">Nom</Label>
                <Input value={extraForm.name} onChange={(e) => setExtraForm({ ...extraForm, name: e.target.value })} placeholder="Fromage extra…" />
              </div>
              <div className="w-full sm:w-28 space-y-1">
                <Label className="text-xs">Prix (DH)</Label>
                <Input type="number" value={extraForm.price} onChange={(e) => setExtraForm({ ...extraForm, price: e.target.value })} />
              </div>
              <div className="w-full sm:w-20 space-y-1">
                <Label className="text-xs">Ordre</Label>
                <Input type="number" value={extraForm.sortOrder} onChange={(e) => setExtraForm({ ...extraForm, sortOrder: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 sm:pb-0.5">
                <Switch checked={extraForm.isAvailable} onCheckedChange={(v) => setExtraForm({ ...extraForm, isAvailable: v })} />
                <span className="text-xs">Actif</span>
              </div>
              <Button size="icon" onClick={createExtra} disabled={!extraForm.name} className="shrink-0 sm:self-end">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {extrasLoading ? <Skeleton className="h-20 w-full" /> : extras?.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun supplément. Ajoutez-en un ci-dessus.</p>
            ) : (
              <div className="space-y-2">
                {extras?.map((x) => editingExtra?.id === x.id ? (
                  <div key={x.id} className="flex flex-col sm:flex-row gap-2 items-end bg-muted/40 p-2 rounded-md">
                    <Input className="flex-1" value={editingExtra.name} onChange={(e) => setEditingExtra({ ...editingExtra, name: e.target.value })} />
                    <Input className="w-full sm:w-28" type="number" value={editingExtra.price} onChange={(e) => setEditingExtra({ ...editingExtra, price: Number(e.target.value) })} />
                    <Input className="w-full sm:w-20" type="number" value={editingExtra.sortOrder} onChange={(e) => setEditingExtra({ ...editingExtra, sortOrder: Number(e.target.value) })} />
                    <Switch checked={editingExtra.isAvailable} onCheckedChange={(v) => setEditingExtra({ ...editingExtra, isAvailable: v })} />
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={updateExtra}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteExtra(x.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ) : (
                  <div key={x.id} className="flex items-center justify-between p-2.5 border rounded-md gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{x.name}</span>
                      <span className="text-sm text-muted-foreground shrink-0">{x.price > 0 ? `+${x.price}` : x.price === 0 ? "Inclus" : x.price} MAD</span>
                      <Badge variant={x.isAvailable ? "default" : "secondary"} className="shrink-0">{x.isAvailable ? "Actif" : "Inactif"}</Badge>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingExtra(x)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteExtra(x.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function OptionsDialogWrapper({ product, onClose }: { product: any | null; onClose: () => void }) {
  return product ? <OptionsDialog product={product} onClose={onClose} /> : null;
}

// ─── CSV/JSON Import Dialog ──────────────────────────────────────────────────

const CSV_TEMPLATE_HEADERS = "name,description,price,category,imageUrl,isAvailable,isPopular,allergens,prepTimeMinutes,calories,tags";
const CSV_EXAMPLE = `Pizza Margherita,"Tomate et mozzarella",49.90,Pizza,,true,false,"gluten,lactose",15,850,
Salade César,"Fraîche et légère",35.00,Salade,,true,true,,10,320,vegetarian`;

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).filter((l) => l.trim()).map((line) => {
    const values: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === "," && !inQuote) { values.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    values.push(cur.trim());
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? "").replace(/^"|"$/g, "")]));
  });
}

function ImportProductsDialog({
  open, onClose, shops, isOwner, scopedShopIds,
}: {
  open: boolean; onClose: () => void;
  shops: any[]; isOwner: boolean; scopedShopIds: number[];
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [shopId, setShopId] = useState("");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const visibleShops = isOwner
    ? shops.filter((s) => scopedShopIds.includes(s.id))
    : shops;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(text);
          if (!Array.isArray(parsed)) { setParseError("Le JSON doit être un tableau d'objets."); return; }
          setRows(parsed.map((r) => ({ ...r })));
          setParseError("");
        } else {
          const parsed = parseCSV(text);
          if (!parsed.length) { setParseError("Fichier vide ou format invalide."); return; }
          setRows(parsed);
          setParseError("");
        }
      } catch (err: any) {
        setParseError(`Erreur de parsing: ${err?.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!shopId) { toast({ title: "Choisissez une boutique", variant: "destructive" }); return; }
    if (!rows.length) { toast({ title: "Aucun produit à importer", variant: "destructive" }); return; }
    setImporting(true);
    setProgress({ done: 0, total: rows.length });
    let successes = 0;
    let errors = 0;
    for (const row of rows) {
      try {
        const price = parseFloat(row.price);
        if (!row.name || isNaN(price)) { errors++; setProgress((p) => ({ ...p, done: p.done + 1 })); continue; }
        await apiFetch("/api/backend/products", {
          method: "POST",
          body: JSON.stringify({
            restaurantId: Number(shopId),
            name: row.name.trim(),
            description: row.description || undefined,
            price,
            category: row.category || "Général",
            imageUrl: row.imageUrl || undefined,
            isAvailable: row.isAvailable !== "false",
            isPopular: row.isPopular === "true",
            allergens: row.allergens || undefined,
            prepTimeMinutes: row.prepTimeMinutes ? Number(row.prepTimeMinutes) : undefined,
            calories: row.calories ? Number(row.calories) : undefined,
            tags: row.tags || undefined,
          }),
        });
        successes++;
      } catch { errors++; }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    qc.invalidateQueries({ queryKey: getListBackendProductsQueryKey() });
    setImporting(false);
    toast({ title: `Import terminé: ${successes} créés, ${errors} erreurs` });
    if (successes > 0) { setRows([]); onClose(); }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE_HEADERS + "\n" + CSV_EXAMPLE], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "produits_template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !importing) { onClose(); setRows([]); setParseError(""); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" /> Importer des produits
          </DialogTitle>
          <DialogDescription>
            Téléversez un fichier CSV ou JSON pour créer plusieurs produits en une fois.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          {/* Template download */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
              <span>Colonnes requises: <strong>name</strong>, <strong>price</strong>, <strong>category</strong></span>
              <Button variant="outline" size="sm" className="gap-2 h-7" onClick={downloadTemplate}>
                <Download className="h-3.5 w-3.5" /> Télécharger le modèle CSV
              </Button>
            </AlertDescription>
          </Alert>

          {/* Shop select */}
          <div className="space-y-1">
            <Label className="text-xs">Boutique cible *</Label>
            <Select value={shopId || "none"} onValueChange={(v) => setShopId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Choisir une boutique" /></SelectTrigger>
              <SelectContent className="z-[200]">
                <SelectItem value="none">— Choisir —</SelectItem>
                {visibleShops.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File input */}
          <div className="space-y-2">
            <Label className="text-xs">Fichier CSV ou JSON</Label>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
                <FileUp className="h-4 w-4" />
                {rows.length > 0 ? `${rows.length} ligne(s) chargée(s)` : "Choisir un fichier"}
              </Button>
              {rows.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setRows([])}>Effacer</Button>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".csv,.json" className="hidden" onChange={handleFile} />
            {parseError && <p className="text-xs text-destructive">{parseError}</p>}
          </div>

          {/* Preview table */}
          {rows.length > 0 && (
            <div className="border rounded-md overflow-x-auto max-h-60">
              <table className="text-xs w-full">
                <thead className="bg-muted/60 sticky top-0">
                  <tr>
                    {Object.keys(rows[0]).slice(0, 6).map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left font-medium">{h}</th>
                    ))}
                    {Object.keys(rows[0]).length > 6 && <th className="px-2 py-1.5 text-left font-medium">…</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-t hover:bg-muted/30">
                      {Object.values(row).slice(0, 6).map((v, j) => (
                        <td key={j} className="px-2 py-1 max-w-[140px] truncate">{String(v)}</td>
                      ))}
                      {Object.keys(row).length > 6 && <td className="px-2 py-1 text-muted-foreground">…</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 20 && (
                <p className="text-xs text-muted-foreground text-center py-1.5 border-t">
                  + {rows.length - 20} lignes non affichées
                </p>
              )}
            </div>
          )}

          {/* Progress */}
          {importing && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Import en cours: {progress.done}/{progress.total}
            </div>
          )}
        </div>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => { onClose(); setRows([]); setParseError(""); }} disabled={importing}>
            Annuler
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || !shopId || !rows.length}
            className="gap-2"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            Importer {rows.length > 0 ? `(${rows.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
