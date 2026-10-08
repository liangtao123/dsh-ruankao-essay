# 成稿门禁自检（2026-10 机考口径）：双框字数 + 格式硬约束 + 部分职能 + 实例密度 + 术语覆盖
# 用法：
#   & .\check-essay.ps1 -MdPath 'D:\path\论xxx.md'
#   & .\check-essay.ps1 -MdPath 'D:\path\论xxx.md' -RequireTerms '产品负责人','Scrum Master','产品待办列表'
#   & .\check-essay.ps1 -MdPath 'D:\path\论xxx.md' -StripAbstractLabel      # 稿子带「摘要：」前缀时自动剥离
# 退出码：0 = PASS；1 = 不达标（详见输出）；2 = 文件缺失
#
# 契约：源稿第 1 段＝摘要（≤300 含标点），其余段落＝正文（2000~2500 含标点）。
# 检查项：
#   A 格式：摘要 ≤AbstractMax、正文在 BodyMin~BodyMax、无标题、无粗体、无直引号、无禁写字眼与分点标号
#   B 部分职能：摘要含身份（本人/笔者）与金额（万）、周期（月）；建设期（年+月）只写在摘要；
#               结尾段含量化效果（%/成/倍）且不含「不足之处/改进措施/下一步将」这套模板
#   C 实例密度：正文中至少 3 段含具体数字
#   D 术语覆盖：-RequireTerms 给出的分类名称必须全部命中（对应子题目 2 的显性点题）
#   E 配比提示（不影响退出码）：各段字数与建议区间对照，方便按 背景／技术方法／论点／结尾 调详略

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$MdPath,
  [string[]]$RequireTerms = @(),
  [int]$AbstractMax = 300,
  [int]$BodyMin = 2000,
  [int]$BodyMax = 2500,
  [switch]$StripAbstractLabel
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path $MdPath)) { Write-Output ('[缺失] ' + $MdPath); exit 2 }

# 整块剥掉 HTML 注释（含多行元数据注释），避免注释里的引号/字眼被误判
$rawText = [System.IO.File]::ReadAllText($MdPath, [System.Text.Encoding]::UTF8)

# 稿子常见写法是首行带「摘要：」前缀；本门禁按第 1 段＝摘要，默认把这个前缀当禁写字眼报错，
# 加 -StripAbstractLabel 则先剥离，便于直接检查从 Word 里粘出来的稿子。
if ($StripAbstractLabel) {
  $rawText = [regex]::Replace($rawText, '(?m)^\s*摘\s*要\s*[：:]\s*', '')
}

$textNoComment = [regex]::Replace($rawText, '(?s)<!--.*?-->', '')
$rawLines = @($textNoComment -split "\r?\n")
$lines = @($rawLines | Where-Object { $_.Trim() -ne '' })
$paras = $lines.Count

$problems = @()
$notices = @()
if ($paras -eq 0) { Write-Output '[缺失] 文件里没有内容段'; exit 1 }

$abstract = $lines[0]
$bodyLines = @()
if ($paras -gt 1) { $bodyLines = @($lines[1..($paras - 1)]) }
$body = ($bodyLines -join '')
$full = ($lines -join '')

function Measure-Chars([string]$text) { return ($text -replace '\s', '').Length }
function Measure-Hanzi([string]$text) {
  return ($text.ToCharArray() | Where-Object { [int]$_ -ge 0x4E00 -and [int]$_ -le 0x9FA5 }).Count
}

$abstractChars = Measure-Chars $abstract
$bodyChars = Measure-Chars $body
$fullChars = Measure-Chars $full
$bodyHanzi = Measure-Hanzi $body

# ---- A 格式 ----
if ($abstractChars -gt $AbstractMax) { $problems += ("A 摘要 $abstractChars 字，超过机考上限 $AbstractMax（含标点），必须删到 $AbstractMax 以内") }
if ($bodyChars -lt $BodyMin -or $bodyChars -gt $BodyMax) {
  $problems += ("A 正文 $bodyChars 字，应在 $BodyMin~$BodyMax（含标点）；机考正文框超 $BodyMax 无法提交")
}
if ($paras -lt 4) { $problems += ("A 只有 $paras 段，正文至少要有 背景／技术方法说明／论点／结尾 四部分") }
elseif ($paras -lt 5) { $notices += ("E 段数 $paras：常见配比为 背景＋技术方法说明＋论点两段＋结尾，段数偏少时确认论点是否只写了一段") }

$titles = @($rawLines | Where-Object { $_ -match '^#{1,6}\s' }).Count
if ($titles -ne 0) { $problems += "A 出现 Markdown 标题 $titles 行" }
$bold = ([regex]::Matches($full, '\*\*')).Count
if ($bold -ne 0) { $problems += "A 出现 Markdown 粗体 $bold 处" }
$straight = ([regex]::Matches($body, '"')).Count
if ($straight -ne 0) { $problems += "A 正文出现直引号 $straight 处，应改为中文引号" }

$banned = 0
foreach ($ln in $lines) {
  if ($ln -match '^摘要|摘要[：:]|^背景|背景[：:]|^子题目|子题目') { $banned++ }
  $banned += ([regex]::Matches($ln, '第一，|第二，|首先|一是|二是|三是')).Count
}
if ($banned -ne 0) { $problems += "A 出现禁写字眼/分点标号 $banned 处（摘要二字与「背景／子题目」字眼不写入正文；不要用「第一／首先／一是」式列举）" }

# ---- B 部分职能 ----
if ($abstract -notmatch '本人|笔者') { $problems += 'B 摘要未见身份交代（「本人」或「笔者」）' }
if ($abstract -notmatch '万') { $problems += 'B 摘要未见金额（万元）' }
if ($abstract -notmatch '月') { $problems += 'B 摘要未见周期（月）' }

if ($paras -gt 1) {
  $laterText = ($bodyLines -join '')
  $periodHits = ([regex]::Matches($laterText, '\d{4}\s*年\s*\d{1,2}\s*月')).Count
  if ($periodHits -gt 0) { $problems += "B 建设期（年+月）在正文出现 $periodHits 次，应只写在摘要" }
}

$tail = ''
if ($paras -ge 2) { $tail = $lines[$paras - 1] }
if ($tail -notmatch '%|百分之|成|倍') { $problems += 'B 结尾段未见量化成效（%，或「成/倍」等量化表述）' }
if ($tail -match '不足之处|改进措施|下一步将|后续将改进|后续将|有待改进') {
  $problems += 'B 结尾段出现「不足之处／改进措施／下一步将」式模板（宝典口径：结尾写成效与对方法的理解，不写项目缺点与改进计划）'
}

# ---- C 实例密度：正文中至少 3 段带具体数字 ----
$numPattern = '\d|[一二三四五六七八九十百千万亿两]+(个|余|类|项|天|小时|分钟|秒|次|成|倍|年|月|日|人|台|套|层|条|万|亿|周|轮|版|版|步|种)'
$withNum = 0
foreach ($ln in $bodyLines) { if ($ln -match $numPattern) { $withNum++ } }
if ($withNum -lt 3) { $problems += "C 正文仅 $withNum 段含具体数字（应≥3，实例密度不足）" }

# ---- D 术语覆盖 ----
$missing = @()
foreach ($t in $RequireTerms) {
  if ($t -and -not $full.Contains($t)) { $missing += $t }
}
if ($missing.Count -gt 0) { $problems += ('D 子题目术语未命中：' + ($missing -join '、')) }

# ---- E 配比提示（只看字数，不判负）----
if ($bodyLines.Count -ge 3) {
  $i = 0
  foreach ($ln in $bodyLines) {
    $c = Measure-Chars $ln
    $label = ''
    if ($i -eq 0) { $label = '背景（建议 400~500）' }
    elseif ($i -eq 1) { $label = '技术方法说明（建议 400~500，回应子题目 2）' }
    elseif ($i -eq $bodyLines.Count - 1) { $label = '结尾（建议 300~450）' }
    else { $label = '论点（建议每段约 500，两段为佳）' }
    $notices += ("E 第 {0} 段（{1}）{2} 字" -f ($i + 2), $label, $c)
    $i++
  }
}
if ($RequireTerms.Count -eq 0) { $notices += 'E 未传 -RequireTerms：子题目 2 的分类名称没有被机械核对，建议补上' }

# ---- 输出 ----
Write-Output ('文件: ' + $MdPath)
Write-Output ("A 格式: 段数={0} 摘要={1} 正文={2} 正文汉字={3} 合计={4} 标题={5} 粗体={6} 直引号={7} 禁写={8}" -f `
  $paras, $abstractChars, $bodyChars, $bodyHanzi, $fullChars, $titles, $bold, $straight, $banned)
Write-Output ("B 职能: 摘要身份/金额/周期={0} 建设期越界={1} 结尾量化={2} 结尾模板化={3}" -f `
  ($abstract -match '本人|笔者' -and $abstract -match '万' -and $abstract -match '月'), `
  ([regex]::Matches((($bodyLines) -join ''), '\d{4}\s*年\s*\d{1,2}\s*月')).Count, `
  ($tail -match '%|百分之|成|倍'), `
  ($tail -match '不足之处|改进措施|下一步将|后续将改进|后续将|有待改进'))
Write-Output ("C 实例: 正文含数字段=$withNum / $($bodyLines.Count)")
if ($RequireTerms.Count -gt 0) { Write-Output ('D 术语: 要求 ' + $RequireTerms.Count + ' 项，未命中 ' + $missing.Count + ' 项') }
$notices | ForEach-Object { Write-Output ('  · ' + $_) }

# 机器可读摘要行（纯 ASCII，便于 CI 与其它工具按字段取值，不受控制台代码页影响）
Write-Output ("SUMMARY paragraphs={0} abstract={1} body={2} body_hanzi={3} total={4} problems={5} pass={6}" -f `
  $paras, $abstractChars, $bodyChars, $bodyHanzi, $fullChars, $problems.Count, ($problems.Count -eq 0).ToString().ToLower())

if ($problems.Count -eq 0) {
  Write-Output '结论: PASS —— 摘要与正文均在机考字数内，格式与部分职能满足口径'
  exit 0
}
Write-Output '结论: 不达标，需修改：'
$problems | ForEach-Object { Write-Output ('  - ' + $_) }
exit 1
