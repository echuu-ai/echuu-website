/**
 * 简体中文是信息基准稿。其他三语表达相同事实与功能状态。
 * 文案来源：官网任务书（docs/website/CLAUDE_WEBSITE_PROMPT_ZH.md，主仓库）。
 */
export const zh = {
  localeName: '简体中文',
  htmlLang: 'zh-CN',

  nav: {
    brand: 'Echuu',
    home: '首页',
    demo: '看演示',
    how: '怎么开播',
    gallery: '角色展示',
    creators: '创作者合作',
    apply: '申请内测',
    menu: '菜单',
    close: '关闭',
    openMenu: '打开菜单',
    language: '语言',
    skipToContent: '跳到主要内容',
  },

  hero: {
    tagline: 'To recreate life out of live',
    taglineLineBreak: 'To recreate life / out of live',
    category: '为 Original Character 打造的 AI VTuber 平台',
    lede: '设定角色、选好话题，让 TA 讲故事，和观众互动。',
    ctaPrimary: '申请内测',
    ctaPrimaryEmail: '邮件申请内测',
    ctaSecondary: '看演示',
    status: '内测中，功能持续更新。',
    skyAlt: '',
  },

  video: {
    title: '先看 TA 说两句。',
    body: '一段角色开播实录。',
    play: '播放演示',
    statusBeta: '内测演示',
    statusLocal: '本地预研演示',
    unavailable: '播放器无法加载时，可以直接打开原视频。',
    openExternal: '在 YouTube 打开',
    posterAlt: '介绍视频封面',
  },

  steps: {
    title: '从设定到开播，三步。',
    items: [
      { no: '01', title: '选好形象', body: '使用示例角色，或上传你有权使用的 VRM 模型。' },
      { no: '02', title: '写下人设', body: '告诉我们 TA 的性格、经历和说话习惯。' },
      { no: '03', title: '定个话题', body: '写下这次想聊的事，预览后开始。' },
    ],
    guideLink: '看看准备指南',
    vrmNote: 'VRM 是一种 3D 角色模型格式。',
    stepTab: '第 {n} 步',
  },

  features: {
    title: '设定不只写在角色卡上。',
    items: [
      { title: '按人设说话', body: '让性格和经历，进入 TA 的表达。' },
      { title: '把话题讲成故事', body: '从一个话题开始，让角色有事可讲。' },
      { title: '让观众参与', body: '弹幕和礼物，可以影响接下来的故事。' },
    ],
    researchTag: '预研演示',
  },

  modes: {
    title: '今天杂谈，下一场呢？',
    items: [
      { name: '杂谈回', status: 'beta', body: '聊设定，讲故事，回应观众。' },
      { name: '观影回', status: 'dev', body: '和角色一起看视频，听 TA 的反应。' },
      { name: '歌回', status: 'dev', body: '让角色用歌声登场。' },
    ],
    statusBeta: '内测演示',
    statusDev: '制作中',
    footnote: '更多模式正在制作，开放时间待定。',
    toApply: '到内测联系区',
  },

  gallery: {
    title: '看看角色们的舞台。',
    demoOnly: '以下为产品演示素材。',
    labels: { character: '角色', creator: '创作者', type: '表演类型', status: '素材状态' },
    open: '查看演示与署名',
    more: '更多演示与署名',
    modalClose: '关闭',
    credits: '署名与来源',
    aiNote: 'AI 参与说明',
    noDownload: '本页不提供模型下载。',
  },

  creators: {
    title: '角色的起点，是创作者。',
    manifesto: '我们永远支持人类画手与 IP 创作。',
    body: '欢迎原画师、皮套画师和 3D 建模师，一起把角色带上舞台。',
    cta: '聊聊合作',
    secondary: '查看创作者与 IP 说明',
    intentsTitle: '三类合作意向',
    intents: [
      { title: '作品展示', body: '在官网或演示里展示你的作品，署名随作品一起出现。' },
      { title: '角色与模型合作', body: '原画、皮套或 3D 模型，讨论一次具体的角色合作。' },
      { title: '联合演示', body: '一起做一场演示，公开前先确认展示范围。' },
    ],
    disclaimer: '以上是合作意向说明。目前没有接单市场、订单系统、分成政策或官方认证。',
  },

  trust: {
    title: 'AI 做什么，角色属于谁。',
    items: [
      { title: 'AI 参与表演', body: '角色的对话、语音等表演内容可能由 AI 生成。' },
      { title: '角色权利不转移', body: '你对原创角色和素材保留原有权利；第三方素材遵循各自授权。' },
      { title: '展示另征同意', body: '申请内测或上传角色，不等于同意被官网展示。' },
    ],
    links: { ai: 'AI 内容披露', ip: '角色与素材权利', privacy: '隐私政策' },
  },

  journal: {
    title: '我们在做什么。',
    catAll: '全部',
    catProduct: '产品记录',
    catResearch: '研究记录',
    emptyResearch: '研究记录正在整理。',
    shortNote: '短记录',
    readAll: '看全部记录',
    source: '来源',
  },

  apply: {
    title: '下一位登场的，是你的 Original Character。',
    body: '想来试试？告诉我们怎么联系你。',
    cta: '申请内测',
    ctaEmail: '邮件申请内测',
    altContact: '也可以直接写信给我们。',
    copyEmail: '复制邮箱地址',
    copied: '已复制',
    emailSubject: '申请 Echuu 内测',
    emailBody: '你好 Echuu 团队：\n\n我想申请内测。\n\n联系邮箱：\n角色简介（选填）：\n作品链接（选填）：\n\n谢谢！',
    mailNote: '按钮会打开你的邮件客户端并预填主题；发送前你可以修改内容。',
  },

  community: {
    feedbackTitle: '哪里不顺手？',
    feedbackBody: '报个问题，或者告诉我们你想要什么。',
    feedbackCta: '写条建议',
    doodleTitle: '来这儿摸个鱼。',
    doodleBody: '给你的 Original Character 留个小涂鸦。',
    doodleCta: '去画两笔',
  },

  footer: {
    product: '产品',
    productLinks: { demo: '看演示', guide: '准备指南' },
    creators: '创作者',
    creatorLinks: { partner: '创作者合作', rights: '角色与素材权利' },
    community: '社区',
    communityLinks: { feedback: '意见箱', doodle: '涂鸦小角落', journal: '创作日志' },
    legal: '条款',
    legalLinks: { terms: '用户协议', privacy: '隐私政策', ai: 'AI 内容披露' },
    social: '社交',
    contact: '联系我们',
    rights: 'Echuu。角色权利属于各自创作者。',
    draftNotice: '用户协议仍有草案和占位项，以文件内标注为准。',
  },

  feedbackPage: {
    title: '意见箱',
    lede: '报个问题，或者告诉我们你想要什么。',
    category: '分类',
    categories: { bug: '使用问题', idea: '功能建议', other: '其他' },
    message: '内容',
    messagePlaceholder: '发生了什么？你期望的结果是什么？',
    contact: '联系方式（选填）',
    contactPlaceholder: '邮箱或社交账号，方便我们回复',
    submit: '打开邮件客户端发送',
    copy: '复制这条反馈',
    copied: '已复制',
    counter: '{n} / {max} 字符',
    tooLong: '内容超出长度上限，请精简后再发送。',
    required: '请先写下内容。',
    noBackendNotice: '目前没有接通收件服务。内容不会自动提交，需要你通过邮件发送或自行复制。',
    privacyNotice: '请不要填写账号密码或支付信息。我们没有实现匿名投递，邮件会带上你的发件地址。',
  },

  doodlePage: {
    title: '涂鸦小角落',
    lede: '给你的 Original Character 留个小涂鸦。',
    start: '开始画',
    color: '笔色',
    size: '笔粗',
    undo: '撤销',
    clear: '清空',
    export: '导出 PNG',
    saveLocal: '保存到本浏览器',
    restored: '已载入上次保存的涂鸦。',
    saved: '已保存到本浏览器。',
    unsaved: '有未保存的改动。',
    localOnly: '仅保存在当前浏览器，不会公开。',
    noPublicWall: '公开作品墙还没有接通存储与审核，暂不提供投稿。',
    canvasLabel: '涂鸦画布',
    textAlternative: '不方便画画？可以直接写信告诉我们。',
  },

  galleryPage: {
    title: '角色展示',
    lede: '演示素材与署名。',
    backHome: '回到首页',
  },

  creatorsPage: {
    title: '创作者合作',
    lede: '原画师、皮套画师与 3D 建模师的合作说明与联系方式。',
    howTitle: '怎么联系',
    howBody: '写信告诉我们你的作品链接和合作意向，我们会回复。邮件模板已经预填这几项。',
    emailSubject: 'Echuu 创作者合作',
    emailBody: '你好 Echuu 团队：\n\n我想聊聊合作。\n\n我的身份（原画师 / 皮套画师 / 3D 建模师 / 其他）：\n作品链接：\n合作意向（作品展示 / 角色与模型合作 / 联合演示）：\n\n谢谢！',
  },

  journalPage: {
    title: '创作日志',
    lede: '产品记录与研究记录。',
  },

  legal: {
    draftBadge: '含草案与占位项',
    sourceLang: '源文语言：简体中文',
    noTranslation: '这份文件目前只有中文原文，尚未提供本语言的审定译本。',
    openOriginal: '打开原文',
  },

  meta: {
    home: {
      title: 'Echuu — 为 Original Character 打造的 AI VTuber 平台',
      description: '设定角色、选好话题，让 TA 讲故事，和观众互动。Echuu 内测中。',
    },
    gallery: { title: '角色展示 — Echuu', description: 'Echuu 的角色演示素材与创作者署名。' },
    creators: { title: '创作者合作 — Echuu', description: '原画师、皮套画师与 3D 建模师的合作说明。' },
    journal: { title: '创作日志 — Echuu', description: 'Echuu 的产品记录与研究记录。' },
    feedback: { title: '意见箱 — Echuu', description: '报个问题，或者告诉我们你想要什么。' },
    doodle: { title: '涂鸦小角落 — Echuu', description: '给你的 Original Character 留个小涂鸦。' },
  },

  common: {
    notFound: '没有找到这个页面。',
    backHome: '回到首页',
    externalLink: '（外部链接）',
    loading: '加载中',
    pendingMaterial: '待取得素材',
    materialNote: '这里会放真实产品界面。素材取得并核对授权后替换。',
  },
} as const;

/** 把字面量类型放宽成 string，让其他语言文件必须提供同样的 key 与数组长度。 */
type Widen<T> = T extends string ? string : { readonly [K in keyof T]: Widen<T[K]> };
export type Dict = Widen<typeof zh>;
