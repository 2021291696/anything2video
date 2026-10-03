import React from 'react';
import {clamp01, easeOutCubic, rnd} from './easing';

export type RootNode = {
  label: string;
  sub?: string;
  targetX: number;
  targetY: number;
  curveBias?: number; // -1 to 1: curve left or right
  delay?: number;
  duration?: number;
};

/**
 * 默认四万年创造谱系根系（OPUS 第 13 章同型）：
 * 从地平线中央黑核向下辐射蔓延的 8-9 条历史根须，带大事记与发光星芒。
 */
export const DEFAULT_ROOTS: RootNode[] = [
  { label: '手印', sub: '40,000 BCE', targetX: 140, targetY: 460, curveBias: -0.3, delay: 0, duration: 42 },
  { label: '齿轮', sub: 'II c. BCE', targetX: 250, targetY: 520, curveBias: -0.15, delay: 6, duration: 45 },
  { label: '算法', sub: 'IX c.', targetX: 370, targetY: 450, curveBias: -0.08, delay: 12, duration: 40 },
  { label: '卦与二进制', sub: '1703', targetX: 470, targetY: 510, curveBias: -0.04, delay: 18, duration: 44 },
  { label: '打孔卡', sub: '1804', targetX: 570, targetY: 460, curveBias: -0.02, delay: 22, duration: 40 },
  { label: '比特', sub: '1948', targetX: 710, targetY: 460, curveBias: 0.02, delay: 26, duration: 40 },
  { label: '能思考吗', sub: '1950', targetX: 810, targetY: 520, curveBias: 0.08, delay: 30, duration: 44 },
  { label: '连接', sub: '1969', targetX: 930, targetY: 450, curveBias: 0.18, delay: 34, duration: 40 },
  { label: '语言模型', sub: 'NOW', targetX: 1120, targetY: 520, curveBias: 0.32, delay: 38, duration: 45 },
];

/**
 * 家谱树/根须系统（epic 收口章核心收束机制，OPUS 134–159s 家谱同型）：
 * - mode='radial'（默认，OPUS 真实形态）：自顶部地平线中央黑核向下辐射扎根的径向根须系统。
 *   每根主须自主核向下弯曲延伸（Cubic Bezier），末端到达时绽放 12 角发光 ✦ 星芒与历史大事记标签。
 *   右上角常驻传统朱砂印章与竖排书法题字。
 * - mode='upward'（兼容旧版）：自地平线向上生长的枝干花树。
 */
export const TreeGrow: React.FC<{
  f0: number;
  N: number;
  mode?: 'radial' | 'upward';
  roots?: RootNode[];
  branches?: number;
  originX?: number;
  originY?: number;
  accent?: string;
  gold?: string;
  seal?: { title?: string; stampText?: string };
}> = ({
  f0,
  N: nRaw,
  mode = 'radial',
  roots = DEFAULT_ROOTS,
  branches = 9,
  originX = 640,
  originY = 168,
  accent = '#C43C2E',
  gold = '#C9A86A',
  seal = { title: '家谱', stampText: 'OPUS' },
}) => {
  const N = nRaw - f0;
  if (N < 0) return null;

  if (mode === 'upward') {
    // 兼容旧版向上生长的花树
    const trunkP = easeOutCubic(clamp01(N / 60));
    return (
      <svg width={1280} height={720} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
        <path d={`M ${originX} 640 C ${originX + 6} 452, ${originX - 6} 288, ${originX} 170`}
          fill="none" stroke="#2B2419" strokeWidth={9} strokeLinecap="round" pathLength={1}
          strokeDasharray={1} strokeDashoffset={1 - trunkP} />
        {Array.from({length: branches}, (_, i) => {
          const t0 = 50 + i * 8;
          const p = easeOutCubic(clamp01((N - t0) / 20));
          if (p <= 0) return null;
          const side = i % 2 === 0 ? 1 : -1;
          const y0 = 640 - 470 * (0.18 + (i / branches) * 0.68);
          const len = 95 + i * 7;
          const x1 = originX + side * len;
          const y1 = y0 - 52 - i * 9;
          const bloomAt = t0 + 26;
          const bp = clamp01((N - bloomAt) / 12);
          const r = 8;
          const petals = [0, 1, 2, 3, 4].map((k) => {
            const a = (k / 5) * Math.PI * 2;
            return <circle key={k} cx={x1 + Math.cos(a) * r * bp} cy={y1 + Math.sin(a) * r * bp} r={r * bp} fill={accent} opacity={0.92} />;
          });
          return (
            <g key={i}>
              <path d={`M ${originX} ${y0} Q ${originX + side * len * 0.45} ${y0 - 6}, ${x1} ${y1}`}
                fill="none" stroke="#4A4034" strokeWidth={4} strokeLinecap="round" pathLength={1}
                strokeDasharray={1} strokeDashoffset={1 - p} />
              <g opacity={bp}>{petals}<circle cx={x1} cy={y1} r={r * 0.42 * bp} fill={gold} /></g>
            </g>
          );
        })}
      </svg>
    );
  }

  // -------------------------------------------------------------
  // mode === 'radial' (OPUS 真实径向根系形态)
  // -------------------------------------------------------------
  // 地平线与核淡入
  const horizonOp = clamp01(N / 24);
  const sealOp = clamp01((N - 10) / 30);

  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden'}}>
      {/* 1. 地平线细线与中央核 (Origin Node) */}
      <div style={{position: 'absolute', left: 0, right: 0, top: originY, height: 1, background: 'rgba(80,70,60,0.25)', opacity: horizonOp}} />

      {/* 2. 右上角：竖排题字 + 朱红印章 (Seal Group) */}
      {seal && (
        <div style={{position: 'absolute', right: 90, top: originY - 70, opacity: sealOp, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          {seal.title && (
            <div style={{
              writingMode: 'vertical-rl',
              fontFamily: `'Noto Serif SC', 'Songti SC', serif`,
              fontWeight: 900,
              fontSize: 34,
              letterSpacing: 10,
              color: '#2B2419',
              marginBottom: 16,
              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              {seal.title}
            </div>
          )}
          {seal.stampText && (
            <div style={{
              border: `2px solid ${accent}`,
              padding: '4px 8px',
              fontFamily: `'Fraunces', 'Georgia', serif`,
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: 2,
              color: accent,
              borderRadius: 2,
              boxShadow: `inset 0 0 0 1px ${accent}22`
            }}>
              {seal.stampText}
            </div>
          )}
        </div>
      )}

      {/* 3. SVG 根须网络绘制 */}
      <svg width={1280} height={720} style={{position: 'absolute', inset: 0}}>
        {/* 中央黑核 */}
        <circle cx={originX} cy={originY} r={7} fill="#1E1915" opacity={horizonOp} />
        <circle cx={originX} cy={originY} r={12} fill="none" stroke={gold} strokeWidth={1.5} opacity={horizonOp * 0.7} />

        {roots.map((root, i) => {
          const t0 = root.delay ?? i * 6;
          const dur = root.duration ?? 45;
          const p = easeOutCubic(clamp01((N - t0) / dur));
          if (p <= 0) return null;

          // 计算自然的下行蔓延贝塞尔控制点
          const dx = root.targetX - originX;
          const dy = root.targetY - originY;
          const bias = (root.curveBias ?? 0) * 120;
          const c1x = originX + dx * 0.25 + bias * 0.8;
          const c1y = originY + dy * 0.45;
          const c2x = originX + dx * 0.75 + bias * 0.3;
          const c2y = originY + dy * 0.85;

          // 根须末梢发光点
          const sparkAt = t0 + dur - 4;
          const sparkP = clamp01((N - sparkAt) / 10);
          const breathe = 1 + 0.12 * Math.sin(N * 0.15 + i);

          return (
            <g key={i}>
              {/* 主须 */}
              <path
                d={`M ${originX} ${originY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${root.targetX} ${root.targetY}`}
                fill="none"
                stroke="#2B2419"
                strokeWidth={2.4}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - p}
                opacity={0.88}
              />
              {/* 次级毛细根须 */}
              {p > 0.6 && (
                <path
                  d={`M ${c1x} ${c1y} Q ${c1x + bias * 0.5} ${c1y + 35}, ${c1x + bias * 0.7} ${c1y + 65}`}
                  fill="none"
                  stroke="#5A4E40"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  opacity={(p - 0.6) * 1.5}
                />
              )}

              {/* 末梢 ✦ 星芒发光点 */}
              {sparkP > 0 && (
                <g transform={`translate(${root.targetX}, ${root.targetY}) scale(${sparkP * breathe})`} opacity={sparkP}>
                  {/* 中心晕光 */}
                  <circle cx={0} cy={0} r={8} fill={accent} opacity={0.35} />
                  {/* 8 芒十字星 */}
                  {[0, 45, 90, 135].map((deg) => (
                    <line
                      key={deg}
                      x1={deg % 90 === 0 ? -9 : -5}
                      y1={0}
                      x2={deg % 90 === 0 ? 9 : 5}
                      y2={0}
                      stroke={accent}
                      strokeWidth={deg % 90 === 0 ? 1.8 : 1.2}
                      transform={`rotate(${deg})`}
                    />
                  ))}
                  <circle cx={0} cy={0} r={2} fill={gold} />
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* 4. 标签层（中文名称 + 年代标签） */}
      {roots.map((root, i) => {
        const t0 = root.delay ?? i * 6;
        const dur = root.duration ?? 45;
        const labelAt = t0 + dur - 2;
        const lop = clamp01((N - labelAt) / 12);
        if (lop <= 0) return null;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: root.targetX,
              top: root.targetY + 16,
              transform: 'translateX(-50%)',
              textAlign: 'center',
              opacity: lop,
              pointerEvents: 'none',
              whiteSpace: 'nowrap'
            }}
          >
            <div style={{
              fontFamily: `'Noto Serif SC', 'Songti SC', serif`,
              fontWeight: 700,
              fontSize: 16,
              color: '#2B2419',
              letterSpacing: 2
            }}>
              {root.label}
            </div>
            {root.sub && (
              <div style={{
                fontFamily: `'Fraunces', 'Georgia', serif`,
                fontSize: 12,
                color: '#7D7060',
                letterSpacing: 1,
                marginTop: 4
              }}>
                {root.sub}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
