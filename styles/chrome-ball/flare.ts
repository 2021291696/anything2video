// chrome-ball 镜头光晕（签名⑥，锁死排布）：核辉光（±8% 脉动）+ 12 星芒（0.25rad/s 旋转）+
// 横向长条光 840px + 5 个六边形鬼影沿「太阳→画面中心」直线 0.45–2.0 倍排布（sin(t·5)·0.03 滑动）。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）15_raytrace 的 flare（P.lensFlare），TSX 重写，零整段拷贝。
import type {CanvasCtx} from './types';
import {SUN, W, H} from './types';
import {sunPulse} from './world';

export function flare(c: CanvasCtx, t: number, power: number): void {
  if (power <= 0.01) return;
  c.save();
  c.globalAlpha = power;
  c.globalCompositeOperation = 'lighter';
  const pul = sunPulse(t);
  // 核辉光
  const glow = c.createRadialGradient(SUN[0], SUN[1], 0, SUN[0], SUN[1], 113 * pul);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.15, 'rgba(255,240,250,.9)');
  glow.addColorStop(0.4, 'rgba(255,170,220,.25)');
  glow.addColorStop(1, 'rgba(255,150,220,0)');
  c.fillStyle = glow;
  c.beginPath();
  c.arc(SUN[0], SUN[1], 113 * pul, 0, Math.PI * 2);
  c.fill();
  // 12 星芒（0.25rad/s 缓旋；长短交替）
  const rot = t * 0.25;
  for (let k = 0; k < 12; k++) {
    const a = rot + (k / 12) * Math.PI * 2;
    const L = (k % 2 ? 47 : 80) * pul;
    const g = c.createLinearGradient(SUN[0], SUN[1], SUN[0] + Math.cos(a) * L, SUN[1] + Math.sin(a) * L);
    g.addColorStop(0, 'rgba(255,255,255,.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.strokeStyle = g;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(SUN[0], SUN[1]);
    c.lineTo(SUN[0] + Math.cos(a) * L, SUN[1] + Math.sin(a) * L);
    c.stroke();
  }
  // 水平长条光 840px（过日心）
  const hs = c.createLinearGradient(SUN[0] - 420, 0, SUN[0] + 420, 0);
  hs.addColorStop(0, 'rgba(255,255,255,0)');
  hs.addColorStop(0.5, `rgba(255,255,255,${0.75 * pul})`);
  hs.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = hs;
  c.fillRect(SUN[0] - 420, SUN[1] - 1.5, 840, 3);
  c.strokeStyle = 'rgba(255,255,255,.18)';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(SUN[0], SUN[1], 100, 0, Math.PI * 2);
  c.stroke();
  // 5 个六边形鬼影：沿 太阳→画面中心 直线 0.45–2.0 倍排布，随时间轻微滑动
  const C0: [number, number] = [W / 2, H / 2];
  const dx = C0[0] - SUN[0], dy = C0[1] - SUN[1];
  const sl = Math.sin(t * 5) * 0.03;
  // [位置倍率(0.45–2.0), 半径, 颜色, 旋转]
  const ghosts: [number, number, string, number][] = [
    [0.62, 38, 'rgba(180,255,240,.16)', 0.3],
    [0.8, 12, 'rgba(255,255,200,.3)', -0.5],
    [0.95, 17, 'rgba(160,255,255,.4)', 0.9],
    [1.25, 40, 'rgba(255,200,255,.12)', -0.2],
    [1.55, 34, 'rgba(200,255,230,.18)', 0.6],
  ];
  for (const [k, r, col, spin] of ghosts) {
    const x = SUN[0] + dx * (k + sl), y = SUN[1] + dy * (k + sl);
    c.fillStyle = col;
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = spin + t * 0.12 + (i / 6) * Math.PI * 2;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
    c.fill();
  }
  c.restore();
}

/** 光晕强度包络（分镜驱动）：显影后渐显 → SC02 墙段增强 → HERO f229 全开 → SC04 回落 → 定帧保持。 */
export function flarePower(f: number): number {
  if (f < 16) return 0; // 显影期间不抢线框
  if (f < 105) return 0.35;
  if (f < 155) return 0.45;
  if (f < 229) return 0.75; // SC02 墙段起增强
  if (f < 283) return 1.0; // HERO 全开（f229 = 60.7%）
  if (f < 320) return 0.62; // S04 回落
  return 0.55; // 定帧保持
}
