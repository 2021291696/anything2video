import React from 'react';
import {blink, CHK, CYA, DEEP, DIM, E, flick, hash, HOT, L, pad, PanelChrome, prog, RadarMini, roll, scramble, Sparkline, T, T_LOCK, T_SIG, typed, CJKF, tw} from './kit';

/**
 * 左右数据列（target-lock 签名③：等宽小字数据流——boot log 打字机 / RNG 大数 scramble→roll /
 * 遥测条 / sparkline / 候选表 / 频谱 / hex 数据流 + UPLINK）。
 * 技法借鉴 mg-styles-15 demos/22-hud (MIT, Vincentwei1021) hud.js leftCol/rightCol，TSX 重写。
 * 密度纪律：面板网格对齐（左列 x64 w200 / 右列 x1016 w200），入场错峰表见各 t0。
 */
const LX = 64, RW = 200, RXC = 1016, FPS = 30;

/** 面板层级亮度 tier：相位表驱动（聚焦中环时两列变暗，源码 tier 手法） */
const tier = (f: number, keys: Array<[number, number]>) => {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t, tv] = keys[i];
    const u = Math.min(1, Math.max(0, (f - t + 4) / 8));
    v = v + (tv - v) * (u * u * (3 - 2 * u));
  }
  return v;
};

// ---- 左列
export const LeftCol: React.FC<{f: number}> = ({f}) => {
  const ga = tier(f, [[0, 1], [101, 0.75], [150, 0.6], [225, 0.5], [242, 1], [280, 0.85]]);
  const surge = surgeOut(f);
  return (
    <g transform={`translate(${(-surge).toFixed(2)},0)`} opacity={ga}>
      <BootLog f={f} />
      <RngBlock f={f} />
      <Telemetry f={f} />
      <g>
        <PanelChrome f={f} t0={64} x={LX} y={560} w={RW} h={106} idx="03" label="RDR · MINIMAP" cn="雷达" />
        <RadarMini f={f} t0={70} rx={LX + 44} ry={613} R={35} />
        <g>
          {T('CONTACTS', LX + RW - 4, 588, {f: CHK, w: 600, s: 9.3, ls: 1.3, c: DIM, al: 'end', a: E.outC(prog(f, 70, 12))})}
          {[0, 1, 2].map((i) => {
            const seen = i < 2 ? f >= 105 + i * 33 : f >= T_SIG;
            if (!seen) return null;
            const b = [{b: 'B-1', v: '025° 0.55'}, {b: 'B-2', v: '155° 0.38'}, {b: 'SIG', v: '041° 0.34'}][i];
            const yy = 600 + i * 13;
            return (
              <g key={i}>
                {T(`${b.b} ${b.v}`, LX + RW - 4, yy, {s: 8.7, al: 'end', c: i === 2 ? HOT : CYA, a: flick(f, i === 2 ? T_SIG : 105 + i * 33)})}
              </g>
            );
          })}
        </g>
      </g>
    </g>
  );
};

// ---- 右列
export const RightCol: React.FC<{f: number}> = ({f}) => {
  const ga = tier(f, [[0, 0.6], [40, 1], [101, 0.85], [164, 0.65], [225, 0.55], [242, 1], [280, 0.8]]);
  const surge = surgeOut(f);
  return (
    <g transform={`translate(${surge.toFixed(2)},0)`} opacity={ga}>
      <PanelChrome f={f} t0={70} x={RXC} y={85} w={RW} h={143} idx="04" label="SIGNAL ANALYSIS" cn="信号分析" />
      <Sparkline f={f} f0={78} x={RXC + 4} y={121} w={RW - 8} h={33} seed={3} lab="SIG PWR" unit="dBm" base={-92} amp={40} />
      <Sparkline f={f} f0={84} x={RXC + 4} y={190} w={RW - 8} h={33} seed={8} lab="COHERENCE" unit="%" base={0} amp={100} />
      <Candidates f={f} />
      <Spectrum f={f} />
      <DataLink f={f} />
      <Uplink f={f} />
    </g>
  );
};

/** 锁定幕涌：列外推（SURGE u·e^(1-u) 手法） */
export const surgeOut = (f: number) => {
  if (f < T_LOCK) return 0;
  const u = (f - T_LOCK) / 9;
  return u <= 0 ? 0 : 26 * u * Math.exp(1 - u);
};

// ---- 01 SYS BOOT：6 行打字机 + [OK] + 3 行状态
const LOG = [['OPTIC ARRAY 4.2.1', 'OK'], ['CRYO FPA 4096² · 77K', 'OK'], ['GYRO ALIGN Δ0.0003°', 'OK'],
  ['ORBIT LEO 512 KM', 'OK'], ['UPLINK QKD-7 9.6G', 'OK'], ['SIG DB 14220 PROF', 'OK']];
const BootLog: React.FC<{f: number}> = ({f}) => {
  if (!flick(f, 16)) return null;
  const lt = [20, 30, 40, 50, 60, 70];
  const cps = 70;
  const rows: React.ReactElement[] = [];
  LOG.forEach(([s, ok], i) => {
    const ty = typed(f, lt[i], s, cps);
    if (!ty) return;
    const yy = 120 + i * 15;
    rows.push(<g key={i}>
      {T('>', LX + 5, yy, {s: 9.3, c: DIM, w: 700})}
      {T(ty, LX + 16, yy, {s: 9.3, w: 500, c: CYA, a: 0.95})}
      {(() => {
        const done = lt[i] + (s.length / cps) * FPS;
        if (f < done) {
          return T('█', LX + 16 + tw(ty, 9.3) + 1, yy, {s: 8.7, c: CYA});
        }
        return (
          <g>
            {L(LX + 20 + tw(s, 9.3), yy - 2.7, LX + RW - 28, yy - 2.7, 1, {c: DIM, a: 0.7, dash: '0.7 2.7'})}
            {T(`[${ok}]`, LX + RW - 3, yy, {s: 9.3, w: 700, al: 'end', a: flick(f, Math.ceil(done) + 1)})}
          </g>
        );
      })()}
    </g>);
  });
  const extra: Array<[number, string, string]> = [
    [84, '> SEARCH MODE ENGAGED', CYA],
    [T_SIG, '! SIGNAL · BRG 041°', HOT],
    [T_LOCK + 3, '■ NEO-2031 LOCKED', HOT],
  ];
  extra.forEach(([t0, s, c], j) => {
    const ty = typed(f, t0, s, 80);
    if (!ty) return;
    const yy = 222 + j * 15;
    rows.push(<g key={`e${j}`}>
      {T(ty, LX + 5, yy, {s: 9.3, w: 700, c, a: j === 1 && f < T_LOCK ? (blink(f, 4, t0) ? 1 : 0.55) : 1})}
      {j === 2 && blink(f, 2.5) ? T('█', LX + 5 + tw(ty, 9.3) + 2, yy, {s: 8.7, c: CYA}) : null}
    </g>);
  });
  return (
    <g>
      <PanelChrome f={f} t0={16} x={LX} y={85} w={RW} h={150} idx="01" label="SYS BOOT" cn="系统自检" />
      {rows}
    </g>
  );
};

// ---- RNG 大数块（签名③：scramble→roll 落定真值）
const RngBlock: React.FC<{f: number}> = ({f}) => {
  const a = flick(f, 52);
  if (!a) return null;
  const locked = f >= T_LOCK;
  const lab = locked ? 'TGT RNG' : 'SLANT RNG';
  const cn = locked ? '目标距离' : '斜距';
  const fin = f >= 280 ? '0.38' : locked ? '0.52' : f >= T_SIG ? '0.68' : '----';
  const f0 = f >= 280 ? 280 : locked ? T_LOCK + 1 : T_SIG;
  const val = roll(f, f0, fin, 61, 5) ?? (f < f0 ? '----' : null);
  const au = f >= T_SIG;
  const yb = 283;
  return (
    <g>
      {T(scramble(f, 52, lab, 61), LX, yb, {f: CHK, w: 700, s: 10, ls: 2, a})}
      {T(cn, LX + RW, yb, {f: CJKF, w: 500, s: 9.3, ls: 1.3, c: DIM, al: 'end', a})}
      {L(LX, yb + 6.3, LX + RW, yb + 6.3, 1, {a: 0.85})}
      <rect x={LX} y={yb + 5.3} width={12} height={2} fill={CYA} opacity={a} />
      {T(val ?? '----', LX - 2, yb + 59, {f: CHK, w: 600, s: 48, ls: 0.7, c: val && val !== '----' ? HOT : DIM, a: a * (val && val !== '----' ? 1 : 0.7)})}
      {T('AU', LX + RW, yb + 59, {f: CHK, w: 700, s: 13.3, ls: 1.3, al: 'end', c: CYA, a})}
      {/* 距离进度计：30 tick，信号→锁定进程填充 */}
      {Array.from({length: 30}, (_, i) => {
        const on = au ? i < Math.round(30 * (0.38 + 0.14 * Math.min(1, (f - T_SIG) / 90))) : 0;
        return <rect key={i} x={LX + i * 6.7} y={yb + 70} width={4.7} height={on ? 4 : 2.7} fill={on ? (i === Math.round(30 * (0.38 + 0.14 * Math.min(1, (f - T_SIG) / 90))) - 1 ? HOT : CYA) : DEEP} opacity={on ? 1 : 0.9} />;
      })}
      {T(`1 AU = 1.496E8 KM`, LX, yb + 91, {s: 9.3, w: 700, c: locked ? HOT : CYA, a})}
      {T(`SNR ${(f >= T_SIG ? 41.2 : 11.4).toFixed(1)} dB`, LX + RW, yb + 91, {s: 9.3, w: 500, al: 'end', c: CYA, a: a * 0.85})}
    </g>
  );
};

// ---- 02 NAV TELEMETRY：5 行遥测（label / roll 值 / 单位 / 量条）
const Telemetry: React.FC<{f: number}> = ({f}) => {
  if (!flick(f, 58)) return null;
  const rows: Array<[string, number, number, number, string]> = [
    ['AZM', 212.46, 3, 2, '°'], ['ELV', -7.52, 3, 2, '°'], ['ALT', 512.08 + 0.02 * Math.sin(f / 10), 3, 2, 'KM'],
    ['VEL', 7.612 + 0.001 * Math.floor(hash(Math.floor(f / 6), 5) * 4), 1, 3, 'KM/S'],
    ['SNR', f < T_SIG ? 11.4 + hash(Math.floor(f / 6), 9) * 0.6 : 11.4 + (41.2 - 11.4) * E.outC(prog(f, T_SIG, 18)), 2, 1, 'dB'],
  ];
  return (
    <g>
      <PanelChrome f={f} t0={58} x={LX} y={408} w={RW} h={124} idx="02" label="NAV TELEMETRY" cn="导航遥测" />
      {rows.map(([lab, v, n, d, u], i) => {
        const yy = 437 + i * 19, t0 = 100 + i * 9;
        const fin = pad(v, n, d);
        const s = roll(f, t0, fin, 30 + i, 3 + (i % 3));
        const m = Math.min(1, Math.max(0, 0.25 + 0.6 * hash(i, 1) + 0.08 * Math.sin(f / 5 * (2 + i) + i)));
        const mp = E.outC(prog(f, t0 + 3, 12));
        return (
          <g key={i}>
            {T(lab, LX + 5, yy, {f: CHK, w: 600, s: 9.3, ls: 1.7, c: DIM})}
            {T(s ?? fin.replace(/[0-9]/g, '-'), LX + 104, yy + 0.7, {s: 10.7, w: 600, al: 'end', c: s ? HOT : DIM, a: s ? 1 : 0.6})}
            {T(u, LX + 108, yy, {s: 8.7, c: DIM})}
            <rect x={LX + 141} y={yy - 3.3} width={RW - 146} height={2.7} fill={DEEP} />
            <rect x={LX + 141} y={yy - 3.3} width={(RW - 146) * m * mp} height={2.7} fill={CYA} opacity={0.9} />
            {i < 4 ? L(LX + 5, yy + 7.7, LX + RW - 4, yy + 7.7, mp, {c: DEEP, a: 0.9}) : null}
          </g>
        );
      })}
    </g>
  );
};

// ---- 05 CANDIDATES：3 行候选（扫描前 AWAITING；出现 flick + 匹配条 + NO MATCH/MATCH）
const CND: Array<[string, string, string, number]> = [
  ['CND-01', 'A-247', 'DEC +12°41′ · RA 09H', 0.231],
  ['CND-02', 'K-102', 'DEC -03°08′ · RA 14H', 0.418],
  ['TGT-03', 'NEO-2031', 'DEC -07°52′ · RA 03H', 0.997],
];
const Candidates: React.FC<{f: number}> = ({f}) => {
  if (!flick(f, 78)) return null;
  const times = [105, 138, 170];
  return (
    <g>
      <PanelChrome f={f} t0={78} x={RXC} y={261} w={RW} h={157} idx="05" label="CANDIDATES" cn="候选目标" />
      {CND.map(([id, code, ll, m], i) => {
        const t0 = times[i], yy = 288 + i * 44;
        const match = i === 2;
        if (f < t0) {
          return (
            <g key={i}>
              {T(id, RXC + 5, yy, {s: 9.3, c: DIM, a: 0.7})}
              {T('AWAITING', RXC + RW - 3, yy, {s: 9.3, c: DIM, al: 'end', a: 0.7})}
              <rect x={RXC + 5} y={yy + 20.3} width={RW - 11} height={1} fill={DEEP} />
            </g>
          );
        }
        const a = flick(f, t0);
        const mp = E.outC(prog(f, t0, 10));
        const pct = (m * 100 * mp).toFixed(1) + '%';
        const res = f < t0 + 7 ? pct : match ? `MATCH ${pct}` : 'NO MATCH';
        return (
          <g key={i}>
            {T(id, RXC + 5, yy, {s: 9.3, w: 700, c: match ? HOT : CYA, a})}
            {T(code, RXC + 56, yy, {f: CHK, w: 700, s: 10.7, ls: 1.3, a})}
            {T(ll, RXC + 5, yy + 14, {s: 9.3, w: 500, c: DIM, a})}
            {T(res, RXC + RW - 3, yy, {s: 10.7, w: 700, al: 'end', c: match ? HOT : DIM, a: match && f < T_LOCK ? (blink(f, 5) ? 1 : 0.4) : a})}
            <rect x={RXC + 5} y={yy + 21.3} width={RW - 11} height={2} fill={DEEP} />
            <rect x={RXC + 5} y={yy + 21.3} width={(RW - 11) * m * mp} height={2} fill={match ? CYA : DIM} />
            {!match && f > t0 + 7 ? <g><rect x={RXC + 3} y={yy - 22} width={1} height={6} fill={DIM} /><rect x={RXC + 3} y={yy - 22} width={74} height={1} fill={DIM} opacity={0.9} /></g> : null}
          </g>
        );
      })}
    </g>
  );
};

// ---- 06 SPECTRUM：28 柱分段频谱 + 8.412 GHz 峰标注
const Spectrum: React.FC<{f: number}> = ({f}) => {
  const n = 28, bw = (RW - 8) / n, pkI = 18;
  const p = E.outC(prog(f, 86, 20));
  if (p <= 0) return null;
  const bars: React.ReactElement[] = [];
  for (let i = 0; i < n; i++) {
    const j = Math.floor(f / 2);
    const v0 = 0.15 + 0.5 * Math.pow(hash(i, j, 3), 2) + 0.2 * Math.sin(i * 0.5 + f / 3) ** 2;
    let v = v0 * p;
    if (f > T_SIG && Math.abs(i - pkI) < 3) v = Math.max(v, (0.95 - Math.abs(i - pkI) * 0.22) * (0.85 + 0.15 * hash(i, j)));
    const nseg = Math.round(15 * Math.min(1, Math.max(0, v)));
    const pk = i === pkI && f > T_SIG;
    for (let q = 0; q < nseg; q++) {
      bars.push(<rect key={`${i}-${q}`} x={RXC + 4 + i * bw} y={556 - q * 2.9} width={bw - 2} height={1.8} fill={pk ? HOT : q > 10 ? CYA : DIM} opacity={pk ? 0.95 : q > 10 ? 0.75 : 0.8} />);
    }
    bars.push(<rect key={`b${i}`} x={RXC + 4 + i * bw} y={558.7} width={bw - 2} height={1.3} fill={DEEP} />);
  }
  return (
    <g>
      <PanelChrome f={f} t0={86} x={RXC} y={450} w={RW} h={122} idx="06" label="SPECTRUM" cn="频谱" />
      {bars}
      {f > T_SIG ? T('PK 8.412 GHZ', RXC + 4 + pkI * bw + bw / 2, 492, {s: 9.3, w: 700, al: 'middle', c: HOT, a: flick(f, T_SIG)}) : null}
    </g>
  );
};

// ---- DATA LINK：12 格链路指示 + hex 转储（每 6 帧滚一行）+ ACK/ENC
const HX = '0123456789ABCDEF';
const DataLink: React.FC<{f: number}> = ({f}) => {
  const fa = flick(f, 94);
  if (!fa) return null;
  const row0 = Math.floor(f / 6);
  const rows: React.ReactElement[] = [];
  for (let r = 0; r < 4; r++) {
    const id = row0 - 3 + r;
    const fresh = r === 3 && f % 6 < 2;
    const ry = 626 + r * 12.7;
    let line = (((0x3F20 + id * 8) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')) + ' ';
    for (let b = 0; b < 8; b++) {
      const v = Math.floor(hash(id, b, 11) * 256);
      line += ' ' + HX[v >> 4] + HX[v & 15];
    }
    rows.push(
      <g key={r} opacity={(r ? 1 : Math.max(0, 1 - (f % 6) / 6))}>
        {T(line, RXC, ry, {s: 9.3, w: 500, ls: 0.3, c: fresh ? HOT : r === 3 ? CYA : DIM, a: fa * (fresh ? 1 : 0.85)})}
        {T(hash(id, 99) > 0.5 ? 'ACK' : 'ENC', RXC + RW, ry, {s: 8, w: 600, al: 'end', c: DIM, a: fa * 0.8})}
      </g>,
    );
  }
  return (
    <g>
      {T('DATA LINK · QKD-7', RXC, 604, {f: CHK, w: 600, s: 9.3, ls: 1.3, c: DIM, a: fa})}
      {Array.from({length: 12}, (_, k) => {
        const on = hash(k, Math.floor(f / 4)) > 0.35 || k < 5;
        return <rect key={k} x={RXC + 117 + k * 4} y={596} width={2.7} height={6.7} fill={on ? CYA : DEEP} opacity={fa} />;
      })}
      {T('9.6 G', RXC + RW, 604, {s: 9.3, w: 700, al: 'end', c: CYA, a: fa})}
      {L(RXC, 610.3, RXC + RW, 610.3, E.outC(prog(f, 94, 10)), {c: DEEP, a: 0.9})}
      {rows}
    </g>
  );
};

// ---- UPLINK：锁定后 24 格进度（12 帧填满）→ SENT ✓ 戳 + ping
const Uplink: React.FC<{f: number}> = ({f}) => {
  if (f < 250) return null;
  const ua = flick(f, 250), y = 692, bx0 = RXC + 54, n = 24;
  const sw = (RW - 54 - 62) / n;
  const lit = Math.floor(n * prog(f, 252, 12) + 1e-6);
  const done = f >= 264;
  const d = f - 264;
  const sk = done ? 1 + 0.35 * Math.exp(-(d / FPS) * 22) : 1;
  const sx0 = RXC + RW - 60, sy0 = y - 12;
  return (
    <g>
      {T('UPLINK', RXC, y, {f: CHK, w: 700, s: 9.3, ls: 1.3, c: HOT, a: ua})}
      {T('数据上传', RXC + 42, y - 0.7, {f: CJKF, w: 500, s: 8, ls: 1, c: CYA, a: ua})}
      {Array.from({length: n}, (_, q) => (
        <rect key={q} x={bx0 + q * sw} y={y - 6.7} width={sw - 1.3} height={6.7} fill={q < lit ? (q === lit - 1 && lit < n ? HOT : CYA) : DEEP} opacity={ua} />
      ))}
      {!done ? T(`${pad(Math.floor((100 * lit) / n), 3, 0)}%`, RXC + RW, y, {s: 9.3, w: 700, al: 'end', c: CYA, a: ua}) : (
        <g transform={`translate(${(sx0 + 30).toFixed(1)} ${(sy0 + 6.7).toFixed(1)}) scale(${sk.toFixed(3)}) translate(${(-(sx0 + 30)).toFixed(1)} ${(-(sy0 + 6.7)).toFixed(1)})`}>
          <rect x={sx0} y={sy0} width={60} height={13.3} fill={HOT} opacity={0.14 + 0.5 * Math.exp(-(d / FPS) * 12)} />
          <rect x={sx0 + 0.3} y={sy0 + 0.3} width={59} height={12.7} fill="none" stroke={HOT} strokeWidth={1} />
          {T('SENT ✓', sx0 + 5, y - 1, {f: CHK, w: 700, s: 10, ls: 1.3, c: HOT})}
          {d < 15 ? (() => {
            const u = E.outC(d / 15);
            return <rect x={sx0 - 27 * u} y={sy0 - 9.3 * u} width={60 + 54 * u} height={13.3 + 18.7 * u} fill="none" stroke={HOT} strokeWidth={1} opacity={0.9 * (1 - u)} />;
          })() : null}
        </g>
      )}
    </g>
  );
};

// ---- 工具：量宽已由 kit 导出，这里不重复
void 0;
