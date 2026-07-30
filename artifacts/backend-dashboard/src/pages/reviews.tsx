import { useListBackendReviews, useBackendMe, getListBackendReviewsQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

export default function Reviews() {
  const { data: me } = useBackendMe();
  const { data: reviews, isLoading } = useListBackendReviews({});
  const qc = useQueryClient();
  const { toast } = useToast();
  const isAdmin = me?.user.role === "admin" || me?.user.role === "super_admin";

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/backend/reviews/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getListBackendReviewsQueryKey() });
      toast({ title: "Avis supprimé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const handleDelete = (id: number) => {
    if (!confirm("Supprimer cet avis ?")) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold tracking-tight">Avis</h1></div>

      <Card>
        <CardHeader><CardTitle>Avis clients</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Boutique</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="w-[35%]">Commentaire</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell><Skeleton className="h-4 w-24" /></TableCell><TableCell><Skeleton className="h-4 w-32" /></TableCell><TableCell><Skeleton className="h-4 w-12" /></TableCell><TableCell><Skeleton className="h-4 w-20" /></TableCell><TableCell><Skeleton className="h-4 w-full" /></TableCell><TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell></TableRow>
              )) : reviews?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Aucun avis.</TableCell></TableRow>
              ) : reviews?.map((review) => (
                <TableRow key={review.id}>
                  <TableCell className="text-sm whitespace-nowrap">{format(new Date(review.createdAt), "dd MMM yyyy")}</TableCell>
                  <TableCell className="font-medium">{review.userName}</TableCell>
                  <TableCell>#{review.restaurantId}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground italic">"{review.comment || "—"}"</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(review.id)}
                      disabled={deleteMutation.isPending}
                      title="Supprimer cet avis"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
