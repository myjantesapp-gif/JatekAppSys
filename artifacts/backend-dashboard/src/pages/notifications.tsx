import { useState } from "react";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, Users, Truck, User, CheckCircle2, AlertCircle } from "lucide-react";

type Target = "customers" | "drivers" | "all" | "single";

const TARGET_OPTIONS: { value: Target; label: string; description: string; icon: React.ElementType }[] = [
  { value: "customers", label: "Tous les clients", description: "Tous les comptes clients actifs", icon: Users },
  { value: "drivers", label: "Tous les livreurs", description: "Tous les livreurs actifs", icon: Truck },
  { value: "all", label: "Clients + Livreurs", description: "Tous les utilisateurs actifs de l'app", icon: Bell },
  { value: "single", label: "Numéro spécifique", description: "Un seul numéro de téléphone", icon: User },
];

interface SendResult {
  sent: number;
  failed: number;
  total: number;
  errors?: string[];
}

export default function Notifications() {
  const [target, setTarget] = useState<Target>("customers");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTarget = TARGET_OPTIONS.find((o) => o.value === target)!;

  const handleSend = async () => {
    if (!message.trim()) {
      setError("Le message ne peut pas être vide.");
      return;
    }
    if (target === "single" && !phone.trim()) {
      setError("Veuillez saisir un numéro de téléphone.");
      return;
    }
    if (!confirm(`Envoyer un SMS à : ${selectedTarget.label} ?\n\n"${message.trim()}"`)) return;

    setSending(true);
    setResult(null);
    setError(null);

    try {
      const data = await customFetch<SendResult>("/api/backend/notifications/send", {
        method: "POST",
        body: JSON.stringify({ target, message: message.trim(), phone: phone.trim() || undefined }),
        headers: { "Content-Type": "application/json" },
      });
      setResult(data);
    } catch (e: any) {
      setError(e?.data?.error ?? e?.message ?? "Erreur lors de l'envoi.");
    } finally {
      setSending(false);
    }
  };

  const charCount = message.length;
  const smsCount = Math.ceil(charCount / 160) || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Bell className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Envoi de messages SMS aux utilisateurs de la plateforme</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Destinataires</CardTitle>
              <CardDescription>Choisissez qui recevra le message</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {TARGET_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = target === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setTarget(opt.value)}
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className={`mt-0.5 p-1.5 rounded-md ${active ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${active ? "text-primary" : ""}`}>{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {target === "single" && (
                <div className="grid gap-1.5 pt-1">
                  <Label>Numéro de téléphone</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+212600000000"
                    type="tel"
                  />
                  <p className="text-xs text-muted-foreground">Format international (ex: +212612345678)</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message SMS</CardTitle>
              <CardDescription>Rédigez votre message. Un SMS standard fait 160 caractères.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Votre message ici…"
                rows={5}
                maxLength={1600}
                className="resize-none"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{charCount} caractère{charCount !== 1 ? "s" : ""}</span>
                <span>{smsCount} SMS</span>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erreur</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {result && (
                <Alert variant={result.failed === 0 ? "default" : "destructive"}>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>
                    {result.failed === 0
                      ? `${result.sent} message${result.sent > 1 ? "s" : ""} envoyé${result.sent > 1 ? "s" : ""}`
                      : `${result.sent} envoyé${result.sent > 1 ? "s" : ""}, ${result.failed} échoué${result.failed > 1 ? "s" : ""}`}
                  </AlertTitle>
                  {result.errors && result.errors.length > 0 && (
                    <AlertDescription className="mt-1 text-xs">
                      {result.errors.slice(0, 3).map((e, i) => <div key={i}>{e}</div>)}
                    </AlertDescription>
                  )}
                </Alert>
              )}

              <Button onClick={handleSend} disabled={sending || !message.trim()} className="w-full" size="lg">
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Envoi en cours…" : `Envoyer à : ${selectedTarget.label}`}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Les SMS sont envoyés via les fournisseurs configurés (Twilio, Infobip) aux numéros enregistrés dans la base de données.</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Clients</Badge>
                  <span>Comptes avec rôle "customer"</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Livreurs</Badge>
                  <span>Livreurs actifs</span>
                </div>
              </div>
              <p className="text-xs">Le nombre maximal de destinataires par envoi est limité à 200. Pour des campagnes plus importantes, effectuez plusieurs envois.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Exemples de messages</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                "Nouvelle promo Jatek : livraison gratuite sur votre prochaine commande ! 🛵",
                "Jatek : votre restaurant préféré est maintenant disponible. Commandez dès maintenant !",
                "Notification de maintenance : l'app sera indisponible de 2h à 3h. Merci pour votre compréhension.",
              ].map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setMessage(ex)}
                  className="w-full text-left p-2.5 rounded-md border text-xs hover:bg-accent transition-colors"
                >
                  {ex}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
