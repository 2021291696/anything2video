import React from 'react';
import {AbsoluteFill} from 'remotion';
import {cubicBezier, clamp01} from '../common/easing';

// ============================================================================
// paperclip-sticker 图元库（贴纸人科普 · 轴 D 样片 s34-paperclip 正本）
// 风格句：蓝灰米白冷静底 + 主体贴纸化粗白描边 + 扁平图标与精确数据图表 + 超宽大画布摄像机平移。
// 层结构参考 _oss/mg-styles-15/demos/19-paperclip（只借参数与机制：cam 关键帧/log-z 插值/slap 贴纸拍落），
// 全部图形为纯代码绘制，无外部素材。坐标：world px；画布 1280×720@30。
// v4.0：fly/pull 段换 van Wijk interpolateZoom 曲线飞行——
//   // van Wijk 曲线飞行（zoomFly）：技法借鉴 mg-styles-15 demos/19-paperclip (MIT, Vincentwei1021) index.html:80-88 的 d3.interpolateZoom 用法，纯数学 TS 重写、零 d3 依赖
// ============================================================================

/** 锁死色板：米白蓝灰系 + 墨色 + 唯一强调橙（只给重点） */
export const PC = {
  bg: '#e9eef2', // 幕底（冷静蓝灰米白）
  bgDeep: '#dfe6ec', // 幕底深端（大画布边缘微沉淀）
  ink: '#25313d', // 墨色主文字/主体
  mid: '#8c9aa8', // 次级
  faint: '#5e6d7b', // 弱注
  card: '#f7f9fb', // 贴纸纸面白
  line: '#cdd6de', // 细边
  dot: '#c9d3dc', // 点阵
  accent: '#ff5a36', // 唯一强调（重点数据/标记）
} as const;

/** 画布（超宽大画布：≥2400px 宽，内容铺满，摄像机层在其上平移/缩放一镜串多信息点） */
export const WW = 2800;
export const WH = 2760;

/** 贴纸化参数：粗白描边（2×OW，OW=单边描边宽）+ 软阴影 */
export const STK = {
  paper: PC.card,
  owMain: 11, // 主体检材单边白边（描边总宽 22 ≈ 8-12px 档）
  owSmall: 7, // 小图标单边白边（总宽 14）
  shadow: (lift: number) =>
    `drop-shadow(0 ${(3 + 13 * lift).toFixed(1)}px ${(6 + 18 * lift).toFixed(1)}px rgba(22,34,46,${(0.14 + 0.14 * lift).toFixed(3)}))`,
};

// ---- 缓动 / 动画原语（纯函数，帧驱动） ----
export const wobble = (dt: number, f = 4.5, k = 11) => (dt < 0 ? 0 : Math.exp(-k * dt) * Math.cos(2 * Math.PI * f * dt));
export const popOver = (u: number, s = 1.7) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2)); // easeOutBack
export const easeOutCubic = (u: number) => 1 - Math.pow(1 - clamp01(u), 3);

export type Slap = {o: number; s: number; r: number; lift: number};
/** 贴纸拍落（机制借自 19-paperclip demo 的 slap）：预拍悬置 → 落地触地 → 欠阻尼回弹稳帖 */
export const slap = (t: number, land: number, dur = 0.2, amp = 0.3): Slap => {
  const p = (t - (land - dur)) / dur;
  if (p < 0) return {o: 0, s: 1 + amp, r: 6, lift: 1};
  if (p < 1) {
    const L = 1 - p * p;
    return {o: clamp01(p * 5), s: 1 + amp * L, r: 6 * L, lift: L};
  }
  const w = wobble(t - land, 4.5, 10);
  return {o: 1, s: 1 - 0.035 * w, r: -0.8 * w, lift: 0};
};
export const slapStyle = (sl: Slap, cx: number, cy: number, baseR = 0): React.CSSProperties => ({
  position: 'absolute',
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  opacity: sl.o,
  transform: `translate(${cx}px, ${cy}px) rotate(${(baseR + sl.r).toFixed(3)}deg) scale(${sl.s.toFixed(4)})`,
  transformOrigin: '0 0',
  filter: STK.shadow(sl.lift),
});

// ---- 摄像机层（借 19-paperclip 的 cam 关键帧机制；v4.0：fly/pull 段换 van Wijk 曲线飞行，drift/hold 保持线性 + log-z） ----
export type CamKey = {t: number; x: number; y: number; z: number; r?: number; move?: 'drift' | 'fly' | 'pull' | 'hold'};
export const CAM_EASE = {
  drift: cubicBezier(0.45, 0, 0.55, 1),
  fly: cubicBezier(0.62, 0, 0.22, 1), // 长曲线 ease：大位移信息站之间的主干移动
  pull: cubicBezier(0.42, 0, 0.22, 1), // 收束拉远
  hold: cubicBezier(0.4, 0, 0.6, 1),
};

// van Wijk 曲线飞行（技法借鉴 mg-styles-15 demos/19-paperclip index.html:80-88 d3.interpolateZoom rho 0.85/1.25，纯数学 TS 重写、零 d3 依赖）
/** 视口 [cx, cy, w]：w=屏宽对应的世界 px 宽（= SCREEN_W / z）。 */
export type ZoomView = [number, number, number];
/** 屏宽基准（世界 px 可视宽 = SCREEN_W / z，与 CamStage 的 scale(z) 严格互逆）。 */
export const SCREEN_W = 1280;
const cs = (x: number) => { const e = Math.exp(x); return (e + 1 / e) / 2; };
const sn = (x: number) => { const e = Math.exp(x); return (e - 1 / e) / 2; };
const asinh = (x: number) => Math.log(x + Math.sqrt(x * x + 1));
/**
 * zoom-pan 曲线航迹：视口 v0→v1 之间「放大-飞越-缩小」（放大倍率随行程自洽）。
 * rho=曲率（小=弯得更高更飘），t∈[0,1] 处处过 v0/v1（u(t) 单调、宽度不低于两端较小者）。
 */
export const zoomFly = (v0: ZoomView, v1: ZoomView, t: number, rho = 0.85): ZoomView => {
  const r = Math.max(rho, 1e-3), r2 = r * r, r4 = r2 * r2;
  const [x0, y0, w0] = v0, [x1, y1, w1] = v1;
  const dx = x1 - x0, dy = y1 - y0, d2 = dx * dx + dy * dy;
  if (d2 < 1e-12) { // 近同心：纯缩放（log 直线）
    const S = Math.log(w1 / w0) / r;
    return [x0 + t * dx, y0 + t * dy, w0 * Math.exp(r * t * S)];
  }
  const d = Math.sqrt(d2);
  const b0 = (w1 * w1 - w0 * w0 + r4 * d2) / (2 * w0 * r2 * d);
  const b1 = (w1 * w1 - w0 * w0 - r4 * d2) / (2 * w1 * r2 * d);
  const q0 = -asinh(b0), q1 = -asinh(b1);
  const S = (q1 - q0) / r;
  const s = t * S, c0 = cs(q0);
  const u = (w0 / (r2 * d)) * (c0 * Math.tanh(r * s + q0) - sn(q0)); // 沿直线已行进的比例（0→1 单调）
  return [x0 + u * dx, y0 + u * dy, (w0 * c0) / cs(r * s + q0)];
};

export const camAt = (cam: CamKey[], t: number): {x: number; y: number; z: number; r: number} => {
  const first = cam[0];
  if (t <= first.t) return {x: first.x, y: first.y, z: first.z, r: first.r ?? 0};
  for (let i = 1; i < cam.length; i++) {
    const a = cam[i - 1];
    const b = cam[i];
    if (t <= b.t) {
      const u = (t - a.t) / (b.t - a.t);
      const e = (CAM_EASE[b.move ?? 'drift'] ?? CAM_EASE.drift)(clamp01(u));
      const r = (a.r ?? 0) + ((b.r ?? 0) - (a.r ?? 0)) * e;
      if (b.move === 'fly' || b.move === 'pull') { // 曲线航迹段（rho 照抄源码：fly 0.85 / pull 1.25）
        const rho = b.move === 'pull' ? 1.25 : 0.85;
        const v = zoomFly([a.x, a.y, SCREEN_W / a.z], [b.x, b.y, SCREEN_W / b.z], e, rho);
        return {x: v[0], y: v[1], z: SCREEN_W / v[2], r};
      }
      return {
        x: a.x + (b.x - a.x) * e,
        y: a.y + (b.y - a.y) * e,
        z: Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * e),
        r,
      };
    }
  }
  const last = cam[cam.length - 1];
  return {x: last.x, y: last.y, z: last.z, r: last.r ?? 0};
};
/** 摄像机舞台：world div 整体变换 translate(640,360)∘rotate∘scale(z)∘translate(-cx,-cy)——世界点 c 落到屏中心 */
export const CamStage: React.FC<{t: number; cam: CamKey[]; children: React.ReactNode}> = ({t, cam, children}) => {
  const c = camAt(cam, t);
  return (
    <AbsoluteFill style={{background: PC.bg, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: WW,
          height: WH,
          transformOrigin: '0 0',
          transform: `translate(640px, 360px) rotate(${c.r.toFixed(3)}deg) scale(${c.z.toFixed(5)}) translate(${(-c.x).toFixed(2)}px, ${(-c.y).toFixed(2)}px)`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** 大画布纸面：米白底 + 均匀点阵（随世界一起平移，鼠标意义上的"坐标纸"） */
export const PaperDots: React.FC = () => (
  <>
    <div style={{position: 'absolute', left: 0, top: 0, width: WW, height: WH, background: `linear-gradient(180deg, #edf1f5 0%, ${PC.bg} 30%, ${PC.bgDeep} 100%)`}} />
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: WW,
        height: WH,
        backgroundImage: `radial-gradient(circle, ${PC.dot} 2.1px, transparent 2.7px)`,
        backgroundSize: '44px 44px',
        opacity: 0.75,
      }}
    />
  </>
);

/** 章节小帽：橙方块 + 中文 + 英文角标（全片统一 kicker 词汇） */
export const Kick: React.FC<{x: number; y: number; zh: string; en: string; o: number; rise: number}> = ({x, y, zh, en, o, rise}) => (
  <div style={{position: 'absolute', left: x, top: y, opacity: o, transform: `translateY(${rise}px)`, whiteSpace: 'nowrap'}}>
    <span style={{display: 'inline-block', width: 18, height: 18, background: PC.accent, marginRight: 14, verticalAlign: -1}} />
    <span style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: 32, color: PC.ink, letterSpacing: 2}}>{zh}</span>
    <span style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 600, fontSize: 19, color: PC.mid, letterSpacing: 6, marginLeft: 18, verticalAlign: 3}}>{en}</span>
  </div>
);

/** 贴纸文字（HTML 双层：白描边背字 + 填色面字）——数字/标题贴纸化的统一实现 */
export const StickerText: React.FC<{
  text: string;
  x: number;
  y: number; // 左上角
  size: number;
  fill?: string;
  outlineW?: number;
  weight?: number;
  ls?: number; // letterSpacing px
  rot?: number;
  tnum?: boolean;
  o?: number;
}> = ({text, x, y, size, fill = PC.accent, outlineW = 16, weight = 900, ls = 0, rot = 0, tnum = true, o = 1}) => {
  const font: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    fontFamily: "'Noto Sans SC', sans-serif",
    fontWeight: weight,
    fontSize: size,
    lineHeight: 1.08,
    letterSpacing: ls,
    whiteSpace: 'nowrap',
    fontFeatureSettings: tnum ? "'tnum' 1" : undefined,
  };
  return (
    <div style={{position: 'absolute', left: x, top: y, width: 0, height: 0, transform: `rotate(${rot}deg)`, transformOrigin: '0 50%', opacity: o}}>
      <div style={{...font, WebkitTextStroke: `${outlineW}px ${STK.paper}`}}>{text}</div>
      <div style={{...font, color: fill}}>{text}</div>
    </div>
  );
};

/** 贴纸心脏（主视觉，纯代码绘制）：墨色心 + 白描边 + 高光 + 心电细线；搏动由外层 transform 提供 */
export const HeartSticker: React.FC<{cx: number; cy: number; s: number; ecg: number; o: number; lift: number; rot?: number}> = ({cx, cy, s, ecg, o, lift, rot = 0}) => (
  <svg
    width={380}
    height={360}
    viewBox="-190 -180 380 360"
    style={{position: 'absolute', left: cx - 190, top: cy - 180, overflow: 'visible', opacity: o, transform: `rotate(${rot}deg) scale(${s})`, transformOrigin: '50% 50%', filter: STK.shadow(lift)}}
  >
    <g stroke={STK.paper} strokeWidth={STK.owMain * 2} strokeLinejoin="round" paintOrder="stroke">
      <path d="M 0 152 C -128 62 -158 -28 -108 -84 C -66 -130 -12 -116 0 -62 C 12 -116 66 -130 108 -84 C 158 -28 128 62 0 152 Z" fill={PC.ink} />
    </g>
    {/* 心电细线（幕底色刻画，draw-on 由 ecg 0..1 驱动） */}
    <path
      d="M -118 6 L -52 6 L -30 -42 L -4 44 L 16 6 L 118 6"
      fill="none"
      stroke={PC.bg}
      strokeWidth={9}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray="1 1"
      strokeDashoffset={1 - clamp01(ecg)}
    />
    <ellipse cx={-64} cy={-62} rx={17} ry={11} fill={STK.paper} opacity={0.9} transform="rotate(-32 -64 -62)" />
  </svg>
);

/** 迷你回形针贴纸（卡名记号/贯穿元素）：橙色线材 + 白描边 */
export const PaperclipSticker: React.FC<{cx: number; cy: number; s: number; rot: number; o: number; lift: number}> = ({cx, cy, s, rot, o, lift}) => (
  <svg
    width={104}
    height={170}
    viewBox="-52 -85 104 170"
    style={{position: 'absolute', left: cx - 52, top: cy - 85, overflow: 'visible', opacity: o, transform: `rotate(${rot}deg) scale(${s})`, transformOrigin: '50% 50%', filter: STK.shadow(lift)}}
  >
    <path
      d="M -26 -56 L 12 -56 C 32 -56 44 -42 44 -24 L 44 32 C 44 52 29 64 10 64 C -9 64 -24 52 -24 32 L -24 -18 C -24 -32 -14 -40 -1 -40 C 12 -40 21 -32 21 -18 L 21 28"
      fill="none"
      stroke={STK.paper}
      strokeWidth={15 * 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M -26 -56 L 12 -56 C 32 -56 44 -42 44 -24 L 44 32 C 44 52 29 64 10 64 C -9 64 -24 52 -24 32 L -24 -18 C -24 -32 -14 -40 -1 -40 C 12 -40 21 -32 21 -18 L 21 28"
      fill="none"
      stroke={PC.accent}
      strokeWidth={15}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** 贴纸芯片（算式/数据的白卡贴片）：白面圆角卡 + 细边 + 软阴影，pop 由外层 scale 提供 */
export const StickerChip: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  o: number;
  s?: number;
  rot?: number;
  children?: React.ReactNode;
}> = ({x, y, w, h, o, s = 1, rot = 0, children}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: Math.min(22, h / 4),
      background: PC.card,
      boxShadow: `0 0 0 ${STK.owSmall}px ${STK.paper}, 0 10px 22px rgba(22,34,46,0.16)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: o,
      transform: `rotate(${rot}deg) scale(${s})`,
      transformOrigin: '50% 50%',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);

/** 千分位格式化（count-up 期间逐帧调用） */
export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
