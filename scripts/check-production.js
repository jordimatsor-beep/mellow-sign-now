import fs from 'node:fs';
import path from 'node:path';

const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_STRIPE_PUBLIC_KEY',
    // 'VITE_SITE_URL' // Optional usually
];

console.log("🔍 Checking Environment Variables for Production...");

let envContent = '';
// Check .env
if (fs.existsSync('.env')) {
    envContent += fs.readFileSync('.env', 'utf-8');
}
// Check .env.local
if (fs.existsSync('.env.local')) {
    envContent += '\n' + fs.readFileSync('.env.local', 'utf-8');
}

const missing = [];
const found = [];

requiredVars.forEach(key => {
    if (envContent.includes(key + '=')) {
        found.push(key);
    } else {
        missing.push(key);
    }
});

console.log("\n✅ Found:");
found.forEach(k => console.log(`   - ${k}`));

if (missing.length > 0) {
    console.log("\n❌ Missing:");
    missing.forEach(k => console.log(`   - ${k}`));
    console.log("\n⚠️  Please ensure these are set in your deployment platform (Vercel/Netlify) or .env file.");
    process.exit(1);
} else {
    console.log("\n✨ All required variables seem to be present.");
    process.exit(0);
}
