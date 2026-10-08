// PhotoStage 照片底语法包（v4.0.0 新增，opt-in；本文件为新增独立组件，不改动 kit/ 其他文件——按需直接 import './PhotoStage'）。
// 技法借鉴登记（README 级）：mg-styles-15 demos/18-hanazi（MIT, Vincentwei1021）——
//   index.html:141-170 geom() Ken Burns 14px 出血钳制、:159-170 三连推 snap push
//   （2 帧 outExpo + 1.6 帧 3% 过冲高斯 + kick 震屏 + 焦点漂移）、:386-398 snap 帧
//   径向 zoom-blur（16 子样本、alpha 1/(i+1) 累积、比例阈 0.035）、:409-420 freeze-to-card
//   （desaturate 0.7→1 + inset clipPath + 卡边框阴影 + 过冲回摆）。TSX 重写，非拷贝。
//
// 四件（全部纯函数 + 薄组件，默认不被任何卡引用；几何以「视口 W×H」参数化，横竖屏通用）：
//   kbGeom        Ken Burns 几何：S=max(W/iw,H/ih)·1.05·Z，x/y 钳制在 14px 出血内（free 解锁越界）
//   snapPush      三连推：逐推 2 帧 outExpo + 3% 过冲（1.6 帧高斯）+ creep（末推 +16%/s）+ kick 语义
//   ZoomBlurSnap  snap 帧径向 zoom-blur：快门两端缩放比 >3.5% 才激活；16 层子样本 α=1/(i+1) 叠加
//   freezeCard    冻结成卡：hold 后 11 帧 inOutSine 收缩 0.72/rot−4°/ty−40 + desaturate 0.7→1 +
//                 inset(卡 inset round 30) + 卡边框阴影；p 过冲 1+0.035e^(−2.2u)sin(4.4u)
import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;

// ---------------------------------------------------------------- Ken Burns（14px 出血钳制）

export interface Plate {
  iw: number; // 图像原始宽
  ih: number; // 图像原始高
  fx?: number; // 焦点归一坐标（0..1；默认 0.5 居中）
  fy?: number;
}

/**
 * Ken Burns 几何（源 geom() 机制重写）：底图按「cover×1.05·Z」缩放，绘制原点使焦点
 * (fx,fy) 落到屏幕 (sx,sy)；x/y 钳制在 [W−imgW+m, −m] / [H−imgH+m, −m]（m=14px 出血，
 * 防露边）。free=true 解锁钳制（源 hero 层用法）。
 */
export const kbGeom = (
  plate: Plate,
  Z: number,
  sx: number,
  sy: number,
  viewport: {W: number; H: number},
  opts: {fx?: number; fy?: number; bleed?: number; free?: boolean} = {},
): {x: number; y: number; S: number} => {
  const m = opts.bleed ?? 14; // 源 m=14 照抄
  const S = (Math.max(viewport.W / plate.iw, viewport.H / plate.ih) * 1.05 * Z); // 源 cover×1.05×Z
  const W = plate.iw * S;
  const H = plate.ih * S;
  const fx = opts.fx ?? plate.fx ?? 0.5;
  const fy = opts.fy ?? plate.fy ?? 0.5;
  let x = sx - fx * W;
  let y = sy - fy * H;
  if (!opts.free) {
    x = Math.min(Math.max(x, viewport.W - W + m), -m);
    y = Math.min(Math.max(y, viewport.H - H + m), -m);
  }
  return {x, y, S};
};

/** KenBurns 舞台：children（通常一张 <Img>）按 kbGeom 摆进 overflow:hidden 的全屏底。 */
export const KenBurns: React.FC<{
  plate: Plate;
  Z: number;
  sx?: number;
  sy?: number;
  fx?: number;
  fy?: number;
  bleed?: number;
  free?: boolean;
  filter?: string;
  children: React.ReactNode;
}> = ({plate, Z, sx, sy, fx, fy, bleed, free, filter, children}) => {
  const {width, height} = useVideoConfig();
  const g = kbGeom(plate, Z, sx ?? width / 2, sy ?? height / 2, {W: width, H: height}, {fx, fy, bleed, free});
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: plate.iw,
          height: plate.ih,
          transform: `translate(${g.x.toFixed(2)}px, ${g.y.toFixed(2)}px) scale(${g.S.toFixed(5)})`,
          transformOrigin: '0 0',
          filter,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- snap push 三连推

export interface PushStop {
  at: number; // 推的时刻（秒）
  z: number; // 本推落定的缩放（乘算语义：相对上一推的倍率）
}

export interface PushState {
  Z: number; // 当帧总缩放（含 creep 与过冲）
  focus: number; // 焦点漂移 0..1（源 fe：逐推 k/n → (k+1)/n）
  kick: {x: number; y: number; r: number}; // 震屏（kickOn=false 恒 0）
}

const outExpo = (u: number): number => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u));
const gauss = (x: number): number => Math.exp(-x * x);

/**
 * 三连推（源 plate3 机制重写，秒域 + fps 参数化）：每推 2 帧 outExpo 主行程，叠
 * 1.6 帧处 ±3% 高斯过冲（σ=0.9 帧）；creep：非末推 +3%/s、末推 +16%/s（张力爬升）；
 * kick 语义 prop：kickOn=true 时逐推给 kick(t0, 9+4k 幅、k=14 衰减、f=13Hz) 震屏
 * （源 kick 公式照抄：阻尼正弦，y 轴 0.8 系数 + 0.7 相移，r 轴 0.03）。
 */
export const snapPush = (
  t: number,
  pushes: readonly PushStop[],
  fps: number,
  opts: {kickOn?: boolean} = {},
): PushState => {
  const FR = 1 / fps;
  let Z = 1.0;
  let focus = 0;
  const kick = {x: 0, y: 0, r: 0};
  const n = Math.max(1, pushes.length);
  pushes.forEach((p, k) => {
    if (t < p.at) return;
    const u = t - p.at;
    const e = outExpo(clamp01(u / (2 * FR)));
    const last = k === pushes.length - 1;
    const creep = last ? 1 + 0.16 * u : 1 + 0.03 * u;
    const os = 1 + 0.03 * gauss((u - 1.6 * FR) / (0.9 * FR)); // 3% 过冲 @1.6 帧
    Z = lerp(Z, p.z, e) * creep * os;
    focus = lerp(k / n, (k + 1) / n, e);
    if (opts.kickOn) {
      const ku = t - p.at;
      if (ku >= 0 && ku <= 1.5) {
        const amp = 9 + 4 * k;
        const K = 14;
        const f = 13;
        const E = amp * Math.exp(-K * ku);
        kick.x += E * Math.sin(2 * Math.PI * f * ku);
        kick.y += E * 0.8 * Math.cos(2 * Math.PI * f * 0.83 * ku + 0.7);
        kick.r += E * 0.03 * Math.sin(2 * Math.PI * f * 0.6 * ku);
      }
    }
  });
  return {Z, focus, kick};
};

// ---------------------------------------------------------------- zoom-blur snap（16 子样本）

/** 激活判据（源照抄）：快门两端缩放比变化 > 3.5%。sa/sb = 快门两端 kbGeom 的 S。 */
export const zoomBlurActive = (sa: number, sb: number, thresh = 0.035): boolean => Math.abs(sb / sa - 1) > thresh;

/**
 * ZoomBlurSnap：snap 帧径向 zoom-blur 的 DOM 等价实现——16 层同一 children，各层按
 * 快门两端缩放插值 scale（中心 = zoom 中心），α=1/(i+1) 逐层叠加（源累积合成序照抄）。
 * active=false 时渲染单层（零开销）。children 会被渲染 samples 遍——内容请保持轻
 * （一张 <Img> 为宜）。
 */
export const ZoomBlurSnap: React.FC<{
  active: boolean;
  from: number; // 快门起端缩放
  to: number; // 快门末端缩放
  samples?: number;
  originX?: number; // zoom 中心（0..1，默认焦点语义由调用方换算）
  originY?: number;
  width?: number | string;
  height?: number | string;
  children: React.ReactNode;
}> = ({active, from, to, samples = 16, originX = 0.5, originY = 0.5, width = '100%', height = '100%', children}) => {
  if (!active) return <>{children}</>;
  const n = Math.max(2, samples);
  return (
    <div style={{position: 'absolute', inset: 0, width, height}}>
      {Array.from({length: n}, (_, i) => {
        const s = lerp(from, to, i / (n - 1));
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 1 / (i + 1), // 源 globalAlpha=1/(i+1) 累积序照抄
              transform: `scale(${s.toFixed(5)})`,
              transformOrigin: `${(originX * 100).toFixed(1)}% ${(originY * 100).toFixed(1)}%`,
            }}
          >
            {children}
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- freeze-to-card

export interface FreezeOpts {
  hold?: number; // 冻结后保持时长（秒；源 C.freeze_hold）
  fps?: number;
  inset?: {top: number; bottom: number; side: number}; // 卡 inset px（源 190/560/70 @1080×1920 竖屏基准）
  radius?: number; // 卡圆角 px（源 30）
  targetScale?: number; // 收缩终值（源 0.72）
  rot?: number; // 收缩旋转°（源 −4）
  ty?: number; // 收缩上移 px（源 −40）
}

export interface FreezeState {
  p: number; // 收缩主进度（可过冲到 1.06）
  e: number; // clamp(p, 0, 1.06)（clip/阴影用）
  sc: number; // 舞台缩放（含 pre-freeze 1→1.03 微推）
  rot: number;
  ty: number;
  sat: number; // desaturate 目标（saturate 滤镜值 0.7→1）
  clip: string | null; // inset(...) clipPath（p>0 才有）
  insets: {top: number; bottom: number; side: number}; // e 缩放后的卡 inset px（边框层定位用）
  border: {b: number; shadow: string} | null; // 卡边框层（厚 30·e，阴影 34e/60e rgba(8,40,70,.4e)）
}

const inOutSine = (u: number): number => -(Math.cos(Math.PI * clamp01(u)) - 1) / 2;
const outCubic = (u: number): number => 1 - Math.pow(1 - clamp01(u), 3);

/**
 * 冻结成卡（源 :409-420 机制重写，秒域参数化）：freeze 时刻起 hold 秒内只做 1→1.03
 * 微推（outCubic）；随后 11 帧 inOutSine 收缩到卡（sc lerp(zf, target, p)、rot、ty），
 * p 过冲 1+0.035·e^(−2.2(u−1))·sin(4.4(u−1))（源照抄）；saturate 0.7→1 随 p 回暖；
 * 卡 = inset(190e/70e/560e/70e round 30e)（竖屏基准值，横屏请用 inset prop 换算）+
 * 边框 30e px + 阴影 0 34e 60e rgba(8,40,70,0.4e)。
 */
export const freezeCard = (t: number, freeze: number, opts: FreezeOpts = {}): FreezeState => {
  const fps = opts.fps ?? 30;
  const hold = opts.hold ?? 0.5;
  const ins = opts.inset ?? {top: 190, bottom: 560, side: 70};
  const radius = opts.radius ?? 30;
  const target = opts.targetScale ?? 0.72;
  const rotT = opts.rot ?? -4;
  const tyT = opts.ty ?? -40;
  const uf = t - freeze;
  if (uf < 0) return {p: 0, e: 0, sc: 1, rot: 0, ty: 0, sat: 1, clip: null, insets: {top: 0, bottom: 0, side: 0}, border: null};
  const HOLD = hold;
  const uh = (uf - HOLD) / ((11 / fps)); // 源 11 帧
  const p =
    uf < HOLD
      ? 0
      : uh < 1
        ? inOutSine(uh)
        : 1 + 0.035 * Math.exp(-(uh - 1) * 2.2) * Math.sin((uh - 1) * 4.4);
  const e = Math.min(1.06, Math.max(0, p));
  const zf = lerp(1, 1.03, outCubic(uf / HOLD));
  const sc = lerp(zf, target, p);
  const rot = lerp(0, rotT, p);
  const ty = lerp(0, tyT, p);
  const sat = lerp(0.7, 1, clamp01(p));
  const clip = p > 0 ? `inset(${(ins.top * e).toFixed(1)}px ${(ins.side * e).toFixed(1)}px ${(ins.bottom * e).toFixed(1)}px ${(ins.side * e).toFixed(1)}px round ${(radius * e).toFixed(1)}px)` : null;
  const b = 30 * e; // 源边框厚 30·e
  const insets = {top: ins.top * e, bottom: ins.bottom * e, side: ins.side * e};
  const border = p > 0 ? {b, shadow: `0 ${(34 * e).toFixed(1)}px ${(60 * e).toFixed(1)}px rgba(8,40,70,${(0.4 * e).toFixed(3)})`} : null;
  return {p, e, sc, rot, ty, sat, clip, insets, border};
};

/**
 * FreezeCard 舞台：children（照片底整层）按 freezeCard 位姿绕屏心收缩成卡。
 * 边框层贴着 clip 内缩矩形外沿（厚 30·e），boxShadow 承担卡边框+投影（源 cardborder 同法）。
 */
export const FreezeCard: React.FC<{t: number; freeze: number; opts?: FreezeOpts; children: React.ReactNode}> = ({t, freeze, opts, children}) => {
  const st = freezeCard(t, freeze, opts);
  return (
    <AbsoluteFill>
      {/* 变换容器：卡（内容+边框）整体旋转/缩放（源 cw transform 同法，边框随卡走） */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(0px, ${st.ty.toFixed(2)}px) rotate(${st.rot.toFixed(3)}deg) scale(${st.sc.toFixed(4)})`,
          transformOrigin: '50% 50%',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            filter: st.p > 0 ? `saturate(${st.sat.toFixed(3)})` : undefined,
            clipPath: st.clip ?? undefined,
          }}
        >
          {children}
        </div>
        {st.border ? (
          <div
            style={{
              position: 'absolute',
              left: st.insets.side - st.border.b,
              top: st.insets.top - st.border.b,
              right: st.insets.side - st.border.b,
              bottom: st.insets.bottom - st.border.b,
              boxShadow: st.border.shadow,
              pointerEvents: 'none',
            }}
          />
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
