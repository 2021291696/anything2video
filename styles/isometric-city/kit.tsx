import React from 'react';
import {C30, S30, U, EASE, GrowT, TileDef, BOXES, BoxDef, RACK_IGNITE, TILES, CARS, STOX, STOY, HERO_CUBES} from './world';

/**
 * kit.tsx — isometric-city 等轴 2.5D 图元库（纯 CSS transform，禁真 3D 库）。
 *
 * 签名特征 1 —— SSR 公式造等轴面（真等轴 30°：Scale 纵向 86.6% → Shear ±30° → Rotate ∓30°，逐面精确可验）：
 *   顶面 rotate(30deg) skewX(-30deg) scaleY(.866)：u→(√3/2, 1/2)，v→(−√3/2, 1/2)
 *   右面 rotate(-30deg) skewX(-30deg) scaleY(.866)：u→(√3/2, −1/2)，v→(0, 1)
 *   左面 rotate(30deg) skewX(30deg) scaleY(.866) scaleX(-1)（镜像面）：u→(−√3/2, −1/2)，v→(0, 1)
 * 三面共用「前顶角」F_top 锚点（transformOrigin 0 0）拼合成体；顶面以「背角」锚定。
 * 签名特征 2 —— 无灭点处处等比：沿等轴网格平移保持 30° 恒定斜率、零透视缩放；
 *   假 3D 前后关系全靠 zIndex=画面 y 坐标（z=(u+v)，画得越靠下越在前）。
 * 签名特征 3 —— 楼房生长：底面先落位 → 立面 scaleY 0→1 弹簧拉起（w14.8 z0.61：峰值≈8帧、9%过冲）→ 顶面延迟 3 帧盖上。
 * （特征 4 运镜视差在 world.ts/City.tsx；特征 5 高密度几何化小件即本库 prop 族。）
 */

export const ISO = {
  bgTop: '#EEEAFC', bgMid: '#DAD3F7', bgLow: '#C4BAEF', dot: '#A79EE2',
  road: '#8781D0', mark: '#FBFAFF', ink: '#2C2960', data: '#62F0F2',
  white: '#FBFAFF', peach: '#FFC4AC', sky: '#A8D2FF', mint: '#B7ECD6', lilac: '#D9D1FA', butter: '#FFE6A1',
  coral: '#FF9E86', deepSky: '#74A9F2', winOff: '#98ACEE', winOn: '#FFF0C8',
  leaf: ['#7FD3A6', '#93DDB5', '#6CC79A', '#A9E6C4'],
  trunk: '#C9A48F',
} as const;

// SSR 三面 transform（签名特征 1 正本）
export const FACE_TOP = 'rotate(30deg) skewX(-30deg) scaleY(0.866)';
export const FACE_RIGHT = 'rotate(-30deg) skewX(-30deg) scaleY(0.866)';
export const FACE_LEFT = 'rotate(30deg) skewX(30deg) scaleY(0.866) scaleX(-1)';

/** 固定光向调色：顶最亮(k>1)、左受光(k=1)、右背光(k<1)。 */
export const shade = (hex: string, k = 1) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(Math.min(255, v * k)).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
};

const faceDiv = (transform: string, w: number, h: number, bg: string, extra?: React.CSSProperties): React.CSSProperties => ({
  position: 'absolute', width: w, height: h, background: bg,
  transform: transform, transformOrigin: '0 0', backfaceVisibility: 'hidden', ...extra,
});

/** 顶面菱形：锚=背角 (u0,v0) 的屏幕点，FACE_TOP 自该点铺开。 */
export const TopFace: React.FC<{x: number; y: number; wu: number; du: number; bg: string; radius?: number; style?: React.CSSProperties; inner?: React.ReactNode; z?: number}> =
({x, y, wu, du, bg, radius = 8, style, inner, z}) => (
  <div style={{...faceDiv(FACE_TOP, wu * U, du * U, bg), left: x, top: y, borderRadius: radius, zIndex: z, ...style}}>{inner}</div>
);

/** 背角 (u,v,高h) → 中景层屏幕点。 */
export const backCorner = (st: 'A' | 'B' | 'C', u: number, v: number, h = 0) => ({
  x: STOX[st] + (u - v) * C30 * U,
  y: STOY + (u + v) * S30 * U - h * U,
});

// ---------------------------------------------------------------- 立面窗格（逐列点亮，hero 扫掠驱动；真窗格 div，圆角小窗）
export const WinWall: React.FC<{wu: number; hu: number; rows: number; cols: number; colIgnite: number[]; lit: number; f: number}> =
({rows, cols, colIgnite, lit, f}) => {
  const rand = EASE.rng(cols * 97 + rows * 31 + 7);
  const cells: Array<{r: number; c: number; tw: boolean}> = [];
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) cells.push({r, c, tw: rand() < 0.22});
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', padding: '10% 12%', gap: '9%'}}>
      {Array.from({length: cols}).map((_, c) => (
        <div key={c} style={{position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', gap: '12%'}}>
          {Array.from({length: rows}).map((_, r) => {
            const ig = colIgnite[c] ?? 9999;
            const on = EASE.clamp01((f - ig - r * 1.2) / 5);
            const dim = (r + 0.5) / rows > lit + 0.001; // lit<1 时顶部行先亮（遮罩语义改为行截断）
            const blink = dim ? 0 : 0.55 * (0.5 + 0.5 * Math.sin(f / 4 + c * 2.3 + r));
            return (
              <div key={r} style={{position: 'relative', flex: 1}}>
                <div style={{position: 'absolute', inset: 0, borderRadius: 3, background: ISO.winOff, opacity: 0.85 - 0.55 * on}} />
                {!dim && (
                  <div style={{position: 'absolute', inset: 0, borderRadius: 3, background: ISO.winOn, opacity: on,
                    boxShadow: on > 0.5 ? '0 0 6px rgba(255,240,200,0.55)' : undefined}} />
                )}
                {!dim && f > ig + 8 && cells[r * cols + c]?.tw && (
                  <div style={{position: 'absolute', inset: 0, borderRadius: 3, background: ISO.ink, opacity: blink}} />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- 机架 LED 带（B 站：hero 扫掠逐行点亮）
const LedRack: React.FC<{hu: number; rows: number; ignite: number; f: number}> = ({rows, ignite, f}) => (
  <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', padding: '9% 13%'}}>
    {Array.from({length: rows}).map((_, r) => {
      const rowOn = f >= ignite + r * 2;
      const blink = 0.7 + 0.3 * Math.sin(f / 2.6 + r * 1.9);
      return (
        <div key={r} style={{flex: 1, margin: '4% 0', borderRadius: 3, background: '#2C2960', position: 'relative', overflow: 'hidden'}}>
          <div style={{position: 'absolute', inset: '20% 5%', borderRadius: 2, background: rowOn ? 'linear-gradient(90deg, #62F0F2, #7FD3A6)' : '#4A45A0', opacity: rowOn ? blink : 0.45}} />
        </div>
      );
    })}
  </div>
);

// ---------------------------------------------------------------- C 站巨幕（银幕楼左面：胶片格过检）
const CineScreen: React.FC<{f: number}> = ({f}) => {
  const power = EASE.clamp01((f - 312) / 6);
  const checks = [318, 323, 328].map((cf) => f >= cf);
  return (
    <div style={{position: 'absolute', inset: '7% 9%', borderRadius: 6, background: '#1A1840', boxShadow: 'inset 0 0 0 2px rgba(251,250,255,0.16)', opacity: 0.35 + 0.65 * power, overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: '8% 7% 22% 7%', display: 'flex', gap: '6%'}}>
        {[0, 1, 2].map((i) => {
          const lit = checks[i];
          return (
            <div key={i} style={{flex: 1, borderRadius: 3, position: 'relative', background: lit ? `linear-gradient(160deg, ${ISO.butter}, ${ISO.peach})` : '#34307A', boxShadow: lit ? '0 0 10px rgba(255,230,161,0.8)' : 'none'}}>
              {lit && (
                <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <svg width="46%" height="46%" viewBox="0 0 24 24"><path d="M4 13 L10 19 L20 6" fill="none" stroke="#2C2960" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: '7%', right: '7%', bottom: '8%', height: 5, borderRadius: 3, background: 'repeating-linear-gradient(90deg, #34307A 0 6px, transparent 6px 12px)'}} />
    </div>
  );
};

// ---------------------------------------------------------------- IsoBox（三面拼合 + 生长：底面→立面拉起→顶面延迟盖上）
export const IsoBox: React.FC<{def: BoxDef; f: number}> = ({def, f}) => {
  const {u, v, w, d, h, grow}: {u: number; v: number; w: number; d: number; h: number; grow: GrowT} = def;
  const back = backCorner(def.st, u, v);
  const frontX = STOX[def.st] + (u + w - (v + d)) * C30 * U;
  const frontY = STOY + (u + w + v + d) * S30 * U;
  const wallS = Math.max(0.0001, EASE.spring((f - grow.wall) / 30, 14.8, 0.61)); // 签名特征 3：立面拉起
  const wallUp = f >= grow.wall;
  const baseS = EASE.easeOutCubic((f - (grow.base - 3)) / 5);                    // 底面先落位
  const roofTau = (f - grow.roof) / 30;                                          // 顶面延迟 3 帧
  const roofS = roofTau <= 0 ? 0 : Math.min(EASE.spring(roofTau, 20, 0.5, 6), 1.06);
  const roofDy = roofTau > 0 && roofTau < 0.18 ? -7 * Math.sin((Math.PI * roofTau) / 0.18) : 0;
  const wpx = w * U, dpx = d * U, hpx = h * U;
  const z = Math.round((u + w + v + d) * 10);
  const winCols = def.win?.cols ?? 0;
  const colIgniteL = Array.from({length: winCols}, (_, c) => grow.wall + 12 + c * 3);
  const colIgniteR = Array.from({length: winCols}, (_, c) => grow.wall + 18 + c * 3);
  const ignite = RACK_IGNITE[BOXES.filter((b) => b.led).findIndex((b) => b.id === def.id)] ?? 9999;

  return (
    <div style={{position: 'absolute', left: 0, top: 0, zIndex: z}}>
      {/* 接地柔影 */}
      <div style={{position: 'absolute', left: frontX - (w + d) * U * 0.38, top: frontY - (w + d) * U * 0.19, width: (w + d) * U * 0.76, height: (w + d) * U * 0.38,
        borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(44,41,96,0.22), transparent 70%)', opacity: baseS * 0.95}} />
      {/* 底面基座（签名特征 3 第一步：略大深一档，给出「落位」的沿） */}
      {f >= grow.base - 3 && (
        <TopFace x={back.x - 0.09 * C30 * U} y={back.y - 0.09 * S30 * U} wu={w + 0.18} du={d + 0.18} bg={shade(def.top, 0.9)} radius={8} z={0}
          style={{transform: `${FACE_TOP} scale(${0.3 + 0.7 * baseS})`, opacity: 0.35 + 0.65 * baseS}} />
      )}
      {/* 立面包裹层：scaleY 自前底角拉起（左右两面挂其内） */}
      {wallUp && (
        <div style={{position: 'absolute', left: frontX, top: frontY, width: 0, height: 0, transformOrigin: '0 0', transform: `scaleY(${wallS})`, zIndex: 1}}>
          <div style={faceDiv(FACE_RIGHT, dpx, hpx, def.right, {left: 0, top: -hpx, borderRadius: 3, overflow: 'hidden'})}>
            {def.led ? <LedRack hu={h} rows={def.led.rows} ignite={ignite} f={f} /> :
              def.screen ? null :
              def.win ? <WinWall wu={d} hu={h} rows={def.win.rows} cols={winCols} colIgnite={colIgniteR} lit={def.win.lit ?? 1} f={f} /> : null}
          </div>
          <div style={faceDiv(FACE_LEFT, wpx, hpx, def.left, {left: 0, top: -hpx, borderRadius: 3, overflow: 'hidden'})}>
            {def.led ? <LedRack hu={h} rows={def.led.rows} ignite={ignite} f={f} /> :
              def.screen ? <CineScreen f={f} /> :
              def.win ? <WinWall wu={w} hu={h} rows={def.win.rows} cols={winCols} colIgnite={colIgniteL} lit={def.win.lit ?? 1} f={f} /> : null}
          </div>
        </div>
      )}
      {/* 顶面（檐口 + 顶盖，延迟盖上并骑立面顶端） */}
      {roofS > 0.001 && (
        <div style={{position: 'absolute', left: back.x, top: back.y - hpx * wallS + roofDy, transformOrigin: '0 0', transform: `scale(${Math.max(0.2, roofS)})`, zIndex: 2}}>
          <TopFace x={-0.07 * C30 * U} y={-0.07 * S30 * U} wu={w + 0.14} du={d + 0.14} bg={shade(def.top, 1.03)} radius={9}
            style={{boxShadow: 'inset 0 0 0 2px rgba(44,41,96,0.05)'}} />
          <TopFace x={0} y={0} wu={w} du={d} bg={def.top} radius={8} style={{boxShadow: 'inset 0 0 0 2px rgba(44,41,96,0.06)'}} />
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- 地台瓦片（环序坠落归位，2px 缝）
const TILE_BG: Record<TileDef['kind'], string> = { plaza: '#F4F1FD', mint: '#C9EBDD', butter: '#FFEFCE', road: '#9A94DA' };
export const Tiles: React.FC<{st: 'A' | 'B' | 'C'; f: number}> = ({st, f}) => (
  <>
    {TILES.filter((t) => t.st === st).map((t, i) => {
      const tau = f - t.t0;
      if (tau < -0.26 * 30) return null;
      const s = (U - 4) / U;
      const back = backCorner(st, t.u, t.v);
      const y0 = back.y + (1 - s) * S30 * U;
      let tr = '';
      if (tau < 0) {
        const u0 = (tau / 30 + 0.26) / 0.26;
        tr = `translateY(${-1.8 * U * (1 - u0 * u0)}px) scale(${1 + 0.05 * u0 * u0})`;
      } else if (tau < 5) {
        tr = `translateY(${0.05 * U * Math.sin((Math.PI * tau) / 30 / 0.14)}px)`;
      }
      return (
        <div key={i} style={{position: 'absolute', left: back.x, top: y0, transformOrigin: '0 0', transform: tr, zIndex: Math.round((t.u + t.v) * 10)}}>
          <TopFace x={0} y={0} wu={s} du={s} bg={TILE_BG[t.kind]} radius={9}
            inner={t.kind === 'road' ? (
              <div style={{position: 'absolute', left: '13%', right: '13%', top: '44%', height: '12%', borderRadius: 2, background: 'repeating-linear-gradient(90deg, rgba(251,250,255,0.85) 0 17%, transparent 17% 34%)'}} />
            ) : undefined} />
        </div>
      );
    })}
  </>
);

// ---------------------------------------------------------------- 树（正交投影下球冠=圆；干=微柱）
export const TreeIso: React.FC<{x: number; y: number; s: number; col: number; appear: number; ground?: boolean; z?: number}> = ({x, y, s, col, appear, ground = true, z}) => {
  if (appear <= 0) return null;
  const sc = Math.min(appear, 1.06) * s;
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-100%) scale(${sc})`, transformOrigin: '50% 100%', zIndex: z ?? 1}}>
      {ground && <div style={{position: 'absolute', left: -16, top: 4, width: 32, height: 13, borderRadius: '50%', background: 'rgba(44,41,96,0.10)'}} />}
      <div style={{position: 'absolute', left: -3, top: -17, width: 6, height: 20, borderRadius: 2, background: ISO.trunk}} />
      <div style={{position: 'absolute', left: -16, top: -46, width: 32, height: 32, borderRadius: '50%', background: `radial-gradient(circle at 36% 30%, ${shade(ISO.leaf[col], 1.14)}, ${ISO.leaf[col]} 56%, ${shade(ISO.leaf[col], 0.8)})`}} />
    </div>
  );
};

// ---------------------------------------------------------------- 小车（三面微盒沿路带行驶）
const CAR_COLS = ['#FF9E86', '#FBFAFF', '#74A9F2', '#FFE6A1'];
export const CarIso: React.FC<{st: 'A' | 'B' | 'C'; f: number; idx: number}> = ({st, f, idx}) => {
  const car = CARS[idx];
  if (!car || car.st !== st) return null;
  const p = EASE.clamp01((f - car.f0) / (car.f1 - car.f0));
  if (p <= 0.001 || p >= 0.999) return null;
  const u = car.u0 + p * 12;
  const X = STOX[st] + (u - car.v) * C30 * U;
  const Y = STOY + (u + car.v) * S30 * U;
  const col = CAR_COLS[car.col];
  const s = 0.85;
  const fade = p > 0.88 ? 1 - (p - 0.88) / 0.12 : 1; // 驶出地台前淡出
  return (
    <div style={{position: 'absolute', left: 0, top: 0, zIndex: Math.round((u + car.v) * 10) + 1, opacity: fade}}>
      <div style={{position: 'absolute', left: X, top: Y}}>
        <TopFace x={-(0.34 * s * U) / 2} y={-(0.34 + 0.62) * s * S30 * U - 0.16 * U * s} wu={0.34 * s} du={0.62 * s} bg={shade(col, 1.05)} radius={4} />
        <div style={faceDiv(FACE_RIGHT, 0.62 * s * U, 0.16 * U * s, shade(col, 0.8), {borderRadius: 2})} />
        <div style={faceDiv(FACE_LEFT, 0.34 * s * U, 0.16 * U * s, col, {borderRadius: 2})} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- hero 上浮数据方块（f240-285）
export const CubeFloat: React.FC<{f: number; idx: number}> = ({f, idx}) => {
  const c = HERO_CUBES[idx];
  const t = (f - c.f0) / 42;
  if (t <= 0 || t >= 1) return null;
  const back = backCorner(c.st, c.u, c.v, 0.5 + t * 2.8);
  const s = c.s;
  const op = t < 0.15 ? t / 0.15 : 1 - EASE.easeOutCubic((t - 0.55) / 0.45);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, opacity: op, zIndex: 50}}>
      <div style={{position: 'absolute', left: back.x, top: back.y}}>
        <TopFace x={-(s * U) / 2} y={-(s + s) * S30 * U} wu={s} du={s} bg={c.col} radius={3} />
        <div style={faceDiv(FACE_RIGHT, s * U, s * U * 0.85, shade(c.col, 0.78), {borderRadius: 2})} />
        <div style={faceDiv(FACE_LEFT, s * U, s * U * 0.85, shade(c.col, 0.9), {borderRadius: 2})} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 迷你立方徽标（标题/收束卡用）
export const MiniCube: React.FC<{s: number; top?: string; left?: string; right?: string}> = ({s, top = '#FFC4AC', left = '#FF9E86', right = '#DB7A62'}) => {
  const w = s, d = s, h = s * 0.72;
  // 背角锚 (s*1.1, 0)：前顶角 = 背角 + ((w−d)·C30, (w+d)·S30 − h)
  const fx = s * 1.1 + (w - d) * C30;
  const fy = (w + d) * S30 - h;
  return (
    <div style={{position: 'relative', width: s * 2.2, height: s * 1.9}}>
      <TopFace x={s * 1.1} y={0} wu={w / U} du={d / U} bg={top} radius={3} />
      <div style={faceDiv(FACE_RIGHT, d, h, right, {left: fx, top: fy, borderRadius: 2})} />
      <div style={faceDiv(FACE_LEFT, w, h, left, {left: fx, top: fy, borderRadius: 2})} />
    </div>
  );
};
