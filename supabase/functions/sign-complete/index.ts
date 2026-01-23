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

        const { token, otp_code, signature_image, user_agent } = await req.json()
        
        // Get client IP from request headers
        const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
            || req.headers.get('x-real-ip') 
            || 'unknown'

        if (!token || !signature_image) throw new Error('Faltan datos requeridos (token o firma)')

        // 1. Fetch Document
        const { data: doc, error: docError } = await supabase
            .from('documents')
            .select('*')
            .eq('sign_token', token)
            .single()

        if (docError || !doc) throw new Error('Documento no encontrado')

        // Check if already signed
        if (doc.status === 'signed') {
            throw new Error('Este documento ya ha sido firmado')
        }

        // Check expiration
        if (doc.expires_at && new Date(doc.expires_at) < new Date()) {
            throw new Error('Este enlace de firma ha expirado')
        }

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
            if (doc.otp_expires_at && new Date(doc.otp_expires_at) < new Date()) {
                throw new Error('Código OTP expirado. Solicita uno nuevo.')
            }

            otpVerified = true;
            otpChannel = 'whatsapp';
        }

        // 3. Download original PDF
        let pdfBytes: ArrayBuffer;
        
        // Try to extract path from URL
        if (doc.file_url.includes('/documents/')) {
            const pathParts = doc.file_url.split('/documents/');
            if (pathParts.length > 1) {
                const filePath = pathParts[1];
                const { data: fileData, error: fileError } = await supabase.storage
                    .from('documents')
                    .download(filePath);
                
                if (!fileError && fileData) {
                    pdfBytes = await fileData.arrayBuffer();
                } else {
                    // Fallback to fetch
                    const res = await fetch(doc.file_url);
                    if (!res.ok) throw new Error('No se pudo descargar el documento original');
                    pdfBytes = await res.arrayBuffer();
                }
            } else {
                const res = await fetch(doc.file_url);
                if (!res.ok) throw new Error('No se pudo descargar el documento original');
                pdfBytes = await res.arrayBuffer();
            }
        } else {
            const res = await fetch(doc.file_url);
            if (!res.ok) throw new Error('No se pudo descargar el documento original');
            pdfBytes = await res.arrayBuffer();
        }

        // 4. Load and modify PDF
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Embed Signature Image
        const pngImage = await pdfDoc.embedPng(signature_image);
        const { width, height } = pngImage.scale(0.5);

        // Stamp on Last Page (Bottom Center)
        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];
        const { width: pageWidth, height: pageHeight } = lastPage.getSize();

        // Draw signature
        lastPage.drawImage(pngImage, {
            x: pageWidth / 2 - width / 2,
            y: 50,
            width,
            height,
        });

        // Add signature metadata text
        const signedAt = new Date();
        const signatureText = `Firmado digitalmente por: ${doc.signer_name}`;
        const dateText = `Fecha: ${signedAt.toLocaleString('es-ES')}`;
        
        lastPage.drawText(signatureText, {
            x: pageWidth / 2 - 100,
            y: 35,
            size: 8,
            font: timesRoman,
            color: rgb(0.3, 0.3, 0.3),
        });
        
        lastPage.drawText(dateText, {
            x: pageWidth / 2 - 60,
            y: 25,
            size: 7,
            font: timesRoman,
            color: rgb(0.5, 0.5, 0.5),
        });

        // 5. Finalize PDF
        const signedPdfBytes = await pdfDoc.save();

        // Calculate hash of signed document
        const finalHashBuffer = await crypto.subtle.digest('SHA-256', signedPdfBytes);
        const finalHashArray = Array.from(new Uint8Array(finalHashBuffer));
        const finalHash = finalHashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // 6. Upload signed PDF
        const finalPath = `${doc.user_id}/${doc.id}_signed.pdf`;
        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(finalPath, signedPdfBytes, { contentType: 'application/pdf', upsert: true });

        if (uploadError) throw new Error('Error al guardar el documento firmado');

        const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(finalPath);

        // 7. Insert Signature Record
        const { error: sigError } = await supabase.from('signatures').insert({
            document_id: doc.id,
            signer_name: doc.signer_name,
            signer_email: doc.signer_email,
            ip_address: ip_address,
            user_agent: user_agent,
            signature_image_url: signature_image.substring(0, 100) + '...', // Store truncated for reference
            hash_sha256: finalHash,
            signed_at: signedAt.toISOString()
        });

        if (sigError) {
            console.error('Signature insert error:', sigError);
            throw new Error('Error al registrar la firma');
        }

        // 8. Update Document Status
        const { error: updateError } = await supabase.from('documents').update({
            status: 'signed',
            signed_at: signedAt.toISOString(),
            signed_file_url: publicUrlData.publicUrl,
            // Clear OTP data after successful signature
            otp_code_hash: null,
            otp_expires_at: null,
            whatsapp_verification_status: otpVerified ? 'verified' : null
        }).eq('id', doc.id);

        if (updateError) {
            console.error('Document update error:', updateError);
        }

        // 9. Generate Audit Trail asynchronously
        try {
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-audit-trail`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ document_id: doc.id })
            });
        } catch (e) {
            console.error("Failed to trigger audit trail generation", e);
        }

        // 10. Log event for notifications
        await supabase.from('event_logs').insert({
            user_id: doc.user_id,
            document_id: doc.id,
            event_type: 'document.signed',
            event_data: {
                branding: 'Multicentros',
                pdf_url: publicUrlData.publicUrl,
                signer_email: doc.signer_email,
                signer_name: doc.signer_name,
                owner_id: doc.user_id,
                otp_verified: otpVerified,
                security_level: doc.security_level
            },
            ip_address: ip_address,
            user_agent: user_agent
        });

        return new Response(
            JSON.stringify({ 
                success: true, 
                message: 'Documento firmado y sellado correctamente',
                document_id: doc.id,
                signed_at: signedAt.toISOString()
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        console.error('Sign-complete error:', message);
        return new Response(
            JSON.stringify({ error: message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
})
