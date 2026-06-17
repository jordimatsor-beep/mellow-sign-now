$functions = @("clara-chat", "create-checkout-session", "stripe-webhook", "get-credits", "create-plan-checkout", "stripe-portal", "send-invite-v2")

Write-Host "🚀 FirmaClara Deployment Helper" -ForegroundColor Cyan
Write-Host "Deploying Edge Functions..."
Write-Host ""

foreach ($func in $functions) {
    Write-Host "Deploying $func..." -ForegroundColor Yellow
    # --use-api evita Docker; --project-ref fija el proyecto (historial desincronizado).
    supabase functions deploy $func --no-verify-jwt --use-api
}

Write-Host "✅ All functions deployed successfully!" -ForegroundColor Green
