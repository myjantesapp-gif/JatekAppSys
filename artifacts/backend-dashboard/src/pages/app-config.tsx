import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Save, Loader2, Globe, AlertTriangle, Star, LayoutGrid, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const DEFAULT_CONFIG = {
  defaultLanguage: "fr",
  maintenanceMode: false,
  featuredCount: 6,
  homeOrder: ["banners", "categories", "featured", "all"],
  welcomeMessage: "Bienvenue sur Jatek !",
};

type AppConfigData = typeof DEFAULT_CONFIG;

const HOME_SECTIONS = [
  { key: "banners", label: "Bannières" },
  { key: "categories", label: "Catégories" },
  { key: "featured", label: "Restaurants vedettes" },
  { key: "all", label: "Tous les restaurants" },
];

export default function AppConfig() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: config, isLoading } = useQuery<AppConfigData>({
    queryKey: ["/api/backend/app-config"],
    queryFn: () => apiFetch("/api/backend/app-config"),
  });

  const [form, setForm] = useState<AppConfigData>(DEFAULT_CONFIG);

  useEffect(() => {
    if (config) setForm({ ...DEFAULT_CONFIG, ...config });
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: (data: AppConfigData) =>
      apiFetch("/api/backend/app-config", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/backend/app-config"] });
      toast({ title: "Configuration sauvegardée ✓" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const moveSection = (key: string, dir: -1 | 1) => {
    const arr = [...form.homeOrder];
    const i = arr.indexOf(key);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setForm({ ...form, homeOrder: arr });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" /> App Config
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configuration lue par l'app mobile au démarrage via <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/app-config</code>
          </p>
        </div>
        <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
          {saveMutation.isPending
            ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
            : <Save className="h-4 w-4 mr-2" />}
          Sauvegarder
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Language */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" /> Langue par défaut
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={form.defaultLanguage}
                onValueChange={(v) => setForm({ ...form, defaultLanguage: v })}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">🇫🇷 Français</SelectItem>
                  <SelectItem value="ar">🇲🇦 العربية</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Maintenance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Mode maintenance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.maintenanceMode}
                  onCheckedChange={(v) => setForm({ ...form, maintenanceMode: v })}
                />
                <Label>
                  {form.maintenanceMode
                    ? <Badge variant="destructive">Maintenance activée — app indisponible</Badge>
                    : <span className="text-muted-foreground text-sm">Désactivé — app visible normalement</span>}
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Featured count */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4" /> Restaurants vedettes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={form.featuredCount}
                  onChange={(e) => setForm({ ...form, featuredCount: Number(e.target.value) })}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  restaurants affichés dans le carousel "Vedettes" (flag <code className="text-xs bg-muted px-1 rounded">isFeatured</code>)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Home sections order */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" /> Ordre des sections home
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {form.homeOrder.map((key, idx) => {
                  const sec = HOME_SECTIONS.find((s) => s.key === key);
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/30"
                    >
                      <span className="text-xs text-muted-foreground font-mono w-5 text-center">{idx + 1}</span>
                      <span className="flex-1 text-sm font-medium">{sec?.label ?? key}</span>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => moveSection(key, -1)} disabled={idx === 0}
                      >↑</Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => moveSection(key, 1)} disabled={idx === form.homeOrder.length - 1}
                      >↓</Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Welcome message */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Message d'accueil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={2}
                value={form.welcomeMessage}
                onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })}
                placeholder="Bienvenue sur Jatek !"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Affiché dans l'app mobile sur l'écran d'accueil.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
