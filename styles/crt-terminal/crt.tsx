import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';

// 【候选风格·图纸】crt-terminal 图元库 —— 磷光 CRT 终端
// 调色板锁死（CRT_TOKENS，只用这些色 + 黑白）；一切内容都是"终端里打出来的字符"。
// 约束：最小字号 22px（CRT_MIN_FONT）；动画全部是帧号 N 的纯函数；
// 随机只用 crtHash 种子哈希（禁 Math.random / Date）；琥珀色只允许出现在 WARN 警示联动窗口
// （WARN 行 + 进度条 8f 同步闪，同一时刻、同一次警示事件）。
export const CRT_TOKENS = {
  bg: '#050a06',
  phosphor: '#33ff66',
  dim: '#1a8f3c',
  amber: '#ffb000',
};

export const CRT_FONT = "'Consolas','Courier New',monospace";
export const CRT_MIN_FONT = 22;

/** 确定性伪随机：整数种子 → [0,1)。禁止 Math.random / Date。 */
export const crtHash = (seed: number): number => {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** 线性坡道：f0→f1 之间 0→1，端点钳制。 */
export const ramp = (n: number, f0: number, f1: number): number =>
  n <= f0 ? 0 : n >= f1 ? 1 : (n - f0) / (f1 - f0);

/** easeOutCubic。 */
export const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

/** 荧光晕 textShadow：glow 0..1.2 调制；分层低透明度晕环，字色保持磷光绿（白芯不糊）。 */
export const phosphorGlow = (glow = 1): string => {
  const g = Math.max(0, Math.min(1.2, glow));
  return [
    `0 0 ${(5 + 5 * g).toFixed(1)}px rgba(51,255,102,${(0.5 * g).toFixed(3)})`,
    `0 0 ${(16 + 12 * g).toFixed(1)}px rgba(51,255,102,${(0.3 * g).toFixed(3)})`,
    `0 0 ${(40 + 24 * g).toFixed(1)}px rgba(51,255,102,${(0.16 * g).toFixed(3)})`,
  ].join(',');
};

/** 荧光呼吸：4 秒（120f @30fps）周期 ±amp 亮度微脉冲，全片贯穿；确定性 sin，N 纯函数。 */
export const phosphorBreath = (n: number, period = 120, amp = 0.05): number =>
  1 + amp * Math.sin((2 * Math.PI * n) / period);

/**
 * CrtScreen —— CRT 整屏底座（Post 层顺序：荧光微光 → children → 亮度脉冲 → 滚动亮带 →
 * 扫描线 → 曲率暗角 → 玻璃边内阴影）。
 * - glow：荧光从中心点亮的强度 0..1（开机段动画）；
 * - vignette：曲率暗角强度 0..1（收尾段加大）；
 * - flash：整屏亮度脉冲 0..1（进度满格瞬间）；
 * - 圆角 28px + 内阴影模拟玻璃曲面边缘，圆角外透出合成黑底 = 显像管边框错觉。
 */
export const CrtScreen: React.FC<{
  glow?: number;
  vignette?: number;
  flash?: number;
  children?: React.ReactNode;
}> = ({glow = 1, vignette = 0.55, flash = 0, children}) => {
  const n = useCurrentFrame();
  // 慢速滚动亮带：每 900 帧（30s）自上而下扫一遍，CRT 刷新感（确定性）
  const rollY = -260 + 980 * ((n % 900) / 900);
  return (
    <AbsoluteFill style={{backgroundColor: CRT_TOKENS.bg, overflow: 'hidden', borderRadius: 28}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 72% 62% at 50% 46%, rgba(51,255,102,${(0.16 * glow).toFixed(3)}) 0%, rgba(26,143,60,${(0.07 * glow).toFixed(3)}) 46%, rgba(0,0,0,0) 74%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 130% 80% at 50% 112%, rgba(51,255,102,${(0.07 * glow).toFixed(3)}) 0%, rgba(0,0,0,0) 60%)`,
        }}
      />
      {children}
      {flash > 0 ? <AbsoluteFill style={{backgroundColor: CRT_TOKENS.phosphor, opacity: 0.1 * flash}} /> : null}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(51,255,102,0) 0%, rgba(51,255,102,0.045) 50%, rgba(51,255,102,0) 100%)',
          backgroundSize: '100% 260px',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: `0px ${rollY.toFixed(1)}px`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.20) 3px, rgba(0,0,0,0.20) 4px)',
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 80% 74% at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,${(0.38 * vignette).toFixed(3)}) 78%, rgba(0,0,0,${(0.74 * vignette).toFixed(3)}) 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          boxShadow: `inset 0 0 110px rgba(0,0,0,${(0.5 * vignette).toFixed(3)}), inset 0 0 26px rgba(0,0,0,${(0.32 * vignette).toFixed(3)})`,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * FastScanBand —— 偶发快速亮带（扫描线双层之快层）：比慢滚亮带更细（96px）更亮（峰值 ~0.14），
 * at 起在 dur（默认 15 帧 ≈ 0.5s）内自上而下掠过整屏后消失。全片建议只用 2 次。N 纯函数。
 */
export const FastScanBand: React.FC<{at: number; dur?: number}> = ({at, dur = 15}) => {
  const n = useCurrentFrame();
  const t = (n - at) / dur;
  if (t <= 0 || t >= 1) return null;
  const y = -96 + 816 * t;
  return (
    <AbsoluteFill
      style={{
        background:
          'linear-gradient(180deg, rgba(51,255,102,0) 0%, rgba(51,255,102,0.022) 30%, rgba(51,255,102,0.14) 55%, rgba(51,255,102,0.022) 80%, rgba(51,255,102,0) 100%)',
        backgroundSize: '100% 96px',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: `0px ${y.toFixed(1)}px`,
      }}
    />
  );
};

/**
 * Cursor —— 块状光标（内联元素，跟随文字流）。
 * 8 帧周期闪烁（on 5f / off 3f）；solid=true 时常亮（打字中）；hide 强制隐藏。
 */
export const Cursor: React.FC<{solid?: boolean; hide?: boolean; color?: string}> = ({
  solid = false,
  hide = false,
  color = CRT_TOKENS.phosphor,
}) => {
  const n = useCurrentFrame();
  const on = !hide && (solid || n % 8 < 5);
  if (!on) return null;
  return (
    <span
      style={{
        display: 'inline-block',
        width: '0.62em',
        height: '1.0em',
        backgroundColor: color,
        verticalAlign: '-0.16em',
        marginLeft: '0.08em',
        boxShadow: '0 0 10px rgba(51,255,102,0.85), 0 0 24px rgba(51,255,102,0.45)',
      }}
    />
  );
};

/**
 * Typewriter —— 逐字打字机。text/f0/spf 三参；字符串切片是 N 的纯函数：
 * k = floor((N - f0) / spf)，k∈[0, text.length]。
 * 打字中光标常亮（solid），打完转闪烁；cursorOffAt 之后光标消失（回车换行时刻）。
 */
export const Typewriter: React.FC<{
  text: string;
  f0: number;
  spf?: number;
  size?: number;
  glow?: number;
  cursorOffAt?: number;
}> = ({text, f0, spf = 2, size = 26, glow = 0.8, cursorOffAt}) => {
  const n = useCurrentFrame();
  if (n < f0) return null;
  const k = Math.max(0, Math.min(text.length, Math.floor((n - f0) / spf)));
  return (
    <div style={{fontSize: size, color: CRT_TOKENS.phosphor, textShadow: phosphorGlow(glow), whiteSpace: 'pre'}}>
      {text.slice(0, k)}
      <Cursor solid={k < text.length} hide={cursorOffAt !== undefined && n >= cursorOffAt} />
    </div>
  );
};

/**
 * LogLine —— 终端日志行。status: 'ok'（磷光 [ OK ] 标记 + 暗绿正文）/ 'warn'（琥珀整行，
 * 全片唯一 amber）/ 'none'（磷光正文）。f0 起以 3 帧快速浮现（easeOut）。
 */
export const LogLine: React.FC<{
  text: string;
  f0: number;
  status?: 'ok' | 'warn' | 'none';
  size?: number;
}> = ({text, f0, status = 'ok', size = 24}) => {
  const n = useCurrentFrame();
  if (n < f0) return null;
  const k = easeOut(ramp(n, f0, f0 + 3));
  if (status === 'ok') {
    return (
      <div style={{fontSize: size, display: 'flex', gap: 14, whiteSpace: 'pre'}}>
        <span style={{color: CRT_TOKENS.phosphor, textShadow: phosphorGlow(0.7), opacity: k}}>[ OK ]</span>
        <span style={{color: CRT_TOKENS.dim, opacity: k}}>{text}</span>
      </div>
    );
  }
  if (status === 'warn') {
    return (
      <div
        style={{
          fontSize: size,
          color: CRT_TOKENS.amber,
          textShadow: '0 0 8px rgba(255,176,0,0.5), 0 0 22px rgba(255,176,0,0.25)',
          opacity: k,
          whiteSpace: 'pre',
        }}
      >
        {text}
      </div>
    );
  }
  return (
    <div style={{fontSize: size, color: CRT_TOKENS.phosphor, textShadow: phosphorGlow(0.8), opacity: k, whiteSpace: 'pre'}}>
      {text}
    </div>
  );
};

/**
 * AsciiBar —— ASCII 进度条 `[████▓▒░░░] 67%`。
 * pct 为 N 的纯函数（由调用方算好传入）；▓▒ 为小数格过渡块；括号暗绿、条与百分数磷光。
 * warn=true 时条体与百分数整体瞬闪琥珀色（与 WARN 行联动），调用方控制闪 8 帧后回绿。
 */
export const AsciiBar: React.FC<{pct: number; cells?: number; size?: number; f0: number; warn?: boolean}> = ({
  pct,
  cells = 14,
  size = 26,
  f0,
  warn = false,
}) => {
  const n = useCurrentFrame();
  if (n < f0) return null;
  const p = Math.max(0, Math.min(100, pct));
  const filled = (p / 100) * cells;
  const full = Math.floor(filled);
  const frac = filled - full;
  const mid = full < cells ? (frac > 0.55 ? '▓' : frac > 0.2 ? '▒' : '') : '';
  const bar = '█'.repeat(full) + mid + '░'.repeat(cells - full - mid.length);
  const main = warn ? CRT_TOKENS.amber : CRT_TOKENS.phosphor;
  const glowMain = warn
    ? '0 0 8px rgba(255,176,0,0.55), 0 0 20px rgba(255,176,0,0.28)'
    : phosphorGlow(0.35);
  const glowPct = warn
    ? '0 0 8px rgba(255,176,0,0.55), 0 0 20px rgba(255,176,0,0.28)'
    : phosphorGlow(0.4);
  return (
    <span style={{fontSize: size, whiteSpace: 'pre'}}>
      <span style={{color: CRT_TOKENS.dim}}>[</span>
      <span style={{color: main, textShadow: glowMain}}>{bar}</span>
      <span style={{color: CRT_TOKENS.dim}}>{'] '}</span>
      <span style={{color: main, textShadow: glowPct}}>{`${Math.round(p)}%`}</span>
    </span>
  );
};

/**
 * AsciiBox —— ┌─┐ 框线绘制。cols×rows 为字符格数，progress 0..1 控制周长顺时针逐格点亮
 * （左上 → 顶边 → 右边（向下）→ 底边（向左）→ 左边（向上））。children 绝对居中叠在框内。
 */
export const AsciiBox: React.FC<{
  cols: number;
  rows: number;
  progress: number;
  size?: number;
  color?: string;
  children?: React.ReactNode;
}> = ({cols, rows, progress, size = 24, color = CRT_TOKENS.dim, children}) => {
  const seq: Array<[number, number]> = [];
  for (let x = 0; x < cols; x++) seq.push([x, 0]);
  for (let y = 1; y < rows - 1; y++) seq.push([cols - 1, y]);
  for (let x = cols - 1; x >= 0; x--) seq.push([x, rows - 1]);
  for (let y = rows - 2; y >= 1; y--) seq.push([0, y]);
  const shown = Math.round(Math.max(0, Math.min(1, progress)) * seq.length);
  const lit = new Set<string>();
  for (let i = 0; i < shown; i++) lit.add(`${seq[i][0]},${seq[i][1]}`);
  const glyph = (x: number, y: number): string => {
    if (!lit.has(`${x},${y}`)) return ' ';
    if (x === 0 && y === 0) return '┌';
    if (x === cols - 1 && y === 0) return '┐';
    if (x === 0 && y === rows - 1) return '└';
    if (x === cols - 1 && y === rows - 1) return '┘';
    return y === 0 || y === rows - 1 ? '─' : '│';
  };
  const lines: string[] = [];
  for (let y = 0; y < rows; y++) {
    let s = '';
    for (let x = 0; x < cols; x++) s += glyph(x, y);
    lines.push(s);
  }
  return (
    <div style={{position: 'relative', display: 'inline-block'}}>
      <pre
        style={{
          margin: 0,
          fontFamily: CRT_FONT,
          fontSize: size,
          lineHeight: 1.18,
          color,
          textShadow: '0 0 6px rgba(51,255,102,0.28)',
          whiteSpace: 'pre',
        }}
      >
        {lines.join('\n')}
      </pre>
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        {children}
      </div>
    </div>
  );
};

/**
 * GlowText —— 荧光大字。f0 起淡入（10f easeOut），可选开头 18 帧亮度闪动（crtHash 驱动）。
 * 晕层用低透明度多级 textShadow，字色保持磷光绿，白芯不糊。
 */
export const GlowText: React.FC<{
  text: string;
  size?: number;
  f0?: number;
  tracking?: number;
  flicker?: boolean;
}> = ({text, size = 56, f0 = 0, tracking = 4, flicker = false}) => {
  const n = useCurrentFrame();
  const k = easeOut(ramp(n, f0, f0 + 10));
  if (k <= 0) return null;
  const flick = flicker && n < f0 + 18 ? 0.7 + 0.3 * crtHash(n * 7 + 3) : 1;
  return (
    <div
      style={{
        fontFamily: CRT_FONT,
        fontSize: size,
        letterSpacing: tracking,
        fontWeight: 700,
        color: CRT_TOKENS.phosphor,
        textShadow: phosphorGlow(1.1 * flick),
        opacity: k,
        whiteSpace: 'pre',
      }}
    >
      {text}
    </div>
  );
};

// =====================================================================
// opt-in 扩展区（2026-10-07）：以下组件借鉴 lanshu-create-ai-presenter-video
// （MIT, cclank）v2-signal kit 的 decode / glitch / chamfered-panel 机制，
// 按本卡 Remotion 惯用法（帧号纯函数、crtNoise 确定性、锁死色板）重写。
// 全部为新增组件，默认不启用——不触碰、不改变上方任何既有组件的默认输出。
// =====================================================================

/**
 * 确定性噪声（借鉴技法配套 hash）：fract(sin(n·127.1+311.7)·43758.5453)。
 * 仅供扩展区使用，与 crtHash 并存；仍是 N 的纯函数，禁 Math.random 规则不破。
 */
export const crtNoise = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** DecodeText 乱码池（锁死）。 */
export const DECODE_POOL = '#%&*+=<>/\\|01$@?';

/** 热区类型：单区间 [起,止) 或区间数组（字符下标，含起不含止）。 */
export type DecodeHotRange = [number, number];

/** CJK/全角判定：决定乱码占位是否需要 1em 定宽防跳版。 */
const isWideChar = (c: string): boolean => c.charCodeAt(0) > 0x2e80;

/**
 * DecodeText —— 解码入场（opt-in）。
 * 文本以乱码逐字"解码"浮现：第 i 字符在 ri = t0 + dur·(0.3 + 0.7·i/(n-1)) 定稿（默认 dur=0.32s）；
 * 未定稿字符按 30 tick/s 帧轮换乱码池字形（crtNoise 确定性），dim 色显示；
 * 空格透传；CJK 槽位用 inline-block width:1em 居中占位防跳版；
 * hot 区间定稿后染 hotColor（默认 amber——**计入全片琥珀预算**）。
 */
export const DecodeText: React.FC<{
  text: string;
  f0: number;
  dur?: number;
  seed?: number;
  size?: number;
  glow?: number;
  hot?: DecodeHotRange | DecodeHotRange[];
  hotColor?: string;
}> = ({text, f0, dur = 0.32, seed = 0, size = 26, glow = 0.8, hot, hotColor = CRT_TOKENS.amber}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame < f0) return null;
  const t = frame / fps;
  const t0 = f0 / fps;
  const n = text.length;
  const done = t >= t0 + dur;
  const ranges: DecodeHotRange[] =
    hot == null ? [] : typeof hot[0] === 'number' ? [hot as DecodeHotRange] : (hot as DecodeHotRange[]);
  const inHot = (i: number): boolean => ranges.some(([a, b]) => i >= a && i < b);
  const fr = Math.floor(t * 30);
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const c = text.charAt(i);
    if (c === ' ') {
      nodes.push(c);
      continue;
    }
    const ri = t0 + dur * (0.3 + 0.7 * (n > 1 ? i / (n - 1) : 1));
    if (done || t >= ri) {
      nodes.push(
        inHot(i) ? (
          <span
            key={i}
            style={{color: hotColor, textShadow: '0 0 8px rgba(255,176,0,0.5), 0 0 22px rgba(255,176,0,0.25)'}}
          >
            {c}
          </span>
        ) : (
          <span key={i}>{c}</span>
        ),
      );
    } else {
      nodes.push(
        <span
          key={i}
          style={{
            color: CRT_TOKENS.dim,
            ...(isWideChar(c) ? {display: 'inline-block', width: '1em', textAlign: 'center'} : {}),
          }}
        >
          {DECODE_POOL.charAt(Math.floor(crtNoise(i * 7.13 + fr * 1.37 + seed) * DECODE_POOL.length))}
        </span>,
      );
    }
  }
  return (
    <div style={{fontSize: size, color: CRT_TOKENS.phosphor, textShadow: phosphorGlow(glow), whiteSpace: 'pre'}}>
      {nodes}
    </div>
  );
};

/**
 * GlitchBurst —— 转场 glitch preset（opt-in，包裹式）。
 * 只在触发窗 t∈[seam-0.034, seam+0.09)（秒，30fps 下约 4 帧）内生效：
 * SVG 位移滤镜（filterUnits/primitiveUnits=userSpaceOnUse，域=width×height 需与画面一致）：
 * 灰底 feFlood + 6 条切片合成位移图 → feDisplacementMap scale=200（R/G 通道控制横向切片错位），
 * 叠 RGB 色差（R-only / GB-only 反向 feOffset ±d + feBlend screen）与 3px accent 扫描线；
 * 每帧参数 s=fr·3.7+seamIdx·91 由 crtNoise 驱动，确定性可 seek；窗外 children 原样透传。
 * 须在已定位容器（AbsoluteFill）内包裹全屏层；同屏多实例需各自传 id。
 */
export const GlitchBurst: React.FC<{
  seams: number[];
  width?: number;
  height?: number;
  scanColor?: string;
  id?: string;
  children?: React.ReactNode;
}> = ({seams, width = 1280, height = 720, scanColor = CRT_TOKENS.phosphor, id = 'crt-glitch', children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  let on = -1;
  for (let i = 0; i < seams.length; i++) {
    const st = seams[i] / fps;
    if (t >= st - 0.034 && t < st + 0.09) on = i;
  }
  if (on < 0) return <>{children}</>;
  const fr = Math.floor(t * 30);
  const s = fr * 3.7 + on * 91;
  const amp = 1 - 0.45 * Math.max(0, Math.min(1, (t - seams[on] / fps + 0.034) / 0.124));
  const split = (8 + crtNoise(s + 11) * 10) * amp;
  const slices = [0, 1, 2, 3, 4, 5].map((j) => {
    const dir = crtNoise(s + j * 4.1 + 9) > 0.5 ? 1 : -1;
    return {
      y: Math.floor(crtNoise(s + j * 1.9) * height),
      h: 8 + Math.floor(crtNoise(s + j * 2.7 + 5) * 84),
      r: Math.round(128 + dir * (26 + crtNoise(s + j * 3.3 + 2) * 72) * amp),
    };
  });
  return (
    <>
      <svg width={0} height={0} style={{position: 'absolute', left: 0, top: 0}} aria-hidden>
        <filter
          id={id}
          x={0}
          y={0}
          width={width}
          height={height}
          filterUnits="userSpaceOnUse"
          primitiveUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood x={0} y={0} width={width} height={height} floodColor="rgb(128,128,128)" result="m0" />
          {slices.map((sl, j) => (
            <feFlood
              key={j}
              x={0}
              y={sl.y}
              width={width}
              height={sl.h}
              floodColor={`rgb(${sl.r},128,128)`}
              result={`m${j + 1}`}
            />
          ))}
          <feMerge result="map">
            <feMergeNode in="m0" />
            {slices.map((_, j) => (
              <feMergeNode key={j} in={`m${j + 1}`} />
            ))}
          </feMerge>
          <feDisplacementMap in="SourceGraphic" in2="map" scale={200} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feColorMatrix in="d" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feOffset in="r" dx={split} dy={0} result="r2" />
          <feColorMatrix in="d" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb" />
          <feOffset in="gb" dx={-split} dy={0} result="gb2" />
          <feBlend in="r2" in2="gb2" mode="screen" />
        </filter>
      </svg>
      <div style={{position: 'absolute', inset: 0, filter: `url(#${id})`}}>{children}</div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: Math.floor(60 + crtNoise(s + 17) * height * 0.89),
          width: '100%',
          height: 3,
          backgroundColor: scanColor,
          boxShadow: `0 0 12px ${scanColor}`,
        }}
      />
    </>
  );
};

/** 切角常量：ChamferPanel / chamferClipPath 的默认倒角边长（px）。 */
export const CRT_CHAMFER = 18;

/** 配套 CSS clip-path 倒角（左上/右下两角切角，与 ChamferPanel 多边形一致），可独立用于任意块级元素。 */
export const chamferClipPath = (c: number = CRT_CHAMFER): string =>
  `polygon(${c}px 0, 100% 0, 100% calc(100% - ${c}px), calc(100% - ${c}px) 100%, 0 100%, 0 ${c}px)`;

/** 同上、c=CRT_CHAMFER 的常量形式。 */
export const CRT_CHAMFER_CLIP = chamferClipPath();

/**
 * ChamferPanel —— 切角面板（opt-in）。
 * SVG polygon 六点倒角（左上/右下各切 c px，可配），fill 默认卡内 surface 色（bg）、
 * stroke 默认 2px 线色（dim），可选 dash 虚线描边；children 绝对铺满面板内区。
 */
export const ChamferPanel: React.FC<{
  w: number;
  h: number;
  c?: number;
  fill?: string;
  stroke?: string;
  sw?: number;
  dash?: string;
  children?: React.ReactNode;
}> = ({w, h, c = CRT_CHAMFER, fill = CRT_TOKENS.bg, stroke = CRT_TOKENS.dim, sw = 2, dash, children}) => {
  const W = Math.max(2 * c + 2, Math.round(w));
  const H = Math.max(2 * c + 2, Math.round(h));
  return (
    <div style={{position: 'relative', display: 'inline-block', width: W, height: H}}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', left: 0, top: 0}}>
        <polygon
          points={`${c},1 ${W - 1},1 ${W - 1},${H - c} ${W - c},${H - 1} 1,${H - 1} 1,${c}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          strokeDasharray={dash}
        />
      </svg>
      <div style={{position: 'absolute', inset: 0}}>{children}</div>
    </div>
  );
};
