// 窗形光斑（地面/桌面/墙面）—— cumulus-light。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）scenes/35_shinkai.js 的双层光斑：
//   地面/桌面 = 缓存模糊暖平行四边形（screen），中梃影 destination-out 扣条；
//   墙面 = 每帧重绘（内含随窗帘摆动的影子），screen 叠加。
import {CanvasCtx, DESK, GLASS, MULLION, W} from './types';
import {cached, scratch} from './cel';

/** 地板 + 桌面光斑（缓存：blur 暖光 + 中梃/窗台横档扣影）。 */
export function drawFloorLight(c: CanvasCtx): void {
  c.save();
  c.globalCompositeOperation = 'screen';
  const FL = cached('cl_floorlight', W, 720, (g) => {
    g.filter = 'blur(10px)';
    // 地板平行四边形光斑
    g.fillStyle = 'rgba(255,214,150,.6)';
    g.beginPath();
    g.moveTo(660, 560);
    g.lineTo(1080, 560);
    g.lineTo(1244, 712);
    g.lineTo(760, 712);
    g.closePath();
    g.fill();
    // 桌面条形光斑
    g.fillStyle = 'rgba(255,220,160,.5)';
    g.beginPath();
    g.moveTo(700, 470);
    g.lineTo(1044, 470);
    g.lineTo(1064, 494);
    g.lineTo(716, 494);
    g.closePath();
    g.fill();
    // 中梃扣影（斜向右下的暗条）
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = 'rgba(80,60,40,1)';
    g.beginPath();
    g.moveTo(408, 484);
    g.lineTo(430, 484);
    g.lineTo(560, 712);
    g.lineTo(534, 712);
    g.closePath();
    g.fill();
    // 窗台横档扣影（贯穿光斑的暗横线）
    g.beginPath();
    g.moveTo(0, 585);
    g.lineTo(1280, 578);
    g.lineTo(1280, 590);
    g.lineTo(0, 597);
    g.closePath();
    g.fill();
  });
  c.drawImage(FL, 0, 0);
  c.restore();
}

/** 墙面光斑（右上→右下平行四边形；内含随窗帘摆动的影子条）。每帧重绘。 */
export function drawWallLight(c: CanvasCtx, t: number, gust: number): void {
  const WL = scratch('cl_walllight', W, 720);
  WL.filter = 'blur(7px)';
  WL.fillStyle = 'rgba(255,222,170,.5)';
  WL.beginPath();
  WL.moveTo(640, 120);
  WL.lineTo(972, 196);
  WL.lineTo(972, 500);
  WL.lineTo(640, 452);
  WL.closePath();
  WL.fill();
  // 中梃影（斜向右下暗条）
  WL.globalCompositeOperation = 'destination-out';
  WL.filter = 'none';
  WL.fillStyle = '#000';
  WL.beginPath();
  WL.moveTo(760, 152);
  WL.lineTo(782, 157);
  WL.lineTo(782, 478);
  WL.lineTo(760, 472);
  WL.closePath();
  WL.fill();
  // 窗帘影（随风摆，gust 时摆幅加大）
  const cs = (Math.sin(t * 2.6) * 20 + Math.sin(t * 5.3) * 6) * (1 + gust * 0.7);
  WL.globalAlpha = 0.65;
  WL.beginPath();
  WL.moveTo(852 + cs * 0.3, 172);
  WL.bezierCurveTo(844 + cs, 280, 860 - cs * 0.4, 380, 838 + cs, 470);
  WL.lineTo(900, 484);
  WL.lineTo(900, 166);
  WL.closePath();
  WL.fill();
  WL.globalAlpha = 1;
  c.save();
  c.globalCompositeOperation = 'screen';
  c.drawImage(WL.canvas, 0, 0);
  c.restore();
}

/** 桌沿受光条 + 窗台上反光（静态层上的 screen 小条，让光斑「钉在课桌上」读得出来）。 */
export function drawDeskKiss(c: CanvasCtx): void {
  c.save();
  c.globalCompositeOperation = 'screen';
  c.fillStyle = 'rgba(255,214,150,.30)';
  c.fillRect(DESK.x, DESK.y, 300, 6);
  c.fillStyle = 'rgba(255,220,160,.35)';
  c.fillRect(GLASS.x - 16, 500, 330, 5);
  c.restore();
}
