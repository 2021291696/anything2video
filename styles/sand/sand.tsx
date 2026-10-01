import React from 'react';
import {useCurrentFrame, staticFile} from 'remotion';
import {clamp01, easeInOutPow, kf} from './common';

/**
 * 沙画图元体系（usa250-sand 专用，主脚本维护）：
 * 经典灯箱沙画 = 暖色纸底 + 深沙铺层（Wash）+ 纸色描边"擦"出形体 + 手影引导 + 全局噪点颗粒。
 * 所有动效都是 N 的纯函数；颗粒用预生成噪点纹理（grain.png）平移抖动，不跑逐像素运算。
 * 镜头组件的 N 必须是全局帧：N = useCurrentFrame() + F0（F0 = ShotDef.from）。
 */
export const SAND = {
  dark: '#4a3520', // 主沙色（铺层/手影外的描边）
  deep: '#33241a', // 深沙（手影）
  paper: '#e9d9b4', // 灯箱纸底
  glow: '#f7edd2', // 纸底中心辉光
  amber: '#a06a28', // 琥珀强调（点缀）
  edge: '#c9b384', // 纸底边缘暗角基色
  base: '#eedcb6', // 体渲染基形色（v2 图纸）
};

const GRAIN_URL = staticFile('assets/usa250-sand/grain.png');

/** 全局颗粒层：噪点纹理随帧漂移（确定性），multiply 叠在画面上给所有元素沙质感 */
export const Grain: React.FC<{N: number; opacity?: number}> = ({N, opacity = 0.6}) => (
  <div style={{
    position: 'absolute', inset: 0, pointerEvents: 'none',
    backgroundImage: `url(${GRAIN_URL})`, backgroundSize: '512px 512px',
    backgroundPosition: `${(N * 7) % 512}px ${(N * 13) % 512}px`,
    mixBlendMode: 'multiply', opacity,
  }} />
);

/** 灯箱纸底 + 中心辉光 + 边缘暗角（Stage 背景与每幕 Wash 的底） */
export const Paper: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0,
    background: `radial-gradient(ellipse 62% 55% at 50% 44%, ${SAND.glow}, ${SAND.paper} 66%, ${SAND.edge} 100%)`,
  }} />
);

/** 收尾处理：颗粒 + 暗角（挂 Main，位于镜头之上、进度条之下） */
export const SandPost: React.FC = () => {
  const N = useCurrentFrame() + 1;
  return (
    <>
      <Grain N={N} opacity={0.5} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 90% 82% at 50% 46%, transparent 62%, rgba(58,40,22,.34) 100%)',
      }} />
    </>
  );
};

/**
 * 沙幕包装：开场铺沙（深沙层淡入 + 轻微颗粒落定）→ 内容 → 收尾抹沙（整幕淡出）。
 * f0=幕起点，end=幕终点（含）；内容随铺沙一起入场、随抹沙一起退场。
 */
export const SandScene: React.FC<{N: number; f0: number; end: number; children: React.ReactNode}> = ({N, f0, end, children}) => {
  const n = N - f0;
  const inOp = clamp01(n / 12);
  const outOp = 1 - clamp01((N - (end - 14)) / 14);
  const op = Math.min(inOp, outOp);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: op}}>
      {/* 深沙铺层：不均匀的径向沙 wash */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse 70% 62% at 50% 46%, rgba(62,43,25,.93), rgba(48,32,18,.98) 78%, rgba(36,24,13,1))`,
      }} />
      {children}
    </div>
  );
};

/** 纸色描边"擦"出线条：SVG path 归一化 dash，随 len 帧画出来（stroke 用纸色=从沙里擦出亮线） */
export const Stroke: React.FC<{
  d: string; N: number; f0: number; len?: number; w?: number; color?: string; blur?: number; opacity?: number; delay?: number;
}> = ({d, N, f0, len = 22, w = 9, color = '#f0e2be', blur = 1.1, opacity = 0.96, delay = 0}) => {
  const t = easeInOutPow(1.8)(clamp01((N - f0 - delay) / len));
  if (t <= 0) return null;
  return (
    <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, opacity, filter: `blur(${(blur * 0.45).toFixed(2)}px)`}}>
      <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"
        pathLength={1} strokeDasharray={1} strokeDashoffset={1 - t} />
    </svg>
  );
};

/** 纸色形体：整块形状淡入（配合轻微模糊做沙雾感） */
export const Shape: React.FC<{
  d: string; N: number; f0: number; len?: number; color?: string; blur?: number; opacity?: number; dy?: number; scale?: number;
}> = ({d, N, f0, len = 16, color = '#f0e2be', blur = 1.4, opacity = 0.95, dy = 6, scale = 1}) => {
  const t = easeInOutPow(2)(clamp01((N - f0) / len));
  if (t <= 0) return null;
  return (
    <svg width={1280} height={720} viewBox="0 0 1280 720" style={{
      position: 'absolute', left: 0, top: 0, opacity: t * opacity, filter: `blur(${(blur * 0.45).toFixed(2)}px)`,
      transform: `translateY(${dy * (1 - t)}px) scale(${scale + (1 - scale) * (1 - t)})`, transformOrigin: '50% 50%',
    }}>
      <path d={d} fill={color} />
    </svg>
  );
};

/** 沙雾圆点（星/沙粒/灯）：淡入的小圆 */
export const Dot: React.FC<{cx: number; cy: number; r?: number; N: number; f0: number; color?: string; opacity?: number}> = ({cx, cy, r = 7, N, f0, color = '#f0e2be', opacity = 0.92}) => {
  const t = clamp01((N - f0) / 10);
  if (t <= 0) return null;
  return (
    <div style={{
      position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: '50%',
      background: color, opacity: t * opacity, filter: 'blur(0.55px)',
    }} />
  );
};

/** 大字（年份/标题）：纸色 900 字 + 轻模糊，淡入 */
export const SandText: React.FC<{
  text: string; N: number; f0: number; x?: number; y?: number; size?: number; color?: string; spacing?: number; opacity?: number;
}> = ({text, N, f0, x = 640, y = 330, size = 120, color = '#f4e8c8', spacing = 10, opacity = 0.97}) => {
  const t = easeInOutPow(2)(clamp01((N - f0) / 16));
  if (t <= 0) return null;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)', opacity: t * opacity,
      fontFamily: '"Noto Sans SC", sans-serif', fontWeight: 900, fontSize: size, color, letterSpacing: spacing,
      whiteSpace: 'nowrap', filter: 'blur(0.3px)', textShadow: '0 0 22px rgba(240,226,190,.35)',
    }}>{text}</div>
  );
};

/** 手影：沙画师的手（深色剪影，index 指前伸），blur 柔化剪影边缘 */
export const Hand: React.FC<{x: number; y: number; rot?: number; opacity?: number; flip?: boolean; scale?: number}> = ({x, y, rot = 0, opacity = 0.9, flip = false, scale = 1}) => (
  <svg width={200} height={300} viewBox="0 0 200 300" style={{
    position: 'absolute', left: x - 100, top: y - 150, opacity,
    transform: `rotate(${rot}deg) ${flip ? 'scaleX(-1)' : ''} scale(${scale})`,
    filter: 'blur(1.1px)',
  }}>
    <path d="M 78 296 C 70 250 72 210 78 178 C 60 172 46 158 44 138 C 42 120 52 106 68 102 C 66 74 74 40 88 34 C 98 30 106 36 108 52 C 112 44 122 40 130 44 C 138 48 140 58 138 68 C 146 64 156 66 160 74 C 164 82 162 92 156 98 C 168 100 176 110 176 124 C 176 148 162 166 144 174 C 150 210 150 254 144 296 Z" fill={SAND.deep} />
  </svg>
);

export type HandKey = {f: number; x: number; y: number; r?: number; o?: number};

/** 手影编舞：按关键帧线性插值位置/角度/透明度（f 用全局帧） */
export const handAt = (N: number, keys: HandKey[]) => {
  if (N <= keys[0].f) return keys[0];
  if (N >= keys[keys.length - 1].f) return keys[keys.length - 1];
  let i = 0;
  while (i < keys.length - 2 && N > keys[i + 1].f) i++;
  const a = keys[i], b = keys[i + 1];
  const t = easeInOutPow(2)(clamp01((N - a.f) / Math.max(1, b.f - a.f)));
  return {
    f: N,
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    r: (a.r ?? 0) + ((b.r ?? 0) - (a.r ?? 0)) * t,
    o: (a.o ?? 0.9) + ((b.o ?? 0.9) - (a.o ?? 0.9)) * t,
  };
};

/** 落沙：从一点洒落的沙粒流（确定性伪随机点阵，随 N 生长） */
export const SandPour: React.FC<{x: number; y: number; N: number; f0: number; len?: number; spread?: number; count?: number}> = ({x, y, N, f0, len = 40, spread = 60, count = 26}) => {
  const n = N - f0;
  if (n <= 0 || n > len) return null;
  const dots = [];
  for (let i = 0; i < count; i++) {
    const seed = (i * 137) % 100;
    const phase = (seed % 17) / 17;
    const localN = (n - phase * 9) % 22;
    if (localN <= 0) continue;
    const prog = clamp01(localN / 16);
    const dx = (((seed * 53) % 100) / 100 - 0.5) * spread * (0.4 + prog);
    const dy = prog * 190;
    dots.push(<div key={i} style={{
      position: 'absolute', left: x + dx - 2.4, top: y + dy - 2.4, width: 4.8, height: 4.8, borderRadius: '50%',
      background: '#4a3520', opacity: (1 - prog) * 0.85, filter: 'blur(1px)',
    }} />);
  }
  return <>{dots}</>;
};

// ---- 真实沙画质感升级（v2 图纸）：多笔勾勒 / 体渲染 / 形内颗粒 / 双姿态手影 ----

export const SAND_SHADES = {light: '#f6ecd0', base: '#eedcb6', mid: '#c8a76b', deep: '#7d5f36'};

/** 体渲染形体：三遍叠加（深色偏移投影 → 基形 → 亮部高光），给形体受光体积感。d 为 SVG path。 */
export const SandVolume: React.FC<{d: string; N: number; f0: number; len?: number; opacity?: number; blur?: number; dx?: number; dy?: number}> = ({d, N, f0, len = 16, opacity = 0.95, blur = 0.6, dx = 7, dy = 7}) => {
  const t = easeInOutPow(2)(clamp01((N - f0) / len));
  if (t <= 0) return null;
  return (
    <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, filter: `blur(${blur}px)`, opacity: t * opacity}}>
      <path d={d} fill="rgba(30,20,10,.42)" transform={`translate(${dx} ${dy})`} />
      <path d={d} fill={SAND.base} />
      <path d={d} fill="rgba(255,248,224,.45)" transform={`translate(${(-dx * 0.4).toFixed(1)} ${(-dy * 0.4 - 3).toFixed(1)})`} opacity={0.4} />
    </svg>
  );
};

export type SketchStroke = {d: string; w?: number; delay?: number; len?: number; color?: string; opacity?: number};

/** 多笔勾勒：一组笔画按次序画入（外轮廓 → 内部结构线 → 阴影排线），构成复杂形体。 */
export const Sketch: React.FC<{strokes: SketchStroke[]; N: number; f0: number; baseLen?: number; blur?: number}> = ({strokes, N, f0, baseLen = 20, blur = 0.5}) => (
  <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, filter: `blur(${blur}px)`}}>
    {strokes.map((s, i) => {
      const t = easeInOutPow(1.8)(clamp01((N - f0 - (s.delay ?? i * 8)) / (s.len ?? baseLen)));
      if (t <= 0) return null;
      return <path key={i} d={s.d} fill="none" stroke={s.color ?? '#f0e2be'} strokeWidth={s.w ?? 8} strokeLinecap="round" strokeLinejoin="round" opacity={(s.opacity ?? 0.95) * t} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - t} />;
    })}
  </svg>
);

/** 形内颗粒：噪点纹理裁进形体（clipPath），形体内部也有沙粒质感而非平涂 */
export const ShapeGrain: React.FC<{id: string; d: string; N: number; opacity?: number}> = ({id, d, N, opacity = 0.45}) => (
  <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, opacity, mixBlendMode: 'multiply'}}>
    <defs>
      <clipPath id={id}><path d={d} /></clipPath>
    </defs>
    <image href={GRAIN_URL} width={1280} height={720} preserveAspectRatio="none" clipPath={`url(#${id})`}
      style={{transform: `translate(${((N * 5) % 97) - 48}px, ${((N * 3) % 89) - 44}px)`}} />
  </svg>
);

/** 铺层暗斑：不规则的深色沙丘团，打破 wash 的平面感（确定性，无随机） */
export const WashBlotches: React.FC<{seed?: number}> = ({seed = 5}) => {
  const blobs = Array.from({length: 7}, (_, i) => {
    const hx = ((i * 137 + seed * 31) % 100) / 100;
    const hy = ((i * 89 + seed * 53) % 100) / 100;
    const w = 180 + ((i * 61) % 160);
    return <div key={i} style={{
      position: 'absolute', left: 140 + hx * 1000 - w / 2, top: 120 + hy * 460 - w / 3, width: w, height: w * 0.62,
      borderRadius: '50%', background: 'rgba(28,18,9,.16)', filter: 'blur(22px)',
    }} />;
  });
  return <>{blobs}</>;
};

/** 手影·指物姿态（升级版：食指前伸 + 三指屈节 + 拇指 + 腕口，内附指节细节线） */
export const HandPoint: React.FC<{x: number; y: number; rot?: number; opacity?: number; flip?: boolean; scale?: number}> = ({x, y, rot = 0, opacity = 0.9, flip = false, scale = 1}) => (
  <svg width={200} height={300} viewBox="0 0 200 300" style={{
    position: 'absolute', left: x - 100, top: y - 150, opacity,
    transform: `rotate(${rot}deg) ${flip ? 'scaleX(-1)' : ''} scale(${scale})`,
    filter: 'blur(1.1px)',
  }}>
    <path d="M 96 298 C 90 252 92 212 98 182 C 78 174 62 158 60 138 C 58 120 70 106 86 104 C 82 80 88 44 102 36 C 114 29 124 40 126 58 C 130 50 140 46 148 50 C 156 54 158 64 154 74 C 164 72 174 78 178 88 C 184 102 180 118 168 128 C 174 136 178 146 176 158 C 172 178 158 192 142 198 C 150 232 152 264 148 298 Z" fill={SAND.deep} />
    <path d="M 104 118 C 100 128 100 140 104 150 M 120 112 C 116 124 116 138 120 148" stroke="rgba(240,226,190,.14)" strokeWidth={4} fill="none" strokeLinecap="round" />
  </svg>
);

/** 手影·托举姿态（摊开掌心向上，四指在上一侧，用于托沙/承接镜头） */
export const HandOpen: React.FC<{x: number; y: number; rot?: number; opacity?: number; flip?: boolean; scale?: number}> = ({x, y, rot = 0, opacity = 0.9, flip = false, scale = 1}) => (
  <svg width={260} height={200} viewBox="0 0 260 200" style={{
    position: 'absolute', left: x - 130, top: y - 100, opacity,
    transform: `rotate(${rot}deg) ${flip ? 'scaleX(-1)' : ''} scale(${scale})`,
    filter: 'blur(1.1px)',
  }}>
    <path d="M 24 150 C 44 118 78 100 118 96 C 122 82 132 74 148 74 C 152 62 162 56 174 58 C 178 48 190 44 200 48 C 204 40 214 38 222 44 C 236 54 242 76 238 100 C 234 128 216 150 190 160 C 196 172 198 184 196 196 L 40 196 C 30 180 22 164 24 150 Z" fill={SAND.deep} />
    <path d="M 60 148 C 100 128 160 126 214 142" stroke="rgba(240,226,190,.14)" strokeWidth={4} fill="none" strokeLinecap="round" />
  </svg>
);

// ---- 图标骨架渲染（解决"模型盲画具象形体不像"）：设计师画的开源图形骨架 + 沙画两阶段渲染 ----
import {ICON_BELL, ICON_STATUE, ICON_PLANE, ICON_DOVE, ICON_ROCKET, ICON_SAIL} from './icons';

export const ICON_MAP: Record<string, {viewBox: string; mode: 'fill' | 'line'; body: string; ds: string[]}> = {
  bell: ICON_BELL, statue: ICON_STATUE, plane: ICON_PLANE, dove: ICON_DOVE, rocket: ICON_ROCKET, sail: ICON_SAIL,
};

/**
 * SandIcon：开源图标骨架 × 沙画两阶段渲染。
 * 阶段1（0→draw 帧）：所有路径以描边"勾线"画入（dash 画入）；阶段2（draw×0.6 起）：原形体淡入铺沙 + 形内颗粒。
 * fill 图标（mdi/game-icons 剪影）出体积，line 图标（mingcute 线稿）出定稿锐度。
 * icon 名见 ICON_MAP（bell/statue/plane/dove/rocket/sail）；许可与来源见 src/icons.ts。
 */
export const SandIcon: React.FC<{
  icon: string; N: number; f0: number; x: number; y: number; size: number;
  draw?: number; color?: string; opacity?: number; rotate?: number; flip?: boolean; grain?: boolean;
}> = ({icon, N, f0, x, y, size, draw = 26, color = '#f0e2be', opacity = 0.96, rotate = 0, flip = false, grain = false}) => {
  const def = ICON_MAP[icon];
  if (!def) return null;
  const t0 = clamp01((N - f0) / draw);
  if (t0 <= 0) return null;
  const [vx, vy, vw, vh] = def.viewBox.split(/\s+/).map(Number);
  const scale = size / Math.max(vw, vh);
  const fillStart = Math.round(draw * 0.6);
  const fillT = clamp01((N - f0 - fillStart) / 14);
  const clipId = `sandicon-${icon}-${f0}`;
  const sw = Math.max(vw, vh) / 30;
  return (
    <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, opacity, filter: 'blur(0.55px)'}}>
      <defs>
        {grain && def.mode === 'fill' && fillT > 0 && (
          <clipPath id={clipId}>
            {def.ds.map((d, i) => <path key={i} d={d} transform={flip ? `translate(${vw} 0) scale(-1 1)` : undefined} />)}
          </clipPath>
        )}
      </defs>
      <g transform={`translate(${(x - size / 2).toFixed(1)} ${(y - size / 2).toFixed(1)}) rotate(${rotate} ${size / 2} ${size / 2})`}>
        <g transform={`scale(${(flip ? -scale : scale).toFixed(4)} ${scale.toFixed(4)}) translate(${(flip ? -(vx + vw) : -vx).toFixed(2)} ${(-vy).toFixed(2)})`}>
          <g fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" opacity={0.95}>
            {def.ds.map((d, i) => (
              <path key={i} d={d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - t0}
                transform={flip ? `translate(${vw} 0) scale(-1 1)` : undefined} />
            ))}
          </g>
          {fillT > 0 && <g style={{opacity: fillT * 0.92}} dangerouslySetInnerHTML={{__html: def.body}} />}
          {grain && def.mode === 'fill' && fillT > 0 && (
            <image href={GRAIN_URL} width={1280} height={720} preserveAspectRatio="none" clipPath={`url(#${clipId})`}
              opacity={fillT * 0.5} style={{mixBlendMode: 'multiply', transform: `translate(${((N * 5) % 97) - 48}px, ${((N * 3) % 89) - 44}px)`}} />
          )}
        </g>
      </g>
    </svg>
  );
};
