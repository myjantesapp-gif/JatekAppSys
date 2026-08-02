import { useState, useRef } from "react";
import {
  useListBackendShops,
  useListBackendStaff,
  useBackendMe,
  useListBackendCategories,
  getListBackendShopsQueryKey,
} from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Star, Store, MapPin, Phone, Plus, Pencil, Trash2, Loader2, Clock, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { uploadImage } from "@/lib/upload";

const DAY_LABELS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
type HourRow = { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean };
const defaultHours = (): HourRow[] =>
  Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i, openTime: "09:00", closeTime: "22:00", isClosed: i === 0 }));

// ─── Types for API-fetched categories ────────────────────────────────────────
type SubCat = { id: number; name: string; slug: string; businessType: string };
type CatWithSubs = { id: number; name: string; slug: string; businessType: string; subCategories: SubCat[] };

const EMPTY = {
  name: "", description: "", address: "", phone: "",
  parentSlug: "",      // UI-only: which top-level category is selected
  category: "",        // saved to DB — equals the subcategory's apiCategory (e.g. "Pizza")
  businessType: "",    // derived from parentSlug (e.g. "restaurant")
  subcategoryId: "",   // legacy DB ref — kept for compatibility
  imageUrl: "", logoUrl: "",
  deliveryTime: "", deliveryFee: "", minimumOrder: "",
  isOpen: true, ownerId: "", isFeatured: false,
};

export default function Shops() {
  const [search, setSearch] = useState("");
  const { data: me } = useBackendMe();
  const { data: shops, isLoading } = useListBackendShops({ search: search || undefined });
  const { data: staff } = useListBackendStaff();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isAdmin = me?.user.role === "admin" || me?.user.role === "super_admin";
  const ownerCandidates = (staff || []).filter(
    (u: any) => ["restaurant_owner", "admin", "super_admin"].includes(u.role)
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [hoursShopId, setHoursShopId] = useState<number | null>(null);
  const [hoursForm, setHoursForm] = useState<HourRow[]>(defaultHours());
  const [hoursSaving, setHoursSaving] = useState(false);

  const { data: existingHours } = useQuery<HourRow[]>({
    queryKey: ["shop-hours", hoursShopId],
    queryFn: () => apiFetch(`/api/backend/shops/${hoursShopId}/hours`),
    enabled: !!hoursShopId,
  });

  const openHours = (shopId: number) => {
    setHoursShopId(shopId);
    setHoursForm(existingHours?.length ? existingHours : defaultHours());
  };

  const handleSaveHours = async () => {
    if (!hoursShopId) return;
    setHoursSaving(true);
    try {
      await apiFetch(`/api/backend/shops/${hoursShopId}/hours`, {
        method: "PUT",
        body: JSON.stringify({ hours: hoursForm }),
      });
      toast({ title: "Horaires enregistrés ✓" });
      setHoursShopId(null);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    } finally {
      setHoursSaving(false);
    }
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: getListBackendShopsQueryKey() });

  const buildBody = (f: typeof EMPTY) => ({
    name: f.name,
    description: f.description || undefined,
    address: f.address,
    phone: f.phone || undefined,
    category: f.category || undefined,
    businessType: f.businessType || undefined,
    subcategoryId: f.subcategoryId ? Number(f.subcategoryId) : undefined,
    imageUrl: f.imageUrl || undefined,
    logoUrl: f.logoUrl || undefined,
    deliveryTime: f.deliveryTime ? Number(f.deliveryTime) : undefined,
    deliveryFee: f.deliveryFee ? Number(f.deliveryFee) : undefined,
    minimumOrder: f.minimumOrder ? Number(f.minimumOrder) : undefined,
    ownerId: f.ownerId ? Number(f.ownerId) : undefined,
    isFeatured: f.isFeatured ?? false,
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      apiFetch("/api/backend/shops", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      invalidate(); setCreateOpen(false); setForm(EMPTY);
      toast({ title: "Boutique créée" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiFetch(`/api/backend/shops/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      invalidate(); setEditing(null); toast({ title: "Boutique modifiée" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/backend/shops/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidate(); toast({ title: "Supprimée" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(buildBody(form));
  };

  const openEdit = (s: any) => {
    // parentSlug is left empty — ShopForm resolves it automatically from
    // the existing category value against the live API category tree.
    setEditing(s);
    setEditForm({
      name: s.name ?? "",
      description: s.description ?? "",
      address: s.address ?? "",
      phone: s.phone ?? "",
      parentSlug: "",
      category: s.category ?? "",
      businessType: s.businessType ?? "",
      subcategoryId: s.subcategoryId ? String(s.subcategoryId) : "",
      imageUrl: s.imageUrl ?? "",
      logoUrl: s.logoUrl ?? "",
      deliveryTime: String(s.deliveryTime ?? ""),
      deliveryFee: String(s.deliveryFee ?? ""),
      minimumOrder: String(s.minimumOrder ?? ""),
      isOpen: !!s.isOpen,
      ownerId: s.ownerId ? String(s.ownerId) : "",
      isFeatured: !!(s as any).isFeatured,
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    updateMutation.mutate({
      id: editing.id,
      data: { ...buildBody(editForm), isOpen: editForm.isOpen },
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Supprimer cette boutique ?")) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Boutiques</h1>
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Nouvelle boutique</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Créer une boutique</DialogTitle></DialogHeader>
              <ShopForm
                form={form} setForm={setForm} onSubmit={handleCreate}
                pending={createMutation.isPending} submitLabel="Créer"
                ownerCandidates={ownerCandidates} isAdmin={isAdmin}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Boutique</TableHead>
                  <TableHead className="hidden sm:table-cell">Catégorie</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead className="hidden md:table-cell">Note</TableHead>
                  <TableHead className="hidden lg:table-cell">Vedette</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="pl-4"><Skeleton className="h-10 w-48" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-8 w-32" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  : shops?.length === 0
                    ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            Aucune boutique.
                          </TableCell>
                        </TableRow>
                      )
                    : shops?.map((shop) => (
                        <TableRow key={shop.id}>
                          <TableCell className="font-medium pl-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center overflow-hidden border flex-shrink-0">
                                {shop.logoUrl
                                  ? <img src={shop.logoUrl} alt={shop.name} className="h-full w-full object-cover" />
                                  : <Store className="h-5 w-5 text-muted-foreground" />
                                }
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold truncate max-w-[140px] sm:max-w-[200px]">{shop.name}</div>
                                <div className="text-xs text-muted-foreground flex items-center mt-0.5">
                                  <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                                  <span className="truncate max-w-[120px] sm:max-w-[180px]">{shop.address}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline">{shop.category}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="text-sm text-muted-foreground flex items-center">
                              <Phone className="h-3 w-3 mr-1" />{shop.phone || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                              <span className="font-medium text-sm">{shop.rating || "Nouveau"}</span>
                              <span className="text-xs text-muted-foreground">({shop.reviewCount})</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {(shop as any).isFeatured
                              ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                              : <span className="text-muted-foreground text-xs">—</span>
                            }
                          </TableCell>
                          <TableCell>
                            <Badge className={shop.isOpen ? "bg-green-500 hover:bg-green-600" : "bg-destructive"}>
                              {shop.isOpen ? "Ouvert" : "Fermé"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost" size="icon" className="h-9 w-9"
                                title="Horaires" onClick={() => openHours(shop.id)}
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-9 w-9"
                                onClick={() => openEdit(shop)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-9 w-9 text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDelete(shop.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Hours Dialog */}
      <Dialog open={!!hoursShopId} onOpenChange={(o) => !o && setHoursShopId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Horaires d'ouverture</DialogTitle></DialogHeader>
          <div className="space-y-2 pt-2 max-h-[60vh] overflow-y-auto pr-1">
            {hoursForm.map((row, idx) => (
              <div
                key={row.dayOfWeek}
                className={`flex flex-wrap items-center gap-2 p-2 rounded-lg border ${row.isClosed ? "bg-muted/40 opacity-60" : ""}`}
              >
                <span className="w-24 text-sm font-medium shrink-0">{DAY_LABELS[row.dayOfWeek]}</span>
                <label className="flex items-center gap-1.5 text-xs shrink-0">
                  <Switch
                    checked={!row.isClosed}
                    onCheckedChange={(v) =>
                      setHoursForm((h) => h.map((r, i) => i === idx ? { ...r, isClosed: !v } : r))
                    }
                  />
                  {row.isClosed ? "Fermé" : "Ouvert"}
                </label>
                {!row.isClosed && (
                  <>
                    <Input
                      type="time" className="flex-1 min-w-[90px] h-8 text-sm"
                      value={row.openTime}
                      onChange={(e) =>
                        setHoursForm((h) => h.map((r, i) => i === idx ? { ...r, openTime: e.target.value } : r))
                      }
                    />
                    <span className="text-xs text-muted-foreground">→</span>
                    <Input
                      type="time" className="flex-1 min-w-[90px] h-8 text-sm"
                      value={row.closeTime}
                      onChange={(e) =>
                        setHoursForm((h) => h.map((r, i) => i === idx ? { ...r, closeTime: e.target.value } : r))
                      }
                    />
                  </>
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setHoursShopId(null)}>Annuler</Button>
            <Button onClick={handleSaveHours} disabled={hoursSaving}>
              {hoursSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifier {editing?.name}</DialogTitle></DialogHeader>
          {editing && (
            <ShopForm
              form={editForm} setForm={setEditForm}
              onSubmit={handleUpdate} pending={updateMutation.isPending}
              submitLabel="Enregistrer"
              ownerCandidates={ownerCandidates} isAdmin={isAdmin}
              extra={
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editForm.isOpen}
                    onCheckedChange={(v) => setEditForm({ ...editForm, isOpen: v })}
                    id="isOpen-switch"
                  />
                  <Label htmlFor="isOpen-switch">Ouvert</Label>
                </div>
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ShopForm ────────────────────────────────────────────────────────────────

function ShopForm({
  form, setForm, onSubmit, pending, submitLabel, extra, ownerCandidates, isAdmin,
}: {
  form: typeof EMPTY;
  setForm: (f: typeof EMPTY) => void;
  onSubmit: (e: React.FormEvent) => void;
  pending: boolean;
  submitLabel: string;
  extra?: React.ReactNode;
  ownerCandidates: any[];
  isAdmin: boolean;
}) {
  const { data: allCategories } = useListBackendCategories();
  const { toast } = useToast();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const cats = (allCategories ?? []) as unknown as CatWithSubs[];

  // Find the active parent: prefer explicit parentSlug selection, fall back to
  // matching an existing shop's category value against any subcategory name.
  const selectedParent =
    cats.find((c) => c.slug === form.parentSlug) ??
    cats.find((c) => c.subCategories.some((s) => s.name === form.category));
  const subcats = selectedParent?.subCategories ?? [];

  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  const handleUpload = async (
    file: File,
    key: "logoUrl" | "imageUrl",
    setUploading: (v: boolean) => void
  ) => {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      set(key, url);
      toast({ title: "Image téléversée ✓" });
    } catch (err: any) {
      toast({ title: "Erreur upload", description: err?.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 pt-4">
      {/* Name */}
      <Field label="Nom *">
        <Input required value={form.name} onChange={(e) => set("name", e.target.value)} />
      </Field>

      {/* Category cascade — parent first, then subcategory */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1. Parent category — sets businessType */}
        <Field label="Catégorie">
          <Select
            value={selectedParent?.slug || "__none__"}
            onValueChange={(v) => {
              if (v === "__none__") {
                setForm({ ...form, parentSlug: "", businessType: "", category: "", subcategoryId: "" });
                return;
              }
              const parent = cats.find((c) => c.slug === v);
              setForm({ ...form, parentSlug: v, businessType: parent?.businessType ?? "", category: "", subcategoryId: "" });
            }}
          >
            <SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
            <SelectContent className="z-[200]">
              <SelectItem value="__none__">— Aucune —</SelectItem>
              {cats.map((c) => (
                <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {/* 2. Subcategory — its name becomes form.category (what the mobile filters by) */}
        <Field label="Sous-catégorie">
          <Select
            value={form.category || "__none__"}
            onValueChange={(v) => {
              if (v === "__none__") { setForm({ ...form, category: "", subcategoryId: "" }); return; }
              const sub = subcats.find((s) => s.name === v);
              setForm({ ...form, category: v, subcategoryId: sub ? String(sub.id) : "" });
            }}
            disabled={!selectedParent || subcats.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                !selectedParent
                  ? "Choisir d'abord une catégorie"
                  : subcats.length === 0
                    ? "Aucune sous-catégorie"
                    : "Choisir…"
              } />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              <SelectItem value="__none__">— Aucune —</SelectItem>
              {subcats.map((s) => (
                <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* Address + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Adresse *" full>
          <Input required value={form.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="Téléphone">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
      </div>

      {/* Logo upload */}
      <Field label="Logo">
        <div className="flex gap-2">
          <Input
            value={form.logoUrl}
            onChange={(e) => set("logoUrl", e.target.value)}
            placeholder="URL ou cliquez pour uploader…"
            className="flex-1 min-w-0"
          />
          <Button
            type="button" variant="outline" size="icon" className="shrink-0"
            onClick={() => logoRef.current?.click()}
            disabled={uploadingLogo}
            title="Téléverser un logo"
          >
            {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          </Button>
        </div>
        <input
          ref={logoRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f, "logoUrl", setUploadingLogo);
            e.target.value = "";
          }}
        />
        {form.logoUrl && (
          <img
            src={form.logoUrl} alt="logo preview"
            className="mt-2 h-16 w-16 rounded-lg object-cover border"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
      </Field>

      {/* Banner image upload */}
      <Field label="Image bannière">
        <div className="flex gap-2">
          <Input
            value={form.imageUrl}
            onChange={(e) => set("imageUrl", e.target.value)}
            placeholder="URL ou cliquez pour uploader…"
            className="flex-1 min-w-0"
          />
          <Button
            type="button" variant="outline" size="icon" className="shrink-0"
            onClick={() => imageRef.current?.click()}
            disabled={uploadingImage}
            title="Téléverser une bannière"
          >
            {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          </Button>
        </div>
        <input
          ref={imageRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f, "imageUrl", setUploadingImage);
            e.target.value = "";
          }}
        />
        {form.imageUrl && (
          <img
            src={form.imageUrl} alt="bannière preview"
            className="mt-2 h-28 w-full rounded-lg object-cover border"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
      </Field>

      {/* Description */}
      <Field label="Description">
        <Textarea rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
      </Field>

      {/* Delivery numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Délai livraison (min)">
          <Input type="number" value={form.deliveryTime} onChange={(e) => set("deliveryTime", e.target.value)} />
        </Field>
        <Field label="Frais livraison (DH)">
          <Input type="number" value={form.deliveryFee} onChange={(e) => set("deliveryFee", e.target.value)} />
        </Field>
        <Field label="Min. commande (DH)">
          <Input type="number" value={form.minimumOrder} onChange={(e) => set("minimumOrder", e.target.value)} />
        </Field>
      </div>

      {/* Owner */}
      {isAdmin && (
        <Field label="Propriétaire">
          <Select
            value={form.ownerId || "none"}
            onValueChange={(v) => set("ownerId", v === "none" ? "" : v)}
          >
            <SelectTrigger><SelectValue placeholder="Choisir un propriétaire" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Aucun —</SelectItem>
              {ownerCandidates.map((u: any) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.name} ({u.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {/* Featured toggle */}
      <div className="flex items-center gap-2 pt-1">
        <Switch
          checked={form.isFeatured}
          onCheckedChange={(v: boolean) => set("isFeatured", v)}
          id="featured-switch"
        />
        <Label htmlFor="featured-switch" className="text-sm cursor-pointer">
          Mis en avant (carousel d'accueil)
        </Label>
      </div>

      {extra}

      <DialogFooter className="pt-4">
        <Button type="submit" disabled={pending || uploadingLogo || uploadingImage}>
          {pending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-1 ${full ? "col-span-full" : ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
