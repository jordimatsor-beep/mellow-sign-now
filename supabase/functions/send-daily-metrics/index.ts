import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req: Request) => {
    try {
        if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error("Missing configuration")
        }

        // Only allow POST (Cron usually sends POST)
        if (req.method !== 'POST') {
            // throw new Error("Method not allowed") 
            // Supabase Cron sends POST. Browser/Test might send GET.
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Date Range: Yesterday (Madrid Time roughly). 
        // Simplest: Last 24 hours from NOW.
        // Better: Yesterday calendar day.

        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        // Start of Yesterday (00:00:00)
        yesterday.setHours(0, 0, 0, 0);
        const startIso = yesterday.toISOString();

        // End of Yesterday (23:59:59)
        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999);
        const endIso = endOfYesterday.toISOString();

        // 1. New Users (Auth)
        // Note: 'users' table in public is what we use, mirrored from auth.
        const { count: newUsers, error: usersError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startIso)
            .lte('created_at', endIso)

        // 2. Documents Sent
        const { count: docsSent, error: docsError } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startIso)
            .lte('created_at', endIso)

        // 3. Documents Signed
        const { count: docsSigned, error: signedError } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'signed')
            .gte('signed_at', startIso)
            .lte('signed_at', endIso)

        // 4. Credits Sold
        // credit_packs created_at
        const { data: creditsData, error: creditsError } = await supabase
            .from('credit_packs')
            .select('credits_total, price_paid')
            .gte('created_at', startIso)
            .lte('created_at', endIso)

        let totalCreditsSold = 0;
        let totalRevenue = 0;
        let packsSold = 0;

        if (creditsData) {
            packsSold = creditsData.length;
            creditsData.forEach((p: { credits_total?: number; price_paid?: number }) => {
                totalCreditsSold += (p.credits_total || 0);
                totalRevenue += (p.price_paid || 0);
            })
        }

        // 5. Total Users (Global)
        const { count: totalUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })

        // Format Email
        const dateStr = yesterday.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: sans-serif; background: #f4f4f4; padding: 20px; }
                .container { background: #fff; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #333; font-size: 24px; border-bottom: 2px solid #eee; padding-bottom: 15px; }
                .metric { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f9f9f9; }
                .metric .label { color: #666; font-weight: 500; }
                .metric .value { color: #000; font-weight: bold; font-size: 16px; }
                .highlight { color: #2563eb; }
                .footer { margin-top: 30px; font-size: 12px; color: #999; text-align: center; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📊 Resumen Diario: FirmaClara</h1>
                <p>Métricas del día <strong>${dateStr}</strong></p>

                <div class="metric">
                    <span class="label">Nuevos Usuarios</span>
                    <span class="value highlight">+${newUsers || 0}</span>
                </div>
                <div class="metric">
                    <span class="label">Documentos Enviados</span>
                    <span class="value">${docsSent || 0}</span>
                </div>
                <div class="metric">
                    <span class="label">Documentos Firmados</span>
                    <span class="value highlight">${docsSigned || 0}</span>
                </div>
                <div class="metric">
                    <span class="label">Ventas (Packs De Créditos)</span>
                    <span class="value">${packsSold || 0}</span>
                </div>
                <div class="metric">
                    <span class="label">Ingresos Estimados</span>
                    <span class="value">${totalRevenue} €</span>
                </div>

                <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #eee;">
                    <div class="metric">
                        <span class="label">Usuarios Totales (Acumulado)</span>
                        <span class="value">${totalUsers || 0}</span>
                    </div>
                </div>

                <div class="footer">
                    Generado automáticamente por FirmaClara Bot.<br>
                    Server Time: ${new Date().toISOString()}
                </div>
            </div>
        </body>
        </html>
        `;

        // Send Email
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'FirmaClara Bot <noreply@firmaclara.es>',
                to: ['jormattor@gmail.com', 'jordimatsor@gmail.com'],
                subject: `📊 Metricas Diarias - ${dateStr}`,
                html: html
            })
        })

        if (!res.ok) {
            const err = await res.text();
            throw new Error("Resend API Error: " + err);
        }

        return new Response(JSON.stringify({ success: true, date: dateStr }), {
            headers: { "Content-Type": "application/json" }
        })

    } catch (e: any) {
        console.error(e)
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        })
    }
})
