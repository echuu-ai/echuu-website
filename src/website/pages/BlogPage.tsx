import { Link } from '../components/Link';
import { Head } from '../components/Head';
import { useLocale } from '../locale-context';
import { useWebsiteLocation, websitePath } from '../router';
import { BLOG_POSTS, findBlogPost } from '../data/blog';

/** 博客列表与文章页共用一个组件：有 slug 就渲染文章，否则渲染列表。 */
export function BlogPage() {
  const { locale, t } = useLocale();
  const { slug } = useWebsiteLocation();
  const post = findBlogPost(slug);

  if (slug && !post) {
    return (
      <section className="section">
        <div className="shell">
          <h1 className="section__title">{t.common.notFound}</h1>
          <p className="section__foot">
            <Link className="btn btn--quiet btn--small" to={websitePath(locale, 'blog')}>{t.blogPage.backToList}</Link>
          </p>
        </div>
      </section>
    );
  }

  if (post) {
    return (
      <>
        <Head locale={locale} htmlLang={t.htmlLang} title={`${post.title[locale]} — Echuu`} description={post.excerpt[locale]} path={`blog/${post.slug}`} />
        <article className="blog-post">
          <div className="shell blog-post__shell">
            <p className="blog-post__meta">
              <Link to={websitePath(locale, 'blog')}>{t.blogPage.title}</Link>
              <span aria-hidden="true"> / </span>
              <span className="tag">{post.tag}</span>
            </p>
            <h1 className="blog-post__title">{post.title[locale]}</h1>
            <p className="blog-post__lede">{post.excerpt[locale]}</p>
            <div className="blog-post__body">
              {post.body[locale].map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
            <p className="blog-post__foot">
              <Link className="btn btn--quiet btn--small" to={websitePath(locale, 'blog')}>{t.blogPage.backToList}</Link>
            </p>
          </div>
        </article>
      </>
    );
  }

  return (
    <>
      <Head locale={locale} htmlLang={t.htmlLang} title={t.meta.blog.title} description={t.meta.blog.description} path="blog" />
      <div className="shell page-head">
        <h1>{t.blogPage.title}</h1>
        <p>{t.blogPage.lede}</p>
      </div>
      <section className="section section--tight">
        <div className="shell">
          <div className="blog-list">
            {BLOG_POSTS.map((post, index) => (
              <article className="blog-card" key={post.slug}>
                <p className="blog-card__meta">
                  <span className="blog-card__no">{String(index + 1).padStart(2, '0')}</span>
                  <span className="tag">{post.tag}</span>
                </p>
                <h2 className="blog-card__title">
                  <Link to={websitePath(locale, 'blog', post.slug)}>{post.title[locale]}</Link>
                </h2>
                <p className="blog-card__excerpt">{post.excerpt[locale]}</p>
                <Link className="blog-card__more" to={websitePath(locale, 'blog', post.slug)}>{t.blogPage.readMore}</Link>
              </article>
            ))}
          </div>
          <p className="section__foot">{t.blogPage.note}</p>
        </div>
      </section>
    </>
  );
}
