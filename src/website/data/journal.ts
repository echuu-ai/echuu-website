/**
 * 短记录。内容来自主仓库 BlogPage.tsx 已有条目，
 * 没有的语言标明源文语言，不生成伪造长文、日期或指标。
 */
export type JournalNote = {
  id: string;
  category: 'product' | 'research';
  /** 来源文件，保留可追溯依据。 */
  source: string;
  title: Record<string, string>;
  body: Record<string, string>;
};

export const JOURNAL_NOTES: JournalNote[] = [
  {
    id: 'first-appearance',
    category: 'product',
    source: 'echuu-ux-r3f-vite/src/components/BlogPage.tsx',
    title: {
      zh: '角色第一次登场，怎么设计？',
      ja: 'キャラクターの初登場をどう設計するか',
      en: 'How should a character first appear?',
      ko: '캐릭터의 첫 등장을 어떻게 설계할까',
    },
    body: {
      zh:
        '一次有镜头语言的角色初见：出场不只是把模型放上舞台，镜头的距离和停留时间决定观众记住什么。',
      ja: 'カメラワークのある初対面。登場はモデルを舞台に置くことではなく、距離と間の取り方が印象を決めます。',
      en: 'Introducing a character through camera language: an entrance is not just placing a model on stage. Distance and timing decide what viewers remember.',
      ko: '카메라 언어가 있는 첫 만남. 등장은 모델을 무대에 올리는 일이 아니라, 거리와 머무는 시간이 인상을 정합니다.',
    },
  },
  {
    id: 'expression-continuity',
    category: 'product',
    source: 'echuu-ux-r3f-vite/src/components/BlogPage.tsx',
    title: {
      zh: '表情不是装饰，而是角色连续性',
      ja: '表情は装飾ではなく、キャラクターの連続性',
      en: 'Expression is character continuity',
      ko: '표정은 장식이 아니라 캐릭터의 연속성',
    },
    body: {
      zh: '表情如果和上一句话对不上，观众会先感到角色断开，然后才注意到技术问题。',
      ja: '直前のせりふと表情が合わないと、視聴者はまずキャラクターの断絶を感じ、そのあとで技術的な問題に気づきます。',
      en: 'When an expression does not match the previous line, viewers feel the character break first, and notice the technical problem second.',
      ko: '표정이 앞 대사와 맞지 않으면, 시청자는 기술 문제보다 먼저 캐릭터가 끊겼다고 느낍니다.',
    },
  },
  {
    id: 'ai-disclosure-note',
    category: 'product',
    source: 'echuu-ux-r3f-vite/src/components/BlogPage.tsx',
    title: {
      zh: '清楚说明什么由 AI 参与生成',
      ja: 'AI が関わる部分を明確に示す',
      en: 'Clearly disclosing where AI is involved',
      ko: 'AI가 관여한 부분을 분명히 밝히기',
    },
    body: {
      zh: '观众有权知道哪一部分由 AI 生成。把这件事写清楚，比事后解释更省力。',
      ja: 'どの部分が AI によるものかを視聴者は知る権利があります。先に明記するほうが、あとから説明するより確実です。',
      en: 'Viewers deserve to know which parts are AI generated. Saying so up front is easier than explaining afterwards.',
      ko: '어느 부분이 AI가 만든 것인지 시청자는 알 권리가 있습니다. 먼저 밝히는 편이 나중에 설명하는 것보다 낫습니다.',
    },
  },
];

/** 目前没有可发表的研究记录。 */
export const RESEARCH_NOTES: JournalNote[] = [];
