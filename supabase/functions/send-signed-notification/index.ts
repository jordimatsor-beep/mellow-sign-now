import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
    document_id: string;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

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
        const fileUrl = doc.signed_file_url || doc.file_url // Fallback if signed_file_url not set yet (should be)
        const docTitle = doc.title || 'Documento Firmado'

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
              <h1 style="margin:0; font-size: 24px;">Documento Firmado</h1>
            </div>
            <div class="content">
              <p>Hola,</p>
              <p>El documento <strong>"${docTitle}"</strong> ha sido firmado correctamente por todas las partes.</p>
              <p>Se adjunta una copia digital con plena validez legal, incluyendo:</p>
              <ul style="color: #4b5563; font-size: 14px;">
                <li>Firma digital del solicitante</li>
                <li>Sellado de tiempo (Timestamp)</li>
                <li>Hash de integridad SHA-256</li>
                <li>Traza de auditoría</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${fileUrl}" class="button">Descargar Documento Firmado</a>
              </div>
            </div>
            <div class="footer">
              <p>Enviado de forma segura por FirmaClara</p>
            </div>
          </div>
        </body>
      </html>
    `

        // 3. Send Emails (To Signer AND Issuer)
        const recipients = [signerEmail];
        if (issuerEmail && issuerEmail !== signerEmail) {
            recipients.push(issuerEmail);
        }

        // Using bcc for simplicity or separate emails. Resend supports multiple 'to' but they see each other.
        // Better to loop or send as "to: signer, cc: issuer"
        // Let's send to Signer, CC Issuer

        const emailPayload: any = {
            from: 'FirmaClara <noreply@firmaclara.es>',
            to: [signerEmail],
            subject: `[Firmado] ${docTitle} - Copia Legal`,
            html: html,
            attachments: [
                {
                    filename: `${docTitle.replace(/[^a-z0-9]/gi, '_')}_signed.pdf`,
                    path: fileUrl
                }
            ]
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
