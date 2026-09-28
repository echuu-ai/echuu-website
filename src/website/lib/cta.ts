import { BETA_SIGNUP_ENDPOINT, CONTACT_EMAIL } from '../config/site';

/**
 * 统一的内测 CTA。没有已验证的报名接口时全站切换为邮件申请，
 * 以后接入表单只改这里，不用改每个区块。
 */
export type BetaCta =
  | { mode: 'form'; to: string }
  | { mode: 'email'; href: string; email: string };

export function buildMailto(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function getBetaCta(subject: string, body: string): BetaCta {
  if (BETA_SIGNUP_ENDPOINT) return { mode: 'form', to: 'apply' };
  return { mode: 'email', href: buildMailto(CONTACT_EMAIL, subject, body), email: CONTACT_EMAIL };
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
