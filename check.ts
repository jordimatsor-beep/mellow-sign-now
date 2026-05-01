import { createClient } from 'npm:@supabase/supabase-js';
import * as dotenv from 'npm:dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('user_credit_purchases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
    
    console.log("Purchases:", data);
    console.log("Error:", error);
}

check();
