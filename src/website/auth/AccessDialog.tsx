import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, Eye, EyeOff, Sparkles, X } from 'lucide-react';
import { useLocale } from '../locale-context';
import { authCopy } from './copy';
import { AuthError, INVITE_ENDPOINT, SIGNUP_ENDPOINT, redeemInvite, registerBeta } from './api';
import './access.css';

export type AccessMode = 'invite' | 'signup';
export function AccessDialog({ mode, onClose, onModeChange, returnFocusRef }: {
  returnFocusRef: RefObject<HTMLElement>; mode: AccessMode | null; onClose: () => void; onModeChange: (mode: AccessMode) => void;
}) {
  const { locale } = useLocale();
  const c = authCopy[locale];
  const reduced = useReducedMotion();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const invite = mode === 'invite';
  const configured = Boolean(invite ? INVITE_ENDPOINT : SIGNUP_ENDPOINT);
  useEffect(() => {
    request.current?.abort();
    setCode(''); setPassword(''); setEmail(''); setError(''); setBusy(false); setSuccess(false); setShowPassword(false);
    return () => { request.current?.abort(); request.current = null; };
  }, [mode]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !configured) return;
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    setBusy(true); setError('');
    try {
      if (invite) {
        const destination = await redeemInvite(code, controller.signal);
        if (!controller.signal.aborted) window.location.assign(destination);
      } else {
        await registerBeta(email, password, locale, controller.signal);
        if (!controller.signal.aborted) { setSuccess(true); setPassword(''); }
      }
    } catch (err) {
      if (request.current === controller) setError(c[err instanceof AuthError ? err.code : 'network']);
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) setBusy(false);
    }
  }
  return <Dialog.Root open={Boolean(mode)} onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="echuu-access-overlay" />
      <Dialog.Content className="echuu-access" onCloseAutoFocus={(event) => {
        event.preventDefault(); returnFocusRef.current?.focus();
      }}>
        <motion.div className="echuu-access__glass" initial={reduced ? false : { opacity: 0, y: 12, scale: .98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduced ? 0 : .24, ease: [.23, 1, .32, 1] }}>
          <Dialog.Close className="echuu-access__close" aria-label={c.close}><X size={20} /></Dialog.Close>
          <div className="echuu-access__badge" aria-hidden="true">{success ? <Check /> : <Sparkles />}</div>
          <p className="echuu-access__eyebrow">ECHUU · EARLY ACCESS</p>
          <Dialog.Title className="echuu-access__title">{success ? c.successTitle : invite ? c.inviteTitle : c.signupTitle}</Dialog.Title>
          <Dialog.Description className="echuu-access__description">{success ? c.successBody : invite ? c.inviteBody : c.signupBody}</Dialog.Description>
          {success ? <button className="echuu-access__submit" onClick={onClose}>{c.done}<Check size={18} /></button> : <>
            <form onSubmit={submit} className="echuu-access__form">
              {invite ? <label>{c.code}<input autoFocus name="invitation" value={code} onChange={(e) => setCode(e.target.value)} required maxLength={256}
                placeholder={c.codePlaceholder} autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} disabled={busy} /></label> : <>
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
              <button type="submit" className="echuu-access__submit" disabled={busy || !configured} aria-busy={busy}>
                {busy ? c.busy : invite ? c.submitInvite : c.submitSignup}<ArrowRight size={18} />
              </button>
            </form>
            <p className="echuu-access__switch">{invite ? c.noCode : c.hasCode} <button type="button" onClick={() => onModeChange(invite ? 'signup' : 'invite')}>
              {invite ? c.beta : c.login}</button></p>
            {!invite && <p className="echuu-access__privacy">{c.privacy}</p>}
          </>}
        </motion.div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
