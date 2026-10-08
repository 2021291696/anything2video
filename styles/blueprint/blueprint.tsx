import React from 'react';
import {useVideoConfig} from 'remotion';

/**
 * 工程蓝图图元库（blueprint-bridge 专用，主脚本维护）。
 * 深蓝晒图底 + 网格 + 白色工程线（实线/虚线）+ 标注尺寸线 + 图框标题栏。
 * 镜头组件 N = useCurrentFrame() + F0（F0 = ShotDef.from）。
 * 末节为 opt-in 增补（技法借鉴 lanshu-create-ai-presenter-video，MIT, cclank —— Remotion 重写），不改上文默认输出。
 */
export const BP = {
  bg0: '#0d2a4a', bg1: '#123a63', line: '#d7e8ff', dim: '#7fa8d9',
  accent: '#ffd23f', grid: 'rgba(160,200,255,.10)',
  redline: '#ff5b3a', // 修订云红线（opt-in 例外语义：工程制图 redline 惯例即红；仅修订云/引线默认用）
  headGlow: '#fff6cc', // 引线发光头芯色
};

/** 晒图底 + 网格 + 图框（挂 Main 或场景首层） */
export const BPGrid: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0,
    background: `
      repeating-linear-gradient(0deg, ${BP.grid} 0 1px, transparent 1px 40px),
      repeating-linear-gradient(90deg, ${BP.grid} 0 1px, transparent 1px 40px),
      radial-gradient(ellipse 80% 70% at 50% 45%, ${BP.bg1}, ${BP.bg0} 88%)`,
  }}>
    <div style={{position: 'absolute', inset: 16, border: `2px solid rgba(215,232,255,.5)`}} />
    <div style={{position: 'absolute', right: 30, top: 28, fontFamily: `'Exo 2','Orbitron',sans-serif`,
      fontSize: 15, letterSpacing: 4, color: 'rgba(215,232,255,.55)'}}>BLUEPRINT NO. 250-2026 · SCALE 1:200</div>
  </div>
);

/** 全局收尾：晒图褪色暗角（挂 Main） */
export const BPPost: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'radial-gradient(ellipse 95% 88% at 50% 46%, transparent 62%, rgba(2,14,30,.5) 100%)',
  }} />
);

/** 幕包装：淡入淡出 */
export const BPScene: React.FC<{N: number; f0: number; end: number; children: React.ReactNode}> = ({N, f0, end, children}) => {
  const inOp = clamp((N - f0) / 12);
  const outOp = 1 - clamp((N - (end - 14)) / 14);
  return <div style={{position: 'absolute', inset: 0, opacity: Math.min(inOp, outOp)}}>{children}</div>;
};

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (t: number) => 1 - Math.pow(1 - clamp(t), 1.6);

// ---- opt-in 增补的缓动/杂凑工具（与既有 ease 并存；秒为单位的调用方先除以 fps）----
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** 线性进度 pr(t, a, d)：t 秒自 a 起 d 秒内的 0..1（lanshu 惯例命名）。 */
const pr = (t: number, a: number, d: number) => clamp01((t - a) / d);
const easeOutQuad = (n: number, dur = 1) => {
  const u = clamp01(n / dur);
  return 1 - (1 - u) * (1 - u);
};
const easeInOutQuad = (n: number, dur = 1) => {
  const u = clamp01(n / dur);
  return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
};
const easeInOutCubic = (n: number, dur = 1) => {
  const u = clamp01(n / dur);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
};
/** 确定性杂凑 → 0..1（禁 Math.random/Date；种子走这里）。 */
export const bpHash = (seed: number): number => {
  let x = (Math.imul(Math.floor(seed * 1000) | 0, 374761393) + 668265263) >>> 0;
  x = (x ^ (x >>> 13)) >>> 0;
  x = Math.imul(x, 1274126177) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};
/** 恒速慢推（lanshu v7 recap 手法）：k = easeOutQuad(pr(t,S,0.6))*0.1 + 0.9*pr(t,S,End-S)——
 *  90% 线性分量恒速慢推、结尾不归于静止；总结帧 scale(1+0.03*k) 用。t/S/End 均为秒。 */
export const easeConstantPush = (t: number, S: number, End: number): number =>
  easeOutQuad(pr(t, S, 0.6)) * 0.1 + 0.9 * pr(t, S, End - S);

/** 工程线：画入（len 帧），dashed=true 时为虚线（隐藏结构） */
export const BPLine: React.FC<{
  d: string; N: number; f0: number; len?: number; w?: number; color?: string; dashed?: boolean; opacity?: number; delay?: number;
}> = ({d, N, f0, len = 24, w = 5, color = BP.line, dashed = false, opacity = 0.95, delay = 0}) => {
  const t = ease(clamp((N - f0 - delay) / len));
  if (t <= 0) return null;
  return (
    <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, opacity: opacity * t}}>
      <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round"
        strokeDasharray={dashed ? '18 12' : `${2000}`} strokeDashoffset={dashed ? 0 : 2000 * (1 - t)} />
    </svg>
  );
};

/** 尺寸标注线：两端箭头 + 中间数字，工程图签名元素。
 *  opt-in 增强（默认路径不变）：`arch` 启用 45° 建筑起止符（tick 方向 ((dx+dy)/L,(dy-dx)/L)、半长 6.3、3px）与
 *  文字强制正立（|角度|>90° 翻转）+ 文字放外侧；`off`（法向偏移 px，增强模式下默认 40）把尺寸线移离测点并
 *  画 1.5px opacity0.7 延伸线（测点+8 → 偏移+10），文字按 off 符号放线上/下方（32/-12px）。 */
export const BPDim: React.FC<{
  x0: number; y0: number; x1: number; y1: number; label: string; N: number; f0: number; color?: string;
  arch?: boolean; off?: number;
}> = ({x0, y0, x1, y1, label, N, f0, color = BP.accent, arch = false, off}) => {
  const t = ease(clamp((N - f0) / 18));
  if (t <= 0) return null;
  if (!arch && off === undefined) {
    // —— 默认路径（与历史版本逐属性一致）——
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    return (
      <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, opacity: t}}>
        <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={color} strokeWidth={2.5} />
        <circle cx={x0} cy={y0} r={4} fill={color} />
        <circle cx={x1} cy={y1} r={4} fill={color} />
        <text x={mx} y={my - 10} textAnchor="middle" fill={color} fontSize={24}
          fontFamily={`'Exo 2','Noto Sans SC',sans-serif`} fontWeight={700}>{label}</text>
      </svg>
    );
  }
  // —— 建筑制图增强路径 ——
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const o = off ?? 40;
  const ax = x0 + nx * o, ay = y0 + ny * o, bx = x1 + nx * o, by = y1 + ny * o;
  // 45° 起止符：方向 ((dx+dy)/L,(dy-dx)/L)，半长 6.3、3px
  const ux = (dx + dy) / L, uy = (dy - dx) / L, half = 6.3;
  const tk = (x: number, y: number) =>
    `M ${(x - half * ux).toFixed(1)} ${(y - half * uy).toFixed(1)} L ${(x + half * ux).toFixed(1)} ${(y + half * uy).toFixed(1)}`;
  // 文字正立：|角度|>90° 翻转；外侧：off 符号决定线上/下方 32/-12px
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  const up = Math.abs(ang) > 90 ? ang + 180 : ang;
  const away = o >= 0 ? 1 : -1;
  const flip = Math.abs(ang) > 90 ? -1 : 1;
  const shift = away * flip > 0 ? 32 : -12;
  const mx = (ax + bx) / 2, my = (ay + by) / 2;
  const ext =
    off === undefined
      ? undefined
      : `M ${(x0 + nx * 8).toFixed(1)} ${(y0 + ny * 8).toFixed(1)} L ${(ax + nx * 10).toFixed(1)} ${(ay + ny * 10).toFixed(1)} M ${(x1 + nx * 8).toFixed(1)} ${(y1 + ny * 8).toFixed(1)} L ${(bx + nx * 10).toFixed(1)} ${(by + ny * 10).toFixed(1)}`;
  return (
    <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, opacity: t}}>
      {ext !== undefined && <path d={ext} fill="none" stroke={color} strokeWidth={1.5} opacity={0.7} />}
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke={color} strokeWidth={2} />
      {arch ? (
        <path d={`${tk(ax, ay)} ${tk(bx, by)}`} fill="none" stroke={color} strokeWidth={3} />
      ) : (
        <>
          <circle cx={ax} cy={ay} r={4} fill={color} />
          <circle cx={bx} cy={by} r={4} fill={color} />
        </>
      )}
      <text x={0} y={shift} textAnchor="middle" fill={color} fontSize={24}
        fontFamily={`'Exo 2','Noto Sans SC',sans-serif`} fontWeight={700}
        transform={`translate(${mx.toFixed(1)} ${my.toFixed(1)}) rotate(${up.toFixed(2)})`}>{label}</text>
    </svg>
  );
};

/** 蓝图字（Exo2 大写 + 字距）。
 *  opt-in `words`（[[unit, tSec],...]，传了即切 ghostKaraoke 模式，text 被忽略）：逐字符"空芯→实心"点亮，
 *  每字符点亮 easeOutQuad(pr(t, at-0.03, 0.16))（提前 30ms）；未唱 rgba(215,232,255,0.17) + 1.5px 空芯描边
 *  rgba(215,232,255,0.3*(1-lit))，唱后 #d7e8ff 实心；`emphasis`（词下标数组）用 accent #ffd23f。 */
export const BPText: React.FC<{
  text?: string; N: number; f0: number; x?: number; y?: number; size?: number; color?: string; spacing?: number; opacity?: number;
  words?: [string, number][]; emphasis?: number[];
}> = ({text, N, f0, x = 640, y = 200, size = 60, color = BP.line, spacing = 8, opacity = 0.96, words, emphasis}) => {
  if (words !== undefined) {
    return <BPTextKaraoke N={N} words={words} emphasis={emphasis} x={x} y={y} size={size} spacing={spacing} opacity={opacity} />;
  }
  if (text === undefined) return null;
  const t = ease(clamp((N - f0) / 16));
  if (t <= 0) return null;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)', opacity: t * opacity,
      fontFamily: `'Exo 2','Orbitron',sans-serif`, fontWeight: 700, fontSize: size, color,
      letterSpacing: spacing, whiteSpace: 'nowrap',
    }}>{text}</div>
  );
};

/** ghostKaraoke 内部实现（独立组件：BPText 无 words 时保持零 hook）。 */
const BPTextKaraoke: React.FC<{
  N: number; words: [string, number][]; emphasis?: number[]; x?: number; y?: number; size?: number; spacing?: number; opacity?: number;
}> = ({N, words, emphasis, x = 640, y = 200, size = 60, spacing = 8, opacity = 0.96}) => {
  const {fps} = useVideoConfig();
  const t = N / fps;
  const LAT = /[A-Za-z0-9]/;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)', opacity,
      fontFamily: `'Exo 2','Orbitron',sans-serif`, fontWeight: 700, fontSize: size,
      letterSpacing: spacing, whiteSpace: 'nowrap',
    }}>
      {words.map(([unit, tu], k) => {
        const next = k + 1 < words.length ? words[k + 1][1] : tu + 0.5;
        const span = Math.min(Math.max(next - tu, 0.05), 0.07 * [...unit].length + 0.05);
        const chars = [...unit];
        const accent = emphasis !== undefined && emphasis.includes(k);
        const base = accent ? '255,210,63' : '215,232,255';
        return (
          <React.Fragment key={k}>
            {k > 0 && LAT.test(unit[0]) && LAT.test(words[k - 1][0].slice(-1)) ? ' ' : null}
            <span>
              {chars.map((ch, j) => {
                const at = tu + (span * j) / chars.length;
                const lit = easeOutQuad(pr(t, at - 0.03, 0.16)); // 提前 30ms 点亮，160ms 完成
                return (
                  <span
                    key={j}
                    style={{
                      color: `rgba(${base},${(0.17 + 0.83 * lit).toFixed(3)})`,
                      WebkitTextStroke: `1.5px rgba(${base},${(0.3 * (1 - lit)).toFixed(3)})`,
                    }}
                  >
                    {ch}
                  </span>
                );
              })}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** 图标骨架：Iconify ds 白线描边画入（draw-on）。骨架来源与许可见 src/icons.ts。 */
export const BPIcon: React.FC<{
  ds: string[]; viewBox?: string; N: number; f0: number; x: number; y: number; size: number;
  len?: number; color?: string; opacity?: number; rotate?: number; w?: number;
}> = ({ds, viewBox = '0 0 24 24', N, f0, x, y, size, len = 26, color = BP.line, opacity = 0.95, rotate = 0, w}) => {
  const t = ease(clamp((N - f0) / len));
  if (t <= 0) return null;
  const [vx, vy, vw, vh] = viewBox.split(/\s+/).map(Number);
  const scale = size / Math.max(vw, vh);
  const sw = w ?? Math.max(vw, vh) / 40;
  return (
    <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, opacity: opacity * t}}>
      <g transform={`translate(${(x - size / 2).toFixed(1)} ${(y - size / 2).toFixed(1)}) rotate(${rotate} ${size / 2} ${size / 2})`}>
        <g transform={`scale(${scale.toFixed(4)}) translate(${(-vx).toFixed(2)} ${(-vy).toFixed(2)})`}>
          <g fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
            {ds.map((d, i) => (
              <path key={i} d={d} pathLength={1} strokeDasharray={1}
                strokeDashoffset={1 - clamp(t * ds.length - i * 0.55)} />
            ))}
          </g>
        </g>
      </g>
    </svg>
  );
};

// =====================================================================
// opt-in 增补（技法借鉴 lanshu-create-ai-presenter-video，MIT, cclank —— Remotion 重写；
// DOM getTotalLength 惯用法改为解析式折线/圆弧长度，保持逐帧纯函数）。
// =====================================================================

/** 解析式折线游走：累计段长 + pointAt(d)（正交线全为轴对齐/45° 段，解析长度精确）。 */
const walkPolyline = (pts: [number, number][]) => {
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segs.push(l);
    total += l;
  }
  const pointAt = (d: number): [number, number] => {
    let rem = clamp01(total === 0 ? 0 : d / total) * total;
    for (let i = 1; i < pts.length; i++) {
      const l = segs[i - 1];
      if (rem <= l || i === pts.length - 1) {
        const u = l === 0 ? 0 : clamp01(rem / l);
        return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u];
      }
      rem -= l;
    }
    return pts[pts.length - 1];
  };
  return {total, pointAt};
};

/** 确定性火花：seed=seedBase*31+k*7.7+0.5 派生角度/速率(220+hash*520)/寿命(0.35+hash*0.35)，
 *  运动学 x=x0+vx*drag, y=y0+vy*drag+420dt²，drag=(1-e^(-3dt))/3。纯函数，逐帧重算。 */
const sparkPoints = (x0: number, y0: number, t0: number, t: number, count: number, seedBase: number) => {
  const out: {cx: number; cy: number; r: number; op: number}[] = [];
  for (let k = 0; k < count; k++) {
    const seed = seedBase * 31 + k * 7.7 + 0.5;
    const ang = (bpHash(seed) - 0.5) * Math.PI * 2;
    const sp = 220 + bpHash(seed + 1) * 520;
    const life = 0.35 + bpHash(seed + 2) * 0.35;
    const dt = t - t0;
    if (dt < 0 || dt > life) continue;
    const drag = (1 - Math.exp(-3 * dt)) / 3;
    out.push({
      cx: x0 + Math.cos(ang) * sp * drag,
      cy: y0 + Math.sin(ang) * sp * drag + 420 * dt * dt,
      r: 1.6 + bpHash(seed + 3) * 2.2,
      op: 1 - dt / life,
    });
  }
  return out;
};

const BP_MONO = `'JetBrains Mono','Consolas','Courier New',monospace`;

/** 正交折线引线束：共用垂直脊线（x=sx，自源点 (ox,oy) 水平接入）+ 12px 45° 倒角——
 *  |by-oy|<c 直连，否则 sx 处 (by∓c)→(sx∓c)→by 倒角（± 随目标在脊线左/右侧）。
 *  画入 dasharray/offset easeInOutCubic 0.36s；发光头 r9 #fff6cc + drop-shadow(0 0 12px accent) 骑在
 *  折线 pointAt(u*len)（u≥1 隐）；终点确定性 sparks；`flow`（秒）起 3 点流光相位 ((t-t0)*0.75+j/3)%1。
 *  逐目标错峰 start + i*step（start/step 为秒）。 */
export const BPLeader: React.FC<{
  ox: number; oy: number; sx: number;
  targets: {bx: number; by: number; label?: string; lx?: number; ly?: number}[];
  N: number;
  color?: string;
  w?: number; // 线宽，默认 3
  start?: number; // 首条起始秒（默认 0）
  step?: number; // 逐条错峰秒（默认 0.16）
  sparkCount?: number; // 默认 12；0 关
  flow?: number; // 流光起始秒（不传 = 关）
  opacity?: number;
}> = ({ox, oy, sx, targets, N, color = BP.accent, w = 3, start = 0, step = 0.16, sparkCount = 12, flow, opacity = 1}) => {
  const {fps} = useVideoConfig();
  const t = N / fps;
  if (t < start) return null; // 首条未起前整层不渲
  const C = 12; // 45° 倒角边
  const paths = targets.map((tg, i) => {
    const {bx, by} = tg;
    const sg = Math.sign(by - oy) || 1;
    const dir = Math.sign(bx - sx) || 1;
    const pts: [number, number][] =
      Math.abs(by - oy) < C
        ? [[ox, oy], [sx, oy], [sx, by], [bx, by]]
        : [[ox, oy], [sx, oy], [sx, by - sg * C], [sx + dir * C, by], [bx, by]];
    return {tg, pts, walker: walkPolyline(pts), a: start + i * step};
  });
  return (
    <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, opacity}}>
      {paths.map(({tg, pts, walker, a}, i) => {
        const u = easeInOutCubic(pr(t, a, 0.36));
        if (u <= 0) return null;
        const d = `M ${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ')}`;
        const [hx, hy] = walker.pointAt(u * walker.total);
        const [ex, ey] = pts[pts.length - 1];
        return (
          <React.Fragment key={i}>
            <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={`${walker.total.toFixed(1)} ${walker.total.toFixed(1)}`}
              strokeDashoffset={(walker.total * (1 - u)).toFixed(1)} />
            <circle cx={hx.toFixed(1)} cy={hy.toFixed(1)} r={9} fill={BP.headGlow}
              style={{filter: 'drop-shadow(0 0 12px rgba(255,210,63,1))'}}
              opacity={u > 0 && u < 1 ? 1 : 0} />
            {tg.label !== undefined && (
              <text x={tg.lx ?? ex + 18} y={tg.ly ?? ey + 8} fill={BP.line} fontSize={20}
                fontFamily={BP_MONO} opacity={pr(t, a + 0.3, 0.3)}>{tg.label}</text>
            )}
            {sparkCount > 0 && sparkPoints(ex, ey, a + 0.3, t, sparkCount, i).map((s, k) => (
              <circle key={k} cx={s.cx.toFixed(1)} cy={s.cy.toFixed(1)} r={s.r.toFixed(1)} fill={color} opacity={s.op.toFixed(3)} />
            ))}
            {flow !== undefined && [0, 1, 2].map((j) => {
              if (t < flow || u < 1) return null;
              const ph = ((t - flow) * 0.75 + j / 3) % 1;
              const [fx, fy] = walker.pointAt(ph * walker.total);
              return (
                <circle key={j} cx={fx.toFixed(1)} cy={fy.toFixed(1)} r={7} fill={color}
                  opacity={(Math.sin(Math.PI * ph) * pr(t, flow, 0.3)).toFixed(3)} />
              );
            })}
          </React.Fragment>
        );
      })}
    </svg>
  );
};

/** 修订云（redline）：输入矩形（x/y/w/h）或顺时针多边形点列 pts；逐边 n=max(1,round(len/(2r)))（r 默认 18），
 *  每泡一段圆弧 `A (len/n/2+2) (len/n/2+2) 0 0 1 x y`；draw-on easeInOutQuad 0.45s（dasharray/offset，
 *  弧长解析式：rad*2*asin(chord/(2rad))）；倒三角标签（顶点 (0,-22)/(24,18)/(-24,18)）+ mono 红字，a+0.3 起。 */
export const BPRevCloud: React.FC<{
  x?: number; y?: number; w?: number; h?: number; // 矩形（与 pts 二选一）
  pts?: [number, number][]; // 顺时针多边形（自动闭合）
  r?: number;
  tag?: string; // 修订标签（如 REV A / -12%）
  tx?: number; ty?: number; // 标签三角锚点（默认云外包右上外侧）
  N: number; f0: number;
  dur?: number; // 画入秒，默认 0.45
  color?: string; // 默认红线红（opt-in 例外语义；可改 accent 回到卡内唯一强调）
  textSize?: number;
  opacity?: number;
}> = ({x = 0, y = 0, w = 0, h = 0, pts, r = 18, tag, tx, ty, N, f0, dur = 0.45, color = BP.redline, textSize = 24, opacity = 1}) => {
  const {fps} = useVideoConfig();
  const t = N / fps;
  const a = f0 / fps;
  const u = easeInOutQuad(pr(t, a, dur));
  if (u <= 0) return null;
  const ring: [number, number][] = pts
    ? pts
    : [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const closed = [...ring, ring[0]];
  const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
  const bx = Math.min(...xs), by = Math.min(...ys), bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
  // 逐边泡弧 + 解析弧长
  let d = `M ${closed[0][0].toFixed(1)} ${closed[0][1].toFixed(1)}`;
  let total = 0;
  for (let s = 0; s < closed.length - 1; s++) {
    const [x0, y0] = closed[s], [x1, y1] = closed[s + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(len / (2 * r)));
    for (let k = 1; k <= n; k++) {
      const cx = x0 + ((x1 - x0) * k) / n, cy = y0 + ((y1 - y0) * k) / n;
      const chord = len / n;
      const rad = chord / 2 + 2;
      total += rad * 2 * Math.asin(Math.min(1, chord / (2 * rad)));
      d += ` A ${rad.toFixed(1)} ${rad.toFixed(1)} 0 0 1 ${cx.toFixed(1)} ${cy.toFixed(1)}`;
    }
  }
  const cx = tx ?? bx + bw + 30, cy = ty ?? by - 24;
  return (
    <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, opacity}}>
      <path d={d} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round"
        strokeDasharray={`${total.toFixed(1)} ${total.toFixed(1)}`}
        strokeDashoffset={(total * (1 - u)).toFixed(1)} />
      {tag !== undefined && (
        <>
          <path d={`M ${cx} ${cy - 22} L ${cx + 24} ${cy + 18} L ${cx - 24} ${cy + 18} Z`} fill="none"
            stroke={color} strokeWidth={2.5} opacity={pr(t, a + 0.3, 0.15)} />
          <text x={cx + 36} y={cy + 14} fill={color} fontSize={textSize} fontFamily={BP_MONO}
            opacity={pr(t, a + 0.35, 0.2)}>{tag}</text>
        </>
      )}
    </svg>
  );
};
