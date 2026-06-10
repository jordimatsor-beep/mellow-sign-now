import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

// --- CORS inline (sin dependencias externas, para deploy directo desde el panel) ---
const ALLOWED_ORIGINS = [
  'https://firmaclara.com',
  'https://firmaclara.es',
  'https://www.firmaclara.com',
  'https://www.firmaclara.es',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173',
];

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin');
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin',
  };
}

// Supported source formats (LibreOffice via Gotenberg). Validated by MIME OR
// extension, because some browsers send an empty/incorrect MIME for Office files.
const ALLOWED_MIME_TYPES = new Set<string>([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.oasis.opendocument.text',
  'application/rtf', 'text/rtf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/vnd.oasis.opendocument.presentation',
  'text/csv',
]);

const ALLOWED_EXTENSIONS = new Set<string>([
  'docx', 'doc', 'odt', 'rtf', 'xlsx', 'xls', 'ods', 'pptx', 'ppt', 'odp', 'txt', 'csv',
]);

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function jsonError(message: string, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- Auth guard: only authenticated users can convert ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !anonKey) throw new Error('Missing Supabase configuration');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonError('Unauthorized', 401, corsHeaders);

    // Pass the JWT explicitly to getUser(): without an argument, getUser() looks
    // for a stored session (which doesn't exist in an edge function) and fails.
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const supabase = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return jsonError('Unauthorized', 401, corsHeaders);

    // --- Parse multipart form ---
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return jsonError('Expected multipart/form-data', 400, corsHeaders);
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return jsonError('No se recibió ningún archivo', 400, corsHeaders);

    // --- Validate (MIME OR extension) ---
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const validType = ALLOWED_MIME_TYPES.has(file.type) || ALLOWED_EXTENSIONS.has(ext);
    if (!validType) {
      return jsonError(`Tipo de archivo no soportado (.${ext || 'desconocido'})`, 400, corsHeaders);
    }
    if (file.size === 0) return jsonError('El archivo está vacío', 400, corsHeaders);
    if (file.size > MAX_SIZE_BYTES) {
      return jsonError('Archivo demasiado grande (máximo 10MB)', 400, corsHeaders);
    }

    // --- Convert via Gotenberg (self-hosted LibreOffice) ---
    const gotenbergUrl = Deno.env.get('GOTENBERG_URL');
    if (!gotenbergUrl) throw new Error('GOTENBERG_URL not configured');

    const gForm = new FormData();
    gForm.append('files', file, file.name);

    // Shared secret validated by the reverse proxy (nginx) in front of Gotenberg.
    const gotenbergToken = Deno.env.get('GOTENBERG_TOKEN');
    const gHeaders: Record<string, string> = {};
    if (gotenbergToken) gHeaders['Authorization'] = `Bearer ${gotenbergToken}`;

    const gRes = await fetch(`${gotenbergUrl.replace(/\/$/, '')}/forms/libreoffice/convert`, {
      method: 'POST',
      body: gForm,
      headers: gHeaders,
    });

    if (!gRes.ok) {
      const errText = await gRes.text().catch(() => '');
      throw new Error(`Conversion failed (${gRes.status}): ${errText.slice(0, 200)}`);
    }

    const pdfBytes = await gRes.arrayBuffer();
    if (pdfBytes.byteLength === 0) throw new Error('Conversion returned an empty file');

    // Return the PDF as raw binary — the client reads it with res.blob().
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Length': String(pdfBytes.byteLength),
      },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido en la conversión';
    return jsonError(message, 500, corsHeaders);
  }
});
