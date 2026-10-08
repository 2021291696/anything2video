// 《放学后的积雨云》—— cumulus-light 新海诚光影正片（战役 v4 批次④）。
// 纪律：drawFrame(f) 纯帧号函数（seeded，同帧渲两次逐像素一致）；签名五件全落实：
//   ① 赛璐珞硬阴影带 + 逆光暖 rim + 天使环（girl.ts/plant）
//   ② 积雨云三步法（剪影 + 偏移亮球 + 糊/清两层，70+12 团；塔顶超屋顶线 = 云比楼高）
//   ③ 丁达尔光柱（3 楔形 blur 缓存 screen 明灭 + 英雄光楔）+ 光尘 60 颗
//   ④ 镜头光晕（太阳在玻璃内/核 76≤130/横丝 540≤840）+ bloom 泛光（screen α0.28）
//   ⑤ 玻璃水珠（下缘弧+透明体+高光点）一颗滑下带水痕
// 三纪律：钩子 f1-12 光柱亮起（0.37s<0.5s）；HERO f216-270（云群移动+光柱全开+水珠滑落）；
//   结尾 f330-360 定帧 1.0s（姿态/相机冻结，光尘+云缓移继续）。
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {CanvasCtx, FREEZE_FROM, FIX, H, W} from './types';
import {clamp, easeOutCubic, bell} from './noise';
import {roomBack, windowFrame} from './room';
import {drawSky, drawMullion} from './sky';
import {drawDrops, drawSliderDrop, drawCurtain} from './glass';
import {drawFloorLight, drawWallLight, drawDeskKiss} from './lightpatch';
import {drawGirl, drawPullCord} from './girl';
import {drawGodrays, drawPlant, drawLensFlare, drawBloom, drawGrade} from './atmos';
import {drawSubs} from './subs';
import {TOTAL_FRAMES} from '../common/timeline';

function drawFrame(c: CanvasCtx, fRaw: number): void {
  const f = clamp(Math.round(fRaw), 1, TOTAL_FRAMES);
  const t = (f - 1) / 30;
  const tA = (fRaw - 1) / 30;                        // 环境时基（定帧后仍前进：云缓移/光尘/明灭）
  const freeze = f >= FREEZE_FROM;
  const fadeIn = easeOutCubic((f - 1) / 12);         // 钩子：光柱 0.37s 亮起
  const hero = bell(f, 196, 286);                    // 英雄拍包络（水珠滑落段起，含 60-75% 窗口 f216-270）
  const gust = 0.35 + 0.75 * bell(t, 5.9, 8.9);      // 「风把夏天吹进教室」S03 f177-267 风阵
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = FIX.wallMid;
  c.fillRect(0, 0, W, H);
  // 相机：全片缓推 1.00→1.035，定帧段钳死
  const z = 1 + 0.035 * clamp(f / FREEZE_FROM);
  c.save();
  c.translate(640, 360);
  c.scale(z, z);
  c.translate(-640, -360);
  // ① 室内静态层（房壳/家具/挂历/搁板/横梁灯管）
  c.drawImage(roomBack(), 0, 0);
  // ② 玻璃内天空与积雨云（环境时基：定帧后云仍缓移）
  drawSky(c, tA);
  drawMullion(c);
  // ③ 玻璃水珠（静态 20 颗 + 英雄水珠滑落带水痕）
  drawDrops(c);
  drawSliderDrop(c, f);
  // ④ 窗框 + 窗台
  c.drawImage(windowFrame(), 0, 0);
  // ⑤ 白纱窗帘（随风鼓起）
  drawCurtain(c, tA, gust);
  // ⑥ 窗形光斑（地面/桌面缓存 + 墙面每帧含窗帘影）+ 桌沿受光
  drawFloorLight(c);
  drawWallLight(c, tA, gust);
  drawDeskKiss(c);
  // ⑦ 拉线开关 + 盆栽 + 少女（定帧冻结姿态，发丝仍随风）
  drawPullCord(c, tA, gust);
  drawPlant(c, tA, gust);
  drawGirl(c, t, freeze);
  // ⑧ 丁达尔光柱（钩子亮起）+ 英雄光楔（光柱全开）+ 光尘
  drawGodrays(c, tA, fadeIn, hero);
  // ⑨ 镜头光晕 + 泛光 + 冷暖分离
  drawLensFlare(c, tA);
  drawBloom(c);
  drawGrade(c);
  c.restore();
  // ⑩ 字幕（屏幕空间，相机外）
  drawSubs(c, f);
}

export const CumulusLightFilm: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: FIX.wallMid, overflow: 'hidden'}}>
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
  <AbsoluteFill style={{background: FIX.wallMid, overflow: 'hidden'}}>
    {audio ? <Audio src={staticFile('assets/cumulus-light/audio.wav')} /> : null}
    <CumulusLightFilm />
  </AbsoluteFill>
);

export const Video: React.FC = () => <Stage audio />;
