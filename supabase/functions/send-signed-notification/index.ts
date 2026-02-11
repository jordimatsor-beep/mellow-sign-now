import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { getCorsHeaders, handleCorsPreflightRequest, escapeHtml, sanitizeErrorMessage } from '../_shared/cors.ts'

interface RequestBody {
  document_id: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  const preflightResponse = handleCorsPreflightRequest(req);
  if (preflightResponse) return preflightResponse;

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('Missing RESEND_API_KEY')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { document_id }: RequestBody = await req.json()

    // 1. Fetch Document Details including User (Issuer)
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*, users:user_id (email, name, company_name)')
      .eq('id', document_id)
      .single()

    if (docError || !doc) throw new Error('Document not found')

    // 2. Prepare Email Content
    const signerEmail = doc.signer_email
    const issuerEmail = doc.users?.email
    const docTitleRaw = doc.title || 'Documento Firmado'
    const docTitle = escapeHtml(docTitleRaw)

    // STRICT: Only use SIGNED url. If missing, it's a bug or race condition that shouldn't happen with new flow.
    const signedFileUrl = doc.signed_file_url;
    if (!signedFileUrl) {
      throw new Error("Critical: signed_file_url is missing in notification step.");
    }

    const certificateUrl = doc.certificate_url;
    // We try to attach certificate. If missing, we might want to warn but not fail?
    // User requirement: "El destinatario debe recibir copia del certificado".
    // So if it's missing, we should probably throw or handle gracefully.
    // Since we chained it, it SHOULD be there.

    // Determine sender name
    const senderName = doc.users?.company_name || doc.users?.name || 'FirmaClara'

    // HTML Template
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: sans-serif; color: #1f2937; background-color: #f3f4f6; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: #2563eb; padding: 20px; text-align: center; color: white; }
            .content { padding: 30px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0; font-size: 24px;">Contrato Firmado</h1>
            </div>
            <div class="content">
              <p>Hola,</p>
              <p>El documento <strong>"${docTitle}"</strong> ha sido firmado y certificado correctamente.</p>
              <p>Se adjuntan a este correo:</p>
              <ul style="color: #4b5563; font-size: 14px;">
                <li><strong>Copia Firmada:</strong> El contrato con la firma estampada en anexo.</li>
                <li><strong>Certificado de Evidencia:</strong> Documento técnico validador (Audit Trail).</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${signedFileUrl}" class="button">Ver Documento Online</a>
              </div>
            </div>
            <div class="footer">
              <p>Procesado por FirmaClara</p>
            </div>
          </div>
        </body>
      </html>
    `

    // 3. Send Emails (To Signer AND Issuer)
    // We send separate emails or use cc/bcc. 
    // Recommended: Send to Signer, CC Issuer so both have same thread and attachments.

    const attachments = [
      {
        filename: `${docTitle.replace(/[^a-z0-9]/gi, '_')}_signed.pdf`,
        path: signedFileUrl
      }
    ];

    if (certificateUrl) {
      attachments.push({
        filename: `Certificado_Evidencia_${doc.id.substring(0, 8)}.pdf`,
        path: certificateUrl
      });
    }

    const emailPayload: any = {
      from: 'FirmaClara <noreply@firmaclara.es>',
      to: [signerEmail],
      subject: `[Firmado] ${docTitle} - Contrato y Certificado`,
      html: html,
      attachments: attachments
    }

    if (issuerEmail) {
      emailPayload.cc = [issuerEmail];
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify(emailPayload)
    })

    const data = await res.json()

    if (!res.ok) {
      console.error("Resend Error", data);
      throw new Error("Failed to send email");
    }


    // 4. Send SMS (Twilio) - Optional but good for UX since we used SMS for OTP
    if (doc.signer_phone) {
      try {
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
        // Force Strict From
        const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER') || Deno.env.get('TWILIO_PHONE_NUMBER');

        if (!fromNumber) {
          console.error("Skipping SMS: No TWILIO_FROM_NUMBER configured.");
        } else {
          // Remove whatsapp: prefix if exists (we want SMS)
          const from = fromNumber.replace('whatsapp:', '')
          const to = doc.signer_phone.replace(/[\s\-\(\)]/g, '')

          if (accountSid && authToken) {

            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
            const params = new URLSearchParams()
            params.append('To', to)
            params.append('From', from)
            params.append('Body', `FirmaClara: Documento "${docTitle}" firmado correctamente. Revisa tu email para descargar la copia.`)

            // Fire and forget (don't block response)
            fetch(twilioUrl, {
              method: 'POST',
              headers: {
                'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: params
            }).then(r => r.text()).then(t => console.log("SMS result:", t)).catch(e => console.error("SMS fail:", e));
          }
        } // Close else
      } catch (smsErr) {
        console.error("Error preparing SMS:", smsErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error(error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
