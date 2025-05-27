# PowerShell script equivalent to start.sh

# Read configuration from config.json
$config = Get-Content -Raw -Path "config.json" | ConvertFrom-Json
$FRONTEND_PORT = $config.frontend.port
$BACKEND_PORT = $config.backend.port
$FRONTEND_DOMAIN = $config.frontend.domain
$BACKEND_DOMAIN = $config.backend.domain
$FRONTEND_PROTOCOL = $config.frontend.protocol
$BACKEND_PROTOCOL = $config.backend.protocol

Write-Host "🚀 Starting servers..." -ForegroundColor Cyan

# Start backend
Write-Host "Starting backend server on port $BACKEND_PORT..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    param($dir, $port)
    Set-Location $dir
    deno run --allow-net --allow-read --allow-write --allow-env main.ts $port
} -ArgumentList "$(Get-Location)\backend", $BACKEND_PORT

# Start frontend
Write-Host "Starting frontend server on port $FRONTEND_PORT..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    param($dir, $port)
    Set-Location $dir
    deno run --allow-net --allow-read=../ server.ts $port
} -ArgumentList "$(Get-Location)\frontend", $FRONTEND_PORT

# Open browsers - commented out as in the original script
# Start-Process "$FRONTEND_PROTOCOL`://$FRONTEND_DOMAIN`:$FRONTEND_PORT"
# Start-Process "$BACKEND_PROTOCOL`://$BACKEND_DOMAIN`:$BACKEND_PORT"

Write-Host "✅ Both servers running:" -ForegroundColor Green
Write-Host "  Backend Job ID: $($backendJob.Id) ($BACKEND_PROTOCOL`://$BACKEND_DOMAIN`:$BACKEND_PORT)" -ForegroundColor Green
Write-Host "  Frontend Job ID: $($frontendJob.Id) ($FRONTEND_PROTOCOL`://$FRONTEND_DOMAIN`:$FRONTEND_PORT)" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop..." -ForegroundColor Cyan

# Setup cleanup function for Ctrl+C
$eventJob = Register-ObjectEvent -InputObject ([Console]) -EventName CancelKeyPress -Action {
    Write-Host "`n🛑 Stopping servers..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob, $frontendJob -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Servers stopped." -ForegroundColor Green
    exit
}

# Keep the script running until user interrupt
try {
    while ($true) {
        Start-Sleep -Seconds 1
        
        # Check if jobs are still running
        $backendStatus = Receive-Job -Job $backendJob -ErrorAction SilentlyContinue
        $frontendStatus = Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue
    }
} finally {
    # Cleanup if script exits without Ctrl+C
    Stop-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob, $frontendJob -Force -ErrorAction SilentlyContinue
    Unregister-Event -SourceIdentifier $eventJob.Name -ErrorAction SilentlyContinue
}