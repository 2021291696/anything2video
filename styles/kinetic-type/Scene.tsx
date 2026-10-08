import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {Fonts} from '../common';
import {
  KT,
  easeInOutCubic,
  layoutLine,
  slamScale, shakeAt, popScale, pulseScale, softDropY, crouchLift, slamFallY, landSquash,
  breatheScale, glowAlpha,
  KtBg, KtWord, SlotBox, FlashRing, ImpactLines, StressMark, BaseRule, EmphUnderline, SoftGlow, StillFrame,
  type WordBox,
} from './kit';

// 《一句话的重量》—— kinetic-type 信息排版动态字体正片（战役 v4 批次⑤ E3-2）。
// 把一句科普结论拆成词的编排：主词砸入、修饰词从槽升起、标点成为节拍。
// 纪律：字是演员（文字即运动主体）/ 主词踩重音砸进来 / 其余词从槽位升起 / 字落定后不动（一屏一焦点）/
// 词性分级（主词/名词词组/连接词/标点四档）/ 节奏跟旁白重音（钉帧全部取 tts_build 实测字级帧）。
// 幕底节拍硬切四拍：f1 纯黑 → f111 宝蓝 → f193 奶油白 → f285 纯黑（zheke 每词一拍的硬切语法）。
// 逐帧确定性：全部运动 = 纯帧号解析函数（kit.tsx），禁 Math.random/Date/网络。

export const FPS = 30;
export const TOTAL = 393;

// ---- 钉帧表（tts_build 实测：重 f44/量 f47｜重音 f136｜砸 f169｜升 f250 起 f262｜不再动 f327/341）----
const B = {
  hookSlam: 3, // 钩子：主词砸入（0.1s < 0.5s）
  travel: 31, travelEnd: 42, // 重量 从钩子位 travel 到标题槽（旁白「一句话的重量」起 f31）
  yiRise: 35, deRise: 41, // 一句话 / 的 从槽升起
  emph1: 47, // 重量 第一次 emphasis（旁白重音字「量」实测帧 f47）
  comma: 62, // 逗号节拍弹入
  slotsFrom: 66, // 第二行 5 个槽位框 staggered 画出
  s2: 111, // 幕底硬切宝蓝 + 「重点词」砸入（旁白「重点词」首字实测帧 f111）
  demoRise: 128, // 演示「重量」升入（旁白「踩」起 f128）
  markSlam: 136, // 重音符号▼砸落（旁白「重音」实测帧 f136）
  lift: 155, // 蓄力上提（「狠狠」f155-168）
  slam: 169, // 砸：主词砸落 + 幕底硬切橙红（旁白重音字「砸」实测帧 f169，全片最重一拍）
  lock: 176, // 落定锁定（旁白「进」f176）
  s3: 193, // 幕底硬切奶油白（HERO 段）
  rises: [216, 228, 242, 250], // 其余的词从槽升起：藏在/每个词/的/位置里（「位置里」钉「升」f250）
  baseFlash: 262, // 全句编排完成：两行基线细线闪现（旁白「起」实测帧 f262）
  emph2: 266, // HERO emphasis 收束拍：主词脉冲 + 下划线砸出（BGM drop=8.9s=f267 对位）
  s4: 285, // 幕底硬切纯黑：完成态
  period: 286, // 句号软落（无回弹）
  still: 306, // 静止宣言：收束细框画出，此后仅剩微动效（旁白「全场」f306）
};

// ---- 词性分级版式（主词=橙红最大 / 名词词组=黑 900 / 连接词=细体半透 / 标点=节拍件）----
const L1_Y = 286;
const L2_Y = 474;
const LINE1 = layoutLine(
  [
    {t: '一句话', rank: 'noun', size: 92, gapAfter: 26},
    {t: '的', rank: 'conn', size: 50, gapAfter: 26},
    {t: '重量', rank: 'main', size: 168, gapAfter: 12},
    {t: '，', rank: 'punct', size: 54},
  ],
  L1_Y,
);
const LINE2 = layoutLine(
  [
    {t: '藏在', rank: 'conn', size: 54, gapAfter: 34},
    {t: '每个词', rank: 'noun', size: 92, gapAfter: 28},
    {t: '的', rank: 'conn', size: 38, gapAfter: 26},
    {t: '位置里', rank: 'noun', size: 92, gapAfter: 24},
    {t: '。', rank: 'punct', size: 54},
  ],
  L2_Y,
);
const box = (line: WordBox[], t: string): WordBox => line.find((w) => w.t === t)!;
const ZL = box(LINE1, '重量'); // 主词槽位
const PERIOD = box(LINE2, '。');
const ktW = (w: WordBox, size: number): number => w.w * (size / w.size);

// 词性配色（bg=ink 时正文用 paper，bg=paper 时正文用 ink；主词恒橙红；不引入第五色相）
const ink = (onInk: boolean): string => (onInk ? KT.paper : KT.ink);

// ---- 幕底硬切（f169 砸落帧：宝蓝→橙红 的幕内半段硬切，zheke STRETCH 帧语法）----
const bgAt = (N: number): string =>
  N < B.s2 ? KT.ink : N < B.slam ? KT.royal : N < B.s3 ? KT.vermilion : N < B.s4 ? KT.paper : KT.ink;
const onInkAt = (N: number): boolean => (N < B.s2 ? true : N < B.s3 ? false : N < B.s4 ? false : true);

// =====================================================================
// 幕 1：钩子 + 标题行成形（f1-110，纯黑）
// =====================================================================
const Phase1: React.FC<{N: number}> = ({N}) => {
  const fg = ink(true);
  const zl = box(LINE1, '重量');
  // 钩子砸入 → travel 到槽
  const inHook = N < B.travel;
  const travelE = easeInOutCubic((N - B.travel) / (B.travelEnd - B.travel));
  const hookX = 640, hookY = 330, hookSize = 260;
  const zx = inHook ? hookX : hookX + (zl.cx - hookX) * travelE;
  const zy = inHook ? hookY : hookY + (zl.y - hookY) * travelE;
  const zsize = inHook ? hookSize : hookSize + (zl.size - hookSize) * travelE;
  const slamU = N - B.hookSlam;
  const emph1U = N - B.emph1;
  const hookBox: WordBox = {...zl, cx: zx, x: zx - ktW(zl, zsize) / 2, y: zy, size: zsize, w: ktW(zl, zsize)};
  const shake = shakeAt(slamU, 5, 7);
  return (
    <>
      <KtWord
        box={hookBox}
        color={emph1U >= 0 ? KT.vermilion : fg}
        hidden={N < B.hookSlam}
        scale={(inHook ? slamScale(slamU) : 1) * pulseScale(emph1U)}
        ty={shake.dy}
        riseU={undefined}
      />
      {inHook && <FlashRing cx={hookX} cy={hookY} base={340} u={slamU} color={fg} width={6} />}
      {/* 修饰词/连接词从槽升起 */}
      <SlotBox box={box(LINE1, '一句话')} N={N} appear={B.yiRise - 2} land={B.yiRise + 13} color={fg} baseOpacity={0.4} />
      <KtWord box={box(LINE1, '一句话')} color={fg} riseU={N - B.yiRise} />
      <SlotBox box={box(LINE1, '的')} N={N} appear={B.deRise - 2} land={B.deRise + 11} color={fg} baseOpacity={0.4} />
      <KtWord box={box(LINE1, '的')} color={fg} opacity={0.5} riseU={N - B.deRise} riseDur={11} />
      {/* 逗号 = 节拍件 */}
      <KtWord box={box(LINE1, '，')} color={fg} opacity={0.85} riseU={undefined} scale={popScale(N - B.comma)} hidden={N < B.comma} />
      {/* 第二行 5 个空槽（版式对位自证，空槽留给幕 3） */}
      {LINE2.map((w, i) => (
        <SlotBox key={w.t} box={w} N={N} appear={B.slotsFrom + i * 5} color={fg} baseOpacity={w.t === '。' ? 0.3 : 0.45} />
      ))}
    </>
  );
};

// =====================================================================
// 幕 2：主词踩重音砸进来（f111-192，宝蓝→橙红硬切）
// =====================================================================
const DEMO_SIZE = 230;
const DEMO_Y = 380; // 预备位
const LAND_Y = 470; // 砸落着地位
const RULE_Y = 592;
const Phase2: React.FC<{N: number}> = ({N}) => {
  const slammed = N >= B.slam;
  const fg = slammed ? KT.ink : KT.paper; // 砸落帧幕底硬切橙红，字同时翻墨黑（zheke STRETCH 帧）
  const acc = shakeAt(N - B.slam, 9, 13);
  // 演示「重量」：升入（f128）→ 蓄力上提（f155-168，0→40px）→ 砸落（f169-171，340→470 重力加速）
  const riseU = N - B.demoRise;
  const liftY = crouchLift(N - B.lift, 40);
  const fallPx = LAND_Y - (DEMO_Y - 40);
  const wordY = slammed ? DEMO_Y - 40 + slamFallY(N - B.slam, fallPx, 3) : DEMO_Y - liftY;
  const sq = slammed ? landSquash(N - B.slam) : 0;
  const demoBox: WordBox = {t: '重量', rank: 'main', size: DEMO_SIZE, x: 640 - DEMO_SIZE, y: wordY, w: DEMO_SIZE * 2, h: DEMO_SIZE * 1.1, cx: 640};
  const lockU = N - B.lock;
  return (
    <div style={{position: 'absolute', inset: 0, transform: `translate(${acc.dx.toFixed(2)}px, ${acc.dy.toFixed(2)}px)`}}>
      {/* 「重点词」标签砸入左上 */}
      <KtWord
        box={{t: '重点词', rank: 'noun', size: 88, x: 118, y: 128, w: 264, h: 97, cx: 250}}
        color={KT.paper}
        hidden={N < B.s2}
        scale={slamScale(N - B.s2)}
        ty={shakeAt(N - B.s2, 4, 5).dy}
      />
      <BaseRule x={118} y={186} w={264} N={N} draw={B.s2 + 4} color={KT.paper} thickness={6} />
      {/* 重音符号 ▼（跟随词顶） */}
      <StressMark cx={640} topY={wordY - DEMO_SIZE / 2 - 40} u={N - B.markSlam} color={slammed ? KT.paper : KT.vermilion} />
      <FlashRing cx={640} cy={wordY - DEMO_SIZE / 2 - 20} base={150} u={N - B.markSlam} color={KT.paper} width={4} />
      {/* 演示主词 */}
      <KtWord
        box={demoBox}
        color={fg}
        hidden={riseU < 0}
        scale={pulseScale(lockU)}
        sx={1 + sq * 0.7}
        sy={1 - sq}
      />
      {/* 着地基线 + 冲击 */}
      <BaseRule x={640 - 280} y={RULE_Y} w={560} N={N} draw={B.lift + 5} color={slammed ? KT.ink : KT.paper} thickness={5} opacity={0.9} />
      <ImpactLines cx={640} cy={LAND_Y} u={N - B.slam} color={KT.paper} span={560} />
      <FlashRing cx={640} cy={LAND_Y} base={430} u={N - B.slam} color={KT.paper} width={7} />
    </div>
  );
};

// =====================================================================
// 幕 3：其余的词从槽升起 → 全句编排完成（f193-284，奶油白，HERO f236-295）
// =====================================================================
const Phase3: React.FC<{N: number}> = ({N}) => {
  const fg = ink(false);
  const zl = box(LINE1, '重量');
  const emph2U = N - B.emph2;
  const riseLand = (t: string): number | undefined => {
    const i = LINE2.findIndex((w) => w.t === t);
    return i >= 0 && i < B.rises.length ? B.rises[i] + 13 : undefined;
  };
  const l2Rise = (t: string): number | undefined => {
    const i = LINE2.findIndex((w) => w.t === t);
    return i >= 0 && i < B.rises.length ? N - B.rises[i] : undefined;
  };
  return (
    <>
      {/* 第一行：已落定（说完不再动的第一层语义——它们在幕 1 就说完了） */}
      <KtWord box={box(LINE1, '一句话')} color={fg} />
      <KtWord box={box(LINE1, '的')} color={fg} opacity={0.45} />
      <KtWord box={zl} color={KT.vermilion} scale={pulseScale(emph2U)} />
      <KtWord box={box(LINE1, '，')} color={fg} opacity={0.85} />
      {/* 第二行槽位（未落起的保持虚线框；落起后收回；句号槽留到幕 4 才落） */}
      <SlotBox box={box(LINE2, '藏在')} N={N} appear={B.s3} land={riseLand('藏在')} color={fg} baseOpacity={0.45} />
      <SlotBox box={box(LINE2, '每个词')} N={N} appear={B.s3} land={riseLand('每个词')} color={fg} baseOpacity={0.45} />
      <SlotBox box={box(LINE2, '的')} N={N} appear={B.s3} land={riseLand('的')} color={fg} baseOpacity={0.45} />
      <SlotBox box={box(LINE2, '位置里')} N={N} appear={B.s3} land={riseLand('位置里')} color={fg} baseOpacity={0.45} />
      <SlotBox box={PERIOD} N={N} appear={B.s3} color={fg} baseOpacity={0.3} />
      {/* 其余的词轻轻升起（无回弹） */}
      <KtWord box={box(LINE2, '藏在')} color={fg} opacity={0.45} riseU={l2Rise('藏在')} />
      <KtWord box={box(LINE2, '每个词')} color={fg} riseU={l2Rise('每个词')} />
      <KtWord box={box(LINE2, '的')} color={fg} opacity={0.45} riseU={l2Rise('的')} riseDur={11} />
      <KtWord box={box(LINE2, '位置里')} color={fg} riseU={l2Rise('位置里')} />
      {/* 全句编排完成：两行基线细线闪现后淡出 */}
      <BaseRule x={LINE1[0].x} y={L1_Y + 92} w={LINE1[3].x + LINE1[3].w - LINE1[0].x} N={N} draw={B.baseFlash} color={fg} thickness={2} fade={B.baseFlash + 12} opacity={0.55} />
      <BaseRule x={LINE2[0].x} y={L2_Y + 62} w={PERIOD.x + PERIOD.w - LINE2[0].x} N={N} draw={B.baseFlash + 3} color={fg} thickness={2} fade={B.baseFlash + 15} opacity={0.55} />
      {/* HERO emphasis 收束拍：主词下划线砸出（常驻到片尾） */}
      <EmphUnderline box={zl} y={L1_Y + 104} N={N} draw={B.emph2} color={KT.vermilion} />
    </>
  );
};

// =====================================================================
// 幕 4：说完不再动 + 定帧微动效（f285-393，纯黑）
// =====================================================================
const Phase4: React.FC<{N: number}> = ({N}) => {
  const fg = ink(true);
  const zl = box(LINE1, '重量');
  const periodU = N - B.period;
  const breath = breatheScale(N, B.still);
  return (
    <>
      <KtWord box={box(LINE1, '一句话')} color={fg} />
      <KtWord box={box(LINE1, '的')} color={fg} opacity={0.45} />
      <KtWord box={zl} color={KT.vermilion} scale={breath} />
      <EmphUnderline box={zl} y={L1_Y + 104} N={N} draw={B.emph2} color={KT.vermilion} />
      <KtWord box={box(LINE1, '，')} color={fg} opacity={0.85} />
      <KtWord box={box(LINE2, '藏在')} color={fg} opacity={0.45} />
      <KtWord box={box(LINE2, '每个词')} color={fg} />
      <KtWord box={box(LINE2, '的')} color={fg} opacity={0.45} />
      <KtWord box={box(LINE2, '位置里')} color={fg} />
      {/* 句号软落（无回弹）+ 末词微光 */}
      <SoftGlow cx={PERIOD.cx} cy={PERIOD.y} r={92} alpha={glowAlpha(N, B.still)} color={KT.vermilion} />
      <KtWord box={PERIOD} color={fg} opacity={0.9} ty={softDropY(periodU, 34)} hidden={periodU < 0} />
      <StillFrame N={N} from={B.still} color={fg} />
    </>
  );
};

// =====================================================================
// 正片合成
// =====================================================================
export const Stage: React.FC<{audio?: boolean}> = ({audio = true}) => {
  const N = useCurrentFrame() + 1; // 1 起含端点
  return (
    <AbsoluteFill style={{background: KT.ink}}>
      <Fonts />
      {audio ? <Audio src={staticFile('assets/kinetic-type/audio.wav')} /> : null}
      <KtBg color={bgAt(N)} />
      {N < B.s2 ? <Phase1 N={N} /> : N < B.s3 ? <Phase2 N={N} /> : N < B.s4 ? <Phase3 N={N} /> : <Phase4 N={N} />}
    </AbsoluteFill>
  );
};

export const Video: React.FC = () => <Stage audio />;
