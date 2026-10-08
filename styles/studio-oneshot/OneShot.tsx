import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {camAt, COL, ETCH, PKG, BRAIN_IGNITE, rng, spring, easeIO, clamp01} from './world';

/**
 * studio-oneshot 正片场景：深石墨影棚一镜到底（四站：沙粒→晶圆→芯片→大脑）。
 * 签名材质：瓷质白 MeshPhysicalMaterial（clearcoat 1 / roughness 0.24）+ 双色 rim（冷白+暖橙）。
 * 确定性纪律：位置全部由帧号参数化，随机量只走 world.rng(mulberry32) 模块级播种；
 * 无时钟、无物理、无 Math.random、无 useFrame。
 */

// ---------------------------------------------------------------- 共享材质 JSX（瓷质白 / 石墨瓷）
const Porcelain: React.FC<{rough?: number; color?: string}> = ({rough = 0.24, color = COL.porcelain}) => (
  <meshPhysicalMaterial color={color} roughness={rough} clearcoat={1} clearcoatRoughness={0.12} sheen={0.18} sheenColor={'#ffffff'} />
);
const Graphite: React.FC = () => (
  <meshPhysicalMaterial color={COL.graphite} roughness={0.34} clearcoat={0.55} clearcoatRoughness={0.3} />
);

// ---------------------------------------------------------------- 相机 rig（world.camAt 每帧驱动）
const CameraRig: React.FC = () => {
  const f = useCurrentFrame() + 1; // world.ts 帧号 1 起
  const camera = useThree((s) => s.camera);
  const {pos, tgt} = camAt(f);
  camera.position.set(pos[0], pos[1], pos[2]);
  camera.up.set(0, 1, 0);
  camera.lookAt(tgt[0], tgt[1], tgt[2]);
  return null;
};

// ---------------------------------------------------------------- 站 A：沙粒（瓷白晶体簇 + 环绕微尘粒）
const A_GRAINS = (() => {
  const r = rng(20261007);
  return Array.from({length: 7}, () => ({
    orbitR: 0.85 + r() * 0.55, phase: r() * Math.PI * 2, speed: 0.22 + r() * 0.3,
    y: 0.5 + r() * 0.55, size: 0.05 + r() * 0.05,
  }));
})();
const A_CRYSTALS = (() => {
  const r = rng(4407);
  return [
    {p: [0, 0.52, 0] as [number, number, number], s: 0.4, rot: r() * Math.PI},
    {p: [0.34, 0.38, 0.18] as [number, number, number], s: 0.24, rot: r() * Math.PI},
    {p: [-0.3, 0.36, -0.14] as [number, number, number], s: 0.2, rot: r() * Math.PI},
  ];
})();
const StationA: React.FC = () => {
  const f = useCurrentFrame() + 1;
  const spin = (f / 30) * 0.12;
  return (
    <group position={[-6, 0, 0]}>
      {/* 转台 */}
      <mesh position={[0, 0.09, 0]} castShadow receiveShadow rotation={[0, spin, 0]}>
        <cylinderGeometry args={[1.05, 1.2, 0.18, 48]} />
        <Graphite />
      </mesh>
      {/* 瓷白晶体簇（放大沙粒） */}
      <group rotation={[0, spin * 1.4, 0]}>
        {A_CRYSTALS.map((c, i) => (
          <mesh key={i} position={c.p} rotation={[0.35, c.rot, 0.22]} castShadow scale={c.s}>
            <icosahedronGeometry args={[1, 0]} />
            <Porcelain rough={0.2} />
          </mesh>
        ))}
      </group>
      {/* 环绕微尘粒（参数化圆轨道） */}
      {A_GRAINS.map((g, i) => {
        const a = g.phase + (f / 30) * g.speed;
        return (
          <mesh key={i} position={[Math.cos(a) * g.orbitR, g.y + Math.sin(a * 2) * 0.06, Math.sin(a) * g.orbitR]}>
            <icosahedronGeometry args={[g.size, 0]} />
            <meshStandardMaterial color="#d8d5cc" roughness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------- 站 B：晶圆（瓷盘 + 5×5 die 刻蚀扫掠 + 中芯抬起）
const WAFER_DIES = (() => {
  const out: Array<{x: number; z: number; idx: number}> = [];
  for (let gx = -2; gx <= 2; gx++) for (let gz = -2; gz <= 2; gz++) out.push({x: gx * 0.3, z: gz * 0.3, idx: (gx + 2) * 5 + (gz + 2)});
  return out;
})();
const StationB: React.FC = () => {
  const f = useCurrentFrame() + 1;
  const spin = (f / 30) * 0.1;
  const centerLift = f >= 155 ? spring((f - 155) / 30, 12, 0.6) * 0.34 : 0;
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.09, 0]} castShadow receiveShadow rotation={[0, -spin, 0]}>
        <cylinderGeometry args={[1.05, 1.2, 0.18, 48]} />
        <Graphite />
      </mesh>
      {/* 晶圆盘（瓷白） */}
      <mesh position={[0, 0.27, 0]} castShadow receiveShadow rotation={[0, spin, 0]}>
        <cylinderGeometry args={[0.98, 0.98, 0.07, 64]} />
        <Porcelain rough={0.18} />
      </mesh>
      {/* die 网格：f130-170 逐枚刻蚀点亮（青色电光） */}
      <group rotation={[0, spin, 0]}>
        {WAFER_DIES.map((d) => {
          const lit = clamp01((f - (ETCH.from + d.idx * 1.6)) / 6);
          return (
            <mesh key={d.idx} position={[d.x, 0.315 + (d.idx === 12 ? centerLift : 0), d.z]} castShadow>
              <boxGeometry args={[0.24, 0.022, 0.24]} />
              <meshStandardMaterial
                color={COL.die}
                roughness={0.3}
                metalness={0.55}
                emissive={COL.accent}
                emissiveIntensity={lit * (d.idx === 12 ? 1.1 : 0.45)}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- 站 C：芯片（封装三步：基板升起→die 落下→顶盖合上）
const C_PINS = Array.from({length: 8}, (_, i) => {
  const side = Math.floor(i / 2);
  const off = (i % 2 === 0 ? -0.22 : 0.22);
  const base = 0.42;
  const p: [number, number, number] = side === 0 ? [off, 0, -base] : side === 1 ? [off, 0, base] : side === 2 ? [-base, 0, off] : [base, 0, off];
  return p;
});
const StationC: React.FC = () => {
  const f = useCurrentFrame() + 1;
  const spin = (f / 30) * 0.1;
  const subUp = f >= PKG.substrate ? spring((f - PKG.substrate) / 30) : 0;
  const dieDrop = f >= PKG.die ? easeIO((f - PKG.die) / 14) : 0;
  const capLand = f >= PKG.cap ? easeIO((f - PKG.cap) / 12) : 0;
  const born = clamp01((f - 262) / 8); // 诞生脉冲
  return (
    <group position={[6, 0, 0]}>
      <mesh position={[0, 0.09, 0]} castShadow receiveShadow rotation={[0, spin, 0]}>
        <cylinderGeometry args={[1.05, 1.2, 0.18, 48]} />
        <Graphite />
      </mesh>
      <group rotation={[0, spin, 0]}>
        {/* 基板：f200 弹簧升起（此前藏于转台内） */}
        {f >= PKG.substrate - 2 ? (
          <mesh position={[0, 0.22 + subUp * 0.3, 0]} castShadow>
            <boxGeometry args={[1.15, 0.08, 1.15]} />
            <Porcelain rough={0.3} />
          </mesh>
        ) : null}
        {/* 引脚：f210-224 逐根弹出 */}
        {C_PINS.map((p, i) => {
          const pop = f >= 210 + i * 2 ? spring((f - (210 + i * 2)) / 30, 15, 0.65) : 0;
          if (pop <= 0.01) return null;
          return (
            <mesh key={i} position={[p[0], 0.14 + subUp * 0.3 - (1 - pop) * 0.25, p[2]]} castShadow>
              <boxGeometry args={[0.1, 0.05, 0.26]} />
              <meshStandardMaterial color="#8f929b" roughness={0.35} metalness={0.8} />
            </mesh>
          );
        })}
        {/* die：f224-238 自高处空降落到基板上（此前不可见；装配目标 y=0.305+subUp*0.3） */}
        {f >= PKG.die - 4 ? (
          <mesh position={[0, 0.305 + subUp * 0.3 + (1 - dieDrop) * 1.0, 0]} castShadow>
            <boxGeometry args={[0.5, 0.09, 0.5]} />
            <meshStandardMaterial color={COL.die} roughness={0.25} metalness={0.6} emissive={COL.accent} emissiveIntensity={born * 0.8} />
          </mesh>
        ) : null}
        {/* 顶盖：f244-256 自高处合上（此前不可见；装配目标 y=0.38+subUp*0.3） */}
        {f >= PKG.cap - 4 ? (
          <mesh position={[0, 0.38 + subUp * 0.3 + (1 - capLand) * 1.1, 0]} castShadow>
            <boxGeometry args={[0.82, 0.06, 0.82]} />
            <Porcelain rough={0.2} />
          </mesh>
        ) : null}
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- 站 D：大脑（点云轮廓 + 暖橙内核 + 斜环）
const brainGeo = (() => {
  const r = rng(77);
  const pts: number[] = [];
  const pushEllipsoid = (cx: number, cy: number, cz: number, a: number, b: number, c: number, n: number, jitter: number) => {
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const th = golden * i;
      const j = 1 + (r() - 0.5) * jitter;
      pts.push(cx + Math.cos(th) * rad * a * j, cy + y * b * j, cz + Math.sin(th) * rad * c * j);
    }
  };
  pushEllipsoid(-0.3, 1.2, 0, 0.44, 0.36, 0.54, 640, 0.12); // 左半球
  pushEllipsoid(0.3, 1.2, 0, 0.44, 0.36, 0.54, 640, 0.12); // 右半球
  pushEllipsoid(0, 0.84, -0.3, 0.32, 0.17, 0.24, 200, 0.14); // 小脑
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
})();
const StationD: React.FC = () => {
  const f = useCurrentFrame() + 1;
  const spin = (f / 30) * 0.08;
  const ignite = clamp01((f - BRAIN_IGNITE.from) / (BRAIN_IGNITE.full - BRAIN_IGNITE.from));
  const pulse = 0.78 + 0.22 * Math.sin((f / 30) * Math.PI * 2 * 0.8);
  const glow = ignite * pulse;
  return (
    <group position={[12, 0, 0]}>
      {/* 基座（低柱） */}
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.0, 1.12, 0.12, 48]} />
        <Graphite />
      </mesh>
      {/* 大脑点云轮廓（冷白；点亮后增亮） */}
      <points geometry={brainGeo} rotation={[0, spin, 0]}>
        <pointsMaterial
          size={0.032}
          color={COL.rimCold}
          transparent
          opacity={0.3 + glow * 0.65}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
      {/* 暖橙内核（hero 点亮 + 呼吸脉动） */}
      <mesh position={[0, 1.16, 0]}>
        <sphereGeometry args={[0.24 + glow * 0.05, 32, 24]} />
        <meshStandardMaterial color={COL.rimWarm} emissive={COL.rimWarm} emissiveIntensity={glow * 2.2} roughness={0.4} />
      </mesh>
      {/* 两条斜环（瓷质，绕大脑慢旋；圆心与大脑同高） */}
      {[0.55, 0.75].map((rr, i) => (
        <mesh key={i} position={[0, 1.16, 0]} rotation={[Math.PI / 2 - 0.35 + i * 0.5, spin * (1.2 + i), i * 0.3]}>
          <torusGeometry args={[rr, 0.011, 12, 64]} />
          <meshStandardMaterial color="#cfccc4" roughness={0.35} metalness={0.3} />
        </mesh>
      ))}
      {/* 暖橙 rim 点光随点亮增强 */}
      <pointLight position={[1.6, 2.6, -1.8]} color={COL.rimWarm} intensity={2 + glow * 22} distance={14} decay={2} />
    </group>
  );
};

// ---------------------------------------------------------------- 全局：地面 / 光尘 / 灯光 / 汇总
const DUST = (() => {
  const r = rng(991);
  return Array.from({length: 42}, () => ({x: -9 + r() * 24, y: r() * 4, z: -3 + r() * 6, drift: 0.008 + r() * 0.012}));
})();
const World: React.FC = () => {
  const f = useCurrentFrame() + 1;
  const dustGeo = new THREE.BufferGeometry();
  // 光尘：缓慢上浮循环（帧号参数化，几何每帧重建 42 点，成本可忽略）
  dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(
    DUST.flatMap((d) => [d.x, (d.y + f * d.drift) % 4.4, d.z]), 3,
  ));
  return (
    <>
      <color attach="background" args={[COL.bg]} />
      <fog attach="fog" args={[COL.bg, 11, 36]} />
      <CameraRig />
      {/* 灯光：key（带影）+ 冷 rim + 暖 rim（站内）+ 半球补 */}
      <directionalLight
        position={[10, 13, 7]} intensity={3.2} color="#fff4e6" castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-15} shadow-camera-right={15} shadow-camera-top={10} shadow-camera-bottom={-6}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-8, 6, -9]} intensity={1.9} color={COL.rimCold} />
      <hemisphereLight args={['#3a3a46', '#101014', 0.72]} />
      {/* 地面（无限延展感由雾收边） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color={COL.floor} roughness={0.5} metalness={0.2} />
      </mesh>
      {/* 各站光池（廉价假反射，填地面不死黑） */}
      {[{x: -6, c: '#8fb8d8'}, {x: 0, c: '#8fb8d8'}, {x: 6, c: '#8fb8d8'}, {x: 12, c: COL.rimWarm}].map((p, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[p.x, 0.005, 0]}>
          <circleGeometry args={[1.9, 40]} />
          <meshBasicMaterial color={p.c} transparent opacity={0.06} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      {/* 光尘（全场上浮微粒） */}
      <points geometry={dustGeo}>
        <pointsMaterial size={0.02} color="#9aa3b2" transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>
      <StationA />
      <StationB />
      <StationC />
      <StationD />
    </>
  );
};

/** 主场景入口（ThreeCanvas 固定 1280×720，与合成一致）。 */
export const OneShotScene: React.FC = () => {
  const {width, height} = useVideoConfig();
  return (
    <ThreeCanvas
      width={width}
      height={height}
      shadows
      dpr={1}
      camera={{fov: 40, position: [-8.7, 1.9, 5], near: 0.1, far: 140}}
      gl={{antialias: true}}
      style={{position: 'absolute', inset: 0}}
    >
      <World />
    </ThreeCanvas>
  );
};
