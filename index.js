import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

/**
 * 软考系统分析师／系统架构设计师论文助手 —— 技能提供者插件。
 *
 * 把一个 workspace 目录里的 SKILL.md 目录树注册成三个技能：
 * - ruankao-essay-writing：写作与改写总纲
 * - ruankao-essay-bank：题库、理论骨架、写作规范
 * - ruankao-essay-review：成稿的逐段自评与改写建议
 *
 * 技能正文与其 references/ 都在包的 assets/ 下，按目录资源基（resourceBase）
 * 暴露，模型可用 file 工具按相对路径读取。
 *
 * 本插件**不 import 任何 @deepseek-ai/* 包**：profile 安装时这些包由宿主提供，
 * 解析方式随宿主而异；不依赖它们能让插件在各种安装方式下都正常加载。
 *
 * @module dsh-ruankao-essay
 */

const PROVIDER_NAME = "ruankao-essay";
/** index.js 在包根目录，资源基是同级 ./assets/（不是 ../assets/）。 */
const ASSETS_BASE = new URL("./assets/", import.meta.url);

/** 与 @deepseek-ai/dsh-skill 的 BUNDLED_SKILL_RANK 对齐：打包型技能提供者的标准优先级。 */
const SKILL_RANK = 600;

/** 本插件提供的技能清单（目录名＝技能名）。 */
const SKILLS = [
  {
    dir: "ruankao-essay-writing",
    name: "ruankao-essay-writing",
    description:
      "软考系统分析师／系统架构设计师论文写作与改写总纲（2026-10 机考口径）。Write or rewrite a Chinese Soft Exam (软考) 系统分析师 or 系统架构设计师 essay from a 论文题目 (with its 三个子题目) or from the user's draft against the current computer-based-exam spec: a standalone 摘要 of ≤300 characters plus a 正文 of 2000~2500 characters, part-by-part word budgets (项目背景 / 技术方法说明 / 论点两段 / 结尾), explicit sub-question coverage, at least one real project instance per argument, a quantified closing that reflects on the method instead of listing weaknesses, and delivery as a Word .doc plus .md. Use whenever the task is 软考系分／架构论文, 论文改写, 论文押题, or 考场论文成稿.",
  },
  {
    dir: "ruankao-essay-review",
    name: "ruankao-essay-review",
    description:
      "软考系统分析师／系统架构设计师论文自评与批改（2026-10 机考口径）。Review a finished Chinese Soft Exam (软考) 系统分析师 or 系统架构设计师 essay against the current computer-based-exam spec and the public scoring norms, then return a part-by-part verdict: 摘要≤300 / 正文 2000~2500 双框字数, part-by-part word budgets (项目背景 / 技术方法说明 / 论点两段 / 结尾), sub-question coverage, forbidden patterns (titles, 「背景／子题目」字眼, enumerated starters), theory-name coverage, project-instance grounding, quantified results, a closing that reflects on the method instead of listing weaknesses, and the official five scoring aspects; then propose concrete rewrites. Use when the user submits a draft or finished essay and asks to 自评, 批改, 打分, 查漏, or 提分, or asks whether an essay is ready to submit.",
  },
  {
    dir: "ruankao-essay-bank",
    name: "ruankao-essay-bank",
    description:
      "软考系统分析师／系统架构设计师论文题库与写作规范（2026-10 机考口径）。Look up Chinese Soft Exam (软考) 系统分析师 and 系统架构设计师 essay topics: the 2016–2026 真题 tables for both subjects, per-topic theory skeletons (including 敏捷与 Scrum 的角色／工件／活动, 质量属性与架构评估, 数据架构), the current writing specification (摘要≤300 字＋正文 2000~2500 字, part-by-part word budgets), the public scoring norms (five aspects and their weights, deduction and bonus items), and project-background guidance. Use when the user asks which 论文题目 exist, what theory points a topic needs, how long each part should be, what project or quantified data to cite, or before writing any 软考系分／架构 essay.",
  },
];

/** 去掉 YAML frontmatter，只把正文交给 harness（frontmatter 供文件系统方式复用）。 */
function stripFrontmatter(text) {
  if (!text.startsWith("---")) return text;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return text;
  const bodyStart = text.indexOf("\n", end + 1);
  if (bodyStart === -1) return "";
  return text.slice(bodyStart + 1).replace(/^[\r\n]+/, "");
}

/** 由清单项构造技能候选（含资源基与 locator，load 时复用）。 */
function candidateOf(entry) {
  const dir = new URL(`${entry.dir}/`, ASSETS_BASE);
  return {
    name: entry.name,
    description: entry.description,
    invocation: { modelInvocable: true, userInvocable: true },
    provider: PROVIDER_NAME,
    source: "plugin",
    resourceBase: { kind: "directory", path: fileURLToPath(dir) },
    rank: SKILL_RANK,
    locator: new URL("SKILL.md", dir),
  };
}

/** 提供者实现：list 返回全部候选，get 读取并返回技能定义。 */
const provider = {
  name: PROVIDER_NAME,
  list() {
    return Promise.resolve(SKILLS.map(candidateOf));
  },
  async get(candidate) {
    const wanted = typeof candidate === "string" ? candidate : candidate && candidate.name;
    const entry = SKILLS.find((skill) => skill.name === wanted);
    if (entry === undefined) throw new Error(`ruankao-essay: unknown skill "${String(wanted)}"`);
    const resolved = candidateOf(entry);
    const raw = await readFile(resolved.locator, "utf8");
    return {
      name: resolved.name,
      description: resolved.description,
      invocation: resolved.invocation,
      provider: resolved.provider,
      source: resolved.source,
      resourceBase: resolved.resourceBase,
      content: stripFrontmatter(raw),
    };
  },
};

/** Cordis 插件名。 */
const name = "ruankao-essay";
/** 依赖技能服务。 */
const inject = ["skills"];

/** 在 ctx.skills 上注册提供者。 */
function apply(ctx) {
  ctx.skills.registerProvider(() => provider);
}

export { apply, inject, name };
