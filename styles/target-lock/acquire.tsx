import React from 'react';
import {ARC, blink, bracketPaths, CHK, CYA, CJKF, D, DIM, E, flick, FPS, hash, HOT, INK, L, pad, prog, roll, scramble, T, TARGET, CND_PTS, T_BRK, T_LOCK, T_SIG, T_SNAP, tw, sstep, typed} from './kit';

/**
 * 捕获/锁定编排（target-lock 头号签名，RECON-mg15 §22-hud 签名④）：
 * 候选跳动切换 → HERO 四括号 8 帧 outCubic 从四角飞行汇聚（3 重 echo 拖影）→
 * ±16px 2 帧步进狩猎抖动 → snap（KF 过冲系列 [1.35,1.08,0.96,1.0]）→ banner slam + 告警脉冲。
 * 技法借鉴 mg-styles-15 demos/22-hud (MIT, Vincentwei1021) hud.js acquire()/banner()，TSX 重写。
 */
const CND_META: Array<[string, string]> = [['CND-01 · A-247', 'NO MATCH'], ['CND-02 · K-102', 'NO MATCH']];
const PULSES = [T_LOCK, 262, 292];

/** 方位线：虚线射线 + 环刻痕 + BRG 读数（三角测量语言） */
const bearing = (f: number, x: number, y: number, hs: number, a: number): React.ReactElement[] => {
  const dx = x - 640, dy = y - 360, d = Math.hypot(dx, dy);
  if (d < 1 || a <= 0.01) return [];
  const ux = dx / d, uy = dy / d;
  const out: React.ReactElement[] = [];
  out.push(L(x + ux * (hs + 4), y + uy * (hs + 4), 640 + ux * 197, 360 + uy * 197, 1, {c: CYA, a: 0.6 * a, dash: '3.3 3.3'}));
  out.push(L(640 + ux * 203, 360 + uy * 203, 640 + ux * 221, 360 + uy * 221, 1, {c: HOT, w: 1.7, a}));
  const brg = ((Math.atan2(uy, ux) / D + 90) + 360) % 360;
  const rl = 257;
  out.push(T(`BRG ${pad(brg, 3, 1)}°`, 640 + ux * rl, 360 + uy * rl + 2.7, {s: 10, w: 700, c: HOT, al: ux > 0.35 ? 'start' : ux < -0.35 ? 'end' : 'middle', a}));
  return out;
};

/** 搜索瞄准具（候选跳动状态机）：hop inOutQ 6 帧 + 到达脉冲 + 标签 + 分析/否决 */
export const AcquireReticle: React.FC<{f: number}> = ({f}) => {
  if (f < 105) return null;
  const pts = [{x: 640, y: 360}, ...CND_PTS, {x: TARGET.x, y: TARGET.y}];
  const times = [105, 138, 170];
  const els: React.ReactElement[] = [];
  const HOP = 6;
  // 状态：k=当前停留索引，hop 中在 from→to 之间
  let k = 0;
  while (k < 3 && f >= times[k]) k++;
  const ta = k < 3 ? times[k] : 1e9;
  let x: number, y: number, moving = false;
  if (k >= 3) { x = pts[3].x; y = pts[3].y; }
  else if (f >= ta - HOP) {
    const u = E.inOutQ(Math.min(1, (f - (ta - HOP)) / HOP));
    x = pts[k].x + (pts[k + 1].x - pts[k].x) * u;
    y = pts[k].y + (pts[k + 1].y - pts[k].y) * u;
    moving = u < 1;
  } else { x = pts[k].x; y = pts[k].y; }
  const arrive = k > 0 ? times[k - 1] : 105;
  const pulse = moving ? 1.3 : 1 + 0.5 * Math.exp(-((f - arrive) / FPS) * 14);
  const hs = 18 * pulse;
  const a = Math.max(flick(f, 105), 0.85);
  // 四括号
  bracketPaths(x, y, hs, 5).forEach((d, q) => els.push(<path key={`rb${q}`} d={d} stroke={CYA} strokeWidth={1.4} fill="none" opacity={0.95} />));
  // 飞行连线热斑
  if (moving) {
    const u = E.inOutQ(Math.min(1, (f - (ta - HOP)) / HOP));
    els.push(L(pts[k].x + (x - pts[k].x) * 0.3, pts[k].y + (y - pts[k].y) * 0.3, x, y, 1, {c: HOT, w: 1, a: 0.7 * (1 - u * 0.5)}));
  }
  els.push(...bearing(f, x, y, hs, Math.min(1, (f - 105) * 0.2) * (k >= 3 ? 1 - sstep(203, 213, f) : 1)));
  els.push(L(x - hs - 7, y + 0.3, x - hs - 2, y + 0.3, 1, {c: CYA, a: 0.5}));
  els.push(L(x + hs + 2, y + 0.3, x + hs + 7, y + 0.3, 1, {c: CYA, a: 0.5}));
  // 标签（墨盘 knock plate）
  if (k > 0 && !moving) {
    const [idc, verdict] = k < 3 ? CND_META[k - 1] : ['TGT-03 · NEO-2031', ''];
    const dt = f - arrive;
    const labA = flick(f, arrive);
    const pw = tw(idc, 10.7, {f: CHK, ls: 1.3}) + 7;
    const lx = x + hs + 9;
    els.push(<rect key="pl1" x={lx - 4} y={y - 15} width={pw} height={13.3} fill={INK} opacity={0.75 * labA} />);
    els.push(T(idc, lx, y - 4.7, {f: CHK, w: 700, s: 10.7, ls: 1.3, a: labA}));
    if (k < 3) {
      const v = dt < 5 ? scramble(f, arrive, 'ANALYSING', 50 + k, 5) : verdict;
      els.push(T(v, lx, y + 8.7, {s: 9.3, w: 700, c: dt < 5 ? CYA : DIM}));
      if (dt > 5) {
        els.push(L(x - 5.3, y - 5.3, x + 5.3, y + 5.3, 1, {c: DIM, w: 1}));
        els.push(L(x + 5.3, y - 5.3, x - 5.3, y + 5.3, 1, {c: DIM, w: 1}));
      }
    } else {
      els.push(T(dt < 5 ? scramble(f, arrive, 'ANALYSING', 59, 5) : 'MATCH 99.7%', lx, y + 8.7, {s: 9.3, w: 700, c: dt < 5 ? CYA : HOT, a: dt < 5 ? 1 : blink(f, 5) ? 1 : 0.4}));
    }
  }
  // 已否决候选的残叉
  for (let i = 0; i < 2; i++) {
    const c = CND_PTS[i];
    if (f > times[i] + 5 && f < times[i] + 40) {
      const al = 0.6 * Math.min(1, Math.max(0, 1 - (f - times[i] - 24) / 16));
      els.push(L(c.x - 3.3, c.y - 3.3, c.x + 3.3, c.y + 3.3, 1, {c: DIM, a: al}));
      els.push(L(c.x + 3.3, c.y - 3.3, c.x - 3.3, c.y + 3.3, 1, {c: DIM, a: al}));
    }
  }
  return <g>{els}</g>;
};

/** HERO 括号状态机：四角飞行 → 狩猎 → snap → 锁定保持（含角标/进度环/锁定小环/ping） */
export const LockBrackets: React.FC<{f: number}> = ({f}) => {
  if (f < 190) return null;
  const tg = TARGET;
  const els: React.ReactElement[] = [];
  const TRV = T_BRK + 8;
  // 飞行/狩猎 half 序列
  const halfAt = (ff: number): number => {
    if (ff < TRV) return 580 + (87 - 580) * E.outC((ff - T_BRK) / 8);
    if (ff < T_SNAP) return ((ff >> 1) & 1) ? 117 : 136;
    if (ff < T_SNAP + 3) {
      const KF = [1.35, 1.08, 0.96, 1.0];
      const fr = ff - T_SNAP;
      return 87 * (fr >= 3 ? 1 : KF[fr]);
    }
    return 48 + (87 - 48) * (1 - E.outE(prog(ff, T_LOCK, 6)));
  };
  const locked = f >= T_LOCK;
  const pulseK = locked ? Math.max(...PULSES.map((p) => (f >= p ? Math.exp(-((f - p) / FPS) * 10) : 0))) : 0;
  const half = halfAt(f) * (1 + 0.05 * pulseK);
  const arm = Math.min(64, Math.max(14, 0.3 * half));
  const jit = f < T_SNAP && f >= TRV ? 16 : 0;
  const jf = f >> 1;
  const drawB = (bh: number, bjf: number, ba: number, echo: boolean, keyP: string) => {
    // 以 tg 为中心生成四括号（每括号独立 seeded 抖动；echo 层细描、主层双描）
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy], q) => {
      const jx = (hash(bjf, q, 1) - 0.5) * 2 * jit, jy = (hash(bjf, q, 2) - 0.5) * 2 * jit;
      const bx = tg.x + sx * bh + jx, by = tg.y + sy * bh + jy;
      const dd = `M ${bx} ${by - sy * arm} L ${bx} ${by} L ${bx - sx * arm} ${by}`;
      els.push(<path key={`${keyP}${q}`} d={dd} stroke={CYA} strokeWidth={echo ? 2.7 : 4} fill="none" opacity={ba} />);
      if (!echo) els.push(<path key={`${keyP}h${q}`} d={dd} stroke={f === T_SNAP ? HOT : CYA} strokeWidth={f === T_SNAP ? 2.7 : 1.4} fill="none" opacity={ba} />);
    });
  };
  if (f < T_SNAP) {
    // echo 拖影（滞后 2/4/6 帧）
    for (const [e, ea] of [[3, 0.12], [2, 0.25], [1, 0.45]] as Array<[number, number]>) {
      const te = f - e * 2;
      if (te < T_BRK) continue;
      drawB(halfAt(te), te >> 1, ea, true, `ec${e}`);
    }
    drawB(half, jf, Math.max(flick(f, T_BRK), 0.85), false, 'hb');
  } else {
    drawB(half, jf, 1, false, 'hb');
  }
  // 角标（riding the brackets，墨盘；snap 后 2 帧淡出）+ 锁定进度环（f190 起随分析期 inQ 填充）
  if (f < T_SNAP) {
    const fillU = E.inQ(prog(f, 190, T_SNAP + 2 - 190));
    const pct = String(Math.min(100, Math.floor(fillU * 100 + 1e-6))).padStart(3, '0');
    const tagA = Math.max(flick(f, T_BRK), 0.8);
    // 锁定进度环（36 段 inQ 填充；分析期即在瞄准具外围走表）
    const rp = 61;
    const nLit = Math.floor(36 * fillU + 1e-6);
    const ringA = Math.max(flick(f, 190), 0.8);
    for (let q = 0; q < 36; q++) {
      const a0 = -90 + q * 10, lit = q < nLit, hot = q === nLit - 1 && nLit < 36;
      els.push(ARC(tg.x, tg.y, rp, a0 + 1.7, a0 + 10 - 3, 1, {c: hot ? HOT : lit ? CYA : DIM, w: lit ? 2 : 1, a: (lit ? 0.85 : 0.55) * ringA, key: `pr${q}`}));
    }
    const hxT = Math.max(half, 87);
    const tag = (s: string, x: number, y: number, al: 'start' | 'end', c: string, key: string) => {
      const w = tw(s, 11.3, {f: CHK, ls: 1.3});
      const x0 = al === 'end' ? x - w : x;
      els.push(<rect key={`${key}p`} x={x0 - 4} y={y - 10} width={w + 8} height={14.7} fill={INK} opacity={0.75 * tagA} />);
      els.push(T(s, x, y, {f: CHK, w: 700, s: 11.3, ls: 1.3, c, al, a: tagA}));
    };
    tag('TGT-03', tg.x - hxT, tg.y - hxT - 9.3, 'start', CYA, 't0');
    tag(`LOCK ${pct}%`, tg.x + hxT, tg.y - hxT - 9.3, 'end', fillU >= 1 ? HOT : CYA, 't1');
    tag(`T−${Math.max(0, (T_LOCK - f) / FPS).toFixed(2)} S`, tg.x - hxT, tg.y + hxT + 18, 'start', CYA, 't2');
    tag('MATCH 99.7%', tg.x + hxT, tg.y + hxT + 18, 'end', HOT, 't3');
  }
  // 锁定小环（4 自旋弧 + 中心菱形）+ 冲击方框 + ping
  if (locked) {
    const k = E.outC(prog(f, T_LOCK, 12));
    const rr = 20 + 4 * pulseK, spin = ((f - T_LOCK) / FPS) * 1.4 * 57.3;
    for (let q = 0; q < 4; q++) els.push(ARC(tg.x, tg.y, rr, spin + q * 90 + 15, spin + q * 90 + 75, k, {c: HOT, w: 1, a: k, key: `lr${q}`}));
    els.push(<path key="dia" d={`M ${tg.x} ${tg.y - 3.3} L ${tg.x + 3.3} ${tg.y} L ${tg.x} ${tg.y + 3.3} L ${tg.x - 3.3} ${tg.y} Z`} fill={HOT} opacity={k} />);
    if (f - T_LOCK < 7) {
      const u = E.outC((f - T_LOCK) / 7);
      els.push(<rect key="imp" x={tg.x - 100 - 47 * u} y={tg.y - 100 - 47 * u} width={200 + 94 * u} height={200 + 94 * u} fill="none" stroke={HOT} strokeWidth={1.3} opacity={0.9 * (1 - u)} />);
    }
    for (const p0 of PULSES) {
      const d = f - p0;
      if (d < 0 || d > 21) continue;
      const u = E.outC(d / 21);
      els.push(ARC(tg.x, tg.y, 47 + u * 133, 0, 360, 1, {c: CYA, w: 1, a: (1 - u) * 0.9, key: `pg${p0}`}));
    }
  }
  return <g>{els}</g>;
};

/** 锁定横幅：双横线甩出 + 墨带 + TARGET LOCKED/目标锁定 3 帧 slam + 坐标板打字机 */
export const LockBanner: React.FC<{f: number}> = ({f}) => {
  if (f < T_LOCK) return null;
  const els: React.ReactElement[] = [];
  const w = E.outE(prog(f, T_LOCK, 9)) * 313, gap = 64, hh = 44;
  const pulse = Math.max(...PULSES.map((p) => (f >= p ? Math.exp(-((f - p) / FPS) * 7) : 0)));
  // 墨带（中央留缺口让锁定小环透气）+ 斜纹
  const wp = E.outE(prog(f, T_LOCK + 8, 10)) * 313;
  if (wp > gap) {
    els.push(<rect key="ba1" x={640 - wp} y={360 - hh} width={wp - gap} height={hh * 2} fill={INK} opacity={0.74} />);
    els.push(<rect key="ba2" x={640 + gap} y={360 - hh} width={wp - gap} height={hh * 2} fill={INK} opacity={0.74} />);
    els.push(<g key="str" clipPath="url(#bnClip)" opacity={0.35 + 0.4 * pulse}>
      <clipPath id="bnClip"><rect x={640 - wp} y={360 - hh} width={23} height={hh * 2} /><rect x={640 + wp - 23} y={360 - hh} width={23} height={hh * 2} /></clipPath>
      {Array.from({length: 20}, (_, kk) => {
        const xx = 640 - wp + kk * 9.3;
        const x2 = 640 + wp - 23 + kk * 9.3 - 100;
        return <g key={kk}>
          <line x1={xx} y1={360 + hh} x2={xx + hh * 2} y2={360 - hh} stroke={CYA} strokeWidth={3.3} />
          <line x1={x2} y1={360 + hh} x2={x2 + hh * 2} y2={360 - hh} stroke={CYA} strokeWidth={3.3} />
        </g>;
      })}
    </g>);
  }
  const c1 = f === T_LOCK ? HOT : CYA;
  els.push(L(640 - w, 360 - hh + 0.3, 640 + w, 360 - hh + 0.3, 1, {c: CYA, w: 1, a: 0.9 + 0.1 * pulse}));
  els.push(L(640 - w, 360 + hh - 0.3, 640 + w, 360 + hh - 0.3, 1, {c: CYA, w: 1, a: 0.9 + 0.1 * pulse}));
  els.push(L(640 - w, 360 - hh - 2, 640 - w + 40, 360 - hh - 2, w / 313, {c: CYA, w: 2.7}));
  els.push(L(640 + w, 360 + hh + 2, 640 + w - 40, 360 + hh + 2, w / 313, {c: CYA, w: 2.7}));
  // 标题 slam：scale 1.15→1 over 3 帧（首帧白热）
  const k = E.outE(prog(f, T_LOCK, 3));
  const sc = 1.15 - 0.15 * k;
  els.push(<g key="ttl" transform={`translate(640 360) scale(${sc.toFixed(4)}) translate(-640 -360)`}>
    {T(scramble(f, T_LOCK, 'TARGET', 404, 4), 640 + gap + 20, 360 - 22.7, {f: CHK, w: 700, s: 11.3, ls: 6, c: c1})}
    {T('LOCKED', 640 + gap + 17, 360 + 20, {f: CHK, w: 600, s: 40, ls: 3.3, c: c1})}
    {T(scramble(f, T_LOCK, '警报 · ALERT 03', 405, 4), 640 - gap - 20, 360 - 22.7, {f: CJKF, w: 500, s: 10, ls: 2, al: 'end', c: c1})}
    {T('目标锁定', 640 - gap - 19, 360 + 20, {f: CJKF, w: 900, s: 38.7, ls: 4.7, al: 'end', c: c1})}
  </g>);
  // 坐标板（打字机 + 光标 + R2 行）
  const coord = 'RA 03H12M · DEC −07°52′';
  const ty = typed(f, T_LOCK + 5, coord, 34);
  if (ty) {
    const pk = E.outE(prog(f, T_LOCK + 2, 8));
    const pw = 157 * pk, py0 = 360 + hh + 8, py1 = 360 + hh + 68, ch = 8;
    if (pw > 2) {
      els.push(<path key="cp" d={`M ${640 - pw + ch} ${py0} L ${640 + pw - ch} ${py0} L ${640 + pw} ${py0 + ch} L ${640 + pw} ${py1} L ${640 - pw} ${py1} L ${640 - pw} ${py0 + ch} Z`} fill={INK} opacity={0.86} />);
      els.push(<path key="cps" d={`M ${640 - pw + ch} ${py0} L ${640 + pw - ch} ${py0} L ${640 + pw} ${py0 + ch} L ${640 + pw} ${py1} L ${640 - pw} ${py1} L ${640 - pw} ${py0 + ch} Z`} fill="none" stroke={DIM} opacity={0.9} />);
      els.push(L(640 - pw, py1 + 2, 640 - pw + 18.7, py1 + 2, 1, {c: CYA, w: 1.3}));
      els.push(L(640 + pw, py1 + 2, 640 + pw - 18.7, py1 + 2, 1, {c: CYA, w: 1.3}));
    }
    els.push(T('TRAJ · 轨道', 640, py0 + 12.7, {f: CJKF, w: 500, s: 9.3, ls: 2, al: 'middle', c: DIM}));
    els.push(T(ty, 640 - tw(coord, 17.3, {ls: 1.3}) / 2, py0 + 42.7, {s: 17.3, w: 600, ls: 1.3, c: HOT}));
    if (blink(f, 2.5) || ty.length < coord.length) els.push(T('█', 640 - tw(coord, 17.3, {ls: 1.3}) / 2 + tw(ty, 17.3, {ls: 1.3}) + 4, py0 + 42, {s: 14.7, c: CYA}));
    const r2v = `RNG 0.38 AU · CONF 99.7 % · TRK 03`;
    const r2 = typed(f, T_LOCK + 12, r2v, 60);
    els.push(T(r2, 640, py1 - 4.7, {s: 9.3, al: 'middle', c: DIM, a: roll(f, T_LOCK + 12, '1', 92, 3) ? 1 : 0.6}));
  }
  return <g>{els}</g>;
};

/** 扫描目标 blip（雷达余辉揭示 + scramble 标签，签名②的扫描发现语言） */
export const SweepBlips: React.FC<{f: number}> = ({f}) => {
  if (f < 105 || f > 224) return null;
  const els: React.ReactElement[] = [];
  const brg = 40 + 180 * ((f - 45) / FPS);
  const pts = [...CND_PTS, TARGET];
  pts.forEach((c, i) => {
    const t0 = [105, 138, 170][i];
    const bb = ((Math.atan2(c.y - 360, c.x - 640) / D + 90) + 360) % 360;
    const first = 45 + ((((bb - 40) % 360) + 360) % 360) / 180;
    if (f < first || f < t0 - 4) return;
    const since = ((((brg - bb) % 360) + 360) % 360) / 180;
    const I = Math.exp(-since * 2.2);
    const vis = 1 - sstep(215, 224, f);
    const a = vis * (0.35 + 0.65 * I);
    if (a <= 0.02) return;
    els.push(<rect key={`d${i}`} x={c.x - 2} y={c.y - 2} width={4} height={4} fill={HOT} opacity={a} />);
    els.push(ARC(c.x, c.y, 4.7 + (1 - I) * 10.7, 0, 360, 1, {c: CYA, w: 1, a: vis * I, key: `c${i}`}));
    const s = scramble(f, first, `UNK-0${i + 1}`, 120 + i, 5);
    const twd = tw(s, 10, {f: CHK, ls: 1.3});
    els.push(<rect key={`p${i}`} x={c.x + 20} y={c.y - 20.7} width={twd + 7} height={14} fill={INK} opacity={0.75 * vis} />);
    els.push(T(s, c.x + 23.3, c.y - 10, {f: CHK, w: 700, s: 10, ls: 1.3, c: I > 0.5 ? HOT : CYA, a: vis}));
    els.push(L(c.x + 4, c.y - 4, c.x + 10.7, c.y - 10.7, 1, {c: CYA, a: 0.7 * a}));
    els.push(L(c.x + 10.7, c.y - 10.7, c.x + 20, c.y - 10.7, 1, {c: CYA, a: 0.7 * a}));
  });
  return <g>{els}</g>;
};
