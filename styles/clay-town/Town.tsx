import React from 'react';
import {useCurrentFrame} from 'remotion';
import {camPan, LAYER_SPEED, SLAB_AT, STOX, STOY, EASE, FRONT_BUSHES, DECO, PIPES, HERO_RIDE, wob} from './world';
import {CLAY, shade, groundPos, ClaySlab, ClayHouse, ClayTree, ClayFlower, ClayBush, ClayPipe, ClayTap, ClayTower, Droplet} from './kit';

/**
 * Town.tsx — 黏土小城三层舞台（运镜=整组平移，前中后景 1:0.8:0.6 视差速度，isometric-city 同族方法）。
 * 全片常驻（Main 底层），相机 camPan(f) 由 world.ts 给出；镜头组件只做站点局部覆盖层。
 * 本层内所有坐标为中景层局部坐标（不含相机位移）。
 */

/** 远景层（0.6×）：暖奶油丘陵 + 黏土云。 */
export const BackLayer: React.FC = () => {
  const f = useCurrentFrame();
  const pan = camPan(f) * LAYER_SPEED.back;
  const clouds = [
    {x: 300, y: 88, s: 1.05, drift: 7},
    {x: 960, y: 146, s: 0.75, drift: -5},
    {x: 1740, y: 70, s: 1.2, drift: 9},
    {x: 2420, y: 138, s: 0.85, drift: -7},
    {x: 3100, y: 92, s: 1.0, drift: 6},
  ];
  const hills = [
    {x: 150, w: 420, h: 120, c: 0},
    {x: 620, w: 560, h: 86, c: 1},
    {x: 1400, w: 480, h: 130, c: 0},
    {x: 1900, w: 620, h: 92, c: 1},
    {x: 2680, w: 500, h: 126, c: 0},
    {x: 3220, w: 580, h: 88, c: 1},
  ];
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 1, isolation: 'isolate'}}>
      <div style={{position: 'absolute', left: -pan, top: 0, width: 5600, height: '100%'}}>
        {hills.map((hl, i) => (
          <div key={i} style={{position: 'absolute', left: hl.x, bottom: 226, width: hl.w, height: hl.h, borderRadius: '50%',
            background: `radial-gradient(ellipse at 42% 18%, ${['#F6E8D2', '#F3E2C9'][hl.c]}, ${['#F2DFC4', '#EFDBC0'][hl.c]} 62%)`, opacity: 0.55}} />
        ))}
        {clouds.map((c, i) => (
          <div key={i} style={{position: 'absolute', left: c.x + Math.sin((f / 30) * 0.22 + i * 2.1) * c.drift, top: c.y, opacity: 0.95}}>
            <div style={{width: 110 * c.s, height: 36 * c.s, borderRadius: 999, background: '#FFF8EC', boxShadow: '0 8px 0 rgba(227,196,164,0.5)'}} />
            <div style={{position: 'absolute', left: 24 * c.s, top: -15 * c.s, width: 52 * c.s, height: 30 * c.s, borderRadius: 999, background: '#FFF8EC'}} />
            <div style={{position: 'absolute', right: 18 * c.s, top: -9 * c.s, width: 36 * c.s, height: 24 * c.s, borderRadius: 999, background: '#FFF8EC'}} />
          </div>
        ))}
      </div>
    </div>
  );
};

/** 水滴角色的位置与形态（全片时间线）：SC01 龙头口蹦出 → SC02 塔顶探头/潜入 → SC03 干管滑行 → SC04 落杯。 */
type DripState = {x: number; y: number; s: number; z: number; squash: number; face: boolean; opacity?: number};
const dropletState = (f: number): DripState | null => {
  const bob = Math.sin(f / 7) * 3;
  // —— SC01（A 站龙头）：f54 自出水口蹦出 ——
  const tap = groundPos('A', 4.6, 3.5);
  const restA = {x: tap.x - 38, y: tap.y - 52};
  const popA = EASE.spring((f - 54) / 30, 20, 0.5, 6);
  // —— SC02（B 站塔顶探头 f162 → 潜入 f178-186）——
  const tw = groundPos('B', 2.8, 2.4);
  const peek = {x: tw.x + 26, y: tw.y - 196 + bob * 0.6};
  const popP = EASE.spring((f - 162) / 30, 20, 0.5, 6);
  const dive = EASE.easeInOutPow(EASE.clamp01((f - 178) / 8), 2);
  // —— SC03（C 站管网滑行）——
  const p1 = groundPos('C', 0.2, 3.6), p1e = groundPos('C', 2.2, 3.6);
  const p2e = groundPos('C', 4.2, 3.6);
  let ride = null as null | {x: number; y: number};
  if (f >= HERO_RIDE.f0 && f <= HERO_RIDE.arrive) {
    if (f < HERO_RIDE.p1End) {
      const t = (f - HERO_RIDE.f0) / (HERO_RIDE.p1End - HERO_RIDE.f0);
      ride = {x: p1.x + (p1e.x - p1.x) * t, y: p1.y + (p1e.y - p1.y) * t - 14};
    } else if (f < HERO_RIDE.p2End) {
      const t = (f - HERO_RIDE.p1End) / (HERO_RIDE.p2End - HERO_RIDE.p1End);
      ride = {x: p1e.x + (p2e.x - p1e.x) * t, y: p1e.y + (p2e.y - p1e.y) * t - 14};
    } else {
      const t = (f - HERO_RIDE.p2End) / (HERO_RIDE.arrive - HERO_RIDE.p2End);
      ride = {x: p2e.x + 14 * t, y: p2e.y + 6 * t - 14 * (1 - t)};
    }
  }
  // —— SC04（A 站落杯）——
  const glass = {x: tap.x - 22, y: tap.y + 8};
  const fallT = EASE.clamp01((f - 322) / 7);
  const inCup = {x: glass.x, y: glass.y - 30 - (1 - fallT) * (1 - fallT) * 130};
  const popCup = EASE.spring((f - 334) / 30, 20, 0.5, 6);

  if (f <= 100) {
    if (popA <= 0.001) return null;
    return {x: restA.x, y: restA.y + bob, s: Math.min(popA, 1.05), z: 94, squash: Math.max(0, 1 - popA) * 0.3, face: true};
  }
  if (f <= 186) {
    if (popP <= 0.001) return null;
    const sink = f >= 178 ? dive * 46 : 0;
    const op = f >= 178 ? 1 - dive * 0.55 : 1;
    return {x: peek.x, y: peek.y + sink, s: Math.min(popP, 1.05), z: 91, squash: 0, face: true, opacity: op};
  }
  if (ride) {
    return {x: ride.x, y: ride.y, s: 0.92, z: 96, squash: 0, face: true};
  }
  if (f >= 258 && f < 292) return null; // 没入 C 楼后隐身
  if (f >= 292 && f < 318) return null; // 回程运镜中隐身（S04 落杯前）
  if (f >= 318) {
    if (f < 334) {
      const ft = EASE.clamp01((f - 322) / 7);
      if (f < 322) return null;
      return {x: inCup.x, y: inCup.y, s: 0.8 + 0.12 * Math.sin(ft * Math.PI), z: 96, squash: 0, face: true};
    }
    if (popCup <= 0.001) return null;
    return {x: inCup.x, y: glass.y - 34 + Math.sin(f / 6) * 1.6, s: 0.72 * Math.min(popCup, 1.04), z: 96, squash: 0, face: true};
  }
  return null;
};

/** 中景层（0.8×）：三站底座 + 黏土props + 管网 + 水滴。 */
export const MidLayer: React.FC = () => {
  const f = useCurrentFrame();
  const pan = camPan(f) * LAYER_SPEED.mid;
  const blink = (f % 44) < 3;
  const towerBlink = (f % 52) < 4;
  const d = dropletState(f);
  // hero 滑行柔光
  const glowAt = d && f >= HERO_RIDE.f0 && f <= HERO_RIDE.arrive ? {x: d.x, y: d.y} : null;
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 2, isolation: 'isolate'}}>
      <div style={{position: 'absolute', left: -pan, top: 0, width: 5600, height: '100%'}}>
        {/* 站点光垫 */}
        {(['A', 'B', 'C'] as const).map((st) => (
          <div key={st} style={{position: 'absolute', left: STOX[st] - 330, top: STOY + 148, width: 660, height: 270, borderRadius: '50%',
            background: 'radial-gradient(closest-side, rgba(222,178,130,0.12), transparent 68%)'}} />
        ))}
        {/* —— A 站：你家 —— */}
        <ClaySlab ox={STOX.A} nu={6.8} nv={6.8} t0={SLAB_AT.A} f={f} />
        <ClayHouse st="A" u={1.9} v={2.2} w={2.1} d={1.9} h={1.7} t0={24} f={f} seed={11} chimney={{fu: 0.34, fv: 0.62, hc: 46}} />
        <ClayTap st="A" u={4.6} v={3.5} t0={38} f={f}
          turn={(f >= 48 ? EASE.easeOutCubic((f - 48) / 8) * 90 : 0) + (f >= 322 ? EASE.easeOutCubic((f - 322) / 6) * 70 : 0)} />
        {/* —— B 站：水塔 —— */}
        <ClaySlab ox={STOX.B} nu={6.8} nv={6.8} t0={SLAB_AT.B} f={f} />
        <ClayTower st="B" u={2.8} v={2.4} t0={128} f={f} blink={towerBlink} />
        {/* —— C 站：管网 + 小楼 —— */}
        <ClaySlab ox={STOX.C} nu={6.8} nv={6.8} t0={SLAB_AT.C} f={f} />
        {PIPES.map((s) => <ClayPipe key={s.id} ox={STOX.C} u={s.u} v={s.v} len={s.len} dir={s.dir} grow={s.grow} lit={s.lit} f={f} />)}
        {/* 管网接头球 */}
        {[[2.2, 3.6, 216], [2.2, 5.8, 226], [4.2, 3.6, 234]].map(([ju, jv, t0], i) => {
          const pop = EASE.spring((f - (t0 as number)) / 30, 18, 0.5, 5);
          if (pop <= 0.02) return null;
          const p = groundPos('C', ju as number, jv as number);
          return (
            <div key={i} style={{position: 'absolute', left: p.x - 9, top: p.y - 11, width: 18, height: 18, borderRadius: '50%',
              transform: `scale(${Math.min(pop, 1.05)})`, zIndex: Math.round(((ju as number) + (jv as number)) * 10) + 1, ...{background: `radial-gradient(circle at 34% 30%, ${shade(CLAY.slate, 1.18)}, ${CLAY.slate} 58%, ${shade(CLAY.slate, 0.85)})`, boxShadow: 'inset 0 0 4px rgba(74,58,49,0.2)'}}} />
          );
        })}
        <ClayHouse st="C" u={4.0} v={2.2} w={1.8} d={1.6} h={1.4} t0={222} f={f} wall={CLAY.cream} roof={CLAY.moss} seed={23} />
        {/* C 楼窗亮（水到 f264 → 暖窗） */}
        {(() => {
          const on = EASE.easeOutCubic((f - HERO_RIDE.window) / 8);
          if (on <= 0) return null;
          const wp = groundPos('C', 4.9, 2.9);
          return (
            <div style={{position: 'absolute', left: wp.x - 9, top: wp.y - 62, width: 18, height: 18, borderRadius: '50%',
              background: `radial-gradient(circle at 40% 34%, #FFF3C4, ${CLAY.butter})`, opacity: on,
              boxShadow: on > 0.5 ? '0 0 14px rgba(245,206,126,0.85)' : undefined, zIndex: 108}} />
          );
        })()}
        {/* —— 站内绿植 —— */}
        {DECO.map((dc, i) => {
          const p = groundPos(dc.st, dc.u, dc.v);
          const ap = EASE.easeOutCubic((f - dc.t0) / 9);
          if (dc.kind === 'tree') return <ClayTree key={i} x={p.x} y={p.y} s={0.95 + wob(i * 13, 0.18)} col={dc.col} appear={ap} z={Math.round((dc.u + dc.v) * 10) + 1} seed={i * 17} />;
          if (dc.kind === 'flower') return <ClayFlower key={i} x={p.x} y={p.y} col={dc.col} appear={ap} z={Math.round((dc.u + dc.v) * 10) + 1} />;
          return <ClayBush key={i} x={p.x} y={p.y} col={dc.col} appear={ap} z={Math.round((dc.u + dc.v) * 10) + 1} />;
        })}
        {/* —— 水滴角色（贯穿）—— */}
        {glowAt && (
          <div style={{position: 'absolute', left: glowAt.x - 90, top: glowAt.y - 60, width: 180, height: 120, borderRadius: '50%', zIndex: 58,
            background: 'radial-gradient(closest-side, rgba(143,193,238,0.26), transparent 70%)', filter: 'blur(2px)'}} />
        )}
        {d && <Droplet x={d.x} y={d.y} s={d.s} sy={1 - (d.squash ?? 0)} face={d.face} blink={blink} opacity={d.opacity ?? 1} z={d.z} />}
      </div>
    </div>
  );
};

/** 前景层（1.0×）：近景黏土灌木带（视差读感最强的一层）。 */
export const FrontLayer: React.FC = () => {
  const f = useCurrentFrame();
  const pan = camPan(f) * LAYER_SPEED.front;
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 4, isolation: 'isolate'}}>
      <div style={{position: 'absolute', left: -pan, top: 0, width: 5600, height: '100%'}}>
        {FRONT_BUSHES.map((b, i) => {
          const ap = EASE.easeOutCubic((f - b.t0) / 10);
          return <ClayTree key={i} x={b.x} y={b.y} s={b.s * 0.9} col={b.col} appear={ap} ground={false} z={5 + (i % 3)} seed={i * 29} />;
        })}
      </div>
    </div>
  );
};
