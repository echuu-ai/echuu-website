import { useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Youtube, X as Close, Copy } from 'lucide-react';
import { SOCIAL_LINKS } from '../config/site';
import { HOME_ASSETS } from '../assets';
import { useLocale } from '../locale-context';
import '../auth/access.css';

const copy = {
  zh: ['微信', 'QQ群', '扫码添加微信，联系加入 Echuu 社群。', '在 QQ 中搜索群号，申请加入 Echuu 官方群。', '复制', '已复制', '复制失败，请手动选择号码复制', '关闭'],
  en: ['WeChat', 'QQ group', 'Scan to add us on WeChat and join the Echuu community.', 'Search this group number in QQ to request access.', 'Copy', 'Copied', 'Please select and copy the number manually.', 'Close'],
  ja: ['WeChat', 'QQ グループ', 'QR コードから WeChat でご連絡ください。', 'QQ でグループ番号を検索して参加申請してください。', 'コピー', 'コピー済み', '番号を選択してコピーしてください。', '閉じる'],
  ko: ['WeChat', 'QQ 그룹', 'QR 코드를 스캔하여 WeChat으로 연락해 주세요.', 'QQ에서 그룹 번호를 검색하여 가입을 신청하세요.', '복사', '복사됨', '번호를 선택하여 복사해 주세요.', '닫기'],
};
export function SocialLinks({ compact = false }: { compact?: boolean }) {
  const { locale } = useLocale();
  const c = copy[locale];
  const [channel, setChannel] = useState<'wechat' | 'qq' | null>(null);
  const [status, setStatus] = useState('');
  const trigger = useRef<HTMLElement | null>(null);
  const open = (value: 'wechat' | 'qq') => { trigger.current = document.activeElement as HTMLElement; setStatus(''); setChannel(value); };
  const number = channel === 'wechat' ? 'lyh958014884' : '1085874893';
  return <>
    {(['wechat', 'qq'] as const).map((id, i) => <button key={id} type="button" className={compact ? 'hv-cta__icon' : 'hv-social-link'} aria-label={c[i]} onClick={() => open(id)}>
      {compact ? <img src={id === 'wechat' ? HOME_ASSETS.icons.bilibili : HOME_ASSETS.icons.qq} alt="" /> : c[i]}
    </button>)}
    {SOCIAL_LINKS.map((social) => <a key={social.id} className={compact ? 'hv-cta__icon' : 'hv-social-link'} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label}>
      {compact ? social.id === 'x' ? <img src={HOME_ASSETS.icons.x} alt="" /> : <Youtube size={22} aria-hidden="true" /> : social.label}
    </a>)}
    <Dialog.Root open={Boolean(channel)} onOpenChange={(value) => { if (!value) setChannel(null); }}>
      <Dialog.Portal><Dialog.Overlay className="echuu-access-overlay" />
        <Dialog.Content className="echuu-access" onCloseAutoFocus={(event) => { event.preventDefault(); trigger.current?.focus(); }}>
          <div className="echuu-access__glass">
            <Dialog.Close className="echuu-access__close" aria-label={c[7]}><Close size={20} /></Dialog.Close>
            <Dialog.Title className="echuu-access__title">{channel === 'wechat' ? c[0] : c[1]}</Dialog.Title>
            <Dialog.Description className="echuu-access__description">{channel === 'wechat' ? c[2] : c[3]}</Dialog.Description>
            {channel === 'wechat' && <img src={`${import.meta.env.BASE_URL}website/social/wechat-contact.jpg`} alt="WeChat QR" style={{ display:'block', width:210, maxWidth:'100%', maxHeight:'42dvh', objectFit:'contain', margin:'0 auto 20px', borderRadius:14 }} />}
            <p style={{ textAlign:'center', fontSize:22, userSelect:'text' }}>{number}</p>
            <button className="echuu-access__submit" onClick={async () => { try { await navigator.clipboard.writeText(number); setStatus(c[5]); } catch { setStatus(c[6]); } }}><Copy size={16} />{c[4]}</button>
            <p role="status" className="echuu-access__privacy">{status}</p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>;
}
