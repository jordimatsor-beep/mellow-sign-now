import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1'
import { getCorsHeaders, handleCorsPreflightRequest, sanitizeErrorMessage } from '../_shared/cors.ts'

serve(async (req) => {
    const corsHeaders = getCorsHeaders(req);

    const preflightResponse = handleCorsPreflightRequest(req);
    if (preflightResponse) return preflightResponse;

    try {
        // 1. Auth Guard (Service Role Only)
        // This function should ONLY be triggered by internal system events (sign-complete)
        const authHeader = req.headers.get('Authorization');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (authHeader !== `Bearer ${serviceRoleKey}`) {
            throw new Error('Unauthorized: Service Role required');
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { document_id } = await req.json()
        if (!document_id) throw new Error('Missing document_id')

        // 1. Fetch Entitites
        const { data: doc, error: docError } = await supabase
            .from('documents')
            .select('*')
            .eq('id', document_id)
            .single()

        if (docError || !doc) throw new Error('Document not found')

        // Fetch Logs
        const { data: logs, error: logsError } = await supabase
            .from('event_logs')
            .select('*')
            .eq('document_id', document_id)
            .order('created_at', { ascending: true })

        // Fetch Signature info (IP, UA)
        const { data: signature, error: sigError } = await supabase
            .from('signatures')
            .select('*')
            .eq('document_id', document_id)
            .single()


        // 2. Create PDF
        const pdfDoc = await PDFDocument.create()
        const page = pdfDoc.addPage()
        const { width, height } = page.getSize()
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

        let y = height - 50
        const fontSize = 12
        const lineHeight = 20

        // Helper to draw text
        const drawText = (text: string, options: any = {}) => {
            page.drawText(text, {
                x: 50,
                y,
                size: fontSize,
                font: options.bold ? fontBold : font,
                color: options.color || rgb(0, 0, 0),
                ...options
            })
            y -= lineHeight
        }

        // --- HEADER ---
        drawText('CERTIFICADO DE EVIDENCIA ELECTRONICA', { bold: true, size: 18, color: rgb(0.12, 0.23, 0.37) })
        y -= 10
        drawText('FirmaClara Trust Services', { size: 10, color: rgb(0.5, 0.5, 0.5) })
        y -= 20
        page.drawLine({
            start: { x: 50, y: y + 10 },
            end: { x: width - 50, y: y + 10 },
            thickness: 1,
            color: rgb(0.8, 0.8, 0.8),
        })
        y -= 20

        // --- DOCUMENT INFO ---
        drawText('INFORMACION DEL DOCUMENTO', { bold: true })
        drawText(`Titulo: ${doc.title}`)
        drawText(`Ref. ID: ${doc.id}`)
        drawText(`Hash (SHA-256): ${doc.file_hash?.substring(0, 32) || 'N/A'}...`) // Created at/Sent at?
        drawText(`Fecha Creación: ${new Date(doc.created_at).toUTCString()}`)
        y -= 20

        // --- PARTIES ---
        drawText('PARTICIPANTES', { bold: true })
        drawText(`Emisor (Propietario): User ID ${doc.user_id}`) // Ideally fetch user email if possible, but requires join
        drawText(`Firmante: ${doc.signer_name} (${doc.signer_email})`)
        if (doc.signer_phone) drawText(`Telefono: ${doc.signer_phone}`)
        y -= 20

        // --- TECHNICAL EVIDENCE (From Signature table) ---
        if (signature) {
            drawText('EVIDENCIA TECNICA DE FIRMA', { bold: true })
            drawText(`Fecha Firma (UTC): ${new Date(signature.signed_at).toUTCString()}`)
            drawText(`Dirección IP: ${signature.ip_address || 'N/A'}`)
            drawText(`Navegador (User Agent): ${signature.user_agent ? signature.user_agent.substring(0, 60) + '...' : 'N/A'}`)
            if (signature.otp_verified_at) {
                drawText(`Verificación OTP: SI (WhatsApp/SMS) - ${signature.otp_verified_at}`)
            }
        }
        y -= 20

        // --- AUDIT LOG ---
        drawText('TRAZA DE AUDITORIA (LOGS)', { bold: true })
        if (logs) {
            logs.forEach((log: any) => {
                const date = new Date(log.created_at).toISOString().replace('T', ' ').substring(0, 19)
                drawText(`[${date}] ${log.event_type.toUpperCase()} - ${JSON.stringify(log.event_data || {}).substring(0, 50)}`, { size: 10 })
            })
        }

        // Footer
        page.drawText(`Generado por FirmaClara. ID: ${crypto.randomUUID()}`, {
            x: 50,
            y: 30,
            size: 8,
            font,
            color: rgb(0.5, 0.5, 0.5)
        })

        const pdfBytes = await pdfDoc.save()

        // 3. Upload to Storage
        const filePath = `${doc.user_id}/${doc.id}_evidence.pdf`
        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

        if (uploadError) throw new Error('Failed to upload evidence PDF: ' + uploadError.message)

        // 4. Get Public URL
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath)

        // 5. Update Document Record
        // We use 'certificate_url' as defined in schema
        const { error: updateError } = await supabase
            .from('documents')
            .update({ certificate_url: publicUrl })
            .eq('id', doc.id)

        if (updateError) console.error('Failed to update document certificate_url:', updateError)

        // 6. Trigger Notification Email (Chained)
        // Now that the Evidence PDF is generated and saved, we notify the parties.
        try {
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-signed-notification`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ document_id: doc.id })
            });
        } catch (e) {
            console.error("Failed to trigger notification from audit trail:", e);
        }

        return new Response(
            JSON.stringify({ success: true, url: publicUrl }),
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
