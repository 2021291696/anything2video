import React from 'react';
import {C30, S30, U, EASE, wob, STOX, STOY, isoDX, isoDY} from './world';

/**
 * kit.tsx — clay-town 黏土图元库（纯 CSS transform + SVG，禁真 3D 库）。
 *
 * 方法论继承 isometric-city（SSR 等轴面 / Z 序公式 / seeded 布局），材质语言换黏土：
 * 签名特征 1 —— SSR 公式造等轴面（与正本同款逐面矩阵）：顶 rotate(30)skewX(-30)scaleY(.866)、
 *   右 rotate(-30)skewX(-30)scaleY(.866)、左镜像面；三面共用锚点（transformOrigin 0 0）。
 * 签名特征 2 —— 黏土材质：哑光双向渐变（受光亮/背光暗）+ inset 环境光遮蔽内阴影 +
 *   大圆角软形状（顶面 14-26px，seeded 抖动）；球/圆柱走屏幕空间（正交投影下球冠=圆）。
 * 签名特征 3 —— 手捏不规则：hash 抖动 ±2%（scale/rotate/圆角/渐变角全部 seeded 扰动）。
 * 签名特征 4 —— 软落 squash：物件自上落下 → 落地压扁回弹（clayDrop），替代硬建筑「底-墙-顶」三段生长。
 * 签名特征 5 —— 可爱拟人：水塔罐体 kawaii 面孔（眨眼）、云朵树冠、水滴角色（贯穿元素）。
 */

// ---------------------------------------------------------------- 黏土色板（陶土橙/奶白/灰蓝/苔绿/炭褐 + 水蓝 hero 色）
export const CLAY = {
  bgTop: '#FDF4E8', bgMid: '#F6E2CB', bgLow: '#EDD2B4',
  cream: '#FBF3E4', creamD: '#EBD9BE', creamDD: '#DCC9AC',
  terra: '#E8926B', terraD: '#CE7853',
  slate: '#9FB8CF', slateD: '#7E9DB9',
  moss: '#A8C39A', mossD: '#87A878',
  cocoa: '#4A3A31', cocoaL: '#6B5A50', muted: '#957F71',
  water: '#8FC1EE', waterD: '#5E93C9', waterDeep: '#3E6E9E',
  rim: '#FFE3C8', butter: '#F5CE7E',
  door: '#8A6A4F', pipe: '#8FA9C4', trunk: '#B99A7E',
} as const;

/** 固定光向调色：顶最亮(k>1)、受光面(k≈1)、背光面(k<1)。 */
export const shade = (hex: string, k = 1) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(Math.min(255, v * k)).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
};

// SSR 三面 transform（签名特征 1 正本，与 isometric-city 同款公式）
export const FACE_TOP = 'rotate(30deg) skewX(-30deg) scaleY(0.866)';
export const FACE_RIGHT = 'rotate(-30deg) skewX(-30deg) scaleY(0.866)';
export const FACE_LEFT = 'rotate(30deg) skewX(30deg) scaleY(0.866) scaleX(-1)';

/** 等轴背角（u,v,高h）→ 中景层屏幕点。 */
export const backCorner = (ox: number, u: number, v: number, h = 0) => ({
  x: ox + (u - v) * C30 * U,
  y: STOY + (u + v) * S30 * U - h * U,
});

/** 站内世界格 → 中景层屏幕点（地面，未含相机）。 */
export const groundPos = (st: 'A' | 'B' | 'C', u: number, v: number) => ({
  x: STOX[st] + isoDX(u, v),
  y: STOY + isoDY(u, v),
});

// ---------------------------------------------------------------- 黏土材质（哑光双向渐变 + AO 内阴影，角度/强度 seeded 抖动）
export const clayTop = (hex: string, seed: number): React.CSSProperties => {
  const a1 = 164 + wob(seed, 7), a2 = 26 + wob(seed + 1, 9), ao = 10 + Math.abs(wob(seed + 2, 4));
  return {
    background: `radial-gradient(ellipse at ${a2}% 24%, rgba(255,252,242,0.55), transparent 58%), linear-gradient(${a1}deg, ${shade(hex, 1.10)}, ${shade(hex, 1.01)} 46%, ${shade(hex, 0.90)})`,
    boxShadow: `inset 0 0 ${ao}px rgba(74,58,49,0.15)`,
  };
};
export const claySide = (hex: string, seed: number): React.CSSProperties => {
  const a1 = 96 + wob(seed, 10), ao = 8 + Math.abs(wob(seed + 3, 4));
  return {
    background: `linear-gradient(${a1}deg, ${shade(hex, 1.05)}, ${hex} 42%, ${shade(hex, 0.84)})`,
    boxShadow: `inset 0 0 ${ao}px rgba(74,58,49,0.18), inset 0 -3px 6px rgba(74,58,49,0.08)`,
  };
};

const faceDiv = (transform: string, w: number, h: number, style: React.CSSProperties, extra?: React.CSSProperties): React.CSSProperties => ({
  position: 'absolute', width: w, height: h,
  transform, transformOrigin: '0 0', backfaceVisibility: 'hidden', ...style, ...extra,
});

/** 顶面菱形（黏土软圆角，锚=背角屏幕点）。 */
export const ClTopFace: React.FC<{x: number; y: number; wu: number; du: number; hex: string; seed: number; radius?: number; z?: number; style?: React.CSSProperties; inner?: React.ReactNode}> =
({x, y, wu, du, hex, seed, radius, z, style, inner}) => {
  const r = radius ?? 14 + wob(seed + 5, 4);
  return (
    <div style={{...faceDiv(FACE_TOP, wu * U, du * U, clayTop(hex, seed), {borderRadius: r}), left: x, top: y, zIndex: z, ...style}}>{inner}</div>
  );
};

// ---------------------------------------------------------------- 黏土圆柱（屏幕空间：正交投影下竖直圆柱=矩形+椭圆盖）
export const ClayCyl: React.FC<{x: number; y: number; w: number; h: number; hex: string; seed: number; cap?: boolean; z?: number; style?: React.CSSProperties}> =
({x, y, w, h, hex, seed, cap = true, z, style}) => (
  <div style={{position: 'absolute', left: 0, top: 0, zIndex: z, ...style}}>
    <div style={{position: 'absolute', left: x - w / 2, top: y - h + w * 0.21, width: w, height: Math.max(2, h - w * 0.21),
      borderRadius: `${w * 0.44}px ${w * 0.44}px ${w * 0.32}px ${w * 0.32}px`, ...claySide(hex, seed)}} />
    {cap && <div style={{position: 'absolute', left: x - w / 2, top: y - h, width: w, height: w * 0.42, borderRadius: '50%', ...clayTop(hex, seed + 4)}} />}
  </div>
);

// ---------------------------------------------------------------- 接地软影（椭圆，中心按占用中心算）
export const GroundShadow: React.FC<{cx: number; cy: number; w: number; h: number; a?: number}> = ({cx, cy, w, h, a = 0.16}) => (
  <div style={{position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, borderRadius: '50%',
    background: `radial-gradient(closest-side, rgba(74,58,49,${a}), transparent 72%)`}} />
);

// ---------------------------------------------------------------- 黏土底座（三层奶油板；整块软落 squash）
export const ClaySlab: React.FC<{ox: number; nu: number; nv: number; t0: number; f: number}> = ({ox, nu, nv, t0, f}) => {
  const tau = (f - t0) / 30;
  const d = EASE.clayDrop(tau, 0.3, 1.5);
  if (!d) return null;
  const back = backCorner(ox, 0, 0);
  const pivotY = back.y + ((nu + nv) / 2) * S30 * U + 26;
  const layer = (i: number) => {
    const g = 1 + (2 - i) * 0.16; // 底层最宽（i=2 → g=1.32），同心内缩
    const wu = nu * g, du = nv * g;
    const ou = -wu / 2, ov = -du / 2;
    const b = backCorner(ox, ou, ov);              // 该层背角（地面）
    const fx = b.x + (wu - du) * C30 * U;          // 该层前角（IsoBox 同款锚定：立面挂前角）
    const fy = b.y + (wu + du) * S30 * U;
    const hex = [CLAY.cream, CLAY.creamD, CLAY.creamDD][i];
    const h = 15 - i * 2;
    return (
      <React.Fragment key={i}>
        <div style={faceDiv(FACE_RIGHT, du * U, h, claySide(shade(hex, 0.9), 71 + i), {left: fx, top: fy, borderRadius: 16})} />
        <div style={faceDiv(FACE_LEFT, wu * U, h, claySide(hex, 77 + i), {left: fx, top: fy, borderRadius: 16})} />
        <ClTopFace x={b.x} y={b.y} wu={wu} du={du} hex={hex} seed={81 + i} radius={26 + i * 4} />
      </React.Fragment>
    );
  };
  return (
    <div style={{position: 'absolute', left: 0, top: 0, zIndex: 1,
      transform: `translateY(${d.dy}px) scale(${d.sx}, ${d.sy})`, transformOrigin: `${back.x}px ${pivotY}px`}}>
      {[2, 1, 0].map((i) => layer(i))}
    </div>
  );
};

// ---------------------------------------------------------------- 黏土小屋（整块软落 squash；屋顶软塌弧线 + 圆窗圆门 + 圆胖烟囱另置）
export const ClayHouse: React.FC<{st: 'A' | 'B' | 'C'; u: number; v: number; w: number; d: number; h: number; t0: number; f: number; wall?: string; roof?: string; seed: number; chimney?: {fu: number; fv: number; hc: number}}> =
({st, u, v, w, d, h, t0, f, wall = CLAY.cream, roof = CLAY.terra, seed, chimney}) => {
  const tau = (f - t0) / 30;
  const d0 = EASE.clayDrop(tau, 0.24, 2.2);
  if (!d0) return null;
  const ox = STOX[st];
  const fx = ox + (u + w - (v + d)) * C30 * U;   // 前底角（地面）
  const fy = STOY + (u + w + v + d) * S30 * U;
  const wpx = w * U, dpx = d * U, hpx = h * U;
  // 屋顶体块：墙面内缩 6% 的同心小盒（w2,d2），坐落在墙顶平面（高 hpx）
  const w2 = w * 0.94, d2 = d * 0.94, h2px = hpx * 0.52;
  const ur = u + (w - w2) / 2, vr = v + (d - d2) / 2;
  const fx2 = ox + (ur + w2 - (vr + d2)) * C30 * U;
  const fy2 = STOY + (ur + w2 + vr + d2) * S30 * U - hpx;
  const bx2 = fx2 + (d2 - w2) * C30 * U;
  const by2 = fy2 - (w2 + d2) * S30 * U;
  const roofPop = EASE.spring((f - t0 - 6) / 30, 18, 0.5, 5);
  const z = Math.round((u + w + v + d) * 10);
  const tilt = wob(seed, 1.1); // 手捏微歪 ±1.1°
  const gcx = fx - ((w - d) / 2) * C30 * U, gcy = fy - ((w + d) / 2) * S30 * U; // 占用中心（影）
  return (
    <div style={{position: 'absolute', left: 0, top: 0, zIndex: z, transform: `rotate(${tilt}deg)`}}>
      <GroundShadow cx={gcx} cy={gcy + 4} w={(w + d) * U * 0.78} h={(w + d) * U * 0.32} a={0.15} />
      <div style={{position: 'absolute', left: fx, top: fy, transformOrigin: '0 0', transform: `translateY(${d0.dy}px) scale(${d0.sx}, ${d0.sy})`}}>
        {/* 右/左立面（黏土墙；面内圆窗圆门经面变换自动投影成等轴椭圆） */}
        <div style={faceDiv(FACE_RIGHT, dpx, hpx, claySide(shade(wall, 0.94), seed + 10), {left: 0, top: -hpx, borderRadius: 12 + wob(seed + 11, 3)})}>
          <div style={{position: 'absolute', left: '24%', bottom: '16%', width: '30%', aspectRatio: '1', borderRadius: '50%', background: shade(roof, 0.6), opacity: 0.7, boxShadow: 'inset 0 2px 3px rgba(74,58,49,0.3)'}} />
        </div>
        <div style={faceDiv(FACE_LEFT, wpx, hpx, claySide(wall, seed + 12), {left: 0, top: -hpx, borderRadius: 12 + wob(seed + 13, 3), overflow: 'hidden'})}>
          <div style={{position: 'absolute', left: '16%', bottom: 0, width: '28%', height: '50%', borderRadius: '999px 999px 0 0', background: CLAY.door, opacity: 0.85}} />
          <div style={{position: 'absolute', left: '60%', top: '22%', width: '20%', aspectRatio: '1', borderRadius: '50%', background: shade(CLAAY_WIN, 1), opacity: 0.9, boxShadow: 'inset 0 2px 4px rgba(74,58,49,0.35)'}} />
        </div>
        {/* 屋顶体块（软塌弧线：顶面非对称大圆角；坐标相对 squash 容器原点） */}
        {roofPop > 0.02 && (
          <div style={{position: 'absolute', left: fx2 - fx, top: fy2 - fy, transformOrigin: '0 0', transform: `scale(${Math.min(roofPop, 1.08)})`}}>
            <div style={faceDiv(FACE_RIGHT, d2 * U, h2px, claySide(shade(roof, 0.9), seed + 14), {left: 0, top: -h2px, borderRadius: 14})} />
            <div style={faceDiv(FACE_LEFT, w2 * U, h2px, claySide(roof, seed + 15), {left: 0, top: -h2px, borderRadius: 14})} />
            <ClTopFace x={bx2 - fx2} y={by2 - h2px - fy2} wu={w2} du={d2} hex={shade(roof, 1.02)} seed={seed + 16}
              radius={0} z={0}
              style={{borderRadius: '46% 46% 40% 40% / 62% 62% 46% 46%'}} />
          </div>
        )}
        {/* 圆胖烟囱（屋面上；画在屋顶之后被屋面承托） */}
        {chimney && (() => {
          const popC = EASE.spring((f - t0 - 10) / 30, 20, 0.5, 6);
          if (popC <= 0.02) return null;
          const uc = u + chimney.fu * w, vc = v + chimney.fv * d;
          const cxr = ox + (uc - vc) * C30 * U - fx;
          const cyr = STOY + (uc + vc) * S30 * U - hpx - fy;
          const puff = ((((f - t0) % 90) + 90) % 90) / 90;
          return (
            <div style={{position: 'absolute', left: cxr, top: cyr, transform: `scale(${Math.min(popC, 1.05)})`, transformOrigin: '50% 100%'}}>
              <ClayCyl x={0} y={0} w={17} h={chimney.hc} hex={CLAY.terraD} seed={seed + 19} />
              {puff > 0.15 && puff < 0.9 && (
                <div style={{position: 'absolute', left: -7 - puff * 9, top: -chimney.hc - 9 - puff * 24, width: 12 + puff * 15, height: 12 + puff * 15, borderRadius: '50%',
                  background: 'rgba(251,243,228,0.85)', opacity: (1 - puff) * 0.85}} />
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
const CLAAY_WIN = '#E7F2FB';

// ---------------------------------------------------------------- 圆胖烟囱（独立小件，黏土烟圈循环；相位由 t0 决定保持确定性）
export const ClayChimney: React.FC<{st: 'A' | 'B' | 'C'; u: number; v: number; h: number; t0: number; f: number; hex?: string}> = ({st, u, v, h, t0, f, hex = CLAY.terraD}) => {
  const pop = EASE.spring((f - t0) / 30, 20, 0.5, 6);
  if (pop <= 0.02) return null;
  const p = groundPos(st, u, v);
  const puff = (((f - t0) % 90) + 90) % 90 / 90;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, zIndex: Math.round((u + v) * 10) + 1}}>
      <div style={{position: 'absolute', left: p.x, top: p.y, transform: `translate(-50%,-100%) scale(${Math.min(pop, 1.05)})`, transformOrigin: '50% 100%'}}>
        <ClayCyl x={0} y={0} w={18} h={h} hex={hex} seed={Math.round(u * 97 + v * 13)} />
        {puff > 0.15 && puff < 0.9 && (
          <div style={{position: 'absolute', left: -6 - puff * 10, top: -h - 10 - puff * 26, width: 12 + puff * 16, height: 12 + puff * 16, borderRadius: '50%',
            background: 'rgba(251,243,228,0.85)', opacity: (1 - puff) * 0.85}} />
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 云朵树冠树 / 花 / 灌木
const MOSS3 = [CLAY.moss, '#B7CFA9', '#93B285'];
export const ClayTree: React.FC<{x: number; y: number; s: number; col: number; appear: number; ground?: boolean; z?: number; seed?: number}> =
({x, y, s, col, appear, ground = true, z, seed = 5}) => {
  if (appear <= 0) return null;
  const sc = Math.min(appear, 1.05) * s;
  const c = MOSS3[((col % 3) + 3) % 3];
  const j = wob(seed + col * 7, 1);
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-100%) scale(${sc}) rotate(${j}deg)`, transformOrigin: '50% 100%', zIndex: z ?? 2}}>
      {ground && <div style={{position: 'absolute', left: -18, top: 2, width: 36, height: 12, borderRadius: '50%', background: 'rgba(74,58,49,0.10)'}} />}
      <div style={{position: 'absolute', left: -4, top: -16, width: 8, height: 20, borderRadius: 4, background: CLAY.trunk}} />
      <div style={{position: 'absolute', left: -22, top: -44, width: 26, height: 26, borderRadius: '50%', background: `radial-gradient(circle at 34% 30%, ${shade(c, 1.16)}, ${c} 58%, ${shade(c, 0.86)})`}} />
      <div style={{position: 'absolute', left: 2, top: -48, width: 24, height: 24, borderRadius: '50%', background: `radial-gradient(circle at 36% 32%, ${shade(c, 1.2)}, ${shade(c, 1.02)} 60%, ${shade(c, 0.88)})`}} />
      <div style={{position: 'absolute', left: -12, top: -52, width: 28, height: 28, borderRadius: '50%', background: `radial-gradient(circle at 32% 28%, ${shade(c, 1.22)}, ${shade(c, 1.04)} 56%, ${shade(c, 0.9)})`}} />
    </div>
  );
};

export const ClayFlower: React.FC<{x: number; y: number; col: number; appear: number; z?: number}> = ({x, y, col, appear, z}) => {
  if (appear <= 0) return null;
  const c = [CLAY.terra, CLAY.butter, CLAY.slate][((col % 3) + 3) % 3];
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-100%) scale(${Math.min(appear, 1.04)})`, transformOrigin: '50% 100%', zIndex: z ?? 2}}>
      <div style={{position: 'absolute', left: -1.2, top: -12, width: 2.4, height: 13, borderRadius: 2, background: CLAY.mossD}} />
      <div style={{position: 'absolute', left: -5, top: -18, width: 10, height: 10, borderRadius: '50%', background: `radial-gradient(circle at 36% 30%, ${shade(c, 1.22)}, ${c} 60%, ${shade(c, 0.85)})`}} />
      <div style={{position: 'absolute', left: -2, top: -15, width: 4, height: 4, borderRadius: '50%', background: shade(c, 1.35)}} />
    </div>
  );
};

export const ClayBush: React.FC<{x: number; y: number; col: number; appear: number; z?: number}> = ({x, y, col, appear, z}) => {
  if (appear <= 0) return null;
  const c = MOSS3[(((col + 1) % 3) + 3) % 3];
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-100%) scale(${Math.min(appear, 1.04)})`, transformOrigin: '50% 100%', zIndex: z ?? 2}}>
      <div style={{position: 'absolute', left: -14, top: -12, width: 28, height: 15, borderRadius: '50%', background: `radial-gradient(circle at 36% 24%, ${shade(c, 1.16)}, ${c} 58%, ${shade(c, 0.85)})`}} />
      <div style={{position: 'absolute', left: -7, top: -17, width: 15, height: 13, borderRadius: '50%', background: `radial-gradient(circle at 34% 30%, ${shade(c, 1.2)}, ${shade(c, 1.02)} 60%)`}} />
    </div>
  );
};

// ---------------------------------------------------------------- 黏土水管段（沿等轴网格线挤出；lit=过水点亮水蓝+辉光）
export const ClayPipe: React.FC<{ox: number; u: number; v: number; len: number; dir: 'u' | 'v'; grow: number; lit: number; f: number}> = ({ox, u, v, len, dir, grow, lit, f}) => {
  const gs = EASE.easeOutCubic((f - grow) / 7);
  if (gs <= 0) return null;
  const on = lit >= 9999 ? 0 : EASE.easeOutCubic((f - lit) / 6);
  const dia = 15;
  const px = ox + isoDX(u, v), py = STOY + isoDY(u, v);
  const ang = dir === 'u' ? 30 : 150;
  const L = len * U;
  const z = Math.round((u + v + (dir === 'u' ? len : 0)) * 10);
  const seed = Math.round(u * 31 + v * 17);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, zIndex: z}}>
      <div style={{position: 'absolute', left: px, top: py - dia / 2, width: L, height: dia, transformOrigin: '0 50%',
        transform: `rotate(${ang}deg) scaleX(${Math.max(gs, 0.001)})`, borderRadius: dia / 2 + 1, ...claySide(CLAY.pipe, seed)}}>
        <div style={{position: 'absolute', left: L * 0.06, top: -2, width: 7, height: dia + 4, borderRadius: 3, background: shade(CLAY.pipe, 0.82)}} />
        <div style={{position: 'absolute', left: L - 12, top: -2, width: 7, height: dia + 4, borderRadius: 3, background: shade(CLAY.pipe, 0.82)}} />
        <div style={{position: 'absolute', inset: 2, borderRadius: dia / 2, opacity: on,
          background: `linear-gradient(90deg, ${shade(CLAY.water, 0.95)}, ${shade(CLAY.water, 1.18)})`,
          boxShadow: on > 0.4 ? '0 0 12px rgba(143,193,238,0.6), inset 0 0 5px rgba(255,255,255,0.5)' : 'inset 0 0 5px rgba(255,255,255,0.4)'}} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 水龙头（你家取水端；手柄可拧）
export const ClayTap: React.FC<{st: 'A' | 'B' | 'C'; u: number; v: number; t0: number; f: number; turn?: number}> = ({st, u, v, t0, f, turn = 0}) => {
  const pop = EASE.spring((f - t0) / 30, 18, 0.5, 6);
  if (pop <= 0.02) return null;
  const p = groundPos(st, u, v);
  const bodyHex = CLAY.slateD;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, zIndex: Math.round((u + v) * 10) + 2}}>
      <div style={{position: 'absolute', left: p.x, top: p.y, transform: `translate(-50%,-100%) scale(${Math.min(pop, 1.04)})`, transformOrigin: '50% 100%'}}>
        {/* 立柱 + 弯头出口（向左下出水） */}
        <ClayCyl x={6} y={0} w={16} h={40} hex={bodyHex} seed={9} />
        <div style={{position: 'absolute', left: -22, top: -46, width: 34, height: 15, borderRadius: 8, ...claySide(bodyHex, 12)}} />
        <div style={{position: 'absolute', left: -26, top: -40, width: 13, height: 12, borderRadius: 6, ...claySide(shade(bodyHex, 0.9), 13)}} />
        {/* 手柄（turn 弧度拧动） */}
        <div style={{position: 'absolute', left: 6, top: -52, transform: `translate(-50%,-50%) rotate(${turn}deg)`}}>
          <div style={{width: 20, height: 6, borderRadius: 3, background: CLAY.terra, boxShadow: 'inset 0 -1px 2px rgba(74,58,49,0.3)'}} />
          <div style={{position: 'absolute', left: 8, top: -3, width: 4, height: 12, borderRadius: 2, background: shade(CLAY.terra, 0.85)}} />
        </div>
        <div style={{position: 'absolute', left: 0, top: -66, width: 0, height: 0}} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 水滴角色（贯穿元素；kawaii 面孔 + squash；blink 由调用方按帧传）
export const Droplet: React.FC<{x: number; y: number; s?: number; sx?: number; sy?: number; face?: boolean; blink?: boolean; opacity?: number; z?: number; seed?: number}> =
({x, y, s = 1, sx = 1, sy = 1, face = true, blink = false, opacity = 1, z = 60, seed = 3}) => {
  const tilt = wob(seed, 2.4);
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) rotate(${tilt}deg) scale(${s * sx}, ${s * sy})`, opacity, zIndex: z}}>
      <svg width={40} height={47} viewBox="0 0 36 42">
        <defs>
          <radialGradient id="dpg" cx="0.34" cy="0.28" r="0.95">
            <stop offset="0" stopColor="#C8E4F9" />
            <stop offset="0.5" stopColor={CLAY.water} />
            <stop offset="1" stopColor={CLAY.waterD} />
          </radialGradient>
        </defs>
        <path d="M18 2 C18 2 5.5 19.5 5.5 28 a12.5 12.5 0 0 0 25 0 C30.5 19.5 18 2 18 2 Z" fill="url(#dpg)" />
        <ellipse cx="12" cy="25" rx="3.4" ry="4.6" fill="rgba(255,255,255,0.55)" transform="rotate(-18 12 25)" />
        {face && (
          <>
            <g transform={blink ? 'translate(0 5.4) scale(1 0.1)' : undefined} style={{transformOrigin: '18px 29px'}}>
              <circle cx="13.4" cy="29" r="3.6" fill="#fff" />
              <circle cx="23" cy="29" r="3.6" fill="#fff" />
              <circle cx="14" cy="29.4" r="1.9" fill={CLAY.cocoa} />
              <circle cx="23.6" cy="29.4" r="1.9" fill={CLAY.cocoa} />
            </g>
            <path d="M15.5 34.5 Q18 36.6 20.5 34.5" stroke={CLAY.cocoa} strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <circle cx="9.6" cy="31.6" r="1.9" fill="rgba(232,146,107,0.55)" />
            <circle cx="26.6" cy="31.6" r="1.9" fill="rgba(232,146,107,0.55)" />
          </>
        )}
      </svg>
    </div>
  );
};

// ---------------------------------------------------------------- 水塔（B 站主角：支腿→罐体软落→圆盖 pop→kawaii 眨眼）
export const ClayTower: React.FC<{st: 'A' | 'B' | 'C'; u: number; v: number; t0: number; f: number; blink?: boolean}> = ({st, u, v, t0, f, blink = false}) => {
  const ox = STOX[st];
  const c = groundPos(st, u, v);          // 塔底占用中心（地面）
  const legH = 64;
  const tankW = 116, tankH = 106;
  const legTau = (i: number) => (f - t0 - i * 3) / 30;
  const legs = [0, 1, 2].map((i) => EASE.clamp01(EASE.easeOutCubic(legTau(i))));
  const tankD = EASE.clayDrop((f - t0 - 11) / 30, 0.24, 2.0);
  const lidPop = EASE.spring((f - t0 - 22) / 30, 18, 0.5, 5);
  const faceOn = EASE.easeOutCubic((f - t0 - 28) / 8);
  const tankY = c.y - legH - tankH * 0.4; // 罐体中心 y
  if (f < t0 - 8) return null;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, zIndex: Math.round((u + v + 4) * 10)}}>
      <GroundShadow cx={c.x} cy={c.y + 2} w={168} h={52} a={0.16} />
      {/* 三根支腿（微歪，手捏感） */}
      {[{dx: -32, tilt: -3}, {dx: 28, tilt: 2.4}, {dx: -2, tilt: 0.8, back: true}].map((lg, i) => (
        <div key={i} style={{position: 'absolute', left: c.x + lg.dx - 6, top: c.y - legH * legs[i], width: 12, height: legH * legs[i],
          transform: `rotate(${lg.tilt}deg)`, transformOrigin: '50% 100%', borderRadius: 6,
          ...claySide(shade(CLAY.slateD, lg.back ? 0.88 : 1), 21 + i)}} />
      ))}
      {/* 罐体（大圆柱软落） */}
      {tankD && (
        <div style={{position: 'absolute', left: c.x, top: tankY + tankH * 0.5, transformOrigin: '50% 100%',
          transform: `translateY(${tankD.dy}px) scale(${tankD.sx}, ${tankD.sy})`}}>
          {/* 罐身（横向明暗渐变=圆柱体积感） */}
          <div style={{position: 'absolute', left: -tankW / 2, top: -tankH / 2, width: tankW, height: tankH,
            borderRadius: 26 + wob(31, 3),
            background: `linear-gradient(90deg, ${shade(CLAY.terra, 1.12)}, ${CLAY.terra} 38%, ${shade(CLAY.terra, 0.82)})`,
            boxShadow: 'inset 0 0 16px rgba(74,58,49,0.16), inset 0 -4px 8px rgba(74,58,49,0.1), inset 0 4px 6px rgba(255,252,242,0.25)'}} />
          {/* 罐底收口（藏进球体） */}
          <div style={{position: 'absolute', left: -tankW / 2 + 10, top: tankH / 2 - 14, width: tankW - 20, height: 16, borderRadius: '50%', background: shade(CLAY.terra, 0.8), opacity: 0.85}} />
          {/* 罐顶开口沿（贴身椭圆）+ 圆盖 + 顶珠 */}
          <div style={{position: 'absolute', left: -tankW / 2 - 2, top: -tankH / 2 - 9, width: tankW + 4, height: 24, borderRadius: '50%', ...clayTop(shade(CLAY.terra, 1.06), 37)}} />
          {lidPop > 0.02 && (
            <div style={{position: 'absolute', left: -tankW / 2 + 14, top: -tankH / 2 - 13 - (1 - Math.min(lidPop, 1)) * 12, width: tankW - 28, height: 22, borderRadius: '50%',
              transform: `scale(${Math.min(lidPop, 1.06)})`, ...clayTop(CLAY.terraD, 41)}}>
              <div style={{position: 'absolute', left: '50%', top: -6, transform: 'translateX(-50%)', width: 16, height: 11, borderRadius: 6, ...clayTop(CLAY.terra, 43)}} />
            </div>
          )}
          {/* kawaii 面孔（罐身正面；眨眼） */}
          {faceOn > 0.05 && (
            <div style={{position: 'absolute', left: -31, top: -14, width: 62, height: 30, opacity: faceOn}}>
              <div style={{position: 'absolute', left: 7, top: 8, width: 12, height: blink ? 3 : 12, borderRadius: 6, background: '#FFF', boxShadow: 'inset 0 -1px 2px rgba(74,58,49,0.2)'}}>
                <div style={{position: 'absolute', left: 4, top: blink ? 0 : 3.5, width: 4.6, height: 4.6, borderRadius: '50%', background: CLAY.cocoa}} />
              </div>
              <div style={{position: 'absolute', right: 7, top: 8, width: 12, height: blink ? 3 : 12, borderRadius: 6, background: '#FFF', boxShadow: 'inset 0 -1px 2px rgba(74,58,49,0.2)'}}>
                <div style={{position: 'absolute', left: 4, top: blink ? 0 : 3.5, width: 4.6, height: 4.6, borderRadius: '50%', background: CLAY.cocoa}} />
              </div>
              <div style={{position: 'absolute', left: 24, top: 21, width: 14, height: 7, borderBottom: `2.4px solid ${CLAY.cocoa}`, borderRadius: '0 0 10px 10px'}} />
              <div style={{position: 'absolute', left: -2, top: 17, width: 8, height: 4.6, borderRadius: '50%', background: 'rgba(255,255,255,0.4)'}} />
              <div style={{position: 'absolute', right: -2, top: 17, width: 8, height: 4.6, borderRadius: '50%', background: 'rgba(255,255,255,0.4)'}} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- 玻璃杯（SC04 接水；水位上升 + 涟漪）
export const GlassCup: React.FC<{x: number; y: number; s?: number; fill: number; ripple: number; z?: number}> = ({x, y, s = 1, fill, ripple, z = 55}) => (
  <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-100%) scale(${s})`, zIndex: z}}>
    <svg width={52} height={56} viewBox="0 0 52 56">
      <defs>
        <clipPath id="cupclip">
          <path d="M9 6 L43 6 L38.5 47 Q38 52 33 52 L19 52 Q14 52 13.5 47 Z" />
        </clipPath>
      </defs>
      <path d="M9 6 L43 6 L38.5 47 Q38 52 33 52 L19 52 Q14 52 13.5 47 Z" fill="rgba(255,255,255,0.38)" stroke="rgba(107,90,80,0.55)" strokeWidth="2.4" />
      <g clipPath="url(#cupclip)">
        <rect x="6" y={52 - 44 * fill} width="40" height={44 * fill + 4} fill={CLAY.water} opacity="0.9" />
        {fill > 0.05 && <ellipse cx="26" cy={52 - 44 * fill} rx="17" ry="4" fill={shade(CLAY.water, 1.22)} opacity="0.9" />}
      </g>
      <path d="M13 12 L16 40" stroke="rgba(255,255,255,0.65)" strokeWidth="2.6" strokeLinecap="round" />
      {ripple > 0 && ripple < 1 && (
        <ellipse cx="26" cy="52" rx={6 + ripple * 16} ry={2 + ripple * 4} fill="none" stroke={shade(CLAY.water, 1.3)} strokeWidth="1.6" opacity={(1 - ripple) * 0.8} />
      )}
    </svg>
  </div>
);
