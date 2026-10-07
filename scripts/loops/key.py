# 抠绿 + 转码：python3 ../key.py <name> <宽> <高>（在 scripts/loops/work/ 里运行）
# 先做无缝循环（尾 0.5 s 与头 0.5 s 交叉淡化）得到 <name>-loop.mp4：
#   ffmpeg -i <name>-raw.mp4 -filter_complex "[0:v]split[a][b];[a]trim=start=0.5,setpts=PTS-STARTPTS[m];[b]trim=0:0.5,setpts=PTS-STARTPTS[h];[m][h]xfade=transition=fade:duration=0.5:offset=<时长-1>[v]" -map "[v]" -c:v libx264 -crf 12 <name>-loop.mp4
# 透明度 = 绿色超出红 / 蓝的程度（软边）；green limit 只压掉超出红蓝的绿，米色、白色保持原色（ffmpeg despill 会把米色压成粉）。
# 输出 public/website/loops/<name>.webm（VP9 alpha，Chrome / Firefox）与 .mov（HEVC alpha，Safari）。
import subprocess, sys, numpy as np
from PIL import Image
name, W, H = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
# 第 4 个参数：输入文件（默认 <name>-loop.mp4；只播一次的短片直接用 <name>-raw.mp4，不做交叉淡化）
src_file = sys.argv[4] if len(sys.argv) > 4 else f'{name}-loop.mp4'
import os
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../public/website/loops')
dec = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-i', src_file, '-vf', f'scale={W}:{H}:flags=lanczos', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
common = ['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{W}x{H}', '-r', '24', '-i', '-', '-an']
webm = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', *common, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '33', '-row-mt', '1', '-auto-alt-ref', '0', f'{out}/{name}.webm'], stdin=subprocess.PIPE)
mov = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', *common, '-vf', 'format=bgra', '-c:v', 'hevc_videotoolbox', '-allow_sw', '1', '-alpha_quality', '0.8', '-b:v', '2500k', '-tag:v', 'hvc1', f'{out}/{name}.mov'], stdin=subprocess.PIPE)
size = W * H * 3
n = 0
while True:
    buf = dec.stdout.read(size)
    if len(buf) < size: break
    f = np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.float32)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    other = np.maximum(r, b)
    key = g - other                       # 越绿越大
    alpha = 1 - np.clip((key - 28) / (90 - 28), 0, 1)
    g2 = np.minimum(g, other + 6)         # green limit：只压掉超出红蓝的那部分绿（米色、白色不受影响）
    rgba = np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8)
    webm.stdin.write(rgba.tobytes())
    # HEVC alpha 在苹果 WebKit（Safari、iPhone 全部浏览器）里按「预乘」合成：颜色必须先乘以透明度，
    # 否则透明处原来的底色（白底素材就是白色）会叠加显示出来。VP9 是直通 alpha，不预乘。
    mov.stdin.write(np.dstack([(rgba[..., :3] * (rgba[..., 3:4] / 255.0)).round(), rgba[..., 3]]).astype(np.uint8).tobytes())
    if n == 0: Image.fromarray(rgba, 'RGBA').save(f'{name}-first.png')
    if n == 60: Image.fromarray(rgba, 'RGBA').save(f'{name}-key.png')
    last = rgba
    n += 1
for p in (webm, mov): p.stdin.close(); p.wait()
Image.fromarray(last, 'RGBA').save(f'{name}-last.png')
print(name, 'frames', n)
