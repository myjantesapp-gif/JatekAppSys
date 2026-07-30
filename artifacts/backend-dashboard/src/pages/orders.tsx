import { useState } from "react";
import { useListBackendOrders, useUpdateOrderStatus, getListBackendOrdersQueryKey, Order, UpdateOrderStatusBodyStatus } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Ban, RotateCcw, Gift, MessageSquare } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

type OrderWithItems = Order & { items: Array<{ id: number; quantity: number; menuItemName: string; totalPrice: number; selectedSize?: string; selectedExtras?: string }> };

async function fetchOrderDetail(id: number): Promise<OrderWithItems> {
  const token = localStorage.getItem("jatek_backend_token");
  const res = await fetch(`/api/backend/orders/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  accepted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  preparing: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  ready: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  picked_up: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  en_route: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

type ActionModal = "refund" | "cancel" | "gesture" | "chat" | null;

export default function Orders() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [actionModal, setActionModal] = useState<ActionModal>(null);
  const [actionForm, setActionForm] = useState({ amount: "", reason: "", notes: "", refundToWallet: true });
  const [actionLoading, setActionLoading] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const { data: orders, isLoading } = useListBackendOrders({ search: search || undefined, status: status !== "all" ? status : undefined });
  const updateStatus = useUpdateOrderStatus();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: orderDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["backend-order-detail", selectedOrder?.id],
    queryFn: () => fetchOrderDetail(selectedOrder!.id),
    enabled: !!selectedOrder,
  });

  const { data: chatHistory } = useQuery<any[]>({
    queryKey: ["order-chat", selectedOrder?.id],
    queryFn: () => apiFetch(`/api/orders/${selectedOrder!.id}/chat`),
    enabled: !!selectedOrder && actionModal === "chat",
    refetchInterval: 5000,
  });

  const handleStatusUpdate = () => {
    if (!selectedOrder || !newStatus) return;
    updateStatus.mutate({ id: selectedOrder.id, data: { status: newStatus as UpdateOrderStatusBodyStatus } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListBackendOrdersQueryKey() });
        qc.invalidateQueries({ queryKey: ["backend-order-detail", selectedOrder.id] });
        setSelectedOrder({ ...selectedOrder, status: newStatus as any });
        toast({ title: "Statut mis à jour ✓" });
      },
      onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
    });
  };

  const handleAction = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      if (actionModal === "refund") {
        const res = await apiFetch(`/api/backend/orders/${selectedOrder.id}/refund`, {
          method: "POST",
          body: JSON.stringify({ amount: Number(actionForm.amount), reason: actionForm.reason, notes: actionForm.notes }),
        });
        toast({ title: `Remboursement effectué: ${res.refundedAmount} DH crédité ✓` });
      } else if (actionModal === "cancel") {
        const res = await apiFetch(`/api/backend/orders/${selectedOrder.id}/cancel`, {
          method: "PATCH",
          body: JSON.stringify({ reason: actionForm.reason, refundToWallet: actionForm.refundToWallet }),
        });
        toast({ title: res.message });
        setSelectedOrder({ ...selectedOrder, status: "cancelled" as any });
        qc.invalidateQueries({ queryKey: getListBackendOrdersQueryKey() });
      } else if (actionModal === "gesture") {
        const res = await apiFetch(`/api/backend/orders/${selectedOrder.id}/gesture`, {
          method: "POST",
          body: JSON.stringify({ amount: Number(actionForm.amount), reason: actionForm.reason }),
        });
        toast({ title: `Geste commercial: ${res.creditedAmount} DH crédité ✓` });
      }
      setActionModal(null);
      setActionForm({ amount: "", reason: "", notes: "", refundToWallet: true });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendChat = async () => {
    if (!selectedOrder || !chatMessage.trim()) return;
    setChatLoading(true);
    try {
      await apiFetch(`/api/orders/${selectedOrder.id}/chat`, {
        method: "POST",
        body: JSON.stringify({ message: chatMessage }),
      });
      setChatMessage("");
      qc.invalidateQueries({ queryKey: ["order-chat", selectedOrder.id] });
    } catch (e: any) { toast({ title: "Erreur chat", description: e?.message, variant: "destructive" }); }
    finally { setChatLoading(false); }
  };

  const handleExport = () => {
    const a = document.createElement("a");
    a.href = `/api/backend/export/orders?format=csv`;
    a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Commandes</h1>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher…" className="pl-8 w-full" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filtrer par statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.keys(STATUS_COLORS).map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Réf.</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="hidden sm:table-cell">Restaurant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {[48, 96, 128, 128, 80, 64].map((w, j) => (
                    <TableCell key={j} className={j === 3 ? "hidden sm:table-cell" : j === 1 ? "hidden sm:table-cell" : ""}>
                      <Skeleton className={`h-4 w-${w / 4}`} style={{ width: w }} />
                    </TableCell>
                  ))}
                </TableRow>
              )) : orders?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Aucune commande.</TableCell></TableRow>
              ) : orders?.map((order) => (
                <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedOrder(order); setNewStatus(order.status); }}>
                  <TableCell className="font-medium font-mono text-sm">#{order.reference ?? order.id}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{format(new Date(order.createdAt), "dd/MM HH:mm")}</TableCell>
                  <TableCell className="font-medium">{order.userName}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{order.restaurantName}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-800"}`}>
                      {order.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold">{order.total} DH</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order detail sheet */}
      <Sheet open={!!selectedOrder} onOpenChange={(o) => { if (!o) { setSelectedOrder(null); setActionModal(null); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedOrder && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle>Commande #{selectedOrder.reference ?? selectedOrder.id}</SheetTitle>
                <SheetDescription>{format(new Date(selectedOrder.createdAt), "PPP 'à' p")}</SheetDescription>
              </SheetHeader>

              <div className="space-y-4">
                {/* Status + total */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Statut</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[selectedOrder.status] ?? ""}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Total</p>
                    <p className="text-xl font-bold text-primary">{selectedOrder.total} DH</p>
                    {selectedOrder.discountAmount > 0 && <p className="text-xs text-green-600">-{selectedOrder.discountAmount} DH promo</p>}
                  </div>
                </div>

                {/* Order info */}
                <div className="rounded-lg border p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Client</span><span className="font-medium">{selectedOrder.userName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Restaurant</span><span className="font-medium">{selectedOrder.restaurantName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Livraison</span><span className="font-medium text-xs">{selectedOrder.deliveryAddress}</span></div>
                  {selectedOrder.notes && <div className="flex justify-between"><span className="text-muted-foreground">Notes</span><span className="text-xs italic">{selectedOrder.notes}</span></div>}
                </div>

                {/* Items */}
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-medium mb-2">Articles</p>
                  {detailLoading ? <Skeleton className="h-16 w-full" /> : (
                    <div className="space-y-1.5">
                      {orderDetail?.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.quantity}× {item.menuItemName}
                            {item.selectedSize && <span className="text-xs text-muted-foreground ml-1">({item.selectedSize})</span>}
                          </span>
                          <span className="font-medium">{item.totalPrice} DH</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Change status */}
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-sm font-medium">Changer le statut</p>
                  <div className="flex gap-2">
                    <Select value={newStatus || selectedOrder.status} onValueChange={setNewStatus}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["pending","accepted","preparing","ready","picked_up","en_route","delivered","cancelled"].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleStatusUpdate} disabled={updateStatus.isPending || !newStatus || newStatus === selectedOrder.status}>
                      {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mettre à jour"}
                    </Button>
                  </div>
                </div>

                {/* Admin actions */}
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-sm font-medium">Actions administrateur</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50 flex-1 min-w-[140px]" onClick={() => setActionModal("refund")}>
                      <RotateCcw className="h-4 w-4" /> Rembourser
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-pink-600 border-pink-200 hover:bg-pink-50 flex-1 min-w-[140px]" onClick={() => setActionModal("gesture")}>
                      <Gift className="h-4 w-4" /> Geste commercial
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 flex-1 min-w-[140px]" onClick={() => setActionModal("chat")}>
                      <MessageSquare className="h-4 w-4" /> Chat client
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/20 hover:bg-destructive/5 flex-1 min-w-[140px]" onClick={() => setActionModal("cancel")} disabled={["delivered","cancelled"].includes(selectedOrder.status)}>
                      <Ban className="h-4 w-4" /> Annuler
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Action modals */}
      <Dialog open={actionModal === "refund"} onOpenChange={(o) => !o && setActionModal(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Rembourser la commande</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1"><Label className="text-xs">Montant (DH) *</Label><Input type="number" step="0.01" placeholder={`Max: ${selectedOrder?.total} DH`} value={actionForm.amount} onChange={(e) => setActionForm({ ...actionForm, amount: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Raison *</Label><Input value={actionForm.reason} onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })} placeholder="Ex: Article manquant, retard excessif…" /></div>
            <div className="space-y-1"><Label className="text-xs">Notes internes</Label><Textarea rows={2} value={actionForm.notes} onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground">Le montant sera crédité sur le wallet du client.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal(null)}>Annuler</Button>
            <Button onClick={handleAction} disabled={actionLoading || !actionForm.amount || !actionForm.reason} className="bg-orange-600 hover:bg-orange-700">
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Rembourser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionModal === "cancel"} onOpenChange={(o) => !o && setActionModal(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Annuler la commande</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1"><Label className="text-xs">Raison *</Label><Input value={actionForm.reason} onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })} placeholder="Ex: Restaurant fermé, stock épuisé…" /></div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={actionForm.refundToWallet} onCheckedChange={(v) => setActionForm({ ...actionForm, refundToWallet: v })} />
              <span>Rembourser {selectedOrder?.total} DH sur le wallet client</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal(null)}>Retour</Button>
            <Button onClick={handleAction} disabled={actionLoading || !actionForm.reason} variant="destructive">
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionModal === "gesture"} onOpenChange={(o) => !o && setActionModal(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Geste commercial</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1"><Label className="text-xs">Montant à créditer (DH) *</Label><Input type="number" step="0.01" value={actionForm.amount} onChange={(e) => setActionForm({ ...actionForm, amount: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Raison *</Label><Input value={actionForm.reason} onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })} placeholder="Ex: Geste de fidélité, compensation retard…" /></div>
            <p className="text-xs text-muted-foreground">Ce montant sera ajouté au wallet du client, sans annuler la commande.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal(null)}>Annuler</Button>
            <Button onClick={handleAction} disabled={actionLoading || !actionForm.amount || !actionForm.reason} className="bg-pink-600 hover:bg-pink-700">
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Créditer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat modal */}
      <Dialog open={actionModal === "chat"} onOpenChange={(o) => !o && setActionModal(null)}>
        <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Chat — Commande #{selectedOrder?.reference ?? selectedOrder?.id}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="h-64 overflow-y-auto border rounded-lg p-3 space-y-2 bg-muted/20">
              {!chatHistory?.length ? (
                <p className="text-sm text-muted-foreground text-center mt-8">Aucun message pour cette commande.</p>
              ) : chatHistory.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.senderRole === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${msg.senderRole === "admin" ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                    <p className="text-xs opacity-70 mb-0.5">{msg.senderName}</p>
                    <p>{msg.message}</p>
                    <p className="text-xs opacity-50 mt-0.5 text-right">{format(new Date(msg.createdAt), "HH:mm")}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Votre message…"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              />
              <Button onClick={handleSendChat} disabled={chatLoading || !chatMessage.trim()}>
                {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
