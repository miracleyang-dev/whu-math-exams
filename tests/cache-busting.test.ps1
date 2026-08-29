$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$app = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'style/js/app.js')
$index = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'index.html')
$caddy = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'Caddyfile')

if ($app -notmatch 'const DATA_VERSION = ''[^'']+'';') {
  throw 'app.js must define a data version for cache-busted JSON requests.'
}

foreach ($file in 'courses.json', 'exams.json') {
  $pattern = 'fetch\(`data/' + [regex]::Escape($file) + '\?v=\$\{DATA_VERSION\}`, \{ cache: ''no-store'' \}\)'
  if ($app -notmatch $pattern) {
    throw "app.js must request data/$file with a versioned no-store fetch."
  }
}

if ($index -notmatch 'style/js/app\.js\?v=18') {
  throw 'index.html must reference the cache-busting app.js version.'
}

if ($index -notmatch 'style/css/style\.css\?v=18') {
  throw 'index.html must reference the cache-busting stylesheet version.'
}

if ($caddy -notmatch 'Cache-Control "no-cache, must-revalidate"') {
  throw 'Caddyfile must require HTML revalidation so asset versions can update.'
}

Write-Output 'Cache-busting configuration is present.'
