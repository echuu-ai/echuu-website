import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUpRight, X } from 'lucide-react';
import { useLocale } from '../locale-context';
import '../auth/access.css';

const content = {
  zh: { title: '让你的 OC 拥有 3D 形象', intro: '从自己制作到委托创作者，选择适合你的方式。', close: '关闭', note: '上传前确认文件为 .vrm，并确认作者允许你的直播用途。', names: ['VRoid Studio', '模之屋', 'BOOTH', '约稿定制'], descriptions: ['自己捏脸、设计发型与服装，完成后导出 VRM 模型。', '浏览创作者分享的模型，确认下载格式；PMX / MMD 模型不能直接作为 VRM 上传。', '搜索 VRM 成品模型；购买前查看文件格式、使用范围与作者说明。', '找喜欢的 3D 建模师，把 OC 设定变成立体角色。约定交付 .vrm、表情、动作适配与直播使用范围。'], actions: ['开始制作', '浏览模型', '寻找 VRM', '准备约稿需求'] },
  en: { title: 'Give your OC a 3D form', intro: 'Make it yourself, find a model, or commission an artist.', close: 'Close', note: 'Upload a .vrm file and check that the creator permits your streaming use.', names: ['VRoid Studio', 'Aplaybox', 'BOOTH', 'Commission an artist'], descriptions: ['Design a face, hairstyle and outfit, then export your model as VRM.', 'Browse creator models and check the format. PMX / MMD files cannot be uploaded as VRM.', 'Find ready-made VRM models. Check file formats and usage terms before buying.', 'Work with a 3D artist on your OC. Agree on .vrm delivery, expressions, animation compatibility and streaming rights.'], actions: ['Start creating', 'Browse models', 'Find VRM models', 'Commission checklist'] },
  ja: { title: 'あなたの OC を 3D に', intro: '自作、モデル探し、制作依頼から選べます。', close: '閉じる', note: '.vrm ファイルと、配信での利用条件を確認してください。', names: ['VRoid Studio', '模之屋 / Aplaybox', 'BOOTH', '制作を依頼'], descriptions: ['顔・髪型・衣装を作り、VRM 形式で書き出します。', 'クリエイターのモデルを探せます。PMX / MMD はそのまま VRM としてアップロードできません。', 'VRM モデルを探し、購入前に形式と利用規約を確認しましょう。', '3D モデラーに OC の制作を依頼。.vrm 納品、表情、動作対応、配信利用を相談しましょう。'], actions: ['制作を始める', 'モデルを見る', 'VRM を探す', '依頼の準備'] },
  ko: { title: '내 OC를 3D로 만나세요', intro: '직접 제작하거나 모델을 찾고, 작가에게 의뢰할 수 있어요.', close: '닫기', note: '.vrm 파일인지, 방송 이용이 허용되는지 확인하세요.', names: ['VRoid Studio', 'Aplaybox', 'BOOTH', '제작 의뢰'], descriptions: ['얼굴, 헤어와 의상을 만들고 VRM으로 내보내세요.', '창작자의 모델을 살펴보세요. PMX / MMD 파일은 VRM으로 바로 업로드할 수 없어요.', 'VRM 모델을 검색하고 구매 전 파일 형식과 이용 조건을 확인하세요.', '3D 작가에게 OC 제작을 의뢰하세요. .vrm 납품, 표정, 동작 호환과 방송 이용 범위를 정하세요.'], actions: ['제작 시작', '모델 보기', 'VRM 찾기', '의뢰 준비'] },
};
const urls = ['https://vroid.com/studio', 'https://www.aplaybox.com/', 'https://booth.pm/en/search/VRM'];
export function VrmGuide({ label }: { label: string }) {
  const { locale } = useLocale();
  const c = content[locale];
  return <Dialog.Root>
    <Dialog.Trigger asChild><button type="button" className="hv-pill hv-pill--yellow hv-vrm-trigger">{label}</button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="echuu-access-overlay" />
      <Dialog.Content className="echuu-access hv-vrm-guide">
        <div className="echuu-access__glass">
          <Dialog.Close className="echuu-access__close" aria-label={c.close}><X size={20} /></Dialog.Close>
          <Dialog.Title className="echuu-access__title">{c.title}</Dialog.Title>
          <Dialog.Description className="echuu-access__description">{c.intro}</Dialog.Description>
          <div className="hv-vrm-guide__grid">{c.names.map((name, i) => <article key={name} className="hv-vrm-guide__card">
            <span className="hv-vrm-guide__number">0{i + 1}</span><h3>{name}</h3><p>{c.descriptions[i]}</p>
            {urls[i] ? <a href={urls[i]} target="_blank" rel="noopener noreferrer">{c.actions[i]}<ArrowUpRight size={16} /></a> : <details><summary>{c.actions[i]}</summary><p>{locale === 'zh' ? '准备角色三视图、表情参考、预算与交付时间；先和建模师确认 VRM 导出及直播动作需求。' : locale === 'ja' ? '三面図、表情参考、予算、納期を用意し、VRM 書き出しと配信用の動作を相談しましょう。' : locale === 'ko' ? '삼면도, 표정 참고, 예산과 납기를 준비하고 VRM 내보내기와 방송 동작을 확인하세요.' : 'Prepare character turnaround drawings, expression references, budget and deadline. Confirm VRM export and streaming motion requirements.'}</p></details>}
          </article>)}</div>
          <p className="echuu-access__privacy">{c.note}</p>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
