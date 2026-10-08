import { useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Youtube, X as Close, Copy } from 'lucide-react';
import { SOCIAL_LINKS } from '../config/site';
import { HOME_ASSETS } from '../assets';
import { trackEvent } from '../lib/googleAnalytics';
import { useLocale } from '../locale-context';
import '../auth/access.css';

type SocialCopy = {
  wechat: string; qq: string; xiaohongshu: string; close: string; copied: string; copyFailed: string;
  wechatTitle: string; wechatBody: string; wechatId: string; wechatCopy: string; wechatQr: string;
  qqTitle: string; qqBody: string; qqId: string; qqCopy: string; qqSteps: [string, string, string];
};
const copy: Record<'zh' | 'en' | 'ja' | 'ko', SocialCopy> = {
  zh: {
    wechat: '微信', qq: 'QQ群', xiaohongshu: '小红书', close: '关闭', copied: '已复制', copyFailed: '复制失败，请手动选择号码复制',
    wechatTitle: '添加微信', wechatBody: '扫码添加 Echuu 微信，拉你进创作者社群。', wechatId: '微信号', wechatCopy: '复制微信号', wechatQr: '微信二维码',
    qqTitle: 'Echuu 官方 QQ 群', qqBody: '内测通知、创作者交流和问题反馈都在群里。', qqId: '群号', qqCopy: '复制群号',
    qqSteps: ['复制下面的群号', '打开 QQ，在搜索栏粘贴群号', '点「申请加入」，管理员通过后即可进群'],
  },
  en: {
    wechat: 'WeChat', qq: 'QQ group', xiaohongshu: 'Xiaohongshu', close: 'Close', copied: 'Copied', copyFailed: 'Please select and copy the number manually.',
    wechatTitle: 'Add us on WeChat', wechatBody: 'Scan to add Echuu on WeChat and join the creator community.', wechatId: 'WeChat ID', wechatCopy: 'Copy WeChat ID', wechatQr: 'WeChat QR code',
    qqTitle: 'Echuu QQ group', qqBody: 'Beta news, creator chat and feedback all happen here.', qqId: 'Group no.', qqCopy: 'Copy group number',
    qqSteps: ['Copy the group number below', 'Open QQ and paste it into search', 'Tap “Join”; an admin will approve you'],
  },
  ja: {
    wechat: 'WeChat', qq: 'QQ グループ', xiaohongshu: '小紅書', close: '閉じる', copied: 'コピーしました', copyFailed: '番号を選択してコピーしてください。',
    wechatTitle: 'WeChat で追加', wechatBody: 'QR コードから Echuu を追加して、クリエイターコミュニティへ。', wechatId: 'WeChat ID', wechatCopy: 'ID をコピー', wechatQr: 'WeChat QR コード',
    qqTitle: 'Echuu 公式 QQ グループ', qqBody: 'ベータのお知らせ、クリエイター交流、フィードバックはこちら。', qqId: 'グループ番号', qqCopy: '番号をコピー',
    qqSteps: ['下のグループ番号をコピー', 'QQ を開いて検索欄に貼り付け', '「参加申請」を押し、管理者の承認を待つ'],
  },
  ko: {
    wechat: 'WeChat', qq: 'QQ 그룹', xiaohongshu: '샤오홍슈', close: '닫기', copied: '복사됨', copyFailed: '번호를 선택하여 복사해 주세요.',
    wechatTitle: 'WeChat으로 추가', wechatBody: 'QR 코드로 Echuu를 추가하고 크리에이터 커뮤니티에 참여하세요.', wechatId: 'WeChat ID', wechatCopy: 'ID 복사', wechatQr: 'WeChat QR 코드',
    qqTitle: 'Echuu 공식 QQ 그룹', qqBody: '베타 소식, 크리에이터 교류, 피드백을 모두 여기서 나눠요.', qqId: '그룹 번호', qqCopy: '번호 복사',
    qqSteps: ['아래 그룹 번호를 복사', 'QQ를 열고 검색창에 붙여넣기', '「가입 신청」을 누르고 관리자 승인 기다리기'],
  },
};
const WECHAT_ID = 'lyh958014884';
const QQ_GROUP = '1085874893';
/** 社交账号显示名按语言取；site.ts 里的 label 只作回落 */
const socialLabel = (id: string, fallback: string, c: SocialCopy) => (id === 'xiaohongshu' ? c.xiaohongshu : fallback);
export function SocialLinks({ compact = false }: { compact?: boolean }) {
  const { locale } = useLocale();
  const c = copy[locale];
  const [channel, setChannel] = useState<'wechat' | 'qq' | null>(null);
  const [status, setStatus] = useState('');
  const trigger = useRef<HTMLElement | null>(null);
  const open = (value: 'wechat' | 'qq') => { trigger.current = document.activeElement as HTMLElement; setStatus(''); setChannel(value); };
  const number = channel === 'wechat' ? WECHAT_ID : QQ_GROUP;
  const copyNumber = async () => { try { await navigator.clipboard.writeText(number); setStatus(c.copied); } catch { setStatus(c.copyFailed); } };
  return <>
    {(['wechat', 'qq'] as const).map((id) => <button key={id} type="button" className={compact ? 'hv-cta__icon' : 'hv-social-link'} aria-label={c[id]} onClick={() => open(id)}>
      {compact ? <img src={id === 'wechat' ? HOME_ASSETS.icons.bilibili : HOME_ASSETS.icons.qq} alt="" /> : c[id]}
    </button>)}
    {SOCIAL_LINKS.map((social) => <a key={social.id} className={compact ? 'hv-cta__icon' : 'hv-social-link'} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={socialLabel(social.id, social.label, c)} onClick={() => trackEvent('outbound_click', { kind: 'social', id: social.id })}>
      {compact ? social.id === 'xiaohongshu' ? <img src={HOME_ASSETS.icons.xiaohongshu} alt="" /> : social.id === 'x' ? <img src={HOME_ASSETS.icons.x} alt="" /> : <Youtube size={22} aria-hidden="true" /> : socialLabel(social.id, social.label, c)}
    </a>)}
    <Dialog.Root open={Boolean(channel)} onOpenChange={(value) => { if (!value) setChannel(null); }}>
      <Dialog.Portal><Dialog.Overlay className="echuu-access-overlay" />
        <Dialog.Content className="echuu-access" lang={locale} onCloseAutoFocus={(event) => { event.preventDefault(); trigger.current?.focus(); }}>
          <div className="echuu-access__glass">
            <Dialog.Close className="echuu-access__close" aria-label={c.close}><Close size={18} /></Dialog.Close>
            <Dialog.Title className="echuu-access__title">{channel === 'wechat' ? c.wechatTitle : c.qqTitle}</Dialog.Title>
            <Dialog.Description className="echuu-access__description">{channel === 'wechat' ? c.wechatBody : c.qqBody}</Dialog.Description>
            <div className="echuu-access__body">
              {channel === 'wechat'
                ? <img className="echuu-access__qr" src={`${import.meta.env.BASE_URL}website/social/wechat-contact.jpg`} alt={c.wechatQr} />
                : <ol className="echuu-access__steps">{c.qqSteps.map((step) => <li key={step}>{step}</li>)}</ol>}
              <p className="echuu-access__id"><span>{channel === 'wechat' ? c.wechatId : c.qqId}</span><strong>{number}</strong></p>
              <div className="echuu-access__actions">
                <button type="button" className="echuu-access__submit" onClick={copyNumber}><Copy size={16} />{channel === 'wechat' ? c.wechatCopy : c.qqCopy}</button>
                <p role="status" className="echuu-access__status">{status}</p>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>;
}
