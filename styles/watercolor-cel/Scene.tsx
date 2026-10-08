// 《风起的午后》—— watercolor-cel 吉卜力水彩背景＋赛璐璐角色正片（战役 v4 批次④）。
// 纪律：drawFrame(f) 纯帧号函数（seeded，同帧渲两次逐像素一致）。
// 层序：室内底版（水彩洗染缓存）→ 窗洞内（天空/云漂/树摇/草坡+360 草叶风浪）→ 窗棂压回 →
//   komorebi 光斑（HERO 全开）→ 纱帘×2（风鼓）→ 风铃 → 桌/桌布/雏菊/杯 → 角色（离屏 cel 层→画回→
//   textureInside 水彩化）→ 热气 → 窗光暖晕 → 字幕。
// 三纪律：钩子 f1-15 纱帘第一次鼓起（0.47s）；HERO f232-262 草浪推进+光斑全开（峰 f246=64%，60-75% 窗内）；
//   结尾定帧 f350-384=1.17s（纱帘微鼓+光斑漂微动效）。
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {W, H, FPS, WIN, type CanvasCtx} from './types';
import {clamp} from './noise';
import {scratch, paperTex, textureInside} from './wash';
import {roomBg, cloudSprite, treeSprite, grassField, windowScenery} from './world';
import {curtain, komorebi, tableSet, chime, steam, charBloom, freezeK, heroBoost, camZoom} from './motion';
import {drawChars} from './chars';
import {drawSubs} from './subs';
import {TOTAL_FRAMES} from '../common/timeline';

function drawFrame(c: CanvasCtx, fRaw: number): void {
  const f = clamp(Math.round(fRaw), 1, TOTAL_FRAMES);
  const t = (f - 1) / FPS;
  const lt = t; // 本地时（与 t 同源，保留命名区分语义）
  const damp = freezeK(f);
  const boost = heroBoost(f);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, W, H);
  // 相机：全片缓推 1.00→1.035，定帧起钳死
  const z = camZoom(f);
  c.save();
  c.translate(640, 360);
  c.scale(z, z);
  c.translate(-640, -360);
  // ① 室内水彩底版（缓存）
  c.drawImage(roomBg(), 0, 0);
  // ② 窗洞内：天空/远山/草坡 → 云（漂）→ 樟树（摇）→ 360 草叶（风浪推进）
  c.save();
  c.beginPath();
  c.rect(WIN.view.x, WIN.view.y, WIN.view.w, WIN.view.h);
  c.clip();
  windowScenery(c);
  c.drawImage(cloudSprite('a', 200, 120, 11), 30 + t * 9, 102);
  c.drawImage(cloudSprite('b', 150, 90, 23), 200 + t * 13, 140);
  c.save();
  c.translate(368, 338);
  c.scale(0.88, 0.88);
  c.rotate(Math.sin(t * 2.4) * 0.025 * damp);
  c.drawImage(treeSprite(), -110, -215);
  c.restore();
  grassField(c, t, damp, boost);
  c.restore();
  // ③ 窗棂压在外景上（从底版再取一次窗框条）
  c.save();
  c.beginPath();
  c.rect(WIN.view.x + WIN.view.w / 2 - 5, WIN.view.y, 10, WIN.view.h);
  c.rect(WIN.view.x, WIN.view.y + WIN.view.h / 2 - 5, WIN.view.w, 10);
  c.clip();
  c.drawImage(roomBg(), 0, 0);
  c.restore();
  // ④ komorebi 树影光斑（HERO 全开；定帧仍漂移=合法微动效）
  komorebi(c, t, boost);
  // ⑤ 白纱窗帘×2（钩子第一次鼓起；定帧微鼓）
  curtain(c, -1, lt, f, damp);
  curtain(c, 1, lt, f, damp);
  chime(c, lt, f, damp);
  // ⑥ 桌/桌布/雏菊/杯
  tableSet(c, lt, t, damp);
  // ⑦ 角色：cel 层离屏 → 画回 → textureInside（纸纹 α0.8 + 40 色晕 α0.1 destination-in 剪影 → multiply）
  const L = scratch('wcc_chars', W, H);
  const cl = L.getContext('2d')!;
  cl.setTransform(1, 0, 0, 1, 0, 0);
  cl.globalAlpha = 1;
  cl.globalCompositeOperation = 'source-over';
  cl.clearRect(0, 0, W, H);
  drawChars(cl, lt, t);
  c.drawImage(L, 0, 0);
  // 水彩肌理只「乘」在角色剪影上（source-atop 会把纸色盖上去发白——坑，禁用）；纸纹全分辨率保证颗粒可读
  textureInside(c, L, 'wcc_charTex', (mg) => {
    mg.globalAlpha = 0.8;
    mg.drawImage(paperTex('wcc_granHR', W, H, '#f4efe2', {scale: 0.055, amt: 18, grain: 26, seed: 9}), 0, 0);
    mg.globalAlpha = 1;
    mg.drawImage(charBloom(), 0, 0);
  });
  // ⑧ 热气（定帧保留）
  steam(c, t, 408, 440);
  // ⑨ 窗光暖晕（screen 径向，从窗心向外）
  c.save();
  c.globalCompositeOperation = 'screen';
  const lg = c.createRadialGradient(290, 240, 40, 290, 240, 620);
  lg.addColorStop(0, 'rgba(255,240,200,.28)');
  lg.addColorStop(1, 'rgba(255,240,200,0)');
  c.fillStyle = lg;
  c.fillRect(0, 0, W, H);
  c.restore();
  c.restore(); // 相机
  // ⑩ 字幕（屏幕空间）
  drawSubs(c, f);
}

export const WatercolorCelFilm: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#fbf6ea', overflow: 'hidden'}}>
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
  <AbsoluteFill style={{background: '#fbf6ea', overflow: 'hidden'}}>
    {audio ? <Audio src={staticFile('assets/watercolor-cel/audio.wav')} /> : null}
    <WatercolorCelFilm />
  </AbsoluteFill>
);

export const Video: React.FC = () => <Stage audio />;
