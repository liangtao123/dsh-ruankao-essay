# 把软考论文的 Markdown 源稿转成 Word 可直接打开的 .doc（HTML 型）。
# 默认输出「分框标注版」：摘要框与正文框分栏显示，并标注各框字数，避免摘要与正文混在一起交付；
# 加 -Plain 输出「无标注版」（只有摘要段与正文段，考场粘贴用）。
#
# 契约：源稿第 1 段＝摘要（≤300 字，含标点），其余段落＝正文（2000~2500 字，含标点）；
#       摘要之后的 <!-- BODY --> 分界标记是注释，不进入 .doc。
#
# 用法：
#   & .\make-essay-doc.ps1 -MdPath "D:\path\论题目.md"                # 分框标注版 → 论题目.doc
#   & .\make-essay-doc.ps1 -MdPath "D:\path\论题目.md" -Plain         # 无标注版 → 论题目-无标注版.doc
#   & .\make-essay-doc.ps1 -MdPath "D:\path\论题目.md" -OutPath "D:\out\x.doc"
#
# 要点（踩过的坑）：
#   1) 中文引号与破折号必须用 [char] 码点构造，直接写字面量在部分调用方式下会被吞掉。
#   2) 输出用带 BOM 的 UTF-8，Word 打开不乱码。
#   3) 目标文件被 Word 占用时自动重试，仍失败则另存 *_v2.doc。
#   4) 必须整块剥掉 HTML 注释（含多行元数据注释），否则注释行会被当成正文段落。
#   5) 「段落数＝每个内容段一个 <p>」是 CI 的校验契约：分栏标题与说明一律用 <h3>／<div>，不得用 <p>。

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$MdPath,
  [string]$OutPath,
  [switch]$Plain
)

$ErrorActionPreference = 'Stop'

# 相对路径必须基于 PowerShell 的当前位置解析：
# .NET 的当前目录与 PowerShell 位置可能不同（[System.IO.File] 用的是前者），
# 因此这里统一转成绝对路径，并确保输出目录存在。
function Resolve-FullPath([string]$Path) {
  if ([System.IO.Path]::IsPathRooted($Path)) { return [System.IO.Path]::GetFullPath($Path) }
  return [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $Path))
}

if (-not (Test-Path -LiteralPath $MdPath)) { throw "找不到 Markdown 文件：$MdPath" }
$MdPath = (Resolve-Path -LiteralPath $MdPath).Path
if (-not $OutPath) {
  # 注意：Windows PowerShell 5.1 的 .NET Framework 下 ChangeExtension(path, $null) 会留下结尾的点，
  # 拼出来是「论xxx..doc」；这里统一用 GetFileNameWithoutExtension 拼默认文件名。
  $stem = Join-Path ([System.IO.Path]::GetDirectoryName($MdPath)) ([System.IO.Path]::GetFileNameWithoutExtension($MdPath))
  $OutPath = $stem + $(if ($Plain) { '-无标注版.doc' } else { '.doc' })
}
$OutPath = Resolve-FullPath $OutPath
$outDir = Split-Path -Parent $OutPath
if ($outDir -and -not (Test-Path -LiteralPath $outDir)) {
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

# 读源稿：整块剥掉 HTML 注释（多行注释也算），再去空行与行首标记
$rawText = [System.IO.File]::ReadAllText($MdPath, [System.Text.Encoding]::UTF8)
$markerRegex = '(?m)^[ \t]*<!--\s*(BODY|正文开始).*?-->[ \t]*\r?$'
$markerCount = ([regex]::Matches($rawText, $markerRegex)).Count
$textNoComment = [regex]::Replace($rawText, '(?s)<!--.*?-->', '')
$lines = @(($textNoComment -split "\r?\n") |
  ForEach-Object { $_.Trim() } |
  Where-Object { $_ -ne '' })
if ($lines.Count -eq 0) { throw '源稿里没有内容段' }

$abstractText = [string]$lines[0]
$bodyLines = @()
if ($lines.Count -ge 2) { $bodyLines = @($lines[1..($lines.Count - 1)]) }
$bodyText = ($bodyLines -join '')

$q1 = ([char]0x201C).ToString()   # 左双引号
$q2 = ([char]0x201D).ToString()   # 右双引号
$dash = ([char]0x2014).ToString() # 破折号

function Convert-EssayLine([string]$text) {
  $out = $text -replace '^#+\s*', '' -replace '\*\*', ''
  $out = [regex]::Replace($out, '"([^"]*)"', ($q1 + '$1' + $q2))
  $out = $out.Replace($dash, ($dash + $dash))
  return $out
}

# 双框字数（自检用）：契约是第 1 段＝摘要，其余段落＝正文
function Get-HanziCount([string]$text) {
  return ($text.ToCharArray() | Where-Object { [int]$_ -ge 0x4E00 -and [int]$_ -le 0x9FA5 }).Count
}
$abstractChars = ($abstractText -replace '\s', '').Length
$bodyChars = ($bodyText -replace '\s', '').Length
$bodyHanzi = Get-HanziCount $bodyText

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">')
[void]$sb.AppendLine('<head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">')
[void]$sb.AppendLine('<title>Document</title>')
[void]$sb.AppendLine('<style>@page{size:A4;margin:2.54cm 3.17cm;} body{line-height:1.5;} p{font-family:SimSun;font-size:12.0pt;line-height:1.5;text-indent:24.0pt;margin:0;text-align:justify;} h3.box{font-family:SimSun;font-size:12.0pt;font-weight:bold;margin:14pt 0 6pt 0;text-indent:0;text-align:left;} div.note{font-family:SimSun;font-size:10.5pt;color:#555555;margin:0 0 8pt 0;text-indent:0;text-align:left;}</style></head><body>')

if (-not $Plain) {
  [void]$sb.AppendLine('<div class=''note''>分框标注版：以下按机考两个输入框分栏，分栏标题与说明不属于答卷内容；需要考场直接粘贴时，请用 -Plain 生成的无标注版。</div>')
  [void]$sb.AppendLine(('<h3 class=''box''>摘要框（{0} 字／上限 300）</h3>' -f $abstractChars))
}
[void]$sb.AppendLine('<p>' + (Convert-EssayLine $abstractText) + '</p>')
if (-not $Plain) {
  [void]$sb.AppendLine(('<h3 class=''box''>正文框（{0} 字／2000~2500，共 {1} 段）</h3>' -f $bodyChars, $bodyLines.Count))
}
foreach ($line in $bodyLines) {
  [void]$sb.AppendLine('<p>' + (Convert-EssayLine $line) + '</p>')
}
[void]$sb.AppendLine('</body></html>')

$target = $OutPath
try {
  [System.IO.File]::WriteAllText($target, $sb.ToString(), (New-Object System.Text.UTF8Encoding $true))
} catch {
  # 被 Word/WPS 占用：重试三次，再失败则另存
  $ok = $false
  for ($i = 1; $i -le 3; $i++) {
    Start-Sleep -Seconds 2
    try { [System.IO.File]::WriteAllText($target, $sb.ToString(), (New-Object System.Text.UTF8Encoding $true)); $ok = $true; break } catch { }
  }
  if (-not $ok) {
    $target = (Join-Path ([System.IO.Path]::GetDirectoryName($OutPath)) ([System.IO.Path]::GetFileNameWithoutExtension($OutPath))) + '_v2.doc'
    [System.IO.File]::WriteAllText($target, $sb.ToString(), (New-Object System.Text.UTF8Encoding $true))
    Write-Warning "原文件被占用，已另存：$target"
  }
}

$formName = if ($Plain) { '无标注版（考场粘贴用）' } else { '分框标注版（摘要框／正文框已分栏）' }
$markerState = if ($markerCount -eq 1) { '有' } elseif ($markerCount -eq 0) { '缺失（门禁会判不达标）' } else { "重复（$markerCount 个）" }
Write-Output ('形态: ' + $formName)
Write-Output ("段数: {0}  分界标记: {1}" -f $lines.Count, $markerState)
Write-Output ("摘要框: {0} 字（上限 300）" -f $abstractChars)
Write-Output ("正文框: {0} 字（2000~2500），共 {1} 段  正文纯汉字: {2}" -f $bodyChars, $bodyLines.Count, $bodyHanzi)
Write-Output ('机考口径: 摘要 ≤300 字 / 正文 2000~2500 字（均含标点）')
Write-Output ("已生成: {0}" -f $target)
