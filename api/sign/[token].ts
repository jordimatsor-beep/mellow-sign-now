import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { generateSignedPDF } from '../../lib/pdf';
import { calculateSHA256 } from '../../lib/crypto';
import { requestTSA } from '../../lib/tsa';
import { generateCertificate } from '../../lib/certificate';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { token } = req.query;

    if (!token || Array.isArray(token)) {
        return res.status(400).json({ error: 'Invalid token' });
    }

    // Common: Fetch Document by Token
    // We join with users to get sender name.
    const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select(`
      *,
      user:users ( name, email )
    `)
        .eq('sign_token', token)
        .single();

    if (fetchError || !document) {
        return res.status(404).json({ error: 'Document not found' });
    }

    // Validation: Status and Expiration
    if (document.status !== 'sent' && document.status !== 'viewed') {
        return res.status(400).json({ error: 'Document cannot be signed (invalid status)', status: document.status });
    }

    const expiresAt = new Date(document.expires_at);
    if (expiresAt < new Date()) {
        return res.status(410).json({ error: 'Document expired' });
    }

    // --- GET: Return Info for Signing Page ---
    if (req.method === 'GET') {
        // If first view, update status to 'viewed'
        if (document.status === 'sent') {
            await supabase.from('documents').update({ status: 'viewed', viewed_at: new Date().toISOString() }).eq('id', document.id);
        }

        // Generate Signed URL for viewing (valid for 1 hour)
        // document.file_url is the path in the bucket (e.g. "userId/docId.pdf")
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('documents')
            .createSignedUrl(document.file_url, 3600);

        // Return safe data
        return res.status(200).json({
            title: document.title,
            sender_name: document.user?.name || 'Usuario desconocido',
            signer_name: document.signer_name,
            signer_email: document.signer_email,
            file_url: signedUrlData?.signedUrl || document.file_url, // Fallback (though probably won't work if private)
            status: document.status
        });
    }

    // --- POST: Execute Signing ---
    if (req.method === 'POST') {
        try {
            const { signer_name, signature_image } = req.body;
            const ip_address = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
            const user_agent = req.headers['user-agent'] || 'unknown';
            const timestamp = new Date().toISOString();

            // 1. Download Original PDF
            const { data: fileData, error: downloadError } = await supabase.storage
                .from('documents')
                .download(document.file_url);

            if (downloadError || !fileData) {
                throw new Error('Failed to download original document');
            }

            const originalBuffer = Buffer.from(await fileData.arrayBuffer());
            const originalHash = calculateSHA256(originalBuffer);

            // Verify integrity (optional)
            if (document.file_hash && document.file_hash !== originalHash) {
                console.warn('Original file hash mismatch! Proceeding but flagging.');
            }

            // 2. Generate Signed PDF (Visual)
            const signedPdfBuffer = await generateSignedPDF(originalBuffer, {
                signerName: signer_name || document.signer_name,
                signerEmail: document.signer_email,
                signedAt: timestamp,
                signatureImage: signature_image
            });

            // 3. Calculate New Hash (Critical for Evidence)
            const signedHash = calculateSHA256(signedPdfBuffer);

            // 4. Request TSA Timestamp (Proof of existence)
            const tsaResult = await requestTSA(signedHash);

            // 5. Generate Certificate of Evidence
            // Prepare events for timeline
            const events = [
                { date: document.created_at, description: 'Documento creado' },
                { date: document.sent_at || document.created_at, description: 'Enviado a firmante' },
                ...(document.viewed_at ? [{ date: document.viewed_at, description: 'Visto por firmante' }] : []),
                { date: timestamp, description: 'Firmado con validez jurídica' } // Updated description
            ];

            const certificateBuffer = await generateCertificate({
                documentTitle: document.title,
                documentId: document.id,
                senderName: document.user?.name || 'Emisor',
                senderEmail: document.user?.email || 'N/A',
                signerName: signer_name || document.signer_name,
                signerEmail: document.signer_email,
                signerIp: Array.isArray(ip_address) ? ip_address[0] : ip_address,
                signerUserAgent: Array.isArray(user_agent) ? user_agent[0] : user_agent,
                originalHash: originalHash,
                signedHash: signedHash,
                tsaTimestamp: tsaResult.timestamp,
                tsaResponse: tsaResult.tsr,
                events: events
            });

            // 6. Upload Files (Signed PDF + Certificate)
            const signedPath = `${document.id}_signed.pdf`;
            const certPath = `${document.id}_certificate.pdf`;

            const [signedUpload, certUpload] = await Promise.all([
                supabase.storage.from('signed').upload(signedPath, signedPdfBuffer, { upsert: true, contentType: 'application/pdf' }),
                supabase.storage.from('certificates').upload(certPath, certificateBuffer, { upsert: true, contentType: 'application/pdf' })
            ]);

            if (signedUpload.error) throw new Error('Error uploading signed PDF: ' + signedUpload.error.message);
            if (certUpload.error) throw new Error('Error uploading certificate: ' + certUpload.error.message);

            // 7. Update Database (Atomic-ish)

            // Update Document Status
            const { error: updateError } = await supabase
                .from('documents')
                .update({
                    status: 'signed',
                    signed_at: timestamp,
                    signed_file_url: signedPath,
                    certificate_url: certPath
                })
                .eq('id', document.id);

            if (updateError) throw updateError;

            // Create Signature Record (Full Evidence)
            const { error: signError } = await supabase
                .from('signatures')
                .insert({
                    document_id: document.id,
                    signer_name: signer_name || document.signer_name,
                    signer_email: document.signer_email,
                    ip_address: Array.isArray(ip_address) ? ip_address[0] : ip_address,
                    user_agent: Array.isArray(user_agent) ? user_agent[0] : user_agent,
                    signature_image_url: null, // Stored in PDF, explicit image storage optional
                    hash_sha256: signedHash,
                    tsa_request: null, // Optional to store
                    tsa_response: Buffer.from(tsaResult.tsr, 'base64'), // Storing as bytea if column allows, or simplify
                    tsa_timestamp: tsaResult.timestamp,
                    signed_at: timestamp,
                    acceptance_text: 'He leído y acepto el contenido de este documento'
                });

            if (signError) {
                console.error('Signature insert error:', signError);
            }

            return res.status(200).json({
                success: true,
                signed_at: timestamp,
                ids: { document: document.id }
            });

        } catch (error: any) {
            console.error('Signing Error:', error);
            return res.status(500).json({ error: 'Failed to sign document', details: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
