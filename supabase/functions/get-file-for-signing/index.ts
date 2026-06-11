import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing configuration');

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { sign_token } = await req.json();
    if (!sign_token) throw new Error('sign_token is required');
    if (!UUID_REGEX.test(sign_token)) throw new Error('Invalid token format');

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, status, expires_at, file_url, signed_file_url, certificate_url')
      .eq('sign_token', sign_token)
      .single();

    if (docError || !doc) throw new Error('Documento no encontrado');

    if (doc.expires_at && new Date(doc.expires_at) < new Date()) {
      throw new Error('Este enlace de firma ha expirado');
    }

    if (!['sent', 'viewed', 'signed'].includes(doc.status)) {
      throw new Error('Este documento no está disponible');
    }

    const makeSignedUrl = async (urlOrPath: string | null): Promise<string | null> => {
      if (!urlOrPath) return null;
      let path = urlOrPath;
      if (urlOrPath.startsWith('http')) {
        const parts = urlOrPath.split('/documents/');
        if (parts.length < 2) return null;
        let extracted = parts[1];
        if (extracted.includes('?')) extracted = extracted.split('?')[0];
        path = decodeURIComponent(extracted);
      }
      const { data } = await supabase.storage.from('documents').createSignedUrl(path, 3600);
      return data?.signedUrl ?? null;
    };

    const [fileUrl, signedFileUrl, certificateUrl] = await Promise.all([
      makeSignedUrl(doc.file_url),
      makeSignedUrl(doc.signed_file_url),
      makeSignedUrl(doc.certificate_url),
    ]);

    return new Response(
      JSON.stringify({ success: true, file_url: fileUrl, signed_file_url: signedFileUrl, certificate_url: certificateUrl }),
      // no-store: las URLs firmadas son temporales y dan acceso al documento;
      // no deben quedar cacheadas en proxies/CDN intermedios.
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Error desconocido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
