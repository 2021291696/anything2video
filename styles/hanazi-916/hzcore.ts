// hanazi-916 v4.0 opt-in 纯函数核（无 JSX / 无 remotion 依赖，可独立 node 单测）。
// 技法借鉴 mg-styles-15 demos/18-hanazi (MIT, Vincentwei1021), TSX 重写；登记见 SPEC「v4.0 opt-in」节。
// 红线：全部 opt-in——不传新 prop 时 HuaZi 层栈与旧行为逐值一致。

export const HZ_FPS = 30;

/** HuaZi 单字层描述（kit.tsx 按 id 顺序渲染 <text>）。fill 支持 '#grad:fill' / '#grad:gloss' / '#grad:glossP' 符号引用。 */
export type HuaZiLayer = {
  id: 'ext0' | 'ext1' | 'deep' | 'outer' | 'white' | 'fill' | 'gloss';
  dy: number; // text y 偏移 px
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
};

/**
 * HuaZi 层栈构造（下→上）：ext 双层挤出 → 深色挤出投影 → 彩色外描边 → 粗白描边 → 渐变填充 → 顶部高光。
 * - ext：双层挤出（dy=ext 与 ext/2，同色 stroke 宽同外描边——源码 HZ() 的 sp.ext 两遍画法）；extColor 缺省=deep。
 * - gloss：源码式顶部垂直渐变白（顶 gloss→0@46%→0），传数值启用；不传=旧行为（固定 0.85→0@42% 渐变 × 0.5 透明度层）。
 * 不传 ext/gloss 时返回值与旧版 kit 硬编码五层逐值相等（单测钉死）。
 */
export const huaZiCharLayers = (cfg: {
  size: number;
  ww: number;
  ow: number;
  deep: string;
  outer: string;
  ext?: number;
  extColor?: string;
  gloss?: number;
}): HuaZiLayer[] => {
  const W2 = 2 * (cfg.ww + cfg.ow);
  const layers: HuaZiLayer[] = [];
  if (cfg.ext !== undefined && cfg.ext > 0) {
    const ec = cfg.extColor ?? cfg.deep;
    layers.push({id: 'ext0', dy: cfg.ext, fill: ec, stroke: ec, strokeWidth: W2});
    layers.push({id: 'ext1', dy: cfg.ext * 0.5, fill: ec, stroke: ec, strokeWidth: W2});
  }
  layers.push({id: 'deep', dy: cfg.size * 0.09, fill: cfg.deep, stroke: cfg.deep, strokeWidth: W2});
  layers.push({id: 'outer', dy: 0, fill: cfg.outer, stroke: cfg.outer, strokeWidth: W2});
  layers.push({id: 'white', dy: 0, fill: '#FFFFFF', stroke: '#FFFFFF', strokeWidth: 2 * cfg.ww});
  layers.push({id: 'fill', dy: 0, fill: '#grad:fill'});
  if (cfg.gloss !== undefined && cfg.gloss > 0) {
    layers.push({id: 'gloss', dy: 0, fill: '#grad:glossP'});
  } else {
    layers.push({id: 'gloss', dy: 0, fill: '#grad:gloss', opacity: 0.5});
  }
  return layers;
};

/**
 * 节拍驱动 squash-and-hop 波（帧制，全局帧 N；beats 为全局帧时刻表）。
 * 每 beat 每字错 2 帧（charIndex×2f，源码 i*2*FR）：预备蹲 0.07s（压扁 +0.11 线性爬升）→
 * 抛物线跳 40px（air 0.24s，峰值 k=0.5）+ 飞行拉伸 −0.07·sin(πk)（前 0.05s 释放预备压扁）→
 * 落地指数回弹 0.13·e^(−3w)·cos(7.5w)（0.16s）。
 * 返回 hy（向上为正，调用方 y 减去）与 sq（压扁量：sx=1+sq、sy=1−sq；y 需补 +(size/2)·sq 做脚底锚定）。
 */
export const beatHopWave = (N: number, beats: number[], charIndex: number, fps = HZ_FPS): {hy: number; sq: number} => {
  let hy = 0;
  let sq = 0;
  for (const b of beats) {
    // 帧域整数运算后一次除法：保证「每字错 2 帧」是位移精确不变量（hop(i, N) === hop(0, N-2i)）
    const u = (N - b - charIndex * 2) / fps;
    const air = 0.24;
    if (u > -0.07 && u < 0) {
      sq += 0.11 * (u + 0.07) / 0.07;
    } else if (u >= 0 && u < air) {
      const k = u / air;
      hy += 40 * 4 * k * (1 - k);
      sq += (k < 0.15 ? 0.11 * (1 - k / 0.15) : 0) - 0.07 * Math.sin(Math.PI * k);
    } else if (u >= air && u < air + 0.16) {
      const w = (u - air) / 0.16;
      sq += 0.13 * Math.exp(-w * 3) * Math.cos(w * 7.5);
    }
  }
  return {hy, sq};
};
