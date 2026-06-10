import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

/**
 * Visual signature placement picker.
 *
 * Renders the uploaded PDF with pdf.js (lazy-loaded) and lets the user drag
 * a box to the exact spot where the signature must be stamped. Coordinates
 * are converted to PDF points (origin bottom-left) and must match the
 * backend contract in sign-complete-v2:
 *   - signature_page: 1-based page number
 *   - signature_x / signature_y: bottom-left corner of the signature box
 *   - box size: 200 x 80 pt (same MAX_SIG_WIDTH/HEIGHT as the backend)
 */

// Must mirror sign-complete-v2 (MAX_SIG_WIDTH / MAX_SIG_HEIGHT)
const SIG_W_PT = 200;
const SIG_H_PT = 80;
// Fixed render width in CSS px — keeps px↔pt conversion exact and stable
const RENDER_WIDTH = 620;

interface PickerResult {
  page: number;
  x: number;
  y: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** PDF file in memory (size 0 placeholder when restoring a draft) */
  file: File | null;
  /** Fallback URL for drafts whose file is already uploaded */
  fileUrl?: string | null;
  initialPage?: number;
  initialX?: number;
  initialY?: number;
  onConfirm: (pos: PickerResult) => void;
}

export function SignaturePositionPicker({
  open,
  onOpenChange,
  file,
  fileUrl,
  initialPage,
  initialX,
  initialY,
  onConfirm,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  const [pdf, setPdf] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  // Page size in PDF points and the px-per-pt scale of the current render
  const [pagePt, setPagePt] = useState({ w: 595, h: 842 });
  const [scale, setScale] = useState(1);
  const [canvasH, setCanvasH] = useState(0);
  // Box position in canvas px (top-left corner)
  const [box, setBox] = useState({ x: 0, y: 0 });
  const [boxReady, setBoxReady] = useState(false);

  // ── Load the document when the dialog opens ──────────────────────────
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let loadedDoc: any = null;

    (async () => {
      setLoading(true);
      setPdf(null);
      setBoxReady(false);
      try {
        const pdfjs = await import("pdfjs-dist");
        const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = worker;

        let data: ArrayBuffer;
        if (file && file.size > 0) {
          data = await file.arrayBuffer();
        } else if (fileUrl) {
          const res = await fetch(fileUrl);
          if (!res.ok) throw new Error("fetch failed");
          data = await res.arrayBuffer();
        } else {
          throw new Error("no document");
        }

        loadedDoc = await pdfjs.getDocument({ data }).promise;
        if (cancelled) { loadedDoc.destroy(); return; }

        setNumPages(loadedDoc.numPages);
        const startPage = initialPage && initialPage > 0
          ? Math.min(initialPage, loadedDoc.numPages)
          : loadedDoc.numPages; // signatures usually live on the last page
        setPageNum(startPage);
        setPdf(loadedDoc);
      } catch {
        if (!cancelled) {
          toast.error("No se pudo cargar la vista previa del documento");
          onOpenChange(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      if (loadedDoc) loadedDoc.destroy();
      setPdf(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Render the current page ───────────────────────────────────────────
  useEffect(() => {
    if (!pdf || !open) return;
    let cancelled = false;

    (async () => {
      try {
        const page = await pdf.getPage(pageNum);
        if (cancelled) return;

        const base = page.getViewport({ scale: 1 });
        const pageW = base.width;
        const pageH = base.height;
        const s = RENDER_WIDTH / pageW;
        const viewport = page.getViewport({ scale: s });

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        renderTaskRef.current?.cancel();
        const task = page.render({ canvasContext: canvas.getContext("2d"), viewport });
        renderTaskRef.current = task;
        await task.promise.catch(() => undefined); // cancelled renders throw
        if (cancelled) return;

        setPagePt({ w: pageW, h: pageH });
        setScale(s);
        setCanvasH(Math.floor(viewport.height));

        // Place the box: restore saved position on its page, else bottom-center
        const boxW = SIG_W_PT * s;
        const boxH = SIG_H_PT * s;
        const restoring =
          initialX && initialX > 0 && initialY && initialY > 0 &&
          initialPage && initialPage === pageNum;
        if (restoring) {
          setBox({
            x: clamp(initialX! * s, 0, RENDER_WIDTH - boxW),
            y: clamp((pageH - initialY! - SIG_H_PT) * s, 0, viewport.height - boxH),
          });
        } else {
          setBox({
            x: (RENDER_WIDTH - boxW) / 2,
            y: viewport.height - boxH - 50 * s,
          });
        }
        setBoxReady(true);
      } catch {
        /* page render cancelled or failed — non fatal */
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf, pageNum, open]);

  // ── Dragging ──────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragRef.current = { dx: e.clientX - box.x, dy: e.clientY - box.y };
  }, [box]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const boxW = SIG_W_PT * scale;
    const boxH = SIG_H_PT * scale;
    setBox({
      x: clamp(e.clientX - dragRef.current.dx, 0, RENDER_WIDTH - boxW),
      y: clamp(e.clientY - dragRef.current.dy, 0, canvasH - boxH),
    });
  }, [scale, canvasH]);

  const onPointerUp = useCallback(() => { dragRef.current = null; }, []);

  // ── Confirm: canvas px → PDF points (origin bottom-left) ─────────────
  const handleConfirm = () => {
    const xPt = Math.max(0, Math.round(box.x / scale));
    const yTopPt = box.y / scale;
    const yPt = Math.max(1, Math.round(pagePt.h - yTopPt - SIG_H_PT));
    onConfirm({ page: pageNum, x: xPt, y: yPt });
    onOpenChange(false);
  };

  const boxW = SIG_W_PT * scale;
  const boxH = SIG_H_PT * scale;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Elige el lugar de la firma
          </DialogTitle>
          <DialogDescription>
            Arrastra el recuadro hasta la posición exacta donde debe aparecer la firma del cliente.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando documento…
          </div>
        )}

        {!loading && pdf && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 p-2.5 text-xs font-medium text-primary">
              <span className="text-base leading-none">👆</span>
              <span>Arrastra el recuadro «✍ Firma aquí» hasta donde firmará el cliente y pulsa «Confirmar posición».</span>
            </div>

            {numPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <Button type="button" variant="outline" size="sm" disabled={pageNum <= 1}
                  onClick={() => setPageNum((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {pageNum} de {numPages}
                </span>
                <Button type="button" variant="outline" size="sm" disabled={pageNum >= numPages}
                  onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="overflow-auto max-h-[60vh] rounded-md border bg-muted/30">
              <div className="relative mx-auto" style={{ width: RENDER_WIDTH }}>
                <canvas ref={canvasRef} className="block" />
                {boxReady && (
                  <div
                    role="button"
                    aria-label="Recuadro de firma (arrastrable)"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    className="absolute cursor-move rounded border-2 border-dashed border-primary bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center select-none touch-none"
                    style={{ left: box.x, top: box.y, width: boxW, height: boxH }}
                  >
                    <span className="text-xs font-medium text-primary pointer-events-none">
                      ✍ Firma aquí
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={loading || !pdf || !boxReady}>
            Confirmar posición
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), Math.max(min, max));
}
