# Detect the primary Wi-Fi IPv4 address
$ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty IPAddress)

if (-not $ip) {
    # Fallback: find any 192.168.x.x or 10.x.x.x that isn't the 10.8 VPN
    $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match "^192\.168\." -or ($_.IPAddress -match "^10\." -and $_.IPAddress -notmatch "^10\.8\.") } | Select-Object -First 1 -ExpandProperty IPAddress)
}

if ($ip) {
    Write-Host "Detected Wi-Fi IP: $ip" -ForegroundColor Green
    $env:REACT_NATIVE_PACKAGER_HOSTNAME = $ip
} else {
    Write-Warning "Could not detect a valid Wi-Fi IP. Expo might use the wrong address."
}

Write-Host "Starting Expo in Go mode..." -ForegroundColor Cyan
npx expo start --go --clear --port 8082
