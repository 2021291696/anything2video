import React from 'react';
import {EASE, PAPER, SCH, foldLift, midX} from './world';
import {Bean, Flame, FloorShadow, FoldUp, TabPull, paperFace} from './kit';

/**
 * props.tsx — 立体书四个「翻页场景」的纸艺机关件（全部折起式入场：FoldUp + FloorShadow + TabPull）。
 * 页 1 咖啡枝（豆子）｜页 2 烘焙盘+纸火苗（烘焙）｜页 3 磨豆机+纸杯+水壶（研磨冲煮）｜尾页收束卡。
 */

// ---------------------------------------------------------------- 页 1：咖啡枝立体卡（折起后挂三颗樱桃红咖啡果）
export const CoffeeBranch: React.FC<{f: number}> = ({f}) => {
  const t0 = SCH.p1Branch;
  const lift = foldLift(f, t0);
  const sway = lift >= 1 ? Math.sin(f / 7) * 1.2 * Math.max(0, 1 - (f - t0 - 30) / 30) : 0; // 折定后的余摆（衰减）
  const cherries = [
    {x: 74, y: 42, s: 30, rot: -8},
    {x: 138, y: 66, s: 26, rot: 10},
    {x: 200, y: 34, s: 28, rot: -4},
  ];
  return (
    <>
      <FloorShadow f={f} t0={t0} x={314} y={578} w={330} h={20} z={4} />
      <TabPull f={f} t0={t0} x={280} y={582} z={5} />
      <FoldUp f={f} t0={t0} x={284} y={352} w={330} h={230} z={12}
        inner={
          <div style={{position: 'absolute', inset: 0, ...paperFace(PAPER.surface, {borderRadius: '12px 12px 6px 6px'}),
            transform: `rotate(${sway * 0.4}deg)`, transformOrigin: '50% 100%'}}>
            {/* 枝干 + 叶（印刷在纸卡上） */}
            <svg width={330} height={230} viewBox="0 0 330 230" style={{position: 'absolute', inset: 0}}>
              <path d="M165 226 C160 170 150 120 118 60" fill="none" stroke="#8a6a44" strokeWidth={9} strokeLinecap="round" />
              <path d="M150 150 C120 132 96 132 70 148 C96 158 124 160 150 150 Z" fill={PAPER.sage} stroke="rgba(74,50,34,0.24)" strokeWidth={1.6} />
              <path d="M158 96 C186 78 212 78 238 96 C212 106 184 106 158 96 Z" fill={PAPER.sage} stroke="rgba(74,50,34,0.24)" strokeWidth={1.6} />
              <path d="M126 74 C104 60 84 60 62 74 C84 82 106 82 126 74 Z" fill="#8fae8a" stroke="rgba(74,50,34,0.24)" strokeWidth={1.6} />
            </svg>
            {cherries.map((c, i) => (
              <div key={i} style={{position: 'absolute', left: c.x, top: c.y + 150}}>
                <CoffeeCherry x={0} y={0} s={c.s} rot={c.rot} />
              </div>
            ))}
            {/* 卡底小字（真实术语标注） */}
            <div style={{position: 'absolute', left: 0, right: 0, bottom: 8, textAlign: 'center',
              fontFamily: "'Fraunces', serif", fontSize: 15, letterSpacing: 2, color: PAPER.muted}}>COFFEA · 咖啡树的果实</div>
          </div>
        } />
      {/* 离枝的那颗豆（f84 起抛物线跳到页面中央，落地微弹） */}
      <HoppingBean f={f} t0={SCH.p1BeanHop} from={{x: 470, y: 492}} to={{x: 800, y: 596}} hops={2} />
    </>
  );
};

/** 咖啡樱桃（红外壳纸豆，内含意示）。 */
const CoffeeCherry: React.FC<{x: number; y: number; s: number; rot: number}> = ({x, y, s, rot}) => (
  <div style={{position: 'absolute', left: x, top: y, width: s, height: s * 0.9, transform: `rotate(${rot}deg)`,
    borderRadius: '50%', background: `radial-gradient(circle at 34% 30%, #d97a5e, ${PAPER.cherry} 62%)`,
    border: '1px solid rgba(74,50,34,0.3)', boxShadow: `inset 0 -4px 5px rgba(74,50,34,0.3), 0 2px 4px ${PAPER.shadow}`}}>
    <div style={{position: 'absolute', left: '42%', top: '6%', width: '16%', height: '10%', borderRadius: 3, background: '#8fae8a'}} />
  </div>
);

/** 跳落豆：抛物线两跳，落地 squash + 地影随高度缩放。 */
export const HoppingBean: React.FC<{f: number; t0: number; from: {x: number; y: number}; to: {x: number; y: number}; hops?: number; roast?: number}> =
({f, t0, from, to, hops = 2, roast = 0.1}) => {
  const T = 16; // 每跳帧数
  const k = (f - t0) / T;
  if (k < 0 || k > hops) return null;
  const seg = Math.min(hops - 0.001, k);
  const u = seg % 1;
  const prog = (seg + u) / hops;
  const x = from.x + (to.x - from.x) * EASE.clamp01(prog);
  const baseY = from.y + (to.y - from.y) * EASE.easeOutCubic(prog);
  const arc = Math.sin(Math.PI * u) * (56 - prog * 18);
  const squash = k > hops - 0.12 ? 1 : 0;
  return (
    <>
      <div style={{position: 'absolute', left: midX(x - 14, f), top: baseY + arc - 22 - arc, width: 28, height: 20, borderRadius: '50%',
        background: `radial-gradient(closest-side, rgba(74,50,34,${0.24 - arc / 400}), transparent 72%)`, zIndex: 9, filter: 'blur(1px)'}} />
      <div style={{position: 'absolute', left: midX(x, f), top: baseY - arc, zIndex: 14}}>
        <Bean x={-13} y={-9} s={26} rot={-160 - k * 220} roast={roast} squash={squash} z={1} />
      </div>
    </>
  );
};

// ---------------------------------------------------------------- 页 2：烘焙盘（沙纸圆盘折起 + 三簇纸火苗 + 四豆爆裂变深）
export const RoastPan: React.FC<{f: number}> = ({f}) => {
  const t0 = SCH.p2Pan;
  const beans = [
    {x: -66, y: -12, rot: -14, t: SCH.p2Beans[0]},
    {x: -24, y: -24, rot: 8, t: SCH.p2Beans[1]},
    {x: 20, y: -8, rot: -4, t: SCH.p2Beans[2]},
    {x: 62, y: -22, rot: 16, t: SCH.p2Beans[3]},
  ];
  return (
    <>
      <FloorShadow f={f} t0={t0} x={640} y={606} w={380} h={24} z={4} />
      <TabPull f={f} t0={t0} x={842} y={610} z={5} flip />
      {/* 三簇纸火苗（盘后折起，确定性摇曳） */}
      {[-1, 0, 1].map((i) => (
        <FoldUp key={i} f={f} t0={SCH.p2Flames + Math.abs(i) * 3} x={640 + i * 98 - 30} y={436} w={60} h={96} z={6}
          inner={<Flame f={f} x={0} y={0} s={1.12 - Math.abs(i) * 0.2} seed={i + 2} z={1} />} />
      ))}
      {/* 盘体（椭圆沙纸盘 + 盘沿厚度） */}
      <FoldUp f={f} t0={t0} x={455} y={498} w={370} h={100} z={12}
        inner={
          <div style={{position: 'absolute', inset: 0}}>
            <div style={{position: 'absolute', inset: 0, borderRadius: '50%',
              background: `linear-gradient(180deg, ${PAPER.sand}, #e2cda4)`,
              border: '1px solid rgba(74,50,34,0.26)',
              boxShadow: `inset 0 -10px 0 rgba(74,50,34,0.10), inset 0 6px 0 rgba(255,246,228,0.5), 0 6px 14px ${PAPER.shadow}`}} />
            <div style={{position: 'absolute', left: 14, right: 14, top: 12, bottom: 16, borderRadius: '50%',
              border: '2px dashed rgba(74,50,34,0.22)'}} />
            {beans.map((b, i) => {
              const hop = Math.max(0, 1 - Math.abs(f - b.t) / 7); // 爆裂一跳（前后 7 帧）
              const roast = EASE.clamp01((f - b.t) / 20) * 0.85 + 0.05;
              return (
                <div key={i} style={{position: 'absolute', left: 185 + b.x, top: 50 + b.y - hop * 24}}>
                  <Bean x={-14} y={-10} s={28} rot={b.rot + hop * 160} roast={roast} squash={hop > 0.8 ? 1 : 0} z={2} />
                </div>
              );
            })}
            <div style={{position: 'absolute', left: 0, right: 0, top: -30, textAlign: 'center',
              fontFamily: "'Fraunces', serif", fontSize: 15, letterSpacing: 2, color: PAPER.muted}}>ROAST · 一爆香气</div>
          </div>
        } />
      {/* 盘上升起的一缕细汽（烘焙后半段） */}
      {f > 176 && (
        <div style={{position: 'absolute', left: midX(780, f), top: 452, zIndex: 13, opacity: Math.min(1, (f - 176) / 10) * 0.7}}>
          <SteamWisp f={f} />
        </div>
      )}
    </>
  );
};

/** 单缕细汽（简化版 Steam，无循环重置抖动）。 */
const SteamWisp: React.FC<{f: number}> = ({f}) => {
  const t = ((f % 90) / 90);
  return (
    <svg width={34} height={64} viewBox="0 0 34 64" style={{transform: `translateY(${-40 * t}px)`, opacity: Math.sin(Math.PI * t) * 0.8}}>
      <path d="M17 60 C9 50 25 42 17 32 C9 22 25 14 17 4" fill="none" stroke={PAPER.cream} strokeWidth={4.6} strokeLinecap="round" />
    </svg>
  );
};

// ---------------------------------------------------------------- 页 3：磨豆机（料斗+机身+摇柄）与纸杯、水壶、水弧
export const Grinder: React.FC<{f: number}> = ({f}) => {
  const t0 = SCH.p3Grinder;
  const crankT = EASE.clamp01((f - SCH.p3Crank) / 20);
  return (
    <>
      <FloorShadow f={f} t0={t0} x={388} y={608} w={230} h={18} z={4} />
      <TabPull f={f} t0={t0} x={500} y={612} z={5} />
      <FoldUp f={f} t0={t0} x={280} y={418} w={216} h={190} z={12}
        inner={
          <div style={{position: 'absolute', inset: 0}}>
            {/* 料斗（梯形） */}
            <div style={{position: 'absolute', left: 42, top: 0, width: 132, height: 62, ...paperFace(PAPER.sand),
              clipPath: 'polygon(6% 0, 94% 0, 76% 100%, 24% 100%)', borderRadius: 6}} />
            {/* 机身 */}
            <div style={{position: 'absolute', left: 58, top: 58, width: 100, height: 96, ...paperFace(PAPER.surface, {borderRadius: 8})}}>
              <div style={{position: 'absolute', left: 16, top: 16, width: 68, height: 40, borderRadius: 6,
                background: `linear-gradient(180deg, ${PAPER.cream}, #e8d8b8)`, border: '1px solid rgba(74,50,34,0.2)'}} />
              <div style={{position: 'absolute', left: 16, top: 62, width: 68, height: 5, borderRadius: 3, background: PAPER.accent, opacity: crankT > 0 ? 0.9 : 0.25}} />
              <div style={{position: 'absolute', left: 16, top: 74, width: 44, height: 5, borderRadius: 3, background: PAPER.sandDark}} />
            </div>
            {/* 出粉嘴 */}
            <div style={{position: 'absolute', left: 92, top: 150, width: 32, height: 26, ...paperFace(PAPER.sandDark, {borderRadius: '2px 2px 8px 8px'})}} />
            {/* 摇柄（研磨时旋转） */}
            <div style={{position: 'absolute', left: 148, top: 44, width: 64, height: 64, transform: `rotate(${-crankT * 300}deg)`, transformOrigin: '8px 8px'}}>
              <div style={{position: 'absolute', left: 0, top: 0, width: 16, height: 16, borderRadius: '50%', background: PAPER.ink}} />
              <div style={{position: 'absolute', left: 6, top: 6, width: 46, height: 7, borderRadius: 4, background: PAPER.ink}} />
              <div style={{position: 'absolute', left: 46, top: 0, width: 14, height: 20, borderRadius: 4, background: PAPER.accent, border: '1px solid rgba(74,50,34,0.3)'}} />
            </div>
            <div style={{position: 'absolute', left: 0, right: 0, bottom: 4, textAlign: 'center',
              fontFamily: "'Fraunces', serif", fontSize: 15, letterSpacing: 2, color: PAPER.muted}}>GRIND · 磨成细粉</div>
          </div>
        } />
      {/* 投入料斗的两颗豆 */}
      {[SCH.p3BeansIn[0], SCH.p3BeansIn[1]].map((t, i) => {
        const u = EASE.clamp01((f - t) / 12);
        if (u <= 0 || u >= 1) return null;
        return (
          <div key={i} style={{position: 'absolute', left: midX(404 + i * 66 - 12, f), top: 320 + u * u * 96, zIndex: 13}}>
            <Bean x={0} y={0} s={22} rot={90 + u * 200} roast={0.9} z={1} />
          </div>
        );
      })}
    </>
  );
};

/** 纸杯（折起 + 液面升起 + 把手 tab）。 */
export const PaperCup: React.FC<{f: number}> = ({f}) => {
  const t0 = SCH.p3Cup;
  const fill = EASE.clamp01((f - SCH.fillFrom) / 26);
  return (
    <>
      <FloorShadow f={f} t0={t0} x={906} y={620} w={150} h={16} z={4} />
      <FoldUp f={f} t0={t0} x={836} y={472} w={140} h={148} z={12}
        inner={
          <div style={{position: 'absolute', inset: 0}}>
            {/* 杯身（梯形纸杯） */}
            <div style={{position: 'absolute', left: 8, top: 0, width: 108, height: 148, ...paperFace(PAPER.surface),
              clipPath: 'polygon(0 0, 100% 0, 84% 100%, 16% 100%)', borderRadius: 6, overflow: 'hidden'}}>
              {/* 杯内咖啡液面 */}
              <div style={{position: 'absolute', left: 0, bottom: 0, width: '100%', height: `${8 + fill * 62}%`,
                background: `linear-gradient(180deg, #8a5a34, ${PAPER.roast})`, opacity: fill > 0 ? 1 : 0,
                boxShadow: 'inset 0 4px 0 rgba(255,246,228,0.25)'}} />
              {/* 纸杯印刷环 */}
              <div style={{position: 'absolute', left: 0, top: 30, width: '100%', height: 10, background: PAPER.accent, opacity: 0.85}} />
              <div style={{position: 'absolute', left: 0, top: 46, width: '100%', height: 4, background: PAPER.sandDark, opacity: 0.9}} />
            </div>
            {/* 把手（纸环 tab） */}
            <div style={{position: 'absolute', right: -26, top: 52, width: 44, height: 30, borderRadius: '4px 16px 16px 4px',
              border: `9px solid ${PAPER.sand}`, borderLeft: 'none', boxShadow: `2px 3px 0 rgba(74,50,34,0.14)`}} />
          </div>
        } />
    </>
  );
};

/** 水壶（hero：细颈壶自右上倾入，f252-280 出水）。 */
export const Kettle: React.FC<{f: number}> = ({f}) => {
  const t0 = 246;
  const lift = foldLift(f, t0);
  if (lift <= 0.001) return null;
  const tilt = -38 * EASE.easeInOutPow(EASE.clamp01((f - SCH.pourFrom) / 10), 2.2)
    * (1 - EASE.easeInOutPow(EASE.clamp01((f - (SCH.pourTo - 2)) / 14), 2.2));
  return (
    <div style={{position: 'absolute', left: midX(1002, f), top: 196 + (1 - lift) * -60, zIndex: 24,
      transform: `rotate(${tilt}deg)`, transformOrigin: '30% 20%', opacity: EASE.clamp01(lift * 5)}}>
      {/* 壶身 */}
      <div style={{width: 108, height: 78, ...paperFace(PAPER.sand, {borderRadius: '12px 34px 26px 12px'})}}>
        <div style={{position: 'absolute', left: 10, top: 10, width: 46, height: 7, borderRadius: 4, background: PAPER.accent, opacity: 0.8}} />
        <div style={{position: 'absolute', left: 34, top: -14, width: 34, height: 22, ...paperFace(PAPER.sandDark, {borderRadius: '7px 7px 0 0'})}} />
        {/* 壶嘴（细颈，向左下） */}
        <div style={{position: 'absolute', left: -40, top: 18, width: 56, height: 16, ...paperFace(PAPER.surface),
          clipPath: 'polygon(0 34%, 100% 0, 100% 100%, 0 72%)', borderRadius: 3}} />
        {/* 壹柄 tab */}
        <div style={{position: 'absolute', right: -15, top: 14, width: 25, height: 38, borderRadius: '0 15px 15px 0',
          border: `7px solid ${PAPER.sandDark}`, borderLeft: 'none'}} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 尾页：收束卡（f346 折起，f353 定帧呼吸）
export const EndPlacard: React.FC<{f: number}> = ({f}) => {
  const t0 = 346;
  const steps = ['豆子', '烘焙', '研磨', '冲煮', '杯子'];
  return (
    <>
      <FloorShadow f={f} t0={t0} x={640} y={514} w={690} h={26} z={44} />
      <FoldUp f={f} t0={t0} x={264} y={178} w={752} h={330} z={46}
      inner={
        <div style={{position: 'absolute', inset: 0, ...paperFace(PAPER.surface, {borderRadius: 14})}}>
          <TapeAbs />
          <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20}}>
            <div style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 900, fontSize: 46, letterSpacing: 4, color: PAPER.ink, transform: 'scaleX(0.97)'}}>
              一杯咖啡的旅程
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
              {steps.map((s, i) => (
                <React.Fragment key={s}>
                  <div style={{padding: '7px 16px', ...paperFace(i === 4 ? PAPER.accent : PAPER.sand, {borderRadius: 999}),
                    fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: 2,
                    color: i === 4 ? '#fff8ec' : PAPER.ink,
                    transform: `translateY(${Math.sin(f / 9 + i * 1.1) * 2}px)`}}>{s}</div>
                  {i < steps.length - 1 && (
                    <div style={{fontFamily: "'Fraunces', serif", fontSize: 20, color: PAPER.accentInk,
                      opacity: 0.55 + 0.45 * Math.sin(f / 10 + i)}}>→</div>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div style={{fontFamily: "'Fraunces', 'Noto Sans SC', serif", fontWeight: 600, fontSize: 17, letterSpacing: 3, color: PAPER.muted}}>
              a2v · 纸上立体书 · 示意流程
            </div>
          </div>
        </div>
      } />
    </>
  );
};
const TapeAbs = () => (
  <>
    <div style={{position: 'absolute', left: -18, top: -9, width: 64, height: 20, background: PAPER.tape, transform: 'rotate(-9deg)', zIndex: 2}} />
    <div style={{position: 'absolute', right: -18, top: -9, width: 64, height: 20, background: PAPER.tape, transform: 'rotate(8deg)', zIndex: 2}} />
  </>
);
