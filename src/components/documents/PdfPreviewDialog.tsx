import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

/**
 * Read-only PDF preview rendered with pdf.js into <canvas> elements.
 *
 * We render to canvas (instead of an <iframe>/<a> to a blob URL) because the
 * browser's built-in PDF viewer often force-downloads blob URLs or is blocked
 * by the app's Content-Security-Policy. Canvas rendering always shows inline.
 *
 * Mirrors the pdf.js setup already used in SignaturePositionPicker.
 */

const RENDER_WIDTH = 700;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** PDF file in memory to preview */
  file: File | null;
  /** Optional caption shown in the title (e.g. "convertido desde .docx") */
  label?: string;
}

export function PdfPreviewDialog({ open, onOpenChange, file, label }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !file || file.size === 0) return;
    let cancelled = false;
    let loadedDoc: { numPages: number; getPage: (n: number) => Promise<any>; destroy: () => void } | null = null;

    (async () => {
      setLoading(true);
      const container = containerRef.current;
      if (container) container.innerHTML = "";
      try {
        const pdfjs = await import("pdfjs-dist");
        const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = worker;

        const data = await file.arrayBuffer();
        loadedDoc = await pdfjs.getDocument({ data }).promise;
        if (cancelled || !loadedDoc) { loadedDoc?.destroy(); return; }

        for (let i = 1; i <= loadedDoc.numPages; i++) {
          if (cancelled) break;
          const page = await loadedDoc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const s = RENDER_WIDTH / base.width;
          const viewport = page.getViewport({ scale: s });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.className = "mx-auto mb-3 block max-w-full rounded border bg-white shadow-sm";

          const el = containerRef.current;
          if (!el || cancelled) break;
          el.appendChild(canvas);
          await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise.catch(() => undefined);
        }
      } catch {
        const el = containerRef.current;
        if (el && !cancelled) {
          el.innerHTML =
            '<p class="py-8 text-center text-sm text-muted-foreground">No se pudo cargar la vista previa</p>';
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      loadedDoc?.destroy();
    };
  }, [open, file]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] w-[95vw] max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="border-b p-4">
          <DialogTitle className="text-base">
            Vista previa{label ? ` · ${label}` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto bg-muted/30 p-4">
          {loading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Cargando documento…
            </div>
          )}
          <div ref={containerRef} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
