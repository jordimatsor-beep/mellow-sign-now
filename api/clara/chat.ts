import type { VercelRequest, VercelResponse } from '@vercel/node';
// import { Anthropic } from '@anthropic-ai/sdk'; // Uncomment when using real API

// Mock Smart Logic to simulate a legal assistant
const MOCK_RESPONSES = [
    {
        keywords: ['contrato', 'web', 'diseño'],
        response: "Entendido. Para redactar un contrato de diseño web, necesito que me especifiques:\n\n1. ¿Cuál es el alcance del proyecto (páginas, funcionalidades)?\n2. ¿El precio es cerrado o por horas?\n3. ¿Qué penalizaciones por retraso quieres incluir?",
    },
    {
        keywords: ['precio', 'euros', '€', 'coste'],
        response: "Perfecto, he anotado el precio. ¿Hay algún anticipo o pago inicial? Es recomendable pedir un 50% por adelantado en este tipo de servicios.",
    },
    {
        keywords: ['hola', 'buenos días', 'ayuda'],
        response: "¡Hola! Soy Clara. Puedo ayudarte a redactar contratos de servicios, alquiler, confidencialidad, etc. ¿Qué necesitas hoy?",
    },
    {
        keywords: ['gracias', 'ok', 'vale'],
        response: "A ti. ¿Necesitas que redacte ya el borrador completo o quieres añadir alguna cláusula más?",
    }
];

const DEFAULT_RESPONSE = "Entiendo. Por favor, dame más detalles para poder ayudarte con la redacción legal. Recuerda que no soy abogada, pero puedo prepararte un borrador sólido.";

const LEGAL_DISCLAIMER = "\n\n⚠️ *Nota: Esta respuesta es generada por IA y no constituye asesoramiento legal profesional.*";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid messages format' });
    }

    try {
        // Check for API Keys
        const anthropicKey = process.env.anthropic_api_key || process.env.ANTHROPIC_API_KEY;

        // Default to Mock execution unless key is present is a valid strategy for dev/test without cost
        // Or if previous tool output said "Recomendado para dev: Mock Inteligente"
        // I will implement the Mock primarily as per instructions.

        if (anthropicKey && process.env.USE_REAL_AI === 'true') {
            // Real implementation placeholder
            // const anthropic = new Anthropic({ apiKey: anthropicKey });
            // const completion = await anthropic.messages.create({ ... });
            // return res.json({ role: 'assistant', content: completion.content[0].text + LEGAL_DISCLAIMER });
        }

        // --- SMART MOCK IMPLEMENTATION ---

        // Simulate thinking delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        const lastMessage = messages[messages.length - 1].content.toLowerCase();

        let replyContent = DEFAULT_RESPONSE;

        // Simple keyword matching logic
        for (const item of MOCK_RESPONSES) {
            if (item.keywords.some(k => lastMessage.includes(k))) {
                replyContent = item.response;
                break;
            }
        }

        // Basic State Machine simulation for "Contract Generation" context
        // If the conversation is long enough and mentions "generar" or "listo", we simulate generation
        if (lastMessage.includes('generar') || lastMessage.includes('redactar') || messages.length > 4) {
            replyContent = "He preparado un borrador basado en tus indicaciones. Puedes revisarlo a continuación.";
            // We could append a special flag to trigger document UI in frontend
        }

        return res.status(200).json({
            role: 'assistant', // mapped to 'clara' in frontend
            content: replyContent + LEGAL_DISCLAIMER
        });

    } catch (error: any) {
        console.error('Clara Chat Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
