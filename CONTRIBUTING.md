# 参与贡献

感谢你愿意改进这个插件。本项目很小，流程也尽量简单。

## 一、先决条件

- Node.js ≥ 20（只用于校验脚本与 CI，本插件没有构建步骤）
- Windows 上另需 PowerShell 5.1 或 PowerShell 7（用于端到端测试生成脚本与门禁）
- 可选：DSH 桌面端，用于实际安装验证

## 二、仓库结构

```
index.js                 Host 半：向 ctx.skills 注册三个技能
client.js                Client 半（可选）：在 Web UI 里注册一个面板
cordis.patch.yml         向 profile 插入插件行的加载器补丁
assets/<skill-name>/     技能目录：SKILL.md + references/ + scripts/
  ├─ SKILL.md            带 YAML frontmatter（name 必须等于目录名）
  ├─ references/*.md     技能按需读取的参考资料
  └─ scripts/*.ps1       技能附带的脚本
scripts/verify-manifest.mjs   清单与资产校验（本地与 CI 共用）
tests/fixtures/          端到端测试样例
.github/workflows/        CI 与发布
```

**新增技能**：在 `assets/` 下建 `<kebab-case-name>/SKILL.md`（带 frontmatter，`description` 要写清「何时加载」），再到 `index.js` 的 `SKILLS` 数组登记一条，最后跑校验。

## 三、本地校验（提交前请全部跑过）

```powershell
# 1) 语法与清单
node --check index.js
node --check client.js
node scripts/verify-manifest.mjs

# 2) 生成 .doc 与门禁端到端（用真 Windows PowerShell 5.1）
$root = $PWD
$s = "$root\assets\ruankao-essay-writing\scripts\make-essay-doc.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $s `
  -MdPath "$root\tests\fixtures\sample-essay.md" -OutPath "$root\tests\out\sample.doc"
# 期望输出：段数: 6  摘要字数: 271  正文字数: 2056

$g = "$root\assets\ruankao-essay-writing\scripts\check-essay.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $g `
  -MdPath "$root\tests\fixtures\sample-essay.md" -RequireTerms 'TCC'
# 期望输出：结论: PASS（并有一行 SUMMARY ... pass=true）
```

`verify-manifest.mjs` 会检查：清单字段、补丁 id 与包名、每个技能的 frontmatter 与目录名一致、
三个 PowerShell 脚本存在且为**带 BOM 的 UTF-8**、Client 半的模块 id 与槽位、
**面板的架构题名与题库表逐条一致且覆盖 2016—2026 各年度**、**每类题型骨架都带合法 tag 且 zh／en 字典键集一致**、
必备文件齐全、`references/` 下只有公开文件被跟踪、`files` 白名单只包含仓库已跟踪的文件。

CI（`.github/workflows/ci.yml`）在 push 与 PR 时跑同样的检查，Windows 作业会真的生成一次 `.doc`、
跑一次门禁并验证三条负例（摘要超长／正文过短／直引号与分点标号必须被拒绝）。

## 四、修改约定

### 内容边界（重要）

本仓库是**公开仓库**，请只提交：

- 插件代码、技能骨架、写作规范（含机考字数口径）、公开的考试题目信息与官方评分口径、教科书层面的通用理论。
- **真题题名可以入库**（考期、试题序号、题名属公开考试信息，例如 `topic-index-lite.md` 的两张题名表），但必须来自公开站点并可追溯，且单源题名要带 `*` 标记。

**请勿提交**（并请注意本地忽略配置不会保护你）：

- 第三方的课程、教材或他人作品；**付费课程／论文宝典的原文、范文、句式模板与统计数据一律不得入库**（写法与句式请用自己的话重写）；
- 真题的**解析、参考答案要点、范文与通过率统计**（题名之外的衍生内容一律不入库）以及带来源 URL 的取证台账；
- 自己的备考笔记、个人整理稿与项目数据；
- 令牌、密钥、内网地址、个人身份信息。

如需在本机保留这类资料，请放到 `.git/info/exclude`（本机忽略、不进版本控制）而不是 `.gitignore`，
以免在公开仓库里点出这些资料的存在与名称。CI 会拦截 `references/` 下非公开文件的提交。

### 代码风格

- 全部使用 ESM（`type: module`），`index.js` 只导出 `apply` / `inject` / `name`（或默认导出服务类），不要混用；
- 资源注册必须放在 `apply` 内并用 `ctx.effect` / `ctx.on` 返回清理函数；
- 技能说明用简体中文，技能名用 kebab-case，`description` 用「中文一句话 + 英文触发说明」的写法，便于模型判断何时加载。

### 提交信息

采用约定式提交（Conventional Commits）的英文类型前缀 + 中文描述，例如：

```
feat: 新增 Client 面板用于浏览题型索引
fix(ci): Windows 作业改用 ASCII 驱动脚本
docs: 说明公开内容边界
```

一个提交只做一件事；涉及技能资产的改动请同时说明是否需要重建 references。

## 五、Pull Request 检查表

- [ ] `node --check index.js` 与 `node --check client.js` 通过
- [ ] `node scripts/verify-manifest.mjs` 通过（15 项）
- [ ] 生成脚本端到端输出「段数: 6  摘要字数: ≤300  正文字数: 2000~2500」
- [ ] 门禁脚本对 `tests/fixtures/sample-essay.md` 输出 `结论: PASS`
- [ ] 没有提交任何第三方资料（含付费课程与论文宝典的原文、范文、句式）、个人资料或密钥
- [ ] 新增／订正题名来自公开站点（可追溯），单源题名带 `*`，且已同步 `client.js` 面板数据（`verify-manifest.mjs` 会拦不一致）
- [ ] 新增/修改的技能已同步 `README.md` 的说明与 `CHANGELOG.md`
- [ ] 行为变更已写进 `CHANGELOG.md` 的 `Unreleased`

## 六、发布（维护者）

1. 更新 `CHANGELOG.md`，把 `Unreleased` 归档为具体版本；
2. 同步 `package.json` 的 `version`（保持 `private: true`）；
3. 打 tag 并推送：`git tag -a v0.1.1 -m "v0.1.1"` → `git push origin v0.1.1`；
4. tag 会触发 `.github/workflows/github-release.yml`：先跑校验，再创建 GitHub Release。

**本仓库不发布到 npm。** `package.json` 保持 `private: true` 作为硬约束；`files` 白名单仍然逐个列出公开文件，
并有一条校验规则保证「白名单里的每个文件都必须是仓库已跟踪的文件」——避免误发布时把本机资料打包。
