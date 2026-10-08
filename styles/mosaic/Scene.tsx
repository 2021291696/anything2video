// 《小心恶犬》—— mosaic 风格样片正片（庞贝 CAVE CANEM 马赛克，战役 v4 批次④）。
// 全片 = 一张 canvas：drawFrame(f) 纯帧号函数（seeded、同帧渲两次逐像素一致、禁 Math.random/Date/网络）。
// 签名纪律（RECON-huashu §04）：①ID/SH 双缓冲（布局一次算、颜色每帧流过石块，加权 L∞ Voronoi 灰浆缝）
// ②离屏 putImageData→drawImage（直写主 canvas 会绕过镜头冲击与转场裁剪）③波浪纹边框传送带顺时针流动
// ④维苏威冒烟＋火星抛物线 ⑤马赛克砖翻面扩散转场（铺陈波＋CAVE CANEM 文字砖级联）⑥等宽粗笔画马赛克字
// ⑦两条运动学定律（动态区不单独换参数；慢速位移<颗粒尺寸只换色会被量化吃掉）。
import React from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {drawFrame, getMosaic, FPS} from './mosaic';

export const W = 1920, H = 1080;

let fontHandle: number | null = null;
export const MosaicFilm: React.FC = () => {
  const frame = useCurrentFrame() + 1;
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = React.useState(fontHandle !== null);
  React.useEffect(() => {
    if (fontHandle !== null) return;
    fontHandle = delayRender('mosaic-fonts');
    const face = new FontFace('Noto Sans SC', `url(${staticFile('fonts/NotoSansSC.ttf')})`, {weight: '100 900'} as FontFaceDescriptors);
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
    drawFrame(ref.current.getContext('2d') as CanvasRenderingContext2D, frame);
  }, [frame, ready]);
  // 首帧前同步建 ID/SH 缓冲（build 一次 ~数百 ms，建后每帧只重取色）
  React.useMemo(() => {
    if (ready) getMosaic();
  }, [ready]);
  return (
    <AbsoluteFill style={{background: '#6e6458', overflow: 'hidden'}}>
      <canvas ref={ref} width={W} height={H} style={{width: W, height: H, display: 'block'}} />
    </AbsoluteFill>
  );
};
