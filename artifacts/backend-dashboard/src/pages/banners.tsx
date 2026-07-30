import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Loader2, Image, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Ad {
  id: number; type: string; title: string; subtitle?: string; badge?: string;
  bgColor: string; accentColor?: string; icon: string; imageUrl?: string;
  linkUrl?: string; isActive: boolean; sortOrder: number; createdAt: string;
}

const EMPTY = {
  type: "vip_banner", title: "", subtitle: "", badge: "", bgColor: "#E91E63",
  accentColor: "#FF80AB", icon: "star", imageUrl: "", linkUrl: "", isActive: true, sortOrder: 0,
};

const AD_TYPES = [
  { value: "vip_banner", label: "Bannière VIP" },
  { value: "promo_banner", label: "Bannière Promo" },
  { value: "hero", label: "Hero (grande)" },
  { value: "mini_card", label: "Mini carte" },
  { value: "interstitial", label: "Interstitiel" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs font-medium">{label}</Label>{children}</div>;
}

function AdForm({ form, setForm }: { form: typeof EMPTY; setForm: (f: typeof EMPTY) => void }) {
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Type">
          <Select value={form.type} onValueChange={(v) => set("type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{AD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Ordre d'affichage">
          <Input type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} />
        </Field>
      </div>
      <Field label="Titre *"><Input required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex: Offre spéciale -20%" /></Field>
      <Field label="Sous-titre"><Input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="Ex: Livraison offerte ce soir" /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Badge"><Input value={form.badge} onChange={(e) => set("badge", e.target.value)} placeholder="Ex: VIP, PROMO, NEW" /></Field>
        <Field label="Icône"><Input value={form.icon} onChange={(e) => set("icon", e.target.value)} placeholder="Ex: star, flame, gift" /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Couleur fond">
          <div className="flex gap-2 items-center">
            <input type="color" value={form.bgColor} onChange={(e) => set("bgColor", e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
            <Input value={form.bgColor} onChange={(e) => set("bgColor", e.target.value)} className="flex-1" />
          </div>
        </Field>
        <Field label="Couleur accent">
          <div className="flex gap-2 items-center">
            <input type="color" value={form.accentColor || "#ffffff"} onChange={(e) => set("accentColor", e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
            <Input value={form.accentColor} onChange={(e) => set("accentColor", e.target.value)} className="flex-1" />
          </div>
        </Field>
      </div>
      <Field label="URL image"><Input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://..." /></Field>
      <Field label="URL du lien"><Input value={form.linkUrl} onChange={(e) => set("linkUrl", e.target.value)} placeholder="https://... ou deep link" /></Field>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
        Actif (visible dans l'application)
      </label>
    </div>
  );
}

export default function Banners() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<Ad | null>(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const { data: ads, isLoading } = useQuery<Ad[]>({
    queryKey: ["/api/backend/ads"],
    queryFn: () => apiFetch("/api/backend/ads"),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/backend/ads"] });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) { toast({ title: "Titre requis", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      await apiFetch("/api/backend/ads", { method: "POST", body: JSON.stringify(form) });
      invalidate(); setCreateOpen(false); setForm(EMPTY);
      toast({ title: "Bannière créée ✓" });
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const openEdit = (ad: Ad) => {
    setEditing(ad);
    setEditForm({ type: ad.type, title: ad.title, subtitle: ad.subtitle ?? "", badge: ad.badge ?? "", bgColor: ad.bgColor, accentColor: ad.accentColor ?? "#FF80AB", icon: ad.icon, imageUrl: ad.imageUrl ?? "", linkUrl: ad.linkUrl ?? "", isActive: ad.isActive, sortOrder: ad.sortOrder });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/backend/ads/${editing.id}`, { method: "PATCH", body: JSON.stringify(editForm) });
      invalidate(); setEditing(null);
      toast({ title: "Bannière mise à jour ✓" });
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const handleToggle = async (ad: Ad, isActive: boolean) => {
    try {
      await apiFetch(`/api/backend/ads/${ad.id}`, { method: "PATCH", body: JSON.stringify({ isActive }) });
      invalidate();
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cette bannière ?")) return;
    try {
      await apiFetch(`/api/backend/ads/${id}`, { method: "DELETE" });
      invalidate(); toast({ title: "Bannière supprimée" });
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bannières & Publicités</h1>
          <p className="text-muted-foreground text-sm mt-1">Gérez les bannières promotionnelles affichées dans l'application mobile</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Nouvelle bannière</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Créer une bannière</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <AdForm form={form} setForm={setForm} />
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Créer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Preview cards */}
      {ads && ads.filter((a) => a.isActive).length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Aperçu des bannières actives</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {ads.filter((a) => a.isActive).map((ad) => (
              <div key={ad.id} className="shrink-0 rounded-xl p-4 w-56 text-white shadow-md" style={{ background: ad.bgColor }}>
                {ad.imageUrl && <img src={ad.imageUrl} alt={ad.title} className="h-20 w-full object-cover rounded-md mb-2" />}
                {ad.badge && <span className="text-xs font-bold bg-white/20 rounded px-2 py-0.5 mb-1 inline-block">{ad.badge}</span>}
                <p className="font-bold text-sm leading-tight">{ad.title}</p>
                {ad.subtitle && <p className="text-xs opacity-80 mt-0.5">{ad.subtitle}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Image className="h-4 w-4" /> Toutes les bannières ({ads?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"><GripVertical className="h-4 w-4 text-muted-foreground" /></TableHead>
                <TableHead>Bannière</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead className="hidden md:table-cell">Couleur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-12 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              )) : ads?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Aucune bannière. Créez-en une !</TableCell></TableRow>
              ) : ads?.map((ad) => (
                <TableRow key={ad.id}>
                  <TableCell className="text-muted-foreground">{ad.sortOrder}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-16 rounded-md shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ background: ad.bgColor }}>
                        {ad.imageUrl ? <img src={ad.imageUrl} className="h-full w-full object-cover rounded-md" /> : ad.badge ?? "AD"}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{ad.title}</p>
                        {ad.subtitle && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{ad.subtitle}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary">{AD_TYPES.find((t) => t.value === ad.type)?.label ?? ad.type}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="h-6 w-12 rounded-full border" style={{ background: ad.bgColor }} title={ad.bgColor} />
                  </TableCell>
                  <TableCell>
                    <Switch checked={ad.isActive} onCheckedChange={(v) => handleToggle(ad, v)} />
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openEdit(ad)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(ad.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifier la bannière</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={handleUpdate} className="space-y-4 pt-2">
              <AdForm form={editForm} setForm={setEditForm} />
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Enregistrer
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
