// ============================================================================
// light.ts — 签名①光照图整幅相乘管线（光即内容）
// 技法借鉴 huashu-art-motion lib/render.js P.pool/P.lightMap/P.applyLight +
// scenes/32_rembrandt.js lightMap()（MIT, alchaincyf），TS 重写——机制与参数级
// 借鉴（环境光 rgb(30,21,13)=0.13 打底 → lighter 叠光池表 → 整幅 multiply；
// 烛焰 flick 双频噪声 / 云影正弦 / 光池噪声漂移 / 分离光），零代码拷贝。
// ============================================================================

import {W, H, noise2, clamp01, lerp, newCanvas, CANDLE} from './world';
import {READER} from './actors';

/** 烛焰摇曳（约 ±0.35..0.75）：flick = 0.5·noise(2.2t) + 0.25·noise(6.5t)——快慢双频 */
export const flick = (t: number, k = 0): number =>
  0.5 * noise2(t * 2.2 + k * 7.3, k * 3.1) + 0.25 * noise2(t * 6.5 + k, 9 + k);

/** 云影：窗光慢慢暗下去又回来 cloud = 0.5 + 0.5·sin(2.2t − 0.6)；boost 是剧情窗（S03 云影过窗） */
export const cloudAt = (t: number, boost = 0): number => clamp01(0.5 + 0.5 * Math.sin(t * 2.2 - 0.6) + boost);

/** 单个光池：径向渐变（lighter 语义下画进光照图） */
export function pool(g: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number): void {
  if (a <= 0 || r <= 0) return;
  const grad = g.createRadialGradient(x, y, r * 0.04, x, y, r);
  grad.addColorStop(0, `rgba(${rgb},${clamp01(a).toFixed(3)})`);
  grad.addColorStop(0.55, `rgba(${rgb},${(clamp01(a) * 0.42).toFixed(3)})`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

// ---- 光池表（签名①锁死：窗 r330 / 脸 r250 α.95 / 胸 r230 α.55 / 桌·信纸 r280 α.6 / 烛 r190+40fc / 分离光 r300 α.35）----
export const POOL_TABLE = {
  window: {r: 330, rgb: '255,246,225', a: 1},
  face: {r: 250, rgb: '255,226,180', a: 0.95},
  chest: {r: 230, rgb: '255,214,160', a: 0.55},
  table: {r: 280, rgb: '255,214,160', a: 0.6},
  candle: {r: 190, rgb: '255,180,90', a: 0.6},
  separation: {r: 300, rgb: '200,150,90', a: 0.35},
} as const;

export type LightOpts = {
  /** 烛火点亮（钩子 f1-4） */
  ignite: number;
  /** 其余光池绽开（f2-12） */
  poolU: number;
  /** 分离光显形增益（S03 末→S04，0→1） */
  sepU: number;
  /** hero 烛焰爆亮脉冲（0..1） */
  heroPulse: number;
  /** 剧情云影增益（S03 云影过窗 0..1） */
  cloudBoost: number;
  /** 预烘焙光柱位图 */
  beamImg: HTMLImageElement | null;
};

const scratch = newCanvas(W, H);
const getCtx = (): CanvasRenderingContext2D | null => scratch.getContext('2d');

/**
 * 每帧光照图：环境光 rgb(30,21,13) 打底（≈0.13）→ lighter 叠光池表 → 调用方整幅 multiply。
 * 光池中心随 noise(0.9t) 漂移 ±14px；窗光/光柱 ×(1−0.35·cloud)；烛光池 r190+40·fc、α0.6+0.4·fc。
 */
export function buildLightMap(t: number, o: LightOpts): HTMLCanvasElement {
  const g = getCtx();
  if (!g) return scratch;
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.fillStyle = 'rgb(30,21,13)';
  g.fillRect(0, 0, W, H);
  const f = flick(t);
  const fc = flick(t * 1.7, 3);
  const cloud = cloudAt(t, o.cloudBoost * 0.55);
  g.globalCompositeOperation = 'lighter';
  // 光柱（楔形，缓存位图）：α(0.8+0.15f)·(1−0.35cloud)
  if (o.beamImg?.complete && o.beamImg.naturalWidth > 0) {
    g.globalAlpha = (0.8 + 0.15 * f) * (1 - 0.35 * cloud) * o.poolU * o.ignite;
    g.drawImage(o.beamImg, 0, 0, W, H);
  }
  g.globalAlpha = 1;
  // 窗本身 r330（窗光被云影遮暗再恢复）
  pool(g, 338, 250, POOL_TABLE.window.r, POOL_TABLE.window.rgb, POOL_TABLE.window.a * (1 - 0.3 * cloud) * o.poolU);
  // 分离光：人物暗侧背后墙面打亮 r300 α0.35（伦勃朗式把人从背景里分出来；hero 增益 +0.15）
  pool(g, 1108, 330, POOL_TABLE.separation.r, POOL_TABLE.separation.rgb,
    (POOL_TABLE.separation.a + 0.15 * o.sepU) * o.poolU);
  // 光池缓慢漂移（云影/烛焰摇曳带动的呼吸感）
  const dx = 14 * noise2(t * 0.9, 1);
  const dy = 10 * noise2(t * 0.9, 5);
  // 脸池 r250 α0.95±0.08flick（烛光在脸上呼吸）
  pool(g, READER.faceC[0] - 24 + dx, READER.faceC[1] + dy, POOL_TABLE.face.r, POOL_TABLE.face.rgb,
    (POOL_TABLE.face.a + 0.08 * f + 0.1 * o.heroPulse) * o.poolU * o.ignite);
  // 胸池 r230 α0.55
  pool(g, READER.chest[0] - 30 + dx, READER.chest[1] + 26, POOL_TABLE.chest.r, POOL_TABLE.chest.rgb,
    POOL_TABLE.chest.a * o.poolU * o.ignite);
  // 桌·信纸池 r280 α0.6（照亮摊开的信与手）
  pool(g, 726, 430 + dy, POOL_TABLE.table.r, POOL_TABLE.table.rgb, POOL_TABLE.table.a * o.poolU * o.ignite);
  // 烛光 r190+40·fc、α0.6+0.4·fc（快闪；hero 爆亮脉冲再加一档）
  const heroAdd = o.heroPulse * 0.25;
  pool(g, CANDLE.x, CANDLE.top - 6, POOL_TABLE.candle.r + 40 * fc + 60 * o.heroPulse, POOL_TABLE.candle.rgb,
    clamp01(POOL_TABLE.candle.a + 0.4 * fc + heroAdd) * o.ignite);
  g.globalCompositeOperation = 'source-over';
  return scratch;
}

/** 应用光照图：整幅 multiply（光即内容——不被照亮的部分交给黑暗） */
export function applyLight(ctx: CanvasRenderingContext2D, map: HTMLCanvasElement): void {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(map, 0, 0, W, H);
  ctx.restore();
}

export const outCubic = (u: number): number => 1 - Math.pow(1 - clamp01(u), 3);
export const smooth = (a: number, b: number, x: number): number => {
  const u = clamp01((x - a) / (b - a));
  return u * u * (3 - 2 * u);
};
export const lerpN = lerp;
