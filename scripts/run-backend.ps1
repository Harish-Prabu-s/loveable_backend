# Run Django backend on all interfaces
# This allows mobile devices on the same network to access the API via the laptop's IP

$ip = "10.130.45.184"
Write-Host "Starting Backend on 0.0.0.0:8000" -ForegroundColor Cyan
Write-Host "Mobile device should connect to: http://$ip:8000/api/" -ForegroundColor Green

# Ensure we are in the backend directory if needed
# python manage.py runserver 0.0.0.0:8000

if (Test-Path "backend/manage.py") {
    python backend/manage.py runserver 0.0.0.0:8000
}
else {
    python manage.py runserver 0.0.0.0:8000
}
