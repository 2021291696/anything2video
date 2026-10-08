import React from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

/**
 * hypnotic · 迷幻催眠视幻觉图元库（战役 4 批次⑤，RECON-pm-watch §2.7 monokern PHOSPHENE 手法参考）
 * 手法参考 prompt-motion monokern「PHOSPHENE」（手法研究、重写实现，零素材搬运）；正本源工程无——全新 Remotion(React+TSX) 实现。
 * 搭底：anything2video styles/neon 的辉光三层纪律（机制借鉴重写）；确定性调制原语替代 4 帧 flick——
 * 本卡安全纪律禁用快闪（>3Hz 大面积亮度翻转红线，光敏性癫痫防护），一切周期亮度调制 ≤0.3Hz（SPEC「闪烁合规」节）。
 * 签名纪律：①同心环恒速收缩（线性呼吸，忌 easeInOut 弹跳）②隧道透视恒速穿行 ③万花筒 8 折镜像对称
 * ④双层细环摩尔纹干涉（参数化防闪屏）⑤高饱和互补色对+暗底辉光 ⑥全片呼吸循环节奏。
 * 全部纯函数 of frame；seeded hash，禁 Math.random/Date/网络。
 */

// ---- 画布与锁死 token
export const W = 1280, H = 720, CX = 640, CY = 360, FPS = 30;
export const VOID = '#07030d', VOID2 = '#12081f';
export const MAG = '#FF3E9D', CYA = '#2EE6FF', AMB = '#FFB347', BLU = '#4D7CFF', VIO = '#9D5CFF', CORE = '#FFFFFF';
export const SERIF = '"Noto Serif SC"', SANS = '"Noto Sans SC"';

// ---- 节拍锚（帧）：与 research/beat-sheet.json 对齐（TOTAL=376，S 锚来自 timeline.ts）
export const T_SLIT = 1, T_LIDS = 5, T_FIRST_RING = 10;          // 钩子：f10 首环收缩（0.33s < 0.5s）
export const S01 = 31, S02 = 84, S03 = 150, S04 = 202, S05 = 283; // 句锚
export const T_DIVE = 150, T_HERO = 249, T_KMAX = 282;            // 隧道下潜 / HERO 万花筒展开（=BGM drop 8.3s）
export const T_FREEZE = 338, T_TITLE = 344, T_DIM = 372, TOTAL = 376;
/** 主呼吸周期：120f = 4.0s = 0.25Hz（全片恒定，相位连续可 seek；「越来越慢」由运动幅度/环间隔表达，不改呼吸周期） */
export const BREATH_P = 120;

// ---- 确定性数学
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const prog = (f: number, f0: number, d: number) => clamp((f - f0) / d);
export const frac = (x: number) => ((x % 1) + 1) % 1;
/** 三角波（线性往复）：恒速呼吸的原语—— hypnotic 纪律禁 easeInOut 弹跳 */
export const tri = (x: number) => { const p = frac(x); return p < 0.5 ? p * 2 : 2 - p * 2; };
/** 主呼吸方向 [-1,1]，线性往复 0.25Hz：+1=吸缩 -1=吐放（约定吸缩为 +） */
export const breathDir = (f: number) => tri(f / BREATH_P) * 2 - 1;
export const sstep = (a: number, b: number, x: number) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
export const E = { lin: (x: number) => x, outC: (x: number) => 1 - Math.pow(1 - x, 3) };
/** FNV-1a 族整数杂凑（机制与 neon/target-lock 同源，独立重写）→ [0,1) */
export function hash(...a: number[]): number {
  let h = 2166136261 >>> 0;
  for (const v of a) {
    h ^= (Math.round(v * 1024) * 2654435761) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
    h ^= h >>> 16;
  }
  return (h >>> 0) / 4294967296;
}

// ---- 字体（Noto Sans SC 字幕 / Noto Serif SC 片名，OFL，工程 public/fonts 副本）
export const LoadHypFonts: React.FC = () => {
  const [handle] = React.useState(() => delayRender('hyp-fonts'));
  React.useEffect(() => {
    const ff = (n: string, u: string, o: FontFaceDescriptors = {}) => new FontFace(n, `url(${staticFile(u)})`, o).load();
    Promise.all([
      ff('Noto Sans SC', 'fonts/NotoSansSC.ttf', {weight: '100 900'}),
      ff('Noto Serif SC', 'fonts/NotoSerifSC[wght].ttf', {weight: '100 900'}),
    ])
      .then((fs) => { fs.forEach((f) => (document.fonts as any).add(f)); continueRender(handle); })
      .catch(() => continueRender(handle));
  }, [handle]);
  return null;
};

// ---- 滤镜组（辉光三层纪律：宽晕 0.38 + 中晕 0.6 + 白芯源；soft 变体给填充面）
export const HypFilters: React.FC = () => (
  <svg width={0} height={0} style={{position: 'absolute'}} aria-hidden>
    <defs>
      <filter id="hyp-glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b1" />
        <feComponentTransfer in="b1" result="b1d"><feFuncA type="linear" slope="0.38" /></feComponentTransfer>
        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b2" />
        <feComponentTransfer in="b2" result="b2d"><feFuncA type="linear" slope="0.6" /></feComponentTransfer>
        <feMerge><feMergeNode in="b1d" /><feMergeNode in="b2d" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="hyp-soft" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="b1" />
        <feComponentTransfer in="b1" result="b1d"><feFuncA type="linear" slope="0.5" /></feComponentTransfer>
        <feMerge><feMergeNode in="b1d" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
  </svg>
);

/** 正八边形路径（隧道环用），r 外接圆半径，cx/cy 圆心，rot 旋转角（度） */
export const octPath = (r: number, rot = 0): string => {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = ((i * 45 + rot) * Math.PI) / 180;
    pts.push(`${(CX + r * Math.cos(a)).toFixed(1)},${(CY + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')} Z`;
};
