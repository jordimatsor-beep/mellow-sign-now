export const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL');
const N8N_WEBHOOK_SECRET = Deno.env.get('N8N_WEBHOOK_SECRET');

/**
 * Signs the raw JSON body with HMAC-SHA256 so the n8n workflow can verify
 * the request really comes from FirmaClara (header X-FirmaClara-Signature).
 * Configure N8N_WEBHOOK_SECRET in Supabase secrets and verify it in n8n.
 */
async function hmacSignature(body: string, secret: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
    return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function triggerN8n(event: string, data: any) {
    if (!N8N_WEBHOOK_URL) {
        console.warn(`N8N_WEBHOOK_URL not set. Skipping n8n event: ${event}`);
        return false;
    }

    try {
        console.log(`Triggering n8n event: ${event}`);
        const body = JSON.stringify({
            event,
            data,
            timestamp: new Date().toISOString(),
        });

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-FirmaClara-Event': event,
        };
        if (N8N_WEBHOOK_SECRET) {
            headers['X-FirmaClara-Signature'] = await hmacSignature(body, N8N_WEBHOOK_SECRET);
        } else {
            console.warn('N8N_WEBHOOK_SECRET not set — webhook sent unsigned');
        }

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers,
            body,
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`n8n webhook failed: ${response.status} ${response.statusText}`, text);
            return false;
        }

        return true;
    } catch (error) {
        console.error(`Error triggering n8n webhook:`, error);
        return false;
    }
}
