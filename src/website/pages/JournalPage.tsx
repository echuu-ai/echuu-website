import { useState } from 'react';
import { useLocale } from '../locale-context';
import { Head } from '../components/Head';
import { JOURNAL_NOTES, RESEARCH_NOTES } from '../data/journal';

export function JournalPage() {
  const { locale, t } = useLocale();
  const [filter, setFilter] = useState<'all' | 'product' | 'research'>('all');

  const all = [...JOURNAL_NOTES, ...RESEARCH_NOTES];
  const shown = filter === 'all' ? all : all.filter((note) => note.category === filter);

  const tabs = [
    { id: 'all' as const, label: t.journal.catAll },
    { id: 'product' as const, label: t.journal.catProduct },
    { id: 'research' as const, label: t.journal.catResearch },
  ];

  return (
    <>
      <Head
        locale={locale}
        htmlLang={t.htmlLang}
        title={t.meta.journal.title}
        description={t.meta.journal.description}
        path="journal"
      />
      <div className="shell page-head">
        <h1>{t.journalPage.title}</h1>
        <p>{t.journalPage.lede}</p>
      </div>

      <section className="section section--tight">
        <div className="shell">
          <div className="radio-row" role="group" aria-label={t.journal.catAll}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className="btn btn--quiet btn--small"
                aria-pressed={filter === tab.id}
                style={
                  filter === tab.id
                    ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-tint)' }
                    : undefined
                }
                onClick={() => setFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="note-list" style={{ marginTop: 24 }}>
            {shown.map((note) => (
              <article className="note-card" key={note.id}>
                <p className="note-card__meta">
                  <span className="tag">
                    {note.category === 'product' ? t.journal.catProduct : t.journal.catResearch}
                  </span>
                </p>
                <h2 style={{ fontSize: 19 }}>{note.title[locale] ?? note.title.en}</h2>
                <p>{note.body[locale] ?? note.body.en}</p>
              </article>
            ))}
          </div>

          {(filter === 'research' || filter === 'all') && RESEARCH_NOTES.length === 0 && (
            <p className="note-empty" style={{ marginTop: 20 }}>
              {t.journal.emptyResearch}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
