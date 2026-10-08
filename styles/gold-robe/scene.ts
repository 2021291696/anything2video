// ============================================================================
// scene.ts — gold-robe 整景装配（《金袍下的两个人》，战役 4 批次④ D2）
// 管线（配方 18_klimt 同序）：金箔墙 → 金粉上浮（lighter）→ 金箔碎片翻面飘落 → 花毯地（点头 0.35）
//   → 斜向流光【画在角色之前，角色自然挡住】→ 金袍（纹样 source-in）→ 写实脸/手 → 激活波 → 心光。
// 钩子转场：f2-26 goldLeaf 72px 方块按「离头距离×0.78+方位角×0.12+随机」从她头部螺旋铺开。
// 静止帧治理三件套常开：碎片飘落 + 金粉上浮 + 花点头加幅——每一帧都有位移（禁全静止）。
// ============================================================================
import {W, H, FPS} from '../common';
import {wall, drawDust, drawFrags, drawSweep, sweepX, mulberry32, cached, compositeReveal, clamp01, INK, BW} from './gold';
import {paintRobe, drawRealParts, waveR, HANDS} from './figures';
import {scratch} from './gold';

// ---- 花毯地（《吻》崖边的花毯）：点头幅度 0.35（配方「加幅」参数）----
type Flower = {x: number; y: number; s: number; k: number; ph: number};
const FLOWERS: Flower[] = (() => {
  const r = mulberry32(57), o: Flower[] = [];
  for (let i = 0; i < 260; i++) {
    const y = 600 + Math.pow(r(), 0.8) * 114;
    o.push({x: r() * W, y, s: 5 + ((y - 596) / 118) * 9 * (0.6 + r() * 0.6), k: (r() * 5) | 0, ph: r() * 6.28});
  }
  return o.sort((a, b) => a.y - b.y);
})();
const FCOL = [['#d8402a', '#f4d65a'], ['#3a5ab0', '#f2eee0'], ['#f2eee0', '#d8402a'], ['#8a4ab0', '#f4d65a'], ['#e08aa0', '#3a5ab0']];

const meadow = (g: CanvasRenderingContext2D, t: number) => {
  g.drawImage(cached('gr_meadow', W, H, (h) => {
    const gr = h.createLinearGradient(0, 592, 0, H);
    gr.addColorStop(0, '#2c4a2a'); gr.addColorStop(1, '#1a3020');
    h.fillStyle = gr;
    h.fillRect(0, 592, W, H - 592);
    const r = mulberry32(61);
    for (let i = 0; i < 1100; i++) {
      h.strokeStyle = r() < 0.5 ? '#4f7a3a' : '#7aa04a';
      h.lineWidth = 2;
      const x = r() * W, y = 598 + r() * 116;
      h.beginPath();
      h.moveTo(x, y);
      h.lineTo(x + (r() - 0.5) * 8, y - 6 - r() * 10);
      h.stroke();
    }
    h.fillStyle = '#d6a845';
    h.fillRect(0, 588, W, 5);
  }), 0, 0);
  FLOWERS.forEach(({x, y, s, k, ph}) => {
    const nod = Math.sin(t * 4.2 + ph) * s * 0.35;
    const fc = FCOL[k];
    g.fillStyle = fc[0];
    g.beginPath(); g.arc(x + nod, y, s, 0, Math.PI * 2); g.fill();
    g.strokeStyle = fc[1]; g.lineWidth = Math.max(1.2, s * 0.18);
    g.beginPath(); g.arc(x + nod, y, s * 0.62, 0, Math.PI * 2); g.stroke();
    g.fillStyle = fc[1];
    g.beginPath(); g.arc(x + nod, y, s * 0.25, 0, Math.PI * 2); g.fill();
  });
};

/** 激活波可视化：从相握的手扩散的金圈（只映在袍上时由 paintRobe 内流光承担，这里画空气中的细环）。 */
const drawWaveRing = (g: CanvasRenderingContext2D, t: number) => {
  const R = waveR(t);
  if (R <= 4 || R > 430) return;
  const a = 0.4 * (1 - clamp01((R - 300) / 130));
  if (a <= 0) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = `rgba(255,232,150,${a.toFixed(3)})`;
  g.lineWidth = 5;
  g.beginPath(); g.arc(HANDS.x, HANDS.y, R, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = `rgba(255,246,200,${(a * 0.5).toFixed(3)})`;
  g.lineWidth = 12;
  g.beginPath(); g.arc(HANDS.x, HANDS.y, R + 8, 0, Math.PI * 2); g.stroke();
  g.restore();
};

/** S04 心光：相握的手上方一圈呼吸的暖光（爱是立体的落点），定帧段持续呼吸。 */
const drawHeartGlow = (g: CanvasRenderingContext2D, t: number) => {
  const pulse = 0.75 + 0.25 * Math.sin(t * 2.4);
  const R = 56 + 10 * pulse;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(HANDS.x, HANDS.y - 6, 2, HANDS.x, HANDS.y - 6, R);
  gr.addColorStop(0, `rgba(255,222,140,${(0.34 * pulse).toFixed(3)})`);
  gr.addColorStop(1, 'rgba(255,222,140,0)');
  g.fillStyle = gr;
  g.beginPath(); g.arc(HANDS.x, HANDS.y - 6, R, 0, Math.PI * 2); g.fill();
  g.restore();
};

/** 基础场景（无转场遮罩）：墙→金粉→碎片→花毯→流光→袍→写实件→激活波→心光。 */
export const paintScene = (g: CanvasRenderingContext2D, t: number, heartGlow: boolean) => {
  g.drawImage(wall(), 0, 0);
  drawDust(g, t);
  drawFrags(g, t);
  meadow(g, t);
  const sx = sweepX(t);
  if (sx > -9000) drawSweep(g, t, sx);
  g.drawImage(paintRobe(t, sx), 0, 0);
  drawRealParts(g, t);
  drawWaveRing(g, t);
  if (heartGlow) drawHeartGlow(g, t);
};

const REVEAL_END_F = 26;

/** 帧入口：f1-26 走金箔铺开合成（暗底 + 72px 方块从头部螺旋贴上），之后直绘。 */
export const paintFrame = (g: CanvasRenderingContext2D, absF: number, heartGlowFrom = 308) => {
  const t = absF / FPS;
  if (absF <= REVEAL_END_F) {
    const s = scratch('gr_scene');
    paintScene(s, t, false);
    compositeReveal(g, s.canvas, clamp01((absF - 1) / (REVEAL_END_F - 1)), t);
    return;
  }
  paintScene(g, t, absF >= heartGlowFrom);
};

// kit/shot 共享的小工具：标题/checker 装饰条（维也纳分离派黑白格）
export const checkerBar = (g: CanvasRenderingContext2D, x: number, y: number, w: number, cell = 10, dark = '#141010', light = '#f4efe2') => {
  for (let i = 0; i * cell < w; i++) {
    g.fillStyle = i % 2 ? dark : light;
    g.fillRect(x + i * cell, y, Math.min(cell, w - i * cell), cell);
  }
};
export {INK, BW};
