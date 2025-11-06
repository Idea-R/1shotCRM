# Test AI Assistant
Write-Host "=== Testing AI Assistant ===" -ForegroundColor Green
$body = @{message="Who are my hot leads?";messages=@()} | ConvertTo-Json
try {
    $r = Invoke-RestMethod -Uri "http://localhost:3000/api/ai-assistant" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Success: $($r.success)" -ForegroundColor Green
    Write-Host "Response: $($r.response)" -ForegroundColor Yellow
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
}

