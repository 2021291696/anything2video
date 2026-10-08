import React from 'react';

// =====================================================================
// kinetic-type 图元库 —— 信息排版动态字体（kinetic typography）
// 世界观：字是演员。文字本身就是运动主体；一屏一焦点；词落定后不动。
// 与 hanazi-916 的差异边界（SPEC 同步）：hanazi=综艺情绪花字（五层描边/挤出/高光/情绪框/音效绑定的
// 「贴纸堆叠」世界）；本卡=结构信息排版（平涂实底/字槽对位/词性分级/一屏一焦点）。共享的只有
// 「弹簧参数族 + textEm 确定性测宽」这套底层手感（参数族源自 mg-styles-15 demos/18-hanazi，MIT），
// 层栈/描边/情绪语义零复用。
// 借鉴登记：
//   - maskRise 遮罩升起机制：借鉴本仓 styles/swiss-print/swiss.tsx（技法借鉴
//     lanshu-create-ai-presenter-video, MIT, cclank）——overflow:hidden 容器 + 词 span
//     translateY(105%→0) easeOutCubic。本卡重写为「槽位升起」：每词先有确定性槽位框（dashed），
//     词从槽内下方升起，落定后槽框收回——「从槽里升起」是本卡签名，不是行内排版。
//   - slam 砸入（scale slam+微震+冲击环）与 emphasis 脉冲：本卡原创参数，弹簧手感借鉴
//     hanazi 弹字参数族（spring ζ=0.517/ω=22 族的半波简化重写）。
// 硬约束：严格四色 token（奶油白/纯黑/橙红/宝蓝）+ 连接词用 ink 的透明度档（不引入第五色相）；
//   纯平（无渐变/无阴影/无 glow 滤镜——「句号微光」用径向衬底圆实现）；随机一律 ktHash
//   种子杂凑（禁 Math.random/Date/网络）；全部运动 = 纯帧号 u 的解析函数，seek(t) 可复现。
// =====================================================================

/** 锁死四色（RECON-pm-watch §2.3 zheke 帧自证：奶油白/纯黑/橙红/宝蓝实底系统）。 */
export const KT = {
  paper: '#F5F0E6', // 奶油白
  ink: '#141414', // 纯黑
  vermilion: '#E8442A', // 橙红（主词专属强调色）
  royal: '#2B3FD6', // 宝蓝
} as const;
export type KtColor = (typeof KT)[keyof typeof KT];

export const KT_W = 1280;
export const KT_H = 720;
export const KT_FONT = `'Noto Sans SC', 'PingFang SC', sans-serif`;

// ---- 确定性杂凑（任何"随机"都走这里；逐帧可复现） ----
export const ktHash = (seed: number, i = 0): number => {
  let x = (Math.imul(seed | 0, 2654435761) + Math.imul(i | 0, 1597334677)) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 2246822519) >>> 0;
  x = (x ^ (x >>> 13)) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296; // → 0..1
};

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
export const easeOutCubic = (p: number): number => 1 - Math.pow(1 - clamp01(p), 3);
export const easeInOutCubic = (p: number): number => {
  const t = clamp01(p);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeInQuad = (p: number): number => clamp01(p) * clamp01(p);

// ---- 确定性测宽（CJK=1em 全角；拉丁/数字查简化表；不量 DOM） ----
const charEm = (ch: string): number => {
  const c = ch.codePointAt(0) ?? 32;
  if (c >= 0x2e80) return 1.0; // CJK 表意文字 + 全角标点（，。）
  if (ch === ' ') return 0.3;
  if (ch >= '0' && ch <= '9') return 0.556;
  if (ch >= 'A' && ch <= 'Z') return 0.72;
  if (ch >= 'a' && ch <= 'z') return 0.56;
  return 0.5;
};
export const ktTextW = (text: string, size: number, trackingEm = 0): number => {
  const chars = [...text];
  let em = 0;
  for (const ch of chars) em += charEm(ch);
  return em * size + chars.length * trackingEm * size;
};

// ---- 词性分级（签名⑤：主词/名词词组/连接词/标点 四档视觉层级） ----
export type Rank = 'main' | 'noun' | 'conn' | 'punct';
export const rankWeight = (r: Rank): number => (r === 'conn' ? 500 : 900);

export type WordSpec = {t: string; rank: Rank; size: number; gapAfter?: number};
export type WordBox = WordSpec & {x: number; y: number; w: number; h: number; cx: number};

/** 行排版：给定词组与行视觉中心 y，从画布水平居中起顺序排布，返回确定性槽位框。 */
export const layoutLine = (words: WordSpec[], centerY: number, trackingEm = 0): WordBox[] => {
  const gaps = words.map((w) => (w.gapAfter !== undefined ? w.gapAfter : Math.round(w.size * 0.24)));
  const ws = words.map((w) => ktTextW(w.t, w.size, trackingEm));
  const totalW = ws.reduce((a, b) => a + b, 0) + gaps.slice(0, -1).reduce((a, b) => a + b, 0);
  let x = (KT_W - totalW) / 2;
  return words.map((w, i) => {
    const box: WordBox = {...w, x, y: centerY, w: ws[i], h: w.size * 1.1, cx: x + ws[i] / 2};
    x += ws[i] + gaps[i];
    return box;
  });
};

// =====================================================================
// 运动原语（全部是帧号 u 的解析函数；u<0 = 未发生）
// =====================================================================

/** 主词砸入（签名②）：主落 5f scale 2.2→0.97（easeOutQuart）+ 3f 微回弹 0.97→1。 */
export const slamScale = (u: number): number => {
  if (u < 0) return 2.2;
  if (u < 5) return 2.2 + (0.97 - 2.2) * (1 - Math.pow(1 - u / 5, 4));
  if (u < 8) return 0.97 + 0.03 * easeOutCubic((u - 5) / 3);
  return 1;
};

/** 微震（砸入落点）：7f 指数衰减抖动，ktHash 逐帧相位（确定性）。 */
export const shakeAt = (u: number, amp: number, seed = 3): {dx: number; dy: number} => {
  if (u < 0 || u >= 7) return {dx: 0, dy: 0};
  const decay = Math.exp(-u / 2.4);
  return {
    dx: amp * decay * (ktHash(seed, u * 2) * 2 - 1),
    dy: amp * 0.6 * decay * (ktHash(seed + 1, u * 2 + 1) * 2 - 1),
  };
};

/** 槽位升起（签名③，机制借鉴 swiss-print maskRise 重写）：u<0 → 115%（槽空着不渲染）；
 *  0..dur easeOutCubic 115%→0%；轻落无回弹（「轻轻升起」）。返回 translateY 百分数。 */
export const riseAt = (u: number, dur = 13): number => {
  if (u < 0) return 115;
  if (u >= dur) return 0;
  return (1 - easeOutCubic(u / dur)) * 115;
};

/** 轻弹入（标点节拍拍）：6f scale 0.4→(过冲 1.14)→1。 */
export const popScale = (u: number): number => {
  if (u < 0) return 0.4;
  if (u >= 6) return 1;
  const p = u / 6;
  return 0.4 + 0.6 * easeOutCubic(p) + 0.14 * Math.sin(p * Math.PI) * (1 - p);
};

/** emphasis 脉冲（主词翻色/下划线拍）：10f 1→1.14→1（sin 半波）。 */
export const pulseScale = (u: number): number => (u < 0 || u >= 10 ? 1 : 1 + 0.14 * Math.sin((u / 10) * Math.PI));

/** 软落（句号，无回弹——「不再动」的语义本体）：dur f translateY −dropPx→0 easeOutCubic。 */
export const softDropY = (u: number, dropPx: number, dur = 8): number => {
  if (u < 0) return -dropPx;
  if (u >= dur) return 0;
  return -dropPx * Math.pow(1 - u / dur, 3);
};

/** 蓄力上提（砸前预备蹲）：rise 8f 上提 liftPx → hold 保持。 */
export const crouchLift = (u: number, liftPx: number, hold = 14): number => {
  if (u < 0) return 0;
  if (u < 8) return liftPx * easeInOutCubic(u / 8);
  if (u < 8 + hold) return liftPx;
  return liftPx;
};

/** 砸落（重力加速下坠）：dur f 内 easeInQuad 下落 fallPx。 */
export const slamFallY = (u: number, fallPx: number, dur = 3): number => {
  if (u < 0) return 0;
  if (u >= dur) return fallPx;
  return fallPx * easeInQuad(u / dur);
};

/** 落地压扁回弹（砸落着地）：sq>0 压扁（sx=1+sq·0.7, sy=1−sq）；u=0 最扁，一次反向拉伸后收敛。 */
export const landSquash = (u: number): number => {
  if (u < 0) return 0;
  return 0.2 * Math.exp(-u / 2.5) * Math.cos(u * 2.2);
};

/** 冲击环进度：0..8f 半径 0.45→1.15 扩张 + 淡出。返回 {r, o}（比例因子）。 */
export const ringAt = (u: number): {r: number; o: number} => {
  if (u < 0 || u >= 8) return {r: 0, o: 0};
  const p = u / 8;
  return {r: 0.45 + 0.7 * easeOutCubic(p), o: 0.8 * (1 - p)};
};

/** 字重呼吸（定帧微动效①）：scale 1+amp·sin(2π(N−from)/period)。 */
export const breatheScale = (N: number, from: number, amp = 0.012, period = 90): number =>
  N < from ? 1 : 1 + amp * Math.sin(((N - from) * 2 * Math.PI) / period);

/** 微光呼吸（定帧微动效②）：透明度 0..amp 慢正弦。 */
export const glowAlpha = (N: number, from: number, amp = 0.06, period = 150): number =>
  N < from ? 0 : amp + amp * Math.sin(((N - from) * 2 * Math.PI) / period);

// =====================================================================
// 图元组件
// =====================================================================

/** 幕底纯色（节拍硬切：换色发生在单帧内，无过渡）。 */
export const KtBg: React.FC<{color: string}> = ({color}) => (
  <div style={{position: 'absolute', inset: 0, background: color}} />
);

/** 槽位框（签名③的「槽」：dashed 虚线框 = 词的确定位置；appear 起淡入，land 起收回）。 */
export const SlotBox: React.FC<{
  box: WordBox; N: number; appear: number; land?: number;
  color: string; baseOpacity?: number;
}> = ({box, N, appear, land, color, baseOpacity = 0.5}) => {
  const pad = 10;
  const oIn = N < appear ? 0 : Math.min(1, (N - appear) / 3);
  const oOut = land === undefined || N < land ? 1 : Math.max(0, 1 - (N - land) / 6);
  const o = baseOpacity * oIn * oOut;
  if (o <= 0.01) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: box.x - pad,
        top: box.y - box.h / 2 - pad + box.h * 0.05,
        width: box.w + pad * 2,
        height: box.h + pad * 2 - box.h * 0.1,
        border: `2px dashed ${color}`,
        borderRadius: 6,
        opacity: o,
        pointerEvents: 'none',
      }}
    />
  );
};

/**
 * 词（本卡演员）：槽位升起渲染——外层 overflow:hidden 裁剪容器（=槽），内层 span
 * translateY(riseAt(u)) 升起。静态时 riseU 缺省=已落定。
 * scale/sx/sy/ty 供 slam/脉冲/压扁/软落等上层合成；全部乘在 transform 上（确定性）。
 */
export const KtWord: React.FC<{
  box: WordBox;
  color: string;
  opacity?: number;
  riseU?: number; // 槽位升起帧差（缺省 = 已落定）
  riseDur?: number;
  scale?: number; // slam/脉冲/呼吸（乘 base 1）
  sx?: number; // 水平压扁系数（1=无）
  sy?: number; // 垂直压扁系数（1=无）
  ty?: number; // 额外整体位移 px（travel/软落/砸落）
  trackingEm?: number;
  hidden?: boolean;
}> = ({box, color, opacity = 1, riseU, riseDur = 13, scale = 1, sx = 1, sy = 1, ty = 0, trackingEm = 0, hidden}) => {
  if (hidden) return null;
  const rise = riseU === undefined ? 0 : riseAt(riseU, riseDur);
  const pad = 12;
  return (
    <div
      style={{
        position: 'absolute',
        left: box.x - pad,
        top: box.y - box.h / 2 - pad,
        width: box.w + pad * 2,
        height: box.h + pad * 2,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: pad,
          top: pad,
          width: box.w,
          fontFamily: KT_FONT,
          fontWeight: rankWeight(box.rank),
          fontSize: box.size,
          lineHeight: `${box.h}px`,
          letterSpacing: `${(trackingEm * box.size).toFixed(2)}px`,
          color,
          whiteSpace: 'nowrap',
          textAlign: 'center',
          opacity,
          transform: `translateY(${(rise * box.h * 0.01 + ty).toFixed(2)}px) scale(${(scale * sx).toFixed(4)}, ${(scale * sy).toFixed(4)})`,
          transformOrigin: '50% 60%',
        }}
      >
        {box.t}
      </div>
    </div>
  );
};

/** 冲击环（slam 落点）：扩张 stroke 圆，8f 淡出。 */
export const FlashRing: React.FC<{cx: number; cy: number; base: number; u: number; color: string; width?: number}> = ({
  cx, cy, base, u, color, width = 5,
}) => {
  const {r, o} = ringAt(u);
  if (o <= 0) return null;
  return (
    <svg width={KT_W} height={KT_H} viewBox={`0 0 ${KT_W} ${KT_H}`} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <circle cx={cx} cy={cy} r={(base * r).toFixed(1)} fill="none" stroke={color} strokeWidth={width} opacity={o.toFixed(3)} />
    </svg>
  );
};

/** 冲击线（砸落着地两侧）：每侧 n 根水平短棒，ktHash 定长，5f 淡出。 */
export const ImpactLines: React.FC<{cx: number; cy: number; u: number; color: string; span?: number; n?: number; seed?: number}> = ({
  cx, cy, u, color, span = 300, n = 4, seed = 11,
}) => {
  if (u < 0 || u >= 5) return null;
  const o = 1 - u / 5;
  const bars: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const len = 36 + ktHash(seed, i) * 58;
    const dy = -44 + i * 30 + (ktHash(seed + 2, i) - 0.5) * 10;
    for (const dir of [-1, 1]) {
      bars.push(
        <rect
          key={`${i}${dir}`}
          x={cx + dir * (span / 2 + ktHash(seed + 4, i) * 24) - (dir > 0 ? 0 : len)}
          y={cy + dy}
          width={len}
          height={7}
          fill={color}
          opacity={o.toFixed(3)}
        />,
      );
    }
  }
  return (
    <svg width={KT_W} height={KT_H} viewBox={`0 0 ${KT_W} ${KT_H}`} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      {bars}
    </svg>
  );
};

/** 重音符号 ▼（砸落在主词头顶的强调记号）：4f easeInQuad 从上方砸落 + 落点微压扁。 */
export const StressMark: React.FC<{cx: number; topY: number; u: number; color: string; size?: number}> = ({
  cx, topY, u, color, size = 58,
}) => {
  if (u < 0) return null;
  const drop = u < 4 ? (1 - easeInQuad(u / 4)) * -66 : 0;
  const sq = u >= 4 && u < 8 ? 0.18 * Math.exp(-((u - 4) / 2)) : 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: cx - size / 2,
        top: topY + drop,
        width: size,
        height: size * 0.62,
        transform: `scale(${(1 + sq * 0.8).toFixed(3)}, ${(1 - sq).toFixed(3)})`,
        transformOrigin: '50% 100%',
        pointerEvents: 'none',
      }}
    >
      <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`}>
        <polygon points={`0,0 ${size},0 ${size / 2},${size * 0.62}`} fill={color} />
      </svg>
    </div>
  );
};

/** 基线细线（版式自证）：scaleX 0→1 画出；drawDur 后可选淡出。 */
export const BaseRule: React.FC<{
  x: number; y: number; w: number; N: number; draw: number; color: string;
  thickness?: number; drawDur?: number; fade?: number; fadeDur?: number; opacity?: number;
}> = ({x, y, w, N, draw, color, thickness = 3, drawDur = 6, fade, fadeDur = 8, opacity = 1}) => {
  if (N < draw) return null;
  const p = easeOutCubic((N - draw) / drawDur);
  let o = opacity;
  if (fade !== undefined && N >= fade) o = opacity * Math.max(0, 1 - (N - fade) / fadeDur);
  if (o <= 0.01) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w * p,
        height: thickness,
        background: color,
        opacity: o,
        transformOrigin: '0 50%',
        pointerEvents: 'none',
      }}
    />
  );
};

/** 强调下划线（主词 emphasis 收束拍： scaleX 砸出后常驻）。 */
export const EmphUnderline: React.FC<{box: WordBox; y: number; N: number; draw: number; color: string; thickness?: number}> = ({
  box, y, N, draw, color, thickness = 10,
}) => {
  if (N < draw) return null;
  const p = easeOutCubic((N - draw) / 6);
  return (
    <div
      style={{
        position: 'absolute',
        left: box.x,
        top: y,
        width: `${(box.w * p).toFixed(2)}px`,
        height: thickness,
        background: color,
        transformOrigin: '0 50%',
        pointerEvents: 'none',
      }}
    />
  );
};

/** 径向衬底微光（定帧「句号微光」——纯平契约内的衬底圆实现，非 glow 滤镜）。 */
export const SoftGlow: React.FC<{cx: number; cy: number; r: number; alpha: number; color: string}> = ({cx, cy, r, alpha, color}) => {
  if (alpha <= 0.005) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: cx - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 68%)`,
        opacity: alpha.toFixed(3),
        pointerEvents: 'none',
      }}
    />
  );
};

/** 收束细框（S04「静止宣言」：四边 2px 细线按上→下→左→右画出）。 */
export const StillFrame: React.FC<{N: number; from: number; color: string; inset?: number; opacity?: number}> = ({N, from, color, inset = 26, opacity = 0.5}) => {
  if (N < from) return null;
  const seg = 4;
  const p = (k: number): number => easeOutCubic((N - from - k * 2) / 6);
  const w = KT_W - inset * 2;
  const h = KT_H - inset * 2;
  const common: React.CSSProperties = {position: 'absolute', background: color, opacity, pointerEvents: 'none'};
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <div style={{...common, left: inset, top: inset, width: w * clamp01(p(0)), height: 2}} />
      <div style={{...common, left: inset, top: inset + h, width: w * clamp01(p(1)), height: 2}} />
      <div style={{...common, left: inset, top: inset, width: 2, height: h * clamp01(p(2))}} />
      <div style={{...common, left: inset + w, top: inset, width: 2, height: h * clamp01(p(3))}} />
    </div>
  );
};
