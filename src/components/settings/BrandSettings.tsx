import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, Image as ImageIcon, Palette } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const DEFAULT_COLOR = "#2563eb";
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB (criterio ME-03)

// ME-03: el autónomo personaliza el email que recibe su cliente (logo, color
// del botón/cabecera y nombre del remitente) para que se perciba su marca y no
// la de FirmaClara. Se guarda en `users` y se aplica en send-invite-v2.
export function BrandSettings() {
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [senderName, setSenderName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("brand_logo_url, brand_color, brand_sender_name")
        .eq("id", user.id)
        .single();
      if (data) {
        setLogoUrl((data as any).brand_logo_url ?? null);
        setColor((data as any).brand_color ?? DEFAULT_COLOR);
        setSenderName((data as any).brand_sender_name ?? "");
      }
      setLoading(false);
    })();
  }, [user]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;

    const okType = ["image/png", "image/svg+xml", "image/jpeg"].includes(file.type);
    if (!okType) {
      toast.error("El logo debe ser PNG, SVG o JPG");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("El logo no puede superar 2MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      // Ruta fija por usuario: una sola versión del logo, sobrescribible.
      const path = `${user.id}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("brand-logos")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("brand-logos").getPublicUrl(path);
      // Cache-bust para que la preview refleje el nuevo logo al sobrescribir.
      const url = `${data.publicUrl}?v=${Date.now()}`;
      setLogoUrl(url);
      toast.success("Logo subido. No olvides guardar.");
    } catch (err) {
      toast.error("No se pudo subir el logo");
      if (import.meta.env.DEV) console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          brand_logo_url: logoUrl,
          brand_color: color,
          brand_sender_name: senderName.trim() || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Personalización de marca guardada");
    } catch (err) {
      toast.error("Error al guardar la personalización");
      if (import.meta.env.DEV) console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const displaySender = senderName.trim() || "Tu empresa";

  return (
    <div className="space-y-4" id="brand">
      <div>
        <h2 className="text-lg font-semibold">Personalización de marca</h2>
        <p className="text-sm text-muted-foreground">
          Aparecerá en los emails que reciben tus firmantes. Si no configuras nada,
          se usa el branding de FirmaClara.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Controles */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Logotipo</Label>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg"
                className="hidden"
                onChange={handleLogoChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Subir logo
              </Button>
              {logoUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setLogoUrl(null)}>
                  Quitar
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PNG, SVG o JPG · máx. 2MB</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-color">Color principal</Label>
            <div className="flex items-center gap-2">
              <input
                id="brand-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border bg-transparent p-1"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#2563eb"
                className="w-32 font-mono"
              />
              <Palette className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-sender">Nombre del remitente</Label>
            <Input
              id="brand-sender"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Tu empresa"
            />
            <p className="text-xs text-muted-foreground">
              El email se enviará como «{displaySender} vía FirmaClara».
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar personalización
          </Button>
        </div>

        {/* Vista previa */}
        <div className="space-y-2">
          <Label>Vista previa</Label>
          <div className="overflow-hidden rounded-xl border bg-white">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-7 max-w-[140px] object-contain" />
              ) : (
                <span className="text-lg font-extrabold text-slate-900">
                  Firma<span style={{ color }}>Clara</span>
                </span>
              )}
            </div>
            <div className="space-y-3 px-4 py-5">
              <p className="text-sm text-slate-600">Hola Juan,</p>
              <p className="text-sm text-slate-600">
                <strong>{displaySender}</strong> te ha enviado un documento para firmar.
              </p>
              <div
                className="inline-block rounded-md px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: color }}
              >
                Revisar y Firmar
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
