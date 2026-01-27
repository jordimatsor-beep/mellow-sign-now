import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib'
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";
import { Database } from '../_shared/types.ts'
import { getCorsHeaders, handleCorsPreflightRequest, sanitizeErrorMessage } from '../_shared/cors.ts'

serve(async (req: Request) => {
    const corsHeaders = getCorsHeaders(req);

    const preflightResponse = handleCorsPreflightRequest(req);
    if (preflightResponse) return preflightResponse;

    try {
        const supabase = createClient<Database>(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { token, otp_code, signature_image, user_agent } = await req.json()

        // Get client IP from request headers
        const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || req.headers.get('x-real-ip')
            || 'unknown'

        if (!token || !signature_image) throw new Error('Faltan datos requeridos (token o firma)')

        // Security: Validate signature image (must be base64 PNG, max 500KB)
        if (typeof signature_image !== 'string') {
            throw new Error('Formato de firma inválido');
        }
        if (!signature_image.startsWith('data:image/png;base64,')) {
            throw new Error('La firma debe ser una imagen PNG válida');
        }
        // Check base64 size (approx 500KB max = ~680KB base64)
        const base64Data = signature_image.replace('data:image/png;base64,', '');
        if (base64Data.length > 700000) {
            throw new Error('La imagen de firma es demasiado grande (máx 500KB)');
        }

        // Validate token format (UUID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(token)) {
            throw new Error('Token de documento inválido');
        }

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
            otpChannel = 'whatsapp'; // Actually SMS now but db field is 'whatsapp_otp'
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

        // 4. Load and modify PDF - CONFIGURABLE SIGNATURE PLACEMENT
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Embed Signature Image
        const pngImage = await pdfDoc.embedPng(signature_image);
        // Scale image reasonably
        const pngDims = pngImage.scale(0.5);

        // Get pages array
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width: pageWidth, height: pageHeight } = firstPage ? firstPage.getSize() : { width: 595.28, height: 841.89 };

        // Signature position configuration from document settings
        const sigPageSetting = doc.signature_page ?? 0; // 0 = new page, -1 = last page, >0 = specific page
        const sigX = doc.signature_x ?? 0;
        const sigY = doc.signature_y ?? 0;

        const signedAt = new Date();
        let targetPage;
        let drawFullCertificate = false;

        if (sigPageSetting === 0) {
            // --- ADD NEW PAGE FOR SIGNATURE (default behavior) ---
            targetPage = pdfDoc.addPage([pageWidth, pageHeight]);
            drawFullCertificate = true;
        } else if (sigPageSetting === -1) {
            // --- USE LAST PAGE ---
            targetPage = pages[pages.length - 1];
        } else if (sigPageSetting > 0 && sigPageSetting <= pages.length) {
            // --- USE SPECIFIC PAGE ---
            targetPage = pages[sigPageSetting - 1]; // Convert to 0-indexed
        } else {
            // Invalid page number, fallback to new page
            targetPage = pdfDoc.addPage([pageWidth, pageHeight]);
            drawFullCertificate = true;
        }

        const targetPageSize = targetPage.getSize();

        if (drawFullCertificate) {
            // Draw Header on Signature Page (only for new page mode)
            targetPage.drawText('Certificado de Firma - Anexo', {
                x: 50,
                y: targetPageSize.height - 50,
                size: 18,
                font: helveticaBold,
                color: rgb(0.12, 0.23, 0.37),
            });

            targetPage.drawLine({
                start: { x: 50, y: targetPageSize.height - 65 },
                end: { x: targetPageSize.width - 50, y: targetPageSize.height - 65 },
                thickness: 1,
                color: rgb(0.8, 0.8, 0.8),
            });

            // Draw Legal Text
            const legalText = `Este documento ha sido firmado electrónicamente a través de la plataforma FirmaClara.
La firma que aparece a continuación certifica la aceptación del contenido del contrato adjunto.`;

            targetPage.drawText(legalText, {
                x: 50,
                y: targetPageSize.height - 100,
                size: 10,
                font: timesRoman,
                color: rgb(0.2, 0.2, 0.2),
                lineHeight: 14,
            });

            // Draw Signature centered on new page
            const boxY = targetPageSize.height - 250;
            const centeredX = targetPageSize.width / 2 - pngDims.width / 2;
            targetPage.drawImage(pngImage, {
                x: centeredX,
                y: boxY,
                width: pngDims.width,
                height: pngDims.height,
            });

            // Metadata under signature
            const signatureText = `Firmado por: ${doc.signer_name}`;
            const emailText = `Email: ${doc.signer_email}`;
            const dateText = `Fecha: ${signedAt.toLocaleString('es-ES')}`;
            const idText = `ID Documento: ${doc.id}`;

            targetPage.drawText(signatureText, {
                x: 50,
                y: boxY - 20,
                size: 10,
                font: helveticaBold,
                color: rgb(0, 0, 0),
            });

            targetPage.drawText(emailText, {
                x: 50,
                y: boxY - 35,
                size: 9,
                font: timesRoman,
                color: rgb(0.3, 0.3, 0.3),
            });

            targetPage.drawText(dateText, {
                x: 50,
                y: boxY - 50,
                size: 9,
                font: timesRoman,
                color: rgb(0.3, 0.3, 0.3),
            });

            targetPage.drawText(idText, {
                x: 50,
                y: boxY - 65,
                size: 9,
                font: timesRoman,
                color: rgb(0.3, 0.3, 0.3),
            });
        } else {
            // --- PLACE SIGNATURE ON EXISTING PAGE AT SPECIFIED COORDINATES ---
            const finalX = sigX > 0 ? sigX : (targetPageSize.width / 2 - pngDims.width / 2);
            const finalY = sigY > 0 ? sigY : 80; // Default 80pt from bottom

            // Draw signature image
            targetPage.drawImage(pngImage, {
                x: finalX,
                y: finalY,
                width: pngDims.width,
                height: pngDims.height,
            });

            // Draw minimal metadata below signature
            const metaY = finalY - 15;
            const dateText = `Firmado: ${signedAt.toLocaleString('es-ES')}`;
            targetPage.drawText(dateText, {
                x: finalX,
                y: metaY,
                size: 7,
                font: timesRoman,
                color: rgb(0.4, 0.4, 0.4),
            });
        }

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
            signature_image_url: signature_image.substring(0, 50) + '...',
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

        // 9. Trigger Audit Trail -> Notification Chain
        // We do NOT call send-signed-notification here anymore.
        // We only call generate-audit-trail. 
        // generate-audit-trail acts as the orchestrator: it generates evidence, then calls send-signed-notification.

        // Using fetch to trigger async - but we want to ensure it starts.
        // We will NOT await the full completion to avoid timeout if it's long, 
        // BUT for strictness, we SHOULD await if possible. 
        // Given Supabase limits (function timeout), let's fire and forget but log well.
        // Better: Await it. `sign-complete` is critical. If audit fails, we want to know? 
        // No, signature is already saved. We just need to ensure the trail runs.

        try {
            fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-audit-trail`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ document_id: doc.id })
            });
            // NOT calling send-signed-notification here. generate-audit-trail will do it.

        } catch (e) {
            console.error("Failed to trigger background audit task", e);
        }

        // 11. Log event
        await supabase.from('event_logs').insert({
            user_id: doc.user_id,
            document_id: doc.id,
            event_type: 'document.signed',
            event_data: {
                branding: 'FirmaClara',
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

    } catch (error: any) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        console.error('Sign-complete error:', error);
        return new Response(
            JSON.stringify({ success: false, error: message, details: JSON.stringify(error) }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
    }
})
