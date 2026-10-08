/**
 * Client half: 在 DSH Web UI 的对话区注册「软考题库速查」面板。
 *
 * - 文案通过 Client locale 服务的命名空间字典提供（zh / en 各一份，键集一致）；
 * - 数据只包含公开内容：两个科目的历年考试题名、通用理论骨架、机考写作规格与官方评分口径；
 * - 注册在 conversation.composer.dock（已分配空间的槽位），不接管页面根节点。
 */

window.__ModuleLoader__.load({
  id: 'dsh-ruankao-essay',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'ruankao-essay.panel';

    // ---- 公开数据：历年题名（按科目分组）----
    // 题名来自公开站点汇总（核实日期 2026-10-08）；面板只呈现题名，不带来源标记。
    const SUBJECTS = [
      {
        id: 'sas',
        labelKey: 'subject.sas',
        exams: [
          { year: '2026/05', titles: ['信息系统安全保障规划与设计', 'LLM 大模型在软件测试中的应用', '需求评审在软件项目中的应用', '软件架构风格'] },
          { year: '2025/11', titles: ['系统成本效益分析方法', '多种软件设计模式在项目中的应用', '软件测试技术的应用', '云计算运维'] },
          { year: '2025/05', titles: ['信息系统运维管理技术与应用', '软件系统测试方法及应用', '信息系统开发方法及应用', '模型驱动分析方法及应用'] },
          { year: '2024/11', titles: ['静态测试方法及其应用', 'DevOps 在开发时的应用', '业务流程分析方法及其应用', '信息系统运维管理流程'] },
          { year: '2024/05', titles: ['基于架构的软件设计', '性能测试方法及其应用', '多源数据集成方法及其应用', '云原生应用开发'] },
          { year: '2023/05', titles: ['信息系统的可行性分析', 'DevOps 及其应用', '敏捷开发方法（Scrum）', '信息系统数据转换和迁移'] },
          { year: '2022/05', titles: ['原型法及其在信息系统开发中的应用', '面向对象设计方法及其应用'] },
          { year: '2021/05', titles: ['面向对象的信息系统分析方法', '静态测试方法及应用', '富互联网应用的客户端开发技术', 'DevSecOps 技术及其应用'] },
          { year: '2020/11', titles: ['面向服务的信息系统开发方法及其应用', '快速应用开发方法（RAD）及其应用', '软件设计模式及其应用', '遗留系统演化策略及其应用'] },
          { year: '2019/05', titles: ['系统需求分析方法', '系统自动化测试及其应用', '处理流程设计方法及应用', '企业智能运维技术与方法'] },
          { year: '2018/05', titles: ['信息系统开发方法论', '软件构件管理及其应用', '软件系统需求获取技术及应用', '数据挖掘方法及应用'] },
          { year: '2017/05', titles: ['需求分析方法及应用', '企业应用集成', '数据流图在系统分析与设计中的应用', '软件的系统测试及其应用'] },
          { year: '2016/05', titles: ['软件需求验证方法及其应用', '软件的系统测试及其应用', '软件开发模型及应用', '信息系统规划及实践'] },
        ],
      },
      {
        id: 'arch',
        labelKey: 'subject.arch',
        exams: [
          { year: '2026/05', titles: ['论向量数据库在项目中的应用', '论系统高并发系统的设计与实践', '论六边形架构的设计与应用', '论多模态大模型在移动智能测试框架中的应用'] },
          { year: '2025/11', titles: ['论 Serverless 架构模式', '论基于云原生数据库的企业信息系统架构设计', '性能测试技术及其应用', '论秒杀场景及其技术解决方案'] },
          { year: '2025/05', titles: ['论软件测试方法及应用', '论多模型数据库及应用', '论事件驱动架构', '论负载均衡技术'] },
          { year: '2024/11', titles: ['论面向服务的架构设计', '论软件维护及其应用', '论多源异构数据集成方法', '论分布式事务及其解决方案'] },
          { year: '2024/05', titles: ['论大数据 Lambda 架构', '论模型驱动架构设计方法及其应用', '论单元测试方法及应用', '论云上自动化运维及其应用'] },
          { year: '2023/11', titles: ['论边缘计算及其应用', '论多源数据集成及应用', '论面向对象的建模及应用', '论软件的可靠性评价'] },
          { year: '2022/11', titles: ['论基于构件的软件开发方法及其应用', '论软件维护方法及其应用', '论区块链技术及其应用', '论湖仓一体架构及其应用'] },
          { year: '2021/11', titles: ['论面向方面的编程技术及其应用', '论系统安全架构设计及其应用', '论企业集成平台的理解与应用', '论微服务架构及其应用'] },
          { year: '2020/11', titles: ['论数据分片技术及其应用', '论云原生架构及其应用', '论软件测试中缺陷管理及其应用', '论企业集成架构设计及其应用'] },
          { year: '2019/11', titles: ['论软件设计方法及其应用', '论软件系统架构评估及其应用', '论数据湖技术及其应用', '论负载均衡技术'] },
          { year: '2018/11', titles: ['论软件开发过程 RUP 及其应用', '论软件体系结构的演化', '论面向服务架构设计及其应用', '论 NoSQL 数据库技术及其应用'] },
          { year: '2017/11', titles: ['论软件架构风格', '论软件系统建模方法及其应用', '论无服务器架构及其应用', '论软件质量保证及其应用'] },
          { year: '2016/11', titles: ['论软件系统架构评估', '论软件设计模式及其应用', '论数据访问层设计技术及其应用', '论微服务架构及其应用'] },
        ],
      },
    ];

    const SITTINGS = SUBJECTS.reduce((total, subject) => total + subject.exams.length, 0);

    // ---- 公开数据：题型骨架要点（教科书层面的分类清单，tag = 适用科目）----
    const SKELETONS = [
      { name: '软件测试', tag: 'general', points: ['系统测试六项内容：功能性／健壮性／性能／界面／安全性／安装与反安装', '静态：桌前检查、代码走查、代码审查', '动态：黑盒（等价类、边界值）＋白盒（语句、判定、条件、路径）', '策略：全过程测试、突出测试重点、测试度量'] },
      { name: '架构风格', tag: 'arch', points: ['数据流：批处理、管道—过滤器', '调用返回：主程序—子程序、面向对象、层次结构', '独立构件：进程通信、事件驱动', '虚拟机：解释器、基于规则；仓库：数据库、黑板'] },
      { name: 'ABSD', tag: 'arch', points: ['架构需求 → 架构设计 → 架构文档化 → 架构复审 → 架构实现 → 架构演化'] },
      { name: '质量属性与架构评估', tag: 'arch', points: ['质量属性：性能、可用性、安全性、可修改性、可测试性、易用性', '属性场景六要素：刺激源、刺激、环境、制品、响应、响应度量', 'SAAM 侧重可修改性；ATAM 输出敏感点、权衡点、风险点、非风险点', '步骤：介绍方法 → 描述架构 → 生成效用树 → 分析架构 → 归纳结果'] },
      { name: '数据架构', tag: 'arch', points: ['数据仓库先建模、面向报表；数据湖存原始数据、模式读取时确定；湖仓一体补事务与模式管理', 'Lambda 架构：批处理层＋速度层＋服务层', '数据分片：范围／哈希／一致性哈希，配套路由与扩容；向量数据库走近似最近邻检索'] },
      { name: '架构模式补充', tag: 'arch', points: ['六边形架构（端口与适配器）：业务核心与外部技术隔离、依赖倒置', '事件驱动：生产者／事件通道／消费者解耦，最终一致性与幂等消费', 'Serverless：函数即服务＋后端即服务，按调用计费、自动弹性，注意冷启动与超时'] },
      { name: '微服务', tag: 'general', points: ['按业务能力拆分；独立部署、技术异构、故障隔离、按需扩展', '治理：注册配置、网关、限流熔断、链路追踪', '一致性：TCC／本地消息表＋幂等／只读视图'] },
      { name: '企业集成', tag: 'general', points: ['界面（页面）／数据（数据访问层）／应用（程序内部结构）／业务流程', '门户、ESB（协议与格式转换、服务路由）、数据总线、数据仓库与集市'] },
      { name: '安全与保密', tag: 'general', points: ['网络硬件层：DMZ、防火墙、防毒墙、反向代理、物理隔离、跳板机', '数据层：存储加密、权限细分、全量／增量／差量备份、多机房容灾', '应用层：RBAC、双因素、MD5＋salt、令牌机制'] },
      { name: '容错与避错', tag: 'general', points: ['冗余：结构／时间／信息／冗余附加', 'N 版本程序设计、恢复块方法、防卫式程序设计'] },
      { name: '设计模式', tag: 'general', points: ['四要素：模式名称、适应场景、解决方案、效果', '三类：创建型 5、结构型 7、行为型 11'] },
      { name: '分布式数据库', tag: 'general', points: ['选型 → 设计 → 数据集成 → 测试 → 部署；位置透明；两阶段提交保一致'] },
      { name: '数据挖掘', tag: 'sas', points: ['KDD：问题定义 → 数据准备 → 建模 → 评估 → 部署 → 维护', '方法：分类、聚类、关联分析（＋回归、序列模式）'] },
      { name: '需求工程', tag: 'sas', points: ['获取：访谈、问卷、现场观摩、阅读历史文档（各有适用场景）', '分析：数据字典为核心，配合 DFD 与 STD', '管理：变更管理、版本控制、双向跟踪、状态管理'] },
      { name: '过程与项目管理', tag: 'general', points: ['过程改进：职责分离、同行与专家评审、版本控制、测试独立', '挣值分析：PV／EV／AC，费用偏差 EV−AC、进度偏差 EV−PV', '甘特图与里程碑；质量计划／保证／控制'] },
      { name: '信息化战略', tag: 'sas', points: ['信息工程方法（James Martin）＋BSP：企业过程、数据类、过程／数据类矩阵', '数据环境：DB＋ODS＋DW'] },
      { name: '云原生', tag: 'arch', points: ['原则：服务化、弹性、可观测、韧性、自动化、零信任、持续演进', '模式：服务化、Mesh、Serverless、存储计算分离、分布式事务、可观测、事件驱动'] },
      { name: 'DevSecOps', tag: 'general', points: ['在规划／开发／交付／运营四阶段分别嵌入威胁建模、静态扫描、门禁、运行时防护'] },
      { name: '遗留系统演化', tag: 'arch', points: ['评价：业务价值与技术水准两维', '策略：淘汰／继承／改造／集成', '转换：直接／并行／分段；数据迁移三方法'] },
      { name: '敏捷与 Scrum', tag: 'sas', points: ['角色：产品负责人／Scrum Master／开发团队（自组织、跨功能）', '工件：产品待办列表／迭代待办列表／产品增量', '活动：迭代、迭代计划会议、每日站会、迭代评审会议、迭代回顾会议', '配套：待办列表梳理、燃尽图；敏捷宣言四价值与十二原则'] },
    ];

    const TAGS = ['all', 'general', 'sas', 'arch'];

    const RULES = [
      '摘要 ≤300 字（含标点）：行业与业务痛点 → 本人角色与主要工作 → 本文的技术视角；摘要里不写「摘要」二字',
      '正文 2000~2500 字（含标点）：机考输入框超过 2500 就无法提交',
      '部分配比：项目背景 400~500／技术方法说明 400~500（回应子题目 2）／论点两段各约 500（回应子题目 3）／结尾 300~450',
      '不写标题、不写「背景／子题目」字眼、不用「第一／首先／一是」式分点；正文不出现直引号',
      '允许「笔者／我们」；建设期（年＋月）只写在摘要；正文至少 3 段带具体数字',
      '每个论点配一条项目真实业务实例（业务场景＋数据量＋结果）',
      '结尾写量化成效与对该方法的理性认识，不写「不足之处／改进措施／下一步将」',
      '官方评分：切合题意 30%／应用深度与水平 20%／实践性 20%／表达能力 15%／综合与分析 15%；虚构、空洞、篇幅过短可能判不及格',
    ];

    // ---- 文案字典：zh / en 键集必须一致 ----
    const DICT = {
      zh: {
        'panel.open': '题库速查',
        'panel.close': '收起题库',
        'panel.summary': '{sittings} 个考期 · {topics} 类题型',
        'panel.hint': '真题题名 / 题型骨架 / 写作规格',
        'tab.exam': '历年真题',
        'tab.theory': '题型骨架',
        'tab.rules': '写作规格',
        'subject.label': '科目',
        'subject.sas': '系统分析师',
        'subject.arch': '系统架构设计师',
        'filter.label': '按考期',
        'filter.all': '全部考期',
        'filter.empty': '该考期暂无记录',
        'tag.label': '适用科目',
        'tag.all': '全部',
        'tag.general': '通用',
        'tag.sas': '系分',
        'tag.arch': '架构',
      },
      en: {
        'panel.open': 'Topic bank',
        'panel.close': 'Hide topic bank',
        'panel.summary': '{sittings} sittings · {topics} topic groups',
        'panel.hint': 'titles / theory skeletons / writing spec',
        'tab.exam': 'Exam titles',
        'tab.theory': 'Theory skeletons',
        'tab.rules': 'Writing spec',
        'subject.label': 'Subject',
        'subject.sas': 'Systems Analyst',
        'subject.arch': 'Systems Architect',
        'filter.label': 'Sitting',
        'filter.all': 'All sittings',
        'filter.empty': 'No record for this sitting',
        'tag.label': 'Applies to',
        'tag.all': 'All',
        'tag.general': 'General',
        'tag.sas': 'Analyst',
        'tag.arch': 'Architect',
      },
    };

    const surface = 'rgba(127,127,127,0.10)';
    const border = '1px solid rgba(127,127,127,0.28)';

    function TopicBank(props) {
      const t = props.t;
      const [open, setOpen] = React.useState(false);
      const [tab, setTab] = React.useState('exam');
      const [subject, setSubject] = React.useState('sas');
      const [year, setYear] = React.useState('all');
      const [tag, setTag] = React.useState('all');

      const box = { maxHeight: '42vh', overflow: 'auto', padding: '8px 10px', border: border, borderRadius: 8, marginTop: 6, background: surface, fontSize: 13, lineHeight: 1.55 };
      const chip = { padding: '2px 8px', border: border, borderRadius: 999, background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 12, marginRight: 6 };
      const chipOn = { ...chip, background: 'rgba(127,127,127,0.22)', fontWeight: 600 };
      const select = { ...chip, marginRight: 0, padding: '2px 6px' };
      const row = { marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' };

      const current = SUBJECTS.find((item) => item.id === subject) || SUBJECTS[0];
      const exams = year === 'all' ? current.exams : current.exams.filter((item) => item.year === year);
      const skeletons = tag === 'all' ? SKELETONS : SKELETONS.filter((item) => item.tag === tag);

      const body = tab === 'exam'
        ? h('div', null,
            h('div', { style: row },
              h('span', { style: { opacity: 0.75 } }, t('subject.label')),
              SUBJECTS.map((item) => h('button', {
                key: item.id,
                type: 'button',
                style: subject === item.id ? chipOn : chip,
                onClick: () => { setSubject(item.id); setYear('all'); },
              }, t(item.labelKey)))
            ),
            h('div', { style: row },
              h('span', { style: { opacity: 0.75 } }, t('filter.label')),
              h('select', {
                value: year,
                onChange: (event) => setYear(event.target.value),
                style: select,
              },
                h('option', { value: 'all' }, t('filter.all')),
                current.exams.map((item) => h('option', { key: item.year, value: item.year }, item.year))
              )
            ),
            exams.length === 0
              ? h('div', { style: { opacity: 0.7 } }, t('filter.empty'))
              : exams.map((item) => h('div', { key: item.year, style: { marginBottom: 6 } },
                  h('span', { style: { fontWeight: 600, marginRight: 6 } }, item.year),
                  h('span', null, item.titles.join('；'))
                ))
          )
        : tab === 'theory'
          ? h('div', null,
              h('div', { style: row },
                h('span', { style: { opacity: 0.75 } }, t('tag.label')),
                TAGS.map((value) => h('button', {
                  key: value,
                  type: 'button',
                  style: tag === value ? chipOn : chip,
                  onClick: () => setTag(value),
                }, t('tag.' + value)))
              ),
              skeletons.length === 0
                ? h('div', { style: { opacity: 0.7 } }, t('filter.empty'))
                : skeletons.map((skeleton) => h('div', { key: skeleton.name, style: { marginBottom: 8 } },
                    h('div', { style: { fontWeight: 600 } }, skeleton.name + ' · ' + t('tag.' + skeleton.tag)),
                    h('ul', { style: { margin: '2px 0 0 18px', padding: 0 } }, skeleton.points.map((point, index) => h('li', { key: index }, point)))
                  ))
            )
          : h('ul', { style: { margin: 0, paddingLeft: 18 } }, RULES.map((rule, index) => h('li', { key: index, style: { marginBottom: 4 } }, rule)));

      return h('div', { style: { fontSize: 13, color: 'inherit' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          h('button', {
            type: 'button',
            onClick: () => setOpen(!open),
            style: { ...chip, marginRight: 0 },
            title: t('panel.open'),
          }, (open ? t('panel.close') : t('panel.open')) + ' · ' + t('panel.summary', { sittings: SITTINGS, topics: SKELETONS.length })),
          h('span', { style: { opacity: 0.7, fontSize: 12 } }, t('panel.hint'))
        ),
        open && h('div', { style: box },
          h('div', { style: { marginBottom: 6 } },
            h('button', { type: 'button', style: tab === 'exam' ? chipOn : chip, onClick: () => setTab('exam') }, t('tab.exam')),
            h('button', { type: 'button', style: tab === 'theory' ? chipOn : chip, onClick: () => setTab('theory') }, t('tab.theory')),
            h('button', { type: 'button', style: tab === 'rules' ? chipOn : chip, onClick: () => setTab('rules') }, t('tab.rules'))
          ),
          body
        )
      );
    }

    return {
      // 只依赖 slots：与 DSH 自带 decoration 模板一致的最小依赖形态，减少激活失败面。
      inject: ['slots'],
      apply(ctx) {
        // 文案：宿主提供 locale 服务时优先走 Client locale 字典（可随语言切换），
        // 否则退回内置中文文案。两种情况都不影响面板渲染。
        const fallback = DICT.zh;
        let t = (key, params) => {
          const template = fallback[key] ?? key;
          if (!params) return template;
          return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
        };
        try {
          if (ctx.locale && typeof ctx.locale.register === 'function') {
            ctx.effect(() => ctx.locale.register(NS, DICT), 'ruankao-essay: locale dictionary');
            t = ctx.locale.bind(NS);
          }
        } catch (error) {
          ctx.logger?.warn?.('ruankao-essay: locale 不可用，使用内置文案：' + String(error));
        }
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock',
          id: 'ruankao-topic-bank',
          order: 6,
        }, (props) => h(TopicBank, { ...props, t })));
      },
    };
  },
});
