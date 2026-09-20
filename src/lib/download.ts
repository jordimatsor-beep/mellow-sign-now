/**
 * In-app file download helpers.
 *
 * Why not `window.open(url, '_blank')`?
 *  1. After an `await` (e.g. createSignedUrl) the call loses the browser's
 *     "user activation", so Chrome/Safari silently block the popup — the
 *     button appears to do nothing.
 *  2. Opening in a new tab pulls the user out of the app context.
 *
 * Fetching the file as a Blob and clicking a programmatic <a download> anchor
 * avoids both problems: it never opens a tab and is not subject to the popup
 * blocker, so the user stays inside the app while the file downloads.
 */

/** Clicks a hidden <a download> anchor. Does not revoke the href. */
function clickDownloadAnchor(href: string, filename: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Triggers a browser download for an in-memory Blob, staying in the app. */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  clickDownloadAnchor(objectUrl, filename);
  // Revoke later so the download has time to start.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}

/**
 * Fetches a URL (signed Supabase URL, blob: URL, or any CORS-enabled URL) and
 * downloads it with the given filename without leaving the app.
 *
 * Throws if the fetch fails so callers can show a toast.
 */
export async function downloadUrl(url: string, filename: string): Promise<void> {
  // A blob: URL already points at bytes held in memory. Re-fetching it buys
  // nothing and goes through the page's CSP `connect-src`, which silently
  // blocked the download on production. Anchor it directly instead.
  // The caller owns the object URL, so we must not revoke it here.
  if (url.startsWith("blob:")) {
    clickDownloadAnchor(url, filename);
    return;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Descarga fallida (HTTP ${res.status})`);
  const blob = await res.blob();
  triggerBlobDownload(blob, filename);
}

/** Sanitizes a string so it is safe to use as a download filename. */
export function safeFilename(name: string | undefined | null, fallback = "documento"): string {
  const base = (name || fallback).trim().replace(/[\\/:*?"<>|]+/g, "_").slice(0, 120);
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}
