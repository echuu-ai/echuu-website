import * as THREE from 'three';

/**
 * 预烘焙动作片段（.clip.bin）：把「FBX → VRM 重定向」之后的 AnimationClip 原样存成二进制，
 * 运行时直接读，省掉下载整份 FBX（Mixamo 的 FBX 还带着示范角色的网格）和每次的重定向计算。
 *
 * 无损：所有时间与数值都是原来的 float32；只做两件不改变播放结果的事——
 *   - 相同的时间轴只存一份，多条轨道共用；
 *   - 整段数值不变的轨道只存一帧（插值结果完全相同）。
 *
 * 格式：'ECLP' | u32 版本 | u32 头部长度 | 头部 JSON（UTF-8，补齐到 4 字节）| float32 数据（小端）
 */

const MAGIC = 0x504c4345; // 'ECLP'
const VERSION = 1;

type TrackHeader = { name: string; type: 'quaternion' | 'vector' | 'number'; time: number; values: number; count: number; size: number };
type Header = { name: string; duration: number; times: Array<{ offset: number; count: number }>; tracks: TrackHeader[] };

const TRACK_TYPES = {
  quaternion: THREE.QuaternionKeyframeTrack,
  vector: THREE.VectorKeyframeTrack,
  number: THREE.NumberKeyframeTrack,
} as const;

function sameValues(values: ArrayLike<number>, size: number) {
  for (let i = size; i < values.length; i += 1) if (values[i] !== values[i % size]) return false;
  return true;
}

export function encodeBakedClip(clip: THREE.AnimationClip): ArrayBuffer {
  const chunks: Float32Array[] = [];
  let offset = 0;
  const push = (data: ArrayLike<number>) => {
    const array = Float32Array.from(data);
    chunks.push(array);
    const at = offset;
    offset += array.length;
    return at;
  };
  const timeIndex = new Map<string, number>();
  const header: Header = { name: clip.name, duration: clip.duration, times: [], tracks: [] };
  for (const track of clip.tracks) {
    const type = track.ValueTypeName as TrackHeader['type'];
    if (!(type in TRACK_TYPES)) throw new Error(`Unsupported track type ${type} (${track.name})`);
    const size = track.getValueSize();
    const constant = track.times.length > 1 && sameValues(track.values, size);
    const times = constant ? [track.times[0]] : Array.from(track.times);
    const values = constant ? Array.from(track.values).slice(0, size) : track.values;
    const key = Float32Array.from(times).join(',');
    let time = timeIndex.get(key);
    if (time === undefined) {
      time = header.times.length;
      header.times.push({ offset: push(times), count: times.length });
      timeIndex.set(key, time);
    }
    header.tracks.push({ name: track.name, type, time, values: push(values), count: times.length, size });
  }
  const json = new TextEncoder().encode(JSON.stringify(header));
  const headerBytes = Math.ceil(json.length / 4) * 4;
  const buffer = new ArrayBuffer(12 + headerBytes + offset * 4);
  const view = new DataView(buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, VERSION, true);
  view.setUint32(8, headerBytes, true);
  new Uint8Array(buffer, 12, json.length).set(json);
  new Uint8Array(buffer, 12 + json.length, headerBytes - json.length).fill(0x20); // 头部补空格到 4 字节对齐（JSON.parse 忽略空白）
  const data = new Float32Array(buffer, 12 + headerBytes, offset);
  let at = 0;
  for (const chunk of chunks) { data.set(chunk, at); at += chunk.length; }
  return buffer;
}

export function decodeBakedClip(buffer: ArrayBuffer): THREE.AnimationClip {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== MAGIC) throw new Error('Not a baked clip');
  if (view.getUint32(4, true) !== VERSION) throw new Error('Unsupported baked clip version');
  const headerBytes = view.getUint32(8, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 12, headerBytes))) as Header;
  const data = new Float32Array(buffer, 12 + headerBytes);
  const tracks = header.tracks.map((t) => {
    const time = header.times[t.time];
    const times = data.slice(time.offset, time.offset + time.count);
    const values = data.slice(t.values, t.values + t.count * t.size);
    return new TRACK_TYPES[t.type](t.name, times, values);
  });
  return new THREE.AnimationClip(header.name, header.duration, tracks);
}
