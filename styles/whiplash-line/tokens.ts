// ============================================================================
// tokens.ts — whiplash-line 共享 token：锁死色板 / 场景几何 / 编舞时间轴
// 慕夏新艺术（战役 4 批次④ D2-2）。技法借鉴 huashu-art-motion（MIT），Remotion/TSX 重写。
// 全部显影进度为绝对帧的纯函数；时间项 t=f/FPS。确定性纪律见 prims.ts。
// ============================================================================
import {FPS} from '../common';
import {clamp01, inv, outC, inOutC, outBack, lerp, type Pt, spiralPts} from './prims';

export const TAU = Math.PI * 2;
export const t2 = (f: number) => f / FPS;

// ---- 锁死 token（SPEC 同步）----
export const PAL = {
  paper: '#efe6cf', line: '#4e3320', gold: '#c9a24a', goldD: '#9c7a2e',
  green: '#b9cba0', green2: '#cfd3a6', peach: '#ecc9a2',
  dot: 'rgba(120,140,100,.38)', banner: '#8fac80', cream: '#f6eedb',
  poppy: '#d9706a', poppyHi: '#df7d74', poppyD: '#b4504b', stemG: '#5f8a58', leaf: '#8fb38a', leafD: '#5f8a58',
  lily: '#f7f2e6',
  hair: '#e2b54c', hairLock: '#e8bf55', hairHi: '#f6dc8a', hairDk: '#b9862a',
  skin: '#f6dcc4', dress: '#f4ecda', shawl: '#e6aaa5', shawlD: '#d48e8c', lip: '#c8505a',
  cat: '#e39a4c', catW: '#fbf3e3', catStripe: '#c0672c', earIn: '#eaa0a0',
  haloPink: '#ebb8b2', haloTeal: '#5f9a8a', haloRed: '#b8473a', petal: '#e3a5a0', petalHi: '#efc4be',
  sun1: '#f8c860', sun2: '#e8a43c', sunHalo: '#f7e2a0', steamEdge: '#8a6a4a',
} as const;
export const TILE_COLS = ['#f1ead6', '#8fb08a', '#c9a24a', '#f1ead6', '#a9c39a', '#d98c8c', '#c9a24a', '#f1ead6', '#6f9a80'];
export const GLASS_COLS = ['#3f7fa0', '#e0b040', '#6fb0a0', '#e9e0c4', '#3f7fa0', '#d9a03a'];

// ---- 场景几何（1280×720）----
export const WIN = {x0: 242, x1: 642, base: 428, cx: 442, cy: 150, rx: 200, ry: 108}; // 拱形窗
export const HALO_G: [number, number, number] = [930, 294, 112];  // 少女光环
export const HALO_C: [number, number, number] = [258, 516, 50];   // 猫光环（趴卧：罩在头上方）
export const HEAD: [number, number] = [930, 300];                  // 少女头心
export const FRAME_R = {x0: 16, y0: 14, x1: 1264, y1: 706};        // 金框（鞭线终章）
export const STEM_CURL: Pt[] = spiralPts(148, 234, 15, -0.6, 1.2, 1, 24); // 茎顶/窗顶螺旋饰共用

// ---- 编舞：各元素显影进度（绝对帧驱动，全纯函数）----
export const CHOREO = {
  stem: (f: number) => f < 2 ? 0 : f < 10 ? 0.45 * outC(inv(2, 9, f)) : f < 31 ? 0.45 : f < 58 ? 0.45 + 0.55 * outC(inv(31, 58, f)) : 1,
  curl: (f: number) => outC(inv(52, 62, f)),
  poppy: (f: number) => outBack(inv(60, 74, f)),
  branch: (f: number) => outC(inv(82, 88, f)),
  arch: (f: number) => outC(inv(84, 108, f)),
  finial: (f: number) => outC(inv(106, 116, f)),
  interior: (f: number) => outC(inv(86, 98, f)),
  glass: (f: number) => outC(inv(92, 104, f)),
  sun: (f: number) => inOutC(inv(102, 160, f)),
  rays: (f: number) => outC(inv(106, 134, f)),
  label: (i: number, f: number) => {
    const at = [112, 136, 158][i];
    return at === undefined ? 0 : outBack(inv(at, at + 7, f)) * (1 - outC(inv(266, 274, f)));
  },
  lily: (f: number) => outC(inv(188, 206, f)),
  vine: (f: number) => outC(inv(183, 207, f)),
  cat: (f: number) => outC(inv(190, 204, f)),
  catHalo: (f: number) => outBack(inv(208, 216, f)),
  hairMass: (f: number) => outC(inv(208, 220, f)),
  lock: (i: number, f: number) => outC(inv(210 + i * 3, 222 + i * 3, f)),
  girl: (f: number) => outC(inv(214, 230, f)),
  frontLock: (f: number) => outC(inv(230, 244, f)),
  crown: (f: number) => outC(inv(236, 246, f)),
  wreath: (f: number) => outC(inv(240, 250, f)),
  haloG: (f: number) => outBack(inv(242, 250, f)),
  cup: (f: number) => inOutC(inv(242, 258, f)),
  steam: (f: number) => outC(inv(252, 264, f)),
  frame: (f: number) => outC(inv(275, 310, f)),
  rosette: (f: number) => outBack(inv(306, 314, f)),
};

// 重导出常用缓动（chars.ts/world.ts 就近取用）
export {clamp01, inv, outC, inOutC, outBack, lerp};
