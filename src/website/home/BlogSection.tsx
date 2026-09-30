import { useHomeDict } from './useHomeDict';
import { Link } from '../components/Link';
import { Reveal } from '../components/Reveal';
import { websitePath } from '../router';
import { BLOG_POSTS } from '../data/blog';

/** 首页博客区块：最近三篇，玻璃卡片；全文在 /website/{locale}/blog */
export function BlogSection() {
  const { h, locale } = useHomeDict();
  const posts = BLOG_POSTS.slice(0, 3);
  return (
    <section className="hv-section hv-blog" id="blog" aria-labelledby="hv-blog-title">
      <div className="hv-blog__head">
        <div>
          <h2 className="hv-h2" id="hv-blog-title">{h.blog.title}</h2>
          <p className="hv-lede">{h.blog.lede}</p>
        </div>
        <Link className="hv-glass hv-blog__all" to={websitePath(locale, 'blog')}>{h.blog.all}</Link>
      </div>
      <ul className="hv-blog__list">
        {posts.map((post, index) => (
          <li key={post.slug} className="hv-blog__item">
            <Reveal delay={index * 80}>
              <Link className="hv-bcard" to={websitePath(locale, 'blog', post.slug)}>
                <span className="hv-bcard__meta">
                  <span className="hv-bcard__no">{String(index + 1).padStart(2, '0')}</span>
                  <span className="hv-bcard__tag">{post.tag}</span>
                </span>
                <span className="hv-bcard__title">{post.title[locale]}</span>
                <span className="hv-bcard__excerpt">{post.excerpt[locale]}</span>
                <span className="hv-bcard__more">{h.blog.readMore} →</span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
