import React from 'react';
import {useCurrentFrame} from 'remotion';
import {LAYER_SPEED, MID_TREES, STOX, STOY, EASE, FRONT_PROPS, BOXES} from './world';
import {ISO, Tiles, IsoBox, TreeIso, CarIso, camPan, camPunch} from './kit';

/**
 * City.tsx — 等轴小城三层舞台（签名特征 4：运镜=整组平移（无旋转），前中后景 1:0.8:0.6 视差速度；
 * v4.0：pan 由 kit.tsx 的 hermite 关键帧表驱动，drop 帧 zoom punch 预备统一绕屏心 scale）。
 * 全片常驻（Main 底层），镜头组件只做站点局部覆盖层。
 */

/** 远景层（0.6×）：远处剪影楼群 + 缓漂云（天空渐变由 Main 铺）。 */
export const BackLayer: React.FC = () => {
  const f = useCurrentFrame();
  const pan = camPan(f) * LAYER_SPEED.back;
  const punch = camPunch(f);
  const clouds = [
    {x: 320, y: 92, s: 1.0, drift: 7},
    {x: 980, y: 148, s: 0.7, drift: -5},
    {x: 1750, y: 76, s: 1.15, drift: 9},
    {x: 2380, y: 140, s: 0.8, drift: -7},
    {x: 3050, y: 96, s: 1.0, drift: 6},
  ];
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 1, isolation: 'isolate'}}>
      <div style={{position: 'absolute', inset: 0, transformOrigin: '640px 360px', transform: `scale(${punch.toFixed(5)})`}}>
      <div style={{position: 'absolute', left: -pan, top: 0, width: 5600, height: '100%'}}>
        {[...Array(46)].map((_, i) => {
          const r = EASE.rng(900 + i)();
          const w = 34 + r * 60;
          const h = 44 + r * 125;
          return <div key={i} style={{position: 'absolute', left: i * 122 + r * 40, bottom: 300, width: w, height: h, borderRadius: 6, background: i % 3 === 0 ? '#CEC6F1' : '#D8D2F5', opacity: 0.42}} />;
        })}
        {clouds.map((c, i) => (
          <div key={i} style={{position: 'absolute', left: c.x + Math.sin((f / 30) * 0.25 + i * 2.1) * c.drift, top: c.y, opacity: 0.9}}>
            <div style={{width: 108 * c.s, height: 34 * c.s, borderRadius: 999, background: ISO.white, boxShadow: '0 10px 0 rgba(167,158,226,0.35)'}} />
            <div style={{position: 'absolute', left: 26 * c.s, top: -16 * c.s, width: 52 * c.s, height: 30 * c.s, borderRadius: 999, background: ISO.white}} />
          </div>
        ))}
        {/* 等轴点阵地面的「虚空」延伸（rotate45+scaleY0.52 → ±26.57° 点阵；随远景层 0.6× 平移） */}
        <div style={{position: 'absolute', left: -1200, top: 470, width: 8000, height: 700, opacity: 0.3,
          background: `radial-gradient(circle, ${ISO.dot} 2.6px, transparent 3.2px)`, backgroundSize: '56px 56px',
          transform: 'rotate(45deg) scaleY(0.52)', transformOrigin: '50% 50%',
          maskImage: 'linear-gradient(to bottom, transparent 6%, #000 32%, #000 55%, transparent 88%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 6%, #000 32%, #000 55%, transparent 88%)'}} />
      </div>
      </div>
    </div>
  );
};

/** 中景层（0.8×）：三站地台 + 建筑 + 站内树 + 环路行车。 */
export const MidLayer: React.FC = () => {
  const f = useCurrentFrame();
  const pan = camPan(f) * LAYER_SPEED.mid;
  const punch = camPunch(f);
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 2, isolation: 'isolate'}}>
      <div style={{position: 'absolute', inset: 0, transformOrigin: '640px 360px', transform: `scale(${punch.toFixed(5)})`}}>
      <div style={{position: 'absolute', left: -pan, top: 0, width: 5600, height: '100%'}}>
        {(['A', 'B', 'C'] as const).map((st) => (
          <div key={st} style={{position: 'absolute', left: STOX[st] - 320, top: STOY + 150, width: 640, height: 260, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(103,92,190,0.16), transparent 70%)'}} />
        ))}
        {(['A', 'B', 'C'] as const).map((st) => (
          <React.Fragment key={st}>
            <Tiles st={st} f={f} />
            {BOXES.map((b) => <IsoBox key={b.id} def={b} f={f} />)}
            {MID_TREES.map((t, i) => t.st === st ? (
              <TreeIso key={i} x={STOX[st] + (t.u - t.v) * 0.866 * 56} y={252 + (t.u + t.v) * 0.5 * 56} s={t.s} col={t.col}
                appear={EASE.easeOutCubic((f - t.t0) / 9)} z={Math.round((t.u + t.v) * 10) + 1} />
            ) : null)}
          </React.Fragment>
        ))}
        {([0, 1, 2] as const).map((ci) => <CarIso key={ci} f={f} idx={ci} st={['A', 'B', 'C'][ci] as 'A' | 'B' | 'C'} />)}
      </div>
      </div>
      <IgnitionBeam />
    </div>
  );
};

/** 前景层（1.0×）：近景大树带（视差读感最强的一层）。 */
export const FrontLayer: React.FC = () => {
  const f = useCurrentFrame();
  const pan = camPan(f) * LAYER_SPEED.front;
  const punch = camPunch(f);
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 4, isolation: 'isolate'}}>
      <div style={{position: 'absolute', inset: 0, transformOrigin: '640px 360px', transform: `scale(${punch.toFixed(5)})`}}>
      <div style={{position: 'absolute', left: -pan, top: 0, width: 5600, height: '100%'}}>
        {FRONT_PROPS.map((p, i) => (
          <TreeIso key={i} x={p.x} y={p.y + 46} s={p.s} col={p.col} appear={EASE.easeOutCubic((f - p.t0) / 10)} ground={false} z={5 + (i % 3)} />
        ))}
      </div>
      </div>
    </div>
  );
};

/** hero 点亮扫掠的光前沿（SC04 覆盖层，B 站上方一道 cyan 光带沿 screen-x 推进；坐标随中景层视差偏移）。 */
export const IgnitionBeam: React.FC = () => {
  const f = useCurrentFrame();
  const t = (f - 235) / 33; // f235-268
  if (t <= 0 || t >= 1) return null;
  const x = EASE.easeOutCubic(t);
  const bx = STOX.B - camPan(f) * LAYER_SPEED.mid; // B 站当前屏幕 x（中景层）
  const X0 = bx - 300 + x * 1500;
  return (
    <div style={{position: 'absolute', left: X0 - 130, top: 210, width: 260, height: 330,
      background: 'linear-gradient(90deg, transparent, rgba(98,240,242,0.20) 45%, rgba(98,240,242,0.34) 50%, rgba(98,240,242,0.20) 55%, transparent)',
      opacity: 0.85 * (1 - t * 0.35), filter: 'blur(1px)'}} />
  );
};
