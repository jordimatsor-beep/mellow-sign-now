-- ============================================
-- Migration: Add signature position fields to documents
-- ============================================
-- Allows specifying exact coordinates for signature placement:
-- - signature_page: Page number (0 = new page at end, 1 = first page, etc.)
-- - signature_x: X coordinate in PDF points (0-595 for A4 width)
-- - signature_y: Y coordinate in PDF points (0-841 for A4 height)

ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS signature_page INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS signature_x INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS signature_y INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.documents.signature_page IS 'Page number for signature placement. 0 = add new page at end (default), 1+ = specific page number';
COMMENT ON COLUMN public.documents.signature_x IS 'X coordinate in PDF points (0-595 for A4). 0 = auto-center';
COMMENT ON COLUMN public.documents.signature_y IS 'Y coordinate in PDF points from bottom (0-841 for A4). 0 = auto-position';
