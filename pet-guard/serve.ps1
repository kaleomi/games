# 萌宠保卫战 · 本地运行：在本机开一个小网页服务器，然后用浏览器打开游戏
# 不用装任何东西（Windows 自带 PowerShell）。关掉这个窗口就停止。
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path))
if (-not $root.EndsWith('\')) { $root += '\' }
$types = @{
  '.html' = 'text/html; charset=utf-8'; '.htm' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.mjs' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json; charset=utf-8'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'
  '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.webp' = 'image/webp'; '.gif' = 'image/gif'; '.ico' = 'image/x-icon'
  '.ogg' = 'audio/ogg'; '.mp3' = 'audio/mpeg'; '.wav' = 'audio/wav'; '.woff' = 'font/woff'; '.woff2' = 'font/woff2'; '.ttf' = 'font/ttf'; '.txt' = 'text/plain; charset=utf-8'
}
$listener = $null
foreach ($p in 8080..8099) {
  try { $l = New-Object System.Net.HttpListener; $l.Prefixes.Add("http://localhost:$p/"); $l.Start(); $listener = $l; $port = $p; break } catch { }
}
if (-not $listener) { Write-Host '8080-8099 端口都被占用了，关掉其它程序再试。'; exit 1 }
$url = "http://localhost:$port/"
Write-Host ''
Write-Host "  萌宠保卫战 已启动：$url" -ForegroundColor Yellow
Write-Host '  浏览器会自动打开；没打开就用 Chrome / Edge 手动打开上面的网址。'
Write-Host '  直播时先打开熙梦连上直播间，游戏会自动连接（端口 8765）。'
Write-Host '  关掉这个窗口 = 停止游戏服务器。'
Write-Host ''
Start-Process $url
while ($listener.IsListening) {
  try { $ctx = $listener.GetContext() } catch { break }
  $res = $ctx.Response
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($rel -eq '' -or $rel.EndsWith('/')) { $rel += 'index.html' }
    $full = [IO.Path]::GetFullPath((Join-Path $root $rel))
    if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not [IO.File]::Exists($full)) {
      $res.StatusCode = 404; $b = [Text.Encoding]::UTF8.GetBytes('404 Not Found'); $res.OutputStream.Write($b, 0, $b.Length)
    } else {
      $ext = [IO.Path]::GetExtension($full).ToLower()
      $res.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
      $res.Headers.Add('Cache-Control', 'no-cache')
      $bytes = [IO.File]::ReadAllBytes($full)
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    }
  } catch { } finally { try { $res.Close() } catch { } }
}
