// chrome-ball 世界层：青绿墙+窗（粉紫天/远山线框网格/雪顶）、逐像素透视棋盘地面、
// 绿色线框→扫描线逐行渲染显影（签名③⑦）、地面逐格扫描带（S03「一格一格地数」）。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）15_raytrace（背景/棋盘/转场机制与锁死参数，
// 消失点/雾距按 1280×720 做 2/3 换算），Remotion(TSX) 重写，零整段拷贝。
import type {CanvasCtx} from './types';
import {W, H, FLOOR_Y, VP, SUN, PAL, REVEAL} from './types';
import type {Pt} from './types';
import {clamp, lerp, noise, mulberry32, smoothPath} from './noise';

// ---------- 离屏缓存（静态层一次构建） ----------
const CACHES = new Map<string, HTMLCanvasElement>();
export function cached(name: string, w: number, h: number, build: (g: CanvasCtx) => void): HTMLCanvasElement {
  let cv = CACHES.get(name);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    build(cv.getContext('2d')!);
    CACHES.set(name, cv);
  }
  return cv;
}

/** 逐帧临时层（反射合成用，每帧 clear）。 */
export function scratch(name: string, w = W, h = H): CanvasCtx {
  let cv = CACHES.get(name);
  if (!cv || cv.width !== w || cv.height !== h) {
    cv = cv ?? document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    CACHES.set(name, cv);
  }
  const g = cv.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, w, h);
  return g;
}

/** 取已存在的 scratch 层的 canvas 元素（drawImage 合成用；须先 scratch(name) 建层）。 */
export function scratchCanvas(name: string): HTMLCanvasElement {
  const cv = CACHES.get(name);
  if (!cv) throw new Error(`scratch layer ${name} not created`);
  return cv;
}

// ---------- 静态底：青绿墙 + 窗（粉紫夕阳/远山线框网格/雪顶/白窗框/窗台） ----------
export function drawBackground(g: CanvasCtx): void {
  // 墙：径向渐变，光源在窗的位置
  const wg = g.createRadialGradient(373, 173, 40, 466, 266, 1000);
  wg.addColorStop(0, PAL.wall0);
  wg.addColorStop(0.45, PAL.wall1);
  wg.addColorStop(1, PAL.wall2);
  g.fillStyle = wg;
  g.fillRect(0, 0, W, FLOOR_Y);
  // 窗的投影（右下偏移、软边）
  g.save();
  g.filter = 'blur(7px)';
  g.fillStyle = 'rgba(20,60,70,.45)';
  g.fillRect(248, 93, 300, 302);
  g.restore();
  // 窗外：粉紫夕阳（四段锁死）
  g.save();
  g.beginPath();
  g.rect(253, 90, 268, 268);
  g.clip();
  const sg = g.createLinearGradient(0, 90, 0, 358);
  sg.addColorStop(0, PAL.sky0);
  sg.addColorStop(0.45, PAL.sky1);
  sg.addColorStop(0.8, PAL.sky2);
  sg.addColorStop(1, PAL.sky3);
  g.fillStyle = sg;
  g.fillRect(253, 90, 268, 268);
  // 远山两层 + 雪顶 + 早期 CG 的线框网格地形
  const mtn = (pts: Pt[], col: [string, string], snow: [number, number, number][]) => {
    g.beginPath();
    g.moveTo(253, 363);
    pts.forEach((p) => g.lineTo(p[0], p[1]));
    g.lineTo(521, 363);
    g.closePath();
    const mg = g.createLinearGradient(0, 227, 0, 363);
    mg.addColorStop(0, col[0]);
    mg.addColorStop(1, col[1]);
    g.fillStyle = mg;
    g.fill();
    g.save();
    g.clip();
    g.strokeStyle = 'rgba(255,170,230,.45)';
    g.lineWidth = 1.2;
    for (let x = 253; x < 521; x += 19) {
      g.beginPath();
      g.moveTo(x, 220);
      g.lineTo(x, 363);
      g.stroke();
    }
    for (let y = 240; y < 363; y += 17) {
      g.beginPath();
      g.moveTo(253, y);
      g.lineTo(521, y);
      g.stroke();
    }
    g.fillStyle = '#fbeef6';
    for (const [x, y, w] of snow) {
      g.beginPath();
      g.moveTo(x - w, y + w * 0.9);
      g.lineTo(x, y);
      g.lineTo(x + w, y + w * 0.9);
      g.lineTo(x + w * 0.4, y + w * 0.6);
      g.lineTo(x, y + w * 0.95);
      g.lineTo(x - w * 0.5, y + w * 0.6);
      g.closePath();
      g.fill();
    }
    g.restore();
  };
  mtn([[250, 253], [287, 235], [308, 230], [347, 267], [390, 293], [427, 280], [467, 260], [507, 263], [523, 267]], ['#b06ab8', '#8a50a8'], [[308, 230, 20], [467, 260, 15], [287, 235, 12]]);
  mtn([[250, 313], [313, 287], [373, 313], [407, 293], [460, 320], [523, 293]], ['#8f5aa8', '#6c3f94'], [[407, 293, 12], [313, 287, 11]]);
  g.restore();
  // 白窗框（立体：亮边 + 暗边）
  const frame = (x: number, y: number, w: number, h: number) => {
    const fg = g.createLinearGradient(x, y, x + w, y + h);
    fg.addColorStop(0, '#ffffff');
    fg.addColorStop(1, '#d6dde0');
    g.fillStyle = fg;
    g.fillRect(x, y, w, h);
  };
  frame(237, 79, 297, 12);
  frame(237, 79, 13, 291);
  frame(522, 79, 11, 291);
  frame(237, 359, 297, 11);
  frame(381, 90, 9, 270);
  frame(250, 220, 273, 9);
  g.fillStyle = 'rgba(0,40,60,.25)';
  g.fillRect(253, 90, 268, 3);
  g.fillRect(253, 90, 3, 268);
  // 窗台
  const sl = g.createLinearGradient(0, 370, 0, 381);
  sl.addColorStop(0, '#ffffff');
  sl.addColorStop(1, '#c9d2d6');
  g.fillStyle = sl;
  g.fillRect(220, 370, 327, 11);
  g.fillStyle = 'rgba(20,60,70,.35)';
  g.fillRect(227, 381, 327, 8);
  // 踢脚线
  const bb = g.createLinearGradient(0, 507, 0, FLOOR_Y);
  bb.addColorStop(0, '#ffffff');
  bb.addColorStop(1, '#d9dde0');
  g.fillStyle = bb;
  g.fillRect(0, 507, W, FLOOR_Y - 507);
  g.fillStyle = 'rgba(0,40,50,.25)';
  g.fillRect(0, 504, W, 3);
}

// ---------- 签名③ 逐像素透视棋盘地面（2×2 超采样 + 近墙 93px 35% 雾） ----------
export function drawFloor(g: CanvasCtx): void {
  const TX = 0.27, TZ = 0.00044; // 视空间格密度（2/3 换算：近底格宽 ~108px / 格深 ~70px）
  const im = g.createImageData(W, H - FLOOR_Y);
  const d = im.data;
  const A = [0xd9, 0xda, 0xdf], B = [0x3e, 0x5d, 0x62];
  for (let y = FLOOR_Y; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let k = 0; k < 4; k++) {
        const yy = y + (k >> 1) * 0.5 + 0.25, xx = x + (k & 1) * 0.5 + 0.25;
        const dy = yy - VP[1];
        const X = (xx - VP[0]) / dy, Z = 1 / dy;
        s += (Math.floor(X / TX + 0.5) + Math.floor(Z / TZ)) & 1;
      }
      const q = s / 4;
      const fog = clamp(1 - (y - FLOOR_Y) / 93, 0, 1) * 0.35; // 近墙 35% 雾（140px 的 2/3）
      const i = ((y - FLOOR_Y) * W + x) * 4;
      const FOG = PAL.fog as unknown as number[];
      for (let ch = 0; ch < 3; ch++) d[i + ch] = lerp(lerp(A[ch], B[ch], q), FOG[ch], fog);
      d[i + 3] = 255;
    }
  }
  g.putImageData(im, 0, FLOOR_Y);
  // 地面上的窗光亮斑
  const lg = g.createRadialGradient(373, 600, 16, 373, 600, 346);
  lg.addColorStop(0, 'rgba(255,200,230,.22)');
  lg.addColorStop(1, 'rgba(255,200,230,0)');
  g.fillStyle = lg;
  g.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
}

// ---------- 签名⑦ 绿色线框层（暗底 + 磷光绿边；转场第一次出现即完整，不留空白） ----------
export function buildWireframe(g: CanvasCtx): void {
  g.fillStyle = PAL.dark;
  g.fillRect(0, 0, W, H);
  const r = mulberry32(19950615);
  // 墙地分界 + 墙面角线
  g.strokeStyle = PAL.wire;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, FLOOR_Y);
  g.lineTo(W, FLOOR_Y);
  g.stroke();
  // 窗框矩形 + 窗棂
  g.strokeRect(237, 79, 296, 291);
  g.strokeStyle = PAL.wireDim;
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(385, 79);
  g.lineTo(385, 370);
  g.moveTo(237, 224);
  g.lineTo(533, 224);
  g.stroke();
  // 窗内天空网格（线框地形）
  g.strokeStyle = 'rgba(70,255,154,0.22)';
  for (let x = 253; x < 521; x += 19) {
    g.beginPath();
    g.moveTo(x, 90);
    g.lineTo(x, 358);
    g.stroke();
  }
  for (let y = 92; y < 358; y += 17) {
    g.beginPath();
    g.moveTo(253, y);
    g.lineTo(521, y);
    g.stroke();
  }
  // 地面透视网格：径向线（指向消失点）+ 深度横线（Z=k·TZ 的 dy）
  g.strokeStyle = PAL.wireDim;
  const yBot = H + 30;
  for (let m = -8; m <= 8; m++) {
    const x1 = VP[0] + m * 108 * (FLOOR_Y - VP[1]) / (yBot - VP[1]);
    g.beginPath();
    g.moveTo(x1, FLOOR_Y);
    g.lineTo(VP[0] + m * 108, yBot);
    g.stroke();
  }
  g.strokeStyle = PAL.wire;
  for (let k = 6; k <= 13; k++) {
    const y = VP[1] + 1 / (k * 0.00044);
    if (y < FLOOR_Y || y > H + 30) continue;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }
  // 物体线框：铬球 / 紫环双椭圆 / 绿锥 / 猫（平滑体廓）
  g.lineWidth = 2;
  g.strokeStyle = PAL.wire;
  g.beginPath();
  g.arc(830, 505, 52, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.ellipse(1130, 498, 51, 25, 0, 0, Math.PI * 2);
  g.ellipse(1130, 498, 27, 7, 0, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.moveTo(1035, 404);
  g.lineTo(990, 516);
  g.moveTo(1035, 404);
  g.lineTo(1080, 516);
  g.ellipse(1035, 516, 45, 10, 0, 0, Math.PI * 2);
  g.stroke();
  const body = smoothPath([[286, 558], [278, 508], [292, 466], [322, 448], [352, 446], [376, 456], [390, 478], [396, 510], [398, 540], [400, 558]]);
  g.stroke(body);
  g.beginPath();
  g.arc(352, 425, 32, 0, Math.PI * 2);
  g.moveTo(330, 398);
  g.lineTo(336, 374);
  g.lineTo(348, 392);
  g.moveTo(356, 392);
  g.lineTo(368, 372);
  g.lineTo(374, 398);
  g.moveTo(284, 540);
  g.bezierCurveTo(258, 552, 242, 562, 240, 546);
  g.stroke();
  // 接触椭圆
  g.strokeStyle = PAL.wireDim;
  [[1035, 516, 46], [1130, 528, 40], [830, 557, 52], [348, 560, 66]].forEach(([x, y, rx]) => {
    g.beginPath();
    g.ellipse(x, y, rx, rx * 0.16, 0, 0, Math.PI * 2);
    g.stroke();
  });
  // 少量扫描噪点（线框时代的显示噪声，seeded）
  g.fillStyle = 'rgba(70,255,154,0.35)';
  for (let k = 0; k < 130; k++) {
    g.fillRect(Math.floor(r() * W), Math.floor(r() * H), 2, 1);
  }
}

// ---------- 签名⑦ 扫描线逐行显影（f1-2 全线框，f3-15 逐行下扫，f16 完成） ----------
export function drawReveal(c: CanvasCtx, f: number): void {
  if (f > REVEAL.end + 1) return;
  const wf = cached('cb_wire', W, H, buildWireframe);
  const sweepY = f < REVEAL.start ? 0 : clamp(((f - REVEAL.start) / (REVEAL.end - REVEAL.start)) * (H + 40) - 20, 0, H);
  // 分界线以下还是线框（未渲染）
  c.save();
  c.beginPath();
  c.rect(0, sweepY, W, H - sweepY);
  c.clip();
  c.drawImage(wf, 0, 0);
  c.restore();
  if (f >= REVEAL.start && sweepY < H) {
    // 扫描亮线 + 上沿余晖（刚渲染完的行还在发亮）
    c.save();
    c.globalCompositeOperation = 'lighter';
    const tr = c.createLinearGradient(0, sweepY - 46, 0, sweepY);
    tr.addColorStop(0, 'rgba(120,255,190,0)');
    tr.addColorStop(1, 'rgba(120,255,190,.28)');
    c.fillStyle = tr;
    c.fillRect(0, sweepY - 46, W, 46);
    c.fillStyle = 'rgba(220,255,236,.95)';
    c.fillRect(0, sweepY - 2, W, 2.5);
    // 两道确定的横向毛刺（值噪声驱动）
    for (let k = 0; k < 2; k++) {
      const gy = sweepY - 12 - k * 17 + noise(k * 3.1, f * 0.7) * 9;
      const gw = 90 + noise(k * 7.7, f) * 240;
      const gx = noise(k * 13.3, f * 1.3) * (W - gw);
      c.fillStyle = 'rgba(190,255,220,.5)';
      c.fillRect(gx, gy, gw, 1.6);
    }
    c.restore();
  }
}

// ---------- S03「一格一格地数」地面逐格扫描带（f198-240 下扫，f241-243 回跳重数，f244-246 归位） ----------
/** 扫描带 y 位置（含笨拙回跳）；不在扫描段返回 -1。 */
export function scanBandY(f: number): number {
  if (f < 198 || f > 246) return -1;
  const p = clamp((f - 198) / 42, 0, 1);
  const y = lerp(FLOOR_Y, H, p);
  if (f >= 241 && f <= 243) return y - 24; // 数过头，回跳两格重数（笨拙）
  return y;
}

export function drawScanBand(c: CanvasCtx, f: number): void {
  const y = scanBandY(f);
  if (y < 0) return;
  c.save();
  c.beginPath();
  c.rect(0, FLOOR_Y, W, H - FLOOR_Y);
  c.clip();
  c.globalCompositeOperation = 'lighter';
  // 扫描带本体 + 下方余晖
  const g1 = c.createLinearGradient(0, y - 26, 0, y);
  g1.addColorStop(0, 'rgba(190,255,220,0)');
  g1.addColorStop(1, 'rgba(190,255,220,.16)');
  c.fillStyle = g1;
  c.fillRect(0, y - 26, W, 26);
  c.fillStyle = 'rgba(225,255,240,.34)';
  c.fillRect(0, y - 1.5, W, 3);
  // 带上的格边界刻度（沿透视 x = VP.x ± m·TX·dy）——「一格一格」可读
  const dy = y - VP[1];
  c.strokeStyle = 'rgba(230,255,242,.5)';
  c.lineWidth = 2;
  for (let m = -8; m <= 8; m++) {
    const x = VP[0] + m * 0.27 * dy; // 格宽 = TX·dy（dy=400 时 108px）
    c.beginPath();
    c.moveTo(x, y - 9);
    c.lineTo(x, y + 9);
    c.stroke();
  }
  // 回跳瞬间：两格闪白（重数）
  if (f >= 241 && f <= 244) {
    c.fillStyle = `rgba(255,255,255,${0.4 * (1 - (f - 241) / 3)})`;
    for (const m of [-1, 2]) {
      const x = VP[0] + m * 0.27 * dy;
      c.fillRect(x, y - 12, 0.27 * dy, 24);
    }
  }
  c.restore();
}

// ---------- 场景小工具 ----------
/** 镜头光晕太阳的脉动因子（签名⑥ 内核，供 flare.ts 共用）。 */
export const sunPulse = (t: number): number => 1 + 0.08 * Math.sin(t * 20);
export {SUN};
