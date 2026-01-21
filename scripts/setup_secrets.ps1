$secrets = @("GEMINI_API_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET")

Write-Host "🔒 FirmaClara Secret Setup Helper" -ForegroundColor Cyan
Write-Host "This script will help you set the required secrets for your Supabase Edge Functions."
Write-Host ""

foreach ($secret in $secrets) {
    $value = Read-Host "Enter value for $secret (Leave empty to skip)"
    if ($value) {
        Write-Host "Setting $secret..." -ForegroundColor Yellow
        supabase secrets set "$secret=$value"
    }
}

Write-Host "✅ Secrets configuration finished." -ForegroundColor Green
Write-Host "You can now run 'scripts/deploy_functions.ps1' to deploy your functions." -ForegroundColor Cyan
