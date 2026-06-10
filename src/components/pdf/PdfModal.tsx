import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { PdfViewer } from "./PdfViewer";
import { downloadUrl, safeFilename } from "@/lib/download";
import { toast } from "sonner";

/**
 * In-app PDF viewer dialog. Opens a document inside a modal (with an optional
 * download button) instead of navigating away to a new browser tab.
 */

interface PdfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** blob: URL or signed PDF URL. */
  url: string | null;
  title?: string;
  /** Filename for the download button. Defaults to the title. */
  filename?: string;
}

export function PdfModal({ open, onOpenChange, url, title, filename }: PdfModalProps) {
  const name = safeFilename(filename || title);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] w-[95vw] max-w-4xl flex-col gap-0 p-0">
        <DialogHeader className="flex-row items-center justify-between space-y-0 border-b px-4 py-3">
          <DialogTitle className="truncate pr-4">{title || "Documento"}</DialogTitle>
          {url && (
            <Button
              variant="outline"
              size="sm"
              className="mr-8 shrink-0 gap-2"
              onClick={() =>
                downloadUrl(url, name).catch(() => toast.error("No se pudo descargar el documento"))
              }
            >
              <Download className="h-4 w-4" />
              Descargar
            </Button>
          )}
        </DialogHeader>

        {open && url && (
          <PdfViewer url={url} downloadName={name} className="min-h-0 flex-1" />
        )}
      </DialogContent>
    </Dialog>
  );
}
