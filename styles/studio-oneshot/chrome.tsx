import React from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {SUBS} from '../common/subs';
import {camAt, LABEL_ANCHORS, STATIONS, clamp01, spring} from './world';

/**
 * chrome.tsx —— studio-oneshot 覆盖层（HTML 层）：
 * 3D 投影站标（lanshu「世界内命名」语法：标签钉在世界点上，相机飞行时跟随）+ 片头标题 + 字幕 + 收束行 + 开场渐显。
 * 投影：用 world.camAt 同一相机模型手工建 PerspectiveCamera 投影（纯数学，与 3D 画面严格对位）。
 */

const W = 1280, H = 720, FOV = 40;

/** 世界点 → 屏幕像素（与 OneShotScene 相机同参数同轨迹）。 */
const project = (f: number, p: [number, number, number]) => {
  const cam = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 140);
  const {pos, tgt} = camAt(f);
  cam.position.set(pos[0], pos[1], pos[2]);
  cam.up.set(0, 1, 0);
  cam.lookAt(tgt[0], tgt[1], tgt[2]);
  cam.updateMatrixWorld();
  const v = new THREE.Vector3(p[0], p[1], p[2]).project(cam);
  return {x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, behind: v.z > 1};
};

/** 站标（投影跟随 + 出入 8f 淡入淡出）。 */
const StationLabel: React.FC<{k: keyof typeof STATIONS}> = ({k}) => {
  const f = useCurrentFrame() + 1;
  const st = STATIONS[k];
  const a = LABEL_ANCHORS[k];
  const fadeIn = clamp01((f - st.from) / 8);
  const fadeOut = 1 - clamp01((f - st.to) / 8);
  const o = Math.min(fadeIn, fadeOut);
  if (o <= 0.01) return null;
  const {x, y, behind} = project(f, a);
  if (behind || x < 90 || x > W - 90 || y < 70 || y > H - 120) return null;
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,0) translateY(${(1 - fadeIn) * 8}px)`, opacity: o}}>
      <div style={{width: 1, height: 18, background: 'rgba(246,245,241,0.5)', margin: '0 auto 6px'}} />
      <div style={{textAlign: 'center'}}>
        <div style={{fontFamily: "'Noto Sans SC','PingFang SC',sans-serif", fontWeight: 500, fontSize: 22, color: '#f6f5f1', textShadow: '0 1px 10px rgba(0,0,0,0.7)', letterSpacing: '0.08em'}}>
          {st.label}
        </div>
        <div style={{fontFamily: "'Geist Mono','Noto Sans SC',monospace", fontSize: 12, color: '#bdbcb6', marginTop: 2, letterSpacing: '0.14em'}}>
          {st.sub}
        </div>
      </div>
    </div>
  );
};

/** 片头标题：f3 弹簧入场（钩子 0.1s 纪律），f26-34 退场。 */
const Title: React.FC = () => {
  const f = useCurrentFrame() + 1;
  if (f < 3 || f > 34) return null;
  const s = spring((f - 3) / 30, 14, 0.6);
  const out = 1 - clamp01((f - 26) / 8);
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: out, pointerEvents: 'none'}}>
      <div style={{transform: `scale(${0.94 + Math.min(1.08, s) * 0.06}) translateY(${(1 - Math.min(1, s)) * 14}px)`, textAlign: 'center'}}>
        <div style={{fontFamily: "'Noto Sans SC','PingFang SC',sans-serif", fontWeight: 300, fontSize: 46, color: '#f6f5f1', letterSpacing: '0.12em', textShadow: '0 2px 24px rgba(0,0,0,0.8)'}}>
          一枚芯片的旅行
        </div>
        <div style={{fontFamily: "'Geist Mono','Noto Sans SC',monospace", fontSize: 14, color: '#bdbcb6', letterSpacing: '0.42em', marginTop: 12}}>
          从沙子到大脑 · ONE TAKE
        </div>
      </div>
    </div>
  );
};

/** 字幕（SUBS 驱动，白字柔光，无底带——影棚底已够暗）。 */
const Captions: React.FC = () => {
  const f = useCurrentFrame() + 1;
  const cur = SUBS.find((s) => f >= s.from && f <= s.to);
  if (!cur) return null;
  const o = Math.min(clamp01((f - cur.from) / 4), clamp01((cur.to - f) / 4));
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 52, textAlign: 'center', opacity: 0.25 + o * 0.75}}>
      <span style={{fontFamily: "'Noto Sans SC','PingFang SC',sans-serif", fontWeight: 500, fontSize: 33, color: '#f6f5f1', letterSpacing: '0.05em', textShadow: '0 0 16px rgba(255,255,255,0.28), 0 1px 6px rgba(0,0,0,0.8)'}}>
        {cur.text}
      </span>
    </div>
  );
};

/** 收束行（f352 淡入，伴随全景拉出）。 */
const Closing: React.FC = () => {
  const f = useCurrentFrame() + 1;
  const o = clamp01((f - 352) / 12);
  if (o <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 108, textAlign: 'center', opacity: o, transform: `translateY(${(1 - o) * 8}px)`}}>
      <div style={{fontFamily: "'Noto Sans SC','PingFang SC',sans-serif", fontWeight: 300, fontSize: 24, color: '#f6f5f1', letterSpacing: '0.18em', textShadow: '0 1px 14px rgba(0,0,0,0.8)'}}>
        从沙粒到大脑，只隔一条流水线。
      </div>
      <div style={{fontFamily: "'Geist Mono','Noto Sans SC',monospace", fontSize: 11, color: '#8f8e88', letterSpacing: '0.3em', marginTop: 10}}>
        STUDIO ONESHOT · a2v 样片
      </div>
    </div>
  );
};

/** 开场黑起（f1-8 渐显，护住首帧黑）。 */
const OpenFade: React.FC = () => {
  const f = useCurrentFrame() + 1;
  const o = 1 - clamp01((f - 1) / 7);
  if (o <= 0.01) return null;
  return <div style={{position: 'absolute', inset: 0, background: '#0a0a0d', opacity: o}} />;
};

export const Chrome: React.FC = () => (
  <>
    <OpenFade />
    <StationLabel k="A" />
    <StationLabel k="B" />
    <StationLabel k="C" />
    <StationLabel k="D" />
    <Title />
    <Captions />
    <Closing />
  </>
);
