import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, X } from 'lucide-react';
import { useLocale } from '../locale-context';
import { authCopy } from './copy';
import { applicationCopy } from './applicationCopy';
import { waitlistCopy } from './waitlistCopy';
import { AuthError, betaAvailability, redeemInvite, submitBetaApplication } from './api';
import { isWellFormedInviteCode, normalizeInviteCode } from './inviteCode';
import { CONTACT_RECIPIENTS, PRODUCT_ORIGIN } from '../config/site';
import { getReferral } from './referral';
import { trackEvent } from '../lib/googleAnalytics';
import './access.css';

export type AccessMode = 'invite' | 'signup';
export function AccessDialog({ mode, onClose, onModeChange, returnFocusRef }: {
  returnFocusRef: RefObject<HTMLElement>; mode: AccessMode | null; onClose: () => void; onModeChange: (mode: AccessMode) => void;
}) {
  const { locale } = useLocale();
  const c = authCopy[locale];
  const a = applicationCopy[locale];
  const w = waitlistCopy[locale];
  const reduced = useReducedMotion();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [character, setCharacter] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [full, setFull] = useState(false);
  const request = useRef<AbortController | null>(null);
  const invite = mode === 'invite';
  const mailBody = `${a.email}: ${email}\n\n${a.character}:\n${character}\n\n${a.portfolio}: ${portfolio}\n\nLocale: ${locale}\nReferral: ${getReferral() || '—'}`;
  const mailHref = `mailto:${CONTACT_RECIPIENTS}?subject=${encodeURIComponent(a.title)}&body=${encodeURIComponent(mailBody)}`;
  useEffect(() => {
    request.current?.abort(); request.current = null;
    setCode(''); setEmail(''); setCharacter(''); setPortfolio(''); setWebsite('');
    setError(''); setBusy(false); setSubmitted(false); setFull(false);
    if (mode) trackEvent('access_opened', { mode, configured: true });
    return () => { request.current?.abort(); request.current = null; };
  }, [mode]);
  useEffect(() => {
    if (mode !== 'signup') return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    // Capacity changes the wording only. Application intake works while activation is offline.
    betaAvailability(controller.signal).then(value => {
      if (!controller.signal.aborted) setFull(value === 'full');
    }).catch(() => {}).finally(() => clearTimeout(timeout));
    return () => { controller.abort(); clearTimeout(timeout); };
  }, [mode]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (request.current || submitted) return;
    if (invite && !isWellFormedInviteCode(code)) { setError(c.format); return; }
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    setBusy(true); setError('');
    if (!invite) trackEvent('beta_application_submitted', { locale });
    try {
      if (invite) {
        const destination = await redeemInvite(normalizeInviteCode(code), controller.signal);
        if (!controller.signal.aborted) {
          trackEvent('access_completed', { mode: 'invite' });
          window.location.assign(destination);
        }
      } else {
        await submitBetaApplication({ email, character, portfolio, website, locale }, controller.signal);
        if (!controller.signal.aborted) {
          setSubmitted(true);
          trackEvent('beta_application_completed', { locale });
        }
      }
    } catch (err) {
      if (request.current === controller) {
        const reason = err instanceof AuthError ? err.code : 'network';
        setError(!invite && ['failed', 'unavailable'].includes(reason) ? a.failed : c[reason]);
        trackEvent(invite ? 'access_failed' : 'beta_application_failed', { mode: invite ? 'invite' : 'application', reason });
      }
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) { request.current = null; setBusy(false); }
    }
  }
  return <Dialog.Root open={Boolean(mode)} onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="echuu-access-overlay" />
      <Dialog.Content className={`echuu-access${invite ? '' : ' echuu-access--application'}`} lang={locale} onCloseAutoFocus={(event) => {
        event.preventDefault(); returnFocusRef.current?.focus();
      }}>
        <motion.div className="echuu-access__glass" initial={reduced ? false : { opacity: 0, y: 12, scale: .98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduced ? 0 : .24, ease: [.23, 1, .32, 1] }}>
          <Dialog.Close className="echuu-access__close" aria-label={c.close}><X size={20} /></Dialog.Close>
          <Dialog.Title className="echuu-access__title">{submitted ? a.success : invite ? c.inviteTitle : a.title}</Dialog.Title>
          <Dialog.Description className="echuu-access__description">{submitted ? a.successBody : invite ? c.inviteBody : full ? w.body : a.body}</Dialog.Description>
          {submitted ? <div className="echuu-access__body" role="status">
            <div className="echuu-access__actions"><Dialog.Close className="echuu-access__submit">{c.done}</Dialog.Close></div>
          </div> : <form onSubmit={submit} className="echuu-access__form echuu-access__body">
            {invite ? <label>{c.code}<input autoFocus name="invitation" value={code} onChange={(e) => setCode(e.target.value)} required maxLength={256}
              placeholder="ECHU-XXXX-XXXX-X" aria-description={c.codePlaceholder} autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} disabled={busy} /></label> : <>
              <label>{a.email}<input autoFocus type="email" name="email" autoComplete="email" placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required maxLength={254} disabled={busy} /></label>
              <label>{a.character}<textarea name="character" rows={3} placeholder={a.characterHint} value={character}
                onChange={(e) => setCharacter(e.target.value)} maxLength={1000} disabled={busy} /></label>
              <label>{a.portfolio}<input type="url" name="portfolio" placeholder={a.portfolioHint} value={portfolio}
                onChange={(e) => setPortfolio(e.target.value)} maxLength={500} disabled={busy} /></label>
              <div className="echuu-access__trap" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label></div>
            </>}
            {error && <p className="echuu-access__error" role="alert">{error}</p>}
            <div className="echuu-access__actions">
              <button type="submit" className="echuu-access__submit" disabled={busy} aria-busy={busy}>
                {busy ? c.busy : invite ? c.submitInvite : full ? w.submit : a.submit}<ArrowRight size={18} />
              </button>
              {!invite && error && <p className="echuu-access__switch"><a href={mailHref} onClick={() => trackEvent('access_email_fallback', { mode: 'application' })}>{a.fallback}</a></p>}
              {!invite && <p className="echuu-access__privacy">{a.privacy}</p>}
              <p className="echuu-access__switch">{invite ? c.noCode : c.hasCode} <button type="button" onClick={() => onModeChange(invite ? 'signup' : 'invite')}>
                {invite ? c.beta : c.login}</button></p>
              <p className="echuu-access__switch"><a href={`${PRODUCT_ORIGIN}/#landing/log-in`}>{c.accountLogin}</a></p>
            </div>
          </form>}
        </motion.div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
