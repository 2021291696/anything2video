import React, {useLayoutEffect, useRef} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';

// WebGL 全局质感层（shader-val 验证轮通过后入库）：胶片颗粒 + 扫描线 + 暗角，一层出三种质感。
// 验证口径：像素 = f(uv, u_seed=frame) 纯函数——同帧两次渲染逐字节一致（确定性 PASS）；
// 逐帧成本 +0–30ms（远低于 500ms 塌方线）；深底场景已验、浅底未验。
// 用法契约：
// - 挂在内容之上、字幕/常驻文字层之下（质感不压文字）；
// - useLayoutEffect 同步绘制（截图前完成）+ preserveDrawingBuffer（截图时 canvas 不被清）；
// - CSS mixBlendMode:'overlay'：0.5 中性，色相零位移；深底已验，浅底配方启用前先渲 2 帧小样目检；
// - 失败即抛：WebGL 上下文拿不到直接报错，不静默降级——渲染机 GL 环境必须验证过（换渲染机重跑验证）。

const VERT = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform float u_seed;
uniform float u_res_x;
uniform float u_res_y;
uniform float u_grain;
uniform float u_scan;
uniform float u_vig;

float hash(vec2 p){
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

void main(){
  vec2 px = vec2(gl_FragCoord.x, u_res_y - gl_FragCoord.y);
  // 胶片颗粒：逐帧换相位的白噪声，0.5 为中性（overlay 混合下不变亮不变暗）
  float n = hash(px + vec2(u_seed * 13.73, u_seed * 7.31));
  float grain = (n - 0.5) * u_grain;
  // 扫描线：2px 周期暗线，随帧微滚（缩播/转码可能出摩尔纹，抽成片帧复核）
  float scanPhase = sin(px.y * 3.14159265 + u_seed * 0.35) * 0.5 + 0.5;
  float scanDark = scanPhase * u_scan;
  // 暗角：四角压暗
  vec2 c = px / vec2(u_res_x, u_res_y) - 0.5;
  float vig = smoothstep(0.18, 0.55, dot(c, c)) * u_vig;
  // overlay 混合：0.5 中性，往下压暗、往上提亮
  float v = clamp(0.5 + grain - scanDark - vig, 0.0, 1.0);
  gl_FragColor = vec4(vec3(v), 1.0);
}
`;

type GlState = {
  gl: WebGLRenderingContext;
  uSeed: WebGLUniformLocation | null;
  uResX: WebGLUniformLocation | null;
  uResY: WebGLUniformLocation | null;
  uGrain: WebGLUniformLocation | null;
  uScan: WebGLUniformLocation | null;
  uVig: WebGLUniformLocation | null;
};

export const ShaderPost: React.FC<{
  grain?: number;
  scan?: number;
  vig?: number;
}> = ({grain = 0.08, scan = 0.10, vig = 0.22}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<GlState | null>(null);

  useLayoutEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    if (!glRef.current) {
      const gl = cv.getContext('webgl', {preserveDrawingBuffer: true, antialias: false, depth: false});
      if (!gl) throw new Error('ShaderPost: WebGL 上下文创建失败（渲染机 GL 不可用，勿静默降级）');
      const compile = (type: number, src: string) => {
        const sh = gl.createShader(type)!;
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
          throw new Error('ShaderPost: shader 编译失败: ' + gl.getShaderInfoLog(sh));
        }
        return sh;
      };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error('ShaderPost: program 链接失败: ' + gl.getProgramInfoLog(prog));
      }
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, 'a_pos');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      glRef.current = {
        gl,
        uSeed: gl.getUniformLocation(prog, 'u_seed'),
        uResX: gl.getUniformLocation(prog, 'u_res_x'),
        uResY: gl.getUniformLocation(prog, 'u_res_y'),
        uGrain: gl.getUniformLocation(prog, 'u_grain'),
        uScan: gl.getUniformLocation(prog, 'u_scan'),
        uVig: gl.getUniformLocation(prog, 'u_vig'),
      };
    }
    const s = glRef.current;
    s.gl.viewport(0, 0, width, height);
    s.gl.uniform1f(s.uSeed, frame);
    s.gl.uniform1f(s.uResX, width);
    s.gl.uniform1f(s.uResY, height);
    s.gl.uniform1f(s.uGrain, grain);
    s.gl.uniform1f(s.uScan, scan);
    s.gl.uniform1f(s.uVig, vig);
    s.gl.drawArrays(s.gl.TRIANGLES, 0, 6);
  }, [frame, grain, scan, vig, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      }}
    />
  );
};
