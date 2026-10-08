// ============================================================================
// kit.tsx — gold-robe 图元库 React 层（克里姆特金色时期 · 战役 4 批次④ D2）
// 世界层 = SceneCanvas（整景 canvas 每帧矢量重画；金箔墙/花毯底为模块级缓存位图）
// 转场层 = 钩子金箔铺开（paintFrame 内置 compositeReveal，f1-26）
// 信息层 = TitleCard / EndCard / KlimtCaption / StyleTag / MotifChips
// 纪律：全确定性（mulberry32/解析时间函数，禁 Math.random/Date）。
// 技法借鉴 huashu-art-motion scenes/18_klimt.js (MIT, alchaincyf)，TSX 重写零代码拷贝。
// ============================================================================
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {W, H, FPS} from '../common';
import {paintFrame} from './scene';
import {MOTIFS, waveR} from './figures';
import {inv, outBack, outC, lerp2} from './gold';

// ---- 整景画布：每帧重画（墙/花毯底为模块级缓存，热帧只做位图搬运 + 矢量件）----
export const SceneCanvas: React.FC<{absF: number}> = ({absF}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useLayoutEffect(() => {
    const g = ref.current?.getContext('2d');
    if (g) paintFrame(g, absF);
  }, [absF]);
  return <canvas ref={ref} width={W} height={H} style={{position: 'absolute', left: 0, top: 0, display: 'block'}} />;
};

const hash1 = (n: number) => {
  let a = (Math.floor(n) * 2654435761) % 2147483647;
  a = (a ^ 61) ^ (a >>> 16);
  a = (a + (a << 3)) | 0;
  a = a ^ (a >>> 4);
  a = Math.imul(a, 0x27d4eb2d);
  return (((a ^ (a >>> 15)) >>> 0) % 10000) / 10000;
};

// ---- 分离派黑白格装饰条 ----
export const Checker: React.FC<{w: number; cell?: number; style?: React.CSSProperties}> = ({w, cell = 9, style}) => {
  const n = Math.ceil(w / cell);
  return (
    <div style={{display: 'flex', ...style}}>
      {Array.from({length: n}, (_, i) => (
        <div key={i} style={{width: cell, height: cell, background: i % 2 ? '#f4efe2' : '#141010'}} />
      ))}
    </div>
  );
};

// ---- 标题卡（钩子后拍入；深褐底卡 + 金渐变字 + 黑白格饰条）----
export const TitleCard: React.FC<{f: number; at: number; small?: boolean}> = ({f, at, small}) => {
  const u = outBack(inv(at, at + 8, f), 1.9);
  const out = 1 - inv(at + 56, at + 64, f);
  if (u <= 0 || out <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: small ? 84 : 88, textAlign: 'center',
      transform: `scale(${(0.86 + 0.14 * u).toFixed(3)})`, opacity: Math.min(u, out), zIndex: 30}}>
      <div style={{display: 'inline-block', background: 'rgba(20,13,5,0.86)', border: '2px solid #d6a845',
        borderRadius: 14, padding: '14px 46px 12px', boxShadow: '0 8px 26px rgba(15,8,0,0.6)'}}>
        <Checker w={272} style={{margin: '0 auto 8px', justifyContent: 'center'}} />
        <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 900, fontSize: small ? 50 : 58, letterSpacing: 10,
          background: 'linear-gradient(180deg,#fbe6a0 0%,#e8c05c 55%,#c8962e 100%)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          filter: 'drop-shadow(0 3px 8px rgba(10,5,0,0.85))'}}>金袍下的两个人</div>
        <div style={{marginTop: 6, fontFamily: "'Audiowide', sans-serif", fontSize: 16, letterSpacing: 5,
          color: '#e8cf86'}}>KLIMT · THE KISS · 1908</div>
        <Checker w={272} style={{margin: '8px auto 0', justifyContent: 'center'}} />
      </div>
    </div>
  );
};

// ---- 收束小样（f350 回场：金袍之下 · 爱是立体的）----
export const EndCard: React.FC<{f: number; at: number}> = ({f, at}) => {
  const u = outBack(inv(at, at + 8, f), 1.9);
  if (u <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 92, textAlign: 'center',
      transform: `scale(${(0.88 + 0.12 * u).toFixed(3)})`, opacity: Math.min(u, 1), zIndex: 30}}>
      <div style={{display: 'inline-block', background: 'rgba(20,14,8,0.88)', border: '2px solid #d6a845',
        borderRadius: 12, padding: '12px 34px', boxShadow: '0 6px 22px rgba(20,10,0,0.5)'}}>
        <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 900, fontSize: 34, letterSpacing: 8,
          color: '#f4e6c2'}}>金袍之下 · 爱是立体的</div>
      </div>
    </div>
  );
};

// ---- 字幕卡（深褐金边卡 + 奶油字，衬克里姆特深色调）----
export const KlimtCaption: React.FC<{f: number; from: number; to: number; text: string}> = ({f, from, to, text}) => {
  const u = outBack(inv(from, from + 5, f), 2.0);
  const out = 1 - inv(to - 3, to, f);
  if (u <= 0 || f > to || out <= 0) return null;
  const rot = (hash1(from) - 0.5) * 1.4;
  return (
    <div style={{position: 'absolute', left: '50%', bottom: 34, zIndex: 40,
      transform: `translateX(-50%) rotate(${rot.toFixed(2)}deg) scale(${(0.82 + 0.18 * u).toFixed(3)})`,
      opacity: Math.min(u, out)}}>
      <div style={{background: 'rgba(22,14,6,0.92)', borderRadius: 10, padding: '10px 26px',
        border: '2px solid #d6a845', boxShadow: '0 5px 16px rgba(20,10,0,0.5), inset 0 0 0 2px rgba(20,16,16,1)',
        fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: 30, color: '#f4e6c2', letterSpacing: 3}}>
        {text}
      </div>
    </div>
  );
};

// ---- 风格标签（对比可视化小签）----
export const StyleTag: React.FC<{f: number; at: number; x: number; y: number; text: string; col?: string}> = ({f, at, x, y, text, col = '#141010'}) => {
  const u = outBack(inv(at, at + 6, f), 2.0);
  if (u <= 0) return null;
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `scale(${(0.7 + 0.3 * u).toFixed(3)})`,
      opacity: Math.min(1, u * 1.5), zIndex: 32}}>
      <div style={{background: 'rgba(244,239,226,0.95)', border: `2px solid ${col}`, borderRadius: 8,
        padding: '5px 14px', fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: 19,
        color: col, letterSpacing: 2, whiteSpace: 'nowrap', boxShadow: '2px 3px 0 rgba(20,10,0,0.35)'}}>{text}</div>
    </div>
  );
};

// ---- 四类纹样点名（SC04）：从袍内真实纹样位置引线出牌 ----
const CHIP_DEFS = [
  {name: '同心圆', key: 'circle', col: '#2a4a9a'},
  {name: '螺旋', key: 'spiral', col: '#3a2410'},
  {name: '眼形纹', key: 'eye', col: '#8a2a2a'},
  {name: '点簇', key: 'dots', col: '#3a5ab0'},
];
export const MotifChips: React.FC<{f: number; at: number}> = ({f, at}) => {
  // 每类取一个代表纹样（按 k 分档第一颗）
  const reps = CHIP_DEFS.map((def) => {
    const range = def.key === 'circle' ? [0, 0.3] : def.key === 'spiral' ? [0.3, 0.62] : def.key === 'eye' ? [0.62, 0.84] : [0.84, 1];
    const m = MOTIFS.find((mm) => mm.k >= range[0] && mm.k < range[1]) ?? MOTIFS[0];
    return {def, m};
  });
  return (
    <>
      {reps.map(({def, m}, i) => {
        const u = outBack(inv(at + i * 7, at + i * 7 + 7, f), 2.1);
        if (u <= 0) return null;
        const side = m.x < 640 ? 96 : 1000;
        const chipY = 128 + i * 64;
        const x1 = side + (side < 640 ? 150 : 0);
        const y1 = chipY + 18;
        return (
          <div key={def.key} style={{opacity: Math.min(1, u * 1.4)}}>
            <svg width={1280} height={720} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 31}}>
              <line x1={lerp2(x1, m.x, outC(u))} y1={y1} x2={m.x} y2={m.y} stroke={def.col} strokeWidth={2}
                strokeDasharray="5 5" opacity={0.8} />
              <circle cx={m.x} cy={m.y} r={5 + 26 * (1 - outC(u))} fill="none" stroke={def.col} strokeWidth={2.5}
                opacity={0.9 * (1 - outC(u) * 0.4)} />
            </svg>
            <div style={{position: 'absolute', left: side, top: chipY, transform: `scale(${(0.7 + 0.3 * u).toFixed(3)})`, zIndex: 32}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(244,239,226,0.95)',
                border: `2px solid ${def.col}`, borderRadius: 9, padding: '4px 13px',
                boxShadow: '2px 3px 0 rgba(20,10,0,0.35)'}}>
                <MiniMotif kind={def.key} col={def.col} spin={f * 0.06 + i} />
                <span style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: 20,
                  color: '#141010', letterSpacing: 2}}>{def.name}</span>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

// ---- 迷你纹样图示（SVG，静态形 + 可选旋转）----
export const MiniMotif: React.FC<{kind: string; col: string; spin?: number}> = ({kind, col, spin = 0}) => {
  if (kind === 'circle') {
    return (
      <svg width={26} height={26}>
        <circle cx={13} cy={13} r={11} fill="#2a4a9a" /><circle cx={13} cy={13} r={7.5} fill="#f4efe2" /><circle cx={13} cy={13} r={4.4} fill="#c03a2a" />
      </svg>
    );
  }
  if (kind === 'spiral') {
    const d = Array.from({length: 42}, (_, i) => {
      const a = (i / 42) * Math.PI * 5.2, r = 11 * (i / 42);
      return `${i ? 'L' : 'M'} ${(13 + Math.cos(a + spin) * r).toFixed(1)} ${(13 + Math.sin(a + spin) * r).toFixed(1)}`;
    }).join(' ');
    return (
      <svg width={26} height={26}>
        <circle cx={13} cy={13} r={12} fill="#3a2410" />
        <path d={d} fill="none" stroke="#f2cf6a" strokeWidth={1.8} />
      </svg>
    );
  }
  if (kind === 'eye') {
    return (
      <svg width={30} height={26}>
        <path d="M 3 13 Q 15 -1 27 13 Q 15 27 3 13 Z" fill="#f6f0e0" stroke="#1d140c" strokeWidth={1.6} />
        <circle cx={15} cy={13} r={4} fill={col} />
        <path d="M 1 12 Q 15 -4 29 12" fill="none" stroke="#1d140c" strokeWidth={1.6} />
      </svg>
    );
  }
  return (
    <svg width={26} height={26}>
      {[0, 1.26, 2.51, 3.77, 5.03].map((a, i) => (
        <circle key={i} cx={13 + Math.cos(a) * 7} cy={13 + Math.sin(a) * 7} r={2.6} fill="#f4efe2" stroke="#c9bda0" strokeWidth={0.6} />
      ))}
      <circle cx={13} cy={13} r={3.2} fill="#c03a2a" />
      <circle cx={13} cy={13} r={13} fill="none" stroke={col} strokeWidth={0} />
    </svg>
  );
};

// ---- 激活波进度读数（SC05/SC06 角标：激活 n/150）----
export const WaveMeter: React.FC<{f: number; from: number; until?: number}> = ({f, from, until = 405}) => {
  if (f < from || f > until) return null;
  const t = f / FPS;
  const R = waveR(t);
  const n = MOTIFS.filter((m) => m.dist <= R).length;
  const u = outC(inv(from, from + 8, f));
  return (
    <div style={{position: 'absolute', right: 46, top: 120, opacity: u, zIndex: 33}}>
      <div style={{background: 'rgba(22,14,6,0.88)', border: '2px solid #d6a845', borderRadius: 10, padding: '8px 16px',
        fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: 21, color: '#f4e6c2', letterSpacing: 2}}>
        激活 <span style={{color: '#fbe6a0', fontVariantNumeric: 'tabular-nums'}}>{String(n).padStart(3, ' ')}</span> / 150
      </div>
    </div>
  );
};

// ---- 暗角 ----
export const Vignette: React.FC = () => (
  <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50,
    background: 'radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 60%, rgba(26,14,2,0.4) 100%)'}} />
);
