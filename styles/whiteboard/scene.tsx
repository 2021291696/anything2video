import React from 'react';
import {useCurrentFrame} from 'remotion';
import {
  WB, MarkerStroke, InkPath, HandText, PenTip, Board, BoardCam, SubBar,
  gLine, gCirc, gBow, gHead, gZig, gUnder, gStar, gHatchSet, gCrossOut, crossFade, circPts,
  type CamKey,
} from './kit';

/**
 * whiteboard 样片场景：《为什么天是蓝的》（白板手绘科普，讲一句画一句）。
 * 单板累积：太阳→大气层带→空气小分子→红光穿透 vs 蓝光被弹开（含错误笔划掉）→散射铺蓝天→抬头结论。
 * 帧轴（tts_build 实测 399f）：S01 f31-114 / S02 f121-205 / S03 f212-293 / S04 f300-352。
 * 三条纪律：钩子 f1 太阳第一笔（0.03s）；HERO 蓝天铺色+散射圈注 f270-303（67.7-75.9%，60-75% 窗）；
 * 结尾 f356-391 定帧 1.2s 带笔尖悬停微颤（禁全静止）。
 */

const INK = {sun: [225, 215] as [number, number]};

// 分子（绿墨小脑袋）：位置与半径
const M1: [number, number] = [490, 388];
const M2: [number, number] = [720, 372];
const M3: [number, number] = [935, 396];
const MR = 16;

/** 分子小脑袋：圆 + 双点眼 + 微笑弧（一版画完，face 为多子路径并行点出） */
const faceD = (cx: number, cy: number): string => {
  const r = MR * 0.42;
  return (
    `M ${cx - r} ${cy - 2} L ${cx - r + 1.6} ${cy + 1} ` +
    `M ${cx + r} ${cy - 2} L ${cx + r - 1.6} ${cy + 1} ` +
    gLine(cx - 5, cy + 6, cx + 5, cy + 6, cx, 1.5)
  );
};

/** 小太阳的放射短线（5 根，跳过朝下的扇区） */
const RAYS: Array<[number, number]> = [[0, -1], [0.82, -0.57], [0.82, 0.57], [-0.82, 0.57], [-0.82, -0.57]];

const SUN = INK.sun;

export const Scene: React.FC = () => {
  const f = useCurrentFrame() + 1;

  // ---- 板上相机（签名件：pan/zoom）----
  const CAM: CamKey[] = [
    {f: 1, s: 1.055, x: -26, y: -14},
    {f: 60, s: 1.035, x: -10, y: -4},
    {f: 120, s: 1.02, x: 6, y: -2},
    {f: 212, s: 1.0, x: 0, y: 0},
    {f: 300, s: 1.0, x: 0, y: 8},
  ];

  return (
    <Board>
      <BoardCam f={f} keys={CAM}>
        {/* ============ 钩子（f0 起笔：太阳第一笔粗马克快笔，f1 即有墨，0.03s 达 0.5s 纪律） ============ */}
        <MarkerStroke pts={circPts(SUN[0], SUN[1], 52, 50, 11)} f={f} f0={0} dur={8} color={WB.orange} size={13} />

        {/* ============ 标题手写（f10-38，笔尖跟随） ============ */}
        <HandText text="为什么天是蓝的？" f={f} f0={10} dur={28} x={640} y={58} size={46} align="center" color={WB.ink} />

        {/* ============ 太阳放射短线（f40-49，S01「阳光」旁白对位，笔逐根跳） ============ */}
        {RAYS.map(([dx, dy], i) => {
          const x0 = SUN[0] + dx * 62;
          const y0 = SUN[1] + dy * 60;
          const x1 = SUN[0] + dx * 88;
          const y1 = SUN[1] + dy * 86;
          return <InkPath key={i} d={gLine(x0, y0, x1, y1, 40 + i, 2)} f={f} f0={40} delay={i * 2} dur={2} color={WB.orange} width={5.5} penScale={0.85} />;
        })}

        {/* ============ S01（f31-114）：大气层带 + 空气小分子 + 地面 ============ */}
        <InkPath d={gBow(165, 372, 1115, 372, 42, 61)} f={f} f0={61} dur={8} color={WB.ink} width={5} />
        <InkPath d={gBow(165, 412, 1115, 412, 42, 69)} f={f} f0={69} dur={8} color={WB.ink} width={5} />
        <HandText text="大气层" f={f} f0={77} dur={8} x={1108} y={318} size={26} color={WB.ink} />

        {/* 分子逐个画（讲一句画一句：撞上空气小分子） */}
        {([M1, M2, M3] as Array<[number, number]>).map((m, i) => (
          <React.Fragment key={i}>
            <MarkerStroke pts={circPts(m[0], m[1], MR, MR - 1, 90 + i * 7)} f={f} f0={86 + i * 7} dur={4} color={WB.green} size={6.5} penScale={0.8} />
            <InkPath d={faceD(m[0], m[1])} f={f} f0={90 + i * 7} dur={3} color={WB.green} width={3.2} pen={false} />
          </React.Fragment>
        ))}

        {/* 地面基线（f108-119） */}
        <InkPath d={gLine(140, 618, 1150, 618, 108, 5)} f={f} f0={108} dur={12} color={WB.ink} width={5} />

        {/* ============ S02（f121-205）：红光穿透 vs 蓝光被弹开 ============ */}
        {/* 红光长波：从太阳直穿大气带到地面（f123-140，箭头头在末 2 帧补画） */}
        <InkPath d={gLine(272, 252, 1148, 610, 120, 6)} f={f} f0={123} dur={16} color={WB.orange} width={6} />
        <InkPath d={gHead(1148, 610, 710, 431, 20)} f={f} f0={123} delay={16} dur={2} color={WB.orange} width={6} />
        <HandText text="红光穿过去了" f={f} f0={141} dur={14} x={905} y={545} size={30} color={WB.orange} />

        {/* 蓝光短波：撞上分子 M2（f156-168）→ 星爆 → 弹开（f172-182） */}
        <InkPath d={gLine(268, 238, M2[0] - 14, M2[1] - 12, 150, 6)} f={f} f0={156} dur={11} color={WB.blue} width={6} />
        <InkPath d={gHead(M2[0] - 14, M2[1] - 12, 487, 299, 17)} f={f} f0={156} delay={11} dur={2} color={WB.blue} width={6} />
        <InkPath d={gStar(M2[0], M2[1], 30, 155)} f={f} f0={169} dur={3} color={WB.blue} width={4} pen={false} />
        <InkPath d={gZig(M2[0] + 10, M2[1] - 12, 1005, 228, 4, 15, 160)}
          f={f} f0={172} dur={9} color={WB.blue} width={5.5} />
        <InkPath d={gHead(1005, 228, M2[0] + 10, M2[1] - 12, 18)} f={f} f0={172} delay={9} dur={2} color={WB.blue} width={5.5} />

        {/* 错误笔 + 划掉（签名件：f183-205，笔擦必钉对位 f197） */}
        <HandText text="蓝光穿过去？" f={f} f0={183} dur={11} x={272} y={452} size={30} color={WB.blue}
          opacity={crossFade(f, 200)} />
        <InkPath d={gCrossOut(266, 462, 208, 170)} f={f} f0={194} dur={12} color={WB.red} width={5} />

        {/* ============ S03（f212-293 HERO）：弹开了！+ 散射铺蓝天 ============ */}
        <HandText text="弹开了！" f={f} f0={212} dur={9} x={296} y={492} size={36} color={WB.red} />
        <InkPath d={gCirc(376, 514, 126, 30, 200)} f={f} f0={221} dur={11} color={WB.red} width={5} />

        {/* 更多的弹开：M1 向左上天空、M3 向右下（散射四面八方） */}
        <InkPath d={gLine(262, 242, M1[0] - 13, M1[1] - 12, 210, 6)} f={f} f0={232} dur={8} color={WB.blue} width={6} />
        <InkPath d={gHead(M1[0] - 13, M1[1] - 12, 370, 309, 17)} f={f} f0={232} delay={8} dur={2} color={WB.blue} width={6} />
        <InkPath d={gStar(M1[0], M1[1], 30, 215)} f={f} f0={242} dur={2} color={WB.blue} width={4} pen={false} />
        <InkPath d={gZig(M1[0] - 10, M1[1] - 12, 348, 258, 4, 13, 220)}
          f={f} f0={244} dur={3.5} color={WB.blue} width={5.5} />
        <InkPath d={gHead(348, 258, M1[0] - 10, M1[1] - 12, 17)} f={f} f0={244} delay={3.5} dur={1.5} color={WB.blue} width={5.5} />
        <InkPath d={gLine(280, 248, M3[0] - 13, M3[1] - 11, 230, 6)} f={f} f0={250} dur={8} color={WB.blue} width={6} />
        <InkPath d={gHead(M3[0] - 13, M3[1] - 11, 608, 322, 17)} f={f} f0={250} delay={8} dur={2} color={WB.blue} width={6} />
        <InkPath d={gStar(M3[0], M3[1], 30, 235)} f={f} f0={260} dur={2} color={WB.blue} width={4} pen={false} />
        <InkPath d={gZig(M3[0] + 10, M3[1] - 10, 1102, 478, 4, 14, 240)}
          f={f} f0={262} dur={3.5} color={WB.blue} width={5.5} />
        <InkPath d={gHead(1102, 478, M3[0] + 10, M3[1] - 10, 17)} f={f} f0={262} delay={3.5} dur={1.5} color={WB.blue} width={5.5} />

        {/* HERO 蓝天铺色（f270-287，67.7-71.9%；BGM drop 8.3s=f249 对位 shimmer）：斜向排线逐根 stagger（马克侧锋阴影画法） */}
        {gHatchSet(580, 352, 668, 208, 10, 58, 260).map(({d, delay}, i) => (
          <InkPath key={i} d={d} f={f} f0={270} delay={delay * 1.5} dur={3} color={WB.wash} width={17} pen={false} opacity={0.85} />
        ))}

        {/* 散射圈注（红墨强调批注，f288-303） */}
        <HandText text="散射" f={f} f0={288} dur={7} x={836} y={200} size={44} color={WB.red} />
        <InkPath d={gCirc(898, 228, 112, 36, 250)} f={f} f0={295} dur={8} color={WB.red} width={5} />

        {/* ============ S04（f300-352）：抬头看 + 结论 ============ */}
        {/* 小人抬头（f302-318） */}
        <MarkerStroke pts={circPts(1075, 520, 26, 25, 300)} f={f} f0={302} dur={5} color={WB.ink} size={6} penScale={0.8} />
        <InkPath d={gLine(1063, 514, 1067, 517, 305, 0.8) + ' M 1081 512 L 1085 515'} f={f} f0={307} dur={1} color={WB.ink} width={3} pen={false} />
        <InkPath d={gLine(1065, 528, 1083, 528, 306, 1.5)} f={f} f0={308} dur={1} color={WB.ink} width={3} pen={false} />
        <InkPath d={gLine(1075, 546, 1075, 606, 310, 2)} f={f} f0={309} dur={4} color={WB.ink} width={5} />
        <InkPath d={gLine(1075, 606, 1052, 640, 311, 1.5) + ' M 1075 606 L 1098 640'} f={f} f0={313} dur={3} color={WB.ink} width={5} />
        <InkPath d={gLine(1075, 556, 1032, 522, 315, 2)} f={f} f0={316} dur={3} color={WB.ink} width={5} />

        {/* 视线（细墨线指向蓝天，f322-330，末 2 帧补小箭头） */}
        <InkPath d={gLine(1048, 506, 806, 336, 320, 5)} f={f} f0={322} dur={7} color={WB.ink} width={3} opacity={0.45} />
        <InkPath d={gHead(806, 336, 920, 418, 14)} f={f} f0={322} delay={7} dur={2} color={WB.ink} width={3} opacity={0.45} />

        {/* 结论 + 红墨双下划线（f333-355，置于中下空区：避开划掉簇/红光箭头/小红光标签） */}
        <HandText text="天是蓝的" f={f} f0={333} dur={15} x={680} y={528} size={56} align="center" color={WB.blue} />
        <InkPath d={gUnder(566, 602, 796, 330)} f={f} f0={348} dur={8} color={WB.red} width={5} />

        {/* ============ 结尾定帧（f356-391，1.2s）：笔尖悬停微颤（禁全静止） ============ */}
        {f >= 356 && f <= 391 ? <PenTip x={796} y={594} f={f} color={WB.red} scale={0.9} tremble /> : null}
      </BoardCam>

      {/* ============ 字幕条（底部同步，白板格式签名） ============ */}
      <SubBar f={f} />

      {/* ============ 末段轻收暗（f392-399 渐至 0.26，非黑场） ============ */}
      {f > 392 ? (
        <div style={{position: 'absolute', inset: 0, background: '#1c1c20',
          opacity: (0.26 * Math.min(1, (f - 392) / 7)).toFixed(3), pointerEvents: 'none'}} />
      ) : null}
    </Board>
  );
};
