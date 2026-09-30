import { type CSSProperties } from 'react';
import { HOME_ASSETS } from '../assets';
import { Reveal } from '../components/Reveal';
import '../styles/team.css';
import { Head } from '../components/Head';
import { useLocale } from '../locale-context';
import { TEAM, type TeamMember } from '../data/team';

function MemberCard({ member, locale, t }: { member: TeamMember; locale: ReturnType<typeof useLocale>['locale']; t: ReturnType<typeof useLocale>['t'] }) {
  const pick = (record?: Record<string, string>) => record?.[locale] ?? record?.en ?? '';

  return (
    <article className={`team-card ${member.id === 'cory' ? 'team-card--founder' : ''}`}>
      <span className="team-card__spark" aria-hidden="true">✦</span>
      <div className="team-card__body">
        <h3 className="team-card__name">{pick(member.name)}</h3>
        <p className="team-card__role">{pick(member.role)}</p>
        {member.bio ? <p className="team-card__bio">{pick(member.bio)}</p> : null}
        {member.links?.website || member.links?.github ? (
          <p className="team-card__links">
            {member.links.website ? (
              <a href={member.links.website} target="_blank" rel="noreferrer noopener">{t.teamPage.website} <span aria-hidden="true">↗</span></a>
            ) : null}
            {member.links.github ? (
              <a href={member.links.github} target="_blank" rel="noreferrer noopener">{t.teamPage.github} <span aria-hidden="true">↗</span></a>
            ) : null}
          </p>
        ) : null}
      </div>
    </article>
  );
}

/** 团队页：核心成员 + 技术顾问 + 公司基本信息，内容对齐 Notion 媒体资料包。 */
export function TeamPage() {
  const { locale, t } = useLocale();
  const core = TEAM.filter((member) => member.group === 'core');
  const advisors = TEAM.filter((member) => member.group === 'advisor');
  return (
    <>
      <Head locale={locale} htmlLang={t.htmlLang} title={t.meta.team.title} description={t.meta.team.description} path="team" />
      <div className="team-world" style={{ '--team-sky': `url(${HOME_ASSETS.skyBg})` } as CSSProperties} aria-hidden="true" />
      <div className="team-page">
      <div className="shell team-heading">
        <span className="team-heading__mark" aria-hidden="true">✦</span>
        <h1>{t.teamPage.title}</h1>
        <p>{t.teamPage.lede}</p>
      </div>

      <section className="team-section" aria-labelledby="team-core">
        <div className="shell">
          <h2 className="team-section__title" id="team-core">{t.teamPage.coreTitle}</h2>
          <div className="team-grid">
            {core.map((member) => <Reveal key={member.id}><MemberCard member={member} locale={locale} t={t} /></Reveal>)}
          </div>
        </div>
      </section>

      <section className="team-section" aria-labelledby="team-advisor">
        <div className="shell">
          <h2 className="team-section__title" id="team-advisor">{t.teamPage.advisorTitle}</h2>
          <div className="team-grid">
            {advisors.map((member) => <Reveal key={member.id}><MemberCard member={member} locale={locale} t={t} /></Reveal>)}
          </div>
        </div>
      </section>

      <section className="team-section" aria-labelledby="team-about">
        <div className="shell">
          <h2 className="team-section__title" id="team-about">{t.teamPage.aboutTitle}</h2>
          <div className="team-about-panel">
          <dl className="team-facts">
            {t.teamPage.facts.map(([label, value]) => (
              <div className="team-facts__row" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="team-thanks">{t.teamPage.thanks}</p>
          <p className="team-source">{t.teamPage.source}</p>
          </div>
        </div>
      </section>
      </div>
    </>
  );
}
