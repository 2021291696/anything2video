// 《街头空墙的舞蹈》—— dance-line 凯斯·哈林粗线涂鸦正片（战役 v4 批次④ D3-2）。
// 纪律：全帧 = 一面街墙；drawFrame(f) 纯帧号函数（seeded，同帧渲两次逐像素一致）。
// 叙事因果：S01 空墙排排站（不弹）→ f120 BGM drop「音乐一响」全场 bounce 启用 →
//   f142 拍点主角硬切跳出落地 → f226/f240 拍点蓝/粉跳下 → 齐舞三人（HERO f220-275 窗口）→
//   f282 题字 → f337-367 定帧 1.0s（相机锁；宝宝两帧交替+红心放射+全场持续 BPM 弹跳=合法微动效）。
// 签名：13px 圆头等宽黑线+平涂 / 4 姿势 8fps 硬切 / 放射动作线 / 一切跟 BPM（bounce=|sin|^0.6，相位错 0.25 拍）。
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {W, H} from '../common';
import {SUBS} from '../common/subs';
import {BPM, BEAT_SEC} from './bpm';
import {MUSIC_F, HOOK_F, WALL_SEAT_PHASES, HERO_PHASE, DOG_PHASE, HEART_PHASE, BLUE_PHASE, PINK_PHASE, HERO_LEAP_FROM, BLUE_LEAP_FROM, PINK_LEAP_FROM} from './choreo';
import {
  PAL, LW, WALL_H, TAU, clamp, drawDancer, radialLines, radiantBaby, heart, dog, burst,
  jumpMarks, markerTitle, drawSubs, windowRock, type DancerSpec, type CanvasCtx,
} from './kit';

export const FPS = 30;
export const TOTAL = 367;

// 墙内排排站 6 席：入场帧（f3 钩子 + f15/f29/f43/f57/f71 拍点）、墙位、颜色（相位表见 choreo.ts）
type WallSeat = {enter: number; x: number; y: number; color: string; bouncePhase: number; posePhase: number; flip?: 1 | -1};
const WALL_SEATS: WallSeat[] = [
  {enter: HOOK_F, x: 430, y: 360, color: PAL.red, bouncePhase: WALL_SEAT_PHASES[0], posePhase: 0}, // 主角席（f142 跳出）
  {enter: 15, x: 565, y: 330, color: PAL.blue, bouncePhase: WALL_SEAT_PHASES[1], posePhase: 1}, // f226 跳下
  {enter: 29, x: 700, y: 365, color: PAL.pink, bouncePhase: WALL_SEAT_PHASES[2], posePhase: 2, flip: -1}, // f240 跳下
  {enter: 43, x: 835, y: 335, color: PAL.org, bouncePhase: WALL_SEAT_PHASES[3], posePhase: 3},
  {enter: 57, x: 970, y: 360, color: PAL.red, bouncePhase: WALL_SEAT_PHASES[4], posePhase: 1, flip: -1},
  {enter: 71, x: 1105, y: 332, color: PAL.blue, bouncePhase: WALL_SEAT_PHASES[5], posePhase: 2},
];

// 跳下硬切三步表（8fps 步进，不插值）：起点拍 → [墙位爆发, 半空, 落地]
type LeapStep = {from: number; x: number; y: number; s: number; pose: number; burst: 'wall' | 'ground' | null};
function leapSteps(from: number, wall: {x: number; y: number}, ground: {x: number; y: number; s: number}): LeapStep[] {
  // 三步硬切对拍：起点拍 → +6 半空（8fps 步进硬切，不插值）→ +14 落地（拍点：156/240/254）
  return [
    {from: from, x: wall.x, y: wall.y, s: 0.62, pose: 0, burst: 'wall'},
    {from: from + 6, x: (wall.x + ground.x) / 2, y: (wall.y + ground.y) / 2 - 60, s: ground.s * 0.8, pose: 3, burst: null},
    {from: from + 14, x: ground.x, y: ground.y, s: ground.s, pose: 0, burst: 'ground'},
  ];
}
const HERO_LEAP = leapSteps(HERO_LEAP_FROM, {x: 430, y: 360}, {x: 400, y: 640, s: 1.1});
const BLUE_LEAP = leapSteps(BLUE_LEAP_FROM, {x: 565, y: 330}, {x: 210, y: 650, s: 0.85});
const PINK_LEAP = leapSteps(PINK_LEAP_FROM, {x: 700, y: 365}, {x: 640, y: 655, s: 0.85});

/** 相机：S01-S03 静止 mural 视角；f261-336 缓推 1→1.06；f337-367 锁（定帧 1.0s）。 */
function camZ(f: number): number {
  if (f < 261) return 1;
  if (f < 337) return 1 + 0.06 * (clamp((f - 261) / 75) * clamp((f - 261) / 75) * (3 - 2 * clamp((f - 261) / 75)));
  return 1.06;
}

function drawFrame(c: CanvasCtx, fRaw: number): void {
  const f = clamp(Math.round(fRaw), 1, TOTAL);
  const t = (f - 1) / FPS;
  const music = f >= MUSIC_F;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, W, H);
  const z = camZ(f);
  c.save();
  c.translate(W / 2, H / 2);
  c.scale(z, z);
  c.translate(-W / 2, -H / 2);

  // 1. 黄墙 + 绿地 + 14px 黑地平线（纯色平涂）
  c.fillStyle = PAL.yel;
  c.fillRect(0, 0, W, WALL_H);
  c.fillStyle = PAL.green;
  c.fillRect(0, WALL_H, W, H - WALL_H);
  c.strokeStyle = PAL.ink;
  c.lineWidth = 14;
  c.beginPath();
  c.moveTo(0, WALL_H);
  c.lineTo(W, WALL_H);
  c.stroke();

  // 2. 窗：黑粗框蓝底 + 光芒宝宝（整窗跟拍轻摇）
  c.save();
  c.translate(240, 220);
  c.rotate(windowRock(t, music));
  c.translate(-240, -220);
  const win = new Path2D();
  win.rect(150, 110, 180, 220);
  c.save();
  c.lineJoin = 'round';
  c.fillStyle = PAL.blue;
  c.fill(win);
  c.strokeStyle = PAL.ink;
  c.lineWidth = 16;
  c.stroke(win);
  c.beginPath();
  c.moveTo(240, 118);
  c.lineTo(240, 200);
  c.lineWidth = 10;
  c.stroke();
  c.save();
  c.clip(win);
  radiantBaby(c, 248, 296, 0.42, t);
  c.restore();
  const sill = new Path2D();
  sill.rect(134, 328, 212, 26);
  c.fillStyle = PAL.red;
  c.fill(sill);
  c.strokeStyle = PAL.ink;
  c.lineWidth = 12;
  c.stroke(sill);
  c.restore();

  // 3. 红心（音乐起后按 HEART_PHASE=0.5 跳动 + 放射线）
  heart(c, 950, 108, 1.0, t, music, HEART_PHASE);

  // 4. 墙内排排站（音乐前锁姿势不弹；音乐起后原地跟 BPM 弹）
  for (const seat of WALL_SEATS) {
    const gone = // 主角 f142 跳出 / 蓝 f226 / 粉 f240 跳下
      (seat.enter === HOOK_F && f >= HERO_LEAP[0].from) ||
      (seat.color === PAL.blue && seat.enter === 15 && f >= BLUE_LEAP[0].from) ||
      (seat.color === PAL.pink && seat.enter === 29 && f >= PINK_LEAP[0].from);
    if (f < seat.enter || gone) continue;
    const since = f - seat.enter;
    if (since < 4) {
      burst(c, seat.x, seat.y - 90, 64, t, seat.enter); // 硬切入场：先爆发星 4 帧
      continue;
    }
    const spec: DancerSpec = {
      x: seat.x, y: seat.y, s: 0.62, color: seat.color,
      flip: seat.flip === -1 ? -1 : 1, posePhase: seat.posePhase, bouncePhase: seat.bouncePhase,
      jump: music ? 10 : 0, poseLock: music ? undefined : 0, eye: true,
    };
    drawDancer(c, spec, t);
    if (since < 8) burst(c, seat.x, seat.y - 90, 46, t, seat.enter + 3);
  }

  // 5. 跳下三步硬切（主角/蓝/粉）：落地 4 帧后解锁姿势进入 BPM 齐舞
  const drawLeap = (steps: LeapStep[], color: string, hero: boolean): void => {
    if (f < steps[0].from) return;
    let st = steps[0];
    for (const q of steps) if (f >= q.from) st = q;
    const dancing = st === steps[2] && f >= steps[2].from + 4;
    if (st.burst === 'wall') burst(c, steps[0].x, steps[0].y - 90, 72, t, steps[0].from);
    drawDancer(c, {
      x: st.x, y: st.y, s: st.s, color,
      poseLock: dancing ? undefined : st.pose,
      jump: dancing ? (hero ? 34 : 26) : 0,
      bouncePhase: hero ? HERO_PHASE : color === PAL.blue ? BLUE_PHASE : PINK_PHASE,
      posePhase: hero ? 0 : color === PAL.blue ? 1 : 2,
      eye: true, lips: hero,
    }, t);
    if (st.burst === 'ground') burst(c, st.x, st.y - 20, 60, t, st.from + 1);
  };
  drawLeap(HERO_LEAP, PAL.red, true);
  drawLeap(BLUE_LEAP, PAL.blue, false);
  drawLeap(PINK_LEAP, PAL.pink, false);

  // 6. 地上「跳起」横线（长度随拍伸缩）
  jumpMarks(c, [[400, 684], [210, 690], [640, 692], [1030, 694]], t, music);

  // 7. 吠犬（DOG_PHASE=0.75）
  dog(c, 1030, 660, 1.0, t, music, DOG_PHASE);

  // 8. 放射动作线：舞者头顶上半环（8fps 换角，避免下环扫腿），齐舞期逐个点亮
  if (f >= HERO_LEAP[2].from + 4) radialLines(c, 400, 400, 88, 96, 7, t, 11, 28, 9, true);
  if (f >= BLUE_LEAP[2].from + 4) radialLines(c, 210, 470, 68, 76, 6, t, 15, 24, 8, true);
  if (f >= PINK_LEAP[2].from + 4) radialLines(c, 640, 474, 68, 76, 6, t, 13, 24, 8, true);

  // 9. 题字「空墙的舞蹈」f282-316 粗马克笔写出
  markerTitle(c, '空墙的舞蹈', 640, 150, 72, clamp((f - 282) / 34));

  c.restore(); // 相机

  // 10. 字幕（屏幕空间，马克笔白字黑边）
  drawSubs(c, f, SUBS);
}

export const DanceLineFilm: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: PAL.yel, overflow: 'hidden'}}>
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

export const Stage: React.FC<{audio?: boolean}> = ({audio = false}) => (
  <AbsoluteFill style={{background: PAL.yel, overflow: 'hidden'}}>
    {audio ? <Audio src={staticFile('assets/dance-line/audio.wav')} /> : null}
    <DanceLineFilm />
  </AbsoluteFill>
);

export const Video: React.FC = () => <Stage audio />;

// BPM 同步自检常量（构建期导出，tests/bpm-assert.mjs 断言用）
export const BPM_SYNC = {BPM, BEAT_SEC, MUSIC_F, HOOK_F, TOTAL};
