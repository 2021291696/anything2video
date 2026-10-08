// 《下午五点的光》—— hard-light 霍珀美国现实主义正片（战役 v4 批次④）。
// 纪律：drawFrame(f) 纯帧号函数（seeded，同帧渲两次逐像素一致）；光斑边缘为多边形硬边（禁 blur）。
// 层序：背光房间 → [墙/地光斑裁切: 受光房间 + 窗棂影/墙上人影] → 旋转柱/拉绳 → 背光家具+人物
//   → [人物光带裁切: 受光家具+人物] → 光带浮尘 → 杯口热气 → 竖向 fbm 刷痕（soft-light α0.2）→ 字幕。
// 每物两色成对锁死（TS/TL 背光冷绿族、LT/TL 受光暖黄族，见 types.ts），光作为叙事而非装饰。
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {FPS, H, LT, SH, TL, TS, W, type CanvasCtx} from './types';
import {clamp} from './noise';
import {brushTex, roomLit, roomShade} from './room';
import {cupPos, drawWoman, furniture, pose} from './woman';
import {camZoom, dust, floorPatch, litClip, lightDx, personBand, wallPatch, wallShadow} from './light';
import {barberPole, blindCord, steam} from './extras';
import {drawSubs} from './subs';
import {TOTAL_FRAMES} from '../common/timeline';

function drawFrame(c: CanvasCtx, fRaw: number): void {
  const f = clamp(Math.round(fRaw), 1, TOTAL_FRAMES);
  const t = (f - 1) / FPS;
  const dx = lightDx(f);
  const p = pose(f, FPS);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, W, H);
  // 相机：全片缓推 1.00→1.03，定帧段钳死
  const z = camZoom(f);
  c.save();
  c.translate(640, 360);
  c.scale(z, z);
  c.translate(-640, -360);
  // ① 背光底版（冷绿房间）
  c.drawImage(roomShade(), 0, 0);
  // ② 墙/地光斑里透出受光底版 + 窗棂影 + 墙上人影（source-in 背光版）
  litClip(c, [wallPatch(dx), floorPatch(dx)], () => {
    c.drawImage(roomLit(), 0, 0);
    wallShadow(c, dx, f);
  });
  // ③ 窗外小件（旋转柱自带街景裁切、拉绳在窗前）
  barberPole(c, t);
  blindCord(c, t);
  // ④ 家具与人物：先背光色
  furniture(c, TS);
  drawWoman(c, TS, p);
  // ⑤ 人物光带里再画受光色（光边扫脸：半脸背光 → 全脸受光）
  litClip(c, [personBand(dx)], () => {
    furniture(c, TL);
    drawWoman(c, TL, p);
  });
  // ⑥ 光带浮尘 + 杯口热气
  dust(c, t, dx);
  const [cupX, cupY] = cupPos(p);
  steam(c, t, cupX, cupY);
  // ⑦ 整幅油画刷痕（竖向拉长 fbm，soft-light α0.2）
  c.save();
  c.globalCompositeOperation = 'soft-light';
  c.globalAlpha = 0.2;
  c.drawImage(brushTex(), 0, 0);
  c.restore();
  c.restore();
  // ⑧ 字幕（屏幕空间，相机外）
  drawSubs(c, f);
}

export const HardLightFilm: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: SH.wall, overflow: 'hidden'}}>
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
  <AbsoluteFill style={{background: LT.wall, overflow: 'hidden'}}>
    {audio ? <Audio src={staticFile('assets/hard-light/audio.wav')} /> : null}
    <HardLightFilm />
  </AbsoluteFill>
);

export const Video: React.FC = () => <Stage audio />;
