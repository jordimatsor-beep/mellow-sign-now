import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

// --- INLINED _shared/cors.ts START ---
const ALLOWED_ORIGINS = [
  'https://firmaclara.com',
  'https://firmaclara.es',
  'https://www.firmaclara.com',
  'https://www.firmaclara.es',
  'https://mellow-sign-now.lovable.app',
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

function handleCorsPreflightRequest(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(request) });
  }
  return null;
}

function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const safeMessages = [
      'Documento no encontrado',
      'Token is required',
      'Missing required fields',
      'Unauthorized',
      'Rate limit exceeded',
      'Invalid request format',
      'Código OTP incorrecto',
      'Código OTP expirado',
      'Este documento ya ha sido firmado',
      'Este enlace de firma ha expirado',
      'Faltan datos requeridos',
    ];

    if (safeMessages.some(msg => error.message.includes(msg))) {
      return error.message;
    }
    return 'Ha ocurrido un error. Por favor, inténtalo de nuevo.';
  }
  return 'Error desconocido';
}
// --- INLINED _shared/cors.ts END ---

interface RequestBody {
  document_id: string;
  signer_email: string;
  signer_name: string;
  sign_token: string;
  sender_name?: string;
  title?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  const preflightResponse = handleCorsPreflightRequest(req);
  if (preflightResponse) return preflightResponse;

  console.log("Send-document-invitation function invoked (STD SERVE VERSION)");

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY");
      throw new Error('Internal Server Error: Missing Configuration')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error('Unauthorized')
    }

    let body: RequestBody;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Error parsing JSON body:", e);
      throw new Error('Invalid JSON body');
    }

    const { document_id, signer_email, signer_name, sign_token, sender_name, title } = body;

    if (!signer_email || !sign_token || !document_id) {
      console.error("Missing fields:", body);
      throw new Error('Missing required fields')
    }

    // Verify ownership
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('user_id')
      .eq('id', document_id)
      .single()

    if (docError || !doc) {
      console.error("Document not found or error:", docError);
      throw new Error('Document not found')
    }

    if (doc.user_id !== user.id) {
      throw new Error('Unauthorized: You do not own this document')
    }

    // URL Configuration
    const siteUrl = Deno.env.get('SITE_URL') || 'https://firmaclara.es';
    const signUrl = `${siteUrl}/sign/${sign_token}`

    // Escape user-provided content to prevent XSS in emails
    const docTitle = escapeHtml(title) || 'Documento sin título'
    const sender = escapeHtml(sender_name) || 'FirmaClara'
    const safeSignerName = escapeHtml(signer_name)

    // Premium HTML Email Template
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
              color: #1f2937; 
              background-color: #f3f4f6; 
              margin: 0; 
              padding: 0; 
              line-height: 1.5;
            }
            .wrapper {
              width: 100%;
              background-color: #f3f4f6; 
              padding: 40px 0;
            }
            .container { 
              max-width: 560px; 
              margin: 0 auto; 
              background-color: #ffffff; 
              border-radius: 12px; 
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              overflow: hidden;
            }
            .header { 
              background-color: #ffffff; 
              padding: 30px 40px; 
              border-bottom: 1px solid #f3f4f6;
              text-align: center;
            }
            .logo { 
              font-size: 24px; 
              font-weight: 800; 
              color: #111827; 
              text-decoration: none; 
              letter-spacing: -0.5px;
            }
            .logo span { color: #2563eb; } 
            
            .content { padding: 40px; }
            
            h1 {
              margin: 0 0 20px;
              font-size: 20px;
              font-weight: 600;
              color: #111827;
              text-align: center;
            }
            
            p { margin: 0 0 16px; color: #4b5563; font-size: 16px; }
            
            .highlight-box {
              background-color: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 16px;
              margin: 24px 0;
              text-align: center;
            }
            .doc-name {
              font-weight: 600;
              color: #111827;
              font-size: 16px;
              display: block;
              margin-bottom: 4px;
            }
            .sender-name {
              font-size: 14px;
              color: #6b7280;
            }

            .btn-container { text-align: center; margin: 32px 0; }
            .button { 
              display: inline-block; 
              padding: 14px 32px; 
              background-color: #2563eb; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 8px; 
              font-weight: 600; 
              font-size: 16px;
              box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
              transition: background-color 0.2s;
            }
            .button:hover { background-color: #1d4ed8; }
            
            .footer { 
              padding: 24px 40px; 
              background-color: #f9fafb; 
              border-top: 1px solid #f3f4f6;
              text-align: center; 
            }
            .footer p { font-size: 12px; color: #9ca3af; margin: 0; }
            .secure-badge {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              font-size: 11px;
              color: #6b7280;
              background: #fff;
              padding: 4px 10px;
              border-radius: 99px;
              border: 1px solid #e5e7eb;
              margin-bottom: 12px;
            }
            .link-fallback {
              margin-top: 24px;
              padding-top: 24px;
              border-top: 1px solid #e5e7eb;
              text-align: left;
            }
            .link-text {
              font-size: 12px;
              color: #6b7280;
              word-break: break-all;
              line-height: 1.4;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <a href="${siteUrl}" class="logo">Firma<span>Clara</span></a>
              </div>
              
              <div class="content">
                <h1>Solicitud de Firma</h1>
                <p>Hola <strong>${safeSignerName}</strong>,</p>
                <p><strong>${sender}</strong> te ha enviado un documento y requiere tu firma electrónica.</p>
                
                <div class="highlight-box">
                  <span class="doc-name">📄 ${docTitle}</span>
                  <span class="sender-name">De: ${sender}</span>
                </div>

                <div class="btn-container">
                  <a href="${signUrl}" class="button">Revisar y Firmar</a>
                </div>

                <p style="text-align: center; font-size: 14px;">
                  Este enlace te llevará a una página segura donde podrás dibujar tu firma o escribir tu nombre.
                </p>

                <div class="link-fallback">
                  <p style="font-size: 12px; margin-bottom: 8px;">Si el botón no funciona, copia este enlace:</p>
                  <a href="${signUrl}" class="link-text">${signUrl}</a>
                </div>
              </div>

              <div class="footer">
                <div class="secure-badge">🔒 Firmado y Auditado con FirmaClara</div>
                <p>&copy; ${new Date().getFullYear()} FirmaClara. Derechos Reservados.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    console.log("Sending email via Resend to:", signer_email);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'FirmaClara <noreply@firmaclara.es>',
        to: [signer_email],
        subject: `FirmaClara: ${sender} solicita tu firma en "${docTitle}"`,
        html: html
      })
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Resend Error Response:', data)
      throw new Error(data.message || 'Error sending email with Resend')
    }

    console.log("Email sent successfully:", data.id);

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("Function Error:", error)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred', details: JSON.stringify(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
