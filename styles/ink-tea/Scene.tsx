// 《墨虾》—— ink-tea 风格样片正片（中国水墨写意，齐白石虾）。
// 编舞词汇移植自 huashu-art-motion 17_ink (MIT, alchaincyf), TSX 重写。
// 纪律：drawFrame(f) 纯帧号函数，seeded（同帧渲两次逐像素一致）；
// reveal 顺序 = 窗→案→竹→虾→题跋→钤印；钩子 0.5s 内首笔落纸；hero 60-75%（f232-290）；
// 结尾定帧 f352-387（1.2s）带微动效（钤印压下 + 水纹微漾），禁全静止。
import React from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {PAL, clamp, ss} from './ink';
import {W, H, ricePaper} from './RicePaper';
import {inkWash} from './InkWash';
import {buildSeal, stampSeal} from './SealStamp';
import {makeRevealSmooth, type RevealPart} from './RevealOrder';
import {cached} from './ink';
import {
  type Ctx, WIN, TABLE, drawStrokeTable, mountains, redSun, fogBands, bird,
  bamboo, shrimp, shrimpWashFn, waterRipples, inscription, washLayer,
} from './painting';
import {SUBS} from '../common/subs';

export const FPS = 30;
const TOTAL = 387;
/** 开场不从白纸开始：第 1 帧已落下前几笔（lt += 0.12） */
const LEAD_IN = 0.12;

// ---------------------------------------------------------------- reveal 部件表（秒）
const REV_WIN: RevealPart[] = WIN.map((s) => ({d: s.d, l: s.l}));
const REV_TABLE: RevealPart[] = TABLE.map((s) => ({d: s.d, l: s.l}));
const REV_BAMBOO_SEG: RevealPart[] = [0, 1, 2, 3].map((i) => ({d: 0.9 + i * 0.08, l: 0.16}));
const REV_BAMBOO_LEAF: RevealPart[] = [0, 1, 2, 3, 4].map((i) => ({d: 1.25 + i * 0.08, l: 0.18}));
const REV_SHRIMP_SEG: RevealPart[] = [0, 1, 2, 3, 4, 5].map((i) => ({d: 1.7 + i * 0.12, l: 0.2}));
const REV_INSC_MAIN: RevealPart[] = [{d: 8.3, l: 0.15}, {d: 8.46, l: 0.15}];
const REV_INSC_SUB: RevealPart[] = [0, 1, 2, 3].map((i) => ({d: 8.66 + i * 0.16, l: 0.14}));
const revWin = makeRevealSmooth(REV_WIN);
const revTable = makeRevealSmooth(REV_TABLE);
const revBambooSeg = makeRevealSmooth(REV_BAMBOO_SEG);
const revBambooLeaf = makeRevealSmooth(REV_BAMBOO_LEAF);
const revShrimpSeg = makeRevealSmooth(REV_SHRIMP_SEG);
const revInscMain = makeRevealSmooth(REV_INSC_MAIN);
const revInscSub = makeRevealSmooth(REV_INSC_SUB);

// ---------------------------------------------------------------- 虾的运动轨（缓游 + 微转）
function shrimpTrack(lt: number): {x: number; y: number; ang: number} {
  const x = 918 - 44 * Math.sin(lt * 0.55) - Math.max(0, lt - 3) * 6;
  const y = 398 + 28 * Math.sin(lt * 0.8 + 1);
  const ang = -0.08 + 0.09 * Math.sin(lt * 0.5);
  return {x, y, ang};
}
const inHero = (f: number): number => ss(232, 250, f) * (1 - ss(286, 300, f));

// ---------------------------------------------------------------- 静态笔触缓存（窗+案写完即缓存）
function staticLayer(c: Ctx, lt: number): void {
  const rv1 = Math.max(...revTable(lt));
  const done = lt > 1.32 && rv1 >= 1;
  if (done) {
    c.drawImage(cached('inktea_static', W, H, (g) => {
      drawStrokeTable(g, WIN, WIN.map(() => 1));
      drawStrokeTable(g, TABLE, TABLE.map(() => 1));
    }), 0, 0);
    return;
  }
  drawStrokeTable(c, WIN, revWin(lt));
  drawStrokeTable(c, TABLE, revTable(lt));
}

// ---------------------------------------------------------------- 字幕（墨色衬宋，淡入淡出）
function drawSubs(c: Ctx, f: number): void {
  const sub = SUBS.find((s) => f >= s.from && f <= s.to);
  if (!sub) return;
  const a = ss(sub.from, sub.from + 6, f) * (1 - ss(sub.to - 6, sub.to, f));
  if (a <= 0) return;
  c.save();
  c.font = '500 26px "Noto Serif SC"';
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.fillStyle = `rgba(32,28,24,${(0.9 * a).toFixed(3)})`;
  const gap = 2.5;
  let tw = 0;
  for (const ch of sub.text) tw += c.measureText(ch).width + gap;
  let x = W / 2 - tw / 2;
  for (const ch of sub.text) {
    c.fillText(ch, x, 668);
    x += c.measureText(ch).width + gap;
  }
  c.restore();
}

// ---------------------------------------------------------------- 主绘制
export function drawFrame(c: Ctx, fRaw: number): void {
  const f = clamp(Math.round(fRaw), 1, TOTAL);
  const lt = f / FPS + LEAD_IN;
  const t = f / FPS;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.filter = 'none';
  c.clearRect(0, 0, W, H);
  // ① 宣纸底
  const paper = ricePaper();
  c.drawImage(paper, 0, 0);
  // ② 晕染：淡墨远山 + 朱日（grow 全片缓慢外扩，墨在纸上继续洇）
  const grow = ss(0, 1.15, lt);
  const SCR = cached('inktea_scratch', W, H, () => undefined);
  washLayer(c, SCR, ss(0, 0.3, lt) * (0.6 + 0.4 * grow), mountains, {blur: 3, halo: 14, haloA: 0.3});
  redSun(c, grow, ss(0.1, 0.3, lt));
  // ③ 雾带（远山时隐时现）+ 窗前小鸟
  fogBands(c, lt, ss(0.15, 0.4, lt));
  bird(c, lt);
  // ④ 静态笔触：窗→案（钩子：首笔在 lt0.15 已落纸）
  staticLayer(c, lt);
  // ⑤ 竹（随风摆）
  bamboo(c, t, revBambooSeg(lt), revBambooLeaf(lt));
  // ⑥ 虾：晕底 multiply -> 墨部件依次落笔；hero 段墨晕呼吸 + 须行波增幅
  const tr = shrimpTrack(lt);
  const hero = inHero(f);
  const washGrow = ss(1.5, 2.3, lt) * (0.62 + 0.14 * Math.sin(t * 2.1) + 0.24 * hero);
  washLayer(c, SCR, washGrow, shrimpWashFn(tr.x, tr.y, 1.95), {blur: 8, halo: 26, haloA: 0.13, alpha: 0.42});
  const seg = revShrimpSeg(lt);
  shrimp(c, tr.x, tr.y, tr.ang, 1.95, t, 0, {
    wash: washGrow,
    seg,
    tail: ss(2.45, 2.7, lt),
    head: ss(2.5, 2.7, lt),
    eye: ss(2.65, 2.77, lt),
    whisk: ss(2.7, 3.0, lt),
    claw: ss(2.8, 3.05, lt),
    leg: ss(2.9, 3.1, lt),
  }, 1 + 0.5 * hero);
  // ⑦ 水纹（留白处的水：常态两道 + 涟漪环；hero 与定帧段 boost）
  const freeze = ss(348, 352, f);
  waterRipples(c, f, tr.x, tr.y, 0.8 + 0.5 * hero + 0.35 * freeze);
  // ⑧ 题跋（竖排「墨虾 / 丙午秋日」，逐字写出）
  inscription(c, revInscMain(lt), revInscSub(lt));
  // ⑨ 钤印（结尾定帧起手：1.5→1 压下 3 帧，multiply 落纸）
  const sealQ = ss(353, 356, f);
  if (sealQ > 0) {
    const seal = buildSeal(['写', '意'], 7, 88, 27);
    stampSeal(c, seal, 150, 452, sealQ);
  }
  // ⑩ 字幕
  drawSubs(c, f);
  // ⑪ 末帧微收：纸色再沉一点（合法收尾，非黑场）
  if (f > TOTAL - 5) {
    c.save();
    c.globalAlpha = ((f - (TOTAL - 5)) / 5) * 0.1;
    c.fillStyle = 'rgba(120,90,50,1)';
    c.fillRect(0, 0, W, H);
    c.restore();
  }
}

// ---------------------------------------------------------------- Remotion 组件
let fontHandle: number | null = null;
export const InkTeaFilm: React.FC = () => {
  const frame = useCurrentFrame() + 1;
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = React.useState(fontHandle !== null);
  React.useEffect(() => {
    if (fontHandle !== null) return;
    fontHandle = delayRender('ink-tea-fonts');
    const face = new FontFace('Noto Serif SC', `url(${staticFile('fonts/NotoSerifSC[wght].ttf')})`, {weight: '100 900'} as FontFaceDescriptors);
    face.load().then((ff) => {
      (document.fonts as unknown as {add: (f: FontFace) => void}).add(ff);
      continueRender(fontHandle as number);
      setReady(true);
    }).catch(() => {
      continueRender(fontHandle as number);
      setReady(true);
    });
  }, []);
  React.useEffect(() => {
    if (!ready || !ref.current) return;
    drawFrame(ref.current.getContext('2d') as Ctx, frame);
  }, [frame, ready]);
  return (
    <AbsoluteFill style={{background: PAL.paper}}>
      <canvas ref={ref} width={W} height={H} style={{width: W, height: H, display: 'block'}} />
    </AbsoluteFill>
  );
};
