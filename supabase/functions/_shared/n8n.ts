export const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL');

export async function triggerN8n(event: string, data: any) {
    if (!N8N_WEBHOOK_URL) {
        console.warn(`N8N_WEBHOOK_URL not set. Skipping n8n event: ${event}`);
        return false;
    }

    try {
        console.log(`Triggering n8n event: ${event}`);
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event,
                data,
                timestamp: new Date().toISOString(),
            }),
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
