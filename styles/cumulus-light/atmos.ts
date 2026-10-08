// 大气光效：丁达尔光柱 + 光尘 + 镜头光晕 + 泛光 + 冷暖分离调色 —— cumulus-light。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）lib/render.js P.lensFlare / lib/post.js P.bloom 与
// scenes/35_shinkai.js 的丁达尔楔形/光尘，Remotion+Canvas2D 重写。
// 光效纪律三条红线（不过=打回）：太阳必须在玻璃内、光晕核 ≤130px（本卡 76）、横丝 ≤840px（本卡 540）、
// 泛光 α ≤0.28（本卡恰 0.28）。
import {CanvasCtx, SUN, W, H} from './types';
import {cached, scratch} from './cel';
import {hash2} from './noise';

/** 丁达尔光柱：3 楔形 blur 后缓存，screen 合成，α 0.75+0.25sin 明灭；fade 入场系数（钩子 0.5s 亮起）。 */
export function drawGodrays(c: CanvasCtx, t: number, fadeIn: number, heroBoost: number): void {
  const beams = cached('cl_beams', W, H, (g) => {
    g.filter = 'blur(13px)';
    [[232, 88, 330, 88, 960, 668, 800, 668, 0.50], [340, 88, 436, 88, 1120, 640, 960, 640, 0.36], [446, 88, 560, 88, 1276, 600, 1116, 600, 0.42]].forEach(([a, b, c2, d, e, f, gx, h, al]) => {
      const lg = g.createLinearGradient(a, b, e, f);
      lg.addColorStop(0, `rgba(255,240,205,${al})`);
      lg.addColorStop(1, 'rgba(255,240,205,0)');
      g.fillStyle = lg;
      g.beginPath();
      g.moveTo(a, b);
      g.lineTo(c2, d);
      g.lineTo(e, f);
      g.lineTo(gx, h);
      g.closePath();
      g.fill();
    });
    // 环境宽光轴（把整屋罩进「窗外很亮」的大气里）
    const amb = g.createLinearGradient(300, 88, 1180, 660);
    amb.addColorStop(0, 'rgba(255,242,210,.16)');
    amb.addColorStop(1, 'rgba(255,242,210,0)');
    g.fillStyle = amb;
    g.beginPath();
    g.moveTo(232, 88);
    g.lineTo(560, 88);
    g.lineTo(1276, 660);
    g.lineTo(700, 660);
    g.closePath();
    g.fill();
  });
  const hero = cached('cl_heroBeam', W, H, (g) => {
    g.filter = 'blur(13px)';
    const lg = g.createLinearGradient(300, 88, 1180, 620);
    lg.addColorStop(0, 'rgba(255,244,214,.5)');
    lg.addColorStop(1, 'rgba(255,244,214,0)');
    g.fillStyle = lg;
    g.beginPath();
    g.moveTo(300, 88);
    g.lineTo(392, 88);
    g.lineTo(1268, 620);
    g.lineTo(1080, 620);
    g.closePath();
    g.fill();
  });
  c.save();
  c.globalCompositeOperation = 'screen';
  c.globalAlpha = (0.75 + 0.25 * Math.sin(t * 3.4)) * fadeIn;
  c.drawImage(beams, 0, 0);
  c.globalAlpha = heroBoost * (0.6 + 0.18 * Math.sin(t * 2.2 + 1));
  c.drawImage(hero, 0, 0);
  // 光尘 60 颗（径向渐变、闪烁、上漂循环）
  for (let i = 0; i < 60; i++) {
    const ph = hash2(i, 7, 91);
    const life = 6 + hash2(i, 29, 91) * 6;
    const u = ((t * 0.5) % life) / life;
    const x = 430 + hash2(i, 3, 91) * 760;
    const y = 640 - u * 480 + Math.sin(t + i) * 8;
    const tw = 0.5 + 0.5 * Math.sin(t * 6 + i * 1.3);
    const rr = 1.2 + ph * 2.6;
    const g2 = c.createRadialGradient(x, y, 0, x, y, rr * 2.5);
    g2.addColorStop(0, `rgba(255,250,230,${0.8 * tw * fadeIn})`);
    g2.addColorStop(1, 'rgba(255,250,230,0)');
    c.fillStyle = g2;
    c.beginPath();
    c.arc(x, y, rr * 2.5, 0, 7);
    c.fill();
  }
  c.restore();
}

/** 盆栽（桌上右端，叶片随风摆；赛璐珞叶 sd7）。 */
export function drawPlant(c: CanvasCtx, t: number, gust: number): void {
  const sway = Math.sin(t * 2.6) * 0.05 * (1 + gust);
  c.fillStyle = '#e8e2d6';
  c.fillRect(1078, 432, 44, 36);
  c.fillStyle = '#c9c0b0';
  c.fillRect(1100, 432, 22, 36);
  [[-0.85, 44], [-0.35, 56], [0.15, 52], [0.65, 42], [-1.25, 32], [1.1, 34]].forEach(([a, l], k) => {
    c.save();
    c.translate(1100, 434);
    c.rotate(a + sway * (1 + k * 0.3));
    const leaf = new Path2D();
    leaf.ellipse(0, -l * 0.6, 10, l * 0.55, 0, 0, 7);
    const gg = c.createLinearGradient(0, -l, 0, 0);
    gg.addColorStop(0, '#5fae5a');
    gg.addColorStop(1, '#2f7a42');
    c.fillStyle = gg;
    c.fill(leaf);
    c.strokeStyle = '#2a5a32';
    c.lineWidth = 1.4;
    c.stroke(leaf);
    c.restore();
  });
}

/**
 * 镜头光晕（玻璃伪像，画在全片之上）：太阳核 76px（≤130 红线）+ 10 根星芒慢转 + 横向拉丝 540px（≤840 红线）
 * + 5 个六边形光斑沿太阳→画心连线。
 */
export function drawLensFlare(c: CanvasCtx, t: number): void {
  const sx = SUN.x, sy = SUN.y;
  c.save();
  // 太阳核（暖白两层圆，整体在玻璃内）
  const core = c.createRadialGradient(sx, sy, 0, sx, sy, SUN.r);
  core.addColorStop(0, 'rgba(255,252,238,.95)');
  core.addColorStop(0.55, 'rgba(255,244,205,.55)');
  core.addColorStop(1, 'rgba(255,244,205,0)');
  c.fillStyle = core;
  c.beginPath();
  c.arc(sx, sy, SUN.r, 0, 7);
  c.fill();
  // 10 根星芒（两组长度交替，0.25rad/s 旋转）
  c.save();
  c.translate(sx, sy);
  c.rotate(t * 0.25);
  c.strokeStyle = 'rgba(255,250,225,.7)';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const len = i % 2 === 0 ? 92 : 48;
    c.lineWidth = i % 2 === 0 ? 2.2 : 1.4;
    c.beginPath();
    c.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
    c.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    c.stroke();
  }
  c.restore();
  // 横向拉丝（540×3，红线 ≤840）
  const st = c.createLinearGradient(sx - 270, 0, sx + 270, 0);
  st.addColorStop(0, 'rgba(255,248,222,0)');
  st.addColorStop(0.5, 'rgba(255,248,222,.35)');
  st.addColorStop(1, 'rgba(255,248,222,0)');
  c.fillStyle = st;
  c.fillRect(sx - 270, sy - 1.5, 540, 3);
  // 5 个六边形鬼影（沿太阳→画心，α 0.04-0.12）
  const cx = W / 2, cy = H / 2;
  const dx = cx - sx, dy = cy - sy;
  [[0.45, 0.10, 20], [0.75, 0.06, 30], [1.25, 0.12, 44], [1.6, 0.05, 56], [2.0, 0.04, 70]].forEach(([m, al, r]) => {
    const gx = sx + dx * (m as number), gy = sy + dy * (m as number);
    c.fillStyle = `rgba(255,230,170,${al as number})`;
    c.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + t * 0.1;
      const px = gx + Math.cos(a) * (r as number), py = gy + Math.sin(a) * (r as number) * 0.72;
      if (k === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
    c.fill();
  });
  c.restore();
}

/** 泛光：整帧画进 427×240 小画布 → blur4 + brightness1.08 → screen α0.28 放大回叠（红线 α≤0.28）。 */
export function drawBloom(c: CanvasCtx): void {
  const src = c.canvas;
  const bw = 427, bh = 240;
  const BL = scratch('cl_bloom', bw, bh);
  BL.filter = 'blur(4px) brightness(1.08)';
  BL.drawImage(src, 0, 0, bw, bh);
  BL.filter = 'none';
  c.save();
  c.globalCompositeOperation = 'screen';
  c.globalAlpha = 0.28;
  c.drawImage(BL.canvas, 0, 0, bw, bh, 0, 0, W, H);
  c.restore();
}

/** 整体冷暖分离：高光偏暖、暗部偏蓝（soft-light 对角渐变）。 */
export function drawGrade(c: CanvasCtx): void {
  c.save();
  c.globalCompositeOperation = 'soft-light';
  const tg = c.createLinearGradient(0, 0, W, H);
  tg.addColorStop(0, 'rgba(255,220,170,.35)');
  tg.addColorStop(1, 'rgba(80,120,220,.35)');
  c.fillStyle = tg;
  c.fillRect(0, 0, W, H);
  c.restore();
}
