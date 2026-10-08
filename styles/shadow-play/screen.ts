// 影窗 —— shadow-play 签名④（幕后油灯照明模型）+ 钩子点亮/收戏调暗 + 布纹 + 灯苗 + 幕布微漾。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）references/风格配方/34_shadowpuppet.md 的
// 幕后径向暖光/灯焰扰动/布纹机制——Remotion(React+TSX)+Canvas2D 重写，零整段拷贝。
import {PAL, W, H, LAMP, type CanvasCtx} from './types';
import {tnoise, stepT, ease, mulberry32} from './noise';

// ---------- 场亮（钩子点亮 / 收戏调暗） ----------

/** 钩子：f1-2 暗幕（k 0.1 防纯黑），f3 灯亮（0.07s<0.5s），f3-16 光斑绽放至全亮。 */
function hookK(f: number): number {
  if (f < 3) return 0.1;
  return 0.1 + 0.9 * ease((f - 3) / 13);
}

/** 收戏调暗：f293-315 场亮 1→0.42（灯一暗），此后稳在 0.42（灯芯未熄，灯苗仍在跳）。 */
function dimK(f: number): number {
  if (f < 293) return 1;
  return 1 - 0.58 * ease((f - 293) / 22);
}

// ---------- 幕布底（径向暖光 + 灯焰扰动） ----------

/**
 * 签名④ 幕后油灯：fl = 0.5·noise(3ts) + 0.3·noise(9ts)（ts 按 15fps 步进）驱动——
 * 光心漂移 ±26/±18、径向暖色随焰摆、热点半径 260±40·fl（720p 下按 2/3 缩放档）。
 * 返回 {fl, cx, cy, k} 供热点/灯苗/漂移共用。
 */
export function lampState(f: number): {fl: number; cx: number; cy: number; k: number} {
  const ft = stepT((f - 1) / 30, 15);
  const fl = 0.5 * tnoise(ft * 3, 1) + 0.3 * tnoise(ft * 9, 4);
  const cx = LAMP[0] + fl * 26;
  const cy = LAMP[1] + tnoise(ft * 2, 7) * 18;
  const k = hookK(f) * dimK(f);
  return {fl, cx, cy, k};
}

/** 幕布：径向暖光（径向四档锁死 token）→ 灯芯热点（screen）→ 布纹（multiply 缓存）→ 调暗罩。 */
export function drawScreen(c: CanvasCtx, cv: HTMLCanvasElement, f: number): {fl: number; cx: number; cy: number; k: number} {
  const {fl, cx, cy, k} = lampState(f);
  const g = c.createRadialGradient(cx, cy, 20, cx, cy + 26, 780);
  g.addColorStop(0, `rgb(255,${Math.round(246 + fl * 8)},${Math.round(214 + fl * 20)})`);
  g.addColorStop(0.2, '#f9e6b8');
  g.addColorStop(0.45, '#f2d7a0');
  g.addColorStop(0.72, '#cf9a58');
  g.addColorStop(1, PAL.scrim3);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // 灯芯热点：一小团更亮的光，随灯焰跳（screen 提亮，不洗幕色）
  c.save();
  c.globalCompositeOperation = 'screen';
  c.globalAlpha = k;
  const hg = c.createRadialGradient(cx, cy - 8, 0, cx, cy - 8, 215 + fl * 34);
  hg.addColorStop(0, `${PAL.hot}${0.66 + fl * 0.24})`);
  hg.addColorStop(1, `${PAL.hot}0)`);
  c.fillStyle = hg;
  c.fillRect(0, 0, W, H);
  c.restore();
  // 布纹（3px 经纬 + 颗粒，一次缓存整片 multiply）
  c.save();
  c.globalCompositeOperation = 'multiply';
  c.globalAlpha = k;
  c.drawImage(scrimWeave(), 0, 0);
  c.restore();
  // 收戏调暗罩（灯芯未熄：0.42 处仍有暖光，非纯黑）
  if (k < 0.995) {
    c.save();
    c.fillStyle = `rgba(22,9,2,${(1 - k) * 0.88})`;
    c.fillRect(0, 0, W, H);
    c.restore();
  }
  return {fl, cx, cy, k};
}

/** 灯苗剪影（幕后挡光→幕上暖褐小苗）+ 灯芯亮点；收戏调暗后相对更显（微动效签名件）。 */
export function drawFlame(c: CanvasCtx, st: {fl: number; cx: number; cy: number; k: number}, f: number): void {
  const ft = stepT((f - 1) / 30, 15);
  const wob = 0.5 * tnoise(ft * 5, 21) + 0.3 * tnoise(ft * 13, 22);
  const x = st.cx, y = st.cy + 4;
  c.save();
  c.globalAlpha = 0.16 + 0.3 * (1 - st.k);
  c.globalCompositeOperation = 'multiply';
  c.fillStyle = PAL.flame;
  c.beginPath();
  c.moveTo(x, y - 26 - st.fl * 10);
  c.quadraticCurveTo(x + 7 + wob * 5, y - 10, x + 6, y + 2);
  c.quadraticCurveTo(x, y + 8, x - 6, y + 2);
  c.quadraticCurveTo(x - 7 - wob * 5, y - 10, x, y - 26 - st.fl * 10);
  c.fill();
  // 灯芯亮点（screen）
  c.globalAlpha = 0.5 * st.k + 0.15;
  c.globalCompositeOperation = 'screen';
  const cg = c.createRadialGradient(x, y - 6, 0, x, y - 6, 16 + st.fl * 6);
  cg.addColorStop(0, 'rgba(255,214,140,0.85)');
  cg.addColorStop(1, 'rgba(255,214,140,0)');
  c.fillStyle = cg;
  c.fillRect(x - 26, y - 32, 52, 52);
  c.restore();
}

/** 幕布微漾：两道极淡横幅波自下而上缓漂（multiply α0.018，收戏定帧段的合法微动效）。 */
export function drawRipple(c: CanvasCtx, f: number): void {
  const t = (f - 1) / 30;
  c.save();
  c.globalCompositeOperation = 'multiply';
  for (let b = 0; b < 2; b++) {
    const ph = t * 0.5 + b * 2.6;
    const yb = ((ph % 1) + 1) % 1;
    const y = 120 + yb * 560;
    c.globalAlpha = 0.018 * Math.sin(Math.PI * yb);
    c.fillStyle = PAL.flame;
    c.beginPath();
    c.moveTo(0, y);
    for (let x = 0; x <= W; x += 64) {
      c.lineTo(x, y + Math.sin(x / 190 + b * 3 + t * 0.8) * 7);
    }
    c.lineTo(W, y + 38);
    c.lineTo(0, y + 38);
    c.closePath();
    c.fill();
  }
  c.restore();
}

// ---------- 缓存层 ----------

let WEAVE: HTMLCanvasElement | null = null;
/** 布纹：3px 经纬 + 细颗粒（静态，一次缓存）。 */
export function scrimWeave(): HTMLCanvasElement {
  if (WEAVE) return WEAVE;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(120,90,50,0.09)';
  g.lineWidth = 1;
  for (let x = 0; x < W; x += 3) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, H);
    g.stroke();
  }
  for (let y = 0; y < H; y += 3) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }
  // 细颗粒（确定性）
  const rnd = mulberry32(20261104);
  for (let i = 0; i < 5200; i++) {
    const x = rnd() * W, y = rnd() * H;
    g.fillStyle = `rgba(120,80,40,${0.05 + rnd() * 0.08})`;
    g.fillRect(x, y, 1.4, 1.4);
  }
  WEAVE = cv;
  return cv;
}

let FRAME: HTMLCanvasElement | null = null;
/** 影窗木框（外框+内衬线+四角暗角，静态缓存，最后盖在最上）。 */
export function windowFrame(): HTMLCanvasElement {
  if (FRAME) return FRAME;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d')!;
  const m = 22, m2 = 16;
  g.fillStyle = PAL.wood;
  g.beginPath();
  g.rect(0, 0, W, H);
  g.rect(m2, m, W - m2 * 2, H - m * 2);
  g.fill('evenodd');
  g.strokeStyle = PAL.woodLite;
  g.lineWidth = 2.4;
  g.strokeRect(m2 + 5, m + 5, W - (m2 + 5) * 2, H - (m + 5) * 2);
  // 四角铜钉
  for (const [x, y] of [[m2 + 22, m + 22], [W - m2 - 22, m + 22], [m2 + 22, H - m - 22], [W - m2 - 22, H - m - 22]] as Array<[number, number]>) {
    g.fillStyle = PAL.rivetLite;
    g.beginPath();
    g.arc(x, y, 5, 0, 7);
    g.fill();
    g.strokeStyle = PAL.rivet;
    g.lineWidth = 1.4;
    g.stroke();
  }
  // 幕内暗角
  const vg = g.createRadialGradient(W / 2, H / 2 - 20, 330, W / 2, H / 2, 780);
  vg.addColorStop(0, 'rgba(40,15,0,0)');
  vg.addColorStop(1, 'rgba(40,15,0,0.42)');
  g.fillStyle = vg;
  g.fillRect(m2, m, W - m2 * 2, H - m * 2);
  FRAME = cv;
  return cv;
}

let PROPS: HTMLCanvasElement | null = null;
/**
 * 静态道具层（缓存）：两侧幕柱旗杆 + 底沿台板——不抢戏的衬托件，
 * 全部离焦点布局（multiply 重叠变深纪律：道具不与皮人焦点区重叠）。
 */
export function propLayer(): HTMLCanvasElement {
  if (PROPS) return PROPS;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d')!;
  // 左右幕柱（缠幔布柱）
  const pillar = (x: number, flip: number): void => {
    g.fillStyle = '#8a4a22';
    g.fillRect(x - 14, 40, 28, 620);
    // 幔布结
    for (let i = 0; i < 5; i++) {
      const y = 90 + i * 110;
      g.fillStyle = i % 2 ? PAL.grn : PAL.red;
      g.beginPath();
      g.ellipse(x + flip * 6, y, 16, 9, flip * 0.4, 0, 7);
      g.fill();
      g.strokeStyle = PAL.edge;
      g.lineWidth = 2;
      g.stroke();
    }
    g.strokeStyle = PAL.edge;
    g.lineWidth = 2.4;
    g.strokeRect(x - 14, 40, 28, 620);
    g.fillStyle = PAL.rivetLite;
    g.beginPath();
    g.arc(x, 52, 6, 0, 7);
    g.fill();
  };
  pillar(56, 1);
  pillar(1224, -1);
  // 底沿台板（雕花横条）
  g.fillStyle = '#9a3a1c';
  g.fillRect(60, 636, 1160, 26);
  g.strokeStyle = PAL.edge;
  g.lineWidth = 2.4;
  g.strokeRect(60, 636, 1160, 26);
  // 台板刻点（确定性鱼子）
  const rnd = mulberry32(77);
  g.fillStyle = '#fff';
  g.save();
  g.globalCompositeOperation = 'destination-out';
  for (let x = 84; x < 1200; x += 26) {
    g.beginPath();
    g.arc(x + rnd() * 6, 649 + (rnd() - 0.5) * 8, 2.6, 0, 7);
    g.fill();
  }
  g.restore();
  PROPS = cv;
  return cv;
}
