import { useLocale } from '../locale-context';
import { Head } from '../components/Head';
import { GallerySection } from '../sections/GallerySection';

export function GalleryPage() {
  const { locale, t } = useLocale();
  return (
    <>
      <Head
        locale={locale}
        htmlLang={t.htmlLang}
        title={t.meta.gallery.title}
        description={t.meta.gallery.description}
        path="gallery"
      />
      <div className="shell page-head">
        <h1>{t.galleryPage.title}</h1>
        <p>{t.galleryPage.lede}</p>
      </div>
      <GallerySection showAll />
    </>
  );
}
