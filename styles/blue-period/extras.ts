// 窗外世界（慢时驱动）：夜海海浪横移（越近越快）、月光碎影闪烁、一条苍白长云缓过月亮。
// 全部相位用 Scene 传入的慢化时间 pt（0.5 倍时——「万物慢半拍」），本文件不做时间积分。
import {mulberry32} from './noise';
import type {CanvasCtx} from './types';

const SEA = {x: 240, y: 267, w: 293, h: 100};
const SKY = {x: 240, y: 87, w: 293, h: 180};
const MULLION = {x: 381, w: 11};

/** 海浪（横向短笔，左移，越靠下越快）＋月光碎影（闪）。 */
export function drawSea(c: CanvasCtx, pt: number): void {
  c.save();
  c.beginPath();
  c.rect(SEA.x, SEA.y, SEA.w, SEA.h);
  c.clip();
  const r = mulberry32(5);
  c.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const y = SEA.y + 3 + r() * 92;
    const sp = 12 + (y - SEA.y) * 0.16;
    const x = SEA.x + (((r() * 347 - pt * sp) % 347) + 347) % 347 - 23;
    c.strokeStyle = r() < 0.5 ? 'rgba(90,125,170,.8)' : 'rgba(30,55,95,.9)';
    c.lineWidth = 2 + (y - SEA.y) * 0.027;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 17 + (y - SEA.y) * 0.13, y + 1);
    c.stroke();
  }
  for (let k = 0; k < 14; k++) {
    const y = 273 + k * 6.7;
    const tw = 0.5 + 0.5 * Math.sin(pt * 5 + k * 1.9);
    const w = (7 + k * 2.7) * tw;
    c.fillStyle = `rgba(205,220,235,${(0.35 + 0.5 * tw).toFixed(3)})`;
    c.fillRect(447 - w / 2 + Math.sin(pt * 2 + k) * 4, y, w, 2);
  }
  c.restore();
  // 窗棂竖条压回（海浪区穿过竖棂，棂要笃定）
  c.fillStyle = '#7d9cbc';
  c.fillRect(MULLION.x, SEA.y, MULLION.w, SEA.h);
}

/** 一条苍白的长云缓慢横过月亮（moon 在 (447,147)，云高度略低掠过月面下缘）。 */
export function drawCloud(c: CanvasCtx, pt: number): void {
  c.save();
  c.beginPath();
  c.rect(SKY.x, SKY.y, MULLION.x - SKY.x, SKY.h);
  c.rect(MULLION.x + MULLION.w, SKY.y, SKY.x + SKY.w - MULLION.x - MULLION.w, SKY.h);
  c.clip();
  const cx = 267 + pt * 30;
  c.fillStyle = 'rgba(150,175,205,.45)';
  c.beginPath();
  c.ellipse(cx, 157, 87, 9, -0.04, 0, 7);
  c.fill();
  c.beginPath();
  c.ellipse(cx + 60, 167, 60, 6, 0, 0, 7);
  c.fill();
  c.restore();
}
