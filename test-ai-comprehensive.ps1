# Test 1: Hot Leads
Write-Host "=== Test 1: Hot Leads ===" -ForegroundColor Green
$body1 = @{message="Who are my hot leads?";messages=@()} | ConvertTo-Json
$r1 = Invoke-RestMethod -Uri "http://localhost:3000/api/ai-assistant" -Method Post -Body $body1 -ContentType "application/json"
Write-Host $r1.response
Write-Host ""

# Test 2: All Contacts
Write-Host "=== Test 2: All Contacts ===" -ForegroundColor Green
$body2 = @{message="Show me all contacts with their email addresses";messages=@()} | ConvertTo-Json
$r2 = Invoke-RestMethod -Uri "http://localhost:3000/api/ai-assistant" -Method Post -Body $body2 -ContentType "application/json"
Write-Host $r2.response
Write-Host ""

# Test 3: Lost Deals
Write-Host "=== Test 3: Lost Deals ===" -ForegroundColor Green
$body3 = @{message="Who did we lose?";messages=@()} | ConvertTo-Json
$r3 = Invoke-RestMethod -Uri "http://localhost:3000/api/ai-assistant" -Method Post -Body $body3 -ContentType "application/json"
Write-Host $r3.response
Write-Host ""

# Test 4: Contact Phone Number
Write-Host "=== Test 4: Contact Phone Number ===" -ForegroundColor Green
$body4 = @{message="What's John Smith's phone number?";messages=@()} | ConvertTo-Json
$r4 = Invoke-RestMethod -Uri "http://localhost:3000/api/ai-assistant" -Method Post -Body $body4 -ContentType "application/json"
Write-Host $r4.response

