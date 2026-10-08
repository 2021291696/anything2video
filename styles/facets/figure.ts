// 人物（一张脸的两个视角）—— facets 签名③（毕加索式双视角脸：侧脸剪影 + 正面杏眼）+ 切面宿主。
// 管线：平涂剪影进离屏 → facetize（cell 58 大面 ≥58 纪律；发区 cell 26 细切 + 金色 only 过滤）→
// 补毕加索式结构：脸部两块明暗重铺面 / 前半张脸蓝灰面 / 正面杏眼 / 螺旋耳 / 红唇 / 白领三角 / 裙摆放射楔面 / 直线外轮廓（端点外伸）。
// 几何为 1280×720 自设计（非源配方坐标缩放），切面器机制借鉴 scenes/11_cubism.js，TSX 重写。
import {A, C, FIG, type CanvasCtx, type Pt} from './types';
import {clamp, easeInOutCubic, hash2, lerp} from './rand';
import {layer, facetize, scatterAmp} from './facetize';
import {poly, segs} from './plane';

/** 头部锚点（侧脸朝左）。 */
export const HEAD = {
  headC: [872, 300] as Pt, headTop: [880, 212] as Pt, forehead: [818, 246] as Pt, brow: [806, 278] as Pt,
  noseTip: [790, 318] as Pt, noseBase: [802, 330] as Pt, lips: [798, 344] as Pt, chin: [810, 372] as Pt,
  jaw: [856, 392] as Pt, ear: [906, 318] as Pt, nape: [934, 330] as Pt, skullBack: [952, 268] as Pt,
  bunC: [988, 258] as Pt, eye: [846, 298] as Pt, waist: [824, 566] as Pt,
};
/** 人物切面包围盒 / 发区包围盒。 */
export const FIG_BOX: [number, number, number, number] = [700, 160, 1060, 660];
export const HAIR_BOX: [number, number, number, number] = [880, 180, 1050, 570];
/** 金发颜色过滤（配方 only 谓词原参数：R>150 && B<130 && R-B>60）。 */
const onlyHair = (s: [number, number, number, number]): boolean => s[0] > 150 && s[2] < 130 && s[0] - s[2] > 60;

/** 平涂剪影（fill 模式无线，切面器的源）。breath 为亚像素呼吸量。 */
export function fillFigure(g: CanvasCtx, breath: number): void {
  const H2 = HEAD;
  const bo = breath;
  g.save();
  g.translate(0, bo);
  // 长发+发髻（金色块，供发区细切的 only 过滤取色）
  g.fillStyle = FIG.hair;
  poly(g, [[H2.headTop[0], H2.headTop[1]], [920, 200], [H2.skullBack[0] + 30, H2.skullBack[1] - 30], [1032, 258], [1020, 330], [1000, 400], [1006, 470], [990, 545], [962, 552], [952, 470], [944, 400], [H2.nape[0], H2.nape[1]], [902, 300], [860, 244]]);
  g.fill();
  g.beginPath();
  g.arc(H2.bunC[0], H2.bunC[1], 46, 0, Math.PI * 2);
  g.fill();
  // 脸（肤色剪影，侧脸轮廓）
  g.fillStyle = FIG.skin;
  poly(g, [H2.forehead, [838, 226], H2.headTop, [900, 226], [930, 252], [938, 292], H2.ear, [894, 352], H2.jaw, H2.chin, H2.lips, H2.noseBase, H2.noseTip, H2.brow, [816, 262]]);
  g.fill();
  // 颈
  g.fillStyle = FIG.skin;
  poly(g, [[846, 388], [890, 384], [896, 444], [840, 448]]);
  g.fill();
  // 裙（蓝灰）——袖必须更深，否则手臂融进裙切面
  g.fillStyle = FIG.dress;
  poly(g, [[788, 462], [986, 458], [1040, 648], [740, 648]]);
  g.fill();
  // 袖（上臂）
  g.fillStyle = FIG.sleeve;
  poly(g, [[800, 462], [842, 458], [780, 564], [742, 550]]);
  g.fill();
  // 前臂（肤）+ 手（搭在桌沿）
  g.fillStyle = FIG.skin;
  poly(g, [[780, 564], [742, 550], [720, 584], [728, 596]]);
  g.fill();
  g.beginPath();
  g.ellipse(714, 588, 18, 8, -0.12, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** 脸部两块明暗重铺面（切面会把金发色带进脸，须还原——配方原纪律）。 */
function faceRelayout(g: CanvasCtx): void {
  const H2 = HEAD;
  g.save();
  g.beginPath();
  poly(g, [H2.forehead, [838, 226], H2.headTop, [900, 226], [930, 252], [938, 292], H2.ear, [894, 352], H2.jaw, H2.chin, H2.lips, H2.noseBase, H2.noseTip, H2.brow, [816, 262]]);
  g.clip();
  g.fillStyle = FIG.skinA;
  g.fillRect(760, 200, 220, 220);
  g.fillStyle = FIG.skinB;
  poly(g, [[H2.ear[0] - 24, H2.ear[1] - 52], [H2.ear[0] + 18, H2.ear[1] - 36], [H2.chin[0] + 44, H2.chin[1] + 8], [H2.chin[0] + 8, H2.chin[1] - 8]]);
  g.fill();
  g.restore();
  g.fillStyle = FIG.skinA;
  poly(g, [[846, 388], [890, 384], [896, 444], [840, 448]]);
  g.fill();
}

/** 毕加索式前半张脸蓝灰面（k = 0..1 覆盖进度，HERO 段擦入）。 */
export function facePlaneWipe(g: CanvasCtx, k: number): void {
  if (k <= 0) return;
  const H2 = HEAD;
  g.save();
  poly(g, [H2.forehead, [838, 226], H2.headTop, [900, 226], [930, 252], [938, 292], H2.ear, [894, 352], H2.jaw, H2.chin, H2.lips, H2.noseBase, H2.noseTip, H2.brow, [816, 262]]);
  g.clip();
  // 从脸前缘（左）向后覆盖至 x≈890：前 60% 蓝灰面（含鼻/唇/正面眼），后 40% 露出肤色重铺面与耳——双视角对比更强
  const wipeX = lerp(760, 890, k);
  g.fillStyle = FIG.facePlane;
  g.beginPath();
  g.rect(760, 196, wipeX - 760, 224);
  g.fill();
  g.strokeStyle = 'rgba(40,30,20,0.4)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(wipeX, 200);
  g.lineTo(wipeX, 416);
  g.stroke();
  g.restore();
}

/** 正面杏眼（k = 0..1 睁眼进度）+ 眉弧。 */
export function frontalEye(g: CanvasCtx, k: number): void {
  if (k <= 0) return;
  const e = HEAD.eye;
  const ry = 12 * k;
  g.fillStyle = FIG.eyeWhite;
  g.beginPath();
  g.moveTo(e[0] - 15, e[1]);
  g.quadraticCurveTo(e[0] + 2, e[1] - ry, e[0] + 19, e[1]);
  g.quadraticCurveTo(e[0] + 2, e[1] + ry * 0.92, e[0] - 15, e[1]);
  g.fill();
  g.strokeStyle = C.ink;
  g.lineWidth = 2.2;
  g.stroke();
  if (k > 0.6) {
    g.fillStyle = FIG.iris;
    g.beginPath();
    g.arc(e[0] + 3, e[1], 5.5 * clamp((k - 0.6) / 0.4), 0, Math.PI * 2);
    g.fill();
  }
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(e[0] - 12, e[1] - 13 * k);
  g.quadraticCurveTo(e[0] + 4, e[1] - 21 * k, e[0] + 20, e[1] - 12 * k);
  g.stroke();
}

/** 红唇（侧脸唇位的小楔面，双视角完成时加重一笔）。 */
export function lipsPatch(g: CanvasCtx, k: number): void {
  if (k <= 0) return;
  const L = HEAD.lips;
  g.fillStyle = FIG.lip;
  poly(g, [[L[0] - 9, L[1] - 4 * k], [L[0] + 10, L[1] - 2 * k], [L[0] + 2, L[1] + 8 * k]]);
  g.fill();
}

/** 螺旋耳。 */
function spiralEar(g: CanvasCtx): void {
  const e = HEAD.ear;
  g.strokeStyle = C.ink;
  g.lineWidth = 2;
  g.beginPath();
  for (let k = 0; k < 14; k++) {
    const q = k / 13, ang = q * 5.5, rr = 11 * (1 - q * 0.7);
    const x = e[0] + Math.cos(ang) * rr, y = e[1] + Math.sin(ang) * rr * 1.3;
    if (k) g.lineTo(x, y); else g.moveTo(x, y);
  }
  g.stroke();
}

/** 白领两块明暗三角 + 三颗扣。 */
function collar(g: CanvasCtx): void {
  const bx = 862, by = 452;
  g.fillStyle = FIG.collar;
  poly(g, [[bx - 22, by - 4], [bx + 6, by + 6], [bx - 8, by + 38]]);
  g.fill();
  g.fillStyle = FIG.collarD;
  poly(g, [[bx + 6, by + 6], [bx + 34, by - 6], [bx + 16, by + 36]]);
  g.fill();
  g.strokeStyle = C.ink;
  g.lineWidth = 1.8;
  poly(g, [[bx - 22, by - 4], [bx + 34, by - 6], [bx + 16, by + 36], [bx + 6, by + 6], [bx - 8, by + 38]]);
  g.stroke();
  g.fillStyle = C.ink;
  [0, 1, 2].forEach((k) => {
    g.beginPath();
    g.arc(bx + 2 - k * 2, by + 62 + k * 26, 3, 0, Math.PI * 2);
    g.fill();
  });
}

/** 裙摆：腰部 8 条放射切线 + 亮暗交替楔面。 */
function skirtFan(g: CanvasCtx): void {
  const O = HEAD.waist;
  const hem: Pt[] = [[744, 644], [792, 646], [842, 648], [892, 648], [942, 648], [992, 646], [1030, 630], [1046, 596]];
  g.save();
  hem.forEach((p, i, arr) => {
    if (i < arr.length - 1) {
      g.fillStyle = i % 2 ? 'rgba(235,228,210,0.22)' : 'rgba(30,36,46,0.28)';
      poly(g, [O, p, arr[i + 1]]);
      g.fill();
    }
    g.strokeStyle = 'rgba(30,24,18,0.42)';
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(O[0], O[1]);
    g.lineTo(p[0], p[1]);
    g.stroke();
  });
  g.restore();
}

/** 直线外轮廓画出（p = 0..1 全局进度，四组折线依次落笔）。 */
function outlines(g: CanvasCtx, p: number): void {
  const H2 = HEAD;
  const groups: Pt[][] = [
    [H2.forehead, [H2.forehead[0] - 10, H2.forehead[1] + 38], [H2.chin[0] - 12, H2.chin[1] - 16], H2.chin, [856, 420], [850, 452]],
    [H2.headTop, [H2.nape[0] + 26, H2.nape[1] - 38], H2.nape, [946, 400], [964, 470], [978, 540]],
    [[850, 456], H2.waist, [818, 640], [760, 648]],
    [[800, 466], [748, 552], [716, 586]],
  ];
  const per = 1 / groups.length;
  groups.forEach((pts, gi) => {
    const gp = clamp((p - gi * per) / per);
    if (gp <= 0) return;
    const nSeg = Math.max(1, Math.ceil((pts.length - 1) * gp));
    segs(g, pts.slice(0, nSeg + 1), 12, 'rgba(40,30,20,0.72)', 2.2);
  });
}

/** 人物整层绘制（f 为 1 起帧号，st 为沸腾步）。返回双视角完成进度（供外部核对）。 */
export function drawFigure(c: CanvasCtx, f: number, st: number): number {
  const t = (f - 1) / 30;
  const appear = clamp((f - A.FIG_IN) / (A.FIG_IN_END - A.FIG_IN));
  if (appear <= 0) return 0;
  const cut = f >= A.CUT;
  const breath = Math.sin(t * (Math.PI * 2 / 3.6)) * 1.6;
  const {cv, g} = layer('facets-fig');
  fillFigure(g, breath);
  // 平涂期（拆开之前）：直接把剪影画上屏
  if (!cut) {
    c.save();
    c.globalAlpha = appear;
    c.drawImage(cv, 0, 0);
    c.restore();
    return 0;
  }
  // 切面期：主切面 cell 58（大面纪律：34 是 low-poly 不是立体派）——三角直接画上屏（不裁剪、不垫底），
  // 轮廓被切成锯齿直边、部分三角伸出轮廓外 = 立体派「平面溢出轮廓」；散落期按 hash 相位平移。
  const scat = scatterAmp(f, A.CUT, A.HERO, A.HERO_ASM);
  facetize(c, cv, FIG_BOX, 58, 19, st, {boilFrac: 0.2, edge: 'rgba(40,30,20,0.22)', light: 0.28, dark: 0.4, scatter: scat, scatterSeed: 11});
  // 发区细切 cell 26 + 金色 only 过滤（同一平涂层继续作取色源，切面仍画上屏）
  g.save();
  g.beginPath();
  g.arc(HEAD.bunC[0], HEAD.bunC[1], 52, 0, Math.PI * 2);
  g.rect(944, 340, 92, 220);
  g.clip();
  facetize(c, cv, HAIR_BOX, 26, 23, st, {boilFrac: 0.3, alpha: 0.85, light: 0.3, minA: 200, only: onlyHair, scatter: scat * 0.7, scatterSeed: 23});
  g.restore();
  // —— 切完再补毕加索式结构 ——
  faceRelayout(c);
  skirtFan(c);
  const asm = easeInOutCubic((f - A.HERO) / (A.HERO_ASM - A.HERO));
  const planeK = clamp((f - A.HERO + 6) / (A.HERO_ASM - A.HERO + 6));
  facePlaneWipe(c, planeK); // 蓝灰半脸面 f246-262 擦入
  const eyeK = clamp((f - (A.HERO_ASM - 6)) / (A.DUAL - (A.HERO_ASM - 6)));
  frontalEye(c, eyeK);      // 正面杏眼 f256-268
  lipsPatch(c, clamp((f - (A.HERO_ASM - 2)) / 8));
  spiralEar(c);
  collar(c);
  outlines(c, clamp((f - A.SEGS) / (A.SEGS_END - A.SEGS)));
  // 散落期在结构面上再压一层碎片飞散感（少量三角随 hash 跳出）——仅拆开冲击期可见
  if (scat > 1) {
    const r2 = hash2(st, 7, 909);
    c.strokeStyle = 'rgba(40,30,20,0.35)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(820 + r2 * 40, 250 + scat * 2);
    c.lineTo(860 + r2 * 30, 270 + scat * 2.4);
    c.stroke();
  }
  return clamp(eyeK);
}
