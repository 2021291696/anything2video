import React from 'react';
import {useCurrentFrame} from 'remotion';
import {GlitchIn, kf, emphasisPulse, easeInOutPow, SENTENCES, TOTAL_FRAMES, CHAPTER_STARTS, FONT_HEAVY, FONT_WIDE, FONT_ORB, FONT_MONO, clamp01, SQUEEZE, fitSize, EM_WIDE, SAFE} from '../common';
import {CText, TechText, Pill, TopCapsule, ArrowH, PURPLE, GREY, GREY_MID, WHITE, GLOW_PURPLE_S, fadeIn, slideUp, arcAccent} from '../ui';
import {getActiveRecipe} from '../recipes';
import {VIDEO} from '../config';
const clampFrames = (n: number, len: number) => clamp01(n / len);
const PAL = getActiveRecipe().palette; // 章节卡内联光效基色（fx.tsx 同款 PAL 模式，方案 §U14）

// ---------- 时间轴查询 ----------
export const S = (id: string) => {
  const s = SENTENCES.find((x) => x.id === id);
  if (!s) throw new Error(`config 引用了不存在的句 id ${id}（请对照 script/timeline.md）`);
  return s;
};

/** 12 帧加速上出：n<0 → 原位；位移 (n/L)^2·440px，透明度 1−(n/L)^1.6 → 末帧 0（QC v1 C1 #1/#2）。
 *  L = 离场长度（val-blueprint 验证片回灌：章节卡短窗硬编码 11f > 卡窗长 → 全窗半透明，v2 起章节卡按窗长传 L；
 *  Title 不传 L=11，与现行逐值相同） */
const exitOut = (n: number, L = 11) => {
  if (n < 0) return {dy: 0, op: 1};
  const t = Math.min(1, n / L);
  return {dy: t * t * 440, op: 1 - Math.pow(t, 1.6)};
};

// ---------- 片头 ----------
// 占位 timeline（SENTENCES 为空，未跑配音）兜底为 [1,1]：只保证整包可加载，正式 timeline 下取值不变。
export const TITLE_RANGE: [number, number] = SENTENCES.length ? [1, Math.max(1, SENTENCES[0].from - 9)] : [1, 1];
export const Title: React.FC = () => {
  const N = useCurrentFrame() + TITLE_RANGE[0];
  const [a, b] = TITLE_RANGE;
  const exitN = N - (b - 11); // 末 12 帧上摇出画（QC v1：原 8 帧只走了 59px/63% 亮度就被硬切）
  const dy = -exitOut(exitN).dy;
  const op = exitOut(exitN).op;
  const glow = 0.5 + 0.5 * Math.sin((N / 30) * Math.PI); // 缓慢呼吸
  return (
    <div style={{position: 'absolute', inset: 0, transform: `translateY(${dy}px)`, opacity: op}}>
      <GlitchIn N={N} f0={a + 11} rgbSplit={6} slices={14} seed={3}>
        <div style={{position: 'absolute', left: 0, top: 268, width: 1280, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 26}}>
          <span style={{fontFamily: FONT_WIDE, fontSize: fitSize(VIDEO.title.big, VIDEO.title.rest ? 620 : 1120, 118, 64, EM_WIDE, 6), color: WHITE, lineHeight: 1, letterSpacing: 6, textShadow: `0 0 ${18 + 14 * glow}px rgba(102,45,248,${0.55 + 0.3 * glow}), 6px 6px 0 ${PURPLE}`}}>{VIDEO.title.big}</span>
          {VIDEO.title.rest ? (
            <span style={{fontFamily: FONT_HEAVY, fontWeight: 900, fontSize: fitSize(VIDEO.title.rest, 520, 96, 60, 1, 2), color: WHITE, lineHeight: 1, transform: `scaleX(${SQUEEZE})`, transformOrigin: '0 100%', letterSpacing: 2, WebkitTextStroke: '1px #000', paintOrder: 'stroke fill'}}>{VIDEO.title.rest}</span>
          ) : null}
        </div>
      </GlitchIn>
      <div style={{position: 'absolute', inset: 0, opacity: fadeIn(N - (a + 25), 12), transform: `translateY(${slideUp(N - (a + 25), 60)}px)`}}>
        <TechText cx={640} cy={446} text={VIDEO.title.en} fontSize={38} scaleX={0.82} weight={700} />
      </div>
      <div style={{position: 'absolute', inset: 0, opacity: fadeIn(N - (a + 40), 12)}}>
        <CText cx={640} cy={520} size={30} weight={500} color={GREY} letterSpacing={6}>
          {VIDEO.title.tagline}
        </CText>
        <div style={{position: 'absolute', left: 520, top: 496, width: 240, height: 2, background: 'rgba(255,255,255,0.35)', transform: `scaleX(${fadeIn(N - (a + 40), 16)})`}} />
      </div>
    </div>
  );
};

// ---------- 章节卡 ----------
/** 章节卡（第 2 章起）：占据上一章末句结束+3 → 本章首句 from−9（即 tts_build 的章前空白） */
const lastSentenceBefore = (frame: number) => [...SENTENCES].reverse().find((x) => x.to < frame)!;
export const CHAPTER_CARDS: Array<{n: number; title: string; tech: string; from: number; to: number}> = (SENTENCES.length ? CHAPTER_STARTS.slice(1) : []).map((c, i) => {
  const first = SENTENCES.find((x) => x.chapter === c.n)!;
  const prev = lastSentenceBefore(first.from);
  return {n: c.n, title: c.title, tech: VIDEO.chapterTech[i + 1] ?? '', from: prev.to + 3, to: first.from - 9};
}).filter((c) => c.to >= c.from); // 章前空白 <12 帧时放不下章节卡：跳过该卡（渲 0/负 duration 会被 Remotion 拒掉卡死整条渲染）
export const ChapterCard: React.FC<{card: (typeof CHAPTER_CARDS)[number]}> = ({card}) => {
  const N = useCurrentFrame() + card.from;
  const n = N - card.from;
  // 章节卡短窗自适应（QC v1 中项修法，val-blueprint 验证片实战验证后回灌）：tts_build 压缩时序时章前空白可能仅 ≈10f，
  // 原 11f 出场前导 > 卡窗长 → 全窗半透明（实测峰值 0.35–0.5）+ 标题 GlitchIn blink、tech 永不可见
  // （原片标题实质可读帧数≈1–3 帧的量化低项）。适配不改时间轴：
  //   CW=卡窗长（to−from+1）；离场前导 LEAD=clamp(CW−6, 3..11)——CW≥9 时保 CW−LEAD≥6 帧净可读（op=1）、
  //   出场段 [to−LEAD, to] 共 LEAD+1 帧单调衰减至末帧 op=0（末帧归零；下限 3 仅为 CW<9 极短窗防出场曲线退化）；
  //   CW≥17 ⇒ LEAD=11=现行值 ⇒ exitN/分隔线/序号/标题/tech 全部逐值等于改前模板（普通卡逐帧像素不变的验收口径）；
  //   CW<16（短窗）走降级：标题 GlitchIn 换 fadeIn(n−1,4)（双实现并存，防 blink）、序号 3f 入场、分隔线 6f、tech n−3 起 4f。
  const CW = card.to - card.from + 1;
  const shortWin = CW < 16;
  const LEAD = Math.min(11, Math.max(3, CW - 6));
  const exitN = N - (card.to - LEAD);
  const dy = -exitOut(exitN, LEAD).dy;
  const op = exitOut(exitN, LEAD).op;
  const w = kf(n, [[0, 0], [shortWin ? 6 : 20, 300]], easeInOutPow(2.5));
  const titleEl = <CText cx={640} cy={372} size={fitSize(card.title, 1100, 80, 46, 1, 3)} weight={900} scaleX={SQUEEZE} letterSpacing={3} style={{WebkitTextStroke: '1px #000', paintOrder: 'stroke fill'}}>{card.title}</CText>;
  return (
    <div style={{position: 'absolute', inset: 0, transform: `translateY(${dy}px)`, opacity: op}}>
      <div style={{position: 'absolute', opacity: fadeIn(n, shortWin ? 3 : 8)}}>
        {/* 方案 §U14：章序号承接色彩弧线——色源 arcAccent(N) 与 PAL.accentGlowRgb 派生（复用 fx.tsx 的 PAL 模式，修掉未走配方的字面量 rgb）；
            explainer 无 colorArc 时 arcAccent 恒为 PAL.accent，阴影基色即 accentGlowRgb，色值与原字面量一致（accentTech 与 accent 差 4 个蓝通道，属方案声明的唯一碰现值处） */}
        <CText cx={640} cy={268} size={54} weight={700} family={FONT_ORB} color={arcAccent(N)} letterSpacing={4} shadow={`0 0 14px rgba(${PAL.accentGlowRgb},.6)`}>{`0${card.n}`}</CText>
      </div>
      {shortWin ? (
        <div style={{position: 'absolute', inset: 0, opacity: fadeIn(n - 1, 4)}}>{titleEl}</div>
      ) : (
        <GlitchIn N={N} f0={card.from + 3} rgbSplit={5} seed={card.n}>{titleEl}</GlitchIn>
      )}
      {/* 方案 §U14：分隔线由恒白改为 arcAccent(N)（opacity 0.85 不变），章节切换成为色彩弧线的显式节点 */}
      <div style={{position: 'absolute', left: 640 - w / 2, top: 428, width: w, height: 3, background: arcAccent(N), opacity: 0.85}} />
      {card.tech ? (
        <div style={{position: 'absolute', opacity: fadeIn(n - (shortWin ? 3 : 10), shortWin ? 4 : 10)}}>
          <TechText cx={640} cy={470} text={card.tech} fontSize={32} scaleX={0.82} />
        </div>
      ) : null}
    </div>
  );
};

// ---------- 顶部 HUD 胶囊 ----------
export type HudEntry = {from: number; to: number; text: string; tech?: string; w?: number};
/** HUD 条目由 config.hud 的句 id 解析；章首条目从章节卡结束的下一帧开始（fromOffset 默认：本章第一条 −8，其余 0）。 */
export const HUD: HudEntry[] = SENTENCES.length ? VIDEO.hud.map((h) => {
  const a = S(h.fromS), b = S(h.toS);
  const isChapterFirst = SENTENCES.find((x) => x.chapter === a.chapter)!.id === a.id && a.chapter > 1;
  const from = a.from + (h.fromOffset ?? (isChapterFirst ? -8 : 0));
  const isChapterLast = [...SENTENCES].reverse().find((x) => x.chapter === b.chapter)!.id === b.id;
  const to = b.to + (h.toOffset ?? (isChapterLast ? 2 : 0));
  return {from, to, text: h.text, tech: h.tech, w: h.w};
}) : [];
// 同章相邻条目之间不留空档（G1 提示 742–751 无胶囊）：上一条延到下一条 from−1；跨章节卡（间隔 ≥30 帧）保持空档，由章节卡接管
for (let i = 0; i < HUD.length - 1; i++) if (HUD[i + 1].from - HUD[i].to < 30) HUD[i].to = HUD[i + 1].from - 1;
export const HUD_RANGE: [number, number] = [HUD[0]?.from ?? 1, HUD[HUD.length - 1]?.to ?? 0]; // 空 HUD → [1,0]，overlay/index 按 HUD_RANGE[1]>[0] 判空不挂载
export const Hud: React.FC = () => {
  const N = useCurrentFrame() + HUD_RANGE[0];
  const e = HUD.find((h) => N >= h.from && N <= h.to);
  if (!e) return null;
  // QC v1 C3：进章节卡前 HUD 一帧消失 → 末 8 帧淡出（只对跨章节卡的条目生效：下一条 from 与本条 to 间隔 ≥30）
  const idx = HUD.indexOf(e);
  const nextGap = idx < HUD.length - 1 ? HUD[idx + 1].from - e.to : 999;
  const fadeTail = nextGap >= 30 ? 1 - clampFrames(N - (e.to - 8), 8) : 1;
  const w = e.w ?? Math.max(216, Math.round(e.text.replace(/[^一-龥]/g, '').length * 34 + e.text.replace(/[一-龥\s]/g, '').length * 20 + (e.text.match(/\s/g)?.length ?? 0) * 10 + 60));
  // 第 2、3 章胶囊下方紧接流程轨，副标只在无流程轨时显示
  return <TopCapsule N={N} f0={e.from} text={e.text} w={w} tech={e.tech} opacity={fadeTail} />;
};

// ---------- 流程轨（第 2、3 章）----------
export type RailSpec = {steps: string[]; switches: number[]; from: number; to: number};
export const RAILS: RailSpec[] = SENTENCES.length ? VIDEO.rails.map((r) => ({steps: r.steps, switches: r.switchS.map((id) => S(id).from), from: S(r.fromS).from - 8, to: S(r.toS).to + 2})) : [];
const RAIL_STEP = 200; // 步距 = RAIL_W(150) + 箭头槽 50，历史 5 步布局实测值
/**
 * 各步中心 x（方案 §U13）：由 SAFE.content 推导——n×RAIL_STEP 的轨道带在内容区（x60–1220）内水平居中，逐取步内中点。
 * 5 步时逐值等于历史硬编码 [240,440,640,840,1040]（内缩 (1160−1000)/2=80，60+80+200·(i+0.5)）。
 * 注：方案原文的 60+1160/5×[0.5,1.5,…] 实算为 176/408/640/872/1104，与现值不等，故按「逐值相同」铁律采用本居中等分式。
 * 非 5 步流程轨需按 steps.length 重算（本函数已参数化 n：带宽随 n 增减、整体居中，步距恒 200）。
 */
const railCx = (n: number) => Array.from({length: n}, (_, i) => SAFE.content.x + (SAFE.content.w - n * RAIL_STEP) / 2 + RAIL_STEP * (i + 0.5));
const RAIL_W = 150, RAIL_H = 44, RAIL_Y = 118;
export const Rail: React.FC<{spec: RailSpec}> = ({spec}) => {
  const N = useCurrentFrame() + spec.from;
  const CX = railCx(spec.steps.length); // 方案 §U13：中心 x 按 steps.length 重算（5 步时与历史 RAIL_CX 逐值相同）
  let active = -1;
  spec.switches.forEach((f, i) => { if (N >= f) active = i; });
  const railOut = 1 - clampFrames(N - (spec.to - 8), 8); // 末 8 帧淡出
  return (
    <div style={{position: 'absolute', inset: 0, opacity: railOut}}>
      {spec.steps.map((t, i) => {
        const state = i === active ? 'active' : i < active ? 'done' : 'todo';
        const pulse = i === active ? emphasisPulse(N - spec.switches[i], {peak: 1.1, up: 10, hold: 3, down: 10}) : 1;
        const fill = state === 'active' ? PURPLE : state === 'done' ? '#2A2A2A' : '#000';
        const stroke = state === 'active' ? WHITE : state === 'done' ? GREY_MID : GREY;
        const color = state === 'todo' ? GREY : WHITE;
        return (
          <React.Fragment key={t}>
            <div style={{position: 'absolute', left: CX[i] - RAIL_W / 2, top: RAIL_Y + slideUp(N - (spec.from + i * 2), 40, 16), width: RAIL_W, height: RAIL_H, transform: `scale(${pulse})`, opacity: fadeIn(N - (spec.from + i * 2), 8)}}>
              <Pill x={0} y={0} w={RAIL_W} h={RAIL_H} fill={fill} stroke={stroke} sw={2} text={t} fontSize={24} weight={700} color={color} letterSpacing={1} textDy={-1.5} glow={state === 'active' ? GLOW_PURPLE_S : undefined} />
            </div>
            {i < spec.steps.length - 1 ? (
              <ArrowH x={CX[i] + RAIL_W / 2 + 6} y={RAIL_Y + RAIL_H / 2 - 9} w={38} h={18} p={clampFrames(N - (spec.from + 4 + i * 2), 10)} color={i < active ? WHITE : GREY} shaft={2} />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ---------- 片尾 ----------
// 压黑层挂在内容之上（Main 里 SHOTS_OVERLAY_TOP 排在所有内容组之后、进度条之下），从末句结束前 endingFade 帧起压黑，末镜头内容在被完全盖住后才结束；
// 最后 30 帧再用 aboveBar 层把进度条也压黑 → 末段纯黑。
const LAST = SENTENCES[SENTENCES.length - 1]; // 占位 timeline 兜底：无句 → 退化区间，末尾不压黑
export const ENDING_RANGE: [number, number] = LAST ? [LAST.to - VIDEO.endingFade, TOTAL_FRAMES] : [TOTAL_FRAMES, TOTAL_FRAMES];
export const Ending: React.FC = () => {
  const N = useCurrentFrame() + ENDING_RANGE[0];
  const n = N - ENDING_RANGE[0];
  const op = fadeIn(n, VIDEO.endingFade);
  return <div style={{position: 'absolute', inset: 0, background: '#000', opacity: op}} />;
};
export const ENDING_TOP_RANGE: [number, number] = [TOTAL_FRAMES - 30, TOTAL_FRAMES];
export const EndingTop: React.FC = () => {
  const N = useCurrentFrame() + ENDING_TOP_RANGE[0];
  const op = fadeIn(N - ENDING_TOP_RANGE[0], 20);
  return <div style={{position: 'absolute', inset: 0, background: '#000', opacity: op}} />;
};

// ---------- 片尾收束卡（可选，val-pixel 验证片 QC v1 C4 黑尾预案实战验证后回灌） ----------
// 压黑（OV-Ending）渐浓的同一时间线上叠「片名 title.big/rest + 结论句 config.conclusionLine」，消除片尾
// 「纯黑仅进度条」的收束尾段（val-pixel 实测：≈105 帧黑尾消除、内容区亮度均值 2–4 → 14–16）。零重锚：不动
// endingFade/TITLE_RANGE/时间轴；仅当 config.conclusionLine 存在时由 overlay/index.ts 挂载（缺省完全不渲染）。
// val-pixel 实测三条硬约束（动区间/层序前必读）：
//   ① EndingTop（aboveBar 压黑）必须压在进度条之上（Main z 序：进度条 < aboveBar 镜头），否则末 30 帧进度条浮在纯黑上；
//      本卡同为 aboveBar 且数组序排在 OV-EndingTop 之后（overlay/index.ts 数组序即层序）→ 进度条压黑后卡仍在其上持续到片尾末帧；
//   ② 收束卡区间必须与 OV-Ending 同用 ENDING_RANGE，完整覆盖设计黑场（endingFade 起点至片尾），不留缝；
//   ③ 贯穿元素（throughline）若有末落点窗，需自补 ≈0.2s（6 帧@30fps）淡出（keyframes 末段 a 归零），避免与卡的淡入残影同屏。
// 入场 fadeIn 30 帧与压黑同步（白名单外一律 fadeIn，无 glitch）；此后恒显（含 glow 呼吸微动）。
// variant（设计终审发现 9）：'poster'（缺省 = 现状逐值）海报收束卡；'terminal' 终端收束卡——
// AsciiBox ┌─┐ 字符框（周长 draw-on）+ 片名白辉光居框内 + LogLine status=OK 结论行 + 磷光 textShadow。
// 参考工程 val-crt/src（crt.tsx 的 AsciiBox/LogLine/phosphorGlow）移植为配方派生版：
// 所有颜色一律走当前配方 PAL（accentGlowRgb/accent/grey/greyMid），禁引入正片 token 外颜色（crt 工程
// 的 #33ff66/#1a8f3c 等风格 token 留在 styles/crt-terminal 正本工程，不进模板）。
/** 磷光辉光 textShadow（val-crt phosphorGlow 的配方派生版）：基色 = PAL.accentGlowRgb，g 0..1.2 调制。 */
const termGlow = (g = 1): string => [
  `0 0 ${(5 + 5 * g).toFixed(1)}px rgba(${PAL.accentGlowRgb},${(0.5 * g).toFixed(3)})`,
  `0 0 ${(16 + 12 * g).toFixed(1)}px rgba(${PAL.accentGlowRgb},${(0.3 * g).toFixed(3)})`,
  `0 0 ${(40 + 24 * g).toFixed(1)}px rgba(${PAL.accentGlowRgb},${(0.16 * g).toFixed(3)})`,
].join(',');
/** 终端字符框（val-crt AsciiBox 正本算法）：cols×rows 字符格，progress 0..1 周长顺时针逐格点亮
 *  （左上 → 顶边 → 右边向下 → 底边向左 → 左边向上），children 绝对居中叠在框内。 */
const TermBox: React.FC<{cols: number; rows: number; progress: number; size?: number; children?: React.ReactNode}> = ({cols, rows, progress, size = 24, children}) => {
  const seq: Array<[number, number]> = [];
  for (let x = 0; x < cols; x++) seq.push([x, 0]);
  for (let y = 1; y < rows - 1; y++) seq.push([cols - 1, y]);
  for (let x = cols - 1; x >= 0; x--) seq.push([x, rows - 1]);
  for (let y = rows - 2; y >= 1; y--) seq.push([0, y]);
  const shown = Math.round(clamp01(progress) * seq.length);
  const lit = new Set<string>();
  for (let i = 0; i < shown; i++) lit.add(`${seq[i][0]},${seq[i][1]}`);
  const glyph = (x: number, y: number): string => {
    if (!lit.has(`${x},${y}`)) return ' ';
    if (x === 0 && y === 0) return '┌';
    if (x === cols - 1 && y === 0) return '┐';
    if (x === 0 && y === rows - 1) return '└';
    if (x === cols - 1 && y === rows - 1) return '┘';
    return y === 0 || y === rows - 1 ? '─' : '│';
  };
  const lines: string[] = [];
  for (let y = 0; y < rows; y++) {
    let s = '';
    for (let x = 0; x < cols; x++) s += glyph(x, y);
    lines.push(s);
  }
  return (
    <div style={{position: 'relative', display: 'inline-block'}}>
      <pre style={{margin: 0, fontFamily: FONT_MONO, fontSize: size, lineHeight: 1.18, color: PAL.greyMid, textShadow: `0 0 6px rgba(${PAL.accentGlowRgb},.28)`, whiteSpace: 'pre'}}>{lines.join('\n')}</pre>
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{children}</div>
    </div>
  );
};
/** 终端日志行（val-crt LogLine status='ok' 配方派生版）：[ OK ] 主色磷光标记 + 灰正文，f0 起 3 帧快速浮现。 */
const TermLine: React.FC<{text: string; f0: number; N: number; size?: number}> = ({text, f0, N, size = 24}) => {
  const n = N - f0;
  if (n < 0) return null;
  const t = clamp01(n / 3);
  const k = 1 - Math.pow(1 - t, 3);
  return (
    <div style={{fontSize: size, display: 'flex', gap: 14, whiteSpace: 'pre', fontFamily: FONT_MONO}}>
      <span style={{color: PAL.accent, textShadow: termGlow(0.7), opacity: k}}>[ OK ]</span>
      <span style={{color: PAL.grey, opacity: k}}>{text}</span>
    </div>
  );
};
export const EndingCard: React.FC<{variant?: 'poster' | 'terminal'}> = ({variant = 'poster'}) => {
  const N = useCurrentFrame() + ENDING_RANGE[0];
  const n = N - ENDING_RANGE[0];
  const glow = 0.5 + 0.5 * Math.sin((N / 30) * Math.PI); // 与片头 Title 同款缓慢呼吸
  const op = fadeIn(n, 30);
  if (variant === 'terminal') {
    return (
      <div style={{position: 'absolute', inset: 0, opacity: op}}>
        <div style={{position: 'absolute', left: 0, top: 168, width: 1280, display: 'flex', justifyContent: 'center'}}>
          <TermBox cols={64} rows={12} progress={clamp01(n / 24)} size={24}>
            <div style={{display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 26}}>
              <span style={{fontFamily: FONT_WIDE, fontSize: fitSize(VIDEO.title.big, VIDEO.title.rest ? 520 : 980, 96, 56, EM_WIDE, 6), color: WHITE, lineHeight: 1, letterSpacing: 6, textShadow: `0 0 ${18 + 14 * glow}px rgba(${PAL.accentGlowRgb},${0.55 + 0.3 * glow})`}}>{VIDEO.title.big}</span>
              {VIDEO.title.rest ? (
                <span style={{fontFamily: FONT_HEAVY, fontWeight: 900, fontSize: fitSize(VIDEO.title.rest, 460, 80, 52, 1, 2), color: WHITE, lineHeight: 1, transform: `scaleX(${SQUEEZE})`, transformOrigin: '0 100%', letterSpacing: 2, WebkitTextStroke: '1px #000', paintOrder: 'stroke fill'}}>{VIDEO.title.rest}</span>
              ) : null}
            </div>
          </TermBox>
        </div>
        <div style={{position: 'absolute', left: 0, top: 586, width: 1280, display: 'flex', justifyContent: 'center', opacity: fadeIn(n - 10, 14)}}>
          <TermLine text={VIDEO.conclusionLine ?? ''} f0={ENDING_RANGE[0] + 13} N={N} />
        </div>
      </div>
    );
  }
  return (
    <div style={{position: 'absolute', inset: 0, opacity: op}}>
      <div style={{position: 'absolute', left: 0, top: 268, width: 1280, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 26}}>
        <span style={{fontFamily: FONT_WIDE, fontSize: fitSize(VIDEO.title.big, VIDEO.title.rest ? 620 : 1120, 118, 64, EM_WIDE, 6), color: WHITE, lineHeight: 1, letterSpacing: 6, textShadow: `0 0 ${18 + 14 * glow}px rgba(102,45,248,${0.55 + 0.3 * glow}), 6px 6px 0 ${PURPLE}`}}>{VIDEO.title.big}</span>
        {VIDEO.title.rest ? (
          <span style={{fontFamily: FONT_HEAVY, fontWeight: 900, fontSize: fitSize(VIDEO.title.rest, 520, 96, 60, 1, 2), color: WHITE, lineHeight: 1, transform: `scaleX(${SQUEEZE})`, transformOrigin: '0 100%', letterSpacing: 2, WebkitTextStroke: '1px #000', paintOrder: 'stroke fill'}}>{VIDEO.title.rest}</span>
        ) : null}
      </div>
      <div style={{position: 'absolute', left: 520, top: 420, width: 240, height: 2, background: arcAccent(N), opacity: 0.85 * fadeIn(n - 6, 12)}} />
      <div style={{position: 'absolute', opacity: fadeIn(n - 10, 14)}}>
        <CText cx={640} cy={470} size={34} weight={700} color={WHITE} letterSpacing={8} shadow={`0 0 18px rgba(${PAL.accentGlowRgb},.45)`}>
          {VIDEO.conclusionLine}
        </CText>
      </div>
    </div>
  );
};
