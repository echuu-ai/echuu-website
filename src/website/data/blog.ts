import type { Locale } from '../i18n';

/**
 * 博客文章。四语正文都在这里维护；简体中文与英文来自原产品仓库 BlogPage.tsx 的三篇，
 * 日文 / 韩文为本次执行初稿（未母语审校）。不生成日期、阅读量等无来源的字段。
 */
export type BlogPost = {
  slug: string;
  tag: string;
  title: Record<Locale, string>;
  excerpt: Record<Locale, string>;
  /** 段落数组，按顺序渲染为 <p> */
  body: Record<Locale, string[]>;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'cinematic-character-onboarding',
    tag: 'PRODUCT DESIGN',
    title: {
      zh: '一次有镜头语言的角色初见',
      en: 'Introducing a character through camera language',
      ja: 'カメラワークのあるキャラクターとの初対面',
      ko: '카메라 언어가 있는 캐릭터와의 첫 만남',
    },
    excerpt: {
      zh: 'Echuu 的 onboarding 不只是填写表单。角色选择、人设与直播主题通过连续镜头连接，让创作者在开播前先与角色建立一次完整的视觉关系。',
      en: 'Onboarding in Echuu is more than a form. Character, persona, and stream topic are joined through continuous shots so creators meet their character before taking them live.',
      ja: 'Echuu のオンボーディングはフォーム入力ではありません。キャラクター選択・人物設定・配信テーマを連続したカメラワークでつなぎ、配信前にクリエイターがキャラクターと視覚的な関係を結びます。',
      ko: 'Echuu의 온보딩은 양식 작성이 아닙니다. 캐릭터 선택, 페르소나, 방송 주제를 연속된 카메라 샷으로 이어, 방송 전에 크리에이터가 캐릭터와 시각적 관계를 먼저 맺게 합니다.',
    },
    body: {
      zh: [
        '出场不只是把模型放上舞台。镜头的距离、停留时间和转场方式，决定观众会记住什么。我们把角色选择、人设填写和直播主题设定做成三段连续镜头：每一步角色都在同一个空间里，只是相机在移动。',
        '这样做的代价是每一步都要真正驱动 3D，而不是切换静态截图。但收益很直接：创作者在开播前已经看过角色的远景、近景与转身，对「TA 会怎么出现在观众面前」有了具体预期。',
        '目前这套镜头语言先用于 onboarding，之后会延伸到直播间的开场与结束卡。',
      ],
      en: [
        'An entrance is not just placing a model on stage. Camera distance, dwell time and the cut between shots decide what viewers remember. So character selection, persona writing and topic setting became three continuous shots: the character stays in one space while the camera moves.',
        'The cost is that every step drives real 3D instead of swapping screenshots. The payoff is concrete: before going live, creators have already seen their character in a wide shot, a close-up and a turn, and know how they will appear to an audience.',
        'This camera language starts in onboarding and will extend to the live room opening and the end card.',
      ],
      ja: [
        '登場とは、モデルを舞台に置くことではありません。カメラの距離、間、カット割りが、視聴者の記憶に残るものを決めます。キャラクター選択・人物設定・テーマ設定を三つの連続ショットにし、キャラクターは同じ空間に居続け、カメラだけが動きます。',
        '代償として、各ステップは静止画の切り替えではなく本物の 3D を駆動する必要があります。得られるのは具体的な予感です。配信前にクリエイターはキャラクターの引き、寄り、振り向きをすでに見ています。',
        'このカメラワークはまずオンボーディングに使い、配信ルームのオープニングとエンドカードへ広げていきます。',
      ],
      ko: [
        '등장은 모델을 무대에 올리는 일이 아닙니다. 카메라의 거리, 머무는 시간, 컷 전환이 시청자가 기억할 것을 정합니다. 그래서 캐릭터 선택, 페르소나 작성, 주제 설정을 세 개의 연속 샷으로 만들었습니다. 캐릭터는 같은 공간에 있고 카메라만 움직입니다.',
        '대가는 매 단계가 스크린샷 교체가 아니라 실제 3D를 구동해야 한다는 점입니다. 보상은 분명합니다. 방송 전에 크리에이터는 이미 캐릭터의 와이드 샷, 클로즈업, 돌아서는 모습을 보았고, 시청자 앞에 어떻게 나타날지 알게 됩니다.',
        '이 카메라 언어는 온보딩에서 시작해 라이브 룸의 오프닝과 엔드 카드로 확장됩니다.',
      ],
    },
  },
  {
    slug: 'blendshape-character-continuity',
    tag: 'CHARACTER PERFORMANCE',
    title: {
      zh: '表情不是装饰，而是角色连续性',
      en: 'Expression is character continuity',
      ja: '表情は装飾ではなく、キャラクターの連続性',
      ko: '표정은 장식이 아니라 캐릭터의 연속성',
    },
    excerpt: {
      zh: 'BlendShape、目光、姿态和镜头必须作为一个整体工作。我们的目标，是让角色在远景、近景和转场中都保留同一个性格，而不是在页面切换时变回静态模型。',
      en: 'BlendShapes, gaze, pose, and camera movement must work as one system. A character should retain the same personality in wide shots, close-ups, and transitions.',
      ja: 'BlendShape・視線・姿勢・カメラは一つのシステムとして動く必要があります。引きでも寄りでも転換の途中でも、キャラクターは同じ性格を保つべきです。',
      ko: 'BlendShape, 시선, 자세, 카메라는 하나의 시스템으로 움직여야 합니다. 와이드 샷, 클로즈업, 전환 중에도 캐릭터는 같은 성격을 유지해야 합니다.',
    },
    body: {
      zh: [
        '表情如果和上一句话对不上，观众会先感到角色断开，然后才注意到技术问题。所以我们把表情权重、注视目标和镜头参数放进同一份场景文件，由同一个时间线驱动。',
        '实际做法很朴素：创作者在调试台里调好 aa、happy、sad 这些通道和注视方式，导出的参数原样进入官网与直播间，不在代码里另猜数值。',
        '下一步是把眨眼、呼吸这类微动作也纳入同一套连续性规则，避免定格画面像一张截图。',
      ],
      en: [
        'When an expression does not match the previous line, viewers feel the character break first and notice the technical problem second. So expression weights, gaze targets and camera parameters live in one scene file, driven by one timeline.',
        'The practice is plain: creators tune channels such as aa, happy and sad plus the gaze mode in the debug console, and the exported values go straight into the website and the live room without re-guessing numbers in code.',
        'Next is bringing micro-motion such as blinking and breathing under the same continuity rules, so a held frame never reads as a screenshot.',
      ],
      ja: [
        '直前のせりふと表情が合わないと、視聴者はまずキャラクターの断絶を感じ、そのあとで技術的な問題に気づきます。そこで表情のウェイト、視線ターゲット、カメラ設定を一つのシーンファイルにまとめ、一つのタイムラインで駆動しています。',
        'やり方は素朴です。クリエイターがデバッグコンソールで aa・happy・sad などのチャンネルと視線モードを調整し、書き出した値をそのまま公式サイトと配信ルームに渡します。コード側で数値を推測し直しません。',
        '次はまばたきや呼吸のような微細な動きも同じ連続性のルールに含め、静止したフレームがスクリーンショットに見えないようにします。',
      ],
      ko: [
        '표정이 앞 대사와 맞지 않으면 시청자는 기술 문제보다 먼저 캐릭터가 끊겼다고 느낍니다. 그래서 표정 가중치, 시선 대상, 카메라 값을 하나의 씬 파일에 두고 하나의 타임라인으로 구동합니다.',
        '방법은 단순합니다. 크리에이터가 디버그 콘솔에서 aa, happy, sad 같은 채널과 시선 모드를 조정하면, 내보낸 값이 그대로 공식 사이트와 라이브 룸에 들어갑니다. 코드에서 숫자를 다시 추측하지 않습니다.',
        '다음은 눈 깜빡임과 호흡 같은 미세한 움직임도 같은 연속성 규칙에 넣어, 멈춘 화면이 스크린샷처럼 보이지 않게 하는 일입니다.',
      ],
    },
  },
  {
    slug: 'responsible-ai-disclosure',
    tag: 'RESPONSIBLE AI',
    title: {
      zh: '清楚说明什么由 AI 参与生成',
      en: 'Clearly disclosing where AI is involved',
      ja: 'AI が関わる部分を明確に示す',
      ko: 'AI가 관여한 부분을 분명히 밝히기',
    },
    excerpt: {
      zh: '观众应该能够识别 AI 驱动的虚拟角色与生成内容。Echuu 会持续完善标识、创作者责任与反馈渠道，让有生命力的表演和透明的信息披露同时成立。',
      en: 'Audiences should be able to identify AI-driven virtual characters and generated media. Echuu is developing clear labels, creator responsibilities, and feedback channels alongside expressive performance.',
      ja: '視聴者は AI 駆動の仮想キャラクターと生成コンテンツを見分けられるべきです。Echuu は表示、クリエイターの責任、フィードバック窓口を整え、生き生きとした演技と透明な開示を両立させます。',
      ko: '시청자는 AI로 구동되는 가상 캐릭터와 생성 콘텐츠를 알아볼 수 있어야 합니다. Echuu는 표시, 크리에이터 책임, 피드백 창구를 다듬어 생동감 있는 연기와 투명한 고지를 함께 세웁니다.',
    },
    body: {
      zh: [
        '观众有权知道哪一部分由 AI 生成。把这件事写清楚，比事后解释更省力。根据创作者启用的功能，对话、脚本、语音、歌唱、表情、动作或互动回应都可能由 AI 生成或辅助生成。',
        '我们在直播间、回放和官网都保留「AI 内容披露」的入口，并要求创作者对自己启用的功能负责。角色权利不转移：你对原创角色与素材保留原有权利，第三方素材遵循各自授权。',
        '披露文案会随功能变化更新，当前版本以条款页面为准。',
      ],
      en: [
        'Viewers deserve to know which parts are AI generated, and saying so up front is easier than explaining afterwards. Depending on the features a creator enables, dialogue, scripts, voice, singing, expressions, motion or interactive replies may be AI-generated or AI-assisted.',
        'The live room, replays and the website all keep an entry point to the AI content disclosure, and creators stay responsible for the features they enable. Character rights do not transfer: you keep your rights to your original character and assets, and third-party assets follow their own licences.',
        'The disclosure text will change as features change; the current version is the one on the legal pages.',
      ],
      ja: [
        '視聴者には、どの部分が AI によるものかを知る権利があります。先に明記するほうが、あとから説明するより確実です。クリエイターが有効にした機能に応じて、会話、台本、音声、歌、表情、動作、インタラクションの返答が AI 生成または AI 補助になることがあります。',
        '配信ルーム、リプレイ、公式サイトのすべてに AI コンテンツ開示への入口を置き、クリエイターは自分が有効にした機能に責任を持ちます。キャラクターの権利は移転しません。オリジナルキャラクターと素材の権利はあなたのものであり、第三者素材はそれぞれのライセンスに従います。',
        '開示文は機能の変化に合わせて更新します。現行版は規約ページを正とします。',
      ],
      ko: [
        '시청자는 어느 부분이 AI가 만든 것인지 알 권리가 있습니다. 먼저 밝히는 편이 나중에 설명하는 것보다 낫습니다. 크리에이터가 켠 기능에 따라 대화, 대본, 음성, 노래, 표정, 동작, 상호작용 응답이 AI 생성이거나 AI 보조일 수 있습니다.',
        '라이브 룸, 다시보기, 공식 사이트 모두에 AI 콘텐츠 고지 입구를 두고, 크리에이터는 자신이 켠 기능에 책임을 집니다. 캐릭터 권리는 이전되지 않습니다. 오리지널 캐릭터와 소재에 대한 권리는 당신에게 있으며, 제3자 소재는 각자의 라이선스를 따릅니다.',
        '고지 문구는 기능 변화에 따라 갱신되며, 현재 버전은 약관 페이지를 기준으로 합니다.',
      ],
    },
  },
];

export function findBlogPost(slug: string | undefined): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
