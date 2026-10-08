import React from 'react';
import {CX, CY, MAG, CYA, AMB, BLU, VIO, CORE, breathDir, tri, prog, lerp, clamp,
  T_LIDS, S02, S03, S04, T_FREEZE, BREATH_P} from './kit';

/**
 * 眼睛总成（签名①同心环恒速收缩 + ⑤互补色对暗底辉光 + ⑥呼吸循环）：
 * 钩子（f1-16）：黑暗水平光缝 scaleX 张开 → 眼睑开合（整组 scaleY 线性）→ f10 首环收缩启动（0.33s）。
 * 虹膜：7 同心环 + 28 辐条 + 瞳孔白芯；环半径 = base × (1 + 全局呼吸 ±0.055 + 逐环相位波 ±0.04)——
 * 全部三角波线性往复（恒速），相位逐环递增 10f 形成向外的收缩行波；残影回声环（f-10，α0.10）作催眠拖尾。
 * S02 起吞环：外缘环恒速缩入瞳孔（birth_i 间隔 30+3i f 逐圈变慢 =「一圈又一圈，越来越慢」的字面化）。
 * S03 下潜：整眼 scale 1→1.9 线性放大淡出（α0.22），化作隧道洞口的余像。
 */

const RING_BASE = [46, 64, 84, 106, 130, 154];
const RING_COL = [CYA, MAG, BLU, AMB, CYA, MAG];
const SPOKES = 28;
/** 吞环出生帧表：f84 起，间隔 30+3i（逐圈更慢），寿命 82+4i，共 8 环覆盖 S02-S04a */
const BIRTHS: number[] = (() => { const a: number[] = []; let t = S02 + 6; for (let i = 0; i < 8; i++) { a.push(t); t += 30 + i * 3; } return a; })();

const almondPath = (rx: number, ry: number): string =>
  `M ${CX - rx} ${CY} Q ${CX} ${CY - ry * 1.62} ${CX + rx} ${CY} Q ${CX} ${CY + ry * 1.62} ${CX - rx} ${CY}`;

export const Eye: React.FC<{f: number}> = ({f}) => {
  // ---- 全局包络
  const lid = lerp(0.045, 1, prog(f, T_LIDS, 14));                       // 眼睑开合（线性）
  const eyeAlpha = f < S03 ? 1 : lerp(1, 0.22, prog(f, S03, 90));       // 下潜淡出
  const dive = prog(f, S03, 90);                                        // 下潜进度
  const scale = lerp(1, 1.9, dive);
  const bd = breathDir(f);
  const still = prog(f, T_FREEZE, 30);                                  // 定帧后运动残余 12%
  const spd = lerp(1, 0.12, still);

  // ---- 瞳孔辉光呼吸（大面积亮度调制 0.25Hz，合规档）
  const glow = 0.72 + 0.22 * bd * lerp(1, 0.35, still);

  return (
    <g opacity={eyeAlpha} transform={`translate(${CX} ${CY}) scale(${scale.toFixed(4)}) translate(${-CX} ${-CY})`}>
      <g transform={`translate(${CX} ${CY}) scale(${lid.toFixed(4)}) translate(${-CX} ${-CY})`}>
        <defs>
          <clipPath id="hyp-almond"><path d={almondPath(330, 172)} /></clipPath>
          <clipPath id="hyp-iris"><circle cx={CX} cy={CY} r={168} /></clipPath>
        </defs>
        {/* 眼轮廓（杏仁形，青描边辉光） */}
        <g filter="url(#hyp-glow)">
          <path d={almondPath(330, 172)} fill="rgba(10,4,22,0.72)" stroke={CYA} strokeWidth={2.4} />
          <path d={almondPath(322, 166)} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={0.9} />
        </g>
        <g clipPath="url(#hyp-almond)">
          <g filter="url(#hyp-glow)">
            {/* 虹膜底盘（品红辉光面） */}
            <circle cx={CX} cy={CY} r={168} fill="rgba(255,62,157,0.10)" />
            <circle cx={CX} cy={CY} r={168} fill="none" stroke={MAG} strokeWidth={2.2} opacity={0.9} />
            {/* 残影回声环（相位 -10f，α0.10 催眠拖尾） */}
            <g opacity={0.1}>
              {RING_BASE.map((r, k) => (
                <circle key={`e${k}`} cx={CX} cy={CY}
                  r={ringR(r, k, f - 10, spd)} fill="none" stroke={RING_COL[k]} strokeWidth={2.2} />
              ))}
            </g>
            {/* 虹膜同心环（恒速收缩行波） */}
            {RING_BASE.map((r, k) => (
              <circle key={k} cx={CX} cy={CY} r={ringR(r, k, f, spd)} fill="none"
                stroke={RING_COL[k]} strokeWidth={2.2} opacity={0.95} />
            ))}
            {/* 辐条（恒速慢旋 6°/s，定帧后 ×0.12） */}
            <g opacity={0.3}>
              {Array.from({length: SPOKES}, (_, i) => {
                const a = ((i * (360 / SPOKES) + f * 0.2 * spd) * Math.PI) / 180;
                const c = i % 4 === 0 ? MAG : CYA;
                return <line key={i} x1={CX + 36 * Math.cos(a)} y1={CY + 36 * Math.sin(a)}
                  x2={CX + 160 * Math.cos(a)} y2={CY + 160 * Math.sin(a)} stroke={c} strokeWidth={1} />;
              })}
            </g>
            {/* 瞳孔：黑洞 + 白芯环 + 呼吸辉光 */}
            <circle cx={CX} cy={CY} r={27} fill="#05020a" />
            <circle cx={CX} cy={CY} r={28.5} fill="none" stroke={CORE} strokeWidth={1.4} opacity={0.92} />
            <circle cx={CX} cy={CY} r={lerp(14, 34, (glow - 0.5) / 0.44)} fill={VIO} opacity={(glow - 0.5) * 0.9} filter="url(#hyp-soft)" />
          </g>
        </g>
        {/* 吞环（全帧域，不被杏仁裁剪）：外缘恒速缩入瞳孔，一圈又一圈 */}
        <g filter="url(#hyp-glow)">
          {BIRTHS.map((b, i) => {
            const life = 82 + i * 4;
            const age = (f - b) / life;
            if (age < 0 || age >= 1) return null;
            const r = lerp(470, 34, age); // 线性（恒速）
            const a = 0.7 * clamp(age / 0.12) * (1 - prog(age, 0.86, 0.14));
            return <circle key={`s${i}`} cx={CX} cy={CY} r={r} fill="none"
              stroke={i % 2 ? CYA : MAG} strokeWidth={3} opacity={a} />;
          })}
        </g>
      </g>
      {/* 下潜期中心光点（隧道洞口前置辉光，随 dive 增强） */}
      {dive > 0 ? (
        <circle cx={CX} cy={CY} r={lerp(10, 26, dive)} fill={CORE}
          opacity={dive * 0.5 * (0.8 + 0.2 * bd)} filter="url(#hyp-soft)" />
      ) : null}
    </g>
  );
};

/** 钩子光缝透明度（f1-6 张开，f6-16 淡出；Scene 以 HTML 层渲染） */
export const slitAlpha = (f: number): number => (f <= 16 ? 1 - prog(f, 6, 10) : 0);

/** 虹膜环半径：base × (1 + 全局呼吸 0.055·bd + 逐环相位三角波 0.04)，全部线性恒速；行波幅度随吞环段衰减 1→0.3 */
const ringR = (base: number, k: number, f: number, spd: number): number => {
  const bd = breathDir(f);
  const waveAmp = 0.04 * lerp(1, 0.3, prog(f, S02, 160));
  const wave = (tri((f - k * 10) / BREATH_P) * 2 - 1) * waveAmp;
  return base * (1 + (0.055 * bd + wave) * spd);
};
