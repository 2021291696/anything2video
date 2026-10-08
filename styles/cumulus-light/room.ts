// 写实室内（静态缓存）—— cumulus-light。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）scenes/35_shinkai.js 的写实室内管线，
// Remotion+Canvas2D 重写并按 1280×720 教室题材重设计（非等比拷贝）。
// INDEX 短板修正「室内背景密度不够」：本层 ≥5 层信息密度——墙面冷暖渐变/踢脚线/木地板透视缝/
//   屋顶横梁+日光灯管/拉线开关锚点/挂历/墙搁板+书/课桌木纹+桌上书堆+笔盒/椅子/窗框窗台中梃。
import {CanvasCtx, DESK, FLOOR_Y, FIX, GLASS, SILL, W} from './types';
import {cached} from './cel';

/** 室内静态层（房壳 + 家具 + 墙面信息密度件）。窗玻璃区域留白由 sky 层覆盖。 */
export function roomBack(): HTMLCanvasElement {
  return cached('cl_room', W, 720, (g) => {
    // 墙面冷暖渐变（左暖右冷：光从窗来）
    const wg = g.createLinearGradient(0, 0, W, 0);
    wg.addColorStop(0, FIX.wallWarm);
    wg.addColorStop(0.45, FIX.wallMid);
    wg.addColorStop(1, FIX.wallCool);
    g.fillStyle = wg;
    g.fillRect(0, 0, W, FLOOR_Y);
    const vg = g.createLinearGradient(0, 0, 0, FLOOR_Y);
    vg.addColorStop(0, 'rgba(120,130,170,.25)');
    vg.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.fillStyle = vg;
    g.fillRect(0, 0, W, FLOOR_Y);
    // 屋顶横梁两道 + 日光灯管（教室天花信息）
    g.fillStyle = '#dcd6ca';
    g.fillRect(0, 26, W, 10);
    g.fillRect(620, 52, W - 620, 7);
    g.fillStyle = '#f4f6ef';
    g.fillRect(700, 40, 240, 9);
    g.fillStyle = '#c9cec2';
    g.fillRect(700, 47, 240, 2);
    // 拉线开关（挂点在梁上，摆动在 Scene 动态层画）
    g.fillStyle = '#b9b2a2';
    g.fillRect(652, 59, 6, 4);
    // 踢脚线 + 木地板（透视板缝）
    g.fillStyle = FIX.skirt;
    g.fillRect(0, FLOOR_Y - 14, W, 18);
    const fg = g.createLinearGradient(0, FLOOR_Y + 4, 0, 720);
    fg.addColorStop(0, FIX.floorHi);
    fg.addColorStop(1, FIX.floorLo);
    g.fillStyle = fg;
    g.fillRect(0, FLOOR_Y + 4, W, 720 - FLOOR_Y - 4);
    g.strokeStyle = FIX.seam;
    g.lineWidth = 2;
    for (let i = -14; i <= 14; i++) {
      g.beginPath();
      g.moveTo(640 + i * 48, FLOOR_Y + 4);
      g.lineTo(640 + i * 132, 720);
      g.stroke();
    }
    // 挂历（红头 + 5×7 格）——右墙信息件
    g.fillStyle = FIX.calPaper;
    g.fillRect(1024, 148, 128, 172);
    g.fillStyle = FIX.calHead;
    g.fillRect(1024, 148, 128, 34);
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.fillRect(1032, 158, 52, 5);
    g.fillStyle = FIX.calGrid;
    for (let i = 0; i < 5; i++) for (let j = 0; j < 7; j++) g.fillRect(1034 + j * 16, 194 + i * 22, 10, 10);
    g.fillStyle = '#c9c4b8';
    g.fillRect(1060, 138, 56, 10);
    // 墙搁板 + 两本书（课桌上方）
    g.fillStyle = '#b39468';
    g.fillRect(950, 388, 176, 10);
    g.fillStyle = '#5a7a9e';
    g.fillRect(966, 352, 18, 36);
    g.fillStyle = '#c46a52';
    g.fillRect(990, 360, 14, 28);
    // 课桌（浅木 + 顶面高光 + 板缝）——光柱落点
    g.fillStyle = FIX.deskLeg;
    g.fillRect(DESK.x + 18, DESK.y + DESK.h, 20, 156);
    g.fillRect(DESK.x + DESK.w - 38, DESK.y + DESK.h, 20, 156);
    g.fillStyle = FIX.desk;
    g.fillRect(DESK.x, DESK.y, DESK.w, DESK.h);
    g.fillStyle = FIX.deskHi;
    g.fillRect(DESK.x, DESK.y, DESK.w, 6);
    g.fillStyle = FIX.deskD;
    g.fillRect(DESK.x, DESK.y + DESK.h - 9, DESK.w, 9);
    g.strokeStyle = 'rgba(90,56,30,.4)';
    g.lineWidth = 1.4;
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.moveTo(DESK.x + 30 + k * 110, DESK.y + 8);
      g.lineTo(DESK.x + 52 + k * 110, DESK.y + DESK.h - 9);
      g.stroke();
    }
    // 桌上：书堆三本 + 笔盒
    g.fillStyle = FIX.book1;
    g.fillRect(760, 448, 118, 20);
    g.fillStyle = FIX.bookPage;
    g.fillRect(764, 444, 110, 5);
    g.fillStyle = FIX.book2;
    g.fillRect(772, 430, 100, 15);
    g.fillStyle = FIX.pencil;
    g.fillRect(918, 452, 64, 16);
    g.fillStyle = '#b8863c';
    g.fillRect(918, 464, 64, 4);
    // 椅（右缘）
    g.fillStyle = FIX.chair;
    g.fillRect(1210, 372, 16, 268);
    g.fillRect(1168, 556, 92, 16);
    g.fillRect(1172, 572, 14, 68);
    g.fillStyle = FIX.chairHi;
    g.fillRect(1168, 556, 92, 6);
    // 桌底投影
    g.fillStyle = 'rgba(50,34,18,.30)';
    g.fillRect(DESK.x + 8, 636, DESK.w - 16, 14);
  });
}

/** 窗框覆盖层（sky 与水珠之后画）：四条框带（不遮玻璃）+ 内衬亮缘 + 窗台。 */
export function windowFrame(): HTMLCanvasElement {
  return cached('cl_frame', W, 720, (g) => {
    const L = 16;
    g.fillStyle = FIX.frame;
    g.fillRect(GLASS.x - L, GLASS.y - L, GLASS.w + 2 * L, L);          // 上框
    g.fillRect(GLASS.x - L, GLASS.y + GLASS.h, GLASS.w + 2 * L, L);    // 下框
    g.fillRect(GLASS.x - L, GLASS.y - L, L, GLASS.h + 2 * L);          // 左框
    g.fillRect(GLASS.x + GLASS.w, GLASS.y - L, L, GLASS.h + 2 * L);    // 右框
    // 内衬：玻璃边界亮缘（上/左受光）+ 背光暗缘（右/下）
    g.fillStyle = '#f6f6f8';
    g.fillRect(GLASS.x - 4, GLASS.y - 4, GLASS.w + 8, 4);
    g.fillRect(GLASS.x - 4, GLASS.y - 4, 4, GLASS.h + 8);
    g.fillStyle = 'rgba(110,120,150,.5)';
    g.fillRect(GLASS.x + GLASS.w, GLASS.y, 4, GLASS.h);
    g.fillRect(GLASS.x, GLASS.y + GLASS.h, GLASS.w, 4);
    // 窗台
    g.fillStyle = FIX.sill;
    g.fillRect(SILL.x, SILL.y, SILL.w, SILL.h);
    g.fillStyle = FIX.sillD;
    g.fillRect(SILL.x, SILL.y + SILL.h, SILL.w, 8);
    g.fillStyle = 'rgba(255,255,255,.7)';
    g.fillRect(SILL.x, SILL.y, SILL.w, 4);
  });
}
