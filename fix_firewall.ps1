New-NetFirewallRule -DisplayName "Allow Django Dev Server" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
Write-Host "Firewall rule added. Please try the app again."
Pause
