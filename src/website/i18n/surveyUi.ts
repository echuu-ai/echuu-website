import type { Locale } from '.';

type SurveyUi = {
  progress: string;
  required: string;
  one: string;
  multiple: string;
  limit: string;
  limitReached: string;
  requiredAnswer: string;
  privacy: string;
  submit: string;
  submitting: string;
  incomplete: string;
  failed: string;
  complete: string;
  received: string;
  screenedOut: string;
  screenedOutDetail: string;
};

export const surveyUi: Record<Locale, SurveyUi> = {
  zh: {
    progress: '已答 {answered} / {total} 题',
    required: '所有题目均为必答。',
    one: '请选择一项。',
    multiple: '可选择多项。',
    limit: '最多选 {max} 项。',
    limitReached: '已选满 {max} 项。取消一项后可更换。',
    requiredAnswer: '请回答这道题。',
    privacy: '关于资料处理，请阅读我们的',
    submit: '提交问卷',
    submitting: '提交中…',
    incomplete: '还有题目未作答。请补齐后再提交。',
    failed: '提交失败。你的答案已保留，请重试。',
    complete: '感谢参与',
    received: '我们已收到你的回答。',
    screenedOut: '问卷到此结束',
    screenedOutDetail: '感谢你抽出时间。',
  },
  en: {
    progress: '{answered} of {total} answered',
    required: 'All questions are required.',
    one: 'Select one option.',
    multiple: 'You can select multiple options.',
    limit: 'Select up to {max} options.',
    limitReached: 'You’ve selected {max} options. Deselect one to make a change.',
    requiredAnswer: 'Please answer this question.',
    privacy: 'For details on how we handle data, read our',
    submit: 'Submit survey',
    submitting: 'Submitting…',
    incomplete: 'Please answer the remaining questions before submitting.',
    failed: 'Submission failed. Your answers are still here. Please try again.',
    complete: 'Thank you for taking part',
    received: 'We’ve received your answers.',
    screenedOut: 'The survey ends here',
    screenedOutDetail: 'Thank you for your time.',
  },
  ja: {
    progress: '{total}問中{answered}問に回答済み',
    required: 'すべての質問に回答してください。',
    one: '1つ選択してください。',
    multiple: '複数選択できます。',
    limit: '最大{max}つまで選択できます。',
    limitReached: '{max}つ選択済みです。変更するには、いずれかの選択を解除してください。',
    requiredAnswer: 'この質問に回答してください。',
    privacy: 'データの取り扱いについては、以下をご覧ください。',
    submit: '回答を送信',
    submitting: '送信中…',
    incomplete: '未回答の質問に回答してから送信してください。',
    failed: '送信できませんでした。入力した回答は残っています。もう一度お試しください。',
    complete: 'ご協力ありがとうございます',
    received: '回答を受け付けました。',
    screenedOut: 'アンケートはここで終了です',
    screenedOutDetail: 'お時間をいただき、ありがとうございます。',
  },
  ko: {
    progress: '{total}문항 중 {answered}문항 응답',
    required: '모든 문항에 응답해 주세요.',
    one: '한 항목을 선택해 주세요.',
    multiple: '여러 항목을 선택할 수 있습니다.',
    limit: '최대 {max}개까지 선택할 수 있습니다.',
    limitReached: '{max}개를 선택했습니다. 변경하려면 선택을 하나 해제해 주세요.',
    requiredAnswer: '이 문항에 응답해 주세요.',
    privacy: '데이터 처리에 대한 자세한 내용은 아래에서 확인해 주세요.',
    submit: '설문 제출',
    submitting: '제출 중…',
    incomplete: '응답하지 않은 문항에 답한 후 제출해 주세요.',
    failed: '제출하지 못했습니다. 응답은 그대로 있으니 다시 시도해 주세요.',
    complete: '참여해 주셔서 감사합니다',
    received: '응답을 받았습니다.',
    screenedOut: '설문은 여기서 종료됩니다',
    screenedOutDetail: '시간을 내 주셔서 감사합니다.',
  },
};
