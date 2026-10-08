import React from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import {W, H} from '../common';

// ============================================================================
// kit.tsx — dot-infinity 图元库（草间弥生无限波点 · 战役4 批次④ D2-5）
// 技法借鉴 huashu-art-motion scenes/21_kusama.js + references/风格配方/21_kusama.md
// （MIT），Remotion/React-TSX 惯用法重写，禁整段拷贝。
//
// 六签名：
//  ① 焦点波呼吸单函数 wave()=0.82+0.28·sin(dist·0.012−6t)——全屏点从焦点一圈圈胀缩
//  ② 手绘不规则圆（轻微椭圆+随机转角）+ 六角网格 ±25–50% 抖动；滚动取模按真实周期两行
//    （2·sp·0.87）——单行取模回绕帧整片跳一行（帧差 2.7 倍事故，crawlOff 纪律）
//  ③ 无限镜屋：13×7×3 规则格子灯 z 循环飞向镜头 F150 透视，小实心核+3.2×光晕 lighter
//    （禁随机散布+大光晕=糊成散景）
//  ④ 黄南瓜 5 瓣行排黑点（中列最大向两侧收）+ 底轴呼吸 1±0.025·sin(5t)
//  ⑤ 滚动点取模纪律：裙上白点顺裙爬（clip 裙剪影 + y 真周期取模）
//  ⑥ 自我消融：红覆盖渐显 + 全屏点阵从焦点胀满吞掉一切，随后收缩收在点阵上
//    （半径封顶 capR≥15，永不为零、不停纯色）
// 短板修正（INDEX：人物与墙同色靠轮廓撑）：wall 点场以人物剪影 mask 自动去同色点
//  （并外扩 3px 隔离带）+ 人物轮廓 4.5px 为默认行为。
// 锁死 token：红/黄/白/黑四色 + 轮廓墨（草间世界拒绝第五色相）。
// 逐帧确定性：mulberry32（状态闭包顶层逐调用推进），禁 Math.random/Date/网络。
// ============================================================================

// ---- 锁死 token ----
export const TOK = {
  red: '#d8181e',
  redDk: '#a80e14',
  redLt: '#e02024',
  yel: '#f6d02a',
  wht: '#fbf6ee',
  blk: '#141210',
  ink: '#141210',
} as const;

// ---- 缓动 ----
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const inv = (a: number, b: number, x: number) => clamp01((x - a) / (b - a));
export const outC = (u: number) => 1 - Math.pow(1 - clamp01(u), 3);
export const inQ = (u: number) => clamp01(u) * clamp01(u);
export const outBack = (u: number, s = 1.7) => {
  const x = clamp01(u);
  const c3 = s + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
};
/** smoothstep（消融包络用，源配方 ss） */
export const smooth = (u: number) => {
  const x = clamp01(u);
  return x * x * (3 - 2 * x);
};

// ---- 确定性随机（mulberry32；状态置顶层、逐调用推进——F 波次施工单：禁把状态写内层闭包） ----
export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ---- 签名①：焦点波呼吸（单函数让全屏活） ----
export const wave = (x: number, y: number, t: number, k = 1, ox: number, oy: number) =>
  0.82 + 0.28 * Math.sin(Math.hypot(x - ox, y - oy) * 0.012 - t * 6 * k);

// ---- 签名②：六角网格（手绘不规则圆：轻微椭圆 asp + 随机转角 rot + 位置抖动） ----
export type HDot = {x: number; y: number; s: number; rot: number; asp: number};
export const hexGrid = (x0: number, y0: number, x1: number, y1: number, sp: number, seed: number, jit = 0.25): HDot[] => {
  const r = mulberry32(seed);
  const o: HDot[] = [];
  for (let y = y0, j = 0; y < y1; y += sp * 0.87, j++) {
    for (let x = x0 + (j % 2) * (sp / 2); x < x1; x += sp) {
      o.push({x: x + (r() - 0.5) * sp * jit, y: y + (r() - 0.5) * sp * jit, s: 0.75 + r() * 0.5, rot: r() * Math.PI * 2, asp: 0.85 + r() * 0.3});
    }
  }
  return o;
};
/** 签名②⑤：滚动点真周期取模——六角行距 sp·0.87、奇偶行错位 sp/2，图案竖直真实周期=两行 2·sp·0.87。
 *  按单行取模时回绕帧奇偶互换整片跳一行（huashu 实测帧差 2.7 倍事故）。 */
export const crawlOff = (t: number, v: number, sp: number) => (t * v) % (2 * sp * 0.87);

// ---- 手绘点（椭圆 + 转角） ----
export const Dot: React.FC<{x: number; y: number; r: number; col: string; rot?: number; asp?: number; op?: number}> = ({x, y, r, col, rot = 0, asp = 1, op}) =>
  r <= 0.3 ? null : (
    <ellipse
      cx={x.toFixed(2)} cy={y.toFixed(2)}
      rx={r.toFixed(2)} ry={(r * asp).toFixed(2)}
      transform={`rotate(${((rot * 180) / Math.PI).toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`}
      fill={col} opacity={op === undefined ? undefined : op.toFixed(3)}
    />
  );

// ---- 房间静态点场（模块级一次生成，确定性） ----
export const WALL_BIG = hexGrid(-40, 12, W + 40, 470, 72, 3, 0.25);
export const WALL_SM = hexGrid(8, 42, W + 40, 470, 72, 4, 0.5);
export type FloorDot = {x: number; y: number; r: number};
export const FLOOR: FloorDot[] = (() => {
  const r = mulberry32(6);
  const o: FloorDot[] = [];
  for (let row = 0; row < 9; row++) {
    const q = row / 8;
    const y = 470 + Math.pow(q, 1.4) * 244;
    const sp = 30 + q * 46;
    const rr = 4 + q * 15;
    for (let x = -40 + (row % 2) * (sp / 2); x < W + 40; x += sp) {
      o.push({x: x + (r() - 0.5) * 8, y, r: rr * (0.8 + r() * 0.4)});
    }
  }
  return o;
})();

// ---- 红房间（签名①全屏载体 + 短板修正：人物剪影 mask 自动去同色点） ----
export const Room: React.FC<{t: number; ox: number; oy: number; exclPath?: string; obl?: number; dotScale?: (x: number, y: number) => number}> = ({t, ox, oy, exclPath, obl = 0, dotScale}) => {
  const g = 1 + obl * 2.2; // 消融期墙面点同倍胀（吞房间）
  const ds = dotScale ?? (() => 1);
  const uid = 'room';
  return (
    <g>
      <rect x={0} y={0} width={W} height={466} fill={TOK.red} />
      <linearGradient id={`${uid}-fg`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c0141a" />
        <stop offset="1" stopColor={TOK.redLt} />
      </linearGradient>
      <rect x={0} y={462} width={W} height={H - 462} fill={`url(#${uid}-fg)`} />
      <rect x={0} y={462} width={W} height={4} fill={TOK.redDk} />
      <defs>
        {exclPath ? (
          <mask id={`${uid}-excl`}>
            <rect x={0} y={0} width={W} height={H} fill="#fff" />
            {/* 黑描边同 path = 排除区外扩 3px 隔离带，点阵永不贴到人物轮廓上 */}
            <path d={exclPath} fill="#000" stroke="#000" strokeWidth={6} />
          </mask>
        ) : null}
      </defs>
      <g mask={exclPath ? `url(#${uid}-excl)` : undefined}>
        {WALL_BIG.map((d, i) => (
          <Dot key={`b${i}`} x={d.x} y={d.y} r={20 * d.s * ds(d.x, d.y) * wave(d.x, d.y, t, 1, ox, oy) * g} col={TOK.wht} rot={d.rot} asp={d.asp} />
        ))}
        {WALL_SM.map((d, i) => (
          <Dot key={`s${i}`} x={d.x} y={d.y} r={7 * d.s * ds(d.x, d.y) * wave(d.x, d.y, t, 1.3, ox, oy) * g} col={TOK.wht} rot={d.rot} asp={d.asp} />
        ))}
        {FLOOR.map((d, i) => (
          <Dot key={`f${i}`} x={d.x} y={d.y} r={d.r * ds(d.x, d.y) * wave(d.x, d.y, t, 1, ox, oy) * g} col={TOK.wht} asp={0.42} />
        ))}
      </g>
    </g>
  );
};

// ---- 签名③：无限镜屋灯阵（13×7×3 规则格子，z 循环飞向镜头，F150 透视） ----
export const LIGHT_COLS = [TOK.red, TOK.yel, TOK.wht];
export type LightRec = {x: number; y: number; z0: number; ci: number};
export const LIGHTS: LightRec[] = (() => {
  const r = mulberry32(9);
  const o: LightRec[] = [];
  for (let gx = -6; gx <= 6; gx++) {
    for (let gy = -3; gy <= 3; gy++) {
      for (let gz = 0; gz < 3; gz++) {
        // 规则格为主、±0.03 微扰——无限镜面感来自规则重复，禁随机散布
        o.push({x: gx * 0.42 + (r() - 0.5) * 0.06, y: gy * 0.38 + (r() - 0.5) * 0.06, z0: (gz + r() * 0.3) / 3, ci: (r() * 3) | 0});
      }
    }
  }
  return o;
})();

export const MirrorTunnel: React.FC<{
  t: number; speed: number; cx: number; cy: number; F: number;
  clip: [number, number, number, number]; uid: string; rays?: boolean;
}> = ({t, speed, cx, cy, F, clip, uid, rays = true}) => {
  const [x0, y0, cw, ch] = clip;
  const items = LIGHTS.map((L) => {
    const z = ((((L.z0 - t * speed) % 1) + 1) % 1) * 3.6 + 0.4;
    return {px: cx + L.x * (F / z), py: cy + L.y * (F / z), z, r: 3.2 / z + 0.6, ci: L.ci, kx: L.x.toFixed(3), ky: L.y.toFixed(3)};
  })
    .filter((o) => o.px > x0 - 24 && o.px < x0 + cw + 24 && o.py > y0 - 24 && o.py < y0 + ch + 24)
    .sort((a, b) => b.z - a.z);
  return (
    <g>
      <defs>
        <clipPath id={`tw-${uid}`}>
          <rect x={x0} y={y0} width={cw} height={ch} />
        </clipPath>
        {LIGHT_COLS.map((c, i) => (
          <radialGradient key={i} id={`tg-${uid}-${i}`}>
            <stop offset="0" stopColor={c} />
            <stop offset="1" stopColor={c} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>
      <g clipPath={`url(#tw-${uid})`}>
        <rect x={x0} y={y0} width={cw} height={ch} fill="#05040a" />
        {rays ? (
          <g stroke="rgba(150,150,190,.22)" strokeWidth={1}>
            {[[x0, y0], [x0 + cw, y0], [x0, y0 + ch], [x0 + cw, y0 + ch]].map(([rx, ry], i) => (
              <line key={i} x1={cx} y1={cy} x2={rx} y2={ry} />
            ))}
          </g>
        ) : null}
        <g style={{mixBlendMode: 'plus-lighter'} as React.CSSProperties}>
          {items.map((o) => {
            const fade = clamp01((4 - o.z) / 1.0) * clamp01((o.z - 0.4) / 0.25);
            if (fade <= 0.02) return null;
            return (
              <g key={`${o.kx}_${o.ky}_${o.ci}`} opacity={fade.toFixed(3)}>
                {/* 3.2× 光晕（小核大头帽：光晕半径=核×3.2，禁更大） */}
                <circle cx={o.px.toFixed(2)} cy={o.py.toFixed(2)} r={(o.r * 3.2).toFixed(2)} fill={`url(#tg-${uid}-${o.ci})`} opacity={0.5} />
                <circle cx={o.px.toFixed(2)} cy={o.py.toFixed(2)} r={o.r.toFixed(2)} fill={LIGHT_COLS[o.ci]} />
              </g>
            );
          })}
        </g>
      </g>
    </g>
  );
};

// 镜屋窗（画内窗版）：黄底黑点窗框包 MirrorTunnel
export const WINDOW_CLIP: [number, number, number, number] = [870, 130, 260, 330];
export const MirrorWindow: React.FC<{t: number; ox: number; oy: number}> = ({t, ox, oy}) => {
  const band = 18;
  const fx = 852, fy = 112, fw = 296, fh = 366;
  return (
    <g>
      <MirrorTunnel t={t} speed={0.3} cx={1000} cy={295} F={100} clip={WINDOW_CLIP} uid="win" />
      {/* 窗框：黄底 + 黑点行波 + 墨框 */}
      <g>
        <rect x={fx} y={fy} width={fw} height={band} fill={TOK.yel} />
        <rect x={fx} y={fy + fh - band} width={fw} height={band} fill={TOK.yel} />
        <rect x={fx} y={fy} width={band} height={fh} fill={TOK.yel} />
        <rect x={fx + fw - band} y={fy} width={band} height={fh} fill={TOK.yel} />
        {Array.from({length: Math.floor(fw / 15)}, (_, i) => 862 + i * 15).map((x) => (
          <React.Fragment key={`h${x}`}>
            <Dot x={x} y={fy + band / 2} r={4 * wave(x, fy + 9, t, 1.2, ox, oy)} col={TOK.blk} />
            <Dot x={x} y={fy + fh - band / 2} r={4 * wave(x, fy + fh - 9, t, 1.2, ox, oy)} col={TOK.blk} />
          </React.Fragment>
        ))}
        {Array.from({length: Math.floor(fh / 15)}, (_, i) => 142 + i * 15).map((y) => (
          <React.Fragment key={`v${y}`}>
            <Dot x={fx + band / 2} y={y} r={4 * wave(fx + 9, y, t, 1.2, ox, oy)} col={TOK.blk} />
            <Dot x={fx + fw - band / 2} y={y} r={4 * wave(fx + fw - 9, y, t, 1.2, ox, oy)} col={TOK.blk} />
          </React.Fragment>
        ))}
        <rect x={fx} y={fy} width={fw} height={fh} fill="none" stroke={TOK.ink} strokeWidth={3} />
      </g>
    </g>
  );
};

// ---- 桌（黄面黑点网格） ----
export const Table: React.FC<{t: number; ox: number; oy: number}> = ({t, ox, oy}) => {
  const bars: Array<[number, number, number, number]> = [
    [430, 556, 330, 24],
    [452, 582, 286, 26],
    [462, 608, 20, 102],
    [708, 608, 20, 102],
  ];
  return (
    <g>
      {bars.map(([x, y, w, h], bi) => (
        <g key={bi}>
          <rect x={x} y={y} width={w} height={h} fill={TOK.yel} stroke={TOK.ink} strokeWidth={4} />
          <clipPath id={`tb-${bi}`}>
            <rect x={x} y={y} width={w} height={h} />
          </clipPath>
          <g clipPath={`url(#tb-${bi})`}>
            {Array.from({length: Math.ceil(h / 18)}, (_, ry) =>
              Array.from({length: Math.ceil(w / 18) + 1}, (_, rx) => {
                const yy = y + 9 + ry * 18;
                const xx = x + 9 + ((ry % 2) * 9 + rx * 18) % w;
                return <Dot key={`${ry}_${rx}`} x={xx} y={yy} r={2.8 * wave(xx, yy, t, 1.1, ox, oy)} col={TOK.blk} />;
              }),
            )}
          </g>
        </g>
      ))}
    </g>
  );
};

// ---- 签名④：黄南瓜（5 瓣外→内、行排黑点中列最大、底轴呼吸） ----
export const PUMPKIN = {cx: 595, cy: 505};
const LOBES: Array<[number, number, number]> = [
  [-58, 31, 47],
  [-29, 39, 49],
  [0, 41, 53],
  [29, 39, 49],
  [58, 31, 47],
];
export const Pumpkin: React.FC<{t: number; ox: number; oy: number}> = ({t, ox, oy}) => {
  const {cx, cy} = PUMPKIN;
  const br = 1 + Math.sin(t * 5) * 0.025; // 底轴呼吸
  const ax = cx, ay = cy + 53;
  return (
    <g transform={`translate(${ax} ${ay}) scale(${br.toFixed(4)} ${(2 - br).toFixed(4)}) translate(${-ax} ${-ay})`}>
      {[0, 4, 1, 3, 2].map((k) => {
        const [dx, rx, ry] = LOBES[k];
        const px = cx + dx, py = cy + 5;
        return (
          <g key={k}>
            <ellipse cx={px} cy={py} rx={rx} ry={ry} fill={TOK.yel} stroke={TOK.ink} strokeWidth={4} />
            <clipPath id={`lb-${k}`}>
              <ellipse cx={px} cy={py} rx={rx - 2} ry={ry - 2} />
            </clipPath>
            <g clipPath={`url(#lb-${k})`}>
              {Array.from({length: 9}, (_, ri) => {
                const row = ri - 4;
                const y = py + row * 11.3;
                const wRow = Math.sqrt(Math.max(0, 1 - Math.pow((row * 11.3) / ry, 2))) * rx;
                return Array.from({length: 7}, (_, ci2) => {
                  const col = ci2 - 3;
                  const x = px + col * wRow * 0.3;
                  const edge = 1 - Math.abs(col) / 4;
                  const r = (2 + 4.3 * edge) * (1 - Math.abs(row) / 6) * wave(x, y, t, 1.5, ox, oy);
                  return <Dot key={`${ri}_${ci2}`} x={x} y={y} r={r} col={TOK.blk} />;
                });
              })}
            </g>
          </g>
        );
      })}
      {/* 瓜蒂（黑——四色纪律内） */}
      <path
        d={`M ${cx - 7} ${cy - 32} Q ${cx - 9} ${cy - 56} ${cx + 4} ${cy - 60} L ${cx + 9} ${cy - 54} Q ${cx + 3} ${cy - 45} ${cx + 7} ${cy - 32} Z`}
        fill={TOK.blk} stroke={TOK.ink} strokeWidth={3}
      />
    </g>
  );
};

// ---- 少女（白肤=四色纪律内；红裙白点顺裙爬；轮廓 4.5px 默认） ----
export const GIRL_X = 290;
export const GIRL_GROUND = 640;
const lx = (x: number) => GIRL_X + x;
const ly = (y: number) => GIRL_GROUND + y;

/** 人物剪影（head+hairbun+dress+legs 复合路径；Room 的 exclPath 与 Girl 共用同一几何） */
export const girlSilPath = (dx = 0): string =>
  [
    // 头
    `M ${lx(-30 + dx)} ${ly(-288)} a 30 30 0 1 0 60 0 a 30 30 0 1 0 -60 0`,
    // 发髻
    `M ${lx(-16 + dx)} ${ly(-322)} a 16 16 0 1 0 32 0 a 16 16 0 1 0 -32 0`,
    // 裙（梯形连肩）
    `M ${lx(-22 + dx)} ${ly(-256)} L ${lx(22 + dx)} ${ly(-256)} L ${lx(40 + dx)} ${ly(-118)} Q ${lx(0 + dx)} ${ly(-104)} ${lx(-40 + dx)} ${ly(-118)} Z`,
    // 腿 ×2
    `M ${lx(-20 + dx)} ${ly(-124)} L ${lx(-9 + dx)} ${ly(-124)} L ${lx(-11 + dx)} ${ly(-4)} L ${lx(-22 + dx)} ${ly(-4)} Z`,
    `M ${lx(9 + dx)} ${ly(-124)} L ${lx(20 + dx)} ${ly(-124)} L ${lx(22 + dx)} ${ly(-4)} L ${lx(11 + dx)} ${ly(-4)} Z`,
  ].join(' ');

const capsule = (x1: number, y1: number, x2: number, y2: number, w: number, col: string, inkW: number) => (
  <g>
    <line x1={lx(x1)} y1={ly(y1)} x2={lx(x2)} y2={ly(y2)} stroke={TOK.ink} strokeWidth={w + inkW * 2} strokeLinecap="round" />
    <line x1={lx(x1)} y1={ly(y1)} x2={lx(x2)} y2={ly(y2)} stroke={col} strokeWidth={w} strokeLinecap="round" />
  </g>
);

export const Girl: React.FC<{t: number; ox: number; oy: number; armUp?: number; walk?: number}> = ({t, ox, oy, armUp = 0, walk = 0}) => {
  const bob = Math.sin(t * 2.6) * 2.5 * (1 + walk);
  const blink = t % 3.1 < 0.12 ? 0.15 : 1;
  const armAng = -armUp * 66; // 抬臂指向镜屋窗（绕肩 -66°，rotate 用度）
  const swing = Math.sin(t * 9) * 8 * walk;
  return (
    <g transform={`translate(0 ${bob.toFixed(2)})`}>
      {/* 远侧手臂（先画，压在身后） */}
      <g transform={armUp > 0 ? `rotate(${(armAng * 0.7).toFixed(2)} ${lx(-18)} ${ly(-244)})` : undefined}>
        {capsule(-18, -244, -30, -178, 11, TOK.red, 2.2)}
      </g>
      <circle cx={lx(0)} cy={ly(-322)} r={16} fill={TOK.blk} stroke={TOK.ink} strokeWidth={3} />
      <circle cx={lx(0)} cy={ly(-288)} r={30} fill={TOK.wht} stroke={TOK.ink} strokeWidth={4.5} />
      {/* 头发（盖头顶的帽形 + 发髻已画） */}
      <path d={`M ${lx(-29)} ${ly(-296)} a 30 30 0 0 1 58 0 Q ${lx(20)} ${ly(-314)} ${lx(0)} ${ly(-314)} Q ${lx(-20)} ${ly(-314)} ${lx(-29)} ${ly(-296)} Z`} fill={TOK.blk} />
      {/* 腿（白）+ 鞋（黑） */}
      <g transform={`rotate(${swing.toFixed(2)} ${lx(-14)} ${ly(-124)})`}>{capsule(-14, -122, -16, -10, 11, TOK.wht, 2.2)}</g>
      <g transform={`rotate(${(-swing).toFixed(2)} ${lx(14)} ${ly(-124)})`}>{capsule(14, -122, 16, -10, 11, TOK.wht, 2.2)}</g>
      <ellipse cx={lx(-17)} cy={ly(-4)} rx={13} ry={7} fill={TOK.blk} stroke={TOK.ink} strokeWidth={3} />
      <ellipse cx={lx(17)} cy={ly(-4)} rx={13} ry={7} fill={TOK.blk} stroke={TOK.ink} strokeWidth={3} />
      {/* 红裙 */}
      <path d={`M ${lx(-22)} ${ly(-256)} L ${lx(22)} ${ly(-256)} L ${lx(40)} ${ly(-118)} Q ${lx(0)} ${ly(-104)} ${lx(-40)} ${ly(-118)} Z`} fill={TOK.red} stroke={TOK.ink} strokeWidth={4.5} />
      {/* 签名⑤：裙上白点顺裙爬（clip 裙剪影，y 按真周期两行取模 2·36·0.87=62.64） */}
      <clipPath id="dress-clip">
        <path d={`M ${lx(-22)} ${ly(-256)} L ${lx(22)} ${ly(-256)} L ${lx(40)} ${ly(-118)} Q ${lx(0)} ${ly(-104)} ${lx(-40)} ${ly(-118)} Z`} />
      </clipPath>
      <g clipPath="url(#dress-clip)">
        {(() => {
          const sp = 36, r0 = 9, v = 32;
          const off = crawlOff(t, v, sp);
          const els: React.ReactNode[] = [];
          for (let y = ly(-300), j = 0; y < ly(-60); y += sp * 0.87, j++) {
            for (let x = lx(-60) + (j % 2) * (sp / 2); x < lx(60); x += sp) {
              const yy = y + off;
              els.push(<Dot key={`${j}_${x.toFixed(0)}`} x={x} y={yy} r={r0 * wave(x, yy, t, 1, ox, oy) * 0.95} col={TOK.wht} rot={0.2} asp={0.92} />);
            }
          }
          return els;
        })()}
      </g>
      {/* 近侧手臂（抬臂=签名指向镜屋） */}
      <g transform={armUp > 0 ? `rotate(${armAng.toFixed(2)} ${lx(18)} ${ly(-244)})` : undefined}>
        {capsule(18, -244, 34, -178, 11, TOK.red, 2.2)}
        <circle cx={lx(34)} cy={ly(-178)} r={8} fill={TOK.wht} stroke={TOK.ink} strokeWidth={3} />
      </g>
      {/* 脸：点眼 + 腮红点（草间身体彩绘）+ 小嘴 */}
      <ellipse cx={lx(-10)} cy={ly(-290)} rx={2.8} ry={2.8 * blink} fill={TOK.blk} />
      <ellipse cx={lx(10)} cy={ly(-290)} rx={2.8} ry={2.8 * blink} fill={TOK.blk} />
      <Dot x={lx(-17)} y={ly(-276)} r={4.5 * wave(lx(-17), ly(-276), t, 1.4, ox, oy)} col={TOK.red} />
      <Dot x={lx(17)} y={ly(-276)} r={4.5 * wave(lx(17), ly(-276), t, 1.4, ox, oy)} col={TOK.red} />
      <path d={`M ${lx(-5)} ${ly(-271)} Q ${lx(0)} ${ly(-266)} ${lx(5)} ${ly(-271)}`} fill="none" stroke={TOK.ink} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  );
};

// ---- 签名⑥：自我消融覆盖层（红覆盖 + 点阵焦点胀满 → 收缩收在点阵上，半径封顶永不为零） ----
export const DISS_SP = 80;
export const DISS_DOTS = hexGrid(-40, -20, W + 40, H + 40, DISS_SP, 77, 0.12);
export const DISS_RISE: [number, number] = [292, 330];
export const DISS_SAT: [number, number] = [330, 341];
export const DISS_CON: [number, number] = [341, 352];
export const DissolveOverlay: React.FC<{f: number; ox?: number; oy?: number}> = ({f, ox = 560, oy = 340}) => {
  const alpha = inv(DISS_RISE[0], 324, f);
  if (alpha <= 0) return null;
  const t = f / 30;
  const obl = Math.pow(smooth(inv(DISS_RISE[0], DISS_RISE[1], f)), 1.4);
  const sat = inv(DISS_SAT[0], DISS_SAT[1], f);
  const con = outC(inv(DISS_CON[0], DISS_CON[1], f));
  const capR = 40 - 25 * con; // 峰值 40 → 收在 15（封顶不停纯色）
  return (
    <g opacity={alpha.toFixed(3)}>
      <rect x={0} y={0} width={W} height={H} fill={TOK.red} />
      {DISS_DOTS.map((d, i) => {
        const dist = Math.hypot(d.x - ox, d.y - oy);
        const front = clamp01(obl * 1.9 - dist / 850); // 从焦点扩开的胀点波前
        const r = front * capR * (1 + sat * 0.15) * wave(d.x, d.y, t, 1, ox, oy);
        return <Dot key={i} x={d.x} y={d.y} r={r} col={TOK.wht} />;
      })}
    </g>
  );
};

// 收束定帧态：红底白点阵呼吸（构图冻结、点不冻——微动效纪律）
export const RestField: React.FC<{t: number}> = ({t}) => (
  <g>
    <rect x={0} y={0} width={W} height={H} fill={TOK.red} />
    {DISS_DOTS.map((d, i) => (
      <Dot key={i} x={d.x} y={d.y} r={15 * wave(d.x, d.y, t, 1, 560, 340)} col={TOK.wht} />
    ))}
  </g>
);

// ---- 标题卡（黄底墨字 + 呼吸黑点 + 硬阴影） ----
export const TitleCard: React.FC<{f: number; at: number; out?: number; cx?: number; cy?: number; w?: number; small?: boolean}> = ({f, at, out, cx = 640, cy = 210, w = 500, small = false}) => {
  const u = outBack(inv(at, at + 7, f), 2.0);
  const fade = out ? 1 - inv(out, out + 7, f) : 1;
  if (u <= 0 || fade <= 0) return null;
  const h = small ? 104 : 150;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${(0.82 + 0.18 * u).toFixed(3)})`} opacity={Math.min(u, fade).toFixed(3)}>
      <rect x={-w / 2 + 5} y={-h / 2 + 6} width={w} height={h} rx={h / 2} fill="rgba(20,18,16,0.35)" />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={TOK.yel} stroke={TOK.ink} strokeWidth={4} />
      {([
        [-w / 2 + 34, -h / 2 + 26, 9],
        [-w / 2 + 52, h / 2 - 24, 7],
        [w / 2 - 40, -h / 2 + 30, 8],
        [w / 2 - 56, h / 2 - 26, 10],
        [-14, -h / 2 + 18, 5],
      ] as Array<[number, number, number]>).map(([x, y, r], i) => (
        <Dot key={i} x={x} y={y} r={r * wave(cx + x, cy + y, f / 30, 1.4, cx, cy)} col={TOK.blk} />
      ))}
      <text textAnchor="middle" y={small ? 4 : 10} fontFamily="'Noto Sans SC','Microsoft YaHei',sans-serif" fontWeight={900} fontSize={small ? 46 : 66} fill={TOK.ink} style={{letterSpacing: 6}}>
        无限镜屋
      </text>
      <text textAnchor="middle" y={small ? 34 : 52} fontFamily="'Noto Sans SC','Microsoft YaHei',sans-serif" fontWeight={700} fontSize={small ? 15 : 19} fill={TOK.red} style={{letterSpacing: 3}}>
        YAYOI KUSAMA · 无限之点
      </text>
    </g>
  );
};

// ---- 字幕卡（白纸片 + 红点 + 墨字） ----
export const DotCaption: React.FC<{f: number; from: number; to: number; text: string}> = ({f, from, to, text}) => {
  const u = outBack(inv(from, from + 6, f), 1.9);
  const out = 1 - inv(to - 5, to, f);
  if (u <= 0 || out <= 0) return null;
  const op = Math.min(u, out);
  return (
    <g transform={`translate(640 655) scale(${(0.88 + 0.12 * u).toFixed(3)})`} opacity={op.toFixed(3)}>
      <rect x={-text.length * 14 - 44} y={-24} width={text.length * 28 + 88} height={48} rx={24} fill={TOK.wht} stroke={TOK.ink} strokeWidth={2.5} />
      <Dot x={-text.length * 14 - 20} y={0} r={6.5 * wave(0, 0, f / 30, 1.2, 0, 0)} col={TOK.red} />
      <text textAnchor="middle" y={8} fontFamily="'Noto Sans SC','Microsoft YaHei',sans-serif" fontWeight={700} fontSize={26} fill={TOK.ink} style={{letterSpacing: 2}}>
        {text}
      </text>
    </g>
  );
};

// ---- 字体就绪（Noto Sans SC） ----
export const Fonts: React.FC = () => {
  const [handle] = React.useState(() => delayRender('dot-infinity fonts'));
  React.useEffect(() => {
    new FontFace('Noto Sans SC', `url(${staticFile('fonts/NotoSansSC.ttf')})`, {weight: '100 900'} as FontFaceDescriptors)
      .load()
      .then((ff) => {
        (document.fonts as unknown as {add: (f: FontFace) => void}).add(ff);
        continueRender(handle);
      })
      .catch(() => continueRender(handle));
  }, [handle]);
  return null;
};

// ---- 暗角（轻微，不抢戏） ----
export const VIGNETTE = 'radial-gradient(ellipse 118% 96% at 50% 46%, rgba(0,0,0,0) 62%, rgba(20,4,4,0.20) 100%)';
