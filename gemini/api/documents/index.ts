import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { calculateSHA256 } from '../../lib/crypto';
import { v4 as uuidv4 } from 'uuid'; // We might need to install uuid or just rely on database generation, but for storage path we need an ID or name.

// Helper to handle CORS if needed, though vercel.json handles it mostly.
// For this implementation, we focus on the logic.

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // --- GET: List Documents ---
    if (req.method === 'GET') {
        try {
            // Mock User ID (As requested, or from query/header)
            const userId = '00000000-0000-0000-0000-000000000000'; // Same mock user

            const { data: documents, error } = await supabase
                .from('documents')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return res.status(200).json(documents);
        } catch (error: any) {
            return res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
        }
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { title, file, signer_email, signer_name, custom_message, signature_type = 'full', expires_in_days = 7 } = req.body;

        // 1. Validation
        if (!title || !file || !signer_email || !signer_name) {
            return res.status(400).json({ error: 'Missing required fields: title, file, signer_email, signer_name' });
        }

        // 2. Decode Base64 File
        const fileBuffer = Buffer.from(file, 'base64');

        // 3. Calculate SHA-256 Hash
        const fileHash = calculateSHA256(fileBuffer);

        // 4. Mock User ID (As requested)
        // In production, we would extract this from the auth token
        const userId = '00000000-0000-0000-0000-000000000000'; // Placeholder UUID

        // Generate a temporary ID or use a predictable name? 
        // Best practice: insert into DB first to get ID, OR generate UUID here. 
        // Since we need to upload to storage with a path, let's generate a UUID or let Supabase handle it?
        // We can't let Supabase handle it if we want to use the ID in the Storage path BEFORE DB insert (unless we do it in reverse).
        // Let's generate a UUID here for the storage path.
        // Note: 'uuid' package might not be installed. I'll check package.json or use a simple random string for now to avoid dependency error if I can't install. 
        // Actually, I can use crypto.randomUUID() in Node 19+, or install uuid. 
        // I'll assume Node environment has crypto.randomUUID which is standard since v15.6.0.
        const documentId = crypto.randomUUID();

        // 5. Upload to Supabase Storage
        const fileName = `${userId}/${documentId}.pdf`;
        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, fileBuffer, {
                contentType: 'application/pdf',
                upsert: false // Prevent overwriting existing files logic if UUID collision (unlikely)
            });

        if (uploadError) {
            console.error('Storage Upload Error:', uploadError);
            return res.status(500).json({ error: 'Failed to upload file to storage', details: uploadError.message });
        }

        // Get public URL? documents bucket is private. We store the path or signed URL generator approach.
        // The Schema says `file_url TEXT`. Usually this is the path or a permanent URL.
        // Since it's private, we likely store the path and generate signed URLs on retrieval. 
        // PRD example response showed "file_url": "https://...", but that might be signed.
        // I'll store the path or the full storage URL (folder path).
        // Let's store the storage path: `documents/${fileName}` or just `fileName`. 
        // The guide says: `documents/{user_id}/{document_id}.pdf`. 
        const storagePath = fileName;

        // 6. DB Insertion
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (expires_in_days || 7));

        const { data: document, error: dbError } = await supabase
            .from('documents')
            .insert({
                id: documentId, // Force the ID we generated
                user_id: userId,
                title,
                file_url: storagePath,
                file_hash: fileHash,
                signer_email,
                signer_name,
                custom_message,
                signature_type,
                status: 'draft',
                expires_at: expiresAt.toISOString(),
            })
            .select()
            .single();

        if (dbError) {
            // Cleanup storage if DB fails? (Optional but good practice)
            await supabase.storage.from('documents').remove([fileName]);

            console.error('DB Insert Error:', dbError);
            return res.status(500).json({ error: 'Failed to create document record', details: dbError.message });
        }

        // 7. Success Response
        return res.status(201).json({
            success: true,
            document: document
        });

    } catch (error: any) {
        console.error('Handler Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
