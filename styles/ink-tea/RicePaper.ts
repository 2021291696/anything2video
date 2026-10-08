// RicePaper：宣纸底。茶色纸 + 纸纤维短弧两色 + 径向暗角。
// 笔墨引擎技法借鉴 huashu-art-motion 17_ink (MIT, alchaincyf), TSX 重写。
// 纸是底：全片唯一「底色」，墨只往上加，大面积留白由纸本身承担。
import {PAL, cached, mulberry32} from './ink';

export const W = 1280, H = 720;

/** 宣纸整幅（缓存一次）：#efe6d0 茶色 + 2600 根纤维短弧（暗棕/亮白两色）+ 径向暗角 α0.22 */
export function ricePaper(): HTMLCanvasElement {
  return cached('inktea_paper', W, H, (g) => {
    g.fillStyle = PAL.paper;
    g.fillRect(0, 0, W, H);
    // 细颗粒底噪（宣纸的「帘纹」感）：低频色斑
    const rnd0 = mulberry32(515);
    for (let i = 0; i < 220; i++) {
      const x = rnd0() * W, y = rnd0() * H, r = 18 + rnd0() * 60;
      const a = 0.015 + rnd0() * 0.02;
      g.fillStyle = rnd0() < 0.5 ? `rgba(170,140,95,${a})` : `rgba(255,252,240,${a})`;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    // 纸纤维：短弧，亮暗混合（2600 根，huashu 实测密度）
    const rnd = mulberry32(41);
    g.lineCap = 'round';
    for (let i = 0; i < 2600; i++) {
      const x = rnd() * W, y = rnd() * H, a = rnd() * Math.PI * 2, l = 6 + rnd() * 26;
      g.strokeStyle = rnd() < 0.5
        ? `rgba(150,125,90,${0.05 + rnd() * 0.08})`
        : `rgba(255,252,240,${0.12 + rnd() * 0.15})`;
      g.lineWidth = 0.6 + rnd() * 0.8;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    // 径向暗角（纸的旧色）：α 0.22
    const vg = g.createRadialGradient(W / 2, H / 2, W * 0.33, W / 2, H / 2, W * 0.82);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(120,90,50,0.22)');
    g.fillStyle = vg;
    g.fillRect(0, 0, W, H);
  });
}
