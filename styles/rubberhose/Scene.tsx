// 《闹钟的抗议》—— rubberhose 1930 橡皮管卡通正片（战役 v4 批次④ D3-3）。
// 纪律：drawFrame(f) 纯帧号函数（seeded，禁 Math.random/Date/网络）；
// 角色与母题全部吃 12fps 步进 tq（端枕头也步进），只有胶片层按 24fps 变；
// 去色褪色在角色画完之后统一做（手套残留暖色是坑）；胶片层不许成为主要运动源。
import React from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {clamp, stepTime} from './prims';
import {drawCountdown, drawIris, fadeMono, filmLayer, gateWeave} from './film';
import {drawBed, drawGong, drawNightstand, drawSubs, drawTitleCard, drawWindow, drawZzz, roomBg} from './set';
import {drawCat, drawClock, drawFlopShake, drawGongBurst, drawNotes, drawPillowRest, drawRingArcs, type CatState, type ClockState} from './cast';
import {FPS, H, PAPER, TINT, TOTAL, W, type CanvasCtx} from './types';
import {SUBS} from '../common/subs';

let FONTS: {pending: number; done: () => void} | null = null;
function ensureFonts(): void {
  if (FONTS) return;
  const handle = delayRender('rubberhose-fonts');
  let pending = 2;
  const done = (): void => {
    pending -= 1;
    if (pending === 0) continueRender(handle);
  };
  FONTS = {pending, done};
  const add = (family: string, file: string): void => {
    const ff = new FontFace(family, `url(${staticFile(`fonts/${file}`)})`, {weight: '100 900'} as FontFaceDescriptors);
    ff.load().then(() => {
      (document.fonts as unknown as {add: (f: FontFace) => void}).add(ff);
      done();
    }).catch(() => done());
  };
  add('Noto Serif SC', 'NotoSerifSC[wght].ttf');
  add('Noto Sans SC', 'NotoSansSC.ttf');
}
ensureFonts();

// ---- 编排常量（帧号与 research/beat-sheet.json 一致）----
const HOOK_END = 13; // 钩子：倒计时+iris 在 0.5s 内完成
const RING_END = 198; // 闹钟在床头柜上唱歌段结束
const JUMP_FROM = 199;
const JUMP_TO = 206; // 跳下床头柜（抛物线落地压扁）
const GONG_FIRST = 238; // HERO 起点敲锣（=60.1%）
const STRIDE = 28; // 每两拍敲一记（128BPM）
const SLAP_FROM = 252; // 猫坐起拍打
const TITLE_FROM = 331;
const FREEZE_FROM = 360; // 定帧（去色褪色定格+微动效）至 396

const CLOCK_TABLE: [number, number] = [715, 428];
const CLOCK_FLOOR: [number, number] = [700, 652];
const CAT_GROUND: [number, number] = [1010, 545];
const GONG_HIT: [number, number] = [575, 535];

function sinceLastStrike(f: number): number {
  const last = GONG_FIRST + Math.floor((f - GONG_FIRST) / STRIDE) * STRIDE;
  return f >= GONG_FIRST ? (f - last) / FPS : -1;
}

function clockPose(f: number, t: number): {state: ClockState; x: number; y: number; excite: number; holdMallet: number; strikeK: number} {
  if (f < JUMP_FROM) {
    return {state: 'ring', x: CLOCK_TABLE[0], y: CLOCK_TABLE[1], excite: 1, holdMallet: 0, strikeK: 0};
  }
  if (f <= JUMP_TO) {
    const u = (f - JUMP_FROM) / (JUMP_TO - JUMP_FROM);
    return {
      state: 'jump',
      x: CLOCK_TABLE[0] + (CLOCK_FLOOR[0] - CLOCK_TABLE[0]) * u,
      y: CLOCK_TABLE[1] + (CLOCK_FLOOR[1] - CLOCK_TABLE[1]) * u - Math.sin(Math.PI * u) * 96,
      excite: 1, holdMallet: 0, strikeK: 0,
    };
  }
  const excite = f < GONG_FIRST ? 0.45 + 0.55 * clamp((f - JUMP_TO) / (GONG_FIRST - JUMP_TO)) : 1;
  const holdMallet = f >= GONG_FIRST - 8 ? 1 : 0;
  let strikeK = 0;
  for (let s = GONG_FIRST; s <= f; s += STRIDE) {
    strikeK = Math.max(strikeK, clamp(1 - Math.abs(f - s) / 5));
  }
  void t;
  return {state: 'dance', x: CLOCK_FLOOR[0], y: CLOCK_FLOOR[1], excite, holdMallet, strikeK};
}

function catState(f: number): {state: CatState; flop: number} {
  if (f < 126) return {state: 'sleep', flop: 0};
  if (f < SLAP_FROM) return {state: 'flop', flop: clamp((f - 126) / 6)};
  return {state: 'slap', flop: 0};
}

function drawFrame(c: CanvasCtx, fRaw: number): void {
  const f = clamp(Math.round(fRaw), 1, TOTAL);
  const t = (f - 1) / FPS;
  // 定帧：动作时间 12% 速率爬行（微动效，禁全静止）；胶片层仍全速 24fps
  const tqFreeze = stepTime((FREEZE_FROM - 1) / FPS, 12);
  const tqBase = stepTime(t, 12);
  const tq = f < FREEZE_FROM ? tqBase : tqFreeze + (tqBase - tqFreeze) * 0.12;

  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = PAPER;
  c.fillRect(0, 0, W, H);

  const hookOpen = clamp((f - 1) / HOOK_END);
  const sceneAlpha = 0.45 + 0.55 * hookOpen;
  const cp = clockPose(f, t);
  const cs = catState(f);
  const hitT = sinceLastStrike(f);

  gateWeave(c, t, () => {
    c.save();
    c.globalAlpha = sceneAlpha;
    c.drawImage(roomBg(), 0, 0);
    drawWindow(c, tq);
    drawNightstand(c, tq);
    drawBed(c, tq);
    if (cs.state === 'sleep') drawPillowRest(c, 884, 532);
    drawGong(c, tq, hitT);
    drawCat(c, tq, cs.state, CAT_GROUND[0], CAT_GROUND[1], cs.flop);
    if (cs.state === 'sleep') drawZzz(c, tq, CAT_GROUND[0] - 60, CAT_GROUND[1] - 70, true);
    if (cs.state === 'flop' && f % 30 < 15) drawFlopShake(c, tq, CAT_GROUND[0] + 80, CAT_GROUND[1] - 40, true);
    drawClock(c, tq, cp.state, cp.x, cp.y, cp);
    if (cp.state === 'ring') {
      drawRingArcs(c, tq, cp.x, cp.y, true);
      drawNotes(c, tq, cp.x, cp.y, true);
    }
    drawGongBurst(c, hitT, GONG_HIT[0], GONG_HIT[1]);
    drawTitleCard(c, f);
    c.restore();
    // 老片头：倒计时圆盘 + 圆形片门开启（印刷在胶片上，跟 gate weave 一起抖）
    if (f <= HOOK_END) {
      drawCountdown(c, (f - 1) / (HOOK_END - 1));
      c.globalAlpha = 1;
      drawIris(c, hookOpen);
      c.globalAlpha = sceneAlpha;
    }
  });

  // 签名⑥：全片统一去色 + 暖灰染色（必须角色画完再做）；定帧后加深褪色
  const extraFade = f < FREEZE_FROM ? 0 : clamp((f - FREEZE_FROM) / 14);
  fadeMono(c, extraFade);
  // 胶片层（24fps：闪烁/划痕/灰尘/颗粒/片门）
  filmLayer(c, t);
  // 字幕（胶片层之上保可读）
  drawSubs(c, f, SUBS);
}

export const RubberhoseFilm: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: TINT, overflow: 'hidden'}}>
      <canvas
        width={W}
        height={H}
        style={{width: '100%', height: '100%'}}
        ref={(el) => {
          if (el) drawFrame(el.getContext('2d')!, frame + 1);
        }}
      />
    </AbsoluteFill>
  );
};

export const Stage: React.FC<{shots?: unknown; bg?: unknown; footage?: unknown; audio?: boolean}> = ({audio = false}) => (
  <AbsoluteFill style={{background: TINT, overflow: 'hidden'}}>
    {audio ? <Audio src={staticFile('assets/rubberhose/audio.wav')} /> : null}
    <RubberhoseFilm />
  </AbsoluteFill>
);

export const Video: React.FC = () => <Stage audio />;
