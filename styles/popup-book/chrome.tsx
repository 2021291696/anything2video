import React from 'react';
import {SUBS} from '../common/subs';
import {EASE, PAPER, TL, midX} from './world';
import {FoldUp, Grain, Tape, paperFace} from './kit';
import {BookSurface} from './Book';

/**
 * chrome.tsx — 镜头覆盖层件（全部接收绝对帧号 f）：
 * 标题立体卡（钩子）/ 角标书签 / 拉页转场（签名特征 5）/ 纸标签 / 底部纸质字幕贴。
 */

// ---------------------------------------------------------------- 标题立体卡（钩子：f3 折起，f13 内成形 ≈0.4s < 0.5s）
export const TitleLockup: React.FC<{f: number}> = ({f}) => {
  const lift = foldLiftQuick(f, 3);
  if (lift <= 0.001) return null;
  return (
    <div style={{position: 'absolute', left: midX(640, f), top: 204, width: 560, height: 158, zIndex: 45,
      transform: `translateX(-50%) scale(${0.86 + 0.14 * Math.min(1, lift)})`, transformOrigin: '50% 100%', perspective: 1100}}>
      <div style={{position: 'absolute', inset: 0, ...paperFace(PAPER.surface, {borderRadius: 10}),
        transformOrigin: '50% 100%', transform: `rotateX(${90 - 100 * lift}deg)`, opacity: EASE.clamp01(lift * 6)}}>
        <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8}}>
          <div style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 900, fontSize: 52, letterSpacing: 3, color: PAPER.ink, transform: 'scaleX(0.97)'}}>
            一杯咖啡的旅程
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
            <div style={{width: 46, height: 3, borderRadius: 2, background: PAPER.accent}} />
            <div style={{fontFamily: "'Fraunces', 'Noto Sans SC', serif", fontWeight: 700, fontSize: 21, letterSpacing: 2, color: PAPER.accentInk}}>
              从豆子到杯子 · 纸上立体书
            </div>
            <div style={{width: 46, height: 3, borderRadius: 2, background: PAPER.accent}} />
          </div>
        </div>
        {/* 卡面两枚胶带贴角（贴在页上的纸卡） */}
        <Tape x={-16} y={-8} rot={-9} w={62} z={2} />
        <Tape x={514} y={-8} rot={8} w={62} z={2} />
      </div>
    </div>
  );
};
/** 钩子专用快折（w22：f0+4 帧过 50%，f0+10 帧≈97%）。 */
const foldLiftQuick = (f: number, t0: number) => {
  if (f < t0) return 0;
  return Math.max(0, Math.min(1.09, EASE.spring((f - t0) / 30, 22, 0.55)));
};

// ---------------------------------------------------------------- 角标书签（页 2 起常驻左上：深墨书签 + 纸小签，自上滑入）
export const CornerChip: React.FC<{f: number}> = ({f}) => {
  const on = EASE.easeOutCubic((f - 122) / 10);
  if (on <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 56, top: -146 + 146 * on, zIndex: 45, display: 'flex', alignItems: 'flex-start',
      filter: 'drop-shadow(0 8px 8px rgba(74,50,34,0.30))'}}>
      <div style={{width: 54, height: 92, padding: '14px 0 26px', background: PAPER.ink, color: PAPER.surface,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 84%, 0 100%)',
        fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 22, lineHeight: 1}}>★</div>
      <div style={{marginTop: 22, padding: '8px 20px 10px 16px', ...paperFace(PAPER.surface),
        fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: 2, color: PAPER.ink, whiteSpace: 'nowrap'}}>
        一杯咖啡的旅程
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 拉页转场（签名特征 5：整帧新页自右滑入 + 左缘单向阴影，0.55s 窗口，落定卸载零跳变）
export const PageTurn: React.FC<{f: number; from: number; to: number}> = ({f, from, to}) => {
  if (f < from || f > to) return null;
  const p = EASE.easeInOutPow((f - from) / (to - from), 2.3);
  const x = 1280 * (1 - p);
  const shOp = p < 0.7 ? 0.34 + 0.12 * p : Math.max(0, 0.42 * (1 - (p - 0.7) / 0.3)); // 阴影只在窗口内，落定移除
  return (
    <div style={{position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none'}}>
      {/* 新页表面 = 常驻舞台逐帧复刻（含远景/近景/纸纹），落定卸载时与底下的舞台逐像素一致 */}
      <div style={{position: 'absolute', left: x, top: 0, width: 1280, height: 720, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: -x, top: 0, width: 1280, height: 720}}>
          <BookSurface f={f} />
        </div>
      </div>
      {/* 左缘单向阴影（新页投在旧页上；只在窗口内，落定移除） */}
      <div style={{position: 'absolute', left: x - 92, top: 0, width: 92, height: 720, opacity: shOp,
        background: 'linear-gradient(90deg, transparent, rgba(58,38,24,0.42) 78%, rgba(58,38,24,0.5))',
        filter: 'blur(2px)'}} />
      {/* 页缘高光（纸厚度侧棱） */}
      <div style={{position: 'absolute', left: x - 3, top: 0, width: 3, height: 720, background: 'rgba(255,246,228,0.5)'}} />
    </div>
  );
};

// ---------------------------------------------------------------- 页码纸标签（各页左上的折起小签）
export const PageTag: React.FC<{f: number; t0: number; n: string; text: string}> = ({f, t0, n, text}) => (
  <FoldUp f={f} t0={t0} x={96} y={104} w={252} h={54} z={44}
    inner={
      <div style={{position: 'absolute', inset: 0, ...paperFace(PAPER.surface, {borderRadius: 8}),
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px 0 14px'}}>
        <div style={{width: 32, height: 32, borderRadius: '50%', background: PAPER.ink, color: PAPER.surface,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
          fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 17,
          boxShadow: 'inset 0 -3px 0 rgba(255,246,228,0.14)'}}>{n}</div>
        <div style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: 2, color: PAPER.ink, whiteSpace: 'nowrap'}}>{text}</div>
      </div>
    } />
);

// ---------------------------------------------------------------- 底部纸质字幕贴（白纸签 + 两枚胶带贴角，粘贴式入场）
export const PaperCaption: React.FC<{f: number}> = ({f}) => {
  const cur = SUBS.find((s) => f >= s.from - 2 && f <= s.to + 4);
  if (!cur) return null;
  const on = EASE.easeOutCubic((f - (cur.from - 2)) / 6);
  const off = 1 - EASE.easeOutCubic((f - (cur.to + 1)) / 5);
  const op = Math.min(on, off);
  if (op <= 0.01) return null;
  return (
    <div style={{position: 'absolute', left: 640, top: 655, zIndex: 85, opacity: op,
      transform: `translate(-50%,-50%) scale(${0.9 + 0.1 * on}) rotate(${(1 - on) * -1.6}deg)`, transformOrigin: '50% 100%'}}>
      <div style={{position: 'relative', padding: '12px 40px 15px', ...paperFace(PAPER.surface, {borderRadius: 6}),
        fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: 24, letterSpacing: 2,
        color: PAPER.ink, whiteSpace: 'nowrap', textAlign: 'center'}}>
        {cur.text}
        <Tape x={-22} y={-9} rot={-8} w={66} z={2} />
        <Tape right={-22} y={-9} rot={7} w={66} z={2} />
      </div>
    </div>
  );
};
