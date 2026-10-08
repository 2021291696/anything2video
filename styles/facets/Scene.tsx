// 《一张脸的两个视角》—— facets 分析立体主义正片（战役 v4 批次④）。
// 纪律：drawFrame(f) 纯帧号函数（seeded，同帧渲两次逐像素一致）；禁 Math.random/Date/网络。
// 层序：底版叠面（静态缓存+入场显影+钩子大面亮起）→ 窗四格错位取景 → CAFÉ 模版字 → 报纸 → 吉他切面
//   → 人物（平涂→切面→毕加索结构）→ 顶层透叠面（把人嵌进空间）→ 字幕。
// 三纪律：钩子 f1-13 第一块大切面亮起（0.43s）｜HERO f240-268 碎面重组+双视角完成（f268=65.4%）｜
//   结尾定帧 f376-410（1.13s，微动效=碎面明暗跳+报纸颤+窗格滑片+叠面错动，禁全静止）。
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {A, C, W, H, FPS, TOTAL, type CanvasCtx} from './types';
import {clamp, lerp, mulberry32} from './rand';
import {backdrop, plane, poly, hookSweep, HOOK_PLANE} from './plane';
import {staticLayer, boilStep} from './facetize';
import {drawFigure} from './figure';
import {windowPanes, cafeLetters, newspaper, guitar, cafeStep, WIN_RECT} from './props';
import {drawSubs} from './subs';
import {TOTAL_FRAMES} from '../common/timeline';

/** 顶层透叠面 ×5（sin 错动，把角色嵌进空间——配方收尾纪律）。 */
function overPlanes(c: CanvasCtx, t: number, st: number, appear: number): void {
  if (appear <= 0) return;
  let s = 5 >>> 0;
  const r = () => {
    s = (s + 0x6d2b79f5) | 0;
    let q = Math.imul(s ^ (s >>> 15), 1 | s);
    q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q;
    return ((q ^ (q >>> 14)) >>> 0) / 4294967296;
  };
  const planes: Array<[Array<[number, number]>, string]> = [
    [[[768, 172], [888, 148], [864, 316]], C.cream],
    [[[788, 348], [868, 316], [888, 468], [800, 480]], C.bgrey],
    [[[280, 428], [374, 402], [348, 522]], C.ochre],
    [[[588, 202], [708, 176], [668, 282]], C.cream],
    [[[900, 402], [968, 376], [982, 522]], C.grey],
  ];
  c.save();
  c.globalAlpha = appear;
  planes.forEach(([pts0, col], i) => {
    const dx = Math.sin(t * 6 + i) * 7;
    const pts = pts0.map(([x, y]) => [x + dx, y] as [number, number]);
    plane(c, pts, col, 0.2, r, 0.35, 0.4);
    c.strokeStyle = 'rgba(40,30,20,0.45)';
    c.lineWidth = 1.2;
    poly(c, pts);
    c.stroke();
  });
  c.restore();
}

/** 相机：全片缓推 1.00→1.035，定帧段钳死。 */
function camZoom(f: number): number {
  const k = clamp((f - 1) / (A.FREEZE - 1));
  return lerp(1, 1.035, k);
}

function drawFrame(c: CanvasCtx, fRaw: number): void {
  const f = clamp(Math.round(fRaw), 1, Math.min(TOTAL_FRAMES, TOTAL));
  const t = (f - 1) / FPS;
  const st = boilStep(t, (A.FREEZE - 1) / FPS);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = C.paper;
  c.fillRect(0, 0, W, H);
  const z = camZoom(f);
  c.save();
  c.translate(W / 2, H / 2);
  c.scale(z, z);
  c.translate(-W / 2, -H / 2);
  // ① 底版叠面（静态缓存，画一次）+ 入场显影 + 钩子大面亮起
  const bgCv = staticLayer('facets-bg', W, H, backdrop);
  const intro = clamp(f / A.INTRO);
  c.save();
  c.globalAlpha = intro;
  c.drawImage(bgCv, 0, 0);
  c.restore();
  if (f <= 30) {
    // 钩子：第一块大切面亮起（f1-13 α 冲到额定值）+ 高光带扫过（f1-26）
    const hk = easeHook(f);
    c.save();
    c.globalAlpha = 0.2 + 0.5 * hk;
    plane(c, HOOK_PLANE, C.ochre, 0.75, mulberry32(f * 17 + 3), 0.4, 0.45);
    c.restore();
    hookSweep(c, f);
  }
  // ② 窗四格错位取景（HERO 段收束成多视角拼合）
  const winAppear = clamp((f - 88) / 36);
  const conv = clamp((f - 230) / 38);
  windowPanes(c, t, st, conv, winAppear);
  // ③ CAFÉ 模版字（12fps 跳换位，定帧后锁位）
  cafeLetters(c, t, cafeStep(t), clamp((f - A.CAFE_IN) / (A.CAFE_IN_END - A.CAFE_IN)));
  // ④ 报纸（滑入 + 8fps 微颤）
  newspaper(c, t, st, f);
  // ⑤ 吉他切面（pop 入场 + 8fps 沸腾）
  guitar(c, t, st, f);
  // ⑥ 人物：平涂 → 切面（f58 拆开）→ 毕加索结构 → 双视角（f268 完成）
  drawFigure(c, f, st);
  // ⑦ 顶层透叠面（把人嵌进空间）
  overPlanes(c, t, st, clamp((f - 112) / 16));
  c.restore();
  // ⑧ 字幕（屏幕空间）
  drawSubs(c, f);
}

/** 钩子亮起曲线：f1-13 easeOut 到 1。 */
function easeHook(f: number): number {
  const k = clamp((f - 1) / (A.HOOK - 1));
  return 1 - Math.pow(1 - k, 3);
}

export const FacetsFilm: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: C.paper, overflow: 'hidden'}}>
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
  <AbsoluteFill style={{background: C.paper, overflow: 'hidden'}}>
    {audio ? <Audio src={staticFile('assets/facets/audio.wav')} /> : null}
    <FacetsFilm />
  </AbsoluteFill>
);

export const Video: React.FC = () => <Stage audio />;
