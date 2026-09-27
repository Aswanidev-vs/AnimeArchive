# =============================================================================
#  build-logo.ps1 - Anime Archive site mark
#
#  Turns the source artwork (image-1.png at the project root) into the web
#  assets under public/. The source is a cream-canvas woodblock emblem: a closed
#  near-black ring containing a torii, a hinomaru sun, mountains and a sakura
#  branch. Two things stop it being usable as-is:
#
#    1. its background is a cream SQUARE, which would show as a box against the
#       navy header;
#    2. it is not centred - the emblem sits at (75,83) in a 148x145 canvas.
#
#  So the script MEASURES the ring's outer bounds (scanning every 2nd row and
#  column and taking the outermost dark hit, which stays correct where the
#  sakura branch crosses the ring), crops a square around that circle and masks
#  it to a transparent disc with an anti-aliased edge. The result is one disc,
#  rendered at four sizes.
#
#  Run from the project root:   powershell -ExecutionPolicy Bypass -File scripts/build-logo.ps1
#  Overwrite the source image and re-run to refresh every icon.
#  Windows-only because it uses System.Drawing.
# =============================================================================

param(
  [string]$Source = 'image-1.png',
  [string]$PublicDir = 'public'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$srcPath = Join-Path $root $Source
$pub = Join-Path $root $PublicDir

if (-not (Test-Path $srcPath)) { throw "source artwork not found: $srcPath" }
if (-not (Test-Path $pub)) { New-Item -ItemType Directory -Path $pub | Out-Null }

$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width; $h = $src.Height

function Test-Dark($p) {
  # the ring is near-black; 150 keeps it while excluding the vermilion sun (lum ~143)
  return ((0.299 * $p.R + 0.587 * $p.G + 0.114 * $p.B) -lt 150)
}

$left = @(); $right = @(); $top = @(); $bot = @()
for ($y = 16; $y -lt ($h - 16); $y += 2) {
  for ($x = 0; $x -lt $w; $x++) { if (Test-Dark $src.GetPixel($x, $y)) { $left += $x; break } }
  for ($x = $w - 1; $x -ge 0; $x--) { if (Test-Dark $src.GetPixel($x, $y)) { $right += $x; break } }
}
for ($x = 16; $x -lt ($w - 16); $x += 2) {
  for ($y = 0; $y -lt $h; $y++) { if (Test-Dark $src.GetPixel($x, $y)) { $top += $y; break } }
  for ($y = $h - 1; $y -ge 0; $y--) { if (Test-Dark $src.GetPixel($x, $y)) { $bot += $y; break } }
}

$L = ($left | Measure-Object -Minimum).Minimum
$R = ($right | Measure-Object -Maximum).Maximum
$T = ($top | Measure-Object -Minimum).Minimum
$B = ($bot | Measure-Object -Maximum).Maximum
if ($null -eq $L -or $null -eq $R -or $null -eq $T -or $null -eq $B) { throw 'no ring found in the source image' }

$cx = ($L + $R) / 2
$cy = ($T + $B) / 2
$rMask = [Math]::Max(($R - $L) / 2, ($B - $T) / 2) + 1.5   # +1.5px keeps the whole stroke
Write-Host "ring bounds L=$L R=$R T=$T B=$B -> centre ($cx,$cy) maskRadius=$rMask"

$side = [Math]::Round($rMask * 2)
$srcRect = New-Object System.Drawing.Rectangle ([Math]::Round($cx - $rMask)), ([Math]::Round($cy - $rMask)), $side, $side
Write-Host "crop $side x $side at ($($srcRect.X),$($srcRect.Y)) of ${w}x${h}"

function Write-Asset([int]$size, [string]$outPath, $background) {
  $out = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  if ($null -ne $background) { $g.Clear($background) }

  $mask = New-Object System.Drawing.Drawing2D.GraphicsPath
  $mask.AddEllipse(0, 0, $size, $size)
  $g.SetClip($mask)

  $dest = New-Object System.Drawing.Rectangle 0, 0, $size, $size
  $g.DrawImage($src, $dest, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $out.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $out.Dispose()
  Write-Host "  wrote $(Split-Path $outPath -Leaf) (${size}x${size})"
}

$wall950 = [System.Drawing.Color]::FromArgb(255, 11, 14, 26)   # --wall-950

# 128px covers the 32-36px header seal at 3x DPI; 64px is the modern favicon;
# 180px is the iOS home-screen tile, on the app's navy rather than transparent
# because iOS composites transparency against black.
Write-Asset 128 (Join-Path $pub 'logo.png') $null
Write-Asset 64  (Join-Path $pub 'favicon.png') $null
Write-Asset 180 (Join-Path $pub 'apple-touch-icon.png') $wall950

# Browsers still fall back to /favicon.ico when they ignore <link rel="icon">.
# The payload is a bottom-up 32-bit BGRA DIB plus the legacy 1bpp AND mask. The
# smaller PNG-in-ICO form is legal, but several decoders cannot read it - GDI+,
# i.e. the Icon/Bitmap classes this script uses to self-check, is one of them -
# so DIB it is.
$tmp32 = Join-Path ([System.IO.Path]::GetTempPath()) 'anime-archive-32.png'
Write-Asset 32 $tmp32 $null
$disc = [System.Drawing.Bitmap]::FromFile($tmp32)

$bits = New-Object System.IO.MemoryStream
$dw = New-Object System.IO.BinaryWriter($bits)

# BITMAPINFOHEADER
$dw.Write([UInt32]40)                       # biSize
$dw.Write([Int32]32)                        # biWidth
$dw.Write([Int32]64)                        # biHeight = XOR mask rows + AND mask rows
$dw.Write([UInt16]1)                        # biPlanes
$dw.Write([UInt16]32)                       # biBitCount
$dw.Write([UInt32]0)                        # biCompression = BI_RGB
$dw.Write([UInt32]0)                        # biSizeImage
$dw.Write([Int32]0); $dw.Write([Int32]0)    # pels per metre
$dw.Write([UInt32]0); $dw.Write([UInt32]0)  # palette

# XOR mask: BGRA, bottom-up
for ($y = 31; $y -ge 0; $y--) {
  for ($x = 0; $x -lt 32; $x++) {
    $p = $disc.GetPixel($x, $y)
    $dw.Write([Byte]$p.B); $dw.Write([Byte]$p.G); $dw.Write([Byte]$p.R); $dw.Write([Byte]$p.A)
  }
}

# AND mask: 1bpp, 1 = leave the destination alone, so legacy renderers that
# ignore the alpha channel still leave the disc's corners transparent.
for ($y = 31; $y -ge 0; $y--) {
  $row = New-Object 'Byte[]' 4
  for ($x = 0; $x -lt 32; $x++) {
    if ($disc.GetPixel($x, $y).A -lt 128) {
      # -shr/-band keep this exact integer maths; [int](31/8) would round up to 4
      $byteIndex = $x -shr 3
      $row[$byteIndex] = $row[$byteIndex] -bor (128 -shr ($x -band 7))
    }
  }
  $dw.Write($row, 0, $row.Length)
}
$dw.Flush()
$dib = $bits.ToArray()
$dw.Dispose(); $bits.Dispose()
$disc.Dispose()
Remove-Item $tmp32 -Force

$stream = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($stream)
$bw.Write([UInt16]0)                # reserved
$bw.Write([UInt16]1)                # type: icon
$bw.Write([UInt16]1)                # image count
$bw.Write([Byte]32)                 # width
$bw.Write([Byte]32)                 # height
$bw.Write([Byte]0)                  # palette entries
$bw.Write([Byte]0)                  # reserved
$bw.Write([UInt16]1)                # colour planes
$bw.Write([UInt16]32)               # bits per pixel
$bw.Write([UInt32]$dib.Length)      # payload size
$bw.Write([UInt32]22)               # payload offset
$bw.Write($dib, 0, $dib.Length)
$bw.Flush()
[System.IO.File]::WriteAllBytes((Join-Path $pub 'favicon.ico'), $stream.ToArray())
$bw.Dispose(); $stream.Dispose()
Write-Host "  wrote favicon.ico (32x32 DIB payload, $((Get-Item (Join-Path $pub 'favicon.ico')).Length) bytes)"

$src.Dispose()
Write-Host 'done.'
