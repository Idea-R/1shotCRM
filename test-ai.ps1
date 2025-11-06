$body = @{
    message = "Who are my hot leads?"
    messages = @()
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/ai-assistant" -Method Post -Body $body -ContentType "application/json"
$response | ConvertTo-Json -Depth 10

