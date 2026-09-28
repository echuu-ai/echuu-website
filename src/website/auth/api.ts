import { PRODUCT_ORIGIN } from '../config/site';

export const INVITE_ENDPOINT = import.meta.env.VITE_INVITE_REDEEM_ENDPOINT?.trim() || '';
export const SIGNUP_ENDPOINT = import.meta.env.VITE_BETA_ACCOUNT_ENDPOINT?.trim() || '';
export type AuthErrorCode = 'unavailable' | 'invalid' | 'rate' | 'network' | 'failed';
export class AuthError extends Error {
  constructor(public code: AuthErrorCode) { super(code); }
}

// A redirect is issued only after server redemption, and only to our configured app.
export function validateProductRedirect(value: unknown, productOrigin = PRODUCT_ORIGIN) {
  if (typeof value !== 'string') throw new AuthError('failed');
  const url = new URL(value);
  const allowed = new URL(productOrigin);
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.origin !== allowed.origin || url.username || url.password ||
      (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) throw new AuthError('failed');
  return url.href;
}

async function post(endpoint: string, data: object, signal: AbortSignal) {
  if (!endpoint) throw new AuthError('unavailable');
  const url = new URL(endpoint, window.location.origin);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new AuthError('unavailable');
  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data), signal, credentials: 'omit', cache: 'no-store', redirect: 'error' });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new AuthError('network');
  }
  if (response.status === 429) throw new AuthError('rate');
  if ([400, 401, 403, 410].includes(response.status)) throw new AuthError('invalid');
  if (!response.ok) throw new AuthError('failed');
  return response.json();
}

export async function redeemInvite(code: string, signal: AbortSignal) {
  const result = await post(INVITE_ENDPOINT, { code: code.trim() }, signal);
  if (result.status !== 'redeemed') throw new AuthError('failed');
  return validateProductRedirect(result.redirect_url);
}
export async function registerBeta(email: string, password: string, locale: string, signal: AbortSignal) {
  const result = await post(SIGNUP_ENDPOINT, { email: email.trim(), password, locale }, signal);
  if (result.status !== 'pending_invitation') throw new AuthError('failed');
}
