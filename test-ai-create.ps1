# Test Creating a Contact via AI
Write-Host "=== Test: Create Contact via AI ===" -ForegroundColor Green
$body = @{message="Create a contact named Jane Doe with email jane.doe@example.com and phone 555-1234";messages=@()} | ConvertTo-Json
$r = Invoke-RestMethod -Uri "http://localhost:3000/api/ai-assistant" -Method Post -Body $body -ContentType "application/json"
Write-Host $r.response

