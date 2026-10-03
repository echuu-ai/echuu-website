import { useSyncExternalStore } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useLocale } from '../locale-context';
import { EXPERIENCE_COPY } from './experienceCopy';
import { isFrostMuted, setFrostMuted, subscribeFrostMuted } from '../lib/frostAudio';

/** 底部栏的声音开关：控制角色悬停音效，状态存 localStorage */
export function SoundToggle({ label }: { label: string }) {
  const { locale } = useLocale();
  const copy = EXPERIENCE_COPY[locale];
  const muted = useSyncExternalStore(subscribeFrostMuted, isFrostMuted, () => false);
  const Icon = muted ? VolumeX : Volume2;
  return (
    <button type="button" className="hv-cta__icon hv-cta__sound" aria-label={muted ? copy.soundOn : copy.soundOff} title={`${label} · ${copy.music}`} aria-pressed={!muted} onClick={() => setFrostMuted(!muted)}>
      <Icon size={22} aria-hidden="true" />
    </button>
  );
}
