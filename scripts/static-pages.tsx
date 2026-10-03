import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DICTS, WEBSITE_LOCALES, type Locale } from '../src/website/i18n';
import { HOME_DICTS } from '../src/website/i18n/home';
import { BLOG_POSTS } from '../src/website/data/blog';
import { JOURNAL_NOTES, RESEARCH_NOTES } from '../src/website/data/journal';
import { TEAM } from '../src/website/data/team';
import { ANSWERS } from '../src/website/data/answers';
import { seoDocument, publicRoutes, type SeoOptions } from '../src/website/seo/siteSeo';

function Content({ locale, path, base }: { locale: Locale; path: string; base: string }) {
  const t = DICTS[locale], h = HOME_DICTS[locale];
  const href = (page = '') => `${base}website/${locale}/${page ? `${page}/` : ''}`;
  const post = BLOG_POSTS.find((entry) => `blog/${entry.slug}` === path);
  const links = <nav aria-label={t.nav.menu}>
    <a href={href()}>{t.nav.home}</a>{' · '}
    <a href={href('blog')}>{t.blogPage.title}</a>{' · '}
    <a href={href('creators')}>{t.nav.creators}</a>{' · '}
    <a href={href('team')}>{t.teamPage.title}</a>
  </nav>;
  const paragraphs = (items: readonly { title: string; body: string }[]) => items.map((item) => <section key={item.title}><h3>{item.title}</h3><p>{item.body}</p></section>);
  let body: React.ReactNode;
  if (!path) body = <>
    <h1>{h.hero.slogan.pre} {h.hero.slogan.hl1} {h.hero.slogan.mid} {h.hero.slogan.hl2}</h1>
    <p>{h.intro.body}</p>
    <section><h2>{h.steps.title}</h2>{paragraphs(h.steps.items)}</section>
    <section><h2>{t.features.title}</h2>{paragraphs(t.features.items)}</section>
    <section><h2>{t.modes.title}</h2><p>{t.modes.footnote}</p></section>
    <section><h2>{h.creators.title}</h2><p>{t.creators.manifesto}</p><p>{t.creators.body}</p></section>
    <section><h2>{h.blog.title}</h2>{BLOG_POSTS.map((entry) => <article key={entry.slug}><h3><a href={href(`blog/${entry.slug}`)}>{entry.title[locale]}</a></h3><p>{entry.excerpt[locale]}</p></article>)}</section>
    <section><h2>{ANSWERS[locale].title}</h2>{ANSWERS[locale].items.map((item) => <section key={item.q}><h3>{item.q}</h3><p>{item.a}</p></section>)}</section>
  </>;
  else if (post) body = <article><h1>{post.title[locale]}</h1><p>{post.excerpt[locale]}</p>{post.body[locale].map((p) => <p key={p}>{p}</p>)}</article>;
  else if (path === 'blog') body = <><h1>{t.blogPage.title}</h1><p>{t.blogPage.lede}</p>{BLOG_POSTS.map((entry) => <article key={entry.slug}><h2><a href={href(`blog/${entry.slug}`)}>{entry.title[locale]}</a></h2><p>{entry.excerpt[locale]}</p></article>)}</>;
  else if (path === 'team') body = <><h1>{t.teamPage.title}</h1><p>{t.teamPage.lede}</p>{TEAM.map((person) => <article key={person.id}><h2>{person.name[locale]}</h2><p>{person.role[locale]}</p><p>{person.bio?.[locale]}</p></article>)}<dl>{t.teamPage.facts.map(([label,value]) => <React.Fragment key={label}><dt>{label}</dt><dd>{value}</dd></React.Fragment>)}</dl></>;
  else if (path === 'creators') body = <><h1>{t.creatorsPage.title}</h1><p>{t.creatorsPage.lede}</p><p>{t.creators.manifesto}</p>{paragraphs(t.creators.intents)}<p>{t.creators.disclaimer}</p>{paragraphs(t.trust.items)}</>;
  else if (path === 'gallery') body = <><h1>{t.galleryPage.title}</h1><p>{t.galleryPage.lede}</p><p>{t.gallery.demoOnly}</p><a href="https://youtu.be/qvF5M1orvcU">{t.video.openExternal}</a><p>{t.gallery.noDownload}</p></>;
  else if (path === 'journal') body = <><h1>{t.journalPage.title}</h1><p>{t.journalPage.lede}</p><div>{[...JOURNAL_NOTES, ...RESEARCH_NOTES].map((note) => <article key={note.id}><h2>{note.title[locale] ?? note.title.en}</h2><p>{note.body[locale] ?? note.body.en}</p></article>)}</div><a href={href('blog')}>{t.blogPage.title}</a></>;
  else if (path === 'feedback') body = <><h1>{t.feedbackPage.title}</h1><p>{t.feedbackPage.lede}</p><p>{t.feedbackPage.noBackendNotice}</p><p>{t.feedbackPage.privacyNotice}</p></>;
  else if (path === 'doodle') body = <><h1>{t.doodlePage.title}</h1><p>{t.doodlePage.lede}</p><p>{t.doodlePage.localOnly}</p><p>{t.doodlePage.noPublicWall}</p></>;
  else body = <><h1>{t.common.notFound}</h1><a href={href()}>{t.common.backHome}</a></>;
  return <main id="main" className="seo-static">{links}{body}<footer><a href="mailto:cory@anngel.live">cory@anngel.live</a><p>Echuu · Anngel LLC</p><nav aria-label={t.nav.language}>{WEBSITE_LOCALES.map((l) => <a key={l} href={`${base}website/${l}/${path && publicRoutes().includes(path) ? `${path}/` : ''}`} hrefLang={DICTS[l].htmlLang}>{DICTS[l].localeName}{' '}</a>)}</nav></footer></main>;
}

const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function staticPages(template: string, options: SeoOptions) {
  const result: Record<string, string> = {};
  const base = `/${options.base.split('/').filter(Boolean).join('/')}${options.base === '/' ? '' : '/'}`;
  const make = (locale: Locale, path: string) => {
    const seo = seoDocument(locale, path, options);
    const localImage = `${base}website/figma/hero-shot.webp`;
    const meta = (attr: string, name: string, value: string) => `<meta data-seo="1" ${attr}="${name}" content="${escape(value)}" />`;
    const tags = [
      `<title>${escape(seo.title)}</title>`, meta('name', 'description', seo.description),
      meta('name', 'robots', seo.indexable ? 'index,follow,max-image-preview:large' : 'noindex,follow'),
      meta('property', 'og:title', seo.title), meta('property', 'og:description', seo.description),
      meta('property', 'og:type', seo.article ? 'article' : 'website'), meta('property', 'og:site_name', 'Echuu'),
      meta('property', 'og:locale', seo.lang.replace('-', '_')),
      meta('property', 'og:image', seo.indexable ? seo.image : localImage),
      meta('name', 'twitter:card', 'summary_large_image'), meta('name', 'twitter:title', seo.title),
      meta('name', 'twitter:description', seo.description), meta('name', 'twitter:image', seo.indexable ? seo.image : localImage),
      `<script data-seo="1" type="application/ld+json">${JSON.stringify(seo.schema).replace(/</g, '\\u003c')}</script>`,
    ];
    if (seo.indexable) {
      tags.push(meta('property', 'og:url', seo.url), `<link data-seo="1" rel="canonical" href="${escape(seo.url)}" />`);
      for (const alt of [...seo.alternates, { lang: 'x-default', url: seo.xDefault }]) tags.push(`<link data-seo="1" rel="alternate" hreflang="${alt.lang}" href="${escape(alt.url)}" />`);
    }
    return template.replace(/<html\b[^>]*>/, `<html lang="${seo.lang}" class="echuu-booting">`)
      .replace(/<title>[\s\S]*?<\/title>/g, '')
      .replace(/<meta\b[^>]*(?:name="(?:description|keywords|robots|twitter:[^"]*)"|property="og:[^"]*")[^>]*>/g, '')
      .replace('</head>', `${tags.join('\n')}\n</head>`)
      .replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${renderToStaticMarkup(<Content locale={locale} path={path} base={base} />)}</div>`);
  };
  for (const locale of WEBSITE_LOCALES) for (const path of [...publicRoutes(), 'moodboard']) result[`website/${locale}/${path ? `${path}/` : ''}index.html`] = make(locale, path);
  result['index.html'] = make('en', '');
  result['website/index.html'] = make('en', '');
  result['404.html'] = make('en', 'not-found');
  const urls = options.indexable ? WEBSITE_LOCALES.flatMap((locale) => publicRoutes().map((path) => seoDocument(locale, path, options).url)) : [];
  result['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${escape(url)}</loc></url>`).join('')}</urlset>`;
  // noindex remains readable to crawlers on previews; disallow would hide that directive.
  result['robots.txt'] = `User-agent: *\nAllow: /\n${options.indexable ? `Sitemap: ${new URL(`${base}sitemap.xml`, options.origin).href}\n` : '# Preview: pages carry noindex; the sitemap is intentionally empty.\n'}`;
  result['.nojekyll'] = '';
  return result;
}
