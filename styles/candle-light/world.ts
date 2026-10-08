// ============================================================================
// world.ts — candle-light 暗房静态层 + 光柱 + 旧画罩层（确定性烘焙画师）
// 技法借鉴 huashu-art-motion scenes/32_rembrandt.js（room/table/stat/beam/craquelure，
// MIT, alchaincyf），TS 重写——机制与参数级借鉴（亮态底稿→褐色笔触揉开的底子→
// 窗与木作保留清楚 / 楔形光柱 blur 缓存 / 龟裂随机游走 / 颗粒 0.05·α0.12 剂量），
// 结构、命名、API 全部按 Remotion/TS 惯用法重写，零代码拷贝。
// 纪律：mulberry32 + 解析 value 噪声，禁 Math.random/Date/网络。
// ============================================================================

export const W = 1280;
export const H = 720;
export const FPS = 30;

// ---- 确定性工具 ----
export type Rng = () => number;
export const mulberry32 = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
/** 解析 value 噪声（约 [-1,1]）：烛焰 flick / 背景笔触方向场用 */
export const noise2 = (x: number, y: number): number => {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const h = (i: number, j: number) => {
    let n = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return (((n ^ (n >>> 16)) >>> 0) % 20000) / 10000 - 1;
  };
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
};
export const newCanvas = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

// ---- 场景几何锚 ----
/** 窗（铅条菱格+牛眼玻璃）：玻璃可视区 */
export const WIN = {x: 187, y: 77, w: 300, h: 356};
/** 光柱楔形（从窗向右下桌面倾落） */
export const BEAM_PTS: Array<[number, number]> = [[192, 80], [486, 80], [706, 660], [318, 660]];
/** 烛位（桌上黄铜烛台） */
export const CANDLE = {x: 595, base: 470, top: 358};

// ---- 暗房（亮态底稿：按「全亮」时的颜色画，明暗交给光照图） ----
function paintRoom(g: CanvasRenderingContext2D): void {
  // 墙：暖褐，向右变深（伦勃朗暗房）
  const wg = g.createLinearGradient(0, 0, W, 0);
  wg.addColorStop(0, '#6a4a2a');
  wg.addColorStop(0.5, '#4a321c');
  wg.addColorStop(1, '#241408');
  g.fillStyle = wg;
  g.fillRect(0, 0, W, H);
  // 墙面斑驳（fbm 大颗粒，暗部不死平）
  const r0 = mulberry32(21);
  for (let i = 0; i < 240; i++) {
    const x = r0() * W, y = r0() * H, rr = 30 + r0() * 90;
    const a = 0.04 + r0() * 0.05;
    g.fillStyle = r0() < 0.5 ? `rgba(20,10,4,${a.toFixed(3)})` : `rgba(130,90,50,${(a * 0.7).toFixed(3)})`;
    g.beginPath();
    g.arc(x, y, rr, 0, Math.PI * 2);
    g.fill();
  }
  // 地面 + 木板缝
  g.fillStyle = '#33200f';
  g.fillRect(0, 600, W, 120);
  g.strokeStyle = 'rgba(14,8,2,.6)';
  g.lineWidth = 2;
  for (let k = 0; k < 7; k++) {
    const y = 608 + k * 16;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y - 6);
    g.stroke();
  }
  // 窗洞（厚墙斜面）
  g.fillStyle = '#8a6a44';
  g.beginPath(); g.moveTo(159, 53); g.lineTo(513, 53); g.lineTo(500, 77); g.lineTo(172, 77); g.closePath(); g.fill();
  g.fillStyle = '#9a7a50';
  g.beginPath(); g.moveTo(159, 53); g.lineTo(187, 77); g.lineTo(187, 433); g.lineTo(159, 459); g.closePath(); g.fill();
  g.fillStyle = '#4a3018';
  g.beginPath(); g.moveTo(513, 53); g.lineTo(487, 77); g.lineTo(487, 433); g.lineTo(513, 459); g.closePath(); g.fill();
  // 玻璃：暖白径向 + 牛眼圆斑 + 铅条菱格
  g.save();
  g.beginPath(); g.rect(WIN.x, WIN.y, WIN.w, WIN.h); g.clip();
  const gg = g.createRadialGradient(340, 210, 14, 350, 240, 260);
  gg.addColorStop(0, '#fff6dc');
  gg.addColorStop(0.6, '#f0d8a0');
  gg.addColorStop(1, '#c49a5a');
  g.fillStyle = gg;
  g.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
  const r1 = mulberry32(42);
  for (let i = 0; i < 34; i++) {
    const x = WIN.x + r1() * WIN.w, y = WIN.y + r1() * WIN.h, rr = 4 + r1() * 9;
    g.fillStyle = r1() < 0.5 ? `rgba(255,250,230,${(0.15 + r1() * 0.2).toFixed(2)})` : `rgba(190,150,90,${(0.15 + r1() * 0.2).toFixed(2)})`;
    g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = '#3a2a1a';
  g.lineWidth = 2.2;
  const span = WIN.h * 0.55;
  for (let k = -8; k < 12; k++) {
    const x0 = WIN.x + k * 30;
    g.beginPath(); g.moveTo(x0, WIN.y); g.lineTo(x0 + span, WIN.y + WIN.h); g.stroke();
    g.beginPath(); g.moveTo(x0, WIN.y + WIN.h); g.lineTo(x0 + span, WIN.y); g.stroke();
  }
  g.restore();
  // 窗框与中梃、横档（ crisp 木作）
  g.fillStyle = '#241408';
  g.fillRect(WIN.x, WIN.y, WIN.w, 9);
  g.fillRect(WIN.x, WIN.y + WIN.h - 9, WIN.w, 9);
  g.fillRect(WIN.x, WIN.y, 9, WIN.h);
  g.fillRect(WIN.x + WIN.w - 9, WIN.y, 9, WIN.h);
  g.fillRect(WIN.x + 144, WIN.y, 11, WIN.h);
  g.fillRect(WIN.x, WIN.y + 168, WIN.w, 9);
  // 窗台
  g.fillStyle = '#7a5a36'; g.fillRect(150, 433, 400, 18);
  g.fillStyle = '#3a2410'; g.fillRect(150, 451, 400, 10);
  // 右侧深红褐帷幕（大褶）
  const cg = g.createLinearGradient(1130, 0, W, 0);
  cg.addColorStop(0, '#4a1a10');
  cg.addColorStop(1, '#200803');
  g.fillStyle = cg;
  g.beginPath();
  g.moveTo(1170, 0);
  g.bezierCurveTo(1204, 200, 1160, 400, 1204, H);
  g.lineTo(W, H);
  g.lineTo(W, 0);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(110,44,26,.55)';
  g.lineWidth = 8;
  [1206, 1250].forEach((x, k) => {
    g.beginPath();
    g.moveTo(x, 0);
    g.bezierCurveTo(x + 22, 200, x - 22, 430, x + 8 * k, H);
    g.stroke();
  });
  // 椅背（读信人身后，深色木作）
  g.fillStyle = '#241408'; g.fillRect(952, 330, 16, 330); g.fillRect(994, 338, 14, 322);
  g.fillStyle = '#4a2a16'; g.fillRect(958, 352, 40, 128);
  g.fillRect(948, 322, 66, 17);
}

// ---- 桌：土耳其桌毯 + 桌上小物（书/墨水瓶/烛台/蜡烛） ----
function paintTable(g: CanvasRenderingContext2D): void {
  // 毯面（垂到地）
  g.fillStyle = '#6e2414';
  g.beginPath();
  g.moveTo(400, 470); g.lineTo(830, 470); g.lineTo(848, 648);
  g.quadraticCurveTo(620, 668, 388, 652);
  g.closePath(); g.fill();
  g.fillStyle = '#8a3418';
  g.fillRect(400, 462, 430, 16);
  // 金边带
  g.strokeStyle = '#b8863a';
  g.lineWidth = 4;
  g.beginPath(); g.moveTo(404, 500); g.lineTo(836, 500); g.stroke();
  g.beginPath(); g.moveTo(394, 622); g.lineTo(844, 622); g.stroke();
  // 菱形徽章 ×3（藏青+金心）
  const badges: Array<[number, number]> = [[478, 562], [614, 566], [752, 560]];
  badges.forEach(([x, y]) => {
    g.fillStyle = '#243350';
    g.beginPath(); g.moveTo(x, y - 40); g.lineTo(x + 30, y); g.lineTo(x, y + 40); g.lineTo(x - 30, y); g.closePath(); g.fill();
    g.fillStyle = '#b8863a';
    g.beginPath(); g.moveTo(x, y - 17); g.lineTo(x + 13, y); g.lineTo(x, y + 17); g.lineTo(x - 13, y); g.closePath(); g.fill();
  });
  // 流苏
  g.strokeStyle = '#c89a4a';
  g.lineWidth = 2;
  for (let x = 396; x < 840; x += 8) {
    g.beginPath(); g.moveTo(x, 650); g.lineTo(x + 2, 664); g.stroke();
  }
  // 桌上：合上的书（毯面左侧，不悬在桌沿外）
  g.fillStyle = '#5a3020';
  g.fillRect(452, 508, 58, 12);
  g.fillStyle = '#e8d6aa';
  g.fillRect(456, 502, 50, 7);
  // 墨水瓶 + 羽管笔
  g.fillStyle = '#2c2620';
  g.beginPath(); g.ellipse(516, 462, 13, 9, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(200,220,240,.35)';
  g.beginPath(); g.ellipse(513, 459, 5, 3, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#c8b088';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(524, 456); g.quadraticCurveTo(548, 420, 542, 392); g.stroke();
  // 黄铜烛台 + 白蜡烛
  g.fillStyle = '#8a6428';
  g.beginPath(); g.ellipse(CANDLE.x, CANDLE.base + 2, 26, 7, 0, 0, Math.PI * 2); g.fill();
  g.fillRect(CANDLE.x - 5, CANDLE.base - 34, 10, 36);
  g.beginPath(); g.ellipse(CANDLE.x, CANDLE.base - 34, 14, 4, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e8d8b4';
  g.fillRect(CANDLE.x - 9, CANDLE.top, 18, CANDLE.base - 36 - CANDLE.top);
  g.strokeStyle = 'rgba(120,90,40,.5)';
  g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(CANDLE.x - 9, CANDLE.top + 16); g.lineTo(CANDLE.x + 9, CANDLE.top + 16); g.stroke();
  g.strokeStyle = '#2a1a0c';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(CANDLE.x, CANDLE.top); g.lineTo(CANDLE.x + 1, CANDLE.top - 8); g.stroke();
}

// ---- 褐色大笔触重画背景（揉开的底子）：格点读底稿色 + 混深色 palette + 噪声方向 ----
function kneadStrokes(g: CanvasRenderingContext2D, base: HTMLCanvasElement): void {
  const bctx = base.getContext('2d');
  if (!bctx) return;
  const img = bctx.getImageData(0, 0, W, H).data;
  const pick = (x: number, y: number): [number, number, number] => {
    const i = ((Math.min(H - 1, Math.max(0, y | 0)) * W) + (Math.min(W - 1, Math.max(0, x | 0)))) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  const cell = 18, len = 50, lw = 14;
  const r = mulberry32(3);
  g.save();
  g.lineCap = 'round';
  for (let y = cell; y < H; y += cell) {
    for (let x = cell; x < W; x += cell) {
      // 避让：窗（含框）/桌面毯区/烛台-蜡烛-羽管笔-墨水瓶（亮色小物会被大笔触蹭出鬼影）
      const inWin = x > 140 && x < 530 && y > 40 && y < 470;
      const inTable = x > 380 && x < 860 && y > 450 && y < 670;
      const inProps = (x > 550 && x < 650 && y > 340 && y < 475) || (x > 495 && x < 560 && y > 380 && y < 475);
      if (inWin || inTable || inProps) continue;
      const [cr, cg_, cb] = pick(x, y);
      const dim = 0.55 + r() * 0.2; // 褐色重画：压暗混底
      const ang = -0.9 + 1.6 * noise2(x * 0.003, y * 0.003);
      const dx = Math.cos(ang) * len * 0.5, dy = Math.sin(ang) * len * 0.5;
      const jx = (r() - 0.5) * 10, jy = (r() - 0.5) * 10;
      g.strokeStyle = `rgba(${(cr * dim) | 0},${(cg_ * dim) | 0},${(cb * dim) | 0},0.5)`;
      g.lineWidth = lw;
      g.beginPath();
      g.moveTo(x + jx - dx, y + jy - dy);
      g.quadraticCurveTo(x + jx, y + jy, x + jx + dx * (0.8 + r() * 0.4), y + jy + dy);
      g.stroke();
    }
  }
  g.restore();
}

/** 静态层：亮态底稿 → 褐色笔触揉开（blur 2.2px 叠 0.75）→ 窗与木作/桌面重新收清楚 */
export function bakeStatic(g: CanvasRenderingContext2D): void {
  const base = newCanvas(W, H);
  const b = base.getContext('2d');
  if (!b) return;
  paintRoom(b);
  paintTable(b);
  kneadStrokes(b, base);
  // 揉开：整层 blur 2.2px 以 0.75 叠回（古典油画的软底子）
  const tmp = newCanvas(W, H);
  const tg = tmp.getContext('2d');
  if (!tg) return;
  tg.filter = 'blur(2.2px)';
  tg.drawImage(base, 0, 0);
  tg.filter = 'none';
  g.drawImage(base, 0, 0);
  g.globalAlpha = 0.75;
  g.drawImage(tmp, 0, 0);
  g.globalAlpha = 1;
  // 窗框/横档/桌沿重新收一遍清楚（不被揉没）
  g.fillStyle = 'rgba(24,12,4,.85)';
  g.fillRect(WIN.x, WIN.y, WIN.w, 8);
  g.fillRect(WIN.x, WIN.y + WIN.h - 8, WIN.w, 8);
  g.fillRect(WIN.x, WIN.y, 8, WIN.h);
  g.fillRect(WIN.x + WIN.w - 8, WIN.y, 8, WIN.h);
  g.fillRect(WIN.x + 145, WIN.y, 10, WIN.h);
  g.fillRect(WIN.x, WIN.y + 170, WIN.w, 8);
  g.fillStyle = '#6a4c2c';
  g.fillRect(150, 433, 400, 16);
  g.strokeStyle = 'rgba(160,110,50,.5)';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(404, 470); g.lineTo(830, 470); g.stroke();
  // 烛台与蜡烛重新收清楚（光照图的锚点物）
  g.fillStyle = '#9a7432';
  g.beginPath(); g.ellipse(CANDLE.x, CANDLE.base + 2, 24, 6, 0, 0, Math.PI * 2); g.fill();
  g.fillRect(CANDLE.x - 5, CANDLE.base - 32, 10, 34);
  g.fillStyle = '#efe2c0';
  g.fillRect(CANDLE.x - 9, CANDLE.top, 18, CANDLE.base - 36 - CANDLE.top);
}

/** 光柱：楔形 blur(40px) 缓存（每帧以可变 α 画进光照图，不重算模糊） */
export function bakeBeam(g: CanvasRenderingContext2D): void {
  g.save();
  g.filter = 'blur(40px)';
  g.fillStyle = 'rgba(255,232,190,0.55)';
  g.beginPath();
  g.moveTo(BEAM_PTS[0][0], BEAM_PTS[0][1]);
  for (let i = 1; i < BEAM_PTS.length; i++) g.lineTo(BEAM_PTS[i][0], BEAM_PTS[i][1]);
  g.closePath();
  g.fill();
  g.filter = 'none';
  g.restore();
}

/** 罩层：暗角 0.75 + 龟裂（随机游走 α0.12）+ 颗粒 density0.05·α0.12（剂量红线：脸上脏点坑） */
export function bakeOverlay(g: CanvasRenderingContext2D): void {
  // 暗角
  const vg = g.createRadialGradient(620, 340, 240, 660, 380, 860);
  vg.addColorStop(0, 'rgba(10,5,0,0)');
  vg.addColorStop(1, 'rgba(8,4,0,.75)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
  // 龟裂：随机游走细裂线（旧画漆裂）
  const r = mulberry32(77);
  g.lineCap = 'round';
  for (let k = 0; k < 170; k++) {
    let x = r() * W, y = r() * H;
    let ang = r() * Math.PI * 2;
    g.strokeStyle = `rgba(18,9,3,${(0.06 + r() * 0.08).toFixed(3)})`;
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(x, y);
    const segs = 6 + ((r() * 12) | 0);
    for (let s = 0; s < segs; s++) {
      ang += (r() - 0.5) * 1.1;
      x += Math.cos(ang) * (5 + r() * 9);
      y += Math.sin(ang) * (5 + r() * 9);
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // 颗粒（density 0.05 / α 0.12——0.12/0.22 会让脸上全是脏点，红线）
  const r2 = mulberry32(91);
  const n = (W * H * 0.05 * 0.06) | 0;
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(30,15,5,${(0.04 + r2() * 0.09).toFixed(3)})`;
    g.fillRect(r2() * W, r2() * H, 1.4, 1.4);
  }
}
