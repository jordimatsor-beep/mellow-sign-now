import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Vary': 'Origin',
    };
}

serve(async (req) => {
    const corsHeaders = getCorsHeaders(req);

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Create Supabase Client with Admin Rights (Service Role)
        // REQUIRED to delete users from Auth
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceRoleKey) {
            throw new Error('Server configuration error: Missing Supabase credentials');
        }

        // 1. Create Supabase Client with Admin Rights (Service Role)
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        // 2. Verify the user (User must be logged in to delete THEMSELVES)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing Authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const reqUserId = user.id
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

        // 3. Notify signers of any pending documents before deletion
        if (RESEND_API_KEY) {
            const { data: pendingDocs } = await supabaseAdmin
                .from('documents')
                .select('id, title, signer_email, signer_name')
                .eq('user_id', reqUserId)
                .in('status', ['sent', 'viewed'])

            if (pendingDocs && pendingDocs.length > 0) {
                await Promise.allSettled(
                    pendingDocs.map((doc) =>
                        fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${RESEND_API_KEY}`
                            },
                            body: JSON.stringify({
                                from: 'FirmaClara <noreply@firmaclara.es>',
                                to: [doc.signer_email],
                                subject: `Documento cancelado: "${doc.title}"`,
                                html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px"><h2>Documento cancelado</h2><p>Hola <strong>${doc.signer_name || 'firmante'}</strong>,</p><p>El documento <strong>"${doc.title}"</strong> que tenías pendiente de firma ha sido cancelado porque el emisor ha eliminado su cuenta.</p><p>No es necesario que realices ninguna acción.</p><p style="color:#6b7280;font-size:12px">— FirmaClara</p></div>`
                            })
                        })
                    )
                )
            }
        }

        // 4. Perform Auth Deletion (cascades to public.users via ON DELETE CASCADE)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
            reqUserId
        )

        if (deleteError) {
            throw deleteError
        }

        return new Response(
            JSON.stringify({ message: 'Account deleted successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
