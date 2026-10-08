// 《一只球落的规律》—— math-lab 数学实验室正片（战役 v4 Wave E·P1 卡，prompt-motion 看片复核立项）。
// 全片 = 单 canvas 暗室实验台：drawFrame(f) 纯帧号函数（seek(t) 哲学：全闭式物理解 + hermite/monotone
// 重参数 + sin 呼吸，无随机源，同帧渲两次逐像素一致）。
// 一幕一概念（实验重放纪律，幕间硬切=时钟重置）：SC01 释放 / SC02 每秒更快 / SC03 高度曲线（HERO）/
// SC04 落差∝t²（相机沉降 + 数量柱 + 定帧呼吸）。
// 签名：暗底发光几何（青球/品红曲线/琥珀公式/紫次级段）· 左下公式角标随讲点亮 + 右下 t= 实验时钟贯穿 ·
// 球↔曲线点↔公式量三重同帧联动（虚线导引）· 坐标网格弱辉光 · LaTeX 观感公式排版。
import React, {useEffect, useRef, useState} from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {SUBS} from '../common/subs';
import {
  BRACKET_F, CURVE_DONE, DOT_FROM, DROP_S, FREEZE_FROM, GRID_IN, RELEASE2, RELEASE3, RELEASE1, SC,
  breath, clamp, demoT, sceneOf,
} from './choreo';
import {
  H, OX, PAL, W, X1, X3, ballPos, drawAxes, drawBackdrop, drawBall, drawBracket,
  drawColumns, drawCurve, drawEnergyDot, drawFormula, drawGround, drawGuides, drawHud, drawReleaseRing,
  drawRuler, drawSubs, drawTimecode, drawVelocityArrow, easeInOut, litAt,
} from './kit';
import {RELEASE_OF} from './choreo';

const CONCEPTS = ['01 · 松手释放', '02 · 每秒更快', '03 · 高度曲线', '04 · 落差 ∝ t²'];
const SCENE_FROM = [SC.sc1[0], SC.sc2[0], SC.sc3[0], SC.sc4[0]];

// 字体装载（Noto Sans SC 模板附带 OFL；数学变量用系统 Georgia 真 italic，LaTeX 观感）。
// dance-line 同款兜底：字体失败也 continueRender（回退系统 CJK，防 delayRender 挂死）。
const fontHandle = delayRender('math-lab-fonts');

/** 每幕数值联动读出行（琥珀等宽）：图形与数值同帧对应。 */
function readoutOf(f: number, scene: number, t: number): string {
  const y = 4.9 * t * t;
  if (scene === 2) return `y = ${y.toFixed(1)} m · v = ${(9.8 * t).toFixed(1)} m/s`;
  if (scene === 4) {
    if (f < BRACKET_F) return `y(kt) = k² · y(t)`;
    return `y(3t) / y(t) = 9 = 3²`;
  }
  return `y(${t.toFixed(2)}) = ${y.toFixed(1)} m`;
}

function drawFrame(f: number, c: CanvasRenderingContext2D): void {
  const scene = sceneOf(f);
  const b = breath(f); // 全片辉光微呼吸（crt 纪律 ±5% 级）
  const gridP = scene === 1 ? easeInOut(clamp((f - 1) / (GRID_IN - 1))) : 1;
  drawBackdrop(c, gridP, b);

  // 相机：SC04 开场沉降 1.14→1.0（hermite 端点零斜率，「拉远看规律」）——作用在实验内容层，HUD 不动
  c.save();
  if (f >= SC.sc4[0]) {
    const s = 1 + 0.14 * (1 - easeInOut(clamp((f - 229) / 14)));
    c.translate(OX + 285, 340);
    c.scale(s, s);
    c.translate(-(OX + 285), -340);
  }

  if (scene === 1) {
    const t = demoT(f, RELEASE1);
    drawGround(c, X1);
    drawReleaseRing(c, f, RELEASE1, X1);
    drawBall(c, t, X1);
  } else if (scene === 2) {
    const t = demoT(f, RELEASE2);
    drawGround(c, X1);
    drawRuler(c, f, t);
    drawReleaseRing(c, f, RELEASE2, X1);
    drawBall(c, t, X1);
    drawVelocityArrow(c, t, X1);
  } else if (scene === 3) {
    const t = demoT(f, RELEASE3);
    drawAxes(c, easeInOut(clamp((f - 148) / 12)));
    drawReleaseRing(c, f, RELEASE3, X3);
    drawBall(c, t, X3);
    drawCurve(c, t, b);
    drawGuides(c, t, X3);
  } else {
    // SC04：球板退场（左滑淡出），曲线图独占——一图一概念
    const exit = easeInOut(clamp((f - 229) / 12));
    if (exit < 1) {
      const t3 = demoT(228, RELEASE3);
      c.save();
      c.globalAlpha = 1 - exit;
      c.translate(-520 * exit, 0);
      drawBall(c, t3, X3, false);
      c.restore();
    }
    drawAxes(c, 1);
    drawCurve(c, DROP_S, b, f >= CURVE_DONE ? 26 * Math.exp(-(f - CURVE_DONE) / 12) : 0);
    drawGuides(c, Math.min(demoT(f, RELEASE3), DROP_S), X3);
    drawColumns(c, f);
    drawEnergyDot(c, f, DOT_FROM);
    drawBracket(c, f, b);
  }
  c.restore();

  // HUD 层（不随相机）：公式角标随讲点亮 + t 时码贯穿 + 幕概念
  const fadeP = litAt(f, SCENE_FROM[scene - 1] + 1, SCENE_FROM[scene - 1] + 9);
  const prev = fadeP < 1 ? CONCEPTS[scene - 2] : '';
  drawHud(c, f, CONCEPTS[scene - 1], prev, fadeP);
  const t = demoT(f, RELEASE_OF[scene]);
  drawFormula(c, f, readoutOf(f, scene, t), b);
  drawTimecode(c, t);
  drawSubs(c, f, SUBS);
}

export const Stage: React.FC<{audio?: boolean}> = ({audio = false}) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const [fontTick, setFontTick] = useState(0);
  useEffect(() => {
    let alive = true;
    const done = (): void => {
      // 先同步重绘（字体就位后的最终像素），再 continueRender——防截图竞态
      const c = ref.current?.getContext('2d');
      if (c) drawFrame(frame + 1, c);
      continueRender(fontHandle);
      if (alive) setFontTick((v) => v + 1);
    };
    const ff = new FontFace('Noto Sans SC', `url(${staticFile('fonts/NotoSansSC.ttf')})`, {weight: '400'} as FontFaceDescriptors);
    ff.load()
      .then(() => {
        (document.fonts as unknown as {add: (f: FontFace) => void}).add(ff);
        done();
      })
      .catch(() => done());
    return () => {
      alive = false;
    };
  }, []);
  // 逐帧同步绘制：首绘不等字体（CJK 由 delayRender 兜底后重绘一次）
  useEffect(() => {
    const c = ref.current?.getContext('2d');
    if (!c) return;
    drawFrame(frame + 1, c);
  }, [frame, fontTick]);
  return (
    <AbsoluteFill style={{background: PAL.bg}}>
      {audio ? <Audio src={staticFile('assets/math-lab/audio.wav')} /> : null}
      <canvas ref={ref} width={W} height={H} style={{width: '100%', height: '100%'}} />
    </AbsoluteFill>
  );
};

export const Video: React.FC = () => <Stage audio />;

/** 探针冒烟用（模板 Preview 合成兼容签名）。 */
export const MathLabStage: React.FC<{shots?: unknown; bg?: unknown; footage?: unknown; audio?: boolean}> = ({audio = false}) => (
  <Stage audio={audio} />
);
