import { LiquidGlass } from '@liquidglassjs/react';
import '@liquidglassjs/core/css';
import { ChevronDown } from 'lucide-react';
import { useLocale } from '../locale-context';
import { ANSWERS } from '../data/answers';
import { LEGAL_TERMS, LEGAL_AI } from '../assets';
import { HOME_GLASS } from './glass';

export function AnswersSection() {
  const { locale, t } = useLocale();
  const copy = ANSWERS[locale];
  return <section className="hv-section hv-answers" id="questions" aria-labelledby="hv-answers-title">
    <h2 className="hv-h2" id="hv-answers-title">{copy.title}</h2>
    <LiquidGlass className="hv-lglass hv-answers__glass" {...HOME_GLASS}>
      <div className="ps-glass__content hv-answers__content">
        {copy.items.map(({ q, a }) => <details key={q}>
          <summary><span>{q}</span><ChevronDown size={20} strokeWidth={1.6} aria-hidden="true" /></summary>
          <p>{a}</p>
        </details>)}
        <nav className="hv-answers__links" aria-label={copy.title}>
          <a href={`${LEGAL_TERMS}?lang=${locale}`}>{t.trust.links.ip} ↗</a>
          <a href={`${LEGAL_AI}?lang=${locale}`}>{t.trust.links.ai} ↗</a>
        </nav>
      </div>
    </LiquidGlass>
  </section>;
}
