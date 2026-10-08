import React from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

/**
 * target-lock · 赛博 HUD/FUI 图元库（战役 4 新卡，RECON-mg15 §22-hud）
 * 技法借鉴 mg-styles-15 demos/22-hud (MIT, Vincentwei1021)，Remotion(React+TSX) 惯用法重写，零代码拷贝。
 * 签名纪律：①scramble 字符解码（5 帧 seeded 逐位解锁）②flick 4 帧闪烁入场 [0.7,0.1,1.0,0.45]
 * ③等宽小字数据流（roll 滚动落定 / typed 打字机+光标 / sparkline）④空间化 UI（环/括号/面板/全息，非字符终端）。
 * 全部纯函数 of frame；seeded hash，禁 Math.random/Date/网络。
 */

// ---- 画布与锁死 token
export const W = 1280, H = 720, CX = 640, CY = 360, FPS = 30;
export const CYA = '#00E5FF', DIM = '#0B7C8C', DEEP = '#0E3A42', HOT = '#E8FEFF', RED = '#FF2A1F', INK = '#020A0D';
export const MONO = '"JetBrains Mono"', CHK = '"Chakra Petch"', CJKF = '"Noto Sans SC"';
/** 世界锚点：目标/候选（对齐网格，避开左右列 x64-264 / x1016-1216 与顶底栏） */
export const TARGET = {x: 760, y: 300};
export const CND_PTS = [{x: 505, y: 418}, {x: 700, y: 462}];
/** 节拍锚（帧）：与 research/beat-sheet.json 对齐 */
export const T_BOOT = 1, T_RING = 40, T_TICKS = 55, T_SEGS = 70, T_SWEEP = 45;
export const T_SIG = 150, T_TGT = 170, T_BRK = 225, T_SNAP = 242, T_LOCK = 242;
export const T_END_HOLD = 353, T_DIM = 379, TOTAL = 385;

// ---- 确定性数学（hash 为 FNV-1a 整数族，机制与 util.js 同源、重写实现）
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const prog = (f: number, f0: number, d: number) => clamp((f - f0) / d);
export const E = {
  lin: (x: number) => x,
  inQ: (x: number) => x * x,
  outQ: (x: number) => 1 - Math.pow(1 - x, 4),
  outC: (x: number) => 1 - Math.pow(1 - x, 3),
  outE: (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOutC: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  inOutQ: (x: number) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2),
};
export const D = Math.PI / 180;
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
export const sstep = (a: number, b: number, x: number) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };

// ---- HUD 词汇表（flick/blink/scramble/roll/typed：帧域重写）
export const flick = (f: number, f0: number) => {
  if (f < f0) return 0;
  const df = f - f0;
  return df >= 4 ? 1 : [0.7, 0.1, 1.0, 0.45][df];
};
export const blink = (f: number, hz: number, f0 = 0) => Math.floor(((f - f0) / FPS) * hz * 2) % 2 === 0;
export const pad = (v: number, n: number, d: number) => {
  const s = Math.abs(v).toFixed(d);
  const [i, fl] = s.split('.');
  return (v < 0 ? '-' : '') + i.padStart(n, '0') + (d ? '.' + fl : '');
};
const GL = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789#%&/<>';
/** scramble 字符解码：目标串按帧从 GL 字符集逐位解锁（n 帧全解，seeded 无随机） */
export const scramble = (f: number, f0: number, s: string, id: number, n = 5) => {
  if (f === T_SNAP) f0 = T_SNAP + 1;   // 白热冲击帧只出可读词
  const df = f - f0;
  if (df < 0) return '';
  if (df >= n) return s;
  let o = '';
  for (let i = 0; i < s.length; i++) o += s[i] === ' ' ? ' ' : (hash(id, i, df) < df / n ? s[i] : GL[Math.floor(hash(id, i, df, 9) * GL.length)]);
  return o;
};
const DIG = '0123456789';
/** roll 数字滚动：t0 前占位、n 帧随机数字位、后落定真值；null=未开始 */
export const roll = (f: number, f0: number, final: string, id = 0, nFrames = 4): string | null => {
  if (f < f0) return null;
  const df = f - f0;
  if (df >= nFrames) return final;
  let s = '';
  for (let i = 0; i < final.length; i++) {
    const c = final[i];
    s += /[0-9]/.test(c) ? DIG[Math.floor(hash(id, i, df + 7) * 10)] : c;
  }
  return s;
};
/** typed 打字机：返回可见子串 */
export const typed = (f: number, f0: number, str: string, cps = 60) => (f < f0 ? '' : str.slice(0, Math.floor(((f - f0) / FPS) * cps + 1e-6)));

// ---- 文本量宽估算（mono 0.6em / Chakra 0.55em / CJK 1em；ls 每字距）
export const tw = (s: string, size: number, o: {ls?: number; f?: string} = {}) => {
  const ls = o.ls ?? 0;
  let w = 0;
  for (const ch of s) w += (ch.charCodeAt(0) > 0x2e80 ? 1 : o.f === CHK ? 0.55 : 0.6) * size;
  return w + ls * Math.max(0, [...s].length - 1);
};
export type TextOpt = {s?: number; c?: string; a?: number; f?: string; w?: number; ls?: number; al?: 'start' | 'middle' | 'end'; op?: number};
/** T：SVG 文本元件（alpha 乘 a；al 对齐；f 字族） */
export const T = (s: string, x: number, y: number, o: TextOpt = {}): React.ReactElement => {
  if (!s) return <React.Fragment key={`t${x}${y}`} />;
  return (
    <text key={`t${x.toFixed(1)}${y.toFixed(1)}${s.slice(0, 4)}`} x={x} y={y}
      fontFamily={o.f ?? MONO} fontSize={o.s ?? 9} fontWeight={o.w ?? 600}
      letterSpacing={o.ls ?? 0} fill={o.c ?? CYA} opacity={(o.a ?? 1) * (o.op ?? 1)}
      textAnchor={o.al ?? 'start'}>{s}</text>
  );
};
/** L：线段（p 进度 0-1 从起点画到终点） */
export const L = (x0: number, y0: number, x1: number, y1: number, p = 1, o: {c?: string; w?: number; a?: number; dash?: string; cap?: string} = {}): React.ReactElement =>
  <line key={`l${x0.toFixed(0)}${y0.toFixed(0)}${x1.toFixed(0)}${y1.toFixed(0)}${p.toFixed(2)}`} x1={x0} y1={y0}
    x2={x0 + (x1 - x0) * clamp(p)} y2={y0 + (y1 - y0) * clamp(p)} stroke={o.c ?? CYA}
    strokeWidth={o.w ?? 1} opacity={o.a ?? 1} strokeDasharray={o.dash} strokeLinecap={o.cap as "butt" | "round" | "square" | undefined} />;
/** ARC：圆弧（p 进度；角度制；o.key 覆写 React key） */
export const ARC = (x: number, y: number, r: number, a0: number, a1: number, p = 1, o: {c?: string; w?: number; a?: number; dash?: string; dashOff?: number; key?: string} = {}): React.ReactElement => {
  if (p <= 0.001) return <React.Fragment key={o.key ?? `a${x}${r}`} />;
  const sweep = (a1 - a0) * Math.min(p, 1), laf = sweep > 180 ? 1 : 0;
  const x0 = x + Math.cos(a0 * D) * r, y0 = y + Math.sin(a0 * D) * r;
  const x1 = x + Math.cos((a0 + sweep) * D) * r, y1 = y + Math.sin((a0 + sweep) * D) * r;
  return <path key={o.key ?? `a${x.toFixed(0)}${y.toFixed(0)}${r.toFixed(0)}${a0.toFixed(0)}`} d={`M ${x0} ${y0} A ${r} ${r} 0 ${laf} 1 ${x1} ${y1}`}
    fill="none" stroke={o.c ?? CYA} strokeWidth={o.w ?? 1} opacity={o.a ?? 1} strokeDasharray={o.dash} strokeDashoffset={o.dashOff} />;
};
/** 括号四角 path（半边 hs、臂长 arm） */
export const bracketPaths = (x: number, y: number, hs: number, arm: number): string[] =>
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) =>
    `M ${x + sx * hs} ${y + sy * (hs - arm)} L ${x + sx * hs} ${y + sy * hs} L ${x + sx * (hs - arm)} ${y + sy * hs}`);

// ---- 字体装载（JetBrains Mono + Chakra Petch 为 OFL 本地分发，Noto Sans SC 模板附带；Main 顶层挂一次）
export const LoadHudFonts: React.FC = () => {
  const [handle] = React.useState(() => delayRender('hud-fonts'));
  React.useEffect(() => {
    const ff = (n: string, u: string, o: FontFaceDescriptors = {}) => new FontFace(n, `url(${staticFile(u)})`, o).load();
    Promise.all([
      ff('JetBrains Mono', 'fonts/JBM-600.ttf', {weight: '600'}),
      ff('JetBrains Mono', 'fonts/JBM-700.ttf', {weight: '700'}),
      ff('Chakra Petch', 'fonts/ChakraPetch-Medium.ttf', {weight: '500'}),
      ff('Chakra Petch', 'fonts/ChakraPetch-SemiBold.ttf', {weight: '600'}),
      ff('Chakra Petch', 'fonts/ChakraPetch-Bold.ttf', {weight: '700'}),
      ff('Noto Sans SC', 'fonts/NotoSansSC.ttf', {weight: '100 900'}),
    ])
      .then((fs) => { fs.forEach((f) => (document.fonts as any).add(f)); continueRender(handle); })
      .catch(() => continueRender(handle));
  }, [handle]);
  return null;
};

// ---- 帧四角 + 中边登记标（flick 入场）
export const FrameCorners: React.FC<{f: number}> = ({f}) => {
  const p = E.outE(prog(f, 3, 6));
  if (p <= 0) return null;
  const m = 27, a = 23 * p;
  return (
    <g opacity={0.9}>
      {[[m, m, 1, 1], [W - m, m, -1, 1], [W - m, H - m, -1, -1], [m, H - m, 1, -1]].map(([x, y, sx, sy], i) => (
        <path key={i} d={`M ${x} ${y + sy * a} L ${x} ${y} L ${x + sx * a} ${y}`} stroke={CYA} strokeWidth={1.2} fill="none" />
      ))}
      {L(CX - 7, m + 0.3, CX + 7, m + 0.3, 1, {c: DIM, a: 0.8})}
      {L(CX - 7, H - m - 0.3, CX + 7, H - m - 0.3, 1, {c: DIM, a: 0.8})}
      {L(m + 0.3, CY - 7, m + 0.3, CY + 7, 1, {c: DIM, a: 0.8})}
      {L(W - m - 0.3, CY - 7, W - m - 0.3, CY + 7, 1, {c: DIM, a: 0.8})}
    </g>
  );
};

// ---- 面板 chrome（角标编号 + scramble 标签 + 中文副标 + 底角刻线；错峰 t0 由调用方给）
export const PanelChrome: React.FC<{f: number; t0: number; x: number; y: number; w: number; h: number; idx: string; label: string; cn: string}> =
({f, t0, x, y, w, h, idx, label, cn}) => {
  const p = E.outC(prog(f, t0, 15));
  const a = flick(f, t0);
  if (a <= 0) return null;
  const cnA = a * E.outC(prog(f, t0 + 4, 9));
  const q = E.outC(prog(f, t0 + 9, 9));
  return (
    <g>
      {T(idx, x, y, {s: 9, c: DIM, a})}
      {T(scramble(f, t0, label, x + y), x + 16, y, {f: CHK, w: 600, s: 9.5, ls: 1.7, a})}
      {T(cn, x + w, y, {f: CJKF, w: 500, s: 9.5, ls: 1, c: DIM, al: 'end', a: cnA})}
      {L(x, y + 6.3, x + w, y + 6.3, p, {a: 0.85})}
      <rect x={x} y={y + 5.3} width={12 * p} height={2} fill={CYA} opacity={a} />
      {L(x + 0.3, y + 10.7, x + 0.3, y + h, E.outC(prog(f, t0 + 3, 15)), {c: DIM, a: 0.8})}
      {q > 0 ? (
        <g opacity={q}>
          {L(x + 0.3, y + h + 0.3, x + 8, y + h + 0.3, 1, {c: DIM, a: 0.9})}
          {L(x + w - 8, y + h + 0.3, x + w, y + h + 0.3, 1, {c: DIM, a: 0.9})}
          {L(x + w - 0.3, y + h - 8, x + w - 0.3, y + h + 0.3, 1, {c: DIM, a: 0.9})}
          {[0, 1, 2].map((i) => <rect key={i} x={x + w - 4 - i * 4.7} y={y + 9.3} width={2.7} height={2.7} fill={DIM} opacity={q} />)}
        </g>
      ) : null}
    </g>
  );
};

// ---- 顶栏（logo + 模式框 + 时钟 + REC）
export const TopBar: React.FC<{f: number}> = ({f}) => {
  const a = flick(f, 4);
  if (!a) return null;
  const y = 51;
  const locked = f >= T_LOCK, sig = f >= T_SIG;
  let mode = 'BOOT SEQUENCE', cn = '系统自检', hot = false;
  if (f >= 31) { mode = 'SEARCH'; cn = '扫描中'; }
  if (sig) { mode = 'SIGNAL DETECTED'; cn = '信号捕获'; hot = true; }
  if (locked) { mode = 'TARGET LOCKED'; cn = '目标锁定'; }
  const ch = [31, T_SIG, T_LOCK].filter((c) => f >= c).pop() ?? 4;
  const ms = ch === T_LOCK ? mode : scramble(f, ch, mode, 77 + Math.floor(ch / 3));
  const mw = tw(ms, 11.5, {f: CHK, ls: 2}), cw = tw(cn, 10.5, {ls: 2});
  const bx = CX - 120, bw = 240, by = 30, x0 = CX - (mw + 8 + cw) / 2;
  const tt = 3 * 3600 + 14 * 60 + 52 + f / FPS;
  const clk = `UTC ${pad(Math.floor(tt / 3600), 2, 0)}:${pad(Math.floor(tt / 60) % 60, 2, 0)}:${pad(Math.floor(tt) % 60, 2, 0)}.${pad(f % FPS, 2, 0)}`;
  const on = !hot || locked || blink(f, 4, T_SIG);
  const ruleP = E.inOutC(prog(f, 14, 21));
  return (
    <g>
      {/* logo：六边形 + 斜杠 */}
      <path d={[0, 60, 120, 180, 240, 300].map((an) => `${an ? 'L' : 'M'} ${(72 + 7.3 * Math.cos((an + 30) * D)).toFixed(1)} ${(44 + 7.3 * Math.sin((an + 30) * D)).toFixed(1)}`).join(' ') + ' Z'} stroke={CYA} strokeWidth={1.2} fill="none" opacity={a} />
      {L(68.7, 44.7, 75.3, 35.3, 1, {c: CYA, w: 1.2, a})}
      {T('ASTRA-7', 85, y, {f: CHK, w: 700, s: 14, ls: 2.3, a})}
      {T('哨眼-7 · 近地天体监测', 85 + tw('ASTRA-7', 14, {ls: 2.3}) + 10, y - 0.7, {f: CJKF, w: 500, s: 9.5, ls: 1.3, c: DIM, a})}
      {/* 顶线：自中心生长 */}
      {L(CX - 127, 67, 64, 67, ruleP, {c: DIM, a: 0.7})}
      {L(CX + 127, 67, W - 64, 67, ruleP, {c: DIM, a: 0.7})}
      {/* 中央模式框（切角六边） */}
      <path d={`M ${bx + 7} ${by + 0.3} L ${bx + bw - 7} ${by + 0.3} L ${bx + bw} ${by + 10.7} L ${bx + bw - 7} ${by + 21} L ${bx + 7} ${by + 21} L ${bx} ${by + 10.7} Z`} stroke={CYA} strokeWidth={0.8} fill="none" opacity={a * 0.9} />
      {locked ? <path d={`M ${bx + 7} ${by + 0.3} L ${bx + bw - 7} ${by + 0.3} L ${bx + bw} ${by + 10.7} L ${bx + bw - 7} ${by + 21} L ${bx + 7} ${by + 21} L ${bx} ${by + 10.7} Z`} fill={CYA} opacity={a * (0.16 + 0.1 * Math.exp(-(((f - T_LOCK) % 15) / FPS) * 8))} /> : null}
      {on ? <g>
        {T(ms, x0, by + 14.7, {f: CHK, w: 700, s: 11.5, ls: 2, a, c: locked ? HOT : CYA})}
        {T(cn, x0 + mw + 12, by + 14, {f: CJKF, w: 500, s: 10.5, ls: 2, a, c: locked ? HOT : CYA})}
      </g> : null}
      {/* 右侧时钟 + F 计数 + REC */}
      {T(`F ${pad(f, 4, 0)} · 30P`, W - 64, y - 14, {s: 8.7, c: DIM, al: 'end', a, ls: 0.7})}
      {T(clk, W - 64, y, {s: 10, w: 600, al: 'end', a, ls: 0.7})}
      {blink(f, 1) ? <circle cx={W - 64 - tw(clk, 10, {ls: 0.7}) - 39} cy={y - 3.3} r={3.3} fill={RED} opacity={a} /> : null}
      {T('REC', W - 64 - tw(clk, 10, {ls: 0.7}) - 27, y, {f: CHK, w: 700, s: 9.5, ls: 1.3, c: DIM, a})}
    </g>
  );
};

// ---- 底部航向带（经度/方位卷带）
export const Tape: React.FC<{f: number}> = ({f}) => {
  const p = E.inOutC(prog(f, 94, 20));
  if (p <= 0) return null;
  const lon = 205 + (f / FPS) * 1.1, y = 657, half = 220 * p, ppd = 4.7;
  const ticks: React.ReactElement[] = [];
  const labels: React.ReactElement[] = [];
  for (let d = Math.floor(lon - 47); d <= lon + 47; d++) {
    const xx = CX + (d - lon) * ppd, al = clamp(1 - Math.abs(xx - CX) / half) ** 0.7;
    if (al <= 0.02) continue;
    const big = d % 10 === 0, mid = d % 5 === 0;
    ticks.push(L(Math.round(xx) + 0.3, y, Math.round(xx) + 0.3, y + (big ? 9.3 : mid ? 6 : 3.3), 1, {c: big ? CYA : DIM, a: al}));
    if (big) {
      const dd = ((d % 360) + 540) % 360 - 180;
      labels.push(T(`${dd >= 0 ? 'E' : 'W'}${pad(Math.abs(dd), 3, 0)}`, xx, y + 20, {f: CHK, w: 600, s: 9.3, ls: 0.7, al: 'middle', c: DIM, a: al}));
    }
  }
  const hd = ((lon % 360) + 540) % 360 - 180;
  return (
    <g clipPath="url(#tapeClip)">
      <clipPath id="tapeClip"><rect x={CX - half} y={y - 13} width={half * 2} height={40} /></clipPath>
      {ticks}{labels}
      {L(CX - half, y - 0.3, CX + half, y - 0.3, 1, {c: CYA, a: 0.8})}
      <path d={`M ${CX} ${y + 1.3} L ${CX - 4} ${y - 5.3} L ${CX + 4} ${y - 5.3} Z`} fill={HOT} />
      {T(`${hd >= 0 ? 'E' : 'W'}${pad(Math.abs(hd), 3, 2)}°`, CX, y - 10.7, {s: 10.7, w: 700, al: 'middle', c: HOT, a: p})}
    </g>
  );
};

// ---- DataBits 四件套之一：sparkline（行进折线 + 信号跳升 + 端点热斑）
export const Sparkline: React.FC<{f: number; f0: number; x: number; y: number; w: number; h: number; seed: number; lab: string; unit: string; base: number; amp: number}> =
({f, f0, x, y, w, h, seed, lab, unit, base, amp}) => {
  const p = E.inOutC(prog(f, f0, 21));
  if (p <= 0) return null;
  const N = 60, pts: Array<[number, number]> = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    if (u > p) break;
    const ts = f - (1 - u) * 5, j = Math.floor(ts / 1.5);
    let v = 0.45 + 0.18 * Math.sin(ts * 0.103 + seed) + 0.12 * Math.sin(ts * 0.257 + seed * 2) + 0.14 * (hash(seed, j) - 0.5);
    if (ts > T_SIG) v += 0.42 * Math.exp(-(ts - T_SIG) * 0.04) + 0.12;
    if (ts > T_LOCK) v = 0.8 + 0.07 * Math.sin(ts * 0.3 + seed) + 0.05 * (hash(seed, j, 2) - 0.5);
    pts.push([x + u * w, y + h - clamp(v, 0.02, 0.98) * h]);
  }
  const line = pts.map(([a, b], i) => `${i ? 'L' : 'M'} ${a.toFixed(1)} ${b.toFixed(1)}`).join(' ');
  const [ex, ey] = pts[pts.length - 1];
  const v = base + amp * (1 - (ey - y) / h);
  return (
    <g>
      {[0, 0.5, 1].map((k, i) => (
        <line key={i} x1={x} y1={y + h * k + 0.3} x2={x + w} y2={y + h * k + 0.3} stroke={DEEP} strokeWidth={0.8} />
      ))}
      <path d={`${line} L ${ex.toFixed(1)} ${y + h} L ${x} ${y + h} Z`} fill={CYA} opacity={0.08} />
      <path d={line} fill="none" stroke={CYA} strokeWidth={1} />
      <rect x={ex - 1.3} y={ey - 1.3} width={2.7} height={2.7} fill={HOT} />
      {T(lab, x, y - 6, {f: CHK, w: 600, s: 9.3, ls: 1.3, c: DIM})}
      {T(`${roll(f, f0, v.toFixed(1), seed, 4) ?? ''} ${unit}`, x + w, y - 6, {s: 10.7, w: 700, al: 'end', c: HOT})}
    </g>
  );
};

// ---- RadarMini（右列 03 面板内的小雷达：环 + 十字 + 36 刻度 + 锥形余辉 + blips）
export const RadarMini: React.FC<{f: number; t0: number; rx: number; ry: number; R: number}> = ({f, t0, rx, ry, R}) => {
  const p = E.outC(prog(f, t0, 20));
  if (p <= 0) return null;
  const theta0 = -90, sweepA = (theta0 + 180 * ((f - T_SWEEP) / FPS) - 90) * D;
  const blips = [{brg: 25, r: 0.55, sig: false, id: 0}, {brg: 155, r: 0.38, sig: false, id: 1}, {brg: 41, r: 0.34, sig: true, id: 2}];
  return (
    <g>
      {[1 / 3, 2 / 3, 1].map((k, i) => <circle key={i} cx={rx} cy={ry} r={R * k} fill="none" stroke={DIM} strokeWidth={0.7} opacity={0.9} />)}
      {L(rx - R, ry + 0.3, rx + R, ry + 0.3, 1, {c: DEEP, a: 0.8})}
      {L(rx + 0.3, ry - R, rx + 0.3, ry + R, 1, {c: DEEP, a: 0.8})}
      {Array.from({length: 36}, (_, i) => {
        if (i / 36 > p) return null;
        const an = (i * 10 - 90) * D, l = i % 9 === 0 ? 4.7 : 2;
        return <line key={i} x1={rx + Math.cos(an) * (R + 1.3)} y1={ry + Math.sin(an) * (R + 1.3)}
          x2={rx + Math.cos(an) * (R + 1.3 + l)} y2={ry + Math.sin(an) * (R + 1.3 + l)}
          stroke={i % 9 === 0 ? CYA : DIM} strokeWidth={0.7} />;
      })}
      <MiniWedge f={f} rx={rx} ry={ry} R={R} sweepA={sweepA} p={p} />
      {L(rx, ry, rx + Math.cos(sweepA) * R, ry + Math.sin(sweepA) * R, 1, {c: HOT, w: 1, a: 0.95})}
      {blips.map((b, i) => {
        const since = ((((sweepA / D + 90) - b.brg) % 360) + 360) % 360 / 180;
        const age = f - T_SWEEP - ((((b.brg - theta0) % 360) + 360) % 360) / 180;
        let I = age >= 0 ? Math.exp(-since * 1.6) : 0;
        if (b.sig) I = Math.max(I, f >= T_SIG ? 0.55 + 0.45 * Math.cos((f - T_SIG) * 0.4) : 0);
        if (I <= 0.02) return null;
        const ba = (b.brg - 90) * D, bx = rx + Math.cos(ba) * R * b.r, by = ry + Math.sin(ba) * R * b.r;
        return (
          <g key={i}>
            <rect x={bx - 1.3} y={by - 1.3} width={2.7} height={2.7} fill={b.sig ? HOT : CYA} opacity={I} />
            {b.sig ? <rect x={bx - 4.3} y={by - 4.3} width={8.7} height={8.7} fill="none" stroke={HOT} strokeWidth={0.8} opacity={1} /> : null}
          </g>
        );
      })}
    </g>
  );
};

/** MiniWedge：小雷达锥形余辉（CSS conic 圆盘，绝对定位） */
export const MiniWedge: React.FC<{f: number; rx: number; ry: number; R: number; sweepA: number; p: number}> = ({f, rx, ry, R, sweepA, p}) => {
  if (f < T_SWEEP || p <= 0) return null;
  const trDeg = 66;
  const from = sweepA / D - trDeg;
  const g = `conic-gradient(from ${from.toFixed(2)}deg, rgba(0,229,255,0) 0deg, rgba(0,126,255,0.30) ${trDeg - 1}deg, rgba(0,229,255,0) ${trDeg}deg, rgba(0,229,255,0) 360deg)`;
  const d = R * 2;
  return (
    <div style={{position: 'absolute', left: rx - R, top: ry - R, width: d, height: d, borderRadius: '50%',
      background: g, opacity: 0.9 * p, transform: `rotate(${(f * 0.03).toFixed(4)}deg)`}} />
  );
};

// ---- HexGrid：六边形网格底（pattern 平铺 + 开机径向揭开 + seeded 闪烁单元）
export const HexGrid: React.FC<{f: number}> = ({f}) => {
  const rev = E.inOutC(prog(f, T_RING - 8, 30));
  if (rev <= 0) return null;
  const cells: React.ReactElement[] = [];
  for (let i = 0; i < 12; i++) {
    const col = Math.floor(hash(31, i) * 24), row = Math.floor(hash(32, i) * 15);
    const hx = col * 52 + (row % 2 ? 26 : 0) + 26, hy = row * 45 + 22;
    const twk = hash(33, i, Math.floor(f / 6)) > 0.93 ? 0.30 : 0.10;
    cells.push(<path key={i} d={hexPath(hx, hy, 13)} stroke="#155E6B" strokeWidth={0.8} fill="none" opacity={twk} />);
  }
  return (
    <div style={{position: 'absolute', inset: 0, opacity: rev, maskImage: `radial-gradient(circle at ${CX}px ${CY}px, black ${(340 * rev).toFixed(0)}px, transparent ${(560 * rev).toFixed(0)}px)`, WebkitMaskImage: `radial-gradient(circle at ${CX}px ${CY}px, black ${(340 * rev).toFixed(0)}px, transparent ${(560 * rev).toFixed(0)}px)`}}>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <defs>
          <pattern id="hexp" width="52" height="45" patternUnits="userSpaceOnUse">
            <path d={hexPath(26, 22, 13)} stroke="#0E3A42" strokeWidth={0.6} fill="none" opacity={0.55} />
            <path d={hexPath(0, 44.5, 13)} stroke="#0E3A42" strokeWidth={0.6} fill="none" opacity={0.55} />
            <path d={hexPath(52, 44.5, 13)} stroke="#0E3A42" strokeWidth={0.6} fill="none" opacity={0.55} />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#hexp)" />
        {cells}
      </svg>
    </div>
  );
};
const hexPath = (cx: number, cy: number, r: number) => [0, 60, 120, 180, 240, 300].map((an, i) => `${i ? 'L' : 'M'} ${(cx + r * Math.cos(an * D)).toFixed(1)} ${(cy + r * Math.sin(an * D)).toFixed(1)}`).join(' ') + ' Z';

// ---- 后期滤镜组（统一质感层；Main 顶层挂一次）
// tl-post：辉光双层（blur1.1 + blur4 feMerge 源图）+ 轻色差（R/B 通道 ±0.6px feOffset screen 合成）
// tl-reink：告警再上墨（feColorMatrix 线性近似源码 reink()：青族→橙红、亮部偏暖），colorInterpolation sRGB 保数值域
export const HudPostFilters: React.FC = () => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <defs>
      <filter id="tl-post" x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation="1.1" result="b1" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b2" />
        <feMerge result="glow">
          <feMergeNode in="b2" />
          <feMergeNode in="b1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
        <feColorMatrix in="glow" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="chR" />
        <feOffset in="chR" dx="0.6" dy="0" result="chRo" />
        <feColorMatrix in="glow" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="chG" />
        <feColorMatrix in="glow" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="chB" />
        <feOffset in="chB" dx="-0.6" dy="0" result="chBo" />
        <feBlend in="chRo" in2="chG" mode="screen" result="rg" />
        <feBlend in="rg" in2="chBo" mode="screen" />
      </filter>
      <filter id="tl-reink" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="1 0 0 0.95 0  0.35 0.55 0.02 0 0  0 0 0.08 0 0  0 0 0 1 0" />
      </filter>
    </defs>
  </svg>
);
