import { LiquidGlass } from '@liquidglassjs/react';
import '@liquidglassjs/core/css';
import { useHomeDict } from './useHomeDict';
import { Link } from '../components/Link';
import { Reveal } from '../components/Reveal';
import { websitePath } from '../router';
import { BLOG_POSTS } from '../data/blog';

/**
 * 首页博客区块：最近三篇，全文在 /website/{locale}/blog。
 * 卡片是真的液态玻璃（@liquidglassjs，和团队页同一套）：边缘折射背后的天空，没有描边和白色厚底；
 * 文字放在 ps-glass__content 里，仍是可选中、可点击的普通 DOM。
 */
import { HOME_GLASS as GLASS } from './glass';
export function BlogSection() {
  const { h, locale } = useHomeDict();
  const posts = BLOG_POSTS.slice(0, 3);
  return (
    <section className="hv-section hv-section--hold hv-blog" id="blog" aria-labelledby="hv-blog-title">
      <div className="hv-hold">
      <div className="hv-blog__head">
        <div>
          <h2 className="hv-h2" id="hv-blog-title">{h.blog.title}</h2>
          <p className="hv-lede">{h.blog.lede}</p>
        </div>
        <LiquidGlass className="hv-lglass hv-lglass--pill" {...GLASS} radius={26}>
          <Link className="hv-blog__all ps-glass__content" to={websitePath(locale, 'blog')}>{h.blog.all}</Link>
        </LiquidGlass>
      </div>
      <ul className="hv-blog__list">
        {posts.map((post, index) => (
          <li key={post.slug} className="hv-blog__item">
            <Reveal delay={index * 80}>
              <LiquidGlass className="hv-lglass" {...GLASS}>
              <Link className="hv-bcard ps-glass__content" to={websitePath(locale, 'blog', post.slug)}>
                <span className="hv-bcard__meta">
                  <span className="hv-bcard__no">{String(index + 1).padStart(2, '0')}</span>
                  <span className="hv-bcard__tag">{post.tag}</span>
                </span>
                <span className="hv-bcard__title">{post.title[locale]}</span>
                <span className="hv-bcard__excerpt">{post.excerpt[locale]}</span>
                <span className="hv-bcard__more">{h.blog.readMore} →</span>
              </Link>
              </LiquidGlass>
            </Reveal>
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
}
