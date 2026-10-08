// 图形匹配飞行 GraphicMatchFlight / 方向性速度模糊 / TrackCam·anchor 相机段：技法借鉴 mg-styles-15 demos/19-paperclip (MIT, Vincentwei1021) index.html:229-247, 289-291, 436-442, TSX 重写
import React from 'react';
import {clamp01, cubicBezier} from '../common/easing';
import {PC, SCREEN_W, STK, WW, WH, type CamKey, slapStyle, wobble} from './kit';

/**
 * paperclip-sticker v4.0 opt-in 技法增补（mg 19-paperclip 移植；本文件不被 kit.tsx 引用，
 * kit 既有导出与默认输出零改动，zoomFly 相机不受影响）。
 *
 *  1. GraphicMatchFlight 图形匹配飞行（源 :229-247）：徽章 peel 拍现 → 直线插值 +
 *     垂直弧线（amp 60-130px、sg 交替）飞向目标 → 落地欠阻尼回弹；途中尺寸
 *     S0=62/104 → 1.15 → 1.36 → 落地 1（源比例表照抄）、圆角 18.4→12、双层字交叉
 *     淡化（xf=P(g,.3,.4)）、名条 1-pu / 序号 P(g,.65,.35)、色由 props 表同步。
 *  2. 方向性速度模糊（源 :436-442）：飞行中按 t±h 采样位姿差分得 vx/vy/标量缩放速度，
 *     feGaussianBlur stdDeviation=(bx,by) 实时算——bx=min(60, kb·(|vx|+380·vs·sc)/sc)、
 *     by=min(60, kb·(|vy|+150·vs·sc)/sc)、kb=.75·SH/MBN（SH=.5s、MBN=12 照抄），
 *     bx+by≤0.5 摘滤镜（快动作不糊成片，静止零开销）。
 *  3. TrackCam / anchor 相机段（源 :289-291）：anchor 段 = 缩放绕锚点（锚点屏幕位置
 *     不变）；track 段 = 跟随飞行中内容质心（cen 回调驱动 x/y，z 按 +y 行程 log 插值）。
 *     与 kit 的 CamStage/CamKey 段表互补：anchorZoom 产出的仍是 CamKey[]（可混排进
 *     既有段表），trackPose 是 t 的函数（配 TrackStage 使用）。
 */

// ---- 局部缓动（源 19-paperclip 照抄语义，借 common/easing 的 cubicBezier 实现）----
const eIO = (u: number): number => { // 源 eIO = easeInOutCubic（ioC）
  const c = clamp01(u);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
const eBd = cubicBezier(0.55, 0, 0.3, 1); // 飞行主 ease（源 eBd 照抄）
const oC = (u: number): number => 1 - Math.pow(1 - clamp01(u), 3);
const iQ = (u: number): number => clamp01(u) * clamp01(u);
/** 源 P(t,a,b)：自 a 起 b 秒线性进度 0..1。 */
const prog = (t: number, a: number, b: number): number => clamp01((t - a) / Math.max(1e-6, b));

// ---------------------------------------------------------------- 图形匹配飞行

export interface FlightSpec {
  S: [number, number]; // 起点（徽章原位中心，世界 px）
  T: [number, number]; // 终点（目标位中心）
  pk: number; // peel 拍现时刻（秒）
  ts: number; // 飞行起步（秒）
  ld: number; // 落地（秒）
  amp?: number; // 弧线幅度 px（源 60+(k·37)%70 → 60-129）
  sg?: 1 | -1; // 弧线方向（源 k 奇偶交替）
  rr?: number; // 空中旋转幅度°（源 ±(5+(k·13)%5)，双向）
  size?: number; // 徽章边长 px（源 104）
  text?: string; // 主字（A 面大字）
  text2?: string; // B 面字（落地后的紧凑字，交叉淡化；缺省用 text）
  name?: string; // 名条（中文名，peel 后淡出）
  zn?: string; // 序号角标（落地前淡入）
  color: string; // 徽章面色（色同步 prop：A/B 同色）
  z?: number;
}

export interface FlightPose {
  vis: boolean;
  x: number;
  y: number;
  s: number;
  r: number;
  lift: number;
  g: number; // 飞行主进度（eBd 后）
  pu: number; // peel 进度
  dr: number; // 落地前 0.08s 下潜进度
  sw: number; // 落地回弹
  xf: number; // 双层字交叉淡化（0=A 面 1=B 面）
  nm: number; // 名条 α
  zn: number; // 序号 α
  radius: number; // 圆角 18.4→12
  vx: number;
  vy: number;
  vs: number; // 标量缩放速度（log 差分）
}

const FLIGHT_H = 0.004; // 速度差分半窗（源 h=.004s）
const S0 = 62 / 104; // 源起始比例照抄

/** 飞行位姿（纯函数，秒域；源 :229-247 公式照抄 + :436-442 速度差分）。 */
export const flightPose = (o: FlightSpec, t: number): FlightPose => {
  const size = o.size ?? 104;
  const amp = o.amp ?? 90;
  const sg = o.sg ?? 1;
  const rr = o.rr ?? 6;
  const sample = (tt: number): Omit<FlightPose, 'vx' | 'vy' | 'vs' | 'vis'> => {
    const pu = eIO(prog(tt, o.pk, 0.12));
    const g = eBd(prog(tt, o.ts, o.ld - 0.08 - o.ts));
    const du = prog(tt, o.ld - 0.08, 0.08);
    const dr = iQ(du);
    const sw = tt >= o.ld ? wobble(tt - o.ld, 4.5, 13) : 0;
    const [sx, sy] = o.S;
    const [tx, ty] = o.T;
    const dx = tx - sx;
    const dy = ty - sy;
    const L = Math.hypot(dx, dy) || 1;
    const arc = Math.sin(Math.PI * g) * amp * sg;
    const x = sx + dx * g - (dy / L) * arc;
    const y = sy + dy * g + (dx / L) * arc;
    let s = g <= 0 ? S0 * (1 + 0.15 * pu) : S0 * 1.15 + (1.36 - S0 * 1.15) * oC(Math.min(1, g * 1.25));
    s = tt >= o.ld ? 1 + 0.15 * sw : s + (1.15 - s) * dr;
    const r = rr * pu * (1 - g) + Math.sin(Math.PI * g) * rr * 0.9;
    const lift = (1 - dr) * Math.max(pu * 0.55, g > 0 ? 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, g * 1.15)) : 0);
    const xf = prog(g, 0.3, 0.4); // 源 xf = P(g,.3,.4)
    return {
      x: x - size / 2,
      y: y - size / 2,
      s: s * (size / 104), // 徽章基准 104px（源 S0/1.36 表按 104 徽章标定）
      r,
      lift,
      g,
      pu,
      dr,
      sw,
      xf,
      nm: 1 - pu,
      zn: prog(g, 0.65, 0.35),
      radius: 18.4 + (12 - 18.4) * oC(g),
    };
  };
  const vis = t >= o.pk;
  const p = sample(t);
  const p1 = sample(t + FLIGHT_H);
  const p0 = sample(t - FLIGHT_H);
  const vx = (p1.x - p0.x) / (60 * FLIGHT_H);
  const vy = (p1.y - p0.y) / (60 * FLIGHT_H);
  const vs = Math.abs(Math.log(Math.max(1e-4, p1.s) / Math.max(1e-4, p0.s))) / (60 * FLIGHT_H);
  return {vis, ...p, vx, vy, vs};
};

/** 方向性速度模糊量（源 :440-442 照抄）：kb=.75·SH/MBN（SH=.5s、MBN=12）；上限 60。
 *  返回 null = 不够糊（bx+by≤0.5，别挂滤镜）。 */
export const flightBlur = (p: FlightPose): [number, number] | null => {
  const kb = (0.75 * 0.5) / 12;
  const bx = Math.min(60, (kb * (Math.abs(p.vx) + 380 * p.vs)) / p.s);
  const by = Math.min(60, (kb * (Math.abs(p.vy) + 150 * p.vs)) / p.s);
  if (bx + by <= 0.5) return null;
  return [bx, by];
};

let blurSeq = 0;

/**
 * GraphicMatchFlight：徽章贴纸从 S 弧线飞到 T 并变形为目标形态（尺寸/圆角/双层字
 * 交叉淡化/色同步）。渲染 = 圆角方贴纸（白描边 boxShadow + 软影随 lift）+ 双层字 +
 * 名条/序号；飞行中按速度挂方向性 feGaussianBlur。
 */
export const GraphicMatchFlight: React.FC<{o: FlightSpec; t: number; fps?: number}> = ({o, t}) => {
  const p = flightPose(o, t);
  const blurId = React.useRef<string>('');
  if (!blurId.current) blurId.current = `pc-fblur-${++blurSeq}`;
  if (!p.vis) return null;
  const blur = flightBlur(p);
  const size = o.size ?? 104;
  const style: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: size,
    height: size,
    zIndex: o.z ?? 36,
    borderRadius: p.radius,
    background: o.color,
    transform: `translate(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px) rotate(${p.r.toFixed(2)}deg) scale(${p.s.toFixed(4)})`,
    transformOrigin: '0 0',
    boxShadow: `0 0 0 ${((6 * Math.min(1, Math.max(p.pu, p.lift) * 2.2)) / p.s).toFixed(2)}px ${STK.paper}, 0 ${((3 + 20 * p.lift) / p.s).toFixed(1)}px ${((5 + 28 * p.lift) / p.s).toFixed(1)}px rgba(22,34,46,${(0.14 + 0.2 * p.lift).toFixed(3)})`,
    filter: blur ? `url(#${blurId.current})` : STK.shadow(p.lift),
  };
  const t1 = o.text2 ?? o.text ?? '';
  return (
    <>
      {blur ? (
        <svg width={0} height={0} style={{position: 'absolute'}}>
          <defs>
            <filter id={blurId.current} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation={`${blur[0].toFixed(2)} ${blur[1].toFixed(2)}`} />
            </filter>
          </defs>
        </svg>
      ) : null}
      <div style={style}>
        {o.text ? (
          <>
            <b style={{position: 'absolute', left: 0, right: 0, top: size * 0.242, textAlign: 'center',
              fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 800, fontSize: size * 0.484, lineHeight: 1,
              color: '#fff', opacity: 1 - p.xf}}>{o.text}</b>
            <b style={{position: 'absolute', left: 0, right: 0, top: size * 0.327, textAlign: 'center',
              fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: size * 0.385, lineHeight: 1,
              letterSpacing: '-0.01em', color: '#fff', opacity: p.xf}}>{t1}</b>
          </>
        ) : null}
        {o.name ? (
          <i style={{position: 'absolute', left: -size * 0.385, right: -size * 0.385, top: size * 1.162,
            textAlign: 'center', fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: size * 0.388,
            fontStyle: 'normal', lineHeight: 1, color: PC.faint, opacity: p.nm}}>{o.name}</i>
        ) : null}
        {o.zn ? (
          <i style={{position: 'absolute', left: size * 0.106, top: size * 0.087, fontFamily: "'Noto Sans SC', sans-serif",
            fontWeight: 500, fontSize: size * 0.144, fontStyle: 'normal', lineHeight: 1, color: '#D9E0E6', opacity: p.zn}}>{o.zn}</i>
        ) : null}
      </div>
    </>
  );
};

// ---------------------------------------------------------------- anchor / track 相机段

/**
 * anchorZoom：锚点锁屏缩放段（源 anchor 机制重写）——返回一段 CamKey 对，两端锚点
 * 的屏幕位置完全一致（c1 = a − (a−c0)·(z0/z1)），可直接混排进既有 CamKey 段表
 * （move 建议给 'hold' 走线性 + log-z，缩放语义已由端点锁定）。
 */
export const anchorZoom = (
  a: {t: number; x: number; y: number; z: number},
  anchor: [number, number],
  z1: number,
  t1: number,
): [CamKey, CamKey] => {
  const k = a.z / z1;
  return [
    {t: a.t, x: a.x, y: a.y, z: a.z, r: 0, move: 'hold'},
    {t: t1, x: anchor[0] - (anchor[0] - a.x) * k, y: anchor[1] - (anchor[1] - a.y) * k, z: z1, r: 0, move: 'hold'},
  ];
};

export type CamPose = {x: number; y: number; z: number; r: number};

/**
 * trackPose：跟随质心相机（源 :289-291 TRK 机制重写）——cen(t) 给内容质心（世界 px），
 * 相机 x 固定、y 跟随质心位移、z 按质心行程 p log 插值 A.z→zB。c0/c1 = 质心行程两端
 * （cen(tA)/cen(tB)，调用方定 Span；源用 cen(0)/cen(99)）。
 */
export const trackPose = (
  cen: (t: number) => [number, number],
  A: {x: number; y: number; z: number},
  zB: number,
  t: number,
  c0: [number, number],
  c1: [number, number],
): CamPose => {
  const c = cen(t);
  const span = c1[1] - c0[1];
  const p = Math.abs(span) < 1e-6 ? 0 : clamp01((c[1] - c0[1]) / span);
  return {
    x: A.x,
    y: A.y + (c[1] - c0[1]),
    z: Math.exp(Math.log(A.z) + (Math.log(zB) - Math.log(A.z)) * p),
    r: 0,
  };
};

/** TrackStage：与 kit 的 CamStage 同一变换链（translate(640,360)∘rotate∘scale∘translate(−c)），
 *  但位姿直接给（track 相机是 t 的函数，不是静态段表）。 */
export const TrackStage: React.FC<{pose: CamPose; children: React.ReactNode}> = ({pose, children}) => (
  <div style={{position: 'absolute', inset: 0, width: '100%', height: '100%', background: PC.bg, overflow: 'hidden'}}>
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: WW,
        height: WH,
        transformOrigin: '0 0',
        transform: `translate(640px, 360px) rotate(${pose.r.toFixed(3)}deg) scale(${pose.z.toFixed(5)}) translate(${(-pose.x).toFixed(2)}px, ${(-pose.y).toFixed(2)}px)`,
      }}
    >
      {children}
    </div>
  </div>
);

/** 便捷导出：slap 样式（kit 再导出，GraphiMatch 配套用）。 */
export {slapStyle};
/** 屏宽基准（kit 再导出，anchor 换算常用）。 */
export {SCREEN_W};
