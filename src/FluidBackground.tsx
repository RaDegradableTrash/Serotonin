import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── 1. 干净纯粹的 3D 顶点着色器（只管位置和传导UV） ───
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ─── 2. 完美的流体片元着色器（纯粹的色彩与液泡计算） ───
const fragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;

  float rand(vec2 n) { 
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u * u * (3.0 - 2.0 * u);
    float res = mix(
      mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
      mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x),
      u.y
    );
    return res * res;
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 6; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  // ─── 替换 fragmentShader 内部的 main() 函数前半部分 ───
  void main() {
    // 1. 🌟 稍微放大 UV 比例（调整为 2.8），让图形形态跨度更大
    vec2 uv = vUv * 2.8; 
    
    // 2. 🌟 猛烈提升时间变化率！从 0.12 提高到 0.45，让变幻速度肉眼可见
    float t = uTime * 0.45; 

    vec2 p = uv;
    
    // 3. 🌟 核心：引入 sin/cos 动态基调，强行打破平缓的烟雾感，创造出不断蠕动的“波纹形态”
    float q = fbm(p + t * 0.4 + vec2(sin(t * 0.5), cos(t * 0.3)));
    float q2 = fbm(p - t * 0.35 + vec2(cos(t * 0.4), sin(t * 0.6)) + 1.7);

    // 4. 🌟 加大次级扭曲的乘数（从 2.0/1.5 放大到 3.5/2.5），让液泡边缘在运动时发生明显的“拉伸和坍缩”
    vec2 r = vec2(
      fbm(p + q * 3.5 + vec2(1.7, 9.2) + t * 0.2),
      fbm(p + q2 * 2.5 + vec2(8.3, 2.8) + t * 0.15)
    );

    // 5. 最终叠加
    float f = fbm(p + r * 1.3);

    // ─── 🧪 后面的色彩清单和计算保持不变 ───
    vec3 colF0E8D0 = vec3(0.94, 0.91, 0.82); 
    vec3 colE8E0B0 = vec3(0.91, 0.88, 0.69); 
    vec3 colF7EEE6 = vec3(0.97, 0.93, 0.90); 
    vec3 colB9E7E2 = vec3(0.72, 0.91, 0.89); 

    float f_edge = clamp(pow(f * 1.5, 3.0), 0.0, 1.0);
    vec3 baseMix = mix(colF0E8D0, colE8E0B0, f_edge);

    float r_edge = clamp(length(r) * 1.2, 0.0, 1.0);
    vec3 shadowMix = mix(baseMix, colB9E7E2, r_edge * 0.45);

    float glow_edge = clamp(sin(f * 3.1415) * 0.8, 0.0, 1.0);
    vec3 finalCol = mix(shadowMix, colF7EEE6, glow_edge * 0.3);

    vec3 accentTarget = mix(finalCol, uColor, 0.07);
    finalCol = mix(finalCol, accentTarget, f * f);

    float vignette = 1.0 - smoothstep(0.4, 1.5, length(vUv - 0.5) * 2.0);
    finalCol = mix(finalCol * 0.98, finalCol, vignette);

    gl_FragColor = vec4(finalCol, 1.0);
  }
`;

interface FluidBackgroundProps {
  accentColor: THREE.Color;
}

const FluidBackground: React.FC<FluidBackgroundProps> = ({ accentColor }) => {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: accentColor.clone() },
  }), []);

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
      matRef.current.uniforms.uColor.value.lerp(accentColor, 0.035);
    }
  });

  return (
    // ─── 3. 安全地躺在 -25.0 大后方 ───
    <mesh 
      position={[0, 0, -25.0]} 
      rotation={[0, 0, 0]} 
      scale={[120, 80, 1]}
    >
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
        transparent={true}
      />
    </mesh>
  );
};

export default FluidBackground;