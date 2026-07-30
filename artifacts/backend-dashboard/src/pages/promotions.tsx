import { useState } from "react";
import {
  useListBackendAds,
  useCreateBackendAd,
  useUpdateBackendAd,
  useDeleteBackendAd,
  getListBackendAdsQueryKey,
  type Ad,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";

type AdType = "jatek_offer" | "vip_banner" | "promo_banner";

interface AdForm {
  type: AdType;
  title: string;
  subtitle: string;
  badge: string;
  bgColor: string;
  accentColor: string;
  icon: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  sortOrder: number;
}

const EMPTY_FORM: AdForm = {
  type: "vip_banner",
  title: "",
  subtitle: "",
  badge: "",
  bgColor: "#E91E63",
  accentColor: "",
  icon: "star",
  imageUrl: "",
  linkUrl: "",
  isActive: true,
  sortOrder: 0,
};

const AD_TYPE_LABELS: Record<AdType, string> = {
  jatek_offer: "Offre Jatek",
  vip_banner: "Bannière VIP",
  promo_banner: "Bannière Promo",
};

export default function Promotions() {
  const { data: ads, isLoading } = useListBackendAds({});
  const createAd = useCreateBackendAd();
  const updateAd = useUpdateBackendAd();
  const deleteAd = useDeleteBackendAd();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AdForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: getListBackendAdsQueryKey() });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (ad: any) => {
    setEditingId(ad.id);
    setForm({
      type: ad.type ?? "vip_banner",
      title: ad.title ?? "",
      subtitle: ad.subtitle ?? "",
      badge: ad.badge ?? "",
      bgColor: ad.bgColor ?? "#E91E63",
      accentColor: ad.accentColor ?? "",
      icon: ad.icon ?? "star",
      imageUrl: ad.imageUrl ?? "",
      linkUrl: ad.linkUrl ?? "",
      isActive: ad.isActive ?? true,
      sortOrder: ad.sortOrder ?? 0,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Titre requis", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      type: form.type,
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || undefined,
      badge: form.badge.trim() || undefined,
      bgColor: form.bgColor,
      accentColor: form.accentColor.trim() || undefined,
      icon: form.icon.trim() || "star",
      imageUrl: form.imageUrl.trim() || undefined,
      linkUrl: form.linkUrl.trim() || undefined,
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder),
    };
    try {
      if (editingId) {
        await updateAd.mutateAsync({ id: editingId, data: payload });
        toast({ title: "Publicité mise à jour" });
      } else {
        await createAd.mutateAsync({ data: payload });
        toast({ title: "Publicité créée" });
      }
      invalidate();
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Supprimer cette publicité ?")) return;
    deleteAd.mutate({ id }, {
      onSuccess: () => { invalidate(); toast({ title: "Supprimée" }); },
      onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
    });
  };

  const field = (k: keyof AdForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tags className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Promotions</h1>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nouvelle publicité</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Publicités actives ({ads?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Badge</TableHead>
                <TableHead>Couleur</TableHead>
                <TableHead>Ordre</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
                : ads?.length === 0
                  ? <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Aucune publicité.</TableCell></TableRow>
                  : ads?.map((ad: Ad) => (
                    <TableRow key={ad.id}>
                      <TableCell className="font-medium max-w-[180px] truncate">{ad.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{AD_TYPE_LABELS[ad.type as AdType] ?? ad.type}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{ad.badge || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full border" style={{ background: ad.bgColor ?? "#ccc" }} />
                          <span className="text-xs text-muted-foreground">{ad.bgColor}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{ad.sortOrder}</TableCell>
                      <TableCell>
                        <Badge variant={ad.isActive ? "default" : "secondary"}>
                          {ad.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(ad)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(ad.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier la publicité" : "Nouvelle publicité"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as AdType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AD_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Titre *</Label>
              <Input value={form.title} onChange={field("title")} placeholder="Ex: Livraison gratuite" />
            </div>
            <div className="grid gap-1.5">
              <Label>Sous-titre</Label>
              <Input value={form.subtitle} onChange={field("subtitle")} placeholder="Ex: Sur votre première commande" />
            </div>
            <div className="grid gap-1.5">
              <Label>Badge</Label>
              <Input value={form.badge} onChange={field("badge")} placeholder="Ex: NEW, -20%" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Couleur de fond</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.bgColor} onChange={(e) => setForm((p) => ({ ...p, bgColor: e.target.value }))} className="h-9 w-10 rounded border cursor-pointer" />
                  <Input value={form.bgColor} onChange={field("bgColor")} className="flex-1" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Couleur accent</Label>
                <Input value={form.accentColor} onChange={field("accentColor")} placeholder="#ffffff" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Icône</Label>
              <Input value={form.icon} onChange={field("icon")} placeholder="Ex: star, zap, gift" />
            </div>
            <div className="grid gap-1.5">
              <Label>URL image</Label>
              <Input value={form.imageUrl} onChange={field("imageUrl")} placeholder="https://..." />
            </div>
            <div className="grid gap-1.5">
              <Label>URL lien</Label>
              <Input value={form.linkUrl} onChange={field("linkUrl")} placeholder="/restaurant/42" />
            </div>
            <div className="grid gap-1.5">
              <Label>Ordre d'affichage</Label>
              <Input type="number" value={form.sortOrder} onChange={field("sortOrder")} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v })) } />
              <Label>Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
