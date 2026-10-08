// 字幕（深底板 + 米白字，屏幕空间；与画纸世界拉开可读性）。SUBS 由 tts_build 生成。
import {type CanvasCtx} from './types';
import {SUBS} from '../common/subs';
import {FONT_SANS} from './fonts';

export function drawSubs(c: CanvasCtx, f: number): void {
  const sub = SUBS.find((s) => f >= s.from && f <= s.to);
  if (!sub) return;
  c.save();
  c.font = '700 27px ' + FONT_SANS;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const tw = c.measureText(sub.text).width;
  const cx = 640, cy = 656;
  const bw = tw + 52, bh = 44;
  c.fillStyle = 'rgba(24,18,12,0.55)';
  c.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
  c.strokeStyle = 'rgba(236,227,207,0.3)';
  c.lineWidth = 1.4;
  c.strokeRect(cx - bw / 2, cy - bh / 2, bw, bh);
  c.fillStyle = '#ece3cf';
  c.fillText(sub.text, cx, cy + 1);
  c.restore();
}
