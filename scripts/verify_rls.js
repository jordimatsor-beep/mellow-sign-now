const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read env to get URL and Key
// Trying .env.local first
const envPath = path.join(__dirname, '..', '.env.local');
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
    // Try .env
    envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
}

const getEnv = (key) => {
    const match = envContent.match(new RegExp(`${key}=["']?([^"'\n]+)`));
    return match ? match[1] : null;
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_KEY = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_PUBLISHABLE_KEY');

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase URL or Key in .env/.env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runVerification() {
    console.log('Running Hardening Verification...');

    // Test 1: Public Insert into Signatures (Should FAIL)
    console.log('\n[TEST 1] Public Insert to Signatures...');
    const { error: sigError } = await supabase.from('signatures').insert({
        document_id: '00000000-0000-0000-0000-000000000000',
        signer_email: 'hacker@test.com',
        hash_sha256: 'fake'
    });

    if (sigError) {
        if (sigError.code === '42501' || sigError.message.includes('violate row-level security')) {
            console.log('✅ PASS: Insert blocked (RLS active).');
        } else {
            console.log(`⚠️  Received error, maybe pass? Code: ${sigError.code}, Msg: ${sigError.message}`);
        }
    } else {
        console.error('❌ FAIL: Insert succeeded! RLS is NOT enforcing readonly.');
    }

    // Test 2: Public Insert into Event Logs (Should FAIL)
    console.log('\n[TEST 2] Public Insert to Event Logs...');
    const { error: logError } = await supabase.from('event_logs').insert({
        document_id: '00000000-0000-0000-0000-000000000000',
        event_type: 'hacked'
    });

    if (logError) {
        if (logError.code === '42501' || logError.message.includes('violate row-level security')) {
            console.log('✅ PASS: Insert blocked (RLS active).');
        } else {
            console.log(`⚠️  Received error, maybe pass? Code: ${logError.code}, Msg: ${logError.message}`);
        }
    } else {
        console.error('❌ FAIL: Insert succeeded! RLS is NOT enforcing readonly.');
    }

    // Test 3: RPC submit_signature (Should be CALLABLE but fail logic)
    console.log('\n[TEST 3] Calling submit_signature RPC...');
    const { data, error: rpcError } = await supabase.rpc('submit_signature', {
        p_sign_token: 'invalid_token_123',
        p_signer_email: 'test@test.com',
        p_signer_name: 'Tester',
        p_ip_address: '1.2.3.4',
        p_user_agent: 'TestAgent',
        p_signature_image_url: 'http://test.com/sig.png',
        p_hash_sha256: 'abc'
    });

    if (rpcError) {
        // We expect "Invalid token" which comes from INSIDE the function.
        // This proves we had permission to CALL it.
        if (rpcError.message.includes('Invalid token')) {
            console.log('✅ PASS: RPC executed and returned logic error (Permission Granted).');
        } else {
            console.log(`❌ FAIL/WARNING: RPC Error: ${rpcError.message} (Check if Permission Denied?)`);
        }
    } else {
        console.log('⚠️  RPC Succeeded? Should have failed on token.');
        console.log(data);
    }

    console.log('\nVerification Finiished.');
}

runVerification();
