import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadUrl, safeFilename } from "@/lib/download";

/**
 * Cross-browser PDF viewer.
 *
 * Renders every page to a <canvas> with pdf.js (lazy-loaded). Unlike
 * <object>/<embed>/<iframe> + a blob URL — which Chrome frequently refuses to
 * display, falling back to "Tu navegador no puede mostrar este PDF" — canvas
 * rendering works the same in every browser and keeps the document inside the
 * app (no new tab).
 *
 * Owns its own scroll container so it can reliably detect when the reader has
 * reached the end of the document (used by the signing flow's scroll trap).
 */

interface PdfViewerProps {
  /** blob: URL, signed Supabase URL, or any CORS-enabled PDF URL. Used for download fallback. */
  url: string;
  /** Pre-fetched PDF bytes. When provided, pdf.js uses these directly (no internal fetch). */
  data?: Uint8Array;
  className?: string;
  /** Filename used by the inline download fallback when rendering fails. */
  downloadName?: string;
  /** Fired once when the user scrolls to the last page (or the doc fits without scrolling). */
  onReachedEnd?: () => void;
}

export function PdfViewer({ url, data, className, downloadName, onReachedEnd }: PdfViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fireEnd = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    onReachedEnd?.();
  }, [onReachedEnd]);

  const checkEnd = useCallback(() => {
    const el = scrollRef.current;
    if (!el || endedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollTop + clientHeight >= scrollHeight - 24) fireEnd();
  }, [fireEnd]);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let pdfDoc: { numPages: number; getPage: (n: number) => Promise<any>; destroy: () => void } | null = null;

    endedRef.current = false;
    setLoading(true);
    setError(false);

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = worker;

        // Use pre-fetched bytes when available; otherwise fetch from URL.
        let pdfData: Uint8Array | ArrayBuffer;
        if (data) {
          pdfData = data;
        } else {
          const res = await fetch(url);
          if (!res.ok) throw new Error("fetch failed");
          pdfData = await res.arrayBuffer();
        }
        if (cancelled) return;

        const doc = await pdfjs.getDocument({ data: pdfData }).promise;
        pdfDoc = doc;
        if (cancelled) {
          doc.destroy();
          return;
        }

        const host = pagesRef.current;
        if (!host) return;
        host.innerHTML = "";

        const containerWidth = scrollRef.current?.clientWidth || 600;
        const targetWidth = Math.max(280, containerWidth - 24);

        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          if (cancelled) return;

          const base = page.getViewport({ scale: 1 });
          const scale = targetWidth / base.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.className = "mx-auto mb-3 block max-w-full rounded bg-white shadow-sm";
          host.appendChild(canvas);

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise.catch(() => undefined);
          if (cancelled) return;
        }

        if (!cancelled) {
          setLoading(false);
          // If the whole document fits without scrolling, unlock immediately.
          requestAnimationFrame(() => checkEnd());
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
          // Don't trap the user if rendering fails — let the flow continue.
          fireEnd();
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        pdfDoc?.destroy();
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, data]);

  return (
    <div
      ref={scrollRef}
      onScroll={checkEnd}
      className={cn("relative h-full w-full overflow-auto bg-muted/30", className)}
    >
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Cargando documento…</span>
        </div>
      )}

      {error ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 text-amber-500" />
          <p>No se pudo previsualizar el documento aquí.</p>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              downloadUrl(url, safeFilename(downloadName)).catch(() => undefined)
            }
          >
            <Download className="h-4 w-4" />
            Descargar documento
          </Button>
        </div>
      ) : (
        <div ref={pagesRef} className="p-3" />
      )}
    </div>
  );
}
