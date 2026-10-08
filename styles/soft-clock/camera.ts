// 相机与主曲线：两块画布的取景（特写 cam1 / 全景 cam2 缓推）、sag 下垂主曲线、kx 长影子主曲线。
// 全部纯帧号函数（seeded，同帧渲两次逐像素一致）。
import {clamp, ease} from './noise';
import {FREEZE_FROM, KX_FROM, KX_TO, MELT_FROM, MELT_TO, SAG_FULL} from './types';

export type Cam = {x: number; y: number; z: number};

/** cam1：特写——枯枝软钟＋窗台钟所在的左上区（钩子与 S01 的取景），带一点海平线作呼吸。 */
export const CAM1: Cam = {x: 480, y: 250, z: 1.6};
/** cam2：全景（melt 揭示后的主取景），带 1.00→1.03 缓推、f330 钳死。 */
export function cam2(f: number): Cam {
  const z = 1 + 0.03 * ease.inOut(clamp((f - (MELT_TO + 1)) / (FREEZE_FROM - MELT_TO - 1)));
  return {x: 640, y: 360, z};
}

/** melt 转场进度（0-1），窗口外返回 -1（未开始）或 2（已结束）。 */
export function meltP(f: number): number {
  if (f < MELT_FROM) return -1;
  if (f > MELT_TO) return 2;
  return (f - MELT_FROM + 1) / (MELT_TO - MELT_FROM + 1);
}

/**
 * sag 下垂主曲线（签名⑦）：全程 0.1→1.4，幂 0.72 前快后缓——
 * 钩子段（f≤15）就有可见下垂（f15≈0.24，+140%），中段持续在淌，f330 到 1.4 后波纹维持满幅。
 * （教训：首版 0.35→1.0 被审片判「没在淌」，必须全程肉眼可见。）
 */
export function sagAt(f: number): number {
  const x = clamp((f - 1) / (SAG_FULL - 1));
  return 0.1 + 1.3 * Math.pow(x, 0.72);
}

/**
 * kx 长影子主曲线（签名③）：0.85 起缓爬到 1.02，随后在 KX_FROM→KX_TO（36f=1.2s）
 * 里主变长到 1.45（对位 S03「长影子越拉越长」），此后保持——HERO 时影子最长。
 */
export function kxAt(f: number): number {
  const creep = 0.17 * ease.inOut(clamp((f - 1) / (KX_FROM - 1)));
  const burst = 0.43 * ease.inOut(clamp((f - KX_FROM) / (KX_TO - KX_FROM)));
  return 0.85 + creep + burst;
}
