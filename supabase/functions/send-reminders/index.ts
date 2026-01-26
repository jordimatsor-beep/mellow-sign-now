import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

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

        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        if (!RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY')

        // 1. Get Pending Docs older than 24h
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data: pendingDocs, error: docError } = await supabase
            .from('documents')
            .select('id, title, signer_email, signer_name, sign_token, user_id, users(company_name, name)')
            .eq('status', 'pending')
            .lt('created_at', oneDayAgo);

        if (docError) throw docError;

        let sentCount = 0;

        for (const doc of pendingDocs || []) {
            // Check logs for recent reminder
            const { data: reminderLog } = await supabase
                .from('event_logs')
                .select('created_at')
                .eq('document_id', doc.id)
                .eq('event_type', 'reminder_sent')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            const lastSent = reminderLog?.created_at ? new Date(reminderLog.created_at) : null;
            const now = new Date();

            // Skip if reminded less than 48h ago
            if (lastSent && (now.getTime() - lastSent.getTime()) < 48 * 60 * 60 * 1000) {
                continue;
            }

            const senderName = doc.users?.company_name || doc.users?.name || 'FirmaClara';
            const signUrl = `${req.headers.get('origin') || 'https://firmaclara.com'}/sign/${doc.sign_token}`;

            const html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Recordatorio de Firma pendiente</h2>
                    <p>Hola ${doc.signer_name},</p>
                    <p>${senderName} está esperando tu firma en el documento <strong>"${doc.title}"</strong>.</p>
                    <p>Por favor, completa el proceso lo antes posible:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${signUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Firmar Documento Ahora</a>
                    </div>
                    <p style="font-size: 12px; color: #666;">Si ya has firmado, ignora este mensaje.</p>
                </div>
            `;

            // Send Email
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: 'FirmaClara <noreply@firmaclara.es>',
                    to: [doc.signer_email],
                    subject: `Recordatorio: Firma pendiente - ${doc.title}`,
                    html: html
                })
            });

            if (res.ok) {
                // Log Event
                await supabase.from('event_logs').insert({
                    user_id: doc.user_id,
                    document_id: doc.id,
                    event_type: 'reminder_sent',
                    event_data: { type: 'auto_email_48h' }
                });
                sentCount++;
            }
        }

        return new Response(
            JSON.stringify({ success: true, sent_count: sentCount }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: corsHeaders });
    }
})
