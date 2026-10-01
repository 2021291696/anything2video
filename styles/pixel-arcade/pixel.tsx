// 【候选风格·图纸】pixel-arcade 图元库 —— 复古像素街机
// 风格句：8px 像素网格、有限色块阵、CRT 扫描线 + 暗角、阶梯（stepped）缓动、大像素字。
// 铁律：所有"圆"都是方块拼的；位移动画一律过 stepped()/q() 量化；随机只用 rnd() 种子哈希（禁 Math.random/Date）。
import React from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

// ---- 锁死调色板（只用这 6 色 + 黑白灰）----
export const PIXEL_TOKENS = {
  bg: '#0d0f1c',
  panel: '#1a1f3a',
  magenta: '#ff3d81',
  green: '#2ee6a8',
  gold: '#ffc93c',
  white: '#f4f6ff',
};
/** 规范允许的灰阶补充（仅这两档，中性灰）。 */
export const GRAY = {l: '#a2a2a6', d: '#3c3c44'};

export const FONT_PIXEL = `'Press Start 2P', monospace`;
const QP = 4; // 像素对齐量子：所有位移最终对齐到 4px 网格

// ---- 确定性随机：rnd(i) = fract(sin(i*127.1) * 43758.5) ----
export const rnd = (i: number) => {
  const x = Math.sin(i * 127.1) * 43758.5;
  return x - Math.floor(x);
};

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** 对齐像素网格（默认 4px）。 */
export const q = (v: number, step = QP) => Math.round(v / step) * step;

/** 阶梯（stepped）缓动：把 [0,1] 进度量化成 steps 档；t≥1 补到 1。 */
export const stepped = (t: number, steps = 4) => {
  const c = clamp01(t);
  return c >= 1 ? 1 : Math.floor(c * steps) / steps;
};

/** 阶梯缩放入场：n≥startF 后每 per 帧升一档；未出现返回 0（配合 opacity/after 用）。 */
export const stepScaleIn = (n: number, startF: number, levels: number[] = [0.45, 0.7, 0.88, 1], per = 4) => {
  if (n < startF) return 0;
  return levels[Math.min(levels.length - 1, Math.floor((n - startF) / per))];
};

/** 出现开关：n≥f 返回 1，否则 0。 */
export const after = (n: number, f: number) => (n >= f ? 1 : 0);

// ---- Press Start 2P 字体（public/fonts，OFL）----
export const PixelFont: React.FC = () => {
  const [handle] = React.useState(() => delayRender('pixel-arcade-font'));
  React.useEffect(() => {
    const ff = new FontFace('Press Start 2P', `url(${staticFile('fonts/PressStart2P-Regular.ttf')})`);
    ff.load()
      .then((f) => {
        (document.fonts as unknown as {add: (f: FontFace) => void}).add(f);
        continueRender(handle);
      })
      .catch(() => continueRender(handle));
  }, [handle]);
  return null;
};

// ---- 像素大字（@font-face 已由 PixelFont 注册；宽度 ≈ 字号 × 字符数，注意溢出）----
export const PixelText: React.FC<{
  text: string;
  size?: number;
  color?: string;
  cx?: number;
  cy?: number;
  shadow?: string;
  opacity?: number;
  scale?: number;
  N?: number;
  blinkOn?: (n: number) => boolean;
  style?: React.CSSProperties;
}> = ({text, size = 22, color = PIXEL_TOKENS.white, cx = 640, cy = 360, shadow = '#000000', opacity = 1, scale = 1, N, blinkOn, style}) => {
  const blink = blinkOn && N !== undefined ? (blinkOn(N) ? 1 : 0) : 1;
  const sh = Math.max(2, Math.round(size * 0.13));
  return (
    <div
      style={{
        position: 'absolute',
        left: cx,
        top: cy,
        transform: `translate(-50%, -50%) scale(${scale})`,
        fontFamily: FONT_PIXEL,
        fontSize: size,
        lineHeight: 1.15,
        color,
        whiteSpace: 'pre',
        textShadow: `${sh}px ${sh}px 0 ${shadow}`,
        opacity: opacity * blink,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

// ---- 块阵 sprite：字符画 → 方块组（同行同色合并成一条，控 DOM）----
export const SPRITE_COLORS: Record<string, string> = {
  w: PIXEL_TOKENS.white,
  m: PIXEL_TOKENS.magenta,
  g: PIXEL_TOKENS.green,
  y: PIXEL_TOKENS.gold,
  k: '#000000',
  d: GRAY.l,
  e: GRAY.d,
};

export const PixelSprite: React.FC<{
  rows: string[];
  px: number;
  colors?: Record<string, string>;
  x?: number;
  y?: number;
  opacity?: number;
  flip?: boolean;
  style?: React.CSSProperties;
}> = ({rows, px, colors = SPRITE_COLORS, x = 0, y = 0, opacity = 1, flip, style}) => {
  const width = Math.max(...rows.map((r) => r.length));
  const cells: React.ReactNode[] = [];
  rows.forEach((row, ry) => {
    let rx = 0;
    while (rx < row.length) {
      const ch = row[rx];
      if (ch === '.' || ch === ' ') {
        rx++;
        continue;
      }
      let run = 1;
      while (rx + run < row.length && row[rx + run] === ch) run++;
      const color = colors[ch];
      if (color)
        cells.push(
          <div
            key={`${ry}-${rx}`}
            style={{position: 'absolute', left: rx * px, top: ry * px, width: run * px, height: px, backgroundColor: color}}
          />,
        );
      rx += run;
    }
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: width * px,
        height: rows.length * px,
        opacity,
        transform: flip ? 'scaleX(-1)' : undefined,
        ...style,
      }}
    >
      {cells}
    </div>
  );
};

// ---- 词汇A：像素小人（11×14 格 @ px=13 → 143×182px，腿部 3 帧摆动阶梯动画）----
export const RUNNER_A = [
  '...mmmm....',
  '..mmmmmm...',
  '..wwwwww...',
  '..wwwkkw...',
  '..wwwwww...',
  '...wwww....',
  '..mmmmmm...',
  '.wmmmmmm...',
  '.wmmmmmmw..',
  '..gggggg...',
  '..gg...gg..',
  '.gg.....gg.',
  'gg.......gg',
  'ww.......ww',
];
export const RUNNER_B = [
  '...mmmm....',
  '..mmmmmm...',
  '..wwwwww...',
  '..wwwkkw...',
  '..wwwwww...',
  '...wwww....',
  '..mmmmmm...',
  '..mmmmmm...',
  '..mmmmmm...',
  '..gggggg...',
  '...gggg....',
  '...gggg....',
  '...gg.gg...',
  '..www.www..',
];

export const PixelRunner: React.FC<{N: number; x: number; y: number; px?: number; legPeriod?: number}> = ({
  N,
  x,
  y,
  px = 13,
  legPeriod = 3,
}) => {
  const f = Math.floor(N / legPeriod) % 2;
  const bob = f === 1 ? -5 : 0;
  return <PixelSprite rows={f === 1 ? RUNNER_B : RUNNER_A} px={px} x={q(x, 2)} y={y + bob} />;
};

// ---- 词汇B 道具：金币（8×8 @ px=5 → 40px）与像素月亮（10×10 @ px=6 → 60px）----
export const SPRITE_COIN = [
  '.yyyyyy.',
  'yyyyyyyy',
  'yywwyyyy',
  'yywyyyyy',
  'yyyyyyyy',
  'yyyyyyyy',
  'yyyyyyyy',
  '.yyyyyy.',
];
const SPRITE_MOON = [
  '...yyyy...',
  '.yyyyyyyy.',
  'yyyyyyyyyy',
  'yywwyyyyyy',
  'yywwyyyyyy',
  'yyyyyyyyww',
  'yyyyyyyyww',
  'yyyyyyyyyy',
  '.yyyyyyyy.',
  '...yyyy...',
];

// ---- 金币：8×8 块阵 + 旋转高光（白色高光块绕金币外圈四相位阶梯绕圈，每相位 3f、12f 一圈）----
export const PixelCoin: React.FC<{N: number; x: number; y: number; px?: number; phase?: number}> = ({
  N,
  x,
  y,
  px = 5,
  phase = 0,
}) => {
  const m = Math.floor(((N + phase) % 12) / 3); // 0..3 相位
  const s = Math.max(6, Math.round(px * 1.5));
  const w = px * 8;
  const pos = [
    {left: w / 2 - s / 2, top: -s - 3}, // 上
    {left: w + 3, top: w / 2 - s / 2}, // 右
    {left: w / 2 - s / 2, top: w + 3}, // 下
    {left: -s - 3, top: w / 2 - s / 2}, // 左
  ][m];
  return (
    <>
      <PixelSprite rows={SPRITE_COIN} px={px} x={x} y={y} />
      <div style={{position: 'absolute', left: q(x + pos.left), top: q(y + pos.top), width: s, height: s, backgroundColor: PIXEL_TOKENS.white}} />
    </>
  );
};

// ---- 爆点 / 烟花：块阵粒子（角度均布 + 种子扰动，阶梯运动 + 阶梯消隐）----
export const PixelBurst: React.FC<{
  N: number;
  t0: number;
  x: number;
  y: number;
  colors: string[];
  n?: number;
  R?: number;
  dur?: number;
  seed?: number;
  gravity?: number;
  size?: number;
}> = ({N, t0, x, y, colors, n = 12, R = 90, dur = 24, seed = 1, gravity = 26, size = 8}) => {
  const age = N - t0;
  if (age < 0 || age > dur) return null;
  const p = stepped(age / dur, 5);
  const parts: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rnd(seed * 13 + i) * 0.8;
    const sp = R * (0.55 + 0.45 * rnd(seed * 7 + i * 3));
    const r = sp * p;
    const gx = q(x + Math.cos(ang) * r);
    const gy = q(y + Math.sin(ang) * r * 0.9 + gravity * p * p);
    const s = age < dur * 0.55 ? size : Math.max(4, size - 3);
    parts.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: gx,
          top: gy,
          width: s,
          height: s,
          backgroundColor: colors[i % colors.length],
          opacity: age < dur * 0.6 ? 1 : age < dur * 0.85 ? 0.65 : 0.3,
        }}
      />,
    );
  }
  return <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>{parts}</div>;
};

// ---- 背景：星星块阵 + 像素月亮 + 双层天际线（远=panel 剪影，近=黑体 + 金窗 + 天线灯）----
const SKY_W = 1920;
type Bld = {x: number; w: number; h: number; ant: boolean; seed: number};
const genStrip = (seed: number, count: number, wMin: number, wMax: number, hMin: number, hMax: number): Bld[] =>
  Array.from({length: count}, (_, i) => ({
    x: i * (SKY_W / count) + rnd(seed * 31 + i) * (SKY_W / count) * 0.55,
    w: wMin + rnd(seed * 17 + i * 3) * (wMax - wMin),
    h: hMin + rnd(seed * 13 + i * 7) * (hMax - hMin),
    ant: rnd(seed * 7 + i * 11) > 0.68,
    seed,
  }));

export const PixelSky: React.FC<{N: number; scrollFar?: number; scrollNear?: number; moon?: boolean; dim?: number}> = ({
  N,
  scrollFar = 0,
  scrollNear = 0,
  moon = true,
  dim = 0,
}) => {
  const far = React.useMemo(() => genStrip(101, 15, 90, 210, 130, 270), []);
  const near = React.useMemo(() => genStrip(202, 10, 115, 235, 170, 285), []);
  const stars = React.useMemo(
    () =>
      Array.from({length: 30}, (_, i) => ({
        x: q(16 + rnd(i * 3 + 1) * 1248),
        y: q(14 + rnd(i * 3 + 2) * 300),
        s: rnd(i * 5 + 3) > 0.85 ? 6 : rnd(i * 5 + 3) > 0.45 ? 4 : 3,
        gold: rnd(i * 7 + 5) > 0.86,
        period: 14 + Math.floor(rnd(i * 11 + 7) * 28),
        phase: Math.floor(rnd(i * 13 + 9) * 40),
      })),
    [],
  );
  // 特写星：3 颗 8f 周期阶梯明灭（相位 0/3/6 错峰），峰值档展开十字光芒
  const twinks = React.useMemo(
    () =>
      Array.from({length: 3}, (_, i) => ({
        x: q(140 + rnd(911 + i * 23) * 980),
        y: q(44 + rnd(917 + i * 29) * 250),
        phase: i * 3,
        gold: i === 2,
      })),
    [],
  );
  const wrap = (bx: number, s: number) => ((((bx - s) % SKY_W) + SKY_W) % SKY_W) - 260;
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      {stars.map((st, i) => {
        const on = (N + st.phase) % st.period < st.period * 0.72;
        if (!on) return null;
        return (
          <div
            key={`s${i}`}
            style={{position: 'absolute', left: st.x, top: st.y, width: st.s, height: st.s, backgroundColor: st.gold ? PIXEL_TOKENS.gold : PIXEL_TOKENS.white}}
          />
        );
      })}
      {twinks.map((tw, i) => {
        const lvl = Math.floor(((N + tw.phase) % 8) / 2); // 0..3 四档阶梯，每档 2f
        const size = [3, 5, 7, 5][lvl];
        const op = [0.35, 0.7, 1, 0.7][lvl];
        const col = tw.gold ? PIXEL_TOKENS.gold : PIXEL_TOKENS.white;
        const cx = tw.x + 3.5;
        const cy = tw.y + 3.5;
        return (
          <React.Fragment key={`t${i}`}>
            <div
              style={{position: 'absolute', left: q(tw.x + (7 - size) / 2), top: q(tw.y + (7 - size) / 2), width: size, height: size, backgroundColor: col, opacity: op}}
            />
            {lvl === 2
              ? [
                  {left: cx - 3, top: cy - 10, width: 6, height: 6},
                  {left: cx - 3, top: cy + 7, width: 6, height: 6},
                  {left: cx - 10, top: cy - 3, width: 6, height: 6},
                  {left: cx + 7, top: cy - 3, width: 6, height: 6},
                ].map((a, j) => <div key={j} style={{position: 'absolute', ...a, backgroundColor: col, opacity: 0.8}} />)
              : null}
          </React.Fragment>
        );
      })}
      {moon ? <PixelSprite rows={SPRITE_MOON} px={6} x={q(1056 - scrollFar * 0.35)} y={88} /> : null}
      {far.map((b, i) => {
        const bx = q(wrap(b.x, scrollFar));
        if (bx > 1300 || bx + b.w < -20) return null;
        return <div key={`f${i}`} style={{position: 'absolute', left: bx, top: 620 - b.h, width: b.w, height: b.h + 100, backgroundColor: PIXEL_TOKENS.panel}} />;
      })}
      {near.map((b, i) => {
        const bx = q(wrap(b.x, scrollNear));
        if (bx > 1300 || bx + b.w < -20) return null;
        const top = 720 - b.h;
        const wins: React.ReactNode[] = [];
        const cols = Math.min(4, Math.floor((b.w - 40) / 44));
        const nrows = Math.min(3, Math.floor((b.h - 44) / 36));
        for (let r = 0; r < nrows; r++)
          for (let c = 0; c < cols; c++)
            if (rnd(b.seed * 101 + i * 29 + r * 7 + c * 3) > 0.52)
              wins.push(
                <div
                  key={`w${r}${c}`}
                  style={{position: 'absolute', left: bx + 20 + c * 44, top: top + 26 + r * 36, width: 12, height: 16, backgroundColor: PIXEL_TOKENS.gold}}
                />,
              );
        return (
          <React.Fragment key={`n${i}`}>
            <div style={{position: 'absolute', left: bx, top, width: b.w, height: b.h, backgroundColor: '#000000'}} />
            {wins}
            {b.ant ? (
              <>
                <div style={{position: 'absolute', left: bx + b.w / 2 - 3, top: top - 26, width: 6, height: 26, backgroundColor: GRAY.d}} />
                {(N + i * 17) % 46 < 20 ? (
                  <div style={{position: 'absolute', left: bx + b.w / 2 - 4, top: top - 34, width: 8, height: 8, backgroundColor: PIXEL_TOKENS.magenta}} />
                ) : null}
              </>
            ) : null}
          </React.Fragment>
        );
      })}
      {dim > 0 ? <div style={{position: 'absolute', inset: 0, backgroundColor: '#000000', opacity: dim}} /> : null}
    </div>
  );
};

// ---- 楼顶跑道：黑体女儿墙 + 金色虚线檐口（词汇A 的地面）----
export const PixelRoof: React.FC = () => (
  <>
    <div style={{position: 'absolute', left: 0, right: 0, top: 560, height: 160, backgroundColor: '#000000'}} />
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 554,
        height: 5,
        background: `repeating-linear-gradient(90deg, ${PIXEL_TOKENS.gold} 0px, ${PIXEL_TOKENS.gold} 14px, rgba(0,0,0,0) 14px, rgba(0,0,0,0) 30px)`,
      }}
    />
  </>
);

// ---- CRT 开机闪（拍①专用）：点 → 横线 → 撑满 → 阶梯消隐 ----
export const CrtBoot: React.FC<{N: number; w?: number; h?: number}> = ({N, w = 1280, h = 720}) => {
  if (N >= 13) return null;
  let bw = 0;
  let bh = 0;
  let op = 1;
  if (N < 4) {
    bw = stepped((N + 1) / 4, 4) * w;
    bh = 6;
  } else if (N < 10) {
    bw = w;
    bh = Math.max(6, stepped((N - 3) / 7, 5) * h);
    op = 0.92;
  } else {
    bw = w;
    bh = h;
    op = [0.5, 0.15, 0.05][N - 10] ?? 0;
  }
  if (op <= 0.001) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: bw,
        height: bh,
        backgroundColor: '#ffffff',
        opacity: op,
        boxShadow: '0 0 40px rgba(255,255,255,0.55)',
      }}
    />
  );
};

// ---- CRT Post 层：扫描线（阶梯微闪）+ 慢滚亮带 + 暗角 + 玻璃内阴影。永远放最顶层。 ----
export const CrtPost: React.FC<{N: number}> = ({N}) => {
  const flick = Math.floor(N / 9) % 2 === 0 ? 0.24 : 0.29;
  // 开机闪完成后保留的极轻扫描线慢滚：4px/帧匀速下移（位移天然 4px 网格对齐），透明度 0.15
  const bandH = 120;
  const bandY = ((N * 4) % (720 + bandH)) - bandH;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `repeating-linear-gradient(0deg, rgba(0,0,0,${flick}) 0px, rgba(0,0,0,${flick}) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 4px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: bandY,
          height: bandH,
          pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse 78% 70% at 50% 46%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.38) 82%, rgba(0,0,0,0.72) 100%)',
        }}
      />
      <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.5)'}} />
    </>
  );
};
