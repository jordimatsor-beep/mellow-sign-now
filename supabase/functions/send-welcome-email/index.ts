import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest, escapeHtml } from '../_shared/cors.ts'

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  const preflightResponse = handleCorsPreflightRequest(req);
  if (preflightResponse) return preflightResponse;

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) throw new Error('Internal Server Error: Missing Configuration')

    const SITE_URL = Deno.env.get('SITE_URL') || 'https://firmaclara.es'

    // Authenticated client — verify the user is who they say they are
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    // Fetch their profile to get the real name
    const { data: profile } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', user.id)
      .single()

    const userName = escapeHtml(profile?.name || user.email?.split('@')[0] || 'Usuario')
    const userEmail = profile?.email || user.email || ''

    if (!userEmail) throw new Error('User email not found')

    const dashboardUrl = SITE_URL
    const html = buildWelcomeEmail(userName, dashboardUrl, SITE_URL)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'FirmaClara <hola@firmaclara.es>',
        to: [userEmail],
        subject: `¡Bienvenido, ${userName}! Tus 2 créditos gratis te esperan`,
        html,
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Error sending welcome email')

    console.log(`Welcome email sent to ${userEmail}, id: ${data.id}`)

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('send-welcome-email error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

function buildWelcomeEmail(name: string, dashboardUrl: string, siteUrl: string): string {
  const newDocUrl = `${dashboardUrl}/documents/new`
  const claraUrl = `${dashboardUrl}/clara`
  const year = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>Bienvenido a FirmaClara</title>
</head>
<body style="margin:0;padding:0;background-color:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#eef2f7;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- ===================== CARD ===================== -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;width:100%;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.12);">

          <!-- HEADER GRADIENT -->
          <tr>
            <td style="background:linear-gradient(145deg,#1e40af 0%,#2563eb 55%,#3b82f6 100%);padding:44px 48px 40px;text-align:center;">

              <!-- Logo -->
              <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 auto 28px;">
                <tr>
                  <td style="background:rgba(255,255,255,0.12);border-radius:12px;padding:10px 22px;border:1px solid rgba(255,255,255,0.2);">
                    <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;text-decoration:none;">Firma<span style="color:#93c5fd;">Clara</span></span>
                  </td>
                </tr>
              </table>

              <!-- Confetti emoji row -->
              <p style="margin:0 0 10px;font-size:36px;line-height:1;">🎉</p>

              <h1 style="margin:0 0 12px;font-size:28px;font-weight:800;color:#ffffff;line-height:1.25;letter-spacing:-0.5px;">
                ¡Bienvenido, ${name}!
              </h1>
              <p style="margin:0;font-size:16px;color:#bfdbfe;line-height:1.6;max-width:420px;margin-left:auto;margin-right:auto;">
                Tu cuenta está activa. Tienes <strong style="color:#ffffff;background:rgba(255,255,255,0.15);padding:2px 8px;border-radius:4px;">2 créditos gratis</strong> esperándote para firmar tus primeros documentos.
              </p>

            </td>
          </tr>

          <!-- INTRO -->
          <tr>
            <td style="background-color:#ffffff;padding:36px 48px 0;">
              <p style="margin:0;font-size:16px;color:#374151;line-height:1.7;">
                FirmaClara te permite <strong style="color:#111827;">enviar cualquier documento a tus clientes</strong> y que lo firmen digitalmente con validez legal en menos de 2 minutos. Sin papel, sin desplazamientos.
              </p>
            </td>
          </tr>

          <!-- SECTION LABEL -->
          <tr>
            <td style="background-color:#ffffff;padding:28px 48px 0;">
              <p style="margin:0;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;">
                Cómo funciona · 4 pasos
              </p>
            </td>
          </tr>

          <!-- STEPS CONTAINER -->
          <tr>
            <td style="background-color:#ffffff;padding:16px 48px 0;">

              <!-- Step 1 -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#eff6ff;border-radius:14px;border:1px solid #dbeafe;margin-bottom:10px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                      <tr>
                        <td style="vertical-align:middle;padding-right:16px;width:50px;">
                          <div style="width:44px;height:44px;background:linear-gradient(135deg,#2563eb,#3b82f6);border-radius:12px;text-align:center;line-height:44px;font-size:20px;">📤</div>
                        </td>
                        <td style="vertical-align:middle;">
                          <p style="margin:0 0 3px;font-size:15px;font-weight:700;color:#1e3a8a;">1 · Sube tu documento</p>
                          <p style="margin:0;font-size:13px;color:#3b82f6;line-height:1.5;">Arrastra tu PDF o usa <strong>Clara IA</strong> para crearlo desde cero — contratos, presupuestos, NDAs…</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Step 2 -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#f0fdf4;border-radius:14px;border:1px solid #bbf7d0;margin-bottom:10px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                      <tr>
                        <td style="vertical-align:middle;padding-right:16px;width:50px;">
                          <div style="width:44px;height:44px;background:linear-gradient(135deg,#059669,#10b981);border-radius:12px;text-align:center;line-height:44px;font-size:20px;">✉️</div>
                        </td>
                        <td style="vertical-align:middle;">
                          <p style="margin:0 0 3px;font-size:15px;font-weight:700;color:#14532d;">2 · Envíaselo a tu cliente</p>
                          <p style="margin:0;font-size:13px;color:#16a34a;line-height:1.5;">Introduce su email. Recibirá al instante un enlace seguro — <strong>sin registrarse, sin apps</strong>.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Step 3 -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#fffbeb;border-radius:14px;border:1px solid #fde68a;margin-bottom:10px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                      <tr>
                        <td style="vertical-align:middle;padding-right:16px;width:50px;">
                          <div style="width:44px;height:44px;background:linear-gradient(135deg,#d97706,#f59e0b);border-radius:12px;text-align:center;line-height:44px;font-size:20px;">✍️</div>
                        </td>
                        <td style="vertical-align:middle;">
                          <p style="margin:0 0 3px;font-size:15px;font-weight:700;color:#78350f;">3 · Tu cliente firma en segundos</p>
                          <p style="margin:0;font-size:13px;color:#b45309;line-height:1.5;">Hace clic, dibuja su firma y confirma con un código. Desde móvil o PC. <strong>Tú recibes un aviso inmediato.</strong></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Step 4 -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#faf5ff;border-radius:14px;border:1px solid #e9d5ff;">
                <tr>
                  <td style="padding:20px 22px;">
                    <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                      <tr>
                        <td style="vertical-align:middle;padding-right:16px;width:50px;">
                          <div style="width:44px;height:44px;background:linear-gradient(135deg,#6d28d9,#7c3aed);border-radius:12px;text-align:center;line-height:44px;font-size:20px;">🔐</div>
                        </td>
                        <td style="vertical-align:middle;">
                          <p style="margin:0 0 3px;font-size:15px;font-weight:700;color:#3b0764;">4 · Certificado legal descargable</p>
                          <p style="margin:0;font-size:13px;color:#7c3aed;line-height:1.5;">PDF con sello de tiempo RFC 3161, huella SHA-256 e IP del firmante. <strong>Validez eIDAS en toda la UE.</strong></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- PRIMARY CTA -->
          <tr>
            <td style="background-color:#ffffff;padding:36px 48px 20px;text-align:center;">
              <a href="${newDocUrl}" style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#ffffff;text-decoration:none;font-size:17px;font-weight:700;padding:17px 44px;border-radius:12px;box-shadow:0 6px 20px rgba(37,99,235,0.45);letter-spacing:-0.2px;">
                Firmar mi primer documento &rarr;
              </a>
              <p style="margin:14px 0 0;font-size:13px;color:#9ca3af;">
                Se descuenta 1 crédito al enviar &nbsp;·&nbsp; Los créditos no caducan nunca
              </p>
            </td>
          </tr>

          <!-- CLARA AI BANNER -->
          <tr>
            <td style="background-color:#ffffff;padding:0 48px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:linear-gradient(145deg,#1e1b4b,#2e1065);border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="padding:28px 28px 24px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.1em;">✨ Incluido gratis — sin límite</p>
                    <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:#ffffff;line-height:1.3;">
                      ¿No tienes el documento? Clara IA lo escribe por ti
                    </p>
                    <p style="margin:0 0 20px;font-size:14px;color:#c7d2fe;line-height:1.6;">
                      Dile qué necesitas en lenguaje natural y Clara redactará contratos, presupuestos, hojas de encargo o NDAs adaptados a tu negocio. Solo revisa, ajusta y envía a firmar.
                    </p>
                    <a href="${claraUrl}" style="display:inline-block;background:rgba(255,255,255,0.12);color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:8px;border:1px solid rgba(255,255,255,0.25);">
                      Probar Clara IA &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- TRUST STRIP -->
          <tr>
            <td style="background-color:#ffffff;padding:0 48px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-top:1px solid #f3f4f6;padding-top:24px;">
                <tr>
                  <td align="center">
                    <span style="display:inline-block;margin:4px 10px;font-size:12px;color:#9ca3af;">🔒 SSL/TLS bancario</span>
                    <span style="display:inline-block;margin:4px 10px;font-size:12px;color:#9ca3af;">⚖️ Normativa eIDAS</span>
                    <span style="display:inline-block;margin:4px 10px;font-size:12px;color:#9ca3af;">🇪🇺 RGPD compliant</span>
                    <span style="display:inline-block;margin:4px 10px;font-size:12px;color:#9ca3af;">🕐 Sello RFC 3161</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#f9fafb;border-top:1px solid #f3f4f6;padding:24px 48px;text-align:center;border-radius:0 0 20px 20px;">
              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6;">
                Recibiste este email porque creaste una cuenta en
                <a href="${siteUrl}" style="color:#2563eb;text-decoration:none;font-weight:600;">firmaclara.es</a>
              </p>
              <p style="margin:0;font-size:12px;color:#d1d5db;">
                &copy; ${year} FirmaClara &nbsp;&middot;&nbsp; Tecnología operada por Operia &nbsp;&middot;&nbsp;
                <a href="${siteUrl}/privacy" style="color:#d1d5db;text-decoration:underline;">Privacidad</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- ===================== END CARD ===================== -->

      </td>
    </tr>
  </table>

</body>
</html>`
}
