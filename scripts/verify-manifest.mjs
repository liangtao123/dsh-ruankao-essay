#!/usr/bin/env node
/**
 * 校验插件清单与技能资产的一致性（CI 与本地共用）。
 *
 * 检查项：
 *  1. package.json 具备 dsh.bundle.patch / manifestVersion / meta / icon / main
 *  2. cordis.patch.yml 声明的插件 id 与包名正确
 *  3. index.js 登记的每个技能都有 assets/<name>/SKILL.md，且 frontmatter 的 name 与目录名一致、description 非空
 *  4. 写作技能引用的生成脚本存在，且为带 BOM 的 UTF-8
 *  4c. Client 面板的架构题名与公开题库表一致、覆盖 2016—2026 各年度、骨架 tag 与 zh／en 字典键集正确
 *  5. 私有题库文件未被纳入版本控制（git 可用时）
 *
 * 用法：node scripts/verify-manifest.mjs
 */

import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const notes = [];

const fail = (message) => problems.push(message);
const ok = (message) => notes.push(message);
const read = (relative) => readFileSync(join(root, relative), "utf8");

// 1) package.json
let pkg;
try {
  pkg = JSON.parse(read("package.json"));
} catch (error) {
  fail(`package.json 无法解析：${error.message}`);
  report();
}

if (pkg.dsh?.bundle?.patch !== "./cordis.patch.yml") fail("package.json 缺少 dsh.bundle.patch 或指向不正确");
if (pkg.dsh?.manifestVersion !== 1) fail("package.json 缺少 dsh.manifestVersion: 1");
if (!pkg.meta?.title || !pkg.meta?.description) fail("package.json 缺少 meta.title 或 meta.description");
if (!pkg.icon) fail("package.json 缺少 icon");
else if (!existsSync(join(root, pkg.icon))) fail(`icon 文件不存在：${pkg.icon}`);
if (!pkg.main) fail("package.json 缺少 main");
if (!/inject\s*=\s*\[[^\]]*"skills"/.test(read("index.js"))) fail("index.js 必须通过 inject 声明对 skills 服务的依赖");
ok(`manifest: ${pkg.name}@${pkg.version}`);

// 2) cordis.patch.yml
const patch = read("cordis.patch.yml");
const patchId = patch.match(/^\s*-?\s*id:\s*([a-z0-9-]+)\s*$/m)?.[1];
const patchName = patch.match(/name:\s*'([^']+)'/)?.[1];
if (!patch.includes("insert:")) fail("cordis.patch.yml 缺少 insert 段");
if (patchId !== "ruankao-essay") fail(`cordis.patch.yml 的插件 id 应为 ruankao-essay，实际为 ${patchId}`);
if (patchName !== pkg.name) fail(`cordis.patch.yml 的 name 应为 ${pkg.name}，实际为 ${patchName}`);
ok(`patch: id=${patchId} name=${patchName}`);

// 3) index.js 登记的技能与资产
const index = read("index.js");
const skillNames = [...index.matchAll(/dir:\s*"([a-z0-9-]+)"/g)].map((match) => match[1]);
if (skillNames.length === 0) fail("index.js 未登记任何技能");
for (const name of skillNames) {
  const skillPath = `assets/${name}/SKILL.md`;
  if (!existsSync(join(root, skillPath))) {
    fail(`技能 ${name} 缺少 ${skillPath}`);
    continue;
  }
  const body = read(skillPath);
  const frontmatter = body.startsWith("---") ? body.split("\n---")[0] : undefined;
  if (!frontmatter) {
    fail(`${skillPath} 缺少 YAML frontmatter（文件系统方式发现技能时需要）`);
    continue;
  }
  const declared = frontmatter.match(/^name:\s*([a-z0-9-]+)\s*$/m)?.[1];
  const description = frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? "";
  if (declared !== name) fail(`${skillPath} 的 frontmatter name=${declared}，与目录名 ${name} 不一致`);
  if (description.length < 40) fail(`${skillPath} 的 description 过短，模型难以判断何时加载`);
  ok(`skill: ${name}（frontmatter 正确，description ${description.length} 字符）`);
}

// 4) 脚本存在且带 BOM（Windows PowerShell 5.1 会按 ANSI 误读无 BOM .ps1 里的中文）
const scriptPaths = [
  "assets/ruankao-essay-writing/scripts/make-essay-doc.ps1",
  "assets/ruankao-essay-writing/scripts/check-essay.ps1",
  "assets/ruankao-essay-writing/scripts/ingest-essay.ps1",
];
for (const scriptPath of scriptPaths) {
  if (!existsSync(join(root, scriptPath))) {
    fail(`脚本缺失：${scriptPath}`);
    continue;
  }
  const bytes = readFileSync(join(root, scriptPath));
  const hasBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  if (!hasBom) fail(`${scriptPath} 必须保存为带 BOM 的 UTF-8（Windows PowerShell 5.1 会按 ANSI 误读中文）`);
  else ok(`script: ${scriptPath}（${bytes.length} 字节，BOM 正确）`);
}
if (!read("assets/ruankao-essay-writing/SKILL.md").includes("make-essay-doc.ps1")) {
  fail("写作技能未引用生成脚本");
}
if (!read("assets/ruankao-essay-writing/SKILL.md").includes("check-essay.ps1")) {
  fail("写作技能未引用门禁脚本");
}

// 4b) Client 半（可选）：清单声明与产物必须一致
const clientManifest = pkg.dsh?.client;
if (clientManifest !== undefined) {
  if (pkg.exports?.["./client"] === undefined) fail("dsh.client 已声明，但 exports 缺少 './client'");
  const clientPath = "client.js";
  if (!existsSync(join(root, clientPath))) {
    fail(`Client 半缺失：${clientPath}`);
  } else {
    const client = read(clientPath);
    if (!client.includes("window.__ModuleLoader__.load")) fail(`${clientPath} 未通过 window.__ModuleLoader__.load 注册模块`);
    const idMatch = client.match(/id:\s*['"]([^'"]+)['"]/);
    if (idMatch === null) fail(`${clientPath} 未声明模块 id`);
    else if (idMatch[1] !== pkg.name) fail(`${clientPath} 的模块 id（${idMatch[1]}）必须等于包名（${pkg.name}）`);
    if (!Array.isArray(clientManifest.inject) || clientManifest.inject.length === 0) {
      fail("dsh.client.inject 必须声明依赖的 Client 包，否则槽位服务可能不可用");
    }
    const slotMatch = client.match(/slots\.inject\(\s*['"]([^'"]+)['"]/);
    if (slotMatch === null) fail(`${clientPath} 未注册到任何槽位`);
    else ok(`client: 注册到槽位 ${slotMatch[1]}，模块 id 与包名一致`);
  }
  if ((pkg.files ?? []).includes(clientPath) === false) fail(`package.json 的 files 未包含 ${clientPath}，发布 npm 时会漏掉`);
}

// 4c) 面板数据与公开题库必须同源（防止一边改了题名另一边没跟上）
try {
  const bankPath = "assets/ruankao-essay-bank/references/topic-index-lite.md";
  const bank = read(bankPath);
  const client = read("client.js");

  const heading = bank.indexOf("### （二）系统架构设计师");
  if (heading < 0) fail(`${bankPath} 缺少「（二）系统架构设计师」小节`);
  const archBlock = heading < 0 ? "" : bank.slice(heading).split("\n## ")[0];
  const clean = (text) => text.replace(/[`*\s]/g, "");
  const bankRows = new Map();
  for (const line of archBlock.split("\n")) {
    const cells = line.split("|").map((cell) => cell.trim());
    const yearMatch = cells.length >= 7 ? cells[1].match(/^(20\d\d\/\d\d)/) : null;
    if (yearMatch === null) continue;
    bankRows.set(yearMatch[1], cells.slice(2, 6).map(clean).filter((title) => title !== "" && title !== "—"));
  }
  if (bankRows.size === 0) fail(`${bankPath} 的架构题名表未解析到任何考期行`);

  const archStart = client.indexOf("id: 'arch'");
  if (archStart < 0) fail("client.js 未找到 arch 科目数据");
  const archSlice = archStart < 0 ? "" : client.slice(archStart, client.indexOf("];", archStart));
  const panelRows = new Map();
  for (const match of archSlice.matchAll(/year:\s*'(\d{4}\/\d{2})',\s*titles:\s*\[([^\]]*)\]/g)) {
    panelRows.set(match[1], [...match[2].matchAll(/'([^']*)'/g)].map((item) => clean(item[1])));
  }

  const onlyBank = [...bankRows.keys()].filter((year) => !panelRows.has(year));
  const onlyPanel = [...panelRows.keys()].filter((year) => !bankRows.has(year));
  if (onlyBank.length > 0) fail(`面板缺少考期：${onlyBank.join(", ")}`);
  if (onlyPanel.length > 0) fail(`题库表缺少考期：${onlyPanel.join(", ")}`);
  const mismatched = [];
  for (const [year, titles] of bankRows) {
    const other = panelRows.get(year) ?? [];
    const missing = titles.filter((title) => !other.includes(title));
    const extra = other.filter((title) => !titles.includes(title));
    if (missing.length > 0 || extra.length > 0) {
      mismatched.push(`${year}（题库独有：${missing.join("、") || "无"}；面板独有：${extra.join("、") || "无"}）`);
    }
  }
  if (mismatched.length > 0) fail(`架构题名面板与题库表不一致：${mismatched.join("；")}`);
  else if (bankRows.size > 0) {
    ok(`架构题名面板与题库表一致（${bankRows.size} 个考期，${[...bankRows.values()].reduce((total, list) => total + list.length, 0)} 道题）`);
  }

  // 考期覆盖：2016—2026 每年至少一次，2024／2025 各两次，共 13 个考期
  const years = [...bankRows.keys()].map((year) => year.slice(0, 4));
  const missingYears = [];
  for (let year = 2016; year <= 2026; year += 1) if (!years.includes(String(year))) missingYears.push(String(year));
  const notDoubled = ["2024", "2025"].filter((year) => years.filter((item) => item === year).length !== 2);
  if (missingYears.length > 0) fail(`架构表未覆盖这些年度：${missingYears.join(", ")}`);
  if (notDoubled.length > 0) fail(`架构表这些年度应各有两个考期：${notDoubled.join(", ")}`);
  if (bankRows.size !== 13) fail(`架构表应有 13 个考期，实际 ${bankRows.size} 个`);

  // 题型骨架必须带合法 tag，且字典有对应文案
  const skeletons = [...client.matchAll(/\{\s*name:\s*'([^']+)'\s*,\s*tag:\s*'([^']+)'/g)].map((match) => ({ name: match[1], tag: match[2] }));
  if (skeletons.length === 0) fail("client.js 未解析到任何题型骨架");
  const badTag = skeletons.filter((skeleton) => !["general", "sas", "arch"].includes(skeleton.tag));
  if (badTag.length > 0) fail(`题型骨架的 tag 非法：${badTag.map((item) => `${item.name}=${item.tag}`).join(", ")}`);
  const declaredTags = [...new Set(skeletons.map((skeleton) => skeleton.tag))];
  for (const value of ["all", ...declaredTags]) {
    if (!client.includes(`'tag.${value}':`)) fail(`client.js 缺少字典键 tag.${value}`);
  }

  // zh／en 字典键集必须一致
  const keySet = (locale) => {
    const start = client.indexOf(`\n      ${locale}: {`);
    const block = start < 0 ? "" : client.slice(start, client.indexOf("\n      },", start));
    return [...block.matchAll(/'([a-z][a-zA-Z.]*)':/g)].map((match) => match[1]).sort();
  };
  const zhKeys = keySet("zh");
  const enKeys = keySet("en");
  if (zhKeys.length === 0 || enKeys.length === 0) fail("client.js 的 zh／en 字典未解析到键");
  else if (zhKeys.join(",") !== enKeys.join(",")) {
    const missingEn = zhKeys.filter((key) => !enKeys.includes(key));
    const missingZh = enKeys.filter((key) => !zhKeys.includes(key));
    fail(`client.js 的 zh／en 字典键集不一致（en 缺：${missingEn.join(", ") || "无"}；zh 缺：${missingZh.join(", ") || "无"}）`);
  } else {
    ok(`client 字典 zh／en 键集一致（${zhKeys.length} 键），${skeletons.length} 类题型骨架均有合法 tag`);
  }
} catch (error) {
  fail(`面板与题库一致性检查失败：${error.message}`);
}

// 5) 技能引用的公开索引必须存在
for (const required of [
  "assets/ruankao-essay-bank/references/topic-index-lite.md",
  "assets/ruankao-essay-bank/references/article_question.md",
  "assets/ruankao-essay-writing/references/writing-rules.md",
  "LICENSE",
  "README.md",
  "CHANGELOG.md",
]) {
  if (!existsSync(join(root, required))) fail(`缺少必备文件：${required}`);
}
ok(`必备文件齐全（${statSync(join(root, "README.md")).size} 字节 README 等）`);

// 6) references/ 下只允许公开文件进入版本控制（本地资料用 .git/info/exclude 忽略）
const PUBLIC_REFERENCES = new Set([
  "assets/ruankao-essay-bank/references/topic-index-lite.md",
  "assets/ruankao-essay-bank/references/article_question.md",
  "assets/ruankao-essay-writing/references/writing-rules.md",
]);
try {
  const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const unexpected = tracked.filter(
    (file) => file.includes("/references/") && !PUBLIC_REFERENCES.has(file),
  );
  if (unexpected.length > 0) {
    fail(`references/ 下出现了不应入库的文件：${unexpected.join(", ")}`);
  } else {
    ok("references/ 下只有公开文件被跟踪（本地资料未入库）");
  }
} catch {
  ok("未检测到 git 环境，跳过版本控制检查");
}

// 7) 发布白名单只能包含仓库已跟踪的文件
//    git 排除了本地资料，但 npm 不看 git——files 里写目录会把本地资料一起打包发布。
const alwaysPacked = new Set(["package.json", "README.md", "LICENSE", "CHANGELOG.md"]);
try {
  const trackedSet = new Set(
    execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
  const walk = (relative) => {
    const absolute = join(root, relative);
    if (!existsSync(absolute)) return [];
    if (statSync(absolute).isFile()) return [relative.replaceAll("\\", "/")];
    const out = [];
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const child = `${relative}/${entry.name}`;
      out.push(...(entry.isDirectory() ? walk(child) : [child.replaceAll("\\", "/")]));
    }
    return out;
  };
  const published = (pkg.files ?? []).flatMap((pattern) => walk(pattern));
  const leaks = published.filter((file) => !trackedSet.has(file) && !alwaysPacked.has(file));
  if (leaks.length > 0) {
    fail(`发布白名单会带上未纳入版本控制的文件（可能是本地资料）：${leaks.join(", ")}`);
  } else {
    ok(`发布白名单只含已跟踪文件（${published.length} 个，另有 package.json 等固定项）`);
  }
  // 完整性：每个技能的 SKILL.md 都必须在发布白名单里，否则打包/安装会漏技能
  const missingSkills = skillNames
    .map((name) => `assets/${name}/SKILL.md`)
    .filter((file) => !published.includes(file));
  if (missingSkills.length > 0) fail(`发布白名单缺少技能文件：${missingSkills.join(", ")}`);
  else ok(`发布白名单包含全部 ${skillNames.length} 个技能的 SKILL.md`);
} catch {
  ok("未检测到 git 环境，跳过发布白名单检查");
}

// 8) private 包不得出现 npm 发布流程（本仓库不发布 npm）
try {
  const workflowDir = join(root, ".github/workflows");
  const workflows = existsSync(workflowDir)
    ? readdirSync(workflowDir).filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    : [];
  const publishing = workflows.filter((name) =>
    /npm\s+publish|pnpm\s+publish/.test(readFileSync(join(workflowDir, name), "utf8")),
  );
  if (pkg.private === true && publishing.length > 0) {
    fail(`package.json 是 private，但工作流里有 npm 发布步骤：${publishing.join(", ")}`);
  } else if (pkg.private === true) {
    ok(`未发布 npm（private: true，${workflows.length} 个工作流均无发布步骤）`);
  } else {
    ok(`工作流：${workflows.join(", ") || "无"}`);
  }
} catch (error) {
  fail(`工作流检查失败：${error.message}`);
}

report();

function report() {
  for (const note of notes) console.log(`  ok  ${note}`);
  if (problems.length > 0) {
    for (const problem of problems) console.error(`  !!  ${problem}`);
    console.error(`\n清单校验失败：${problems.length} 项`);
    process.exit(1);
  }
  console.log(`\n清单校验通过：${notes.length} 项`);
}
