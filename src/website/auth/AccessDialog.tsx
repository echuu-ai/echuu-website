import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Eye, EyeOff, X } from 'lucide-react';
import { useLocale } from '../locale-context';
import { authCopy } from './copy';
import { AuthError, INVITE_ENDPOINT, SIGNUP_ENDPOINT, redeemInvite, registerBeta, type BetaIssued } from './api';
import { isWellFormedInviteCode, normalizeInviteCode } from './inviteCode';
import { CONTACT_EMAIL, CONTACT_EMAIL_ALT, CONTACT_RECIPIENTS, PRODUCT_ORIGIN } from '../config/site';
import { trackEvent } from '../lib/googleAnalytics';
import './access.css';

export type AccessMode = 'invite' | 'signup';
export function AccessDialog({ mode, onClose, onModeChange, returnFocusRef }: {
  returnFocusRef: RefObject<HTMLElement>; mode: AccessMode | null; onClose: () => void; onModeChange: (mode: AccessMode) => void;
}) {
  const { locale, t } = useLocale();
  const c = authCopy[locale];
  const reduced = useReducedMotion();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<BetaIssued | null>(null);
  const success = issued !== null;
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const invite = mode === 'invite';
  const configured = Boolean(invite ? INVITE_ENDPOINT : SIGNUP_ENDPOINT);
  const mailHref = `mailto:${CONTACT_RECIPIENTS}?subject=${encodeURIComponent(t.apply.emailSubject)}&body=${encodeURIComponent(t.apply.emailBody)}`;
  useEffect(() => {
    request.current?.abort();
    setCode(''); setPassword(''); setEmail(''); setError(''); setBusy(false); setIssued(null); setShowPassword(false);
    if (mode) trackEvent('access_opened', { mode, configured });
    return () => { request.current?.abort(); request.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !configured) return;
    // 邀请码先在本地查格式与校验位：抄错一位直接提示，不打到服务端
    if ((invite || success) && !isWellFormedInviteCode(issued?.code ?? code)) { setError(c.format); return; }
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    let operation: AccessMode = invite || success ? 'invite' : 'signup';
    setBusy(true); setError('');
    try {
      if (invite || success) {
        const destination = await redeemInvite(normalizeInviteCode(issued?.code ?? code), controller.signal);
        if (!controller.signal.aborted) {
          trackEvent('access_completed', { mode: 'invite' });
          window.location.assign(destination);
        }
      } else {
        const result = await registerBeta(email, password, locale, controller.signal);
        if (!controller.signal.aborted) {
          trackEvent('access_completed', { mode: 'signup' });
          setIssued(result); setPassword('');
          operation = 'invite';
          const destination = await redeemInvite(result.code, controller.signal);
          if (!controller.signal.aborted) {
            trackEvent('access_completed', { mode: 'invite', entry: 'registration' });
            window.location.assign(destination);
          }
        }
      }
    } catch (err) {
      if (request.current === controller) {
        const code = err instanceof AuthError ? err.code : 'network';
        setError(c[code]);
        trackEvent('access_failed', { mode: operation, reason: code });
      }
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) setBusy(false);
    }
  }
  return <Dialog.Root open={Boolean(mode)} onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="echuu-access-overlay" />
      <Dialog.Content className="echuu-access" lang={locale} onCloseAutoFocus={(event) => {
        event.preventDefault(); returnFocusRef.current?.focus();
      }}>
        <motion.div className="echuu-access__glass" initial={reduced ? false : { opacity: 0, y: 12, scale: .98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduced ? 0 : .24, ease: [.23, 1, .32, 1] }}>
          <Dialog.Close className="echuu-access__close" aria-label={c.close}><X size={20} /></Dialog.Close>
          <Dialog.Title className="echuu-access__title">{success ? c.successTitle : invite ? c.inviteTitle : c.signupTitle}</Dialog.Title>
          <Dialog.Description className="echuu-access__description">{success ? c.successBody : !configured ? t.apply.body : invite ? c.inviteBody : c.signupBody}</Dialog.Description>
          {success ? <form className="echuu-access__body" onSubmit={submit}>
            <label>{c.code}<input readOnly value={issued.code} aria-label={c.code} onFocus={event => event.target.select()} /></label>
            <p className="echuu-access__privacy">{issued.gift_shards === 3800 ? c.gift : c.accessOnly}</p>
            {error && <p className="echuu-access__error" role="alert">{error}</p>}
            <div className="echuu-access__actions"><button type="submit" className="echuu-access__submit" disabled={busy} aria-busy={busy}>{busy ? c.busy : c.submitInvite}<ArrowRight size={18} /></button></div>
            <p className="echuu-access__switch"><a href={`${PRODUCT_ORIGIN}/#landing/log-in`}>{c.accountLogin}</a></p>
          </form> : !configured ? (
            <div className="echuu-access__body">
              <p role="status">{c.unavailable}</p>
              <p>{t.apply.mailNote}</p>
              <div className="echuu-access__actions">
                <a className="echuu-access__submit" href={mailHref}
                  onClick={() => trackEvent('access_email_fallback', { mode: invite ? 'invite' : 'signup' })}>{t.apply.ctaEmail}<ArrowRight size={18} /></a>
                <p className="echuu-access__contact"><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> · <a href={`mailto:${CONTACT_EMAIL_ALT}`}>{CONTACT_EMAIL_ALT}</a></p>
              </div>
            </div>
          ) : <>
            <form onSubmit={submit} className="echuu-access__form echuu-access__body">
              {invite ? <label>{c.code}<input autoFocus name="invitation" value={code} onChange={(e) => setCode(e.target.value)} required maxLength={256}
                placeholder="ECHU-XXXX-XXXX-X" aria-description={c.codePlaceholder} autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} disabled={busy} /></label> : <>
                <label>{c.email}<input autoFocus type="email" name="email" autoComplete="email" placeholder="you@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required maxLength={254} disabled={busy} /></label>
                <label>{c.password}<span className="echuu-access__password"><input type={showPassword ? 'text' : 'password'} name="password"
                  autoComplete="new-password" placeholder={c.passwordHint} minLength={12} maxLength={128} required value={password}
                  onChange={(e) => setPassword(e.target.value)} disabled={busy} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? c.hide : c.show} aria-pressed={showPassword}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
              </>}
              {!configured && <p className="echuu-access__notice" role="status">{c.unavailable}</p>}
              {error && <p className="echuu-access__error" role="alert">{error}</p>}
              <div className="echuu-access__actions">
                <button type="submit" className="echuu-access__submit" disabled={busy || !configured} aria-busy={busy}>
                  {busy ? c.busy : invite ? c.submitInvite : c.submitSignup}<ArrowRight size={18} />
                </button>
                <p className="echuu-access__switch">{invite ? c.noCode : c.hasCode} <button type="button" onClick={() => onModeChange(invite ? 'signup' : 'invite')}>
                  {invite ? c.beta : c.login}</button></p>
                {!invite && <p className="echuu-access__privacy">{c.privacy}</p>}
                <p className="echuu-access__switch"><a href={`${PRODUCT_ORIGIN}/#landing/log-in`}>{c.accountLogin}</a></p>
              </div>
            </form>
          </>}
        </motion.div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
