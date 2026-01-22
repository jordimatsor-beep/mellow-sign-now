import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from "https://esm.sh/zod@3.22.4"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MessageSchema = z.object({
    role: z.enum(["clara", "user", "model", "assistant"]),
    content: z.string().min(1).max(2000),
    id: z.string().optional()
});

const RequestSchema = z.object({
    messages: z.array(MessageSchema).min(1).max(20),
    documentId: z.string().optional()
});

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not set');
        }

        // 1. Auth & Supabase Client
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 2. Parse Request
        const body = await req.json();
        const parseResult = RequestSchema.safeParse(body);

        if (!parseResult.success) {
            return new Response(
                JSON.stringify({ error: 'Invalid request format', details: parseResult.error }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const { messages, documentId } = parseResult.data;
        const lastUserMessage = messages[messages.length - 1];

        // 3. Fetch Context (Fiscal Data)
        // Fetch User Profile
        const { data: userProfile, error: profileError } = await supabaseClient
            .from('users')
            .select('name, company_name, tax_id, legal_address, legal_type')
            .eq('id', user.id)
            .single();

        if (profileError) console.error("Error fetching user profile:", profileError);

        // Fallback for address
        const userAddress = userProfile?.legal_address ||
            (userProfile?.address ? `${userProfile.address}, ${userProfile.zip_code || ''} ${userProfile.city || ''} ${userProfile.country || ''}` : null);

        let documentData = null;
        if (documentId) {
            const { data: doc, error: docError } = await supabaseClient
                .from('documents')
                .select('signer_name, signer_tax_id, signer_address, signer_company_name')
                .eq('id', documentId)
                .single();

            if (docError) console.error("Error fetching document:", docError);
            else documentData = doc;
        }

        // 4. Guardrails (Strict Contract Mode)
        const isContractIntent = /contrato|acuerdo|cláusula|reunidos/i.test(lastUserMessage.content);

        if (isContractIntent) {
            // Check User Fiscal Data
            const missingUserFields = [];
            if (!userProfile?.tax_id) missingUserFields.push("NIF/CIF (Emisor)");
            if (!userAddress) missingUserFields.push("Domicilio Legal (Emisor)");

            // Check Document/Signer Data (if document context exists)
            const missingSignerFields = [];
            if (documentId && documentData) {
                if (!documentData.signer_tax_id) missingSignerFields.push("NIF/CIF (Receptor/Firmante)");
                if (!documentData.signer_address) missingSignerFields.push("Domicilio (Receptor/Firmante)");
            }

            if (missingUserFields.length > 0 || missingSignerFields.length > 0) {
                const errorMsg = `Para generar un contrato válido, faltan datos fiscales obligatorios:\n` +
                    (missingUserFields.length ? `• Tu Perfil: ${missingUserFields.join(", ")}\n` : "") +
                    (missingSignerFields.length ? `• Firmante: ${missingSignerFields.join(", ")}\n` : "") +
                    `\nPor favor, completa estos datos en tu perfil o en la ficha del documento.`;

                return new Response(JSON.stringify({ role: 'clara', content: errorMsg }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
        }

        // 5. Construct System Prompt
        const currentDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        let systemPrompt = `You are Clara, an expert legal AI assistant for 'FirmaClara'.
Current Date: ${currentDate}.
Your goal is to draft legally binding contracts under Spanish Law.

STRICT INSTRUCTIONS FOR CONTRACTS:
1. Always start with a formal header: "REUNIDOS".
2. You MUST use the provided fiscal data exactly. Do not invent data.
3. If data is provided, generate the "REUNIDOS" section as follows:
   "De una parte, [User Name/Company] con NIF [User Tax ID] y domicilio en [User Address]..."
   "Y de otra, [Signer Name/Company] con NIF [Signer Tax ID] y domicilio en [Signer Address]..."

CONTEXT DATA:
[ISSUER/USER]
Name: ${userProfile?.company_name || userProfile?.name || "Usuario"}
Tax ID: ${userProfile?.tax_id || "PENDING"}
Address: ${userAddress || "PENDING"}

`
        if (documentData) {
            systemPrompt += `[RECEIVER/SIGNER]
Name: ${documentData.signer_company_name || documentData.signer_name || "Firmante"}
Tax ID: ${documentData.signer_tax_id || "PENDING"}
Address: ${documentData.signer_address || "PENDING"}
`;
        }

        systemPrompt += `\nMaintain a professional, formal tone. Answer in Markdown.`;

        // 6. Call Gemini API
        const geminiMessages = [
            { role: "user", parts: [{ text: systemPrompt }] }, // System instruction as first user message or proper system instruction if supported. Gemini 1.5 supports system_instruction.
            ...messages.map(m => ({
                role: m.role === 'clara' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }))
        ];

        // Ensure alternating roles (User starts) - handled by simple mapping above, but robust logic avoids dupes.
        // Direct API call
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: geminiMessages,
                generationConfig: {
                    temperature: 0.3, // Low temperature for legal precision
                    maxOutputTokens: 2000,
                },
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Gemini API Error:", errText);
            throw new Error(`Gemini API Error: ${response.status}`);
        }

        const data = await response.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Lo siento, no pude generar una respuesta legal válida.";

        return new Response(
            JSON.stringify({ role: 'clara', content: generatedText }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: unknown) {
        console.error('Error:', error)
        const message = error instanceof Error ? error.message : 'Unknown error'
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
