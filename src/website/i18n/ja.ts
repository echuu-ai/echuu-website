import type { Dict } from './zh';

/** 実行初稿。ネイティブによる最終校正は未実施（docs/OPEN_ITEMS.md 参照）。 */
export const ja: Dict = {
  localeName: '日本語',
  htmlLang: 'ja',

  nav: {
    brand: 'Echuu',
    home: 'ホーム',
    demo: 'デモを見る',
    how: '配信の始め方',
    gallery: 'キャラクター',
    creators: 'クリエイターとの協業',
    apply: 'ベータに申し込む',
    menu: 'メニュー',
    close: '閉じる',
    openMenu: 'メニューを開く',
    language: '言語',
    skipToContent: '本文へスキップ',
  },

  hero: {
    tagline: 'To recreate life out of live',
    taglineLineBreak: 'To recreate life / out of live',
    category: 'Original Character のための AI VTuber プラットフォーム',
    lede: 'キャラクターを設定して、話題を選ぶ。物語を語り、視聴者と交流する配信へ。',
    ctaPrimary: 'クローズドベータに申し込む',
    ctaPrimaryEmail: 'メールでベータ参加を申し込む',
    ctaSecondary: 'デモを見る',
    status: 'クローズドベータ版。機能は順次更新中です。',
    skyAlt: '',
  },

  video: {
    title: 'まずは、ひとこと聞いてみる。',
    body: 'キャラクターの配信記録です。',
    play: 'デモを再生',
    statusBeta: 'ベータ版デモ',
    statusLocal: 'ローカル環境の試作デモ',
    unavailable: 'プレーヤーを読み込めない場合は、元の動画を直接開けます。',
    openExternal: 'YouTube で開く',
    posterAlt: '紹介動画のサムネイル',
  },

  steps: {
    title: '設定から配信まで、3 ステップ。',
    items: [
      { no: '01', title: '姿を選ぶ', body: 'サンプルキャラクター、または利用権のある VRM モデルを使います。' },
      { no: '02', title: '人物像を書く', body: '性格、これまでの経緯、話し方の癖を教えてください。' },
      { no: '03', title: '話題を決める', body: '今回話したいことを書いて、プレビューしてから始めます。' },
    ],
    guideLink: '準備ガイドを見る',
    vrmNote: 'VRM は 3D キャラクターモデルのファイル形式です。',
    stepTab: 'ステップ {n}',
  },

  features: {
    title: '設定は、キャラクターシートの中だけのものではない。',
    items: [
      { title: '人物像のとおりに話す', body: '性格と経緯を、そのまま話し方に反映します。' },
      { title: '話題を物語にする', body: 'ひとつの話題から、キャラクターが語ることを見つけます。' },
      { title: '視聴者が関わる', body: 'コメントとギフトが、この先の物語に影響します。' },
    ],
    researchTag: '試作デモ',
  },

  modes: {
    title: '今日は雑談、次の配信は？',
    items: [
      { name: '雑談配信', status: 'beta', body: '設定を語り、物語を話し、視聴者に応えます。' },
      { name: '動画リアクション配信', status: 'dev', body: 'キャラクターと一緒に動画を見て、反応を聞きます。' },
      { name: '歌配信', status: 'dev', body: 'キャラクターが歌で登場します。' },
    ],
    statusBeta: 'ベータ版デモ',
    statusDev: '開発中',
    footnote: '他のモードも開発中です。公開時期は未定です。',
    toApply: 'ベータのご案内へ',
  },

  gallery: {
    title: 'キャラクターたちの舞台。',
    demoOnly: '以下はプロダクトのデモ素材です。',
    labels: { character: 'キャラクター', creator: '制作者', type: '配信タイプ', status: '素材の状態' },
    open: 'デモとクレジットを見る',
    more: 'デモとクレジットをもっと見る',
    modalClose: '閉じる',
    credits: 'クレジットと出典',
    aiNote: 'AI の関与について',
    noDownload: 'このページではモデルの配布は行いません。',
  },

  creators: {
    title: 'キャラクターの出発点は、つくる人。',
    manifesto: '私たちは人間の絵師と IP 制作をこれからも支持します。',
    body: '原画、Live2D、3D モデリングのクリエイターと一緒に、キャラクターを舞台に上げたいと考えています。',
    cta: '協業について話す',
    secondary: 'クリエイターと IP についての説明',
    intentsTitle: '3 つの協業のかたち',
    intents: [
      { title: '作品の掲載', body: '公式サイトやデモで作品を紹介します。クレジットは作品と一緒に表示します。' },
      { title: 'キャラクター・モデルの協業', body: '原画、Live2D、3D モデルについて、具体的な内容を相談します。' },
      { title: '共同デモ', body: '一緒にデモを制作します。公開範囲は事前に確認します。' },
    ],
    disclaimer: 'これは協業の意向についての説明です。受注マーケット、発注システム、分配ポリシー、公式認定はまだありません。',
  },

  trust: {
    title: 'AI がすること、キャラクターの権利。',
    items: [
      { title: 'AI が配信に関わります', body: 'キャラクターの会話や音声などは AI によって生成される場合があります。' },
      { title: '権利は移りません', body: 'オリジナルキャラクターと素材の権利はそのままです。第三者の素材は各自のライセンスに従います。' },
      { title: '掲載は別途の同意', body: 'ベータへの申し込みやキャラクターのアップロードは、公式サイトへの掲載の同意ではありません。' },
    ],
    links: { ai: 'AI 生成コンテンツについて', ip: 'キャラクターと素材の権利', privacy: 'プライバシーポリシー' },
  },

  journal: {
    title: '私たちが取り組んでいること。',
    catAll: 'すべて',
    catProduct: 'プロダクト記録',
    catResearch: 'リサーチ記録',
    emptyResearch: 'リサーチ記録は整理中です。',
    shortNote: 'ショートノート',
    readAll: 'すべての記録を見る',
    source: '出典',
  },

  apply: {
    title: '次に登場するのは、あなたの Original Character。',
    body: '試してみませんか。ご連絡先を教えてください。',
    cta: 'クローズドベータに申し込む',
    ctaEmail: 'メールでベータ参加を申し込む',
    altContact: '直接メールでもご連絡いただけます。',
    copyEmail: 'メールアドレスをコピー',
    copied: 'コピーしました',
    emailSubject: 'Echuu クローズドベータの申し込み',
    emailBody: 'Echuu チームさま\n\nクローズドベータに申し込みます。\n\n連絡先メールアドレス：\nキャラクター紹介（任意）：\n作品リンク（任意）：\n\nよろしくお願いします。',
    mailNote: 'ボタンを押すとメールソフトが開き、件名が入力された状態になります。送信前に内容を編集できます。',
  },

  community: {
    feedbackTitle: '使いにくいところ、ありますか。',
    feedbackBody: '不具合の報告や、ほしい機能を教えてください。',
    feedbackCta: '意見を書く',
    doodleTitle: 'ここでひと息。',
    doodleBody: 'あなたの Original Character に、落書きをひとつ。',
    doodleCta: '描いてみる',
  },

  footer: {
    product: 'プロダクト',
    productLinks: { demo: 'デモを見る', guide: '準備ガイド' },
    creators: 'クリエイター',
    creatorLinks: { partner: 'クリエイターとの協業', rights: 'キャラクターと素材の権利' },
    community: 'コミュニティ',
    communityLinks: { feedback: 'ご意見', doodle: '落書きコーナー', journal: '制作ノート' },
    legal: '規約',
    legalLinks: { terms: '利用規約', privacy: 'プライバシーポリシー', ai: 'AI 生成コンテンツについて' },
    social: 'ソーシャル',
    contact: 'お問い合わせ',
    rights: 'Echuu. キャラクターの権利はそれぞれの制作者に帰属します。',
    draftNotice: '利用規約には草案と未記入の項目が残っています。文書内の表記をご確認ください。',
  },

  feedbackPage: {
    title: 'ご意見',
    lede: '不具合の報告や、ほしい機能を教えてください。',
    category: 'カテゴリ',
    categories: { bug: '不具合', idea: '機能のご要望', other: 'その他' },
    message: '内容',
    messagePlaceholder: '何が起きましたか。どうなってほしかったですか。',
    contact: '連絡先（任意）',
    contactPlaceholder: 'メールアドレスや SNS アカウント',
    submit: 'メールソフトで送る',
    copy: 'この内容をコピー',
    copied: 'コピーしました',
    counter: '{n} / {max} 文字',
    tooLong: '文字数の上限を超えています。短くしてから送ってください。',
    required: '内容を入力してください。',
    noBackendNotice: '受信サービスはまだ接続していません。内容は自動送信されません。メールで送るか、コピーしてお使いください。',
    privacyNotice: 'パスワードや決済情報は書かないでください。匿名送信は実装していません。メールには送信元のアドレスが含まれます。',
  },

  doodlePage: {
    title: '落書きコーナー',
    lede: 'あなたの Original Character に、落書きをひとつ。',
    start: '描きはじめる',
    color: '色',
    size: '太さ',
    undo: '元に戻す',
    clear: '全部消す',
    export: 'PNG で保存',
    saveLocal: 'このブラウザに保存',
    restored: '前回の落書きを読み込みました。',
    saved: 'このブラウザに保存しました。',
    unsaved: '保存していない変更があります。',
    localOnly: 'このブラウザにだけ保存されます。公開はされません。',
    noPublicWall: '公開ギャラリーは保存と確認の仕組みが未接続のため、投稿は受け付けていません。',
    canvasLabel: '落書きキャンバス',
    textAlternative: '描くのが難しいときは、メールでも受け付けています。',
  },

  galleryPage: {
    title: 'キャラクター',
    lede: 'デモ素材とクレジット。',
    backHome: 'ホームに戻る',
  },

  creatorsPage: {
    title: 'クリエイターとの協業',
    lede: '原画、Live2D、3D モデリングのクリエイター向けのご案内と連絡先。',
    howTitle: 'ご連絡の方法',
    howBody: '作品リンクと協業のご希望をメールでお知らせください。返信します。テンプレートに項目を用意しています。',
    emailSubject: 'Echuu クリエイター協業のご相談',
    emailBody: 'Echuu チームさま\n\n協業についてご相談したいです。\n\n担当（原画 / Live2D / 3D モデリング / その他）：\n作品リンク：\nご希望（作品の掲載 / キャラクター・モデルの協業 / 共同デモ）：\n\nよろしくお願いします。',
  },

  journalPage: {
    title: '制作ノート',
    lede: 'プロダクト記録とリサーチ記録。',
  },

  legal: {
    draftBadge: '草案・未記入の項目を含みます',
    sourceLang: '原文の言語：簡体字中国語',
    noTranslation: 'この文書は現在、中国語の原文のみです。日本語の確定訳はまだありません。',
    openOriginal: '原文を開く',
  },

  meta: {
    home: {
      title: 'Echuu — Original Character のための AI VTuber プラットフォーム',
      description: 'キャラクターを設定して、話題を選ぶ。物語を語り、視聴者と交流する配信へ。Echuu はクローズドベータ中です。',
    },
    gallery: { title: 'キャラクター — Echuu', description: 'Echuu のデモ素材とクレジット。' },
    creators: { title: 'クリエイターとの協業 — Echuu', description: '原画、Live2D、3D モデリングのクリエイター向けのご案内。' },
    journal: { title: '制作ノート — Echuu', description: 'Echuu のプロダクト記録とリサーチ記録。' },
    feedback: { title: 'ご意見 — Echuu', description: '不具合の報告や、ほしい機能を教えてください。' },
    doodle: { title: '落書きコーナー — Echuu', description: 'あなたの Original Character に、落書きをひとつ。' },
  },

  common: {
    notFound: 'ページが見つかりませんでした。',
    backHome: 'ホームに戻る',
    externalLink: '（外部リンク）',
    loading: '読み込み中',
    pendingMaterial: '素材は取得待ち',
    materialNote: 'ここには実際の製品画面が入ります。素材を入手しライセンスを確認してから差し替えます。',
  },
};
