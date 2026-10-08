// ink-plate · world.ts — 模数网格 / 120BPM 节拍时刻表 / 机械理性缓动白名单 / 双版错位套准状态机
// 技法借鉴 mg-styles-15 demos/09-bauhaus (MIT, Vincentwei1021), TSX 重写
// 全部状态 = f(frame) 纯函数；seeded hash，禁 Math.random/Date/网络。

export const W = 1280;
export const H = 720;
export const FPS = 30;
export const TOTAL = 389; // = script/timeline.json total_frames（TTS 实测 13.0s）

// ---------------------------------------------------------------- 模数
// M=120 半模数（网格钢线间距）；CARD=240 卡片模数（形状边长、落点最小单元）。
// 裁切线（trim）：x 40–1240（10 卡片），y 60–660（5 卡片）；底栏 y 540–660 = 10×1 模数题头栏。
export const M = 120;
export const CARD = 240;
export const TRIM = {x0: 40, y0: 60, x1: 1240, y1: 660} as const;
/** 网格线坐标：x = 40+120k，y = 60+120j（亚格=120px，格=240px）。 */
export const gx = (k: number) => TRIM.x0 + M * k;
export const gy = (j: number) => TRIM.y0 + M * j;
/** 形状落点（240 卡片中心）：x=160+240c，y=180+240r。 */
export const cellX = (c: number) => TRIM.x0 + M + CARD * c;
export const cellY = (r: number) => TRIM.y0 + M + CARD * r;

// ---------------------------------------------------------------- 四墨 + 奶油纸
export type Ink = 'Y' | 'R' | 'B' | 'K';
export const PAPER = '#F1E9DA';
export const INK_HEX: Record<Ink, string> = {
  R: '#E03C31', // 红
  Y: '#F2B705', // 黄
  B: '#1E4FA3', // 蓝
  K: '#111111', // 黑
};
export const PLATE_ORDER: Ink[] = ['Y', 'R', 'B', 'K']; // 源 film.js 压印顺序 Y→R→B→K

// ---------------------------------------------------------------- 缓动白名单（机械理性，禁 overshoot）
export const clamp01 = (u: number) => Math.min(1, Math.max(0, u));
export const io2 = (u: number) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2); // power2.inOut
export const in2 = (u: number) => u * u; // power2.in（落版砸死，速度归零）
export const lin = (u: number) => clamp01(u); // linear
export const prog = (f: number, f0: number, f1: number) => clamp01((f - f0) / (f1 - f0));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
/** 帧中心量化闸门（源 snap() 移植）：硬切处子样本永不跨切。 */
export const snapF = (f: number) => Math.round(f);

// ---------------------------------------------------------------- seeded hash（替代 Math.random）
export function hash2(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b ^ 0xc2b2ae35, 0x27d4eb2f);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2545f491);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- 网格断言（落点∈网格，module 级不变量，随每次渲染执行）
export const onGrid = (x: number, y: number) => (x - TRIM.x0) % M === 0 && (y - TRIM.y0) % M === 0;
export const isCellCentre = (x: number, y: number) =>
  (x - TRIM.x0 - M) % CARD === 0 && (y - TRIM.y0 - M) % CARD === 0;
export function assertOnGrid(name: string, x: number, y: number): void {
  if (!onGrid(x, y)) throw new Error(`[ink-plate 断言] 落点越格：${name} (${x},${y}) 不在 ${M}px 网格线上`);
}

// ---------------------------------------------------------------- 节拍（120BPM = 15f/拍；BGM techno 同网格，b0=f1）
export const BEAT = 15;
export const BEATS = 26; // f1..f376
export const beatFrame = (k: number) => 1 + BEAT * k;
export const beatNo = (f: number) => Math.min(BEATS, Math.floor((f - 1) / BEAT) + 1);

// ---------------------------------------------------------------- 时刻表（全部动作钉在拍点/反拍上，一拍一动作）
export const EV = {
  sheetIn: 1, // 开纸：裁切角线/套准标/拍计数器/十字①（b0）
  circleLand: 10, // 钩子：红圆落版 c0r0（弱起拍，0.30s < 0.5s 纪律）
  triIn: 22, // 黄三角倒挂生长（反拍起）
  triLand: 31, // b2：倒挂落定
  triFlip0: 38,
  triFlip1: 46, // b3：翻正（apex 上）
  sqIn: 52,
  sqLand: 61, // b4：方从顶边长出落定 c2r0
  bar0: 67,
  bar1: 76, // b5：黑竖条延伸（右墙）
  title0: 82,
  title1: 91, // b6：题头栏盖印（scaleY in2，模数版式）
  rule: 106, // b7：地平钢线 y=300 划出 + 第二排预告十字×3
  circleDesc: 136, // b9：圆下台阶 c0r0→c1r1
  triDesc: 151, // b10：三角 c1r0→c2r1
  sqDesc: 166, // b11：方 c2r0→c3r1
  errLand: 196, // b13：方块抢拍进位一格 c3r1→c4r1（无预告十字=排错一格，撞黑墙）
  refCircle: 211, // b14：整队重来① 圆升 c1r1→c1r0
  refTri: 226, // b15：整队重来② 三角 c2r1→c1r1
  refSq: 241, // b16：整队重来③ 方归位 c4r1→c2r1
  turn0: 256, // b17：轴点盖印 + 步进 90° 群转起（12 棘齿 × 3.75f，16 分音符棘轮）
  turn1: 301, // b20：群转落定（-90°，横队转角成 L 队）
  strikeSq: 301, // b20：落版墨敲十字①（方 760,300）
  strikeTri: 316, // b21：②（三角 760,540）
  strikeCircle: 331, // b22：③（圆 520,540）
  lock: 346, // b23：PRESS LOCK——四版敲进套准（reg 2.3→0.12，+10% 上墨，纸牙 2px 震落）
  freezeFrom: 353, // 定帧：末形（红圆）错位微颤，其余全静止
} as const;

// ---------------------------------------------------------------- 落点台账（全部 ∈ 网格，module 级断言）
export type Landing = {name: string; x: number; y: number};
export const LANDINGS: Landing[] = [
  {name: 'circle@hook c0r0', x: cellX(0), y: cellY(0)},
  {name: 'tri@row0 c1r0(倒挂)', x: cellX(1), y: cellY(0)},
  {name: 'sq@row0 c2r0', x: cellX(2), y: cellY(0)},
  {name: 'circle@row1 c1r1', x: cellX(1), y: cellY(1)},
  {name: 'tri@row1 c2r1', x: cellX(2), y: cellY(1)},
  {name: 'sq@row1 c3r1', x: cellX(3), y: cellY(1)},
  {name: 'sq@err 抢拍进位 c4r1（在格上，错在队序）', x: cellX(4), y: cellY(1)},
  {name: 'circle@ref c1r0', x: cellX(1), y: cellY(0)},
  {name: 'tri@ref c1r1', x: cellX(1), y: cellY(1)},
  {name: 'sq@ref c2r1', x: cellX(2), y: cellY(1)},
  {name: 'sq@post-turn 群转落点', x: gx(6), y: gy(2)}, // (760,300) 240 网格线交点
  {name: 'tri@post-turn 群转落点', x: gx(6), y: gy(4)}, // (760,540)
  {name: 'circle@post-turn 群转落点', x: gx(4), y: gy(4)}, // (520,540)
  {name: 'pivot 轴点', x: gx(5), y: gy(2)}, // (640,300)
];
/** 预告十字（Passkreuz）：from 出现（拍/反拍），until = 落版墨敲掉帧。 */
export type Cross = {id: string; x: number; y: number; from: number; until: number};
export const CROSSES: Cross[] = [
  {id: 'c1', x: cellX(0), y: cellY(0), from: 1, until: EV.circleLand},
  {id: 'c2', x: cellX(1), y: cellY(0), from: beatFrame(1), until: EV.triLand},
  {id: 'c3', x: cellX(2), y: cellY(0), from: EV.triFlip1, until: EV.sqLand},
  {id: 'c4', x: cellX(1), y: cellY(1), from: EV.rule, until: EV.circleDesc},
  {id: 'c5', x: cellX(2), y: cellY(1), from: EV.rule, until: EV.triDesc},
  {id: 'c6', x: cellX(3), y: cellY(1), from: EV.rule, until: EV.sqDesc},
  {id: 'c7', x: gx(6), y: gy(2), from: 261, until: EV.strikeSq}, // 群转中反拍预告落点
  {id: 'c8', x: gx(6), y: gy(4), from: 276, until: EV.strikeTri},
  {id: 'c9', x: gx(4), y: gy(4), from: 291, until: EV.strikeCircle},
];
// module 级不变量：任何落点/十字偏离网格即抛错（渲染期即败，开发期纪律）
for (const l of LANDINGS) assertOnGrid(l.name, l.x, l.y);
for (const c of CROSSES) assertOnGrid(`cross ${c.id}`, c.x, c.y);
// 交叉校验：每个预告十字的敲掉帧必须是某次真实落版；抢拍落位（err）必须无十字预告
{
  const lands = new Set<number>([EV.circleLand, EV.triLand, EV.sqLand, EV.circleDesc, EV.triDesc, EV.sqDesc, EV.strikeSq, EV.strikeTri, EV.strikeCircle]);
  for (const c of CROSSES) if (!lands.has(c.until)) throw new Error(`[ink-plate 断言] 十字 ${c.id} 的 until=${c.until} 不对位任何落版拍`);
  const errCrossed = CROSSES.some((c) => c.x === cellX(4) && c.y === cellY(1));
  if (errCrossed) throw new Error('[ink-plate 断言] 抢拍落位 c4r1 被预告过——与「排错一格」叙事矛盾');
}

// ---------------------------------------------------------------- 群转：12 棘齿擒纵（源 groupAngle 移植，快中段/两端明显步进）
export const TURN = {t0: EV.turn0, t1: EV.turn1, detents: 12, px: gx(5), py: gy(2)} as const;
/** 群转角（度）：0 → -90，12 齿步进；齿内后 65% 行程，落齿点 = BGM 16 分音符。 */
export function turnAngleDeg(f: number): number {
  const p = io2(prog(f, TURN.t0, TURN.t1));
  const x = p * TURN.detents;
  const k = Math.min(TURN.detents, Math.floor(x + 1e-9));
  const r = x - k;
  return (-90 * (k + io2(clamp01((r - 0.35) / 0.65))) / TURN.detents);
}
/** 点绕轴旋转（屏幕坐标）。 */
export function rotAbout(x: number, y: number, deg: number, px: number, py: number): {x: number; y: number} {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = x - px;
  const dy = y - py;
  return {x: px + dx * c - dy * s, y: py + dx * s + dy * c};
}

// ---------------------------------------------------------------- 形状行程（停点全为已断言落点；段内 io2 8f 滑入、落定砸死）
export type Stop = {land: number; x: number; y: number};
export function movePos(f: number, stops: Stop[]): {x: number; y: number} {
  let cur = stops[0];
  let next: Stop | undefined;
  for (const s of stops) {
    if (f >= s.land) cur = s;
    else if (!next || s.land < next.land) next = s;
  }
  if (!next || f < next.land - 8) return {x: cur.x, y: cur.y};
  const u = io2(prog(f, next.land - 8, next.land));
  return {x: lerp(cur.x, next.x, u), y: lerp(cur.y, next.y, u)};
}
export const CIRCLE_STOPS: Stop[] = [
  {land: 1, x: cellX(0) - 6 * M, y: cellY(0)}, // 画外入
  {land: EV.circleLand, x: cellX(0), y: cellY(0)},
  {land: EV.circleDesc, x: cellX(1), y: cellY(1)},
  {land: EV.refCircle, x: cellX(1), y: cellY(0)},
];
export const TRI_STOPS: Stop[] = [
  {land: 1, x: cellX(1), y: cellY(0)},
  {land: EV.triDesc, x: cellX(2), y: cellY(1)},
  {land: EV.refTri, x: cellX(1), y: cellY(1)},
];
export const SQ_STOPS: Stop[] = [
  {land: EV.sqLand, x: cellX(2), y: cellY(0)},
  {land: EV.sqDesc, x: cellX(3), y: cellY(1)},
  {land: EV.errLand, x: cellX(4), y: cellY(1)}, // 抢拍：进位一格撞黑墙
  {land: EV.refSq, x: cellX(2), y: cellY(1)},
];

// ---------------------------------------------------------------- 双版错位：套准状态机（源 registration() 重写，锚定本片时刻表）
/** 套准系数：1=基准错位；>1=松版（版挪滚）；0.12=press lock 敲进套准。 */
export function regAt(f: number): number {
  if (f < EV.errLand) return 1;
  if (f < EV.turn0) return 1 + 1.3 * in2(prog(f, EV.errLand, EV.turn0)); // 排错→重来：版渐松
  if (f < EV.strikeSq) return 2.3; // 群转全程松版（棘轮期间印面最散）
  if (f < EV.lock) return lerp(2.3, 1.2, lin(prog(f, EV.strikeSq, EV.strikeCircle))); // 三次敲击逐步收紧
  return 0.12; // press lock
}
/** 三色离心（spread，px）：敲击瞬间色版离心脉冲 3f。 */
export function spreadAt(f: number): number {
  for (const s of [EV.strikeSq, EV.strikeTri, EV.strikeCircle]) if (f >= s && f < s + 3) return 2.2;
  return 0;
}
/** 上墨率（版密度）：基准 0.94；落版敲击/lock 帧 +10%、次帧 +4%（源 ink kiss 移植）。 */
export function densAt(f: number): number {
  let d = 0.94;
  for (const s of [EV.errLand, EV.strikeSq, EV.strikeTri, EV.strikeCircle, EV.lock]) {
    if (f === s) d += 0.1;
    else if (f === s + 1) d += 0.04;
  }
  return Math.min(d, 1);
}
/** 各版基准偏移（源 PLATE_OFF 移植）：regX/regY（套准错位）+ spreadX/spreadY（三色离心）。 */
const PLATE_BASE: Record<Ink, [number, number, number, number]> = {
  Y: [0, 0, 1, 0],
  R: [1.3, -0.9, 0, 1],
  B: [-1.0, 1.2, 0, -1],
  K: [0.5, 0.4, 0, 0],
};
const ROUGH_SEED: Record<Ink, number> = {Y: 41, R: 43, B: 47, K: 53};
/** 版偏移（px）= 套准 × reg + 离心 × spread + 恒定滚筒偏心（seeded）+ 定帧段末形微颤。 */
export function plateOffset(ink: Ink, f: number): {x: number; y: number} {
  const [rx, ry, sx, sy] = PLATE_BASE[ink];
  const reg = regAt(f);
  const sp = spreadAt(f);
  let x = rx * reg + sx * sp + (hash2(11 + ROUGH_SEED[ink], 7) - 0.5) * 1.3;
  let y = ry * reg + sy * sp + (hash2(23 + ROUGH_SEED[ink], 9) - 0.5) * 0.35;
  if (f >= EV.freezeFrom && ink === 'R') {
    // 定帧段：末形（红圆，最后落版的一墨）错位微颤，10fps 量化步进
    const step = Math.floor(f / 3);
    x += (hash2(step, 101) - 0.5) * 2;
    y += (hash2(step, 103) - 0.5) * 2;
  }
  return {x, y};
}
/** press lock 纸牙震落（源 camera() 移植）：lock 帧 +2px、次帧 +1px。 */
export const paperJolt = (f: number) => (f === EV.lock ? 2 : f === EV.lock + 1 ? 1 : 0);

// ---------------------------------------------------------------- 网格钢线落规（源 gridProg 移植：16 分音符落规，3px 钢笔→发丝线）
export type GridLineState = {e: number; w: number; alpha: number; main: boolean};
/** d = 离中轴档距；main = 中轴线（钩子段 6px 落规，relax 更慢）。 */
export function gridLineAt(f: number, d: number, main: boolean): GridLineState {
  const land = Math.round(2 + d * 3.75); // 16 分音符网格
  const draw = 7;
  const relax = main ? 8 : 6;
  const e = io2(prog(f, land - draw, land)); // 可见半程 0→1
  const w = f < land ? (e > 0 ? 2 : 0) : 2 * (1 - io2(prog(f, land, land + relax))); // 钢笔宽权重
  const alpha = (main ? 0.28 : 0.17) + (0.92 - (main ? 0.28 : 0.17)) * Math.min(w, 1);
  return {e, w, alpha, main};
}
/** 钢线线宽（px）：发丝 1.1 → 落规 6（源 mix(1.1,3.2)+2.8·(w-1) 移植）。 */
export const gridStrokeW = (st: GridLineState) => 1.1 + 2.1 * Math.min(st.w, 1) + 2.8 * Math.max(st.w - 1, 0);

// ---------------------------------------------------------------- 自检入口：node --experimental-strip-types src/style/world.ts
// （浏览器 bundle 里 process.argv 是 shim=undefined，须先验 Array.isArray）
if (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv[1] && /world\.ts$/.test(process.argv[1].replace(/\\/g, '/'))) {
  const turnEnd = turnAngleDeg(TURN.t1);
  if (Math.abs(turnEnd + 90) > 1e-9) throw new Error(`群转末角 ${turnEnd}≠-90`);
  if (turnAngleDeg(TURN.t0) !== 0) throw new Error('群转起角≠0');
  const wrong: Array<[number, number]> = [
    [gx(0) + 1, gy(0)],
    [cellX(2), cellY(1) + 7],
  ];
  for (const [x, y] of wrong) if (onGrid(x, y)) throw new Error('onGrid 误报通过');
  console.log(`[ink-plate] 网格断言自检 PASS：${LANDINGS.length} 落点 + ${CROSSES.length} 十字全在 ${M}px 网格；群转 0→-90°（12 齿）；onGrid 负例正确拒绝`);
}
