import React from 'react';
import {SUBS} from '../common/subs';
import {LAYER_SPEED, STOX, STOY, U, C30, S30, EASE} from './world';
import {ISO, MiniCube, camPan} from './kit';

/**
 * chrome.tsx — s34-iso 镜头覆盖层件（全部接收绝对帧号 f，由镜头组件传 Sequence.from+n）：
 * 标题锁排 / 站牌 / 字幕丸 / HUD / 蓝图纸扫掠 / 稿件纸 / 节拍卡 / 速度线 / 胶片飞出 / 收束卡。
 * 站点局部坐标经 midScreen() 随中景视差（0.8×）对位。
 */

/** 中景层世界格 → 当前屏幕坐标（含相机视差偏移）。 */
export const midScreen = (st: 'A' | 'B' | 'C', u: number, v: number, y = 0, f = 0) => ({
  x: STOX[st] + (u - v) * C30 * U - camPan(f) * LAYER_SPEED.mid,
  y: STOY + (u + v) * S30 * U - y * U,
});

const springPop = (f: number, f0: number) => Math.max(0.0001, EASE.spring((f - f0) / 30, 20, 0.5, 6));
/** 钩子专用快弹（w24：f0+4 帧即过 50%，f0+9 帧≈90%）。 */
const fastPop = (f: number, f0: number) => Math.max(0.0001, EASE.spring((f - f0) / 30, 24, 0.55, 8));

// ---------------------------------------------------------------- 标题锁排（SC01 钩子 f3 → f62-86 停靠左上常驻）
export const TitleLockup: React.FC<{f: number}> = ({f}) => {
  const pop = fastPop(f, 3);
  const dock = EASE.easeInOutPow(EASE.clamp01((f - 62) / 24), 2.4);
  const cx = 640 + (70 - 640) * dock;
  const cy = 116 + (46 - 116) * dock;
  const scale = (1 - 0.56 * dock) * pop;
  return (
    <div style={{position: 'absolute', left: cx, top: cy, transform: `translate(-50%,-50%) scale(${scale})`, opacity: pop, zIndex: 90, display: 'flex', alignItems: 'center', gap: 18}}>
      <MiniCube s={44} />
      <div>
        <div style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 900, fontSize: 46, letterSpacing: 2, color: ISO.ink, transform: 'scaleX(0.96)', lineHeight: 1.15, whiteSpace: 'nowrap'}}>
          一条视频的渲染小城
        </div>
        <div style={{marginTop: 4, fontFamily: 'Audiowide, sans-serif', fontSize: 13, letterSpacing: 4, color: '#7A72C4', opacity: 1 - dock, whiteSpace: 'nowrap'}}>A2V · ISOMETRIC MICRO CITY</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 站牌（①②③ 丸标，钉站顶）
export const StationLabel: React.FC<{f: number; n: string; text: string; st: 'A' | 'B' | 'C'; f0: number; u: number; v: number; y: number}> = ({f, n, text, st, f0, u, v, y}) => {
  const pop = springPop(f, f0);
  const p = midScreen(st, u, v, y, f);
  return (
    <div style={{position: 'absolute', left: p.x, top: p.y, transform: `translate(-50%,-50%) scale(${pop})`, zIndex: 80}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 8, background: '#FBFAFF', borderRadius: 999, padding: '7px 16px 7px 8px', boxShadow: '0 6px 16px rgba(44,41,96,0.16), 0 0 0 2px rgba(44,41,96,0.05)'}}>
        <div style={{width: 26, height: 26, borderRadius: '50%', background: ISO.coral, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 900, fontSize: 14}}>{n}</div>
        <div style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 800, fontSize: 19, color: ISO.ink, letterSpacing: 2, whiteSpace: 'nowrap'}}>{text}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 字幕丸（读 SUBS，底部居中）
export const CaptionPill: React.FC<{f: number}> = ({f}) => {
  const cur = SUBS.find((s) => f >= s.from - 2 && f <= s.to + 4);
  if (!cur) return null;
  const on = EASE.easeOutCubic((f - (cur.from - 2)) / 6);
  const off = 1 - EASE.easeOutCubic((f - (cur.to + 1)) / 5);
  return (
    <div style={{position: 'absolute', left: 640, top: 662, transform: `translate(-50%,-50%) scale(${0.92 + 0.08 * on})`, opacity: Math.min(on, off), zIndex: 85}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(251,250,255,0.94)', borderRadius: 999, padding: '9px 22px', boxShadow: '0 8px 20px rgba(44,41,96,0.18)'}}>
        <div style={{width: 8, height: 8, borderRadius: 2, background: ISO.coral, transform: `rotate(45deg) scale(${1 + 0.2 * Math.sin(f / 4)})`}} />
        <div style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: 21, color: ISO.ink, letterSpacing: 1.5, whiteSpace: 'nowrap'}}>{cur.text}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 蓝图纸扫掠（SC01 f8-34：等轴网格自心向外画入→随瓦片落位淡出）
export const BlueprintSweep: React.FC<{f: number}> = ({f}) => {
  const t = EASE.clamp01((f - 8) / 14);
  const fade = 1 - EASE.clamp01((f - 26) / 10);
  if (fade <= 0) return null;
  const N = 7;
  const P = (u: number, v: number) => `${640 + (u - v) * C30 * U},${252 + (u + v) * S30 * U}`;
  const lines: React.ReactNode[] = [];
  for (let k = 0; k <= N; k++) {
    const ring = Math.abs(k - N / 2) * 2; // 自心向外
    const on = EASE.clamp01(t * (N + 2.5) - ring * 0.62);
    if (on <= 0) continue;
    lines.push(<line key={`u${k}`} x1={640 + k * C30 * U} y1={252 + k * S30 * U} x2={640 + (k - N) * C30 * U} y2={252 + (k + N) * S30 * U} stroke={ISO.data} strokeWidth={1.6} opacity={0.8 * on} strokeDasharray={k % 2 ? '5 6' : undefined} />);
    lines.push(<line key={`v${k}`} x1={640 - k * C30 * U} y1={252 + k * S30 * U} x2={640 + (N - k) * C30 * U} y2={252 + (N + k) * S30 * U} stroke={ISO.data} strokeWidth={1.6} opacity={0.8 * on} strokeDasharray={k % 2 ? '5 6' : undefined} />);
  }
  const perim = 4 * N * C30 * U;
  return (
    <svg width={1280} height={720} style={{position: 'absolute', inset: 0, zIndex: 3, opacity: fade}}>
      {/* 站区淡紫填充提示 */}
      <polygon points={`${P(0, 0)} ${P(N, 0)} ${P(N, N)} ${P(0, N)}`} fill="rgba(98,240,242,0.05)" stroke="none" />
      {lines}
      <polygon points={`${P(0, 0)} ${P(N, 0)} ${P(N, N)} ${P(0, N)}`} fill="none" stroke={ISO.data} strokeWidth={2.4}
        strokeDasharray={`${perim} ${perim}`} strokeDashoffset={-(1 - t) * perim} opacity={0.95} strokeLinejoin="round" />
    </svg>
  );
};

// ---------------------------------------------------------------- 稿件纸（SC02 f97-113：飞入文档楼）
export const PaperFly: React.FC<{f: number}> = ({f}) => {
  const t = EASE.clamp01((f - 97) / 16);
  if (t <= 0 || t >= 1) return null;
  const e = EASE.easeInOutPow(t, 1.8);
  const to = midScreen('A', 3.1, 4.35, 0.7, f);
  const x = -80 + (to.x + 80) * e;
  const y = 560 + (to.y - 560) * e - Math.sin(Math.PI * e) * 90;
  const s = 1 - 0.45 * e;
  const ring = EASE.clamp01((f - 111) / 8);
  return (
    <div style={{position: 'absolute', left: x, top: y, zIndex: 70}}>
      <div style={{transform: `translate(-50%,-50%) rotate(${8 - 14 * e}deg) scale(${s})`}}>
        <div style={{width: 46, height: 58, borderRadius: 5, background: '#fff', boxShadow: '0 4px 10px rgba(44,41,96,0.18)', padding: '9px 8px'}}>
          <div style={{height: 4, width: '70%', borderRadius: 2, background: '#C4BAEF', marginBottom: 5}} />
          <div style={{height: 3, width: '90%', borderRadius: 2, background: '#DDD8F5', marginBottom: 4}} />
          <div style={{height: 3, width: '82%', borderRadius: 2, background: '#DDD8F5', marginBottom: 4}} />
          <div style={{height: 3, width: '60%', borderRadius: 2, background: '#DDD8F5'}} />
        </div>
      </div>
      {ring > 0 && ring < 1 && (
        <div style={{position: 'absolute', left: to.x - x, top: to.y - y, transform: `translate(-50%,-50%) scale(${0.4 + ring})`, width: 60, height: 60, borderRadius: '50%', border: `2.5px solid ${ISO.data}`, opacity: (1 - ring) * 0.8}} />
      )}
    </div>
  );
};

// ---------------------------------------------------------------- 节拍卡（SC02 f108/118/128：三张分镜格自楼顶弹出悬停）
export const BeatCards: React.FC<{f: number}> = ({f}) => {
  const spots = [
    {u: 2.35, v: 3.15, f0: 108, kind: 0},
    {u: 3.6, v: 2.7, f0: 118, kind: 1},
    {u: 4.5, v: 3.6, f0: 128, kind: 2},
  ];
  return (
    <>
      {spots.map((sp, i) => {
        const pop = springPop(f, sp.f0);
        if (pop <= 0.001) return null;
        const p = midScreen('A', sp.u, sp.v, 3.35 + i * 0.28 + Math.sin(f / 9 + i * 2) * 0.07, f);
        return (
          <div key={i} style={{position: 'absolute', left: p.x, top: p.y, transform: `translate(-50%,-50%) scale(${pop})`, zIndex: 72}}>
            <div style={{width: 62, height: 46, borderRadius: 7, background: '#FBFAFF', boxShadow: '0 5px 12px rgba(44,41,96,0.16), 0 0 0 2px rgba(44,41,96,0.06)', padding: 7}}>
              {sp.kind === 0 && <div style={{height: '100%', background: `linear-gradient(135deg, ${ISO.sky}, ${ISO.mint})`, borderRadius: 4, position: 'relative'}}><div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><div style={{width: 0, height: 0, borderLeft: '9px solid rgba(255,255,255,0.95)', borderTop: '6px solid transparent', borderBottom: '6px solid transparent'}} /></div></div>}
              {sp.kind === 1 && <div style={{height: '100%', display: 'flex', alignItems: 'flex-end', gap: 3}}>{[0.5, 0.85, 0.65, 1].map((h, k) => <div key={k} style={{flex: 1, height: `${h * 100}%`, borderRadius: 2, background: [ISO.coral, ISO.butter, ISO.mint, ISO.sky][k]}} />)}</div>}
              {sp.kind === 2 && <div style={{height: '100%', background: `repeating-linear-gradient(90deg, ${ISO.lilac} 0 8px, #FBFAFF 8px 16px)`, borderRadius: 4, border: '2px solid #E3DEF8'}} />}
            </div>
          </div>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------- 速度线（平移运镜的动感提示）
export const SpeedLines: React.FC<{f: number; f0: number; f1: number}> = ({f, f0, f1}) => {
  const t = (f - f0) / (f1 - f0);
  if (t <= 0 || t >= 1) return null;
  const v = Math.sin(Math.PI * t);
  return (
    <>
      {[0.24, 0.42, 0.62, 0.78].map((yy, i) => (
        <div key={i} style={{position: 'absolute', left: (i % 2 ? 120 : 820) - v * 260 * (i % 2 ? 1 : -1), top: 720 * yy, width: 300, height: 4, borderRadius: 2,
          background: 'linear-gradient(90deg, transparent, rgba(44,41,96,0.30), transparent)', opacity: v * 0.8, zIndex: 60}} />
      ))}
    </>
  );
};

// ---------------------------------------------------------------- HUD 进度（SC04 hero：RENDER % 计数）
export const RenderHUD: React.FC<{f: number}> = ({f}) => {
  const on = EASE.easeOutCubic((f - 236) / 8);
  const off = 1 - EASE.easeOutCubic((f - 284) / 6);
  if (on <= 0 || off <= 0) return null;
  const p = EASE.clamp01((f - 238) / 44);
  const pct = Math.round(p * 98);
  return (
    <div style={{position: 'absolute', right: 52, top: 100, opacity: Math.min(on, off), transform: `translateX(${(1 - on) * 30}px)`, zIndex: 84}}>
      <div style={{background: 'rgba(251,250,255,0.94)', borderRadius: 12, padding: '10px 16px', boxShadow: '0 8px 20px rgba(44,41,96,0.16)', minWidth: 178}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
          <span style={{fontFamily: 'Audiowide, sans-serif', fontSize: 12, letterSpacing: 3, color: '#7A72C4'}}>RENDER</span>
          <span style={{fontFamily: 'Orbitron, Audiowide, sans-serif', fontWeight: 700, fontSize: 22, color: ISO.ink}}>{pct}%</span>
        </div>
        <div style={{marginTop: 6, height: 7, borderRadius: 4, background: '#E3DEF8', overflow: 'hidden'}}>
          <div style={{height: '100%', width: `${pct}%`, borderRadius: 4, background: `linear-gradient(90deg, ${ISO.deepSky}, ${ISO.data})`}} />
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 成片胶片飞出（SC05 f332-352）
export const FilmStripFly: React.FC<{f: number}> = ({f}) => {
  const t = (f - 332) / 20;
  if (t <= 0 || t >= 1) return null;
  const e = Math.pow(t, 1.6);
  const from = midScreen('C', 3.9, 3.1, 3.8, f);
  const x = from.x + e * 640;
  const y = from.y - e * 470;
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) rotate(${-6 - 4 * e}deg) scale(${1 - 0.3 * e})`, opacity: 1 - EASE.clamp01((t - 0.8) / 0.2), zIndex: 75}}>
      <div style={{width: 216, height: 64, borderRadius: 8, background: '#2C2960', padding: '8px 10px', boxShadow: '0 10px 22px rgba(44,41,96,0.25)'}}>
        <div style={{position: 'absolute', top: 3, left: 10, right: 10, height: 4, background: 'repeating-linear-gradient(90deg, #4A45A0 0 8px, transparent 8px 16px)', borderRadius: 2}} />
        <div style={{position: 'absolute', bottom: 3, left: 10, right: 10, height: 4, background: 'repeating-linear-gradient(90deg, #4A45A0 0 8px, transparent 8px 16px)', borderRadius: 2}} />
        <div style={{display: 'flex', gap: 6, height: '100%'}}>
          {[`linear-gradient(150deg, ${ISO.butter}, ${ISO.peach})`, `linear-gradient(150deg, ${ISO.mint}, ${ISO.sky})`, `linear-gradient(150deg, ${ISO.lilac}, ${ISO.deepSky})`].map((g, i) => (
            <div key={i} style={{flex: 1, borderRadius: 4, background: g, opacity: 0.4 + 0.6 * EASE.clamp01((f - (332 + i * 3)) / 4)}} />
          ))}
        </div>
      </div>
      {[0.2, 0.45, 0.7].map((dt, i) => (
        <div key={i} style={{position: 'absolute', left: -24 - i * 26 + (1 - e) * 20, top: 26 + i * 12, width: 6 - i, height: 6 - i, borderRadius: '50%', background: ISO.data, opacity: (1 - t) * (0.7 - i * 0.2)}} />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- 收束卡（SC06：成形 f353-362 → 定帧 f363-389 带微动效）
export const EndLockup: React.FC<{f: number}> = ({f}) => {
  const pop = springPop(f, 353);
  const rise = EASE.easeOutCubic((f - 353) / 10);
  return (
    <div style={{position: 'absolute', inset: 0, zIndex: 92}}>
      <div style={{position: 'absolute', inset: 0, background: 'rgba(42,38,96,0.30)', opacity: rise}} />
      <div style={{position: 'absolute', left: 640, top: 336, transform: `translate(-50%,-50%) scale(${pop}) translateY(${(1 - rise) * 26}px)`, opacity: Math.min(1, pop * 1.6)}}>
        <div style={{background: '#FBFAFF', borderRadius: 26, padding: '34px 56px 26px', boxShadow: '0 24px 60px rgba(44,41,96,0.28)', textAlign: 'center'}}>
          <div style={{display: 'flex', justifyContent: 'center', marginBottom: 10}}><MiniCube s={52} /></div>
          <div style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 900, fontSize: 40, letterSpacing: 3, color: ISO.ink, transform: 'scaleX(0.96)', whiteSpace: 'nowrap'}}>一条视频的渲染小城</div>
          <div style={{marginTop: 8, fontFamily: 'Audiowide, sans-serif', fontSize: 13, letterSpacing: 5, color: '#7A72C4'}}>A2V · ISOMETRIC MICRO CITY</div>
          <div style={{marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8, background: '#EFEAFC', borderRadius: 999, padding: '6px 16px'}}>
            <div style={{width: 7, height: 7, borderRadius: 2, background: ISO.coral, transform: `rotate(45deg) scale(${f >= 363 ? 1 + 0.18 * Math.max(0, Math.sin((f - 363) / 5)) : 1})`}} />
            <span style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: 15, color: '#5A54A4', letterSpacing: 2}}>a2v · 示意流程样片</span>
          </div>
        </div>
      </div>
    </div>
  );
};
