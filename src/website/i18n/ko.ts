import type { Dict } from './zh';

/** 초안입니다. 원어민 감수는 아직 진행하지 않았습니다 (docs/OPEN_ITEMS.md 참고). */
export const ko: Dict = {
  localeName: '한국어',
  htmlLang: 'ko',

  nav: {
    brand: 'Echuu',
    home: '홈',
    demo: '데모 보기',
    how: '방송 시작하기',
    gallery: '캐릭터',
    creators: '크리에이터 협업',
    apply: '베타 신청',
    menu: '메뉴',
    close: '닫기',
    openMenu: '메뉴 열기',
    language: '언어',
    skipToContent: '본문으로 건너뛰기',
  },

  hero: {
    tagline: 'To recreate life out of live',
    taglineLineBreak: 'To recreate life / out of live',
    category: 'Original Character를 위한 AI VTuber 플랫폼',
    lede: '캐릭터를 설정하고 주제를 골라 보세요. 이야기를 들려주고 시청자와 소통하는 방송이 시작됩니다.',
    ctaPrimary: '비공개 베타 신청',
    ctaPrimaryEmail: '이메일로 베타 신청',
    ctaSecondary: '데모 보기',
    status: '비공개 베타 진행 중. 기능은 계속 업데이트됩니다.',
    skyAlt: '',
  },

  video: {
    title: '먼저 한마디 들어 보세요.',
    body: '캐릭터의 방송 기록입니다.',
    play: '데모 재생',
    statusBeta: '베타 데모',
    statusLocal: '로컬 프로토타입 데모',
    unavailable: '플레이어가 열리지 않으면 원본 영상을 바로 열 수 있습니다.',
    openExternal: 'YouTube에서 열기',
    posterAlt: '소개 영상 표지',
  },

  steps: {
    title: '설정부터 방송까지, 세 단계.',
    items: [
      { no: '01', title: '모습 고르기', body: '예시 캐릭터를 쓰거나, 사용 권한이 있는 VRM 모델을 올리세요.' },
      { no: '02', title: '캐릭터 설정 쓰기', body: '성격과 지나온 이야기, 말투를 알려 주세요.' },
      { no: '03', title: '주제 정하기', body: '이번에 하고 싶은 이야기를 쓰고, 미리 본 다음 시작합니다.' },
    ],
    guideLink: '준비 가이드 보기',
    vrmNote: 'VRM은 3D 캐릭터 모델 파일 형식입니다.',
    stepTab: '{n}단계',
  },

  features: {
    title: '설정은 캐릭터 시트에만 있는 게 아닙니다.',
    items: [
      { title: '설정대로 말하기', body: '성격과 지나온 이야기가 말투에 그대로 담깁니다.' },
      { title: '주제를 이야기로', body: '주제 하나에서 시작해 캐릭터가 들려줄 이야기를 만듭니다.' },
      { title: '시청자가 참여하기', body: '채팅과 선물이 다음 이야기에 영향을 줍니다.' },
    ],
    researchTag: '프로토타입 데모',
  },

  modes: {
    title: '오늘은 토크, 다음 방송은?',
    items: [
      { name: '토크 방송', status: 'beta', body: '설정을 이야기하고, 이야기를 들려주고, 시청자에게 답합니다.' },
      { name: '영상 리액션 방송', status: 'dev', body: '캐릭터와 함께 영상을 보고 반응을 듣습니다.' },
      { name: '노래 방송', status: 'dev', body: '캐릭터가 노래로 등장합니다.' },
    ],
    statusBeta: '베타 데모',
    statusDev: '개발 중',
    footnote: '다른 모드도 개발 중입니다. 공개 시점은 아직 정해지지 않았습니다.',
    toApply: '베타 문의로 가기',
  },

  gallery: {
    title: '캐릭터들의 무대를 보세요.',
    demoOnly: '아래는 제품 데모 자료입니다.',
    labels: { character: '캐릭터', creator: '제작자', type: '방송 유형', status: '자료 상태' },
    open: '데모와 크레딧 보기',
    more: '데모와 크레딧 더 보기',
    modalClose: '닫기',
    credits: '크레딧과 출처',
    aiNote: 'AI가 참여한 부분',
    noDownload: '이 페이지에서는 모델을 내려받을 수 없습니다.',
  },

  creators: {
    title: '캐릭터의 시작은 만든 사람입니다.',
    manifesto: '우리는 사람 그림 작가와 IP 창작을 언제나 지지합니다.',
    body: '원화, 리깅, 3D 모델링 작가와 함께 캐릭터를 무대에 올리고 싶습니다.',
    cta: '협업 이야기하기',
    secondary: '크리에이터와 IP 안내 보기',
    intentsTitle: '세 가지 협업 형태',
    intents: [
      { title: '작품 소개', body: '공식 사이트나 데모에 작품을 싣습니다. 크레딧은 작품과 함께 표시합니다.' },
      { title: '캐릭터·모델 협업', body: '원화, 리깅, 3D 모델링을 두고 구체적인 내용을 상의합니다.' },
      { title: '공동 데모', body: '함께 데모를 만듭니다. 공개 범위는 미리 확인합니다.' },
    ],
    disclaimer: '협업 의향에 대한 안내입니다. 아직 의뢰 마켓, 주문 시스템, 수익 배분 정책, 공식 인증은 없습니다.',
  },

  trust: {
    title: 'AI가 하는 일, 캐릭터의 권리.',
    items: [
      { title: 'AI가 방송에 참여합니다', body: '캐릭터의 대화와 음성 등은 AI가 생성할 수 있습니다.' },
      { title: '권리는 넘어가지 않습니다', body: '오리지널 캐릭터와 자료에 대한 권리는 그대로입니다. 제3자 자료는 각자의 라이선스를 따릅니다.' },
      { title: '게시는 따로 동의받습니다', body: '베타 신청이나 캐릭터 업로드가 공식 사이트 게시에 대한 동의는 아닙니다.' },
    ],
    links: { ai: 'AI 생성 콘텐츠 안내', ip: '캐릭터와 자료 권리', privacy: '개인정보 처리방침' },
  },

  journal: {
    title: '우리가 하고 있는 일.',
    catAll: '전체',
    catProduct: '제품 기록',
    catResearch: '연구 기록',
    emptyResearch: '연구 기록을 정리하고 있습니다.',
    shortNote: '짧은 기록',
    readAll: '모든 기록 보기',
    source: '출처',
  },

  apply: {
    title: '다음에 무대에 오를 차례는 당신의 Original Character.',
    body: '한번 써 보시겠어요? 연락할 방법을 알려 주세요.',
    cta: '비공개 베타 신청',
    ctaEmail: '이메일로 베타 신청',
    altContact: '바로 메일을 보내셔도 됩니다.',
    copyEmail: '메일 주소 복사',
    copied: '복사했습니다',
    emailSubject: 'Echuu 비공개 베타 신청',
    emailBody: 'Echuu 팀에게,\n\n비공개 베타를 신청합니다.\n\n연락 메일 주소:\n캐릭터 소개 (선택):\n작품 링크 (선택):\n\n감사합니다.',
    mailNote: '버튼을 누르면 메일 앱이 열리고 제목이 미리 입력됩니다. 보내기 전에 수정할 수 있습니다.',
  },

  community: {
    feedbackTitle: '불편한 곳이 있나요?',
    feedbackBody: '문제를 알려 주시거나, 원하는 기능을 이야기해 주세요.',
    feedbackCta: '의견 쓰기',
    doodleTitle: '여기서 잠깐 쉬어 가세요.',
    doodleBody: '당신의 Original Character에게 낙서를 하나 남겨 보세요.',
    doodleCta: '그려 보기',
  },

  footer: {
    product: '제품',
    productLinks: { demo: '데모 보기', guide: '준비 가이드' },
    creators: '크리에이터',
    creatorLinks: { partner: '크리에이터 협업', rights: '캐릭터와 자료 권리' },
    community: '커뮤니티',
    communityLinks: { feedback: '의견 보내기', doodle: '낙서 코너', journal: '작업 기록' },
    legal: '약관',
    legalLinks: { terms: '이용약관', privacy: '개인정보 처리방침', ai: 'AI 생성 콘텐츠 안내' },
    social: '소셜',
    contact: '문의',
    rights: 'Echuu. 캐릭터 권리는 각 제작자에게 있습니다.',
    draftNotice: '이용약관에는 초안과 미기재 항목이 남아 있습니다. 문서에 표시된 내용을 확인해 주세요.',
  },

  feedbackPage: {
    title: '의견 보내기',
    lede: '문제를 알려 주시거나, 원하는 기능을 이야기해 주세요.',
    category: '분류',
    categories: { bug: '사용 문제', idea: '기능 제안', other: '기타' },
    message: '내용',
    messagePlaceholder: '무슨 일이 있었나요? 어떻게 되기를 바라셨나요?',
    contact: '연락처 (선택)',
    contactPlaceholder: '메일 주소나 SNS 계정',
    submit: '메일 앱으로 보내기',
    copy: '이 내용 복사',
    copied: '복사했습니다',
    counter: '{n} / {max}자',
    tooLong: '글자 수 제한을 넘었습니다. 줄인 뒤 보내 주세요.',
    required: '내용을 먼저 써 주세요.',
    noBackendNotice: '아직 접수 서비스가 연결되어 있지 않습니다. 자동으로 제출되지 않으니 메일로 보내시거나 직접 복사해 주세요.',
    privacyNotice: '비밀번호나 결제 정보는 적지 말아 주세요. 익명 제출은 구현되어 있지 않고, 메일에는 보내는 사람 주소가 함께 갑니다.',
  },

  doodlePage: {
    title: '낙서 코너',
    lede: '당신의 Original Character에게 낙서를 하나 남겨 보세요.',
    start: '그리기 시작',
    color: '색',
    size: '굵기',
    undo: '되돌리기',
    clear: '모두 지우기',
    export: 'PNG로 내보내기',
    saveLocal: '이 브라우저에 저장',
    restored: '지난번 낙서를 불러왔습니다.',
    saved: '이 브라우저에 저장했습니다.',
    unsaved: '저장하지 않은 변경이 있습니다.',
    localOnly: '이 브라우저에만 저장되고 공개되지 않습니다.',
    noPublicWall: '공개 게시판은 저장과 검토 기능이 연결되지 않아 아직 투고를 받지 않습니다.',
    canvasLabel: '낙서 캔버스',
    textAlternative: '그리기 어려우시면 메일로 보내 주셔도 됩니다.',
  },

  galleryPage: {
    title: '캐릭터',
    lede: '데모 자료와 크레딧.',
    backHome: '홈으로 돌아가기',
  },

  creatorsPage: {
    title: '크리에이터 협업',
    lede: '원화, 리깅, 3D 모델링 작가를 위한 안내와 연락처.',
    howTitle: '연락 방법',
    howBody: '작품 링크와 원하시는 협업 내용을 메일로 보내 주시면 답장드립니다. 템플릿에 항목을 미리 넣어 두었습니다.',
    emailSubject: 'Echuu 크리에이터 협업 문의',
    emailBody: 'Echuu 팀에게,\n\n협업에 대해 이야기하고 싶습니다.\n\n분야 (원화 / 리깅 / 3D 모델링 / 기타):\n작품 링크:\n원하는 협업 (작품 소개 / 캐릭터·모델 협업 / 공동 데모):\n\n감사합니다.',
  },

  journalPage: {
    title: '작업 기록',
    lede: '제품 기록과 연구 기록.',
  },

  legal: {
    draftBadge: '초안과 미기재 항목 포함',
    sourceLang: '원문 언어: 중국어 간체',
    noTranslation: '이 문서는 현재 중국어 원문만 있습니다. 확정된 한국어 번역본은 아직 없습니다.',
    openOriginal: '원문 열기',
  },

  meta: {
    home: {
      title: 'Echuu — Original Character를 위한 AI VTuber 플랫폼',
      description: '캐릭터를 설정하고 주제를 골라 보세요. 이야기를 들려주고 시청자와 소통하는 방송이 시작됩니다. Echuu는 비공개 베타 중입니다.',
    },
    gallery: { title: '캐릭터 — Echuu', description: 'Echuu의 데모 자료와 크레딧.' },
    creators: { title: '크리에이터 협업 — Echuu', description: '원화, 리깅, 3D 모델링 작가를 위한 안내.' },
    journal: { title: '작업 기록 — Echuu', description: 'Echuu의 제품 기록과 연구 기록.' },
    feedback: { title: '의견 보내기 — Echuu', description: '문제를 알려 주시거나, 원하는 기능을 이야기해 주세요.' },
    doodle: { title: '낙서 코너 — Echuu', description: '당신의 Original Character에게 낙서를 하나 남겨 보세요.' },
  },

  common: {
    notFound: '페이지를 찾지 못했습니다.',
    backHome: '홈으로 돌아가기',
    externalLink: '(외부 링크)',
    loading: '불러오는 중',
    pendingMaterial: '자료 확보 예정',
    materialNote: '여기에는 실제 제품 화면이 들어갑니다. 자료를 확보하고 권리를 확인한 뒤 교체합니다.',
  },
};
