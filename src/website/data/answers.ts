import type { Locale } from '../i18n';

/** Product facts shared by visible FAQ and static HTML; no unverified release promises. */
export const ANSWERS: Record<Locale, { title: string; items: { q: string; a: string }[] }> = {
  zh: { title: '开场之前，你可能想知道', items: [
    { q: 'Echuu 是什么？', a: 'Echuu 是面向原创角色（OC）创作者的 AI VTuber 表演与直播创作平台。你提供角色形象、人设和话题，让角色讲故事、参与观众互动。' },
    { q: 'AI 表演和动作捕捉有什么区别？', a: 'AI 表演由角色设定和话题驱动对话与语音；动作捕捉把真人的表情和动作映射到虚拟角色。它们是不同的表演方式，具体开放能力以当前内测版本为准。' },
    { q: '开始之前，需要准备什么模型？', a: '可以使用示例角色，或准备你有权使用的 VRM 模型，再填写人设和直播话题。VRM 是一种 3D 角色模型格式；上传前请确认模型及配套素材的使用授权。' },
    { q: '弹幕和礼物怎样影响角色？', a: '在支持互动的演示流程中，弹幕和礼物可以成为角色回应与后续话题的输入。官网演示不代表所有功能已经向所有账号开放；具体可用范围以邀请与版本说明为准。' },
    { q: '角色和作品的权利会转移吗？', a: '创作者保留原创角色和素材的原有权利，第三方素材遵循各自授权。申请内测或上传模型，不等于同意在官网公开展示。具体约定请查阅角色与素材条款。' },
    { q: '现在怎样申请内测？', a: '点击“参与内测”查看当前申请方式。在线申请未开放时，可自行发送邮件至 cory@echuu.ai；打开邮件客户端不会自动提交申请，也不需要先设置密码。' },
  ] },
  en: { title: 'Before your first scene', items: [
    { q: 'What is Echuu?', a: 'Echuu is an AI VTuber performance and streaming platform for original-character (OC) creators. Bring a character, a persona and a topic, and your character tells stories and plays off the audience.' },
    { q: 'How does AI performance differ from motion capture?', a: 'AI performance uses a persona and topic to drive dialogue and voice. Motion capture maps a human performer’s expressions and movements onto a virtual character. Available capabilities depend on the current beta version.' },
    { q: 'What model do I need?', a: 'Use a sample character, or a VRM model you have the rights to use, then add a persona and a topic. VRM is a common 3D avatar format; please check the model’s license before uploading.' },
    { q: 'How do chat messages and gifts affect the character?', a: 'In interactive demos, chat messages and gifts feed into how the character responds and where the topic goes next. Not every feature shown here is available to every account yet; check your beta invite and release notes.' },
    { q: 'Do creators keep their character rights?', a: 'Creators retain their existing rights to original characters and assets; third-party assets remain subject to their licenses. Applying for the beta or uploading a model is not consent to public website display. See the character and asset terms for details.' },
    { q: 'How can I request beta access?', a: 'Click “Join the beta” and leave your email. Once you’re approved, we’ll email you a beta code to enter on this site. Until online applications open, you can also write to cory@echuu.ai.' },
  ] },
  ja: { title: '最初のシーンの前に', items: [
    { q: 'Echuu とは？', a: 'Echuu はオリジナルキャラクター（OC）のクリエイター向け AI VTuber 表現・配信制作プラットフォームです。キャラクター、人物設定、話題を用意し、物語や視聴者とのやり取りにつなげます。' },
    { q: 'AI の表現とモーションキャプチャはどう違いますか？', a: 'AI は人物設定や話題から会話と音声を生成し、モーションキャプチャは人の表情や動作をキャラクターに反映します。利用できる機能は現在のベータ版によって異なります。' },
    { q: 'どんなモデルが必要ですか？', a: 'サンプルキャラクター、または利用権限のある VRM モデルを用意し、人物設定と話題を加えます。VRM は 3D キャラクターの形式です。アップロード前にモデルと素材の利用許諾を確認してください。' },
    { q: 'コメントやギフトはどう影響しますか？', a: '対応するデモでは、コメントやギフトが返答や次の話題に反映されます。デモの掲載は全機能の一般公開を意味しません。招待とバージョンの案内をご確認ください。' },
    { q: 'キャラクターの権利は移転しますか？', a: 'オリジナルキャラクターや素材の既存の権利はクリエイターに残り、第三者の素材は各ライセンスに従います。応募やアップロードは公式サイトでの公開への同意ではありません。詳細は素材に関する規約をご確認ください。' },
    { q: 'ベータ版にはどう応募できますか？', a: '「ベータに参加」から現在の応募方法をご確認ください。オンライン受付が未公開の場合は cory@echuu.ai にご自身でメールを送れます。メールアプリを開くだけでは送信されず、パスワードも不要です。' },
  ] },
  ko: { title: '첫 장면을 시작하기 전에', items: [
    { q: 'Echuu는 무엇인가요?', a: 'Echuu는 오리지널 캐릭터(OC) 창작자를 위한 AI VTuber 퍼포먼스 및 방송 제작 플랫폼입니다. 캐릭터, 설정, 주제를 준비해 이야기와 시청자 상호작용을 만듭니다.' },
    { q: 'AI 퍼포먼스와 모션 캡처는 어떻게 다른가요?', a: 'AI 퍼포먼스는 캐릭터 설정과 주제로 대화와 음성을 생성합니다. 모션 캡처는 사람의 표정과 움직임을 캐릭터에 반영합니다. 제공 기능은 현재 베타 버전에 따라 다릅니다.' },
    { q: '어떤 모델을 준비해야 하나요?', a: '예시 캐릭터나 사용 권한이 있는 VRM 모델을 준비하고 설정과 주제를 추가하세요. VRM은 3D 캐릭터 형식입니다. 업로드 전에 모델과 관련 소재의 이용 권한을 확인하세요.' },
    { q: '채팅과 선물은 캐릭터에 어떤 영향을 주나요?', a: '지원되는 데모에서는 채팅과 선물이 응답과 다음 주제에 반영될 수 있습니다. 데모가 모든 계정에 모든 기능이 공개되었다는 뜻은 아닙니다. 초대 및 버전 안내를 확인하세요.' },
    { q: '캐릭터의 권리가 이전되나요?', a: '창작자는 오리지널 캐릭터와 소재의 기존 권리를 유지하고, 타인의 소재는 각 라이선스를 따릅니다. 베타 신청이나 업로드는 웹사이트 공개 동의가 아닙니다. 자세한 내용은 캐릭터 및 소재 약관을 확인하세요.' },
    { q: '베타는 어떻게 신청하나요?', a: '“베타 참여”에서 현재 신청 방법을 확인하세요. 온라인 신청이 준비 중이면 cory@echuu.ai로 직접 이메일을 보낼 수 있습니다. 메일 앱을 여는 것만으로 신청되지 않으며 비밀번호도 필요하지 않습니다.' },
  ] },
};
