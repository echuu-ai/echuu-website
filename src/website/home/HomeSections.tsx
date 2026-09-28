import { useEffect, useRef, useState } from 'react';
import { useHomeDict } from './useHomeDict';
import { HOME_ASSETS } from '../assets';
import { INTRO_VIDEO, LEGAL_DOCS, CONTACT_EMAIL } from '../config/site';
import { buildMailto } from '../lib/cta';
import { VrmGuide } from '../components/VrmGuide';
import { Reveal } from '../components/Reveal';

/** 简介卡：左蓝色说明面板 + 右侧别针吊饰 */
export function IntroSection() {
  const { h } = useHomeDict();
  return (
    <section className="hv-section hv-intro" id="intro" aria-labelledby="hv-intro-kicker">
      <Reveal className="hv-intro__card">
        <div className="hv-intro__panel">
          <h2 className="hv-intro__kicker" id="hv-intro-kicker" lang="en">
            {h.intro.kicker}
            <img src={HOME_ASSETS.icons.star4} alt="" className="hv-intro__star" />
          </h2>
          <p className="hv-intro__body">{h.intro.body}</p>
        </div>
        <figure className="hv-intro__art">
          <img src={HOME_ASSETS.brooch} alt={h.intro.brooch} width={433} height={518} loading="lazy" decoding="async" />
          <img src={HOME_ASSETS.icons.sparkle} alt="" className="hv-intro__sparkle" />
        </figure>
      </Reveal>
    </section>
  );
}

/** 三步出道：左侧三张玻璃框截图，右侧编号说明，背景一个巨大的「3」 */
export function StepsSection() {
  const { h } = useHomeDict();
  return (
    <section className="hv-section hv-steps" id="steps" aria-labelledby="hv-steps-title">
      <Reveal className="hv-steps__head">
        <img className="hv-steps__girl" src={HOME_ASSETS.silhouetteGirl} alt="" width={88} height={232} loading="lazy" />
        <div>
          <h2 className="hv-h2 hv-h2--right" id="hv-steps-title">{h.steps.title}</h2>
          <p className="hv-lede hv-lede--right">{h.steps.lede}</p>
        </div>
      </Reveal>
      <span className="hv-steps__three" aria-hidden="true">3</span>
      <ol className="hv-steps__list">
        {h.steps.items.map((item, index) => (
          <li key={item.no} className="hv-steps__item">
            <Reveal className="hv-steps__shot">
              <img src={HOME_ASSETS.steps[index]} alt={h.steps.shotAlt[index]} width={702} height={382} loading="lazy" decoding="async" />
            </Reveal>
            <Reveal className="hv-steps__text">
              <span className="hv-steps__no">{item.no}</span>
              <h3 className="hv-steps__title">{item.title}</h3>
              <p className="hv-steps__body">{item.body}</p>
              {index === 0 ? (
                <VrmGuide label={h.steps.vrmGuide} />
              ) : null}
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FeatureVideo() {
  const { h } = useHomeDict();
  const [playing, setPlaying] = useState(false);
  const src = `https://www.youtube-nocookie.com/embed/${INTRO_VIDEO.youtubeId}?autoplay=1&rel=0`;
  return (
    <Reveal className="hv-feature__video">
      {playing ? (
        <iframe
          src={src}
          title={h.feature.videoAlt}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" className="hv-feature__poster" onClick={() => setPlaying(true)} aria-label={h.feature.play}>
          <img src={HOME_ASSETS.videoPoster} alt={h.feature.videoAlt} width={941} height={523} loading="lazy" decoding="async" />
          <span className="hv-feature__play" aria-hidden="true" />
        </button>
      )}
    </Reveal>
  );
}

/** 直播间体验：标题 + LIVE + 视频 + 三张横向循环的功能卡 */
export function FeatureSection() {
  const { h } = useHomeDict();
  const cards = [
    { ...h.feature.cards[0], art: <img className="hv-fcard__art hv-fcard__art--mocap" src={HOME_ASSETS.mocapFigure} alt="" loading="lazy" /> },
    {
      ...h.feature.cards[1],
      art: (
        <span className="hv-fcard__art hv-fcard__art--gifts">
          {HOME_ASSETS.gifts.map((gift) => (
            <img key={gift} src={gift} alt="" loading="lazy" />
          ))}
        </span>
      ),
    },
    { ...h.feature.cards[2], art: <img className="hv-fcard__art hv-fcard__art--stamp" src={HOME_ASSETS.snapshotStamp} alt="" loading="lazy" /> },
  ];
  const loop = [...cards, ...cards];
  return (
    <section className="hv-section hv-feature" id="feature" aria-labelledby="hv-feature-title">
      <img className="hv-feature__jagged" src={HOME_ASSETS.jaggedShape} alt="" aria-hidden="true" loading="lazy" />
      <Reveal className="hv-feature__head">
        <h2 className="hv-h2" id="hv-feature-title">
          {h.feature.title}
          <span className="hv-live">{h.feature.live}</span>
        </h2>
        <p className="hv-lede">{h.feature.lede}</p>
      </Reveal>
      <FeatureVideo />
      <div className="hv-fcards" tabIndex={0} role="list" aria-label={h.feature.title}>
        <div className="hv-fcards__track">
          {loop.map((card, index) => (
            <article
              key={`${card.title}-${index}`}
              className="hv-fcard"
              role={index < cards.length ? 'listitem' : undefined}
              aria-hidden={index >= cards.length ? true : undefined}
            >
              {card.art}
              <div className="hv-fcard__text">
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </div>
              <span className="hv-fcard__stars" aria-hidden="true">
                <img src={HOME_ASSETS.icons.star4} alt="" />
                <img src={HOME_ASSETS.icons.star4} alt="" />
                <img src={HOME_ASSETS.icons.star4} alt="" />
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * 把区块进入视口的程度写成 CSS 变量（0 → 1），驱动钥匙开合与标题浮现。
 * 用 scroll + rAF 而不是 CSS scroll-driven animation，Safari 也能跑；reduce motion 时直接给 1。
 */
function useScrollReveal(ref: React.RefObject<HTMLElement>, name: string, span = 0.75) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { node.style.setProperty(name, '1'); return; }
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 区块顶边从视口底进入到走过 span 个视口高度的过程映射为 0..1
      const progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh * span)));
      node.style.setProperty(name, progress.toFixed(3));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ref, name, span]);
}

/** 直播模式：一对心形半钥匙先是合拢的，随滚动轻轻打开露出标题；三张社交卡，底部猫与斑马线 */
export function ModesSection() {
  const { h } = useHomeDict();
  const sectionRef = useRef<HTMLElement>(null);
  useScrollReveal(sectionRef, '--key-open');
  const cards = [
    { ...h.modes.cards[2], src: HOME_ASSETS.modes.talk, id: 'talk' },
    { ...h.modes.cards[0], src: HOME_ASSETS.modes.reaction, id: 'reaction' },
    { ...h.modes.cards[1], src: HOME_ASSETS.modes.song, id: 'song' },
  ];
  const [lede1, lede2] = h.modes.lede.split('\n');
  return (
    <section className="hv-section hv-modes" id="modes" aria-labelledby="hv-modes-title" ref={sectionRef}>
      <div className="hv-modes__keys" aria-hidden="true">
        <img className="hv-modes__key hv-modes__key--left" src={HOME_ASSETS.keyLeft} alt="" loading="lazy" />
        <img className="hv-modes__key hv-modes__key--right" src={HOME_ASSETS.keyRight} alt="" loading="lazy" />
      </div>
      <div className="hv-modes__head">
        <img className="hv-modes__runner" src={HOME_ASSETS.runningSilhouette} alt="" width={130} height={190} loading="lazy" />
        <h2 className="hv-h2 hv-h2--center" id="hv-modes-title">{h.modes.title}</h2>
        <p className="hv-lede hv-lede--center">
          {lede1}
          <br />
          {lede2}
        </p>
      </div>
      <ul className="hv-mcards">
        {cards.map((card) => (
          <li key={card.id} className={`hv-mcard hv-mcard--${card.id}`}>
            <Reveal>
              <header className="hv-mcard__head">
                <span className="hv-mcard__avatar" aria-hidden="true" />
                <span className="hv-mcard__name">{card.name}</span>
              </header>
              <img className="hv-mcard__media" src={card.src} alt={card.alt} loading="lazy" decoding="async" />
              <footer className="hv-mcard__actions" aria-hidden="true">
                <img src={HOME_ASSETS.icons.heart} alt={h.modes.actions.like} />
                <img src={HOME_ASSETS.icons.comment} alt={h.modes.actions.comment} />
                <img src={HOME_ASSETS.icons.share} alt={h.modes.actions.share} />
                <img className="hv-mcard__save" src={HOME_ASSETS.icons.bookmark} alt={h.modes.actions.save} />
              </footer>
            </Reveal>
          </li>
        ))}
      </ul>
      <Reveal className="hv-modes__crosswalk" aria-hidden="true">
        <img className="hv-modes__road" src={HOME_ASSETS.crosswalk} alt="" loading="lazy" />
        <img className="hv-modes__cat" src={HOME_ASSETS.cat} alt="" loading="lazy" />
      </Reveal>
    </section>
  );
}

/** 创作者：宣言、三个玻璃按钮、手拉手剪影图 */
export function CreatorsSection() {
  const { h } = useHomeDict();
  const [title1, title2] = h.creators.title.split('\n');
  const partner = buildMailto(CONTACT_EMAIL, h.beta.partnerSubject, h.beta.partnerBody);
  return (
    <section className="hv-section hv-creators" id="creators" aria-labelledby="hv-creators-title">
      <div className="hv-creators__grid">
        <Reveal className="hv-creators__manifesto">
          <p className="hv-creators__zh">{h.creators.manifesto}</p>
          <p className="hv-creators__en" lang="en">{h.creators.manifestoEn}</p>
        </Reveal>
        <Reveal className="hv-creators__right">
          <h2 className="hv-h2 hv-h2--right" id="hv-creators-title">
            {title1}
            <br />
            {title2}
          </h2>
          <p className="hv-lede hv-lede--right">{h.creators.lede}</p>
          <div className="hv-creators__actions">
            <a className="hv-glass" href={partner}>{h.creators.cta}</a>
            <a className="hv-glass" href={LEGAL_DOCS.terms} target="_blank" rel="noreferrer noopener">{h.creators.ip}</a>
            <a className="hv-glass" href={LEGAL_DOCS.ai} target="_blank" rel="noreferrer noopener">{h.creators.ai}</a>
          </div>
        </Reveal>
      </div>
      <img className="hv-creators__art" src={HOME_ASSETS.creatorsCircle} alt={h.creators.imageAlt} width={1058} height={794} loading="lazy" decoding="async" />
    </section>
  );
}
