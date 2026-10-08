// vhs-outrun 公路元素：棕榈剪影 PalmField（品红描边 pass + 黑体 pass 双层）+ 反光柱 ReflectorPosts
// + 路灯光带 LightBand + 速度线 SpeedLines。透视投影走 kit.project，纵向循环由 Z 积分驱动。
// 技法借鉴 mg-styles-15 demos/10-synthwave (MIT, Vincentwei1021)，TSX 重写。
import React from 'react';
import {W, H} from '../common';
import {PK, project, HORIZON} from './kit';
import {sceneTime, speed, hash1, zAt} from './timeline';

// ---- 单棵棕榈：SVG 剪影（双层 = 品红 rim 描边层 + 深色本体层，错位 rimDir）----
const PalmShape: React.FC<{seed: number; rimDir: number; w: number; h: number; dark: string}> = ({seed, rimDir, w, h, dark}) => {
  const fronds: Array<{a: number; len: number; droop: number}> = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    fronds.push({a: -168 + (360 / (n - 1)) * i + (hash1(seed * 13.7 + i) - 0.5) * 26, len: h * (0.34 + hash1(seed * 7.9 + i * 3.1) * 0.12), droop: 0.5 + hash1(seed * 3.3 + i) * 0.5});
  }
  const topX = w / 2, topY = h * 0.30;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display: 'block', overflow: 'visible'}}>
      {[0, 1].map((pass) => {
        const isRim = pass === 0;
        const dx = isRim ? rimDir * w * 0.045 : 0;
        const col = isRim ? PK.pink : dark;
        const op = isRim ? 0.9 : 1;
        return (
          <g key={pass} transform={`translate(${dx},0)`} opacity={op}>
            {/* 树干（微曲） */}
            <path d={`M ${topX} ${topY} C ${topX + w * 0.03} ${h * 0.5}, ${topX - w * 0.02} ${h * 0.72}, ${topX + w * 0.015} ${h}`} fill="none" stroke={col} strokeWidth={w * 0.055} strokeLinecap="round" />
            {/* 叶冠：7 片下垂弧叶 */}
            {fronds.map((fr, i) => {
              const rad = (fr.a * Math.PI) / 180;
              const ex = topX + Math.cos(rad) * fr.len;
              const ey = topY + Math.abs(Math.sin(rad)) * fr.len * fr.droop * 0.9 + fr.len * 0.12;
              const cx = topX + Math.cos(rad) * fr.len * 0.55;
              const cyy = topY + Math.sin(Math.abs(rad)) * fr.len * 0.16 - fr.len * 0.22;
              return <path key={i} d={`M ${topX} ${topY} Q ${cx} ${cyy} ${ex} ${ey}`} fill="none" stroke={col} strokeWidth={w * (0.05 - (i % 2) * 0.012)} strokeLinecap="round" />;
            })}
            <circle cx={topX} cy={topY} r={w * 0.045} fill={col} />
          </g>
        );
      })}
    </svg>
  );
};

// ---- 棕榈阵列：两侧循环掠过（品红 rim 面向路心，hash 定距/定高/变体）----
export const PalmField: React.FC<{f: number}> = ({f}) => {
  const t = sceneTime(f);
  const travel = -zAt(t);
  const N = 5, SP = 11, LOOP = N * SP;
  const items: React.ReactNode[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < N; i++) {
      const seed = Math.round(side * 100 + i * 17.3);
      const jitter = (hash1(seed * 2.71) - 0.5) * 3.4;
      const wx = side * (12.6 + hash1(seed * 5.1) * 4.5) + jitter;
      const hWorld = 5.4 + hash1(seed * 9.7) * 1.8;
      const zRel = (((i * SP - travel) % LOOP) + LOOP) % LOOP + 3.0;
      const {x, k, groundY} = project(wx, zRel);
      const hPx = hWorld * k;
      const wPx = hPx * 0.72;
      const far = 1 - Math.min(Math.max((zRel - LOOP * 0.55) / (LOOP * 0.45), 0), 1); // 远端淡入
      if (hPx < 4) continue;
      items.push(
        <div key={`${side}-${i}`} style={{position: 'absolute', left: x - wPx / 2, top: groundY - hPx * 0.7, width: wPx, height: hPx, opacity: (0.92 * far).toFixed(3), zIndex: 5}}>
          <PalmShape seed={seed} rimDir={-side} w={wPx} h={hPx} dark={PK.ink} />
        </div>,
      );
    }
  }
  return <div style={{position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 5}}>{items}</div>;
};

// ---- 反光柱：路缘两列，青/品红交替，白帽反光点 ----
export const ReflectorPosts: React.FC<{f: number}> = ({f}) => {
  const t = sceneTime(f);
  const travel = -zAt(t);
  const N = 9, SP = 4.6, LOOP = N * SP;
  const items: React.ReactNode[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < N; i++) {
      const zRel = (((i * SP - travel) % LOOP) + LOOP) % LOOP + 2.6;
      const {x, k, groundY} = project(side * 8.9, zRel);
      const hPx = Math.max(1.15 * k, 2);
      const wPx = Math.max(0.16 * k, 1.5);
      const far = 1 - Math.min(Math.max((zRel - LOOP * 0.5) / (LOOP * 0.5), 0), 1);
      const col = i % 2 === 0 ? PK.cyan : PK.pink;
      items.push(
        <div key={`${side}-${i}`} style={{position: 'absolute', left: x - wPx / 2, top: groundY - hPx, width: wPx, height: hPx,
          background: col, opacity: (0.9 * far).toFixed(3),
          boxShadow: `0 0 4px ${col}, 0 0 14px ${col}55`}}>
          <div style={{position: 'absolute', left: -wPx * 0.5, top: 0, width: wPx * 2, height: Math.max(wPx, 2), background: '#ffffff', opacity: 0.85 * far}} />
        </div>,
      );
    }
  }
  return <div style={{position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 4}}>{items}</div>;
};

// ---- 路灯光带：横贯光痕（HERO 段「路灯连成光带」，屏幕上方拉丝，速度越快越长）----
export const LightBand: React.FC<{f: number}> = ({f}) => {
  const t = sceneTime(f);
  const sp = speed(t);
  const intensity = Math.min(Math.max((sp - 56) / 22, 0), 1); // S03 起渐显
  if (intensity <= 0.02) return null;
  const travel = -zAt(t);
  const N = 7, SP = 6.2, LOOP = N * SP;
  const items: React.ReactNode[] = [];
  for (let i = 0; i < N; i++) {
    const zRel = (((i * SP - travel) % LOOP) + LOOP) % LOOP + 3.5;
    const k = 772 / zRel;
    const y = HORIZON - 4.4 * k;
    if (y < -30 || y > HORIZON - 40) continue;
    const side = i % 2 === 0 ? -1 : 1;
    const x = W / 2 + side * 7.4 * k;
    const len = (70 + sp * 4.4) * Math.min(k / 90, 1.4);
    const far = 1 - Math.min(Math.max((zRel - LOOP * 0.55) / (LOOP * 0.45), 0), 1);
    items.push(
      <div key={i} style={{position: 'absolute', left: x - len / 2, top: y - 2, width: len, height: 4,
        background: 'linear-gradient(90deg, transparent, rgba(190,245,255,0.95), transparent)',
        opacity: (intensity * far * 0.9).toFixed(3), mixBlendMode: 'screen'}} />,
    );
  }
  return <div style={{position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 6}}>{items}</div>;
};

// ---- 速度线：屏幕空间横向拉丝（S02 起），seeded y + 速度比例长度 ----
export const SpeedLines: React.FC<{f: number}> = ({f}) => {
  const t = sceneTime(f);
  const sp = speed(t);
  const intensity = Math.min(Math.max((sp - 50) / 28, 0), 1);
  if (intensity <= 0.02) return null;
  const items: React.ReactNode[] = [];
  for (let i = 0; i < 10; i++) {
    const h1 = hash1(i * 11.7 + 5);
    const y = 60 + h1 * (H - 140);
    const len = 90 + hash1(i * 7.3 + 9) * 200 + sp * 2.6;
    const v = (260 + hash1(i * 5.1 + 2) * 240) * (sp / 60);
    const x = W + 60 - (((t * v + h1 * (W + 400)) % (W + 420)));
    items.push(
      <div key={i} style={{position: 'absolute', left: x, top: y, width: len, height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(255,220,240,0.85), transparent)',
        opacity: (intensity * (0.25 + hash1(i * 3.9) * 0.5)).toFixed(3), mixBlendMode: 'screen'}} />,
    );
  }
  return <div style={{position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 6}}>{items}</div>;
};
