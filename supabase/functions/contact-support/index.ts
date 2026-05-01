import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        if (!RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY')

        const authHeader = req.headers.get('Authorization')
        const body = await req.json()
        const { action, email, message, subject, user_email, chat_id, content, sender } = body

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Helper to get authenticated user
        const supabaseUser = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader ?? '' } } }
        )

        // ── ACTION: open_chat ──────────────────────────────────────────────
        if (action === 'open_chat') {
            const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
            if (userError || !user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                    status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }

            // Create chat session
            const { data: chat, error: chatError } = await supabaseAdmin
                .from('support_chats')
                .insert({
                    user_id: user.id,
                    user_email: user.email ?? email ?? 'unknown',
                    subject: subject ?? 'Sin asunto',
                    status: 'open'
                })
                .select()
                .single()

            if (chatError) throw chatError

            // Insert first system message
            await supabaseAdmin.from('support_messages').insert({
                chat_id: chat.id,
                sender: 'admin',
                content: `Hola 👋 Has abierto un chat sobre: **${subject}**. Un agente de soporte te atenderá pronto.`
            })

            // Send notification email to admin
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: 'FirmaClara Support <noreply@firmaclara.es>',
                    to: ['jordi.mateu@operiatech.es'],
                    reply_to: user.email,
                    subject: `[Chat Soporte] ${subject ?? 'Nueva consulta'} — ${user.email}`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background: #7c3aed; padding: 24px; border-radius: 8px 8px 0 0;">
                                <h2 style="color: white; margin: 0;">💬 Nuevo chat de soporte abierto</h2>
                            </div>
                            <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
                                <p><strong>Usuario:</strong> ${user.email}</p>
                                <p><strong>Asunto:</strong> ${subject ?? 'Sin asunto'}</p>
                                <p><strong>Chat ID:</strong> <code>${chat.id}</code></p>
                                <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
                                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
                                <p style="color: #6b7280; font-size: 14px;">
                                    Accede al panel de administración de FirmaClara para responder al usuario en tiempo real.
                                </p>
                                <a href="https://firmaclara.es/shobdgohs/support?chatId=${chat.id}" style="display: inline-block; background: #7c3aed; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 8px;">
                                    Abrir Chat Privado →
                                </a>
                            </div>
                        </div>
                    `
                })
            })

            return new Response(JSON.stringify({ chat_id: chat.id }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // ── ACTION: send_message (admin only, uses service role) ───────────
        if (action === 'send_admin_message') {
            // Check admin auth
            const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
            if (userError || !user) throw new Error('Unauthorized')
            const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
            if (userData?.role !== 'admin' && userData?.role !== 'support') throw new Error('Forbidden')

            const { error } = await supabaseAdmin.from('support_messages').insert({
                chat_id: chat_id,
                sender: 'admin',
                content: content
            })
            if (error) throw error

            // Mark user_read = false (new admin message)
            await supabaseAdmin.from('support_chats')
                .update({ user_read: false, last_message_at: new Date().toISOString() })
                .eq('id', chat_id)

            return new Response(JSON.stringify({ ok: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // ── ACTION: close_chat ─────────────────────────────────────────────
        if (action === 'close_chat') {
            // Check auth
            const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
            if (userError || !user) throw new Error('Unauthorized')
            
            const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
            const isStaff = userData?.role === 'admin' || userData?.role === 'support'

            // Get chat data
            const { data: chatData, error: chatFetchError } = await supabaseAdmin.from('support_chats')
                .select('*')
                .eq('id', chat_id)
                .single()
            if (chatFetchError) throw chatFetchError

            // Verify permissions
            if (!isStaff && chatData.user_id !== user.id) {
                throw new Error('Forbidden')
            }

            const closedBy = isStaff ? 'admin' : 'user';

            // 1. Marcar como cerrado
            const { error: closeError } = await supabaseAdmin.from('support_chats')
                .update({ status: 'closed', closed_by: closedBy })
                .eq('id', chat_id)
            if (closeError) throw closeError

            // 2. Obtener todos los mensajes para el transcript
            const { data: messagesData, error: messagesError } = await supabaseAdmin
                .from('support_messages')
                .select('*')
                .eq('chat_id', chat_id)
                .order('created_at', { ascending: true })
            if (messagesError) throw messagesError

            // 3. Generar HTML del transcript
            const messagesHtml = messagesData.map(m => `
                <div style="margin-bottom: 12px; ${m.sender === 'admin' ? 'text-align: right;' : ''}">
                    <span style="font-size: 12px; color: #6b7280;">
                        <strong>${m.sender === 'admin' ? 'Soporte' : 'Usuario'}</strong> - ${new Date(m.created_at).toLocaleString('es-ES')}
                    </span>
                    <div style="
                        display: inline-block;
                        padding: 8px 12px;
                        border-radius: 8px;
                        max-width: 80%;
                        text-align: left;
                        ${m.sender === 'admin' ? 'background-color: #2563eb; color: white;' : 'background-color: #f3f4f6; color: #1f2937; border: 1px solid #e5e7eb;'}
                    ">
                        ${m.content}
                    </div>
                </div>
            `).join('');

            const emailHtml = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #374151;">
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px 8px 0 0; border-bottom: 2px solid #e5e7eb;">
                        <h2 style="margin: 0; color: #111827;">Transcripción del Chat</h2>
                        <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">Asunto: ${chatData.subject}</p>
                    </div>
                    <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                        ${messagesHtml}
                    </div>
                    <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 16px;">
                        Este chat ha sido cerrado. Si necesitas más ayuda, abre un nuevo chat de soporte.
                    </p>
                </div>
            `;

            // 4. Enviar email a ambos
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: 'FirmaClara Support <noreply@firmaclara.es>',
                    to: [chatData.user_email, 'jordi.mateu@operiatech.es'],
                    subject: `[Chat Cerrado] Transcripción: ${chatData.subject}`,
                    html: emailHtml
                })
            })

            return new Response(JSON.stringify({ ok: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // ── LEGACY: plain contact email (no action) ────────────────────────
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'FirmaClara Support <noreply@firmaclara.es>',
                to: ['jordi.mateu@operiatech.es'],
                reply_to: email,
                subject: `[Soporte] ${subject || 'Nueva consulta'} - ${user_email || email}`,
                html: `
                    <h3>Nueva consulta de soporte</h3>
                    <p><strong>Usuario:</strong> ${user_email || 'No registrado'} (${email})</p>
                    <p><strong>Mensaje:</strong></p>
                    <blockquote style="background: #f9f9f9; padding: 10px; border-left: 3px solid #ccc;">
                        ${message?.replace(/\n/g, '<br>')}
                    </blockquote>
                `
            })
        })
        const data = await res.json()
        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
