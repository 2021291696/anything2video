// damped —— 一维阻尼振动器（签名④·跨卡可借 util）。
// 冲击帧 f0 之后按 exp 衰减正弦摆动：amp 弧度、period 帧为半周期×2、decay 衰减特征帧数。
// 用法：吊灯/植物/杯身等环境件在「冲击帧」后获得二次动作，让世界在角色动作后仍活着。
// 技法借鉴 huashu-art-motion (MIT) scenes/16_2026.js damped()，TSX 重写并模块化。
export function damped(f: number, f0: number, amp: number, period: number, decay: number): number {
  if (f < f0) return 0;
  const dt = f - f0;
  return amp * Math.exp(-dt / decay) * Math.sin((dt / period) * Math.PI * 2);
}
