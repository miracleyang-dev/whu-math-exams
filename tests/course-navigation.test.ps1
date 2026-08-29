$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$app = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'style/js/app.js')
$css = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'style/css/style.css')

foreach ($snippet in @(
  "title.type = 'button';",
  "content.hidden = isMobile;",
  "title.setAttribute('aria-expanded', String(!isMobile));",
  "function scrollToCourse(targetId, behavior = 'smooth')",
  'const anchor = target.previousElementSibling || target;',
  'anchor.getBoundingClientRect().bottom',
  'behavior',
  "link.addEventListener('click', event =>"
)) {
  if (-not $app.Contains($snippet)) {
    throw "Missing course navigation behavior: $snippet"
  }
}

foreach ($snippet in @(
  '.cat-courses[hidden]',
  '.cat-title:hover',
  '.cat-title::after',
  'border: 0;',
  '.course-block.course-target'
)) {
  if (-not $css.Contains($snippet)) {
    throw "Missing course navigation styling: $snippet"
  }
}

Write-Output 'Course navigation behavior and styling are present.'
