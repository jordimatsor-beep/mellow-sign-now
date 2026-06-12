import { useState } from "react";
import { Link } from "react-router-dom";
import { FileStack, Plus, Trash2, Pencil, Loader2, ArrowRight, Files } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TemplateRow {
  id: string;
  title: string;
  created_at: string | null;
}

export default function Templates() {
  const queryClient = useQueryClient();
  const [renaming, setRenaming] = useState<TemplateRow | null>(null);
  const [newName, setNewName] = useState("");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: async () =>
      withTimeout(
        (async () => {
          const { data, error } = await supabase
            .from("documents")
            .select("id, title, created_at")
            .eq("is_template", true)
            .order("created_at", { ascending: false });
          if (error) throw error;
          return (data as TemplateRow[]) || [];
        })(),
        3000,
        "Templates fetch"
      ),
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from("documents").update({ title }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Plantilla renombrada");
      setRenaming(null);
    },
    onError: (e: Error) => toast.error("Error al renombrar: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Plantilla eliminada");
    },
    onError: (e: Error) => toast.error("Error al eliminar: " + e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plantillas</h1>
          <p className="text-muted-foreground text-sm">
            Reutiliza tus documentos habituales sin volver a subirlos.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5">
          <Link to="/documents/new">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo envío</span>
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Cargando plantillas...
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <FileStack className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-medium text-slate-900">Aún no tienes plantillas</h3>
          <p className="mb-4 mt-1 max-w-sm text-xs text-slate-500">
            Desde el detalle de cualquier documento pulsa «Guardar como plantilla» para
            reutilizarlo después en un nuevo envío.
          </p>
          <Button size="sm" variant="outline" asChild>
            <Link to="/documents">Ver mis documentos</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="transition-colors hover:border-primary/20">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Files className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{tpl.title || "Sin título"}</p>
                    <p className="text-xs text-muted-foreground">
                      {tpl.created_at
                        ? `Creada el ${format(new Date(tpl.created_at), "dd/MM/yyyy", { locale: es })}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Renombrar"
                    onClick={() => {
                      setRenaming(tpl);
                      setNewName(tpl.title || "");
                    }}
                  >
                    <Pencil className="h-4 w-4 text-slate-500" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" title="Eliminar">
                        <Trash2 className="h-4 w-4 text-slate-500 hover:text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminará «{tpl.title}». Los documentos ya enviados desde ella no
                          se ven afectados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(tpl.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button asChild size="sm" className="ml-1 gap-1.5">
                    <Link to={`/documents/new?templateId=${tpl.id}`}>
                      Usar
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rename dialog */}
      <Dialog open={!!renaming} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Renombrar plantilla</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="tpl-name">Nombre</Label>
            <Input
              id="tpl-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!newName.trim() || renameMutation.isPending}
              onClick={() =>
                renaming && renameMutation.mutate({ id: renaming.id, title: newName.trim() })
              }
            >
              {renameMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
