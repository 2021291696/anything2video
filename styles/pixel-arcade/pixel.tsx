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

// v4.0 opt-in props（不传=旧行为逐值一致）：
//   outline —— per-part 1px 描边（huashu 14_8bit 契约：空格块 4 邻域有实块即涂边色，每个连通部件各自出边）；
//   palette —— 色板数组，所有颜色经 paletteQuantize 最近色量化（14 色角色板可传入）。
export const PixelSprite: React.FC<{
  rows: string[];
  px: number;
  colors?: Record<string, string>;
  x?: number;
  y?: number;
  opacity?: number;
  flip?: boolean;
  outline?: string;
  palette?: string[];
  style?: React.CSSProperties;
}> = ({rows, px, colors = SPRITE_COLORS, x = 0, y = 0, opacity = 1, flip, outline, palette, style}) => {
  const width = Math.max(...rows.map((r) => r.length));
  const resolve = (c: string) => (palette && palette.length > 0 ? paletteQuantize(c, palette) : c);
  const isFilled = (ch: string) => ch !== '.' && ch !== ' ' && !!colors[ch];
  const cells: React.ReactNode[] = [];
  if (outline) {
    const filled: boolean[][] = rows.map((row) => [...row].map(isFilled));
    const nb = (cx: number, cy: number) =>
      (cx > 0 && filled[cy][cx - 1]) ||
      (cx < filled[cy].length - 1 && filled[cy][cx + 1]) ||
      (cy > 0 && cx < filled[cy - 1].length && filled[cy - 1][cx]) ||
      (cy < filled.length - 1 && cx < filled[cy + 1].length && filled[cy + 1][cx]);
    rows.forEach((row, ry) => {
      let rx = 0;
      while (rx < row.length) {
        if (filled[ry][rx]) {
          rx++;
          continue;
        }
        let x = rx;
        while (x < row.length && !filled[ry][x]) {
          let k = x;
          while (k < row.length && !filled[ry][k] && nb(k, ry)) k++;
          if (k > x) {
            cells.push(
              <div
                key={`o${ry}-${x}`}
                style={{position: 'absolute', left: x * px, top: ry * px, width: (k - x) * px, height: px, backgroundColor: outline}}
              />,
            );
            x = k;
          } else x++;
        }
        rx = Math.max(rx + 1, x);
      }
    });
  }
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
            style={{position: 'absolute', left: rx * px, top: ry * px, width: run * px, height: px, backgroundColor: resolve(color)}}
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

// ======================================================================
// v4.0 opt-in 增强（技法借鉴 mg-styles-15 demos/20-pixel (MIT, Vincentwei1021)
// 与 huashu-art-motion 14_8bit (MIT, alchaincyf), TSX 重写；登记见 SPEC「v4.0 opt-in」节）
// 本节全部为新增组件/纯函数，不触碰上方既有组件的默认行为。
// ======================================================================

/** PixelTextCJK 默认字体（项目 public/fonts 需有对应 ttf；borrow 系工程自带 NotoSansSC.ttf）。 */
export const PIXEL_CJK_FONT_FAMILY = 'Noto Sans SC';

export type GlyphMask = {w: number; h: number; m: Uint8Array; adv: number; size: number};

/** 灰度/alpha → 1bit 掩膜（两态 0/1，阈值默认 110 照抄源码 glyph()）。 */
export const maskFromAlpha = (alpha: ArrayLike<number>, threshold = 110): Uint8Array => {
  const m = new Uint8Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) m[i] = alpha[i] > threshold ? 1 : 0;
  return m;
};

/** 掩膜 → 水平同值 run 列表（块阵渲染控 DOM 用）。 */
export const maskToRuns = (m: Uint8Array, w: number, h: number): Array<{x: number; y: number; run: number}> => {
  const runs: Array<{x: number; y: number; run: number}> = [];
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      if (!m[y * w + x]) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < w && m[y * w + x + run]) run++;
      runs.push({x, y, run});
      x += run;
    }
  }
  return runs;
};

type Ctx2DLike = {
  font: string;
  fillStyle: string;
  textBaseline: string;
  fillText: (s: string, x: number, y: number) => void;
  measureText: (s: string) => {width: number};
  getImageData: (x: number, y: number, w: number, h: number) => {data: Uint8ClampedArray};
};
type CanvasFactoryResult = {ctx: Ctx2DLike};
// canvas 工厂：默认 DOM；node 单测注入 @napi-rs/canvas（setCanvasFactoryForTest）。
let canvasFactory: (w: number, h: number) => CanvasFactoryResult = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return {ctx: c.getContext('2d') as unknown as Ctx2DLike};
};
/** 仅测试环境用：替换栅格化 canvas 工厂。生产代码禁止调用。 */
export const setCanvasFactoryForTest = (f: (w: number, h: number) => CanvasFactoryResult) => {
  canvasFactory = f;
};

const cjkGlyphCache = new Map<string, GlyphMask>();
/** 清空字形掩膜缓存（仅测试用——验证同输入两次计算逐像素一致，而非命中缓存）。 */
export const clearCjkGlyphCache = () => cjkGlyphCache.clear();

/** 单字 → 1bit 掩膜（确定性：字体已加载前提下同字符同帧同输出；含 adv 步进宽）。 */
export const glyphMask = (ch: string, family: string, size: number, threshold = 110): GlyphMask => {
  const key = `${family}|${size}|${threshold}|${ch}`;
  const hit = cjkGlyphCache.get(key);
  if (hit) return hit;
  const S2 = size * 2; // 画布 2× 字号：容纳全高 CJK 字形（源码同款）
  const {ctx} = canvasFactory(S2, S2);
  ctx.font = `900 ${size}px "${family}"`;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(ch, 0, size);
  const data = ctx.getImageData(0, 0, S2, S2).data;
  const alpha = new Uint8ClampedArray(S2 * S2);
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
  const g: GlyphMask = {w: S2, h: S2, m: maskFromAlpha(alpha, threshold), adv: Math.round(ctx.measureText(ch).width), size};
  cjkGlyphCache.set(key, g);
  return g;
};

/** 渲染期字体加载断言：未加载直接 throw（回退字体=不确定位图，禁静默降级）。 */
export const assertCjkFontLoaded = (family = PIXEL_CJK_FONT_FAMILY, size = 64) => {
  if (typeof document === 'undefined' || !document.fonts) {
    throw new Error(`PixelTextCJK: document.fonts 不可用，无法断言 "${family}"（测试环境请注入 canvas 工厂并直接调 glyphMask）`);
  }
  if (!document.fonts.check(`900 ${size}px "${family}"`)) {
    throw new Error(`PixelTextCJK: 字体 "${family}" 未加载——先挂 <PixelCjkFont/>（delayRender 合同），否则栅格化不确定`);
  }
};

/** CJK 字体加载器（delayRender/continueRender 合同，同 PixelFont 模式）。 */
export const PixelCjkFont: React.FC<{family?: string; src?: string}> = ({family = PIXEL_CJK_FONT_FAMILY, src = 'fonts/NotoSansSC.ttf'}) => {
  const [handle] = React.useState(() => delayRender('pixel-arcade-cjk-font'));
  React.useEffect(() => {
    const ff = new FontFace(family, `url(${staticFile(src)})`);
    ff.load()
      .then((f) => {
        (document.fonts as unknown as {add: (f: FontFace) => void}).add(f);
        continueRender(handle);
      })
      .catch(() => continueRender(handle));
  }, [handle, family, src]);
  return null;
};

/** 像素中文（补「Press Start 2P 无 CJK」已知缺口）：任意中文字符串 → canvas 栅格化 → 阈值 → 块阵。
 * block（块径）/threshold（灰度阈值）props 化；shadow 传 1 块右下阴影 pass（null 关闭）。
 * 确定性合同：必须先挂 <PixelCjkFont/>，组件渲染时字体断言不过会 throw。 */
export const PixelTextCJK: React.FC<{
  text: string;
  size?: number;
  block?: number;
  threshold?: number;
  family?: string;
  color?: string;
  shadow?: string | null;
  x?: number;
  y?: number;
  opacity?: number;
  spacing?: number;
  style?: React.CSSProperties;
}> = ({
  text,
  size = 48,
  block = 2,
  threshold = 110,
  family = PIXEL_CJK_FONT_FAMILY,
  color = PIXEL_TOKENS.white,
  shadow = '#000000',
  x = 0,
  y = 0,
  opacity = 1,
  spacing = 0,
  style,
}) => {
  assertCjkFontLoaded(family, size);
  const cells: React.ReactNode[] = [];
  let ox = 0;
  for (const ch of text) {
    const g = glyphMask(ch, family, size, threshold);
    const runs = maskToRuns(g.m, g.w, g.h);
    if (shadow)
      for (const r of runs)
        cells.push(
          <div
            key={`s${ox}-${r.x}-${r.y}`}
            style={{position: 'absolute', left: x + ox + (r.x + 1) * block, top: y + (r.y + 1) * block, width: r.run * block, height: block, backgroundColor: shadow}}
          />,
        );
    for (const r of runs)
      cells.push(
        <div
          key={`c${ox}-${r.x}-${r.y}`}
          style={{position: 'absolute', left: x + ox + r.x * block, top: y + r.y * block, width: r.run * block, height: block, backgroundColor: color}}
        />,
      );
    ox += g.adv + spacing;
  }
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1, height: 1, opacity, pointerEvents: 'none', ...style}}>
      {cells}
    </div>
  );
};

const hex2rgb = (hex: string): [number, number, number] => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || Number.isNaN(parseInt(h, 16))) return [0, 0, 0];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

/** 最近色量化契约（加权 0.3/0.59/0.11 照抄源码 nearest()）：huashu 14 色角色板等可传入。 */
export const paletteQuantize = (color: string, palette: string[]): string => {
  const [r, g, b] = hex2rgb(color);
  let best = palette[0];
  let bd = Infinity;
  for (const p of palette) {
    const [pr, pg, pb] = hex2rgb(p);
    const d = 0.3 * (pr - r) ** 2 + 0.59 * (pg - g) ** 2 + 0.11 * (pb - b) ** 2;
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
};

/** 棋盘 (x+y)%2 抖动判定：u=by/(rows-1) 量化到 bands 档，档内以棋盘半档过渡（NES 唯一渐变法）。 */
export const ditherBandOn = (bx: number, by: number, rows: number, bands = 4): boolean => {
  if (rows < 2) return false;
  const t = (by / (rows - 1)) * bands;
  const thr = ((bx + by) & 1) === 0 ? 0.25 : 0.75;
  return t > thr;
};

/** 棋盘抖动渐变带（NES 味两色渐变）：容器铺 top 色，(x+y)%2 抖动出的 bottom 色块按行合并 run。 */
export const DitherBand: React.FC<{
  x?: number;
  y?: number;
  w: number;
  h: number;
  block?: number;
  top?: string;
  bottom?: string;
  bands?: number;
  opacity?: number;
}> = ({x = 0, y = 0, w, h, block = 4, top = PIXEL_TOKENS.bg, bottom = PIXEL_TOKENS.panel, bands = 4, opacity = 1}) => {
  const cols = Math.ceil(w / block);
  const rows = Math.ceil(h / block);
  const cells: React.ReactNode[] = [];
  for (let by = 0; by < rows; by++) {
    let bx = 0;
    while (bx < cols) {
      if (!ditherBandOn(bx, by, rows, bands)) {
        bx++;
        continue;
      }
      let run = 1;
      while (bx + run < cols && ditherBandOn(bx + run, by, rows, bands)) run++;
      cells.push(
        <div
          key={`${by}-${bx}`}
          style={{position: 'absolute', left: x + bx * block, top: y + by * block, width: run * block, height: block, backgroundColor: bottom}}
        />,
      );
      bx += run;
    }
  }
  return (
    <div style={{position: 'absolute', left: x, top: y, width: cols * block, height: rows * block, backgroundColor: top, opacity, pointerEvents: 'none'}}>
      {cells}
    </div>
  );
};

// ---- PixelLogo 块字构造器（行深浅 + 4 cell 挤出 + 角部 glint；参数照抄源码 buildLogo5）----
export type LogoColors = {
  hi: string; // 顶缘提亮 / ramp 最亮档
  up: string; // ramp 次亮档
  mid: string; // ramp 中档
  low: string; // ramp 最深档
  ext: string; // 挤出柱色
  extTip: string; // 挤出尖端色
  outline: string; // 1 cell 外描边
  glint: string; // glint 星芒臂色
  glintCore: string; // glint 星芒芯色
};
/** 默认色照抄 QUEST-32 ramp（源码 M15/M14/M13/M12/M26/M9/M0/M7/白）——仅本组件使用，见 SPEC 声明。 */
export const LOGO_COLORS: LogoColors = {
  hi: '#fff3b0',
  up: '#ffd166',
  mid: '#f59a4a',
  low: '#e8665a',
  ext: '#7a1f2e',
  extTip: '#3b1f47',
  outline: '#0d0b1a',
  glint: '#c8ecff',
  glintCore: '#ffffff',
};
/** 行深浅 ramp（r=行位×28/墨高 归一化，阈值 2/10/14/21/24 与棋盘混色照抄源码）。 */
export const logoRowColor = (r: number, x: number, y: number, C: LogoColors): string => {
  if (r < 2) return C.hi;
  if (r < 10) return C.up;
  if (r < 14) return (x + y) & 1 ? C.up : C.mid;
  if (r < 21) return C.mid;
  if (r < 24) return (x + y) & 1 ? C.mid : C.low;
  return C.low;
};

export type PixelLogoGrid = {
  w: number;
  h: number;
  grid: (string | null)[]; // 每 cell 颜色（null=空）
  glints: Array<{x: number; y: number}>; // 角部 glint 点（cell 坐标，已按 x 排序取分位）
};

/** 块字栅格构造：文字→字形掩膜→cell 块阵→行深浅 ramp→顶/左缘提亮→挤出→外描边→glint 角收集。纯函数（字形缓存共享）。 */
export const buildPixelLogoGrid = (
  text: string,
  opts: {cell?: number; ext?: number; gap?: number; size?: number; threshold?: number; family?: string; colors?: LogoColors} = {},
): PixelLogoGrid => {
  const cell = opts.cell ?? 4;
  const ext = opts.ext ?? 4;
  const gapCells = opts.gap ?? 2;
  const size = opts.size ?? 48;
  const C = opts.colors ?? LOGO_COLORS;
  const family = opts.family ?? PIXEL_CJK_FONT_FAMILY;
  const gs = [...text].map((ch) => glyphMask(ch, family, size, opts.threshold ?? 110));
  const cols: Array<[number, number]> = [];
  let top = 1e9;
  let bot = -1;
  for (const g of gs) {
    let l = 1e9;
    let r = -1;
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++)
        if (g.m[y * g.w + x]) {
          top = Math.min(top, y);
          bot = Math.max(bot, y);
          l = Math.min(l, x);
          r = Math.max(r, x);
        }
    cols.push([l, r]);
  }
  const inkH = bot - top + 1;
  const gw = cols.map(([l, r]) => (r - l + 1) * cell);
  const w = gw.reduce((a, c) => a + c, 0) + Math.max(0, gs.length - 1) * (1 + gapCells) * cell + 2;
  const h = inkH * cell + ext + 2;
  const mask = new Uint8Array(w * h);
  const rowN = new Int16Array(w * h).fill(-1);
  let ox = 1;
  const sc = 28 / inkH; // 归一化到源码 28 行参照
  gs.forEach((g, gi) => {
    const [l, r] = cols[gi];
    for (let j = top; j <= bot; j++)
      for (let i = l; i <= r; i++)
        if (g.m[j * g.w + i])
          for (let yy = 0; yy < cell; yy++)
            for (let xx = 0; xx < cell; xx++) {
              const p = (1 + (j - top) * cell + yy) * w + ox + (i - l) * cell + xx;
              mask[p] = 1;
              rowN[p] = (j - top) * cell + yy;
            }
    ox += gw[gi] + (1 + gapCells) * cell;
  });
  const grid: (string | null)[] = new Array(w * h).fill(null);
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && !!mask[y * w + x];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      const r = rowN[y * w + x] * sc;
      let c = logoRowColor(r, x, y, C);
      if (!at(x, y - 1)) c = C.hi;
      else if (!at(x - 1, y) && r < 16) c = C.hi;
      grid[y * w + x] = c;
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = 0; x < w; x++)
      if (mask[y * w + x])
        for (let d = 1; d <= ext; d++) {
          const yy = y + d;
          if (yy < h && !mask[yy * w + x] && !grid[yy * w + x]) grid[yy * w + x] = d < ext ? C.ext : C.extTip;
        }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (!grid[y * w + x]) {
        const n = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < w && yy < h && !!grid[yy * w + xx];
        if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) grid[y * w + x] = C.outline;
      }
  // 角部 glint：左上笔画角（无上邻且无左邻的墨点）按 x 排序取 5 分位（源码分位数照抄）
  const cn: Array<{x: number; y: number}> = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (mask[y * w + x] && !at(x, y - 1) && !at(x - 1, y)) cn.push({x, y});
  cn.sort((a, b) => a.x - b.x);
  const glints = [0.04, 0.78, 0.36, 0.96, 0.58].map((u) => cn[Math.min(cn.length - 1, Math.floor(u * cn.length))]);
  return {w, h, grid, glints};
};

// glint 星芒三档（cell 阵，u=臂色 w=芯色；9f 周期 轮换角点，a<6 可见——源码 spark 节奏照抄）
const GLINT_SPARKS = [
  {rows: ['.u.', 'uwu', '.u.']},
  {rows: ['..w..', '..u..', 'wuwuw', '..u..', '..w..']},
  {rows: ['...w...', '...u...', '...u...', 'wuuwuuw', '...u...', '...u...', '...w...']},
];

/** 块字 LOGO：行深浅 + 挤出 + 角部闪光。N 提供时 glint 星芒按 9f 周期轮换（确定性，禁随机）。 */
export const PixelLogo: React.FC<{
  text: string;
  N?: number;
  glintFrom?: number;
  x?: number;
  y?: number;
  cell?: number;
  ext?: number;
  gap?: number;
  size?: number;
  threshold?: number;
  family?: string;
  colors?: Partial<LogoColors>;
  opacity?: number;
}> = ({text, N, glintFrom = 0, x = 0, y = 0, cell = 4, ext = 4, gap = 2, size = 48, threshold = 110, family, colors, opacity = 1}) => {
  const C: LogoColors = {...LOGO_COLORS, ...colors};
  const logo = React.useMemo(() => buildPixelLogoGrid(text, {cell, ext, gap, size, threshold, family, colors: C}), [text, cell, ext, gap, size, threshold, family, C]);
  const cells: React.ReactNode[] = [];
  for (let ry = 0; ry < logo.h; ry++) {
    let rx = 0;
    while (rx < logo.w) {
      const col = logo.grid[ry * logo.w + rx];
      if (!col) {
        rx++;
        continue;
      }
      let run = 1;
      while (rx + run < logo.w && logo.grid[ry * logo.w + rx + run] === col) run++;
      cells.push(
        <div key={`${ry}-${rx}`} style={{position: 'absolute', left: rx * cell, top: ry * cell, width: run * cell, height: cell, backgroundColor: col}} />,
      );
      rx += run;
    }
  }
  const sparks: React.ReactNode[] = [];
  if (N !== undefined && N >= glintFrom) {
    const k = N - glintFrom;
    const g = Math.floor(k / 9) % Math.max(1, logo.glints.length);
    const a = k % 9;
    if (a < 6 && logo.glints.length > 0) {
      const sp = GLINT_SPARKS[a < 2 ? 0 : a < 4 ? 2 : 1].rows;
      const pt = logo.glints[g];
      sp.forEach((row, sy) => {
        [...row].forEach((ch, sx) => {
          if (ch === '.') return;
          sparks.push(
            <div
              key={`g${sy}-${sx}`}
              style={{
                position: 'absolute',
                left: x + pt.x * cell + (sx - (row.length - 1) / 2) * cell,
                top: y + pt.y * cell + (sy - (sp.length - 1) / 2) * cell,
                width: cell,
                height: cell,
                backgroundColor: ch === 'w' ? C.glintCore : C.glint,
              }}
            />,
          );
        });
      });
    }
  }
  return (
    <div style={{position: 'absolute', left: x, top: y, width: logo.w * cell, height: logo.h * cell, opacity, pointerEvents: 'none'}}>
      {cells}
      {sparks.length > 0 ? <div style={{position: 'absolute', left: 0, top: 0}}>{sparks}</div> : null}
    </div>
  );
};
