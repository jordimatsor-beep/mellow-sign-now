import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1'

// --- INLINED CORS LOGIC (No external dependencies) ---
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

serve(async (req: Request) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: getCorsHeaders(req) })
    }

    const corsHeaders = getCorsHeaders(req);

    try {
        console.log("Sign-complete-v2 invoked");

        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase Configuration')
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // Parse Body
        const { token, otp_code, signature_image, user_agent } = await req.json()

        // Get client IP - Prioritize x-real-ip
        const ip_address = req.headers.get('x-real-ip')
            || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || 'unknown'

        if (!token || !signature_image) throw new Error('Faltan datos requeridos (token o firma)')

        // Security: Validate signature image
        if (typeof signature_image !== 'string') {
            throw new Error('Formato de firma inválido');
        }
        if (!signature_image.startsWith('data:image/png;base64,')) {
            throw new Error('La firma debe ser una imagen PNG válida');
        }

        const base64Data = signature_image.replace('data:image/png;base64,', '');
        // ~500KB limit
        // Increased limit for high-DPI signatures (approx 6MB base64)
        if (base64Data.length > 8000000) {
            throw new Error('La imagen de firma es demasiado grande (máx 6MB)');
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

        if (docError || !doc) {
            console.error("Doc error:", docError); // Debug
            throw new Error('Documento no encontrado')
        }

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

        // Use security_level or legacy boolean
        if (doc.security_level === 'whatsapp_otp' || doc.whatsapp_verification === true) {
            if (!otp_code) throw new Error('Se requiere código OTP para firmar este documento')

            // Hash incoming code
            const msgUint8 = new TextEncoder().encode(otp_code);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const inputHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            // Verify
            if (inputHash !== doc.otp_code_hash) {
                // Rate limit/Anti-brute force SHOULD be here, but for now we throw error
                throw new Error('Código OTP incorrecto')
            }

            // Check Expiry
            if (doc.otp_expires_at && new Date(doc.otp_expires_at) < new Date()) {
                throw new Error('Código OTP expirado. Solicita uno nuevo.')
            }

            otpVerified = true;
        }

        // 3. Download original PDF
        let pdfBytes: ArrayBuffer;
        let fileUrl = doc.file_url;

        console.log("Original document URL/Path:", fileUrl); // DEBUG

        // Determine if we should use internal download or public fetch
        let useInternalDownload = false;
        let downloadPath = fileUrl;

        // Check if it's a relative path (not http)
        if (fileUrl && !fileUrl.startsWith('http')) {
            useInternalDownload = true;
        }
        // Check if it's OUR Supabase URL (optimized download)
        else if (fileUrl && fileUrl.includes('/storage/v1/object/public/documents/')) {
            // Extract path from public URL
            // Format: .../storage/v1/object/public/documents/FOLDER/FILE.pdf
            const urlParts = fileUrl.split('/documents/');
            if (urlParts.length > 1) {
                downloadPath = decodeURIComponent(urlParts[1]); // Decode in case of %20 etc.
                useInternalDownload = true;
                console.log(`Detected internal Supabase URL. Converted to path: ${downloadPath}`);
            }
        }
        else if (fileUrl && fileUrl.includes('/storage/v1/object/sign/documents/')) {
            // Extract path from signed URL
            const urlParts = fileUrl.split('/documents/');
            if (urlParts.length > 1) {
                // Remove query params if any
                let path = urlParts[1];
                if (path.includes('?')) path = path.split('?')[0];
                downloadPath = decodeURIComponent(path);
                useInternalDownload = true;
                console.log(`Detected signed Supabase URL. Converted to path: ${downloadPath}`);
            }
        }

        if (useInternalDownload) {
            // Internal Download via Service Role (Bypasses RLS/Public checks)
            console.log(`Downloading internally from path: ${downloadPath}`);
            const { data: fileData, error: fileError } = await supabase.storage
                .from('documents')
                .download(downloadPath);

            if (fileError || !fileData) {
                console.error("Storage download error:", fileError);
                throw new Error(`Error al descargar documento interno: ${fileError?.message}`);
            }
            pdfBytes = await fileData.arrayBuffer();
        } else {
            // Fallback: External URL Fetch
            console.log("Downloading from public/external URL:", fileUrl);
            try {
                const res = await fetch(fileUrl);
                if (!res.ok) {
                    console.error("Fetch status:", res.status, res.statusText);
                    throw new Error(`Fetch failed with status ${res.status}`);
                }
                pdfBytes = await res.arrayBuffer();
            } catch (e: any) {
                console.error("Fetch error details:", e);
                // Intentionally vague? No, specific.
                throw new Error(`No se pudo descargar el documento original (Fetch): ${e.message}`);
            }
        }

        // 4. Load and modify PDF - CONFIGURABLE SIGNATURE PLACEMENT
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        // const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold); // Unused if mostly using last page

        // Embed Signature Image
        const pngImage = await pdfDoc.embedPng(signature_image);

        // Calculate scaling to fit within a bounding box (e.g. 200x80)
        // This ensures signatures from Retina screens (high DPI) don't appear huge
        const MAX_SIG_WIDTH = 200;
        const MAX_SIG_HEIGHT = 80;

        const imgWidth = pngImage.width;
        const imgHeight = pngImage.height;

        const scaleW = MAX_SIG_WIDTH / imgWidth;
        const scaleH = MAX_SIG_HEIGHT / imgHeight;

        // Use the smaller scale to fit entirely within the box, but limit max scale to 0.5 to keep regular signatures crisp
        const scaleFactor = Math.min(scaleW, scaleH, 0.5);

        const pngDims = {
            width: imgWidth * scaleFactor,
            height: imgHeight * scaleFactor
        };

        // Get pages array
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width: pageWidth, height: pageHeight } = firstPage ? firstPage.getSize() : { width: 595.28, height: 841.89 };

        // Signature position configuration from document settings
        // Default to -1 (Last Page) for new behavior if null
        const sigPageSetting = doc.signature_page ?? -1;
        const sigX = doc.signature_x ?? 0;
        const sigY = doc.signature_y ?? 0;

        const signedAt = new Date();
        let targetPage;

        if (sigPageSetting === 0) {
            // New Page logic (Legacy / User Selected)
            targetPage = pdfDoc.addPage([pageWidth, pageHeight]);
            const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            // Draw Header on Signature Page
            targetPage.drawText('Certificado de Firma - Anexo', {
                x: 50, y: pageHeight - 50, size: 18, font: helveticaBold, color: rgb(0.12, 0.23, 0.37),
            });
            // Draw Sig
            targetPage.drawImage(pngImage, {
                x: (pageWidth / 2) - (pngDims.width / 2),
                y: pageHeight - 250,
                width: pngDims.width,
                height: pngDims.height,
            });

        } else if (sigPageSetting === -1) {
            // --- USE LAST PAGE (NEW DEFAULT) ---
            targetPage = pages[pages.length - 1];
        } else if (sigPageSetting > 0 && sigPageSetting <= pages.length) {
            // --- USE SPECIFIC PAGE ---
            targetPage = pages[sigPageSetting - 1];
        } else {
            // Fallback
            targetPage = pages[pages.length - 1];
        }

        // If not new page (i.e., modifying existing page)
        if (sigPageSetting !== 0) {
            const targetPageSize = targetPage.getSize();
            // Default position: Bottom Center
            let finalX = sigX;
            let finalY = sigY;

            // If 0, use defaults
            if (finalX === 0) finalX = (targetPageSize.width / 2) - (pngDims.width / 2); // Center
            if (finalY === 0) finalY = 80;

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

        if (uploadError) throw new Error('Error al guardar el documento firmado: ' + uploadError.message);

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

        if (sigError) throw new Error('Error al registrar la firma en base de datos');

        // 8. Update Document Status (Optimistic Concurrency Control)
        const { error: updateError, count } = await supabase.from('documents').update({
            status: 'signed',
            signed_at: signedAt.toISOString(),
            signed_file_url: publicUrlData.publicUrl,
            otp_code_hash: null,
            otp_expires_at: null,
            whatsapp_verification_status: otpVerified ? 'verified' : null
        }, { count: 'exact' })
            .eq('id', doc.id)
            .neq('status', 'signed'); // Ensure we don't overwrite if race condition occur

        if (updateError) throw new Error('Error al actualizar estado del documento: ' + updateError.message);

        // If count is 0, it means it was already signed in the millisecond between read and write
        if (count === 0 && !updateError) {
            throw new Error('Este documento ya ha sido firmado por otra petición concurrente.');
        }

        // 9. Trigger Audit Trail
        try {
            await fetch(`${supabaseUrl}/functions/v1/generate-audit-trail`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ document_id: doc.id })
            });
        } catch (e) {
            console.error("Trigger audit error:", e);
        }

        // 10. Trigger Notification (Email + SMS)
        // We trigger it here to ensure redundancy even if audit trail fails
        try {
            console.log("Triggering send-signed-notification from sign-complete-v2...");
            const notifyRes = await fetch(`${supabaseUrl}/functions/v1/send-signed-notification`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ document_id: doc.id })
            });
            console.log("Notification Trigger Status:", notifyRes.status);
            if (!notifyRes.ok) {
                console.error("Notification Trigger Failed:", await notifyRes.text());
            } else {
                console.log("Notification Trigger Success");
            }
        } catch (e) {
            console.error("Trigger notification exception:", e);
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
                otp_verified: otpVerified
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
        console.error('Sign-complete-v2 error details:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || 'Error desconocido al procesar la firma'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
})
