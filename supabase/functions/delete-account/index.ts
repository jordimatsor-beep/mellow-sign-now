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

        // 3. Delete the user from Auth (This cascades to public.users usually if configured, but we want to be sure)
        // Note: Deleting from Auth usually requires handling database cleanup via Triggers or manual deletion if ON DELETE CASCADE is not set everywhere.
        // Assuming the database has Foreign Keys with ON DELETE CASCADE or RLS policies handling orphaned rows.
        // Ideally, we should delete DB data first to be clean, or rely on Postgres constraints.

        // Manual cleanup of key data just in case constraint cascading is partial
        // (Optional: if you have ON DELETE CASCADE on user_id fkey, this happens automatically)
        // await supabaseAdmin.from('documents').delete().eq('user_id', reqUserId) 
        // ...

        // Perform Auth Deletion
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
