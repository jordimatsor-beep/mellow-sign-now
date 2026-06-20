import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBillingProfile } from "@/hooks/useBillingProfile";
import { toast } from "sonner";

const schema = z.object({
  razon_social: z.string().min(1, "Obligatorio"),
  nif_cif: z
    .string()
    .min(1, "Obligatorio")
    .regex(/^[A-Z0-9]{9}$/i, "Formato NIF/CIF inválido (9 caracteres)"),
  direccion_fiscal: z.string().min(1, "Obligatorio"),
  ciudad: z.string().min(1, "Obligatorio"),
  codigo_postal: z.string().regex(/^\d{5}$/, "5 dígitos"),
  pais: z.string().min(1, "Obligatorio"),
  email_facturacion: z.string().email("Email inválido").or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function BillingProfileModal({ open, onClose, onConfirm }: Props) {
  const { profile, upsert } = useBillingProfile();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { pais: "ES", email_facturacion: "" },
  });

  const pais = watch("pais");

  // Prefill con perfil existente cuando se abre el modal
  useEffect(() => {
    if (open && profile) {
      reset({
        razon_social: profile.razon_social,
        nif_cif: profile.nif_cif,
        direccion_fiscal: profile.direccion_fiscal,
        ciudad: profile.ciudad,
        codigo_postal: profile.codigo_postal,
        pais: profile.pais,
        email_facturacion: profile.email_facturacion ?? "",
      });
    }
  }, [open, profile, reset]);

  const onSubmit = async (values: FormData) => {
    setSubmitting(true);
    try {
      await upsert.mutateAsync(values);
      await onConfirm();
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Error al guardar los datos de facturación"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !submitting) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Datos de facturación</DialogTitle>
          <DialogDescription>
            Necesitamos tus datos fiscales para emitir la factura legal de tu compra.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Nombre / Razón social *</Label>
              <Input {...register("razon_social")} placeholder="Mi Empresa S.L." />
              {errors.razon_social && (
                <p className="text-xs text-destructive">{errors.razon_social.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>NIF / CIF *</Label>
              <Input
                {...register("nif_cif")}
                placeholder="B12345678"
                className="uppercase"
              />
              {errors.nif_cif && (
                <p className="text-xs text-destructive">{errors.nif_cif.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>País</Label>
              <Select value={pais} onValueChange={(v) => setValue("pais", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ES">España</SelectItem>
                  <SelectItem value="FR">Francia</SelectItem>
                  <SelectItem value="PT">Portugal</SelectItem>
                  <SelectItem value="OTHER">Otro país</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {pais !== "ES" && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400">
              Para clientes fuera de España, contacta con nosotros en{" "}
              <strong>facturacion@operiatech.es</strong> para gestionar tu factura
              manualmente.
            </p>
          )}

          <div className="space-y-1">
            <Label>Dirección fiscal *</Label>
            <Input
              {...register("direccion_fiscal")}
              placeholder="Calle Mayor 1, 2.º A"
            />
            {errors.direccion_fiscal && (
              <p className="text-xs text-destructive">
                {errors.direccion_fiscal.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>C. Postal *</Label>
              <Input
                {...register("codigo_postal")}
                placeholder="28001"
                maxLength={5}
              />
              {errors.codigo_postal && (
                <p className="text-xs text-destructive">
                  {errors.codigo_postal.message}
                </p>
              )}
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Ciudad *</Label>
              <Input {...register("ciudad")} placeholder="Madrid" />
              {errors.ciudad && (
                <p className="text-xs text-destructive">{errors.ciudad.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Email para recibir facturas</Label>
            <Input
              {...register("email_facturacion")}
              type="email"
              placeholder="Si está vacío, se usa el email de tu cuenta"
            />
            {errors.email_facturacion && (
              <p className="text-xs text-destructive">
                {errors.email_facturacion.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || pais !== "ES"}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar y continuar al pago
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
