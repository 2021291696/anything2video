// ============================================================================
// actors.ts — 《花园里的一小时》角色层：少女（白裙草帽）＋橘白猫
// 签名④（配方 08_impressionism）：角色平涂 → 同一渲染器细笔触 source-atop（只画角色内部）
//   → 不勾轮廓，只补五官（淡紫细线，印象派不描边）。
// INDEX 短板修正「脸和手被笔触打碎」：charStrokes 增加 脸部椭圆 + 手部圆 的跳格保护
//   （五官区完全不上笔，平涂+五官线保可读）；白裙走 col>(240,236,225) 保白判定混回白。
// 角色笔触随机数契约：每格随机数用 hash(格号)（与是否落笔无关）——猫尾/呼吸一动
//   也只有那一格的笔变，不会整层重洗（08_impressionism v2 返修的第二处解法）。
// 技法借鉴 huashu-art-motion scenes/08_impressionism.js charStrokes 机制 (MIT, alchaincyf)，
//   TS 重写——机制与参数级借鉴，绘制代码为本卡原创（不移植 RIG）。
// ============================================================================
import {newCanvas, rgbStr, type RGB} from './strokes';
import {W, H} from '../common';
import {GIRL_FACE, HANDS, CAT_BOX} from './world';

/** 确定性 hash（格号 → [0,1)，纯函数无状态） */
const hash = (i: number, j: number): number => {
  let a = (Math.floor(i) * 374761393 + Math.floor(j) * 668265263) >>> 0;
  a = (a ^ 61) ^ (a >>> 16);
  a = (a + (a << 3)) | 0;
  a = a ^ (a >>> 4);
  a = Math.imul(a, 0x27d4eb2d);
  a = a ^ (a >>> 15);
  return (a >>> 0) / 4294967296;
};
const inEllipse = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) => {
  const u = (x - cx) / rx, v = (y - cy) / ry;
  return u * u + v * v <= 1;
};

// ---- 角色锚点（五官线/猫尾由 motion.ts 每帧矢量补画，坐标从此处出，禁两处手写）----
export const GIRL = {
  head: [200, 255] as [number, number], headR: 21,
  eyeL: [192, 253] as [number, number], eyeR: [208, 253] as [number, number],
  browY: 244, lip: [200, 265] as [number, number],
  cheekL: [188, 261] as [number, number], cheekR: [212, 261] as [number, number],
};
export const CAT = {
  body: [428, 652] as [number, number], bodyRx: 44, bodyRy: 27,
  head: [462, 629] as [number, number], headR: 15,
  eyeL: [457, 626] as [number, number], eyeR: [470, 626] as [number, number],
  nose: [463, 634] as [number, number],
  tailRoot: [388, 664] as [number, number],
  whiskers: [
    [[448, 633], [432, 630]], [[448, 636], [431, 639]],
    [[476, 633], [492, 630]], [[476, 636], [493, 639]],
  ] as Array<[[number, number], [number, number]]>,
};

const SKIN: RGB = [248, 216, 200];
const HAIR: RGB = [236, 196, 96];
const DRESS: RGB = [246, 244, 252];
const CAT_ORANGE: RGB = [240, 154, 64];
const CAT_WHITE: RGB = [252, 244, 232];
const CAT_STRIPE: RGB = [208, 112, 42];

// ---- 少女：白裙蓝腰带、系丝带草帽、金发（平涂；无轮廓线）；立于窗左墙前 ----
export function drawGirl(g: CanvasRenderingContext2D): void {
  const [hx, hy] = GIRL.head;
  // 背后长卷发
  g.fillStyle = rgbStr(HAIR);
  g.beginPath();
  g.moveTo(hx - 24, hy - 28);
  g.bezierCurveTo(hx + 44, hy - 18, hx + 50, hy + 70, hx + 40, hy + 130);
  g.bezierCurveTo(hx + 22, hy + 148, hx - 2, hy + 96, hx - 22, hy + 30);
  g.closePath(); g.fill();
  // 白裙（含肩与袖的身形剪影）
  g.fillStyle = rgbStr(DRESS);
  g.beginPath();
  g.moveTo(137, 560);
  g.quadraticCurveTo(145, 430, 153, 352);
  g.quadraticCurveTo(165, 300, 183, 282);
  g.lineTo(217, 282);
  g.quadraticCurveTo(237, 300, 249, 352);
  g.quadraticCurveTo(257, 430, 279, 560);
  g.quadraticCurveTo(208, 574, 137, 560);
  g.closePath(); g.fill();
  // 袖口垂臂
  g.beginPath();
  g.moveTo(156, 350); g.quadraticCurveTo(145, 408, 155, 452);
  g.lineTo(177, 456); g.quadraticCurveTo(169, 404, 176, 356); g.closePath(); g.fill();
  g.beginPath();
  g.moveTo(246, 350); g.quadraticCurveTo(257, 408, 247, 450);
  g.lineTo(225, 454); g.quadraticCurveTo(233, 404, 226, 356); g.closePath(); g.fill();
  // 双手（交叠身前）
  g.fillStyle = rgbStr(SKIN);
  g.beginPath(); g.arc(HANDS[0][0], HANDS[0][1], 7.5, 0, 7); g.fill();
  g.beginPath(); g.arc(HANDS[1][0], HANDS[1][1], 7.5, 0, 7); g.fill();
  // 蓝腰带＋侧结
  g.fillStyle = '#4a6ad8';
  g.beginPath(); g.moveTo(149, 402); g.lineTo(253, 404); g.lineTo(251, 420); g.lineTo(148, 418); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(249, 406); g.quadraticCurveTo(265, 436, 259, 470); g.lineTo(247, 466);
  g.quadraticCurveTo(253, 436, 241, 410); g.closePath(); g.fill();
  // 头
  g.fillStyle = rgbStr(SKIN); g.beginPath(); g.arc(hx, hy, GIRL.headR, 0, 7); g.fill();
  // 额前金发（两绺）
  g.fillStyle = rgbStr(HAIR);
  g.beginPath(); g.ellipse(hx - 14, hy - 10, 8, 14, 0.5, 0, 7); g.fill();
  g.beginPath(); g.ellipse(hx + 14, hy - 10, 8, 14, -0.5, 0, 7); g.fill();
  // 草帽：宽檐 + 帽顶 + 蓝丝带
  g.fillStyle = '#f0d890';
  g.beginPath(); g.ellipse(hx, hy - 22, 52, 14, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(hx, hy - 30, 30, 15, 0, Math.PI, 0); g.fill();
  g.fillStyle = '#4a6ad8'; g.fillRect(hx - 30, hy - 33, 60, 6);
  // 腮红（印象派式两笔淡红）
  g.fillStyle = 'rgba(240,130,130,.45)';
  g.beginPath(); g.ellipse(GIRL.cheekL[0], GIRL.cheekL[1], 5, 3.2, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(GIRL.cheekR[0], GIRL.cheekR[1], 5, 3.2, 0, 0, 7); g.fill();
  // 鞋
  g.fillStyle = '#c8b8e8';
  g.beginPath(); g.ellipse(175, 560, 13, 5, 0.1, 0, 7); g.fill();
  g.beginPath(); g.ellipse(233, 562, 13, 5, -0.06, 0, 7); g.fill();
}

// ---- 橘白猫：蜷坐阳光里（身/头平涂；尾巴每帧由 motion.ts 补画）----
export function drawCat(g: CanvasRenderingContext2D): void {
  const [bx, by] = CAT.body, [hxp, hyp] = CAT.head;
  // 身体（蜷坐团）
  g.fillStyle = rgbStr(CAT_ORANGE);
  g.beginPath(); g.ellipse(bx, by, CAT.bodyRx, CAT.bodyRy, 0, 0, 7); g.fill();
  // 白胸腹
  g.fillStyle = rgbStr(CAT_WHITE);
  g.beginPath(); g.ellipse(bx + 8, by + 8, 26, 15, 0, 0, 7); g.fill();
  // 虎纹三弧
  g.strokeStyle = rgbStr(CAT_STRIPE); g.lineWidth = 5; g.lineCap = 'round';
  for (const dx of [-22, -6, 10]) {
    g.beginPath(); g.moveTo(bx + dx, by - CAT.bodyRy + 4);
    g.quadraticCurveTo(bx + dx + 6, by - 8, bx + dx, by - 2); g.stroke();
  }
  // 头＋耳
  g.fillStyle = rgbStr(CAT_ORANGE); g.beginPath(); g.arc(hxp, hyp, CAT.headR, 0, 7); g.fill();
  g.beginPath(); g.moveTo(hxp - 13, hyp - 7); g.lineTo(hxp - 16, hyp - 22); g.lineTo(hxp - 4, hyp - 14); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(hxp + 5, hyp - 14); g.lineTo(hxp + 14, hyp - 21); g.lineTo(hxp + 12, hyp - 6); g.closePath(); g.fill();
  // 白吻部
  g.fillStyle = rgbStr(CAT_WHITE);
  g.beginPath(); g.ellipse(hxp + 1, hyp + 7, 8, 5.5, 0, 0, 7); g.fill();
}

// ---- 角色细笔触：source-atop（只画角色内部）；每格随机数 = hash(格号)，与落笔与否无关 ----
export function charStrokes(g: CanvasRenderingContext2D, src: HTMLCanvasElement): void {
  const x0 = 110, y0 = 190, w = 620, h = 520, cell = 7;
  const sctx = src.getContext('2d', {willReadFrequently: true})!;
  const sd = sctx.getImageData(x0, y0, w, h).data;
  g.save();
  g.globalCompositeOperation = 'source-atop';
  g.lineCap = 'round';
  g.lineWidth = 4.5;
  for (let j = 0; j < h / cell; j++) {
    for (let i = 0; i < w / cell; i++) {
      const hx = hash(i, j), hy = hash(j + 7919, i);
      const px = (i + hx) * cell, py = (j + hy) * cell;
      const k = (((py | 0) * w) + (px | 0)) * 4;
      if (sd[k + 3] < 200) continue;                       // 角色外不落笔
      const X = x0 + px, Y = y0 + py;
      // INDEX 短板修正：脸与手保护——五官区完全不上笔（平涂保可读，五官线另补）
      if (inEllipse(X, Y, GIRL_FACE.x, GIRL_FACE.y, GIRL_FACE.rx, GIRL_FACE.ry)) continue;
      let skip = false;
      for (const [hxp, hyp, hr] of HANDS) if (inEllipse(X, Y, hxp, hyp, hr, hr)) { skip = true; break; }
      if (skip) continue;
      const h3 = hash(i + 31, j + 17), h4 = hash(i + 97, j + 53);
      let col: RGB = [sd[k], sd[k + 1], sd[k + 2]];
      // 白裙/白吻部保白：col>(240,236,225) 判定混回白（配方参数），否则白件被刷花
      if (col[0] > 240 && col[1] > 236 && col[2] > 225) {
        const w: RGB = ([[255, 255, 255], [220, 214, 250], [250, 240, 220], [205, 200, 240]] as RGB[])[(h3 * 4) | 0];
        col = [w[0] * 0.6 + 255 * 0.4, w[1] * 0.6 + 250 * 0.4, w[2] * 0.6 + 248 * 0.4];
      } else {
        col = [col[0] + (h3 - 0.5) * 30, col[1] + (h4 - 0.5) * 30, col[2] + (hx - 0.5) * 30];
      }
      // 方向场：裙身竖向微斜 / 猫身沿背弧 / 头部放射
      let a: number;
      if (X > CAT_BOX.x0 - 40 && Y > CAT_BOX.y0 - 20) a = Math.atan2(Y - CAT.body[1], X - CAT.body[0]) + Math.PI / 2;
      else if (Y < 300) a = Math.atan2(Y - GIRL.head[1], X - GIRL.head[0]) + Math.PI / 2;
      else a = -Math.PI / 2 + 0.22 * Math.sin(X * 0.03);
      const L = 13 * (0.7 + h4 * 0.6);
      g.strokeStyle = rgbStr(col);
      g.beginPath();
      g.moveTo(X - Math.cos(a) * L / 2, Y - Math.sin(a) * L / 2);
      g.lineTo(X + Math.cos(a) * L / 2, Y + Math.sin(a) * L / 2);
      g.stroke();
    }
  }
  g.restore();
}

/** 角色层整层构建（烘焙期一次） */
export function drawActors(g: CanvasRenderingContext2D): void {
  drawGirl(g);
  drawCat(g);
}

// ---- 五官线（热帧每帧补画；签名④：印象派不勾轮廓，只点出眼口）----
export function drawGirlFeatures(g: CanvasRenderingContext2D, t: number): void {
  const [hx, hy] = GIRL.head;
  const blink = (t % 4.3) < 0.14;
  g.save();
  g.lineCap = 'round';
  // 少女：眉（淡紫细线）＋眼＋唇
  g.strokeStyle = 'rgba(110,90,170,.75)'; g.lineWidth = 1.2;
  g.beginPath(); g.arc(GIRL.eyeL[0] - 1, GIRL.browY, 3.3, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
  g.beginPath(); g.arc(GIRL.eyeR[0] + 1, GIRL.browY, 3.3, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
  if (blink) {
    g.lineWidth = 1.6;
    g.beginPath(); g.arc(GIRL.eyeL[0], GIRL.eyeL[1], 3, 0.3, Math.PI - 0.3); g.stroke();
    g.beginPath(); g.arc(GIRL.eyeR[0], GIRL.eyeR[1], 3, 0.3, Math.PI - 0.3); g.stroke();
  } else {
    g.fillStyle = '#4a60b0';
    g.beginPath(); g.arc(GIRL.eyeL[0], GIRL.eyeL[1] + 0.7, 2.6, 0, 7); g.fill();
    g.beginPath(); g.arc(GIRL.eyeR[0], GIRL.eyeR[1] + 0.7, 2.6, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.beginPath(); g.arc(GIRL.eyeL[0] + 0.9, GIRL.eyeL[1] - 0.3, 0.9, 0, 7); g.fill();
    g.beginPath(); g.arc(GIRL.eyeR[0] + 0.9, GIRL.eyeR[1] - 0.3, 0.9, 0, 7); g.fill();
  }
  g.fillStyle = '#e05a6a';
  g.beginPath(); g.moveTo(hx - 3.3, GIRL.lip[1]); g.lineTo(hx, GIRL.lip[1] + 2.3); g.lineTo(hx + 3.3, GIRL.lip[1]); g.closePath(); g.fill();
  // 猫眼（绿，眯眼内容；blink 弧）
  const cblink = (t % 5.1) < 0.12;
  if (cblink) {
    g.lineWidth = 1.6;
    g.beginPath(); g.arc(CAT.eyeL[0], CAT.eyeL[1], 3.3, 0.2, Math.PI - 0.2); g.stroke();
    g.beginPath(); g.arc(CAT.eyeR[0], CAT.eyeR[1], 3.3, 0.2, Math.PI - 0.2); g.stroke();
  } else {
    g.fillStyle = '#78c060';
    g.beginPath(); g.arc(CAT.eyeL[0], CAT.eyeL[1], 3.3, 0, 7); g.fill();
    g.beginPath(); g.arc(CAT.eyeR[0], CAT.eyeR[1], 3.3, 0, 7); g.fill();
    g.fillStyle = '#3a3050';
    g.beginPath(); g.ellipse(CAT.eyeL[0] + 0.7, CAT.eyeL[1], 1.3, 3, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(CAT.eyeR[0] + 0.7, CAT.eyeR[1], 1.3, 3, 0, 0, 7); g.fill();
  }
  g.fillStyle = '#e07a80';
  g.beginPath(); g.arc(CAT.nose[0], CAT.nose[1], 2.3, 0, 7); g.fill();
  g.restore();
}
