// 解析 smear 胶囊（解析 box-shutter 运动模糊的几何 + 渐变参数）。
// 技法借鉴 mg-styles-15 demos/08-morph index.html:604-611 (MIT, Vincentwei1021), TS 重写。
// 用途：快动作的「两端采样」解析模糊——shutter 开/闭两时刻各采样一次，本文件给出胶囊几何与
//      渐变停点；canvas/SVG/DOM 任一侧按此组装即可，不靠渲染器逐帧累积（无 onion-skin）。
// 纯函数、零依赖（无 React / DOM / 随机源；不做任何绘制，绘制由消费侧完成）。

export interface SmearCapGeom {
  /** 位移过小（L < 1.5px）：画半径 r 的圆盘即可（渐变无意义，源码同阈值） */
  degenerate: boolean;
  /** 胶囊两端圆心（shutter 开/闭两时刻的采样位置） */
  a: readonly [number, number];
  b: readonly [number, number];
  /** 采样位移长度；degenerate 时 ux/uy = (1,0) */
  L: number;
  /** 单位轴（a→b） */
  ux: number;
  uy: number;
  /** 圆盘半径与胶囊总跨度 T = L + 2r */
  r: number;
  T: number;
  /** 渐变几何：linear-gradient/linearGradient 的起终点（mx ∓ ux·T/2, my ∓ uy·T/2） */
  gx0: number;
  gy0: number;
  gx1: number;
  gy1: number;
  /** 平台 alpha = min(1, 2r/L)：胶囊中段不透明度（degenerate 时 1） */
  am: number;
  /** 渐变 ramp 段占比 o1 = min(2r, L)/T（停点 0→透明、o1→am、1-o1→am、1→透明） */
  o1: number;
  /** 轴角（rad，atan2(dy,dx)） */
  ang: number;
}

/** 由运动两端采样点与圆盘半径求 smear 胶囊的完整几何/渐变参数（源 08 smearCap 的数学抽取）。 */
export function smearCap(pax: number, pay: number, pbx: number, pby: number, r: number): SmearCapGeom {
  const dx = pbx - pax;
  const dy = pby - pay;
  const L = Math.hypot(dx, dy);
  const mx = (pax + pbx) / 2;
  const my = (pay + pby) / 2;
  if (L < 1.5) {
    return {degenerate: true, a: [pax, pay], b: [pbx, pby], L, ux: 1, uy: 0, r, T: 2 * r, gx0: mx, gy0: my, gx1: mx, gy1: my, am: 1, o1: 0, ang: 0};
  }
  const ux = dx / L;
  const uy = dy / L;
  const T = L + 2 * r;
  const am = Math.min(1, (2 * r) / L);
  const o1 = Math.min(2 * r, L) / T;
  return {
    degenerate: false,
    a: [pax, pay],
    b: [pbx, pby],
    L,
    ux,
    uy,
    r,
    T,
    gx0: mx - (ux * T) / 2,
    gy0: my - (uy * T) / 2,
    gx1: mx + (ux * T) / 2,
    gy1: my + (uy * T) / 2,
    am,
    o1,
    ang: Math.atan2(dy, dx),
  };
}

export type SmearStop = [offset: number, color: string];

/** 按 smear 几何生成四停渐变色标（0→透明，o1→am，1-o1→am，1→透明；与 canvas addColorStop 序列一致）。
 *  rgb 传 0-255 三元组。消费侧用 gx0/gy0→gx1/gy1 作渐变轴。 */
export function smearStops(g: SmearCapGeom, rgb: readonly [number, number, number]): SmearStop[] {
  const [R, G, B] = rgb;
  const cs = (a: number) => `rgba(${R},${G},${B},${a})`;
  return [
    [0, cs(0)],
    [g.o1, cs(g.am)],
    [1 - g.o1, cs(g.am)],
    [1, cs(0)],
  ];
}
