const zh = {
  login: '登录', beta: '参与内测', inviteTitle: '请输入邀请码', signupTitle: '你的故事，即将开场',
  inviteBody: '输入邮件中的专属邀请码，进入 Echuu。', signupBody: '设置邮箱和密码。内测开放后，我们会将专属邀请码发送到你的邮箱。',
  code: '邀请码', codePlaceholder: '输入你的专属邀请码', email: '注册邮箱', password: '设置密码',
  passwordHint: '至少 12 位字符', submitInvite: '进入 Echuu', submitSignup: '申请内测', busy: '正在提交…',
  close: '关闭', noCode: '还没有邀请码？', hasCode: '已经收到邀请码？',
  successTitle: '期待与你一起开场', successBody: '申请已收到。专属邀请码将于内测开放后发送到你的注册邮箱，请留意收件箱。',
  done: '知道了', privacy: '邮箱仅用于账号服务与内测通知。', show: '显示密码', hide: '隐藏密码',
  unavailable: '内测入口正在准备中，请稍后再来。', invalid: '信息未通过验证，请检查后重试。',
  rate: '操作太频繁，请稍后重试。', network: '网络连接失败，请重试。', failed: '暂时无法完成，请稍后重试。',
};
export const authCopy = {
  zh,
  en: { login:'Log in', beta:'Join the beta', inviteTitle:'Enter your invitation code', signupTitle:'Your story starts here', inviteBody:'Use the personal code from your email to enter Echuu.', signupBody:'Set your email and password. We’ll email your personal invitation when beta access opens.', code:'Invitation code',codePlaceholder:'Your invitation code',email:'Email',password:'Create a password',passwordHint:'At least 12 characters',submitInvite:'Enter Echuu',submitSignup:'Request beta access',busy:'Submitting…',close:'Close',noCode:'No invitation yet?',hasCode:'Already have a code?',successTitle:'See you on stage',successBody:'Your request was received. Watch your inbox for a personal invitation when beta access opens.',done:'Done',privacy:'Your email is used for account services and beta updates.',show:'Show password',hide:'Hide password',unavailable:'Beta access is being prepared. Please check back later.',invalid:'Please check your details and try again.',rate:'Too many attempts. Please try again later.',network:'Connection failed. Please try again.',failed:'Unable to complete this request. Please try again later.' },
  ja: { login:'ログイン',beta:'ベータに参加',inviteTitle:'招待コードを入力',signupTitle:'あなたの物語が、始まる',inviteBody:'メールに届いた専用コードで Echuu へ。',signupBody:'メールアドレスとパスワードを設定。ベータ公開後、専用の招待コードをお送りします。',code:'招待コード',codePlaceholder:'専用の招待コード',email:'メールアドレス',password:'パスワード',passwordHint:'12 文字以上',submitInvite:'Echuu に入る',submitSignup:'ベータに申し込む',busy:'送信中…',close:'閉じる',noCode:'招待コードをお持ちでない方',hasCode:'招待コードをお持ちの方',successTitle:'ステージで会いましょう',successBody:'お申し込みを受け付けました。ベータ公開後、登録メールアドレスに招待コードをお送りします。',done:'完了',privacy:'メールはアカウント管理とベータのお知らせに使用します。',show:'パスワードを表示',hide:'パスワードを隠す',unavailable:'ただいま準備中です。しばらくしてからお試しください。',invalid:'入力内容を確認してください。',rate:'しばらくしてからお試しください。',network:'接続に失敗しました。',failed:'処理できませんでした。再度お試しください。' },
  ko: { login:'로그인',beta:'베타 참여',inviteTitle:'초대 코드를 입력하세요',signupTitle:'당신의 이야기가 시작됩니다',inviteBody:'이메일로 받은 전용 코드로 Echuu에 입장하세요.',signupBody:'이메일과 비밀번호를 설정하세요. 베타가 열리면 전용 초대 코드를 보내 드립니다.',code:'초대 코드',codePlaceholder:'전용 초대 코드',email:'이메일',password:'비밀번호 설정',passwordHint:'12자 이상',submitInvite:'Echuu 입장',submitSignup:'베타 신청',busy:'제출 중…',close:'닫기',noCode:'초대 코드가 없나요?',hasCode:'초대 코드가 있나요?',successTitle:'무대에서 만나요',successBody:'신청이 접수되었습니다. 베타가 열리면 등록한 이메일로 초대 코드를 보내 드립니다.',done:'확인',privacy:'이메일은 계정 관리 및 베타 안내에 사용됩니다.',show:'비밀번호 표시',hide:'비밀번호 숨기기',unavailable:'베타를 준비하고 있습니다. 나중에 다시 확인해 주세요.',invalid:'입력 내용을 확인해 주세요.',rate:'잠시 후 다시 시도해 주세요.',network:'연결에 실패했습니다.',failed:'처리하지 못했습니다. 나중에 다시 시도해 주세요.' },
} satisfies Record<string, Record<keyof typeof zh, string>>;
