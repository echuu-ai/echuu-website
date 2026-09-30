import { Head } from '../components/Head';
import { useLocale } from '../locale-context';
import { TEAM, type TeamMember } from '../data/team';

function MemberCard({ member, locale, t }: { member: TeamMember; locale: ReturnType<typeof useLocale>['locale']; t: ReturnType<typeof useLocale>['t'] }) {
  const pick = (record?: Record<string, string>) => record?.[locale] ?? record?.en ?? '';
  const initials = pick(member.name).slice(0, 1);
  return (
    <article className="team-card">
      <span className="team-card__avatar" aria-hidden="true">{initials}</span>
      <div className="team-card__body">
        <h3 className="team-card__name">{pick(member.name)}</h3>
        <p className="team-card__role">{pick(member.role)}</p>
        {member.bio ? <p className="team-card__bio">{pick(member.bio)}</p> : null}
        {member.links?.website || member.links?.github ? (
          <p className="team-card__links">
            {member.links.website ? (
              <a href={member.links.website} target="_blank" rel="noreferrer noopener">{t.teamPage.website}</a>
            ) : null}
            {member.links.github ? (
              <a href={member.links.github} target="_blank" rel="noreferrer noopener">{t.teamPage.github}</a>
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
      <div className="shell page-head">
        <h1>{t.teamPage.title}</h1>
        <p>{t.teamPage.lede}</p>
      </div>

      <section className="section section--tight" aria-labelledby="team-core">
        <div className="shell">
          <h2 className="section__title" id="team-core" style={{ fontSize: 24 }}>{t.teamPage.coreTitle}</h2>
          <div className="team-grid" style={{ marginTop: 20 }}>
            {core.map((member) => <MemberCard key={member.id} member={member} locale={locale} t={t} />)}
          </div>
        </div>
      </section>

      <section className="section section--tight" aria-labelledby="team-advisor">
        <div className="shell">
          <h2 className="section__title" id="team-advisor" style={{ fontSize: 24 }}>{t.teamPage.advisorTitle}</h2>
          <div className="team-grid" style={{ marginTop: 20 }}>
            {advisors.map((member) => <MemberCard key={member.id} member={member} locale={locale} t={t} />)}
          </div>
        </div>
      </section>

      <section className="section section--tight" aria-labelledby="team-about">
        <div className="shell">
          <h2 className="section__title" id="team-about" style={{ fontSize: 24 }}>{t.teamPage.aboutTitle}</h2>
          <dl className="team-facts" style={{ marginTop: 20 }}>
            {t.teamPage.facts.map(([label, value]) => (
              <div className="team-facts__row" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="team-thanks">{t.teamPage.thanks}</p>
          <p className="section__foot">{t.teamPage.source}</p>
        </div>
      </section>
    </>
  );
}
