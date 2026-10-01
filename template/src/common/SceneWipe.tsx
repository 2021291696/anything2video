import React from 'react';
import {getActiveRecipe} from '../recipes';
import {rnd, clamp01, easeInOutCubic, easeOutCubic} from './easing';

export type SceneWipeKind = 'bar' | 'slice' | 'flash' | 'shatter' | 'checker' | 'none';

/**
 * 转场组件（方案 U6）：六种纯 CSS 代码绘制转场，统一 16 帧预算（len 缺省 16，promo-style-guide 的两镜过渡 ≤16 帧由缺省值落实）。
 * 纪律：
 * - 全部是帧号 N 的纯函数；随机只用 common/easing 的 rnd 种子约定（同 Glitch.tsx 的 rnd(seed, N, b, salt) 用法），禁 Math.random，逐帧可复现。
 * - 挂在换镜处的全屏覆盖层（内容之上）：镜头切换由分镜 Sequence 本身完成，本组件只做视觉标点，不遮挡、不参与场景逻辑。
 * - 不产生任何 SVG filter 实例（发光用 boxShadow / 渐变，不进 ≤6 的 filter 预算）。
 * 单帧节点数（含容器）：bar 2 ｜ slice 5 ｜ flash 1 ｜ shatter 25 ｜ checker 145 ｜ none 0 —— 全部 ≤600 DOM 红线；
 * checker 达 145，仅建议 promo 换章等低频节点使用。
 * accent 取自当前配方（getActiveRecipe().palette.accent，约定 6 位 hex），调用处不传色。
 */
export const SceneWipe: React.FC<{N: number; f0: number; kind: SceneWipeKind; len?: number; dir?: 'left' | 'right'; seed?: number}> = ({N, f0, kind, len = 16, dir = 'right', seed = 7}) => {
  if (kind === 'none') return null; // 显式表达「这一刀是硬切」：不渲染任何节点
  const n = N - f0;

  if (kind === 'bar') {
    // 竖向色条（宽 220px）自 dir 侧扫过：进 len 帧（dir 侧离屏 → 画面中线），出 len−4 帧（中线 → 对侧离屏）。
    // 单帧 2 节点（无容器：色条本体 + 行进前缘发丝线，绝对定位锚定外层 Sequence/AbsoluteFill）。
    const w = 220;
    const outDur = Math.max(1, len - 4);
    const total = len + outDur;
    if (n < 0 || n >= total) return null;
    const fromRight = dir !== 'left';
    const xStart = fromRight ? 1280 : -w;
    const xEnd = fromRight ? -w : 1280;
    const xMid = 640 - w / 2;
    const x = n < len ? xStart + (xMid - xStart) * easeInOutCubic(n / len) : xMid + (xEnd - xMid) * easeInOutCubic((n - len) / outDur);
    const acc = getActiveRecipe().palette.accent;
    return (
      <React.Fragment>
        <div style={{position: 'absolute', left: x, top: 0, width: w, height: 720, background: `linear-gradient(${fromRight ? '270deg' : '90deg'}, ${acc}00 0%, ${acc}CC 30%, ${acc} 100%)`, boxShadow: `0 0 28px 3px ${acc}55`, pointerEvents: 'none'}} />
        <div style={{position: 'absolute', left: fromRight ? x - 2 : x + w, top: 0, width: 2, height: 720, background: '#FFFFFF', opacity: 0.65, pointerEvents: 'none'}} />
      </React.Fragment>
    );
  }

  if (kind === 'slice') {
    // 4 条水平带（各 180px 高）按对错位进出：各带扫入延迟由 rnd(seed, b, 11) 决定（帧间稳定、换 seed 即换编排），
    // 带内水平位移按 Glitch.tsx 的 rnd(seed, N, b, 32) 约定逐帧抖动（幅 22px、两端收零的三角包络）。
    // 单帧 ≤5 节点（容器 + 4 带，扫完的带提前卸载）。
    if (n < 0 || n >= len) return null;
    const H = 180;
    const sweep = Math.max(1, len - 5);
    const acc = getActiveRecipe().palette.accent;
    return (
      <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden'}}>
        {[0, 1, 2, 3].map((b) => {
          const p = clamp01((n - rnd(seed, b, 11) * 4) / sweep);
          if (p <= 0 || p >= 1) return null;
          const fromRight = rnd(seed, b, 12) < 0.5;
          const env = 1 - Math.abs(2 * p - 1);
          const jit = (rnd(seed, N, b, 32) * 2 - 1) * 22 * env;
          const xStart = fromRight ? 1280 : -240;
          const xEnd = fromRight ? -240 : 1280;
          const x = xStart + (xEnd - xStart) * p + jit;
          return <div key={b} style={{position: 'absolute', left: x, top: b * H, width: 240, height: H - 2, background: `linear-gradient(90deg, ${acc}22, ${acc}88 50%, ${acc}22)`, boxShadow: `0 0 14px 1px ${acc}33`}} />;
        })}
      </div>
    );
  }

  if (kind === 'flash') {
    // ⚠ 须登记分镜表闪烁白名单（lessons：闪烁合规检查必须把覆盖层单独列条目）——
    // 固定 4 帧单次白闪 [.9, .5, .22, 0]，不循环、不叠加；len 参数对 flash 无效（序列即预算）。
    const SEQ = [0.9, 0.5, 0.22, 0];
    if (n < 0 || n >= SEQ.length) return null;
    return <div style={{position: 'absolute', inset: 0, background: '#FFFFFF', opacity: SEQ[n], pointerEvents: 'none'}} />; // 1 节点
  }

  if (kind === 'shatter') {
    // 星点爆散：24 颗从画面中心 (640,360) 按确定性角度外飞并淡出。轨迹参数按 rnd(seed, i, salt) 预定（帧间稳定），
    // 位置/透明度是 n 的纯函数。单帧 ≤25 节点（容器 + 24 星点，飞完的提前卸载）。
    const dur = Math.max(1, len - 3);
    if (n < 0 || n >= len) return null;
    const acc = getActiveRecipe().palette.accent;
    return (
      <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
        {Array.from({length: 24}, (_, i) => {
          const pi = clamp01((n - rnd(seed, i, 41) * 3) / dur);
          if (pi >= 1) return null;
          const ang = rnd(seed, i, 42) * Math.PI * 2;
          const dist = (140 + rnd(seed, i, 43) * 460) * easeOutCubic(pi);
          const size = 3 + rnd(seed, i, 44) * 5;
          const col = rnd(seed, i, 45) < 0.4 ? acc : '#FFFFFF';
          return (
            <div key={i} style={{position: 'absolute', left: 640 + Math.cos(ang) * dist - size / 2, top: 360 + Math.sin(ang) * dist - size / 2, width: size, height: size, background: col, opacity: 1 - pi, transform: rnd(seed, i, 46) > 0.5 ? 'rotate(45deg)' : undefined, borderRadius: 1}} />
          );
        })}
      </div>
    );
  }

  if (kind === 'checker') {
    // 棋盘翻格：16×9（格边 80px）共 144 格，按对角序 c+r 逐格 scaleX 翻入（前 45% 帧盖满），再同序对称翻出；
    // 翻出未完成的格子随 n ≥ len 整层卸载（收口即硬切，与转场语义一致）。单帧 145 节点（容器 + 144 格，未翻入的格子直接不渲染）。
    // 仅建议 promo 换章等低频节点使用。
    if (n < 0 || n >= len) return null;
    const CELL = 80, COLS = 16, ROWS = 9, MAXO = COLS + ROWS - 2;
    const inDur = 5, outDur = 5;
    const coverSpan = len * 0.45;
    const acc = getActiveRecipe().palette.accent;
    return (
      <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden'}}>
        {Array.from({length: COLS * ROWS}, (_, k) => {
          const c = k % COLS, r = Math.floor(k / COLS);
          const o = c + r;
          const inAt = (o / (MAXO + 1)) * Math.max(0, coverSpan - inDur);
          const outAt = len - inAt - outDur; // 对称翻出；o=0 格恰在 n=len 收口前一刻翻完
          const sx = n < inAt ? 0 : n < inAt + inDur ? easeOutCubic((n - inAt) / inDur) : n < outAt ? 1 : n < outAt + outDur ? 1 - easeOutCubic((n - outAt) / outDur) : 0;
          if (sx <= 0) return null;
          return <div key={k} style={{position: 'absolute', left: c * CELL, top: r * CELL, width: CELL, height: CELL, background: (c + r) % 2 === 0 ? acc : 'rgba(255,255,255,0.12)', transform: `scaleX(${sx.toFixed(3)})`}} />;
        })}
      </div>
    );
  }

  return null; // 未知 kind 兜底：不渲染
};
