$ErrorActionPreference = 'SilentlyContinue'

$listeners = netstat -ano -p tcp | Select-String ":3000 .*LISTENING"
if ($listeners) {
  foreach ($line in $listeners) {
    if ($line -match '(\d+)\s*$') {
      $pid = $Matches[1]
      Write-Host "Stopping old backend on port 3000 (PID $pid)..."
      Stop-Process -Id $pid -Force
    }
  }
  Start-Sleep -Milliseconds 500
}

Write-Host "Starting backend..."
npm run start:dev
