// 《蓝屋里的下午》—— blue-period 毕加索蓝色时期正片（战役 v4 批次④ D5）。
// 纪律：drawFrame(f) 纯帧号函数（seeded，同帧渲两次逐像素一致）；严格单色蓝，禁第二色相。
// 签名：①严格单色蓝六档+青灰 ②宽而干横竖笔（cap butt + blur7 叠 α0.8）③R.stretch 拉长（线宽不变）
// ④普鲁士蓝 5px 轮廓不沸腾 ⑤万物减速（慢相时 0.5 倍参数化：呼吸幅度 2 倍/频率 0.45 倍、端杯 1.25s、热气半速）
// ⑥单色明度映射（橘白猫/金发的换算表见 types.ts MONO_MAP）。
// 节拍：f1-15 钩子=第一笔宽干笔横扫（0.47s）；f117-225 世界渐慢；f225-262 HERO 拉长（f243≈62.3%、
// f262 定格≈67.2%，都在 60-75% 窗口 f234-292 内）；f358-390 定帧（极慢呼吸/海浪/碎影/热气微动）。
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {BLUE, FPS, H, HOOK_END, STRETCH_FROM, STRETCH_TO, SLOW, STRETCH, W, type CanvasCtx} from './types';
import {clamp01, easeInOutCubic, easeOutCubic, lerp} from './noise';
import {baseCanvas, brushCanvas, outlineCanvas, overlayCanvas, tableCanvas} from './room';
import {applyStretch, buildCat, buildGirl, charCanvas, compositeShadow, drawChars, shawlPleats} from './chars';
import {drawCloud, drawSea} from './extras';
import {steam} from './brush';
import {drawSubs} from './subs';
import {TOTAL_FRAMES} from '../common/timeline';

/** 全局慢时（签名⑤「节奏即情绪」）：slow(f) 从 1.0（f117 前）单调降到 0.5（f225 起），相位按帧积分。
 *  预计算表在模块加载时构建一次（确定性纯函数，无闭包累积）。 */
const SLOW_TAB: Float64Array = (() => {
  const tab = new Float64Array(TOTAL_FRAMES + 2);
  let acc = 0;
  for (let f = 1; f <= TOTAL_FRAMES + 1; f++) {
    const u = clamp01((f - SLOW.from) / (SLOW.to - SLOW.from));
    const s = u <= 0 ? 1 : u >= 1 ? SLOW.factor : 1 - (1 - SLOW.factor) * (u * u * (3 - 2 * u));
    acc += s / FPS;
    tab[f] = acc;
  }
  return tab;
})();

/** 慢化后的相时（秒）：f1 之前算 0。 */
function phaseTime(f: number): number {
  const i = Math.max(1, Math.min(TOTAL_FRAMES + 1, Math.round(f)));
  return SLOW_TAB[i] - SLOW_TAB[1];
}

/** 端杯进度：CUP_FROM 起按真实秒走 1.25s（本身就是「慢举」——常规编舞 0.9s）。 */
const CUP_FROM = 130;
function cupAmount(f: number): number {
  const s = Math.max(0, (f - CUP_FROM) / FPS);
  return 0.5 - 0.5 * Math.cos(Math.min(1, s / 1.25) * Math.PI);
}

/** 拉长进度：HERO 窗口内 0→1（人 f225-262；猫稍滞后 f231-268），之后定格在锁死参数。 */
const stretchAmt = (f: number, from: number, to: number): number => easeInOutCubic((f - from) / (to - from));

function drawFrame(c: CanvasCtx, fRaw: number): void {
  const f = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(fRaw)));
  const pt = phaseTime(f);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, W, H);
  // 慢而深的呼吸 + 猫尾慢摆 + 慢举杯
  const breathe = Math.sin(pt * 1.8) * 0.026; // 幅度≈常规 2 倍、频率≈0.45 倍
  const tail = Math.sin(pt * 2.2) * 0.3;
  const cup = cupAmount(f);
  // 拉长（签名③）：人 0.84×1.12 / 猫 0.82×1.14 绕脚轴，HERO 段到达并定格
  const ga = stretchAmt(f, STRETCH_FROM, STRETCH_TO);
  const ca = stretchAmt(f, STRETCH_FROM + 6, STRETCH_TO + 6);
  const girl = applyStretch(buildGirl(cup, breathe), lerp(1, STRETCH.girl.sx, ga), lerp(1, STRETCH.girl.sy, ga), STRETCH.girl.anchor[0], STRETCH.girl.anchor[1]);
  const cat = applyStretch(buildCat(tail, breathe * 1.4), lerp(1, STRETCH.cat.sx, ca), lerp(1, STRETCH.cat.sy, ca), STRETCH.cat.anchor[0], STRETCH.cat.anchor[1]);
  // ① 平涂底稿（钩子里笔触未扫到处露出的就是它）
  c.drawImage(baseCanvas(), 0, 0);
  // ② 宽干笔层：钩子 = 第一笔宽干笔横扫（f1-15 wipe，0.47s），笔锋是一道竖直的干笔bar
  const wipe = W * easeOutCubic((f - 1) / (HOOK_END - 1));
  c.save();
  c.beginPath();
  c.rect(0, 0, wipe, H);
  c.clip();
  c.drawImage(brushCanvas(), 0, 0);
  c.restore();
  if (f <= HOOK_END) {
    c.fillStyle = 'rgba(29,56,102,0.9)';
    c.fillRect(wipe - 14, 0, 28, H); // butt 端的宽干笔锋
    c.fillStyle = 'rgba(143,172,205,0.5)';
    c.fillRect(wipe + 14, 0, 4, H);
  }
  // ③ 桌层（单独成层画在笔触后——矩形 mask 挖洞会留平涂补丁，36 号踩坑）
  c.drawImage(tableCanvas(), 0, 0);
  // ④ 环境轮廓（普鲁士蓝 5px，笃定不沸腾）
  c.drawImage(outlineCanvas(), 0, 0);
  // ⑤ 窗外慢世界：海浪/月光碎影/长云过月
  drawSea(c, pt);
  drawCloud(c, pt);
  // ⑥ 角色层先建（本帧几何 → 角色层 + 长影层，帧内自足无跨帧依赖）→ 落地长影（随拉长变长）→ blit → 披肩褶 → 杯口慢热气
  drawChars(girl, cat);
  compositeShadow(c, girl, ga);
  const L = charCanvas();
  if (L) c.drawImage(L, 0, 0);
  shawlPleats(c, girl);
  steam(c, pt, girl.A.cup[0], girl.A.cup[1] - 8, 47);
  // ⑦ 画布纹＋冷暗角 → 字幕
  c.drawImage(overlayCanvas(), 0, 0);
  drawSubs(c, f);
}

export const BluePeriodFilm: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: BLUE.navy, overflow: 'hidden'}}>
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
  <AbsoluteFill style={{background: BLUE.navy, overflow: 'hidden'}}>
    {audio ? <Audio src={staticFile('assets/blue-period/audio.wav')} /> : null}
    <BluePeriodFilm />
  </AbsoluteFill>
);

export const Video: React.FC = () => <Stage audio />;
