import React from 'react';
import {ARC, CND_PTS, CYA, DEEP, D, DIM, E, flick, FPS, hash, HOT, L, CHK, pad, prog, TARGET, T_LOCK, T_RING, T_SEGS, T_SIG, T_SWEEP, T_TICKS, tw, T} from './kit';

/**
 * 中央环形瞄准镜 + 线框全息地球 + 主雷达锥形余辉（target-lock 签名①）。
 * 技法借鉴 mg-styles-15 demos/22-hud (MIT, Vincentwei1021) hud.js/holo.js，TSX 重写：
 * SEGS 40 段 seeded 刻度环 / 120 tick 方位环 / conic 雷达扫描 / 2D 经纬线旋转近似地球（零 three 依赖）。
 */
const RX = 212, RT = 200, RS = 184, RD_ = 172, RH = 155;

/** SEGS：40 段 seeded 分段环（模块级预计算，确定） */
const SEGS: Array<[number, number, boolean]> = (() => {
  const r: Array<[number, number, boolean]> = [];
  let a = 0, i = 0;
  while (a < 360 && i < 40) {
    const len = 4 + hash(3, i) * 30, gap = 3 + hash(4, i) * 10;
    r.push([a, Math.min(a + len, 360), hash(5, i) > 0.7]);
    a += len + gap;
    i++;
  }
  return r;
})();

/** 捕获自旋加速（候选跳动期 cubic 加速，snap 后急刹） */
export const SPIN = (f: number) => {
  const a = 147, b = 190, A = 55, v = (3 * A) / (b - a);
  const t = f / FPS;
  if (f < a) return 0;
  if (f < b) return A * ((f - a) / (b - a)) ** 3;
  return A + (v * (1 - Math.exp(-(t - b / FPS) * 9))) / 9;
};

/** 十字线 + 开机距离 ping + 标定标尺（boot 钩子编舞） */
const BootFx: React.FC<{f: number}> = ({f}) => {
  const pc = E.outE(prog(f, 1, 5));
  const g = 11, l = 29;
  const b0 = 6;
  const echoes: React.ReactElement[] = [];
  if (f >= b0 && f < 26) {
    for (let e = 0; e < 4; e++) {
      const kp = prog(f - e, b0, 23);
      if (kp <= 0 || kp >= 1) continue;
      const rr = Math.max(2, RX * E.outC(kp)), fa = (1 - kp) ** 0.4 * [1, 0.42, 0.22, 0.1][e];
      echoes.push(<circle key={e} cx={640} cy={360} r={rr} fill="none" stroke={e ? HOT : CYA} strokeWidth={e ? 0.7 : 1.1} opacity={fa} />);
      if (!e) echoes.push(<circle key={`w${e}`} cx={640} cy={360} r={rr} fill="none" stroke={CYA} strokeWidth={4} opacity={0.4 * fa} />);
    }
    // 落定余环
    if (f >= b0 + 23) {
      const d = (f - b0 - 23) / FPS;
      echoes.push(<circle key="land" cx={640} cy={360} r={RX} fill="none" stroke={HOT} strokeWidth={1} opacity={0.55 * Math.exp(-d * 6)} />);
    }
  }
  // 标定标尺：双轴竞速出画后淡去
  const ks = E.outE(prog(f, b0, 11));
  const fade = 1 - E.inOutC(prog(f, 30, 13));
  const RXR = 573 * ks, RYR = 293 * ks;
  const hTicks: React.ReactElement[] = [];
  const vTicks: React.ReactElement[] = [];
  if (ks > 0.05 && fade > 0.01) {
    for (const sx of [-1, 1]) {
      hTicks.push(L(640 + sx * 160, 360.3, 640 + sx * Math.max(160, RXR), 360.3, 1, {c: CYA, a: 0.8 * fade}));
    }
    for (let d = 173; d <= RXR; d += 13) {
      const big = d % 67 < 13, xa = 640 + d, xb = 640 - d;
      for (const x of [xa, xb]) {
        hTicks.push(<line key={`h${x}`} x1={x + 0.3} y1={363} x2={x + 0.3} y2={363 + (big ? 6 : 2.7)} stroke={big ? CYA : DIM} strokeWidth={0.7} opacity={(big ? 0.95 : 0.75) * fade} />);
        if (big && d % 133 < 13) hTicks.push(<text key={`hl${x}`} x={x} y={381} fontFamily={CHK} fontSize={8} fontWeight={600} fill={CYA} textAnchor="middle" opacity={0.9 * fade}>{String(d)}</text>);
      }
    }
    for (const sy of [-1, 1]) vTicks.push(L(640.3, 360 + sy * 160, 640.3, 360 + sy * Math.max(160, RYR), 1, {c: CYA, a: 0.55 * fade}));
    for (let d = 173; d <= RYR; d += 13) {
      const big = d % 67 < 13;
      for (const y of [360 + d, 360 - d]) {
        vTicks.push(<line key={`v${y}`} x1={643} y1={y + 0.3} x2={643 + (big ? 6 : 2.7)} y2={y + 0.3} stroke={big ? CYA : DIM} strokeWidth={0.7} opacity={(big ? 0.7 : 0.55) * fade} />);
      }
    }
  }
  return (
    <g>
      {pc > 0 ? (
        <g>
          {L(640 - g, 360.4, 640 - g - (l - g) * pc, 360.4, 1, {c: HOT, w: 1.1, a: 0.95})}
          {L(640 + g, 360.4, 640 + g + (l - g) * pc, 360.4, 1, {c: HOT, w: 1.1, a: 0.95})}
          {L(640.4, 360 - g, 640.4, 360 - g - (l - g) * pc, 1, {c: HOT, w: 1.1, a: 0.95})}
          {L(640.4, 360 + g, 640.4, 360 + g + (l - g) * pc, 1, {c: HOT, w: 1.1, a: 0.95})}
          <rect x={639} y={359} width={2} height={2} fill={HOT} opacity={pc} />
          {L(640 - 40, 360.3, 640 - 155, 360.3, pc, {c: CYA, a: 0.22})}
          {L(640 + 40, 360.3, 640 + 155, 360.3, pc, {c: CYA, a: 0.22})}
          {L(640.3, 360 - 40, 640.3, 360 - 155, pc, {c: CYA, a: 0.22})}
          {L(640.3, 360 + 40, 640.3, 360 + 155, pc, {c: CYA, a: 0.22})}
        </g>
      ) : null}
      {echoes}
      {hTicks}
      {vTicks}
    </g>
  );
};

/** 中央瞄准镜主组件 */
export const ScopeRing: React.FC<{f: number}> = ({f}) => {
  const p1 = E.outC(prog(f, T_RING, 15));
  const rotDeg = (f / FPS) * 2.2 + 0.35 * SPIN(f);
  const p2 = prog(f, T_TICKS, 15);
  const p3 = E.outC(prog(f, T_SEGS, 20));
  const r2deg = -((f / FPS) * 7 + 20 * E.outQ(prog(f, T_SIG, 24)) + SPIN(f) + 45 * E.outQ(prog(f, T_LOCK, 27)));
  const arcs: React.ReactElement[] = [];
  if (p1 > 0) {
    for (let q = 0; q < 4; q++) arcs.push(ARC(640, 360, RX, rotDeg + q * 90 + 5, rotDeg + q * 90 + 85, p1, {w: 1.1, a: 0.95}));
    if (p1 > 0.5) {
      for (let q = 0; q < 4; q++) {
        const an = (rotDeg + q * 90) * D;
        arcs.push(<line key={`cn${q}`} x1={640 + Math.cos(an) * (RX - 4)} y1={360 + Math.sin(an) * (RX - 4)} x2={640 + Math.cos(an) * (RX + 5.3)} y2={360 + Math.sin(an) * (RX + 5.3)} stroke={CYA} strokeWidth={1.4} opacity={(p1 - 0.5) * 2} />);
      }
    }
  }
  // 120 tick 方位环 + 大刻度方位角标
  const ticks: React.ReactElement[] = [];
  if (p2 > 0) {
    for (let i = 0; i <= 120; i++) {
      const k = i / 120;
      if (k > p2) break;
      const an = (i * 3 - 90) * D, big = i % 10 === 0, mid = i % 5 === 0, len = big ? 9.3 : mid ? 6 : 3.3;
      ticks.push(<line key={`tk${i}`} x1={640 + Math.cos(an) * RT} y1={360 + Math.sin(an) * RT} x2={640 + Math.cos(an) * (RT - len)} y2={360 + Math.sin(an) * (RT - len)} stroke={big ? CYA : DIM} strokeWidth={big ? 1.1 : 0.7} opacity={big ? 1 : 0.9} />);
      if (big && i !== 0 && i !== 60) ticks.push(<text key={`bl${i}`} x={640 + Math.cos(an) * 229} y={360 + Math.sin(an) * 229 + 2.7} fontFamily={CHK} fontSize={8} fontWeight={600} fill={DIM} textAnchor="middle" opacity={flick(f, Math.round(T_TICKS + k * 15))}>{pad(i * 3, 3, 0)}</text>);
    }
  }
  // SEGS 分段环（反转）+ 虚线环 + 光晕环
  const segs: React.ReactElement[] = [];
  if (p3 > 0) {
    SEGS.forEach(([a0, a1, b], i) => {
      if (a0 / 360 > p3) return;
      segs.push(ARC(640, 360, RS, r2deg + a0, r2deg + Math.min(a1, 360 * p3), 1, {c: b ? CYA : DIM, w: b ? 2 : 1.6, a: b ? 0.95 : 0.85, key: `sg${i}`}));
    });
  }
  // SIGNAL DETECTED 高亮弧绕环竞速
  const race = f >= T_SIG && f < T_SIG + 18;
  const sweep = sweepAlpha(f);
  const sweepA = sweepAngle(f);
  const mag = 1.0 + 0.62 * 0;
  void mag;
  return (
    <g>
      <BootFx f={f} />
      {p3 > 0 ? <g>
        <circle cx={640} cy={360} r={RD_} fill="none" stroke={CYA} strokeWidth={0.7} strokeDasharray="1.3 4.7" strokeDashoffset={-(f / FPS) * 30 * 0.7} opacity={0.55 * p3} />
        <circle cx={640} cy={360} r={RH} fill="none" stroke={CYA} strokeWidth={0.7} opacity={0.28 * p3} strokeDasharray={`${(2 * Math.PI * RH * Math.min(p3, 1)).toFixed(1)} 9999`} transform={`rotate(-90 640 360)`} />
      </g> : null}
      {segs}
      {ticks}
      {arcs}
      {race ? (() => {
        const k = E.outC(prog(f, T_SIG, 13)), an = -90 + k * 360;
        return ARC(640, 360, RX, an - 30, an, 1, {c: HOT, w: 2, a: 1 - k * 0.6});
      })() : null}
      {/* 主雷达扫描线（余辉由 SweepConic CSS 层承担） */}
      {sweep > 0 ? <g>
        {L(640 + Math.cos(sweepA) * 13, 360 + Math.sin(sweepA) * 13, 640 + Math.cos(sweepA) * RT, 360 + Math.sin(sweepA) * RT, 1, {c: HOT, w: 1.1, a: 0.95 * sweep})}
        {L(640 + Math.cos(sweepA) * 13, 360 + Math.sin(sweepA) * 13, 640 + Math.cos(sweepA) * RT, 360 + Math.sin(sweepA) * RT, 1, {c: CYA, w: 3.3, a: 0.18 * sweep})}
      </g> : null}
      <ScopeReadouts f={f} />
    </g>
  );
};

export const sweepAngle = (f: number) => (40 + 180 * ((f - T_SWEEP) / FPS) - 90) * D;
export const sweepAlpha = (f: number) => (f < T_SWEEP ? 0 : 1);

/** 瞄准镜四角读数（MAG/FOV/HDG/TLT） */
const ScopeReadouts: React.FC<{f: number}> = ({f}) => {
  const a = flick(f, 30);
  if (!a) return null;
  const rd: Array<[number, number, 'start' | 'end', string, string]> = [
    [640 - 175, 360 - 175, 'end', 'MAG', `×${(1.0 + 0.05 * Math.sin(f / FPS)).toFixed(1)}`],
    [640 + 175, 360 - 175, 'start', 'FOV', `${(12.4 / (1.0 + 0.05 * Math.sin(f / FPS))).toFixed(2)}°`],
    [640 - 175, 360 + 181, 'end', 'HDG', `${(212.46 + 0.01 * (f % 300)).toFixed(2)}°`],
    [640 + 175, 360 + 181, 'start', 'TLT', `${pad(12.0, 2, 1)}°`],
  ];
  return (
    <g>
      {rd.map(([x, y, al, lab, v], i) => (
        <g key={i}>
          {al === 'end' ? <g>
            {T(v, x, y, {s: 9.3, w: 700, al: 'end', a})}
            {T(lab, x - tw(v, 9.3) - 7, y, {f: CHK, w: 600, s: 8, ls: 1.3, c: DIM, al: 'end', a})}
          </g> : <g>
            {T(lab, x, y, {f: CHK, w: 600, s: 8, ls: 1.3, c: DIM, a})}
            {T(v, x + tw(lab, 8, {ls: 1.3}) + 3, y, {s: 9.3, w: 700, a})}
          </g>}
        </g>
      ))}
    </g>
  );
};

/** SweepConic：主雷达锥形余辉（CSS conic-gradient 圆盘，2.0s/圈、0.6π 尾迹） */
export const SweepConic: React.FC<{f: number}> = ({f}) => {
  const a = f < T_SWEEP ? null : sweepAngle(f) / D;
  if (a === null) return null;
  const tr = 108;
  const from = a - tr;
  const g = `conic-gradient(from ${from.toFixed(2)}deg, rgba(0,229,255,0) 0deg, rgba(0,229,255,0.06) ${(tr * 0.5).toFixed(1)}deg, rgba(0,229,255,0.16) ${(tr * 0.86).toFixed(1)}deg, rgba(0,229,255,0.38) ${tr}deg, rgba(0,229,255,0) ${tr + 0.05}deg, rgba(0,229,255,0) 360deg)`;
  const size = RT * 2;
  return (
    <div style={{position: 'absolute', left: 640 - RT, top: 360 - RT, width: size, height: size, borderRadius: '50%', background: g, opacity: 0.9}} />
  );
};

/** HoloGlobe：线框全息地球（2D 正交近似：经纬线绕 Y 轴旋转 + 前后明暗 + 虚线轨道 + 小行星） */
export const HoloGlobe: React.FC<{f: number}> = ({f}) => {
  const fade = E.outC(prog(f, 30, 30)) * (f >= T_LOCK ? 0.85 : 1);
  if (fade <= 0.01) return null;
  const r = 150, tilt = 12 * D, w = (14 + (f / FPS) * 13 + 40 * E.outQ(prog(f, T_LOCK, 30))) * D;
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const project = (lat: number, lon: number): [number, number, boolean] => {
    const la = lat * D, lo = lon * D + w;
    const x3 = Math.cos(la) * Math.sin(lo), y3 = Math.sin(la), z3 = Math.cos(la) * Math.cos(lo);
    const y2 = y3 * ct - z3 * st, z2 = y3 * st + z3 * ct;
    return [640 + x3 * r, 360 - y2 * r, z2 > 0];
  };
  const buildPath = (pts: Array<[number, number, boolean]>) => {
    let d = '', pen = false;
    for (const [x, y, front] of pts) {
      if (!front) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)} `;
      pen = true;
    }
    return d;
  };
  const buildBack = (pts: Array<[number, number, boolean]>) => {
    let d = '', pen = false;
    for (const [x, y, front] of pts) {
      if (front) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)} `;
      pen = true;
    }
    return d;
  };
  const meridiansF: string[] = [], meridiansB: string[] = [], parallelsF: string[] = [], parallelsB: string[] = [];
  for (let lon = -180; lon < 180; lon += 30) {
    const pts: Array<[number, number, boolean]> = [];
    for (let lat = -84; lat <= 84; lat += 7) pts.push(project(lat, lon));
    meridiansF.push(buildPath(pts));
    meridiansB.push(buildBack(pts));
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts: Array<[number, number, boolean]> = [];
    for (let lon = -180; lon <= 180; lon += 5) pts.push(project(lat, lon));
    parallelsF.push(buildPath(pts));
    parallelsB.push(buildBack(pts));
  }
  // 轨道（椭圆参数线）+ 小行星（签名目标 NEO-2031 沿轨运行）
  const orbA = -18 * D, rx = 210, ry = 64;
  const orbPt = (s: number): [number, number] => {
    const ex = Math.cos(s * D) * rx, ey = Math.sin(s * D) * ry;
    return [640 + ex * Math.cos(orbA) - ey * Math.sin(orbA), 360 + ex * Math.sin(orbA) + ey * Math.cos(orbA)];
  };
  const astS = 20 + (f / FPS) * 7;
  const [ax, ay] = orbPt(astS);
  const orbPts: string[] = [];
  for (let s = 0; s <= 360; s += 4) {
    const [x, y] = orbPt(s);
    orbPts.push(`${s ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  const trail: React.ReactElement[] = [];
  for (let i = 1; i <= 5; i++) {
    const [tx, ty] = orbPt(astS - i * 5);
    trail.push(<circle key={i} cx={tx} cy={ty} r={1} fill={CYA} opacity={0.35 * (1 - i / 6) * fade} />);
  }
  // 目标连线：轨道小行星 → HUD 目标括号（签名呼应）
  const beam = f >= T_LOCK ? Math.sin(prog(f, T_LOCK, 20) * Math.PI) : 0;
  return (
    <svg width={1280} height={720} style={{position: 'absolute', inset: 0}} opacity={fade}>
      <circle cx={640} cy={360} r={r} fill="none" stroke={CYA} strokeWidth={0.7} opacity={0.25} />
      <g stroke={CYA} strokeWidth={0.55} fill="none" opacity={0.35}>
        {meridiansB.map((d, i) => <path key={`mb${i}`} d={d} opacity={0.25} />)}
        {parallelsB.map((d, i) => <path key={`pb${i}`} d={d} opacity={0.25} />)}
      </g>
      <g stroke={CYA} strokeWidth={0.7} fill="none" opacity={0.62}>
        {meridiansF.map((d, i) => <path key={`mf${i}`} d={d} />)}
        {parallelsF.map((d, i) => <path key={`pf${i}`} d={d} />)}
      </g>
      <path d={orbPts.join(' ')} fill="none" stroke={CYA} strokeWidth={0.7} strokeDasharray="3 4" opacity={0.28} />
      {trail}
      <path d={`M ${ax} ${ay - 3.3} L ${ax + 3.3} ${ay} L ${ax} ${ay + 3.3} L ${ax - 3.3} ${ay} Z`} fill={HOT} opacity={0.95} />
      {beam > 0.01 ? <g>
        {L(ax, ay, TARGET.x, TARGET.y, 1, {c: HOT, w: 0.8, a: 0.5 * beam, dash: '2 4'})}
        <circle cx={TARGET.x} cy={TARGET.y} r={4 + 10 * (1 - beam)} fill="none" stroke={HOT} strokeWidth={1} opacity={beam * 0.8} />
      </g> : null}
      <g opacity={0.55}>
        {T('HOLO·ORBIT', 452, 260, {f: CHK, w: 600, s: 8, ls: 1.7, c: DIM, al: 'start'})}
      </g>
      {CND_PTS.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r={1.7} fill={DEEP} />)}
    </svg>
  );
};
