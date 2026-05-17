import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;

  // 2D random
  float rand(vec2 n) { 
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
  }

  // 2D noise
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

  // Fractal Brownian Motion
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 0.0;
    for (int i = 0; i < 6; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.12;

    vec2 p = uv * 3.0;
    float q = fbm(p + t * 0.3);
    float q2 = fbm(p - t * 0.25 + 1.7);

    vec2 r = vec2(
      fbm(p + q * 2.0 + vec2(1.7, 9.2) + t * 0.15),
      fbm(p + q2 * 1.5 + vec2(8.3, 2.8) + t * 0.12)
    );

    float f = fbm(p + r);

    // Microscope warm ivory base and soft apricot cream patterns
    vec3 primaryCol = vec3(0.94, 0.91, 0.82); // #F0E8D0
    vec3 secondaryCol = vec3(0.94, 0.85, 0.73); // Shifted towards #F0E8D0

    vec3 col = mix(
      primaryCol,
      secondaryCol,
      clamp(f * f * 2.2, 0.0, 1.0)
    );
    col = mix(col, vec3(0.92, 0.88, 0.79), clamp(length(r), 0.0, 1.0));

    // Infuse the active card's accent color with extremely delicate, airy tint
    vec3 accentGlow = uColor * 0.045 + primaryCol * 0.955;
    col = mix(col, accentGlow, f * f * f + f * 0.35);

    // Subtle warm vignette to frame the bright vision
    float vignette = 1.0 - smoothstep(0.4, 1.0, length(uv - 0.5) * 1.5);
    col = mix(col * 0.97, col, vignette);

    gl_FragColor = vec4(col, 1.0);
  }
`;

interface FluidBackgroundProps {
  accentColor: THREE.Color;
}

const FluidBackground: React.FC<FluidBackgroundProps> = ({ accentColor }) => {
  const matRef = useRef<THREE.ShaderMaterial>(null!);

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
      matRef.current.uniforms.uColor.value.lerp(accentColor, 0.02);
    }
  });

  return (
    <mesh position={[0, 0, -10]} scale={[120, 80, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uColor: { value: accentColor.clone() },
        }}
      />
    </mesh>
  );
};

export default FluidBackground;
