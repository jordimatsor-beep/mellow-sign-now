import { supabase } from "@/lib/supabase";
import type { Json } from "@/integrations/supabase/types";

/**
 * Logs an admin action to the event_logs table.
 * Call this from any admin panel action.
 */
export async function logAdminAction(
    eventType: string,
    eventData: Record<string, unknown>,
    documentId?: string | null
) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from("event_logs").insert({
            event_type: eventType,
            event_data: eventData as unknown as Json,
            user_id: user.id,
            document_id: documentId || null,
            user_agent: navigator.userAgent,
        });
    } catch (e) {
        console.error("Failed to log admin action:", e);
    }
}

