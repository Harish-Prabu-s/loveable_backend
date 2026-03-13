New-NetFirewallRule -DisplayName "Allow Django Dev Server" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Allow Metro Bundler" -Direction Inbound -LocalPort 8081,8082 -Protocol TCP -Action Allow
Write-Host "Firewall rules for Django (8000) and Metro (8081, 8082) added. Please run Expo again."
Pause
