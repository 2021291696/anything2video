// 蓝屋静态层（平涂底稿 / 宽干笔层 / 桌层 / 环境轮廓 / 画布纹罩）。
// 管线照 36 号配方：①蓝单色平涂底稿 → ②宽而干的笔触重画（墙竖刷地横刷，cap butt）再糊 7px 叠 α0.8
// → ③干刷细丝 → ④窗框原样拷回+小笔触 → ⑤桌单独一层（矩形 mask 挖洞会留平涂补丁——36 号踩坑）
// → ⑥环境普鲁士蓝粗轮廓（不沸腾）。全部静态内容只建一次（模块级缓存，纯函数内容）。
import {BLUE, FLOOR, H, SHELF, TABLE, W, WINDOW, type CanvasCtx} from './types';
import {blurOverlay, dryFilaments, hex, strokes, swatch, type RGB} from './brush';
import {noise2} from './noise';

export function makeCanvas(w = W, h = H): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** 区域色板组（锁死 token：全部在蓝轴上）。 */
const SW = {
  wall: swatch(['#1d3866', '#24457a', '#163056', '#2e5a94', '#20406e', '#3b6878'], 0.8),
  floor: swatch(['#4a6c94', '#587ca2', '#3e5f86', '#6b8fb6', '#456a8a'], 0.75),
  win: swatch(['#7d9cbc', '#8eaac6', '#6f90b2'], 0.6),
};

/** ①平涂底稿：墙、地、窗外夜海和月亮。 */
function paintBase(g: CanvasCtx): void {
  g.fillStyle = BLUE.prus;
  g.fillRect(0, 0, W, FLOOR);
  const wg = g.createLinearGradient(0, 0, W, 0);
  wg.addColorStop(0, 'rgba(110,145,185,.35)');
  wg.addColorStop(0.6, 'rgba(0,0,0,0)');
  wg.addColorStop(1, 'rgba(5,10,25,.45)');
  g.fillStyle = wg;
  g.fillRect(0, 0, W, FLOOR);
  g.fillStyle = '#4a6c94';
  g.fillRect(0, FLOOR, W, H - FLOOR);
  const fg = g.createLinearGradient(0, FLOOR, 0, H);
  fg.addColorStop(0, 'rgba(10,20,40,.4)');
  fg.addColorStop(1, 'rgba(150,175,200,.25)');
  g.fillStyle = fg;
  g.fillRect(0, FLOOR, W, H - FLOOR);
  // 窗：夜海＋月（玻璃底 #7d9cbc 让笔触后拷回的框仍读得出玻璃厚度）
  g.fillStyle = '#7d9cbc';
  g.fillRect(WINDOW.view.x, WINDOW.view.y, WINDOW.view.w, WINDOW.view.h);
  const sk = g.createLinearGradient(0, 87, 0, 267);
  sk.addColorStop(0, '#1a2f58');
  sk.addColorStop(1, '#4f74a4');
  g.fillStyle = sk;
  g.fillRect(240, 87, 293, 180);
  g.fillStyle = '#16284c';
  g.fillRect(240, 267, 293, 100);
  g.fillStyle = '#c9d6e2';
  g.beginPath();
  g.arc(447, 147, 20, 0, 7);
  g.fill();
  g.fillStyle = '#7d9cbc';
  g.fillRect(381, 87, 11, 280);
  g.fillRect(240, 220, 293, 8);
  g.fillStyle = '#91aecb';
  g.fillRect(213, 373, 347, 16);
}

let baseC: HTMLCanvasElement | null = null;
/** 平涂底稿（钩子里笔触未扫到处露出的就是它）。 */
export function baseCanvas(): HTMLCanvasElement {
  if (!baseC) {
    baseC = makeCanvas();
    paintBase(baseC.getContext('2d')!);
  }
  return baseC;
}

let brushC: HTMLCanvasElement | null = null;
/** ②宽干笔整层：底稿 + 宽而干的横竖笔 + 糊 7px 叠 α0.8 + 干刷细丝 + 窗框拷回小笔触。 */
export function brushCanvas(): HTMLCanvasElement {
  if (brushC) return brushC;
  const cv = makeCanvas();
  const g = cv.getContext('2d')!;
  const b = makeCanvas(); // 无笔触拷贝（窗框还原用）
  paintBase(b.getContext('2d')!);
  g.drawImage(b, 0, 0);
  const winView = WINDOW.view;
  strokes(g, b, W, H, {
    // 宽而干：cell34/len110/w34（1920 基准）→ 1280×720 等比 2/3；cap 'butt' 锁死（圆头密排成「人头阵」是 36 号踩坑）
    cell: 23, len: 73, width: 23, seed: 12, cap: 'butt', jitterCol: 4,
    angle: (x, y) => (y > FLOOR ? 0.05 * (noise2(x * 0.013, y * 0.013) * 2 - 1) : -Math.PI / 2 + 0.5 * (noise2(x * 0.004, y * 0.004) * 2 - 1)),
    palette: (x, y, col: RGB, r) => (y > FLOOR ? SW.floor(col, r) : SW.wall(col, r)),
    mask: (x, y) => !(x > winView.x - 7 && x < winView.x + winView.w + 7 && y > 60 && y < 397) && Math.abs(y - FLOOR) > 13,
  });
  blurOverlay(g, cv, 7, 0.8);
  dryFilaments(g, W, H, FLOOR, 9, 260);
  // ④窗：原样拷回清楚的框，只给框上小笔触
  g.drawImage(b, 213, 66, 348, 331, 213, 66, 348, 331);
  g.save();
  g.beginPath();
  g.rect(213, 66, 348, 331);
  g.clip();
  strokes(g, b, W, H, {
    cell: 6, len: 13, width: 5, seed: 13, cap: 'butt', jitterCol: 8,
    angle: (x) => (x > 381 && x < 392 ? -Math.PI / 2 : 0.03),
    palette: (x, y, col: RGB, r) => SW.win(col, r),
    mask: (x, y) => !(x > 240 && x < 533 && y > 87 && y < 367) || (x > 381 && x < 392) || (y > 220 && y < 228),
  });
  g.restore();
  brushC = cv;
  return cv;
}

function paintTable(g: CanvasCtx): void {
  g.fillStyle = '#20406c';
  g.fillRect(TABLE.top.x, TABLE.top.y, TABLE.top.w, TABLE.top.h);
  g.fillStyle = '#16305a';
  g.fillRect(TABLE.apron.x, TABLE.apron.y, TABLE.apron.w, TABLE.apron.h);
  g.fillRect(TABLE.legL.x, TABLE.legL.y, TABLE.legL.w, TABLE.legL.h);
  g.fillRect(TABLE.legR.x, TABLE.legR.y, TABLE.legR.w, TABLE.legR.h);
  g.fillStyle = '#1a3460';
  g.fillRect(SHELF.a.x, SHELF.a.y, SHELF.a.w, SHELF.a.h);
  g.fillRect(SHELF.b.x, SHELF.b.y, SHELF.b.w, SHELF.b.h);
  for (let k = 0; k < 3; k++) g.fillRect(956, 347 + k * 47, 40, 8);
  // 桌上：一只水罐和一块面包碟（蓝色时期静物的穷与静）
  g.fillStyle = '#9fb6cc';
  g.beginPath();
  g.moveTo(587, 409);
  g.quadraticCurveTo(573, 373, 591, 353);
  g.lineTo(609, 353);
  g.quadraticCurveTo(627, 373, 613, 409);
  g.closePath();
  g.fill();
  g.fillStyle = '#6c7f8e';
  g.beginPath();
  g.ellipse(693, 403, 33, 9, 0, 0, 7);
  g.fill();
}

let tableC: HTMLCanvasElement | null = null;
/** ⑤桌层：单独一层 + 小笔触（画在笔触之后，不在笔触里挖洞）。 */
export function tableCanvas(): HTMLCanvasElement {
  if (tableC) return tableC;
  const cv = makeCanvas();
  const g = cv.getContext('2d')!;
  paintTable(g);
  g.save();
  g.globalCompositeOperation = 'source-atop';
  strokes(g, cv, W, H, {
    cell: 6, len: 17, width: 6, seed: 14, cap: 'butt', jitterCol: 10, alphaMask: true,
    angle: (x, y) => (y > 455 ? -Math.PI / 2 : 0.02),
    region: {x: 537, y: 313, w: 470, h: 300},
  });
  g.restore();
  tableC = cv;
  return cv;
}

let outlineC: HTMLCanvasElement | null = null;
/** ⑥环境轮廓：普鲁士蓝 5px，笃定不抖（蓝色时期的轮廓线不沸腾）。 */
export function outlineCanvas(): HTMLCanvasElement {
  if (outlineC) return outlineC;
  const cv = makeCanvas();
  const g = cv.getContext('2d')!;
  g.strokeStyle = BLUE.line;
  g.lineWidth = 5;
  g.lineJoin = 'round';
  const v = WINDOW.view;
  g.strokeRect(v.x, v.y, v.w, v.h);
  g.strokeRect(240, 87, 293, 280);
  g.strokeRect(TABLE.top.x, TABLE.top.y, TABLE.top.w, TABLE.top.h);
  g.strokeRect(TABLE.apron.x, TABLE.apron.y, TABLE.apron.w, TABLE.apron.h);
  g.strokeRect(TABLE.legL.x, TABLE.legL.y, TABLE.legL.w, TABLE.legL.h);
  g.strokeRect(TABLE.legR.x, TABLE.legR.y, TABLE.legR.w, TABLE.legR.h);
  g.beginPath();
  g.moveTo(0, FLOOR);
  g.lineTo(TABLE.top.x, FLOOR);
  g.moveTo(TABLE.top.x + TABLE.top.w, FLOOR);
  g.lineTo(W, FLOOR);
  g.stroke();
  g.beginPath();
  g.moveTo(587, 409);
  g.quadraticCurveTo(573, 373, 591, 353);
  g.lineTo(609, 353);
  g.quadraticCurveTo(627, 373, 613, 409);
  g.stroke();
  outlineC = cv;
  return cv;
}

let overlayC: HTMLCanvasElement | null = null;
/** 画布纹（细网格）＋冷暗角（整幅罩层，最后叠）。 */
export function overlayCanvas(): HTMLCanvasElement {
  if (overlayC) return overlayC;
  const cv = makeCanvas();
  const g = cv.getContext('2d')!;
  g.strokeStyle = 'rgba(10,20,40,.06)';
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
  const v = g.createRadialGradient(600, 347, 253, 640, 360, 767);
  v.addColorStop(0, 'rgba(5,10,25,0)');
  v.addColorStop(1, 'rgba(5,10,25,.6)');
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  overlayC = cv;
  return cv;
}

/** 调试用断言：色板 hex 全部解析（system boundary 校验）。 */
export function paletteSelfCheck(): boolean {
  return ['#132240', '#1d3866', '#2d5a94', '#4f719a', '#6b8fb6', '#b6c8d8', '#3b6878', '#0c1830'].every((h) => hex(h).length === 3);
}
