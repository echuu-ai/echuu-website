import { useLocale } from '../locale-context';
import { Head } from '../components/Head';
import { PROTOTYPE_STILLS } from '../data/media';
import { PROTOTYPE_FRAME, ANGEL_DECO, GIFT_ENVELOPE, GIFT_PEBBLE, RING_CENTER_A, SKY_BLOB, SKY_GLOW, WING_DECO, WING_MARK } from '../assets';

/**
 * 内部设计审阅用 moodboard。noindex，不放进公开导航或 sitemap。
 * 未核对授权的素材只出现在这里，不进入对外页面。
 */
const SWATCHES = [
  { name: 'White', hex: '#FFFFFF', use: '主底与卡片' },
  { name: 'Sky', hex: '#6EC9F7', use: '品牌蓝，装饰与状态点' },
  { name: 'Sky pale', hex: '#C7E9FF', use: '天空渐变、海报底' },
  { name: 'Page', hex: '#F7FBFF', use: '阅读底' },
  { name: 'Ink', hex: '#172B45', use: '正文与标题' },
  { name: 'Accent', hex: '#0D5490', use: '链接与主按钮（白底对比 7.4:1）' },
];

const BRAND_ANCHORS = [
  { src: SKY_BLOB, title: 'B01 天空色块', note: 'figma-1146-sky.png。Hero 背景与配色参考；正文区加稳定浅底。' },
  { src: SKY_GLOW, title: 'B02 天光', note: 'figma-1146-sky-glow.png。低强度，不盖文字。' },
  { src: RING_CENTER_A, title: 'B03 轨道环', note: 'figma-1146-ellipse-*.svg。形状复用，按最新蓝白更新，不复刻旧薄荷绿。' },
  { src: WING_MARK, title: 'B06 品牌 mark', note: 'figma-1146-wing-mark.svg。沿用已有资产，不重绘新 logo。' },
];

const DECOR = [
  { src: ANGEL_DECO, title: 'B05 angel-deco', note: '小型品牌装饰，保留透明底；整屏最多一组装饰主角。' },
  { src: WING_DECO, title: 'B05 wing-deco', note: '页脚装饰。' },
  { src: GIFT_ENVELOPE, title: 'C03 礼物图标', note: '互动局部配图；不暗示礼物购买或支付已上线。' },
  { src: GIFT_PEBBLE, title: 'C03 礼物图标', note: '同上。' },
];

export function MoodboardPage() {
  const { locale, t } = useLocale();

  return (
    <>
      <Head
        locale={locale}
        htmlLang={t.htmlLang}
        title="Moodboard（内部审阅）— Echuu"
        description="内部设计审阅用素材板，不公开索引。"
        path="moodboard"
        noindex
      />
      <div className="shell page-head">
        <h1>Moodboard（内部审阅）</h1>
        <p>蓝白天空里的 Original Character 舞台。此页 noindex，不在公开导航与 sitemap 中。</p>

        <div className="mood-banner">
          本页含<strong>未核对授权</strong>的素材，仅供内部审阅，不得用于对外发布。
          角色模型作者与授权状态见 <code>docs/source-audit.md</code> 与 <code>asset-manifest.json</code>。
        </div>
      </div>

      <div className="shell" style={{ paddingBottom: 60 }}>
        <section className="mood-col">
          <h2>1 · 品牌锚点</h2>
          <p>已在产品中使用的形状与天空素材，来源为主仓库 Figma 导出。</p>
          <div className="mood-samples">
            {BRAND_ANCHORS.map((item) => (
              <figure className="mood-sample" key={item.title} style={{ margin: 0 }}>
                <img src={item.src} alt={item.title} loading="lazy" />
                <figcaption className="mood-sample__note">
                  <strong>{item.title}</strong>
                  <span>{item.note}</span>
                  <span className="tag">approved · 自有资产</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="mood-col">
          <h2>2 · 角色与实录</h2>
          <p>
            取自本地文件 <code>Echuu-预研完整演示-主题-弹幕-礼物-MVP.mp4</code>（6 分 24 秒，已核对）。
            画面中角色模型的作者与授权<strong>未确认</strong>，因此不进入对外页面。
          </p>
          <div className="mood-samples">
            {PROTOTYPE_STILLS.map((item) => (
              <figure className="mood-sample" key={item.id} style={{ margin: 0 }}>
                <img src={PROTOTYPE_FRAME(item.src ?? "")} alt={item.sourceNote} loading="lazy" />
                <figcaption className="mood-sample__note">
                  <strong>{item.id}</strong>
                  <span>{item.sourceNote}</span>
                  <span className="tag tag--local">本地预研演示 · rights unverified</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="mood-col">
          <h2>3 · 材质与配色</h2>
          <p>约 70% 阅读留白、20% 天空蓝、10% 角色与点缀。蓝白玻璃只用于少量装饰。</p>
          <div className="swatch-row">
            {SWATCHES.map((swatch) => (
              <div className="swatch" key={swatch.hex}>
                <div
                  className="swatch__chip"
                  style={{ background: swatch.hex, borderBottom: '1px solid var(--line)' }}
                />
                <div className="swatch__meta">
                  <strong>{swatch.name}</strong>
                  <div>{swatch.hex}</div>
                  <div>{swatch.use}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mood-col">
          <h2>4 · 字体排版</h2>
          <p>品牌 tagline 使用英文品牌字体规则；本地语言标题按 echuu-typography 的对应字体。</p>

          <div className="type-sample">
            <div className="type-sample__label">
              品牌 tagline · 蒲瓜纤云宋拉丁字形（商用免费）
            </div>
            <div style={{ fontFamily: 'var(--font-brand)', fontSize: 48, lineHeight: 1.05 }} lang="en">
              To recreate life out of live
            </div>
          </div>

          <div className="type-sample">
            <div className="type-sample__label">
              中文标题 · 蒲瓜纤云宋子集缺字（599 字形，不覆盖本站新文案），暂用系统中文字体
            </div>
            <div style={{ fontFamily: "'PingFang SC','Hiragino Sans GB',sans-serif", fontSize: 30 }} lang="zh-CN">
              设定不只写在角色卡上。
            </div>
          </div>

          <div className="type-sample">
            <div className="type-sample__label">日文标题 · Shippori Mincho Bold（随包附 OFL）</div>
            <div style={{ fontFamily: "'Shippori Mincho Web', serif", fontSize: 30 }} lang="ja">
              設定は、キャラクターシートの中だけのものではない。
            </div>
          </div>

          <div className="type-sample">
            <div className="type-sample__label">韩文标题 · Maru Buri SemiBold（许可待核实）</div>
            <div style={{ fontFamily: "'Maru Buri Web', sans-serif", fontSize: 30 }} lang="ko">
              설정은 캐릭터 시트에만 있는 게 아닙니다.
            </div>
          </div>

          <div className="type-sample">
            <div className="type-sample__label">正文 UI · Inter</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 17 }}>
              设定角色、选好话题，让 TA 讲故事，和观众互动。 / Define your character, choose a topic.
            </div>
          </div>
        </section>

        <section className="mood-col">
          <h2>5 · 社区手绘</h2>
          <p>手绘笔迹只用于页脚、涂鸦或小注释；不画假签名、假用户作品。</p>
          <div className="mood-samples">
            {DECOR.map((item) => (
              <figure className="mood-sample" key={item.title + item.src} style={{ margin: 0 }}>
                <img
                  src={item.src}
                  alt={item.title}
                  loading="lazy"
                  style={{ objectFit: 'contain', background: '#eef6fd', padding: 18 }}
                />
                <figcaption className="mood-sample__note">
                  <strong>{item.title}</strong>
                  <span>{item.note}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
