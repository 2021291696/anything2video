import React, {useLayoutEffect, useMemo, useRef, useState} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {BED, CAM, COL, EV, FPS, PILLS, PILL_L, TOTAL, clamp01, expoOut, smooth, waveHeight} from './world';

/**
 * soft-jelly 正片场景：粉彩棚拍软胶世界（静棚 + 物体动）。
 * 签名：糖果软材质（MeshPhysicalMaterial 近似 SSS）/ 克隆阵列波 / jelly squash / 棚拍布光 + 无穷 Cyc。
 * 确定性纪律：一切运动 = 纯帧号函数（预积分轨道 + 闭式波场）；随机量只走 world.rng（mulberry32）；
 * 无时钟、无物理引擎、无 Math.random、无 useFrame。
 * 技法借鉴 mg-styles-15 demos/04-3d-render（MIT, Vincentwei1021），TSX/R3F 重写。
 *
 * frame_cost 门裁决记录（scripts/gate_frame_cost.mjs 实测，report.md 存档）：
 * - transmission 材质在 SwiftShader 软渲 1268→656ms/帧 → 关，改 sheen 近似（七折取舍）；
 * - 床面 physical→standard 材质 656→485；涟漪 ring 早退+降段数 →407；AA 关 →328；床不投影 →284；
 * - scene.environment（IBL 全场逐碎片采样）262→108ms/帧 → **env 只挂 4 颗糖果材质**（小画幅），
 *   PMREM 模块级缓存只建一次。
 */

// ---------------------------------------------------------------- 棚拍环境（RoomEnvironment PMREM：糖果 coat 高光的柔和棚反；只挂糖果材质）
let _envCache: {gl: THREE.WebGLRenderer; tex: THREE.Texture} | null = null;
const getStudioEnv = (gl: THREE.WebGLRenderer): THREE.Texture => {
  if (_envCache && _envCache.gl === gl) return _envCache.tex;
  if (_envCache) {
    _envCache.tex.dispose();
    _envCache = null;
  }
  const pmrem = new THREE.PMREMGenerator(gl);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
  pmrem.dispose();
  _envCache = {gl, tex: env.texture};
  return env.texture;
};

const EnvProvider: React.FC<{onEnv: (tex: THREE.Texture) => void}> = ({onEnv}) => {
  const gl = useThree((s) => s.gl);
  useLayoutEffect(() => {
    onEnv(getStudioEnv(gl));
  }, [gl, onEnv]);
  return null;
};

// ---------------------------------------------------------------- 无穷 Cyc（地面 + 圆弧收边 + 后墙，source make_cyc 惯用法重写）
const useCycGeometry = () =>
  useMemo(() => {
    const prof: Array<[number, number]> = []; // (depth z, height y)
    const FLOOR_Y = -0.5; // 床毯顶=0（胶囊着陆面），地面在其下 0.5（源 make_cyc：地面 z=-PILL_L）
    for (let i = 0; i <= 16; i++) prof.push([-18 + 27 * (i / 16), FLOOR_Y]);
    const Rc = 4.2;
    for (let i = 1; i <= 14; i++) {
      const a = (Math.PI / 2) * (i / 14);
      prof.push([9 + Rc * Math.sin(a), FLOOR_Y + Rc * (1 - Math.cos(a))]); // 圆弧收边
    }
    for (let z = 9 + Rc; prof[prof.length - 1][1] < FLOOR_Y + 9; ) {
      prof.push([z, prof[prof.length - 1][1] + 0.9]);
      z += 0.001; // 后墙爬升
    }
    const xs = [-22, 22];
    const pos: number[] = [];
    const idx: number[] = [];
    const vcol: number[] = [];
    const cFront = new THREE.Color('#cdb4c4'); // 前景地面略暗（烘焙明暗，替代灯光）
    const cBack = new THREE.Color('#f6e6f0'); // 后墙自发光感（更亮更粉）
    for (let iy = 0; iy < prof.length; iy++) {
      for (const x of xs) {
        pos.push(x, prof[iy][1], prof[iy][0]);
        const k = smooth(-4, 8.5, prof[iy][0]); // 越远越亮
        const c = cFront.clone().lerp(cBack, k);
        vcol.push(c.r, c.g, c.b);
      }
    }
    for (let iy = 0; iy < prof.length - 1; iy++) {
      const a = iy * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(vcol, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);

const Cyc: React.FC = () => {
  const geo = useCycGeometry();
  return (
    <mesh geometry={geo}>
      {/* 无灯烘焙（frame_cost 门裁决：Cyc 是最大平面，改 Basic 顶色渐变，不付逐碎片光照） */}
      <meshBasicMaterial vertexColors />
    </mesh>
  );
};

// ---------------------------------------------------------------- 软糖果材质（RECON scene.py:208-215 SSS 参数换算，近似打七折）
// 源 gummy：SSS Weight 1.0 / Radius (1.0,0.5,0.8) / Scale 0.11 / Coat 0.45 / Rough 0.15 / IOR 1.42。
// WebGL 近似（七折）：SSS→sheen 边缘软光+淡体色；coat 0.45 原值保留；transmission 门裁决关闭。
const CandyMaterial: React.FC<{color: string; rough?: number; sheenBoost?: boolean; env?: THREE.Texture | null}> = ({
  color,
  rough = 0.22,
  sheenBoost = false,
  env,
}) => (
  <meshPhysicalMaterial
    color={color}
    roughness={rough}
    metalness={0}
    ior={1.42}
    clearcoat={0.45}
    clearcoatRoughness={0.16}
    sheen={sheenBoost ? 0.42 : 0.26}
    sheenRoughness={0.38}
    sheenColor={'#f5bfda'}
    specularIntensity={0.55}
    envMap={env ?? undefined}
    envMapIntensity={0.4}
  />
);

// ---------------------------------------------------------------- 床面克隆阵列（hex 网格 + 行进波 + 预备 tremble/nest）
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const EPS = 0.04;
const BED_HALF_H = 0.211; // 柱顶相对实例原点（几何烘焙后恒定）

const BedField: React.FC = () => {
  const f = useCurrentFrame() + 1;
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const capRef = useRef<THREE.InstancedMesh>(null);
  // 双色柱几何：体（略窄，下沉）+ 帽（略宽，上移，台阶唇缘）。
  // 段数经 frame_cost 门裁决：capSeg 2 / radial 10（~1.1k 实例双通道的最低可用档）。
  const bodyGeo = useMemo(() => {
    const g = new THREE.CapsuleGeometry(0.098, 0.14, 3, 8);
    g.translate(0, -0.062, 0);
    return g;
  }, []);
  const capGeo = useMemo(() => {
    const g = new THREE.CapsuleGeometry(0.106, 0.07, 3, 8);
    g.translate(0, 0.07, 0);
    return g;
  }, []);
  // 逐实例体色（奶油为主 + 丁香/蜜桃岛），seeded 一次
  useLayoutEffect(() => {
    const cols = [new THREE.Color(COL.bodyCream), new THREE.Color(COL.bodyLilac), new THREE.Color(COL.bodyPeach)];
    const cap = new THREE.Color(COL.cap);
    BED.forEach((b, i) => {
      const c = cols[b.variant].clone().multiplyScalar(0.97 + 0.06 * ((b.trembleSeed / (Math.PI * 2)) % 1));
      bodyRef.current?.setColorAt(i, c);
      capRef.current?.setColorAt(i, cap);
    });
    if (bodyRef.current?.instanceColor) bodyRef.current.instanceColor.needsUpdate = true;
    if (capRef.current?.instanceColor) capRef.current.instanceColor.needsUpdate = true;
  }, []);
  // 每帧波场驱动（dz / tilt / squash / tremble / nest / 边缘下沉 / 倒伏件）
  useLayoutEffect(() => {
    const t = f / FPS;
    const tHeroLand = EV.hero_land / FPS;
    const heroX = PILLS[3].x, heroY = PILLS[3].y;
    const aTr = smooth(6.4, 7.9, t) * (t < tHeroLand + 0.02 ? 1 : 0);
    const ne = smooth(6.7, 7.9, t) * (1 - smooth(tHeroLand, tHeroLand + 0.05, t));
    for (let i = 0; i < BED.length; i++) {
      const b = BED[i];
      const h = waveHeight(b.x, b.y, t);
      const hx = (waveHeight(b.x + EPS, b.y, t) - waveHeight(b.x - EPS, b.y, t)) / (2 * EPS);
      const hy = (waveHeight(b.x, b.y + EPS, t) - waveHeight(b.x, b.y - EPS, t)) / (2 * EPS);
      let dz = h;
      const tiltX = Math.atan(1.35 * hy);
      const tiltY = -Math.atan(1.35 * hx);
      // hero 预备：落点 tremble + nest 弹坑
      const rH = Math.hypot(b.x - heroX, b.y - heroY);
      const near = Math.exp(-Math.pow(rH / 1.05, 2));
      dz += aTr * near * 0.018 * Math.sin(2 * Math.PI * 17 * t + b.trembleSeed);
      dz += -0.11 * ne * Math.exp(-Math.pow(rH / 0.48, 2)) + 0.05 * ne * Math.exp(-Math.pow((rH - 0.64) / 0.22, 2));
      // 阵列 squash（行进扫掠带上胶囊压扁/拉高）
      const swSweep = 0.5 * sweepBand(b.x, b.y, t) + 0.62 * sweepBand2(b.x, b.y, t);
      // 边缘下沉（MoGraph falloff：远处沉入地面防尖刺）
      const edge = (1 - smooth(2.4, 3.7, b.y)) * (1 - smooth(2.5, 4.2, -b.x)) * (1 - smooth(2.5, 4.2, b.x));
      dz -= (1 - edge) * PILL_L * 1.1;
      const sc = b.jitS * (1 + 0.28 * swSweep);
      const sz = b.jitS * (1 + 0.34 * swSweep);
      if (b.stray) {
        // 倒伏件：躺平在近景（床面上一两颗翻倒的胶囊交代形状与双色）
        _p.set(b.x, 0.092, b.y);
        _e.set(Math.PI / 2 + b.tiltX, b.tiltY, 0);
      } else {
        // 实例原点=柱底基准：y = dz - BED_HALF_H·sz → 柱顶恒等于 dz
        _p.set(b.x, dz - BED_HALF_H * sz, b.y);
        _e.set(tiltX + b.tiltX, tiltY + b.tiltY, 0);
      }
      _q.setFromEuler(_e);
      _s.set(sc, sz, sc);
      _m.compose(_p, _q, _s);
      bodyRef.current?.setMatrixAt(i, _m);
      capRef.current?.setMatrixAt(i, _m);
    }
    if (bodyRef.current) bodyRef.current.instanceMatrix.needsUpdate = true;
    if (capRef.current) capRef.current.instanceMatrix.needsUpdate = true;
  }, [f]);
  return (
    <group>
      {/* 床体 standard 材质（门裁决：physical 的 sheen/coat 留给糖果；env 不挂床面） */}
      <instancedMesh ref={bodyRef} args={[bodyGeo, undefined, BED.length]}>
        <meshStandardMaterial roughness={0.34} metalness={0} />
      </instancedMesh>
      <instancedMesh ref={capRef} args={[capGeo, undefined, BED.length]} receiveShadow>
        <meshStandardMaterial color={COL.cap} roughness={0.3} metalness={0} />
      </instancedMesh>
    </group>
  );
};

// 行进扫掠带（与 world.waveHeight 内两条 sweep 同参数，供 squash 单独取值）
const sweepBand = (x: number, y: number, t: number) => {
  const u = x * 0.31 + y * 0.95 - 3.0 * (t - 0.45);
  return Math.exp(-Math.pow(u / 0.85, 2)) * Math.exp(-Math.max(0, t - 0.45) / 1.1);
};
const sweepBand2 = (x: number, y: number, t: number) => {
  const u = x * 0.92 + y * 0.39 - 2.6 * (t - EV.wave_from / FPS);
  return Math.exp(-Math.pow(u / 0.9, 2));
};

// ---------------------------------------------------------------- 糖果胶囊（躺平双色：帽 + 体；jelly squash + 落前翻滚 + 落后 wobble + 收尾呼吸）
const CandyPill: React.FC<{p: (typeof PILLS)[number]; idx: number; env: THREE.Texture | null}> = ({p, idx, env}) => {
  const f = useCurrentFrame() + 1;
  const {r, L, track, dropF, landF} = p;
  if (f < dropF) return null;
  const fi = Math.min(TOTAL - 1, Math.max(0, f - 1));
  const z = track.z[fi];
  const s = track.s[fi];
  const t = f / FPS;
  // 落前翻滚（sim.py drop_rot：(1-u)^2.2 衰减到 0，落点归正）
  const t0 = landF / FPS - Math.sqrt((2 * 2.6) / 16);
  const rotZ = p.dropRot * Math.pow(1 - clamp01((t - t0) / Math.max(0.001, landF / FPS - t0)), 2.2);
  // 落后 wobble（绕接触点的点头阻尼振荡）
  const tau = t - landF / FPS;
  const wob = tau > 0 ? 0.055 * Math.exp(-tau / 0.42) * Math.sin(2 * Math.PI * 2.7 * tau) * (p.hero ? 1.35 : 1) : 0;
  // 收尾呼吸（定帧段微动，防全静止）
  const idle = 0.006 * Math.sin(2 * Math.PI * 0.55 * t + idx * 1.3) * smooth(EV.freeze_from - 14, EV.freeze_from, f);
  const sy = Math.max(0.5, 1 + s);
  const sxz = 1 / Math.sqrt(Math.max(0.5, 1 + s));
  const capH = L * 0.42;
  return (
    <group position={[p.x, z + r + idle, p.y]} rotation={[wob, 0.18 * idx, Math.PI / 2 + rotZ]} scale={[sy, sxz, sxz]}>
      {/* 帽（略宽，台阶唇缘）——沿几何轴（local Y）偏移 */}
      <mesh position={[0, capH * 0.55, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[r, Math.max(0.02, capH - 2 * r * 0.55), 6, 20]} />
        <CandyMaterial color={p.cap} env={env} />
      </mesh>
      {/* 体（略窄） */}
      <mesh position={[0, -(L - capH) * 0.45, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[r * 0.94, Math.max(0.02, L - capH - 2 * r * 0.52), 6, 20]} />
        <CandyMaterial color={p.body} sheenBoost env={env} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------- 相机（静棚微呼吸：expoOut 慢漂 + 双频微动，禁全静态）
const CameraRig: React.FC = () => {
  const f = useCurrentFrame() + 1;
  const camera = useThree((s) => s.camera);
  const t = f / FPS;
  const u = expoOut(clamp01(f / TOTAL));
  const px = CAM.pos0[0] + (CAM.pos1[0] - CAM.pos0[0]) * u + 0.014 * Math.sin(2 * Math.PI * 0.11 * t);
  const py = CAM.pos0[1] + (CAM.pos1[1] - CAM.pos0[1]) * u + 0.01 * Math.sin(2 * Math.PI * 0.07 * t + 1.7);
  const pz = CAM.pos0[2] + (CAM.pos1[2] - CAM.pos0[2]) * u;
  camera.position.set(px, py, pz);
  camera.lookAt(CAM.tgt[0], CAM.tgt[1], CAM.tgt[2]);
  return null;
};

// ---------------------------------------------------------------- 地平线辉光 + 接地光晕（确定性 canvas 纹理）
const useGlowTexture = () =>
  useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    const grd = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    grd.addColorStop(0, 'rgba(250,232,243,0.85)');
    grd.addColorStop(0.55, 'rgba(247,226,239,0.38)');
    grd.addColorStop(1, 'rgba(247,226,239,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }, []);

const GlowPlates: React.FC = () => {
  const tex = useGlowTexture();
  return (
    <group>
      {/* 地平线自发光辉光（Cyc 背墙前方） */}
      <sprite position={[0, 1.2, 8.6]} scale={[15, 5.5, 1]}>
        <spriteMaterial map={tex} transparent opacity={0.45} depthWrite={false} />
      </sprite>

    </group>
  );
};

// ---------------------------------------------------------------- 主场景
export const JellyScene: React.FC = () => {
  const {width, height} = useVideoConfig();
  const [envTex, setEnvTex] = useState<THREE.Texture | null>(null);
  return (
    <ThreeCanvas
      width={width}
      height={height}
      shadows
      dpr={1}
      camera={{fov: CAM.fov, position: [CAM.pos0[0], CAM.pos0[1], CAM.pos0[2]], near: 0.1, far: 80}}
      gl={{antialias: false}}
      style={{position: 'absolute', inset: 0}}
    >
      <color attach="background" args={[COL.bg]} />
      <fog attach="fog" args={[COL.bg, 7, 26]} />
      <EnvProvider onEnv={setEnvTex} />
      <CameraRig />
      {/* 棚拍布光：key 带影 + 粉色条灯（左后）+ 粉彩半球（正面补光门裁决裁掉） */}
      <directionalLight
        position={[3.2, 5.4, 2.6]}
        intensity={2.1}
        color="#fff2e8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={20}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-4.4, 2.4, -1.6]} intensity={1.5} color={COL.rimPink} />
      <ambientLight color={'#ffe4f0'} intensity={0.75} />
      <Cyc />
      <GlowPlates />
      <BedField />
      {PILLS.map((p, i) => (
        <CandyPill key={i} p={p} idx={i} env={envTex} />
      ))}
    </ThreeCanvas>
  );
};
