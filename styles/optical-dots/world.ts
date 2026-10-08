// ============================================================================
// world.ts — 《颜色的算术》四幕底稿（烘焙输入）：微距画布 / 算术演示板 / 大碗岛夏天 / 紫光版
// 全部矢量 canvas 绘制（烘焙期一次性执行），点彩渲染器采样底稿取配对色。
// 母题：大碗岛的夏天——撑伞女士侧影＋裙撑、塞纳河白帆船、伞树、修拉自画深蓝点彩边框。
// 确定性：绘制只依赖入参 t（烘焙冻结 t=0），无随机、无时钟。
// ============================================================================
import {W, H} from '../common';

export const TAU = Math.PI * 2;
/** 修拉自画的点彩边框（深蓝带，过点彩渲染——带里会出橙色补色点）。 */
export const BORDER = 28;
/** SC01 微距画布：红|蓝边界带（shimmer 区＝「颜色自己混合」的颤动带）。 */
export const S1_BAND: readonly [number, number] = [588, 692];
export const inS1Band = (x: number, y: number) => x >= S1_BAND[0] && x <= S1_BAND[1] && y >= 0 && y <= H;
/** SC02 演示板几何（runtime 标注 / 转场共用）。 */
export const S2_TARGET = {x: 96, y: 216, w: 300, h: 190}; // 目标色·紫
export const S2_MOSAIC = {x: 460, y: 216, w: 730, h: 410}; // 红蓝镶嵌大点区（点彩遮罩外）
export const inS2Mosaic = (x: number, y: number) =>
  x >= S2_MOSAIC.x && x <= S2_MOSAIC.x + S2_MOSAIC.w && y >= S2_MOSAIC.y && y <= S2_MOSAIC.y + S2_MOSAIC.h;
/** SC03 塞纳河带（shimmer 区＝波光）。 */
export const RIVER = {top: 300, bottom: 402};
export const inS3River = (x: number, y: number) =>
  y >= RIVER.top && y <= RIVER.bottom && x >= BORDER && x <= W - BORDER;
/** SC03/04 撑伞女士锚点。 */
export const LADY: readonly [number, number] = [648, 560];

// ---- 共用小件 ----
const linen = (g: CanvasRenderingContext2D, ground: string) => {
  g.fillStyle = ground;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(120,96,60,0.05)';
  g.lineWidth = 1;
  for (let y = 0; y < H; y += 4) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }
};

// ---- SC01 底稿：微距画布（左红右蓝，中间湿画布带）----
export const drawS1 = (g: CanvasRenderingContext2D): void => {
  linen(g, '#eee0c2');
  // 红区（左）／蓝区（右）：边缘用多段轻微锯齿（画布上色块的有机边）
  const field = (x0: number, x1: number, col: string, seed: number) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(x0, 0);
    for (let y = 0; y <= H; y += 40) {
      const wob = Math.sin(y * 0.05 + seed) * 10 + Math.sin(y * 0.013 + seed * 2) * 16;
      g.lineTo(x1 + wob, y);
    }
    g.lineTo(x0, H);
    g.closePath();
    g.fill();
  };
  field(-40, 560, '#e0432a', 1.7); // 左红场（内缘 ~560±26）
  field(W + 40, 720, '#2a3a9a', 4.2); // 右蓝场（内缘 ~720±26）
  // 湿画布带：中间条 + 微微更深（未干的亚麻底）
  const bg = g.createLinearGradient(S1_BAND[0], 0, S1_BAND[1], 0);
  bg.addColorStop(0, 'rgba(238,224,194,0)');
  bg.addColorStop(0.5, 'rgba(214,196,158,0.55)');
  bg.addColorStop(1, 'rgba(238,224,194,0)');
  g.fillStyle = bg;
  g.fillRect(S1_BAND[0] - 40, 0, (S1_BAND[1] - S1_BAND[0]) + 80, H);
  // 已点上的先导点：边界带两侧各一列半成品（让「正被点上去」可读）
  for (let y = 26; y < H; y += 44) {
    g.fillStyle = '#e0432a';
    g.beginPath();
    g.arc(606 + Math.sin(y * 0.11) * 7, y, 4.5, 0, TAU);
    g.fill();
    g.fillStyle = '#2a3a9a';
    g.beginPath();
    g.arc(672 + Math.sin(y * 0.13 + 2) * 7, y + 20, 4.5, 0, TAU);
    g.fill();
  }
};

// ---- SC02 底稿：算术演示板（21 色板条 + 目标紫 + 红蓝镶嵌大点区）----
export const drawS2 = (g: CanvasRenderingContext2D, palette: readonly string[]): void => {
  linen(g, '#f6ecd8');
  // 21 色板条：衬一条墨色带（淡色七格在奶白底上会没掉），每格 52×64 圆角块——过点彩渲染：
  // 纯色格在算法下也会配出近纯解（远配对惩罚项），本身就是「算法作用于纯色」的演示
  const sw = 52;
  const gap = 2;
  const x0 = (W - (palette.length * (sw + gap) - gap)) / 2;
  g.fillStyle = 'rgba(40,44,100,0.16)';
  g.beginPath();
  g.roundRect(x0 - 16, 40, palette.length * (sw + gap) - gap + 32, 88, 14);
  g.fill();
  palette.forEach((c, i) => {
    const x = x0 + i * (sw + gap);
    g.fillStyle = c;
    g.beginPath();
    g.roundRect(x, 52, sw, 64, 9);
    g.fill();
  });
  // 目标色·紫（大圆角色块）
  g.fillStyle = '#7a4aa8';
  g.beginPath();
  g.roundRect(S2_TARGET.x, S2_TARGET.y, S2_TARGET.w, S2_TARGET.h, 22);
  g.fill();
  // 目标色边上的浅紫投影块（层次）
  g.fillStyle = 'rgba(154,122,200,0.5)';
  g.beginPath();
  g.roundRect(S2_TARGET.x + 18, S2_TARGET.y + S2_TARGET.h + 14, S2_TARGET.w - 36, 26, 10);
  g.fill();
  // 演示板细描边框（墨线，画在「纸」上）
  g.strokeStyle = 'rgba(40,44,100,0.5)';
  g.lineWidth = 3;
  g.strokeRect(S2_MOSAIC.x - 14, S2_MOSAIC.y - 14, S2_MOSAIC.w + 28, S2_MOSAIC.h + 28);
  drawS2Mosaic(g);
};

/** 红蓝镶嵌大点（六角 pitch 27 r 11.2 棋盘）——点彩遮罩外保留原样＝微距「红点挨着蓝点」本体。
 *  底稿画一遍（供采样/转场读色），烘焙时在 blur 打底与点彩之后**再描一遍**（点列 crisp 不被虚化）。 */
export const drawS2Mosaic = (g: CanvasRenderingContext2D): void => {
  const pitch = 27;
  const rowh = pitch * 0.866;
  for (let j = 0, y = S2_MOSAIC.y + pitch / 2; y < S2_MOSAIC.y + S2_MOSAIC.h + pitch; j++, y += rowh) {
    for (let i = 0, x = S2_MOSAIC.x + (j % 2) * (pitch / 2); x < S2_MOSAIC.x + S2_MOSAIC.w + pitch; i++, x += pitch) {
      g.fillStyle = (i + j) % 2 === 0 ? '#e0432a' : '#2a3a9a';
      g.beginPath();
      g.arc(x, y, 11.2, 0, TAU);
      g.fill();
    }
  }
};

// ---- SC03 底稿：大碗岛的夏天（撑伞女士 + 塞纳河白帆 + 伞树 + 修拉边框）----
export const drawS3 = (g: CanvasRenderingContext2D): void => {
  // 天空：暖奶黄（左暖右微冷）
  const sky = g.createLinearGradient(0, 0, W, 0);
  sky.addColorStop(0, '#f4e6b6');
  sky.addColorStop(0.7, '#efdfb2');
  sky.addColorStop(1, '#dccfbc');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, RIVER.top);
  // 薄云
  g.fillStyle = '#f8f0d8';
  [[300, 90, 150, 26], [720, 60, 190, 22], [1020, 130, 150, 24]].forEach(([cx, cy, rx, ry]) => {
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    g.fill();
  });
  // 左侧大伞树（树冠椭圆簇 + 树干）
  const canopy = (cx: number, cy: number, R: number, tones: string[]) => {
    tones.forEach((c, i) => {
      const a = i * 2.4;
      g.fillStyle = c;
      g.beginPath();
      g.ellipse(cx + Math.cos(a) * R * 0.42, cy + Math.sin(a) * R * 0.3, R * (0.5 + 0.14 * (i % 3)), R * (0.42 + 0.1 * ((i + 1) % 3)), a * 0.3, 0, TAU);
      g.fill();
    });
  };
  g.fillStyle = '#4a3a3a';
  g.fillRect(186, 210, 26, 330); // 左树干
  canopy(200, 168, 190, ['#1f5a3a', '#2f6a4a', '#27603f', '#356f4c', '#2a6244', '#3a7250']);
  g.fillStyle = '#4a3a3a';
  g.fillRect(1108, 190, 22, 260); // 右树干
  canopy(1120, 158, 150, ['#1f5a3a', '#2f6a4a', '#27603f', '#356f4c', '#2a6244']);
  // 对岸绿带 + 塞纳河
  g.fillStyle = '#3f7a4a';
  g.fillRect(BORDER, 288, W - BORDER * 2, RIVER.top - 288 + 6);
  const river = g.createLinearGradient(0, RIVER.top, 0, RIVER.bottom);
  river.addColorStop(0, '#3d6fc0');
  river.addColorStop(1, '#5a8fd0');
  g.fillStyle = river;
  g.fillRect(0, RIVER.top, W, RIVER.bottom - RIVER.top);
  // 白帆船（静止在河面；波光交给 shimmer 态）
  g.fillStyle = '#f8f4e8';
  g.beginPath();
  g.moveTo(436, 360);
  g.lineTo(436, 292);
  g.lineTo(476, 354);
  g.closePath();
  g.fill();
  g.fillStyle = '#7a4a3a';
  g.fillRect(412, 360, 60, 10);
  g.fillStyle = 'rgba(30,42,90,0.35)';
  g.beginPath();
  g.ellipse(444, 376, 38, 5, 0, 0, TAU);
  g.fill();
  // 草地：阳光黄绿（右上更亮）+ 树荫（左下与树底）
  const lawn = g.createLinearGradient(0, RIVER.bottom, 0, H);
  lawn.addColorStop(0, '#b8c84a');
  lawn.addColorStop(1, '#a8bc42');
  g.fillStyle = lawn;
  g.fillRect(0, RIVER.bottom, W, H - RIVER.bottom);
  g.fillStyle = '#c8d458';
  g.beginPath();
  g.ellipse(880, 470, 330, 70, 0, 0, TAU);
  g.fill();
  g.fillStyle = '#46625a'; // 树荫（冷灰绿——修拉的阴影偏紫，暖褐会读成红土）
  g.beginPath();
  g.ellipse(240, 626, 280, 76, 0, 0, TAU);
  g.fill();
  g.beginPath();
  g.ellipse(1124, 468, 170, 42, 0, 0, TAU);
  g.fill();
  // 撑伞女士侧影（裙撑 + 高领 + 橙阳伞）+ 脚边小猴 —— 大碗岛标志母题（×1.6 放大保主体可读）
  const [lx, ly] = LADY;
  g.save();
  g.translate(lx, ly);
  g.scale(1.6, 1.6);
  g.translate(-lx, -ly);
  g.fillStyle = 'rgba(40,44,90,0.4)'; // 影
  g.beginPath();
  g.ellipse(lx + 6, ly + 8, 56, 12, 0, 0, TAU);
  g.fill();
  g.fillStyle = '#23244a'; // 裙 + 腰后裙撑
  g.beginPath();
  g.moveTo(lx - 16, ly);
  g.lineTo(lx - 13, ly - 96);
  g.quadraticCurveTo(lx + 22, ly - 86, lx + 28, ly - 44);
  g.quadraticCurveTo(lx + 46, ly - 14, lx + 34, ly);
  g.closePath();
  g.fill();
  g.beginPath(); // 头颈
  g.ellipse(lx - 8, ly - 112, 11, 15, 0, 0, TAU);
  g.fill();
  g.fillRect(lx - 17, ly - 102, 17, 16);
  g.strokeStyle = '#23244a'; // 撑杆
  g.lineWidth = 3.5;
  g.beginPath();
  g.moveTo(lx - 6, ly - 96);
  g.lineTo(lx + 4, ly - 148);
  g.stroke();
  g.fillStyle = '#c8603a'; // 阳伞（橙）
  g.beginPath();
  g.ellipse(lx + 6, ly - 152, 40, 15, -0.12, Math.PI, TAU);
  g.fill();
  g.fillStyle = '#4a3a3a'; // 小猴
  g.beginPath();
  g.ellipse(lx - 52, ly - 4, 13, 9, 0, 0, TAU);
  g.fill();
  g.beginPath();
  g.arc(lx - 63, ly - 10, 6, 0, TAU);
  g.fill();
  g.strokeStyle = '#4a3a3a';
  g.lineWidth = 3;
  g.beginPath(); // 尾
  g.moveTo(lx - 41, ly - 4);
  g.quadraticCurveTo(lx - 28, ly - 24, lx - 38, ly - 34);
  g.stroke();
  g.restore();
  // 修拉边框（最后盖四边，过点彩渲染）
  g.fillStyle = '#1e2a78';
  g.fillRect(0, 0, W, BORDER);
  g.fillRect(0, H - BORDER, W, BORDER);
  g.fillRect(0, 0, BORDER, H);
  g.fillRect(W - BORDER, 0, BORDER, H);
};

export const SCENES = ['s1', 's2', 's3', 's4'] as const;
export type SceneId = (typeof SCENES)[number];
