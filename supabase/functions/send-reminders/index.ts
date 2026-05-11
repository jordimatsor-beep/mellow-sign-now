import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getCorsHeaders, handleCorsPreflightRequest, escapeHtml } from '../_shared/cors.ts'

serve(async (req: Request) => {
    const corsHeaders = getCorsHeaders(req);

    const preflightResponse = handleCorsPreflightRequest(req);
    if (preflightResponse) return preflightResponse;

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        if (!RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY')

        const SITE_URL = Deno.env.get('SITE_URL') || 'https://firmaclara.es'

        // Documents sent but not yet signed, older than 24h
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

        const { data: pendingDocs, error: docError } = await supabase
            .from('documents')
            .select('id, title, signer_email, signer_name, sign_token, user_id, users(company_name, name)')
            .in('status', ['sent', 'viewed'])
            .lt('created_at', oneDayAgo)

        if (docError) throw docError

        let sentCount = 0

        for (const doc of pendingDocs || []) {
            // Skip if a reminder was sent less than 48h ago
            const { data: reminderLog } = await supabase
                .from('event_logs')
                .select('created_at')
                .eq('document_id', doc.id)
                .eq('event_type', 'reminder_sent')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            const lastSent = reminderLog?.created_at ? new Date(reminderLog.created_at) : null
            const now = new Date()

            if (lastSent && (now.getTime() - lastSent.getTime()) < 48 * 60 * 60 * 1000) {
                continue
            }

            const senderName = escapeHtml((doc.users as any)?.company_name || (doc.users as any)?.name || 'Tu contacto')
            const safeSignerName = escapeHtml(doc.signer_name) || 'Cliente'
            const safeTitle = escapeHtml(doc.title)
            const signUrl = `${SITE_URL}/sign/${doc.sign_token}`
            const year = new Date().getFullYear()

            const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Recordatorio de firma</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(145deg,#1e40af 0%,#2563eb 100%);padding:32px 48px;text-align:center;">
              <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Firma<span style="color:#93c5fd;">Clara</span></span>
              <p style="margin:16px 0 0;font-size:13px;font-weight:600;color:#bfdbfe;text-transform:uppercase;letter-spacing:0.08em;">⏰ Recordatorio de firma</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 48px 0;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">Hola, ${safeSignerName}</h1>
              <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.7;">
                <strong style="color:#111827;">${senderName}</strong> sigue esperando tu firma en el siguiente documento:
              </p>

              <!-- Document box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#eff6ff;border-radius:12px;border:1px solid #dbeafe;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:13px;color:#3b82f6;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Documento pendiente</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#1e3a8a;">📄 ${safeTitle}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                Solo te llevará <strong style="color:#111827;">menos de 1 minuto</strong>. Sin instalaciones, sin registros. Haz clic en el botón y firma desde cualquier dispositivo.
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 48px 32px;text-align:center;">
              <a href="${signUrl}" style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#ffffff;text-decoration:none;font-size:17px;font-weight:700;padding:16px 44px;border-radius:10px;box-shadow:0 6px 20px rgba(37,99,235,0.4);">
                Firmar documento ahora &rarr;
              </a>
              <p style="margin:14px 0 0;font-size:12px;color:#9ca3af;">
                Si ya has firmado, ignora este mensaje.
              </p>
            </td>
          </tr>

          <!-- Link fallback -->
          <tr>
            <td style="padding:0 48px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-top:1px solid #f3f4f6;padding-top:20px;">
                <tr>
                  <td>
                    <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">Si el botón no funciona, copia este enlace en tu navegador:</p>
                    <p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all;">${signUrl}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 48px;text-align:center;border-radius:0 0 16px 16px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                &copy; ${year} FirmaClara &nbsp;&middot;&nbsp; Firma electrónica con validez legal &nbsp;&middot;&nbsp;
                <a href="${SITE_URL}/privacy" style="color:#9ca3af;text-decoration:underline;">Privacidad</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                    from: 'FirmaClara <noreply@firmaclara.es>',
                    to: [doc.signer_email],
                    subject: `Recordatorio: "${safeTitle}" está esperando tu firma`,
                    html,
                }),
            })

            if (res.ok) {
                await supabase.from('event_logs').insert({
                    document_id: doc.id,
                    event_type: 'reminder_sent',
                    event_data: { type: 'auto_email_48h', signer_email: doc.signer_email },
                })
                sentCount++
            }
        }

        return new Response(
            JSON.stringify({ success: true, sent_count: sentCount, checked: pendingDocs?.length ?? 0 }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (e: any) {
        console.error('send-reminders error:', e)
        return new Response(
            JSON.stringify({ success: false, error: e.message }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
    }
})
