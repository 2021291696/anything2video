// 会动的母题 —— watercolor-cel（纱帘/风铃/komorebi 光斑/桌布/雏菊/杯与热气/时间轴包络）。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）scenes/25_ghibli.js 母题动画段：机制与参数级借鉴，
// Remotion(Canvas2D+TSX) 重写。锁死参数：纱帘 gust 频率 5.4、鼓起 q²·(28+71·gust)（源 q²·(60+150gust)×2/3 视口换算）；
// 草浪 wind=0.5+0.5sin(3.1t−0.027x) 相位沿 x 推进；komorebi 34 个 noise 漂移 sin(5t+1.7i) 明灭。
import type {CanvasCtx, Pt} from './types';
import {W, H, WIN, ROD, FIX} from './types';
import {mulberry32, clamp, lerp, smoothstep, easeOutCubic, bump, vnoise, tnoise, hash2} from './noise';
import {wash, rectPts, cached, smoothPath} from './wash';

// ---------- 时间轴锚（tts_build 实测：S01 f31-107 / S02 f114-184 / S03 f191-257 / S04 f264-337 / 共 384f） ----------
export const TL = {
  hookEnd: 15, // 钩子：纱帘第一次鼓起在 0.5s 内（f1-15 = 0.47s）
  heroFrom: 232, // 60% = 230.4f
  heroPeak: 246, // 64.1%
  heroTo: 262,
  freezeFrom: 350, // 定帧 f350-384 = 35f = 1.17s（0.8-1.2s 纪律内）
} as const;

/** 结尾定帧阻尼：1 → 0.22（大动作收敛，微动效保留）。 */
export function freezeK(f: number): number {
  return lerp(1, 0.22, smoothstep((f - TL.freezeFrom) / 12));
}

/** 纱帘定帧阻尼：收得浅一档（0.45）——定帧段保留「微鼓」呼吸（微动效纪律）。 */
function curtainDamp(f: number): number {
  return lerp(1, 0.45, smoothstep((f - TL.freezeFrom) / 12));
}

/** HERO 包络：光斑全开 + 草浪二次推进（f232-262，峰 f246=64%）。 */
export function heroBoost(f: number): number {
  return bump((f - TL.heroFrom) / (TL.heroTo - TL.heroFrom));
}

/** 相机缓推 1.00→1.035，定帧起钳死。 */
export function camZoom(f: number): number {
  return 1 + 0.035 * smoothstep(Math.min(1, (f - 1) / (TL.freezeFrom - 1)));
}

/** 钩子脉冲：f1 起 0.5s 内一次强灌风（e^{-Δf/28} 衰减），叠加到常驻呼吸上=「纱帘第一次鼓起」。 */
function hookPulse(f: number): number {
  return smoothstep((f - 1) / 6) * Math.exp(-(f - 1) / 28);
}

/** 入场缓启：f1 纱帘近垂，30 帧内滑入常驻呼吸（钩子读作「从静到第一次鼓起」）。 */
function settleK(f: number): number {
  return smoothstep((f - 1) / 30);
}

/** 闪烁：每 ~3.4s 一次 0.12s 眨眼（少女与猫共用节律，相位错开）。 */
function blinkAt(t: number, phase: number): boolean {
  return (t + phase) % 3.4 < 0.12;
}

// ---------- 白纱窗帘：两幅，下摆被风往屋里（画面中心）鼓 ----------
export function curtain(c: CanvasCtx, side: -1 | 1, lt: number, f: number, damp: number): void {
  const x0 = side < 0 ? 134 : 442; // 外缘（杆上固定侧）
  const inner = side < 0 ? 232 : 346; // 内缘自由边
  const gust = 0.5 + 0.5 * Math.sin(lt * 5.4 + (side < 0 ? 0 : 1.3));
  const gd = curtainDamp(f);
  const gc = clamp(gust * 0.72 * settleK(f) * gd + hookPulse(f) * gd, 0, 1.15);
  const N = 12;
  const pts: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const q = i / N, y = 68 + q * 430;
    const bl = q * q * (28 + 71 * gc) * gd;
    const w = Math.sin(lt * 9 + q * 6 + side) * 11 * q * damp;
    pts.push([inner + (side < 0 ? 1 : -1) * (bl * 0.9 - bl * 0.15) + w, y]);
  }
  for (let i = N; i >= 0; i--) {
    const q = i / N, y = 68 + q * 430;
    pts.push([x0 + (side < 0 ? 1 : -1) * q * 20 * gc * gd, y + Math.sin(lt * 6 + q * 4) * 4 * damp]);
  }
  c.save();
  c.globalAlpha = 0.85;
  wash(c, pts, '#ffffff', {layers: 3, alpha: 0.36, amp: 4, seed: side < 0 ? 101 : 102, edge: 0, blend: 'source-over'});
  c.restore();
  // 褶线（蓝灰透明，跟随鼓起；沿 q 加弓形弯向鼓起方向）
  c.save();
  c.globalCompositeOperation = 'multiply';
  c.strokeStyle = 'rgba(150,175,200,.2)';
  c.lineWidth = 2;
  c.lineCap = 'round';
  const bow = (side < 0 ? 1 : -1) * 14;
  for (let k = 1; k < 4; k++) {
    const fk = k / 4;
    c.beginPath();
    for (let i = 0; i <= 10; i++) {
      const q = i / 10;
      const a = pts[Math.round(q * N)], b = pts[2 * N + 1 - Math.round(q * N)];
      const x = lerp(b[0], a[0], fk) + bow * q;
      const y = lerp(b[1], a[1], fk);
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    c.stroke();
  }
  c.restore();
}

// ---------- komorebi 树影光斑：34 个，noise 漂移 + sin(5t+1.7i) 明灭，HERO 段全开 ----------
export function komorebi(c: CanvasCtx, t: number, boost: number): void {
  c.save();
  c.globalCompositeOperation = 'screen';
  const r = mulberry32(33);
  for (let i = 0; i < 34; i++) {
    const bx = 496 + r() * 420, by = 96 + r() * 340, rr = 7 + r() * 18;
    const x = bx + vnoise(i * 1.3, t * 0.9, 61) * 24;
    const y = by + vnoise(i * 2.1 + 5, t * 0.9, 62) * 17;
    const a = (0.18 + 0.22 * (0.5 + 0.5 * Math.sin(t * 5 + i * 1.7))) * (1 + 1.35 * boost);
    const gg = c.createRadialGradient(x, y, 0, x, y, rr);
    gg.addColorStop(0, `rgba(${FIX.komo},${clamp(a, 0, 0.9)})`);
    gg.addColorStop(1, `rgba(${FIX.komo},0)`);
    c.fillStyle = gg;
    c.beginPath();
    c.ellipse(x, y, rr * 1.3, rr, 0.4, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

// ---------- 桌＋白桌布＋雏菊＋杯（垂边随风轻摆） ----------
export function tableSet(c: CanvasCtx, lt: number, t: number, damp: number): void {
  // 桌腿与桌面
  wash(c, rectPts(132, 482, 16, 158), '#8a5a34', {layers: 3, alpha: 0.6, amp: 3, seed: 80, edge: 0.15});
  wash(c, rectPts(444, 482, 16, 158), '#8a5a34', {layers: 3, alpha: 0.6, amp: 3, seed: 81, edge: 0.15});
  wash(c, rectPts(118, 468, 360, 14), '#8a5a34', {layers: 3, alpha: 0.6, amp: 3, seed: 82, edge: 0.15});
  // 白桌布（垂边轻摆）
  const sw = Math.sin(lt * 5) * 5 * damp;
  const cloth: Pt[] = [[126, 470], [468, 470], [474, 538 + sw], [404, 546 - sw], [318, 540 + sw], [232, 548 - sw], [150, 540 + sw], [122, 546 - sw]];
  wash(c, cloth, '#fffdf6', {layers: 2, alpha: 0.95, amp: 3, seed: 90, edge: 0.25, blend: 'source-over'});
  wash(c, cloth.map(([x, y]) => [x, y < 500 ? y + 20 : y] as Pt), '#b8c8d8', {layers: 2, alpha: 0.18, amp: 3, seed: 91, edge: 0});
  // 玻璃瓶＋四朵雏菊（花头点头）
  const vx = 188, vy = 470;
  c.save();
  c.fillStyle = 'rgba(190,220,230,.55)';
  c.beginPath();
  c.moveTo(vx - 12, vy);
  c.quadraticCurveTo(vx - 17, vy - 22, vx - 8, vy - 34);
  c.lineTo(vx + 8, vy - 34);
  c.quadraticCurveTo(vx + 17, vy - 22, vx + 12, vy);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(90,120,140,.6)';
  c.lineWidth = 1.4;
  c.stroke();
  [[-22, -88, 0], [5, -102, 1.3], [26, -82, 2.1], [-6, -72, 3.2]].forEach(([dx, dy, ph]) => {
    const nod = Math.sin(t * 3.2 + ph) * 5 * damp;
    const hx = vx + dx + nod, hy = vy + dy + Math.abs(nod) * 0.2;
    c.strokeStyle = '#5a8a3a';
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(vx + dx * 0.2, vy - 30);
    c.quadraticCurveTo(vx + dx * 0.6, vy + dy * 0.5, hx, hy);
    c.stroke();
    c.fillStyle = '#fffdf4';
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + ph;
      c.beginPath();
      c.ellipse(hx + Math.cos(a) * 7, hy + Math.sin(a) * 4.6, 5.4, 2.4, a, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#f2b830';
    c.beginPath();
    c.arc(hx, hy, 3.8, 0, Math.PI * 2);
    c.fill();
  });
  c.restore();
  // 白瓷杯（少女手边）
  cup(c, 408, 466);
}

/** 杯子（cel 白瓷＋茶色口沿＋杯耳）。 */
export function cup(c: CanvasCtx, x: number, y: number): void {
  const p = new Path2D();
  p.moveTo(x - 11, y - 24);
  p.quadraticCurveTo(x - 14, y - 2, x - 8, y);
  p.lineTo(x + 8, y);
  p.quadraticCurveTo(x + 14, y - 2, x + 11, y - 24);
  p.closePath();
  celShape(c, p, '#fdf8ee', '#d8d2c4', 5, 3);
  c.strokeStyle = '#7a4a2a';
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(x, y - 24, 11, 3.4, 0, 0, Math.PI * 2);
  c.stroke();
  c.strokeStyle = FIX.line;
  c.lineWidth = 1.8;
  c.beginPath();
  c.arc(x + 15, y - 12, 7, -1.2, 1.2);
  c.stroke();
}

/** 细线 cel 快捷（无 clip 变体：先阴影再基色偏移，用于小件）。 */
function celShape(c: CanvasCtx, p: Path2D, base: string, shade: string, dx: number, dy: number): void {
  c.lineJoin = 'round';
  c.fillStyle = shade;
  c.fill(p);
  c.save();
  c.clip(p);
  c.translate(-dx, -dy);
  c.fillStyle = base;
  c.fill(p);
  c.restore();
  c.strokeStyle = FIX.line;
  c.lineWidth = 2;
  c.stroke(p);
}

// ---------- 窗角风铃（挂杆右端，随 gust 摆——风铃 SFX 的画面动机） ----------
export function chime(c: CanvasCtx, lt: number, f: number, damp: number): void {
  const sway = (Math.sin(lt * 5.4 + 0.9) * 0.16 * damp + hookPulse(f) * 0.5) * 1;
  const ax = ROD.x1 - 6, ay = ROD.y + 3;
  c.save();
  c.translate(ax, ay);
  c.rotate(sway);
  c.strokeStyle = '#7a6248';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, 26);
  c.stroke();
  c.fillStyle = '#8a6a44';
  c.fillRect(-11, 24, 22, 5);
  [[-8, 0.1], [0, 0], [8, -0.1]].forEach(([dx, tilt], i) => {
    c.save();
    c.translate(dx, 30);
    c.rotate(tilt + Math.sin(lt * 7 + i * 2) * 0.1 * damp);
    c.fillStyle = i === 1 ? '#d8c49a' : '#b89a6c';
    c.fillRect(-2.5, 0, 5, 16 + (i === 1 ? 6 : 0));
    c.fillStyle = '#6a4a38';
    c.beginPath();
    c.arc(0, 19 + (i === 1 ? 6 : 0), 2.6, 0, Math.PI * 2);
    c.fill();
    c.restore();
  });
  c.restore();
}

// ---------- 杯口热气（两缕上升摇曳） ----------
export function steam(c: CanvasCtx, t: number, x: number, y: number): void {
  c.save();
  c.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    const drift = tnoise(t * 0.8 + k * 3.1, 21) * 6;
    const wob = Math.sin(t * 4 + k * 2.4) * 4;
    c.strokeStyle = `rgba(255,255,255,${0.5 - k * 0.14})`;
    c.lineWidth = 3 - k * 0.6;
    c.beginPath();
    c.moveTo(x + (k ? 5 : -4), y - 2);
    c.quadraticCurveTo(x + drift + (k ? 9 : -8), y - 16, x + wob + drift * 0.5, y - 30);
    c.quadraticCurveTo(x + wob * 1.6 + drift, y - 42, x + wob * 0.6 + drift * 1.2, y - 54);
    c.stroke();
  }
  c.restore();
}

// ---------- 角色用水彩色晕层（缓存）：40 块透明色晕，multiply 只乘在角色剪影上 ----------
export function charBloom(): HTMLCanvasElement {
  return cached('wcc_charBloom', W, H, (g) => {
    const r = mulberry32(808);
    const tints = ['#e8b890', '#a8c0d8', '#f0d0a0', '#c8a8c0'];
    for (let i = 0; i < 40; i++) {
      const x = 430 + r() * 480, y = 250 + r() * 430;
      wash(g, ((): Pt[] => {
        const pts: Pt[] = [];
        for (let k = 0; k < 9; k++) {
          const a = (k / 9) * Math.PI * 2;
          pts.push([x + Math.cos(a) * (28 + r() * 60), y + Math.sin(a) * (22 + r() * 46)]);
        }
        return pts;
      })(), tints[i % 4], {layers: 2, alpha: 0.12, amp: 16, seed: 900 + i, edge: 0.08});
    }
  });
}

/** 眨眼节律导出（少女/猫共用）。 */
export function blink(t: number, phase: number): boolean {
  return blinkAt(t, phase);
}

/** 呼吸振幅。 */
export function breathe(t: number): number {
  return Math.sin(t * 2.4) * 1.6;
}

/** 发丝/飘带的风相干量（0..1，与纱帘同宗不同频——3.2Hz 慢涌）。 */
export function hairWind(lt: number): number {
  return easeOutCubic(0.5 + 0.5 * Math.sin(lt * 3.2));
}

/** 确定性小工具再导出（chars.ts 用）。 */
export {hash2, smoothstep};
