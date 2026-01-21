$functions = @("clara-chat", "create-checkout-session", "stripe-webhook", "get-credits")

Write-Host "🚀 FirmaClara Deployment Helper" -ForegroundColor Cyan
Write-Host "Deploying Edge Functions..."
Write-Host ""

foreach ($func in $functions) {
    Write-Host "Deploying $func..." -ForegroundColor Yellow
    supabase functions deploy $func --no-verify-jwt
}

Write-Host "✅ All functions deployed successfully!" -ForegroundColor Green
