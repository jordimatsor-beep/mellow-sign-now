import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib'
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { token, otp_code, signature_image, user_agent, ip_address } = await req.json()

        if (!token || !signature_image) throw new Error('Faltan datos requeridos (token o firma)')

        // 1. Fetch Document
        const { data: doc, error: docError } = await supabase
            .from('documents')
            .select('*')
            .eq('sign_token', token)
            .single()

        if (docError || !doc) throw new Error('Documento no encontrado')

        // 2. Security / OTP Check
        let otpVerified = false;
        let otpChannel = 'none';

        if (doc.security_level === 'whatsapp_otp') {
            if (!otp_code) throw new Error('Se requiere código OTP para firmar este documento')

            // Hash incoming code
            const msgUint8 = new TextEncoder().encode(otp_code);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const inputHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            // Verify
            if (inputHash !== doc.otp_code_hash) {
                throw new Error('Código OTP incorrecto')
            }

            // Check Expiry
            if (new Date(doc.otp_expires_at) < new Date()) {
                throw new Error('Código OTP expirado. Solicita uno nuevo.')
            }

            otpVerified = true;
            otpChannel = 'whatsapp';
        }

        // 3. Process PDF
        // Download original
        const { data: fileData, error: fileError } = await supabase.storage
            .from('documents') // Assuming bucket name
            .download(doc.file_url.split('/documents/')[1] || doc.file_url) // Handle full URL or path

        // Fallback if download fails (try to handle URL parsing better if needed)
        // For now assume standard path logic or just fetch(doc.file_url) if public
        let pdfBytes;
        if (fileError) {
            // Try fetching public URL
            const res = await fetch(doc.file_url)
            if (!res.ok) throw new Error('No se pudo descargar el documento original')
            pdfBytes = await res.arrayBuffer()
        } else {
            pdfBytes = await fileData.arrayBuffer()
        }

        // Load PDF
        const pdfDoc = await PDFDocument.load(pdfBytes)
        const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman)
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

        // Embed Signature Image
        const pngImage = await pdfDoc.embedPng(signature_image)
        const { width, height } = pngImage.scale(0.5)

        // Stamp on Last Page (Bottom Center)
        const pages = pdfDoc.getPages()
        const lastPage = pages[pages.length - 1]
        const { width: pageWidth, height: pageHeight } = lastPage.getSize()

        lastPage.drawImage(pngImage, {
            x: pageWidth / 2 - width / 2,
            y: 50,
            width,
            height,
        })

        // 5. Finalize PDF (Just the stamped document)
        const validPdfBytes = await pdfDoc.save()

        // 6. Upload Final Signed PDF
        const finalPath = `${doc.user_id}/${doc.id}_signed.pdf`
        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(finalPath, validPdfBytes, { contentType: 'application/pdf', upsert: true })

        if (uploadError) throw new Error('Error al guardar el documento firmado')

        const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(finalPath)

        // 7. Insert Signature Record
        const { error: sigError } = await supabase.from('signatures').insert({
            document_id: doc.id,
            signer_name: doc.signer_name,
            signer_email: doc.signer_email,
            ip_address: ip_address,
            user_agent: user_agent,
            signature_image_url: doc.file_url,
            hash_sha256: 'pending',
            otp_channel: otpChannel,
            otp_verified_at: otpVerified ? new Date().toISOString() : null,
            otp_code_ref: otp_code ? 'xxxxx' + otp_code.slice(-2) : null,
            signed_at: new Date().toISOString()
        })

        if (sigError) throw sigError

        // 8. Update Document Status
        await supabase.from('documents').update({
            status: 'signed',
            signed_at: new Date().toISOString(),
            signed_file_url: publicUrlData.publicUrl,
            // evidence_url will be updated by the async function
        }).eq('id', doc.id)

        // 9. Generate Audit Trail (Certificate)
        // Call the separate function asynchronously
        try {
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-audit-trail`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ document_id: doc.id })
            })
        } catch (e) {
            console.error("Failed to trigger audit trail generation", e)
        }

        // 10. Log for Email Trigger


        // Calculate final hash
        const finalHashBuffer = await crypto.subtle.digest('SHA-256', validPdfBytes);
        const finalHashArray = Array.from(new Uint8Array(finalHashBuffer));
        const finalHash = finalHashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // 6. Upload Final PDF
        const finalPath = `${doc.user_id}/${doc.id}_signed.pdf`
        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(finalPath, validPdfBytes, { contentType: 'application/pdf', upsert: true })

        if (uploadError) throw new Error('Error al guardar el documento firmado')

        const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(finalPath)

        // 7. Insert Signature Record
        const { error: sigError } = await supabase.from('signatures').insert({
            document_id: doc.id,
            signer_name: doc.signer_name,
            signer_email: doc.signer_email,
            ip_address: ip_address,
            user_agent: user_agent,
            signature_image_url: doc.file_url, // Or store the separate image if we want
            hash_sha256: finalHash,
            // tsa_timestamp: TODO (call existing request-tsa or leave null for async)
            otp_channel: otpChannel,
            otp_verified_at: otpVerified ? new Date().toISOString() : null,
            otp_code_ref: otp_code ? 'xxxxx' + otp_code.slice(-2) : null, // Masked
            signed_at: new Date().toISOString()
        })

        if (sigError) throw sigError

        // 8. Update Document Status
        await supabase.from('documents').update({
            status: 'signed',
            signed_at: new Date().toISOString(),
            signed_file_url: publicUrlData.publicUrl
        }).eq('id', doc.id)

        // 9. Log for Email Trigger (n8n or other)
        await supabase.from('event_logs').insert({
            user_id: doc.user_id,
            document_id: doc.id,
            event_type: 'document.signed',
            event_data: {
                branding: 'Multicentros',
                pdf_url: publicUrlData.publicUrl,
                signer_email: doc.signer_email,
                owner_id: doc.user_id
            }
        })

        return new Response(
            JSON.stringify({ success: true, message: 'Documento firmado y sellado' }),
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
