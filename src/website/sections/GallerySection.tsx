import { useState } from 'react';
import { Link } from '../components/Link';
import { useLocale } from '../locale-context';
import { websitePath } from '../router';
import { Reveal } from '../components/Reveal';
import { Modal } from '../components/Modal';
import { PUBLIC_GALLERY, PENDING_GALLERY_SLOTS, MEDIA_NAMES, type MediaItem } from '../data/media';
import { PLAY_ICON } from '../assets';

/**
 * S06 角色展架。署名与作品绑定并始终可见，不靠 hover。
 * 只显示允许公开展示的素材；未取得的条目如实标注，不生成假缩略图。
 */
export function GallerySection({ showAll = false }: { showAll?: boolean }) {
  const { locale, t } = useLocale();
  const [openItem, setOpenItem] = useState<MediaItem | null>(null);
  const names = MEDIA_NAMES[locale] ?? MEDIA_NAMES.en;

  return (
    <section className="section" id="gallery" aria-labelledby="gallery-title">
      <div className="shell">
        <Reveal className="section__head">
          <h2 className="section__title" id="gallery-title">
            {t.gallery.title}
          </h2>
          <p className="section__lede">{t.gallery.demoOnly}</p>
        </Reveal>

        <div className="gallery-grid">
          {PUBLIC_GALLERY.map((item) => (
            <Reveal key={item.id} className="gallery-card">
              <div className="gallery-card__media">
                <img src={PLAY_ICON} alt="" width={40} height={40} />
              </div>
              <div className="gallery-card__meta">
                <h3 className="gallery-card__name">{names[item.nameKey] ?? item.nameKey}</h3>
                <dl className="gallery-card__rows">
                  <div className="gallery-card__row">
                    <dt>{t.gallery.labels.creator}</dt>
                    <dd>{item.creator ?? '—'}</dd>
                  </div>
                  <div className="gallery-card__row">
                    <dt>{t.gallery.labels.status}</dt>
                    <dd>
                      <span className={`tag ${item.statusKey === 'beta' ? 'tag--beta' : 'tag--local'}`}>
                        {item.statusKey === 'beta' ? t.video.statusBeta : t.video.statusLocal}
                      </span>
                    </dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="btn btn--quiet btn--small"
                  onClick={() => setOpenItem(item)}
                >
                  {t.gallery.open}
                </button>
              </div>
            </Reveal>
          ))}

          {PENDING_GALLERY_SLOTS.map((slot) => (
            <Reveal key={slot.id} className="gallery-card gallery-card--pending">
              <div className="gallery-card__media">
                <span className="tag tag--pending">{t.common.pendingMaterial}</span>
              </div>
              <div className="gallery-card__meta">
                <h3 className="gallery-card__name">{names[slot.nameKey]}</h3>
                <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>{names[slot.noteKey]}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {!showAll && (
          <p className="section__foot">
            <Link className="btn btn--quiet btn--small" to={websitePath(locale, 'gallery')}>
              {t.gallery.more}
            </Link>
          </p>
        )}

        {openItem && (
          <Modal
            title={names[openItem.nameKey] ?? openItem.nameKey}
            closeLabel={t.gallery.modalClose}
            onClose={() => setOpenItem(null)}
          >
            {openItem.youtubeId && (
              <div className="video-frame">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${openItem.youtubeId}?rel=0&cc_load_policy=1`}
                  title={names[openItem.nameKey] ?? openItem.nameKey}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            <dl>
              <dt>{t.gallery.labels.creator}</dt>
              <dd>{openItem.creator ?? '—'}</dd>
              <dt>{t.gallery.credits}</dt>
              <dd>{openItem.sourceNote}</dd>
              <dt>{t.gallery.aiNote}</dt>
              <dd>{openItem.aiNote}</dd>
            </dl>
            <p style={{ fontSize: 14, color: 'var(--ink-faint)' }}>{t.gallery.noDownload}</p>
          </Modal>
        )}
      </div>
    </section>
  );
}
