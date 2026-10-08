// 天空与积雨云 —— cumulus-light。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）references/风格配方/35_shinkai.md 与 scenes/35_shinkai.js 的
// 「积雨云三步法」，TSX+Canvas2D 重写：①所有团块画蓝灰剪影（线性渐变，暗部）②每团在偏向太阳
// (+0.22r, -0.3r) 处画白色径向亮球（受光面）③整层 blur 后再叠清晰层（软而不糊）。
// 禁坑：每团径向渐变+受光弧线 = 肥皂泡。塔顶必须远超屋顶线（「云比楼高」视觉句）。
import {CanvasCtx, CLOUD, GLASS, MULLION, SKY} from './types';
import {scratch} from './cel';
import {lerp, mulberry32} from './noise';

type Blob = {x: number; y: number; r: number; ph: number};

// 积雨云塔：底部宽、向上收、顶部铁砧略右偏；外加两团小云。模块加载期一次生成（seeded）。
const BLOBS: Blob[] = (() => {
  const r = mulberry32(20261115);
  const out: Blob[] = [];
  for (let i = 0; i < 70; i++) {
    const h = Math.pow(r(), 0.8);
    const y = GLASS.y + 350 - h * 295;
    const w = h > 0.85 ? 260 : lerp(180, 90, h);
    out.push({
      x: GLASS.x + 168 + (r() - 0.5) * w * 1.4 + h * 30,
      y: y + (r() - 0.5) * 22,
      r: lerp(56, 30, h) * (0.8 + r() * 0.5),
      ph: r() * 6,
    });
  }
  for (let i = 0; i < 12; i++) {
    out.push({x: GLASS.x + 20 + r() * 70, y: GLASS.y + 120 + r() * 60, r: 14 + r() * 18, ph: r() * 6});
  }
  return out.sort((a, b) => b.y - a.y);
})();

/** 玻璃内天空：渐变 + 积雨云（三步法）+ 远处屋顶 + 电线杆电线 + 飞机拉线 + 鸟群。 */
export function drawSky(c: CanvasCtx, t: number): void {
  c.save();
  c.beginPath();
  c.rect(GLASS.x, GLASS.y, GLASS.w, GLASS.h);
  c.clip();
  const sg = c.createLinearGradient(0, GLASS.y, 0, GLASS.y + GLASS.h);
  sg.addColorStop(0, SKY[0]);
  sg.addColorStop(0.45, SKY[1]);
  sg.addColorStop(0.85, SKY[2]);
  sg.addColorStop(1, SKY[3]);
  c.fillStyle = sg;
  c.fillRect(GLASS.x, GLASS.y, GLASS.w, GLASS.h);
  // ---- 积雨云三步法（离屏 → 糊 3px → 叠 55% 清晰层）----
  const drift = t * 7;
  const at = (b: Blob): [number, number, number] => [
    b.x + drift,
    b.y - Math.sin(t * 0.8 + b.ph) * 3,
    b.r * (1 + 0.05 * Math.sin(t * 1.3 + b.ph)),
  ];
  const CL = scratch('cl_cloudL', GLASS.w + 300, GLASS.h);
  CL.translate(60 - GLASS.x, -GLASS.y);
  // ① 剪影（蓝灰线性渐变，暗部）
  BLOBS.forEach((b) => {
    const [x, y, r] = at(b);
    const gg = CL.createLinearGradient(0, y - r, 0, y + r);
    gg.addColorStop(0, CLOUD.hi);
    gg.addColorStop(1, CLOUD.lo);
    CL.fillStyle = gg;
    CL.beginPath();
    CL.arc(x, y, r, 0, 7);
    CL.fill();
  });
    // ② 偏向太阳的白色亮球（受光面）——禁整团径向渐变
    BLOBS.forEach((b) => {
      const [x, y, r] = at(b);
      const ox = x + r * 0.22, oy = y - r * 0.3, rr = r * 0.75;
      const gg = CL.createRadialGradient(ox + rr * 0.3, oy - rr * 0.3, rr * 0.05, ox, oy, rr);
      gg.addColorStop(0, CLOUD.ball0);
      gg.addColorStop(0.55, CLOUD.ball1);
      gg.addColorStop(0.85, CLOUD.ball2);
      gg.addColorStop(1, 'rgba(226,233,250,0)');
      CL.fillStyle = gg;
      CL.beginPath();
      CL.arc(ox, oy, rr, 0, 7);
      CL.fill();
    });
  c.save();
  c.filter = 'blur(3.5px)';
  c.drawImage(CL.canvas, GLASS.x - 60, GLASS.y);
  c.restore();
  c.globalAlpha = 0.45;
  c.drawImage(CL.canvas, GLASS.x - 60, GLASS.y);
  c.globalAlpha = 1;
  // ---- 远处屋顶（逆光雾蓝，低于云塔顶 = 云比楼高）----
  c.fillStyle = '#7d9cc6';
  c.beginPath();
  c.moveTo(GLASS.x, GLASS.y + GLASS.h);
  [[GLASS.x, 366], [248, 366], [248, 348], [292, 348], [300, 334], [338, 334], [342, 356], [388, 356], [392, 340], [430, 340], [436, 360], [482, 360], [486, 344], [516, 344], [516, 484]].forEach((p) => c.lineTo(p[0], p[1]));
  c.closePath();
  c.fill();
  // 电线杆 + 三根垂线（雨天前的低压电线）
  c.fillStyle = '#5f7fae';
  c.fillRect(508, 214, 6, 270);
  c.fillRect(496, 226, 30, 4);
  c.fillRect(499, 242, 25, 3);
  c.strokeStyle = 'rgba(50,70,110,.8)';
  c.lineWidth = 1.2;
  [[232, 238], [246, 256], [234, 292]].forEach(([y0, y1], k) => {
    c.beginPath();
    c.moveTo(GLASS.x, y1 + 22 + k * 4);
    c.quadraticCurveTo(380, y1 + 42, 508, y0);
    c.quadraticCurveTo(540, y0 + 8, 600, y0 + 12 + k * 3);
    c.stroke();
  });
  // 飞机拉线：从左往右飞，线在身后渐宽渐淡
  const px = GLASS.x + 20 + ((t * 96) % 380);
  const py = 136 - (px - GLASS.x - 20) * 0.04;
  const ctg = c.createLinearGradient(px - 180, 0, px, 0);
  ctg.addColorStop(0, 'rgba(255,255,255,0)');
  ctg.addColorStop(1, 'rgba(255,255,255,.9)');
  c.strokeStyle = ctg;
  c.lineWidth = 2.2;
  c.beginPath();
  c.moveTo(px - 180, py + 9);
  c.lineTo(px, py);
  c.stroke();
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(px + 2, py, 1.8, 0, 7);
  c.fill();
  // 鸟群：三只 V 形扇翅
  for (let k = 0; k < 3; k++) {
    const bx = 320 + t * 64 + k * 24, by = 176 + k * 10 + Math.sin(t * 3 + k) * 4;
    const f = Math.sin(t * 16 + k * 2) * 5;
    c.strokeStyle = '#3a4a6a';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(bx - 7, by - f);
    c.lineTo(bx, by);
    c.lineTo(bx + 7, by - f);
    c.stroke();
  }
  c.restore();
}

/** 窗中梃（sky 之后、水珠之后的竖向分隔条，让玻璃有进深）。 */
export function drawMullion(c: CanvasCtx): void {
  c.fillStyle = '#eef0f4';
  c.fillRect(MULLION.x, GLASS.y, MULLION.w, GLASS.h);
  c.fillStyle = '#c6cad4';
  c.fillRect(MULLION.x + MULLION.w, GLASS.y, 4, GLASS.h);
}
