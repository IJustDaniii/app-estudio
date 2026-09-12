$ErrorActionPreference = "Stop"

Set-Location (Split-Path -Parent $PSScriptRoot)

function Stop-WithMessage([string]$message) {
  Write-Host "`nERROR: $message" -ForegroundColor Red
  exit 1
}

# Normaliza el PATH de instalaciones de Windows que contienen comillas sueltas.
$env:Path = $env:Path.Replace('"', '')
$nodeBin = "C:\Program Files\nodejs"
$dockerBin = "C:\Program Files\Docker\Docker\resources\bin"
if (Test-Path "$nodeBin\node.exe") { $env:Path = "$nodeBin;$env:Path" }
if (Test-Path "$dockerBin\docker-credential-desktop.exe") { $env:Path = "$dockerBin;$env:Path" }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Stop-WithMessage "No se encuentra Node.js. Instala Node.js 24 o superior y vuelve a intentarlo."
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  Stop-WithMessage "No se encuentra npm. Reinstala Node.js 24 o superior y vuelve a intentarlo."
}
if (-not (Get-Command docker.exe -ErrorAction SilentlyContinue)) {
  Stop-WithMessage "No se encuentra Docker. Instala Docker Desktop y vuelve a intentarlo."
}
if (-not (Get-Command docker-credential-desktop.exe -ErrorAction SilentlyContinue)) {
  Stop-WithMessage "No se encuentra docker-credential-desktop.exe. Repara o reinstala Docker Desktop y vuelve a intentarlo."
}
if (-not (Test-Path ".env")) {
  Stop-WithMessage "Falta el archivo .env. Copia .env.example a .env y completa AUTH_SECRET, DATABASE_URL y las credenciales demo."
}

if (-not (Test-Path "node_modules")) {
  Write-Host "Instalando dependencias de Node.js..." -ForegroundColor Cyan
  & npm.cmd install
  if ($LASTEXITCODE -ne 0) { Stop-WithMessage "No se pudieron instalar las dependencias." }
}

function Test-DockerEngine {
  & docker.exe info *> $null
  return $LASTEXITCODE -eq 0
}

if (-not (Test-DockerEngine)) {
  $desktopCandidates = @(
    "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
    "$env:LOCALAPPDATA\Programs\Docker\Docker Desktop.exe"
  )
  $desktopPath = $desktopCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $desktopPath) {
    Stop-WithMessage "Docker Desktop está instalado de forma incompleta o no se encuentra su ejecutable."
  }

  Write-Host "Abriendo Docker Desktop y esperando al motor..." -ForegroundColor Cyan
  Start-Process -FilePath $desktopPath | Out-Null
  $engineReady = $false
  for ($attempt = 1; $attempt -le 45; $attempt++) {
    Start-Sleep -Seconds 2
    if (Test-DockerEngine) { $engineReady = $true; break }
    if ($attempt % 5 -eq 0) { Write-Host "  Sigue iniciándose ($($attempt * 2)s)..." -ForegroundColor DarkGray }
  }
  if (-not $engineReady) {
    Stop-WithMessage "Docker Desktop no ha iniciado el motor. Ábrelo y comprueba que indique que está funcionando."
  }
}

Write-Host "Levantando PostgreSQL..." -ForegroundColor Cyan
& docker.exe compose up -d
if ($LASTEXITCODE -ne 0) { Stop-WithMessage "No se pudo iniciar PostgreSQL con Docker Compose." }

Write-Host "Esperando a que PostgreSQL acepte conexiones..." -ForegroundColor Cyan
$databaseReady = $false
for ($attempt = 1; $attempt -le 30; $attempt++) {
  & docker.exe compose exec -T db pg_isready -U postgres -d aula_1b *> $null
  if ($LASTEXITCODE -eq 0) { $databaseReady = $true; break }
  Start-Sleep -Seconds 2
}
if (-not $databaseReady) { Stop-WithMessage "PostgreSQL no ha respondido a tiempo. Ejecuta 'docker compose logs db' para ver el motivo." }

Write-Host "Preparando Prisma y datos demo..." -ForegroundColor Cyan
& npm.cmd run db:generate
if ($LASTEXITCODE -ne 0) { Stop-WithMessage "Falló la generación del cliente Prisma." }
& npm.cmd run db:migrate
if ($LASTEXITCODE -ne 0) { Stop-WithMessage "Falló la migración de la base de datos." }
& npm.cmd run db:seed
if ($LASTEXITCODE -ne 0) { Stop-WithMessage "Falló la carga de datos demo. Comprueba DEMO_USER_EMAIL y DEMO_USER_PASSWORD en .env." }

Write-Host "`nAula 1B está lista en http://localhost:3000`n" -ForegroundColor Green
& npm.cmd run dev
